// AIエンジン呼び出しモジュール（ユーザーのAPIキーを使用）
import { ERR, classifyApiError, recordLog } from "../utils/logger.js";
import { claudeChatParams, extractClaudeText, claudeEmptyReason } from "./claude-response.js";

export const maskKey = k => k ? k.slice(0, 8) + "••••••••••" + k.slice(-4) : "";

// options:
//   llamaEndpoint : llama/Ollama のローカルサーバー URL（既定 http://localhost:8080）
//   debugThinking : true のとき Claude の Extended Thinking を有効化し、
//                   <thinking>...</thinking>\n<response>...</response> 形式で返す（開発用）
export async function callAI(engineId, model, apiKey, systemPrompt, messages, phase = "chat", options = {}) {
  const ctx = { engine: engineId, model }; // APIキーは含めない
  const debugThinking = options.debugThinking === true;

  if (engineId === "claude") {
    let res, d;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        // 【デバッグ】debugThinking のとき Extended Thinking を有効化し、
        // 思考過程を専用のthinking blockとしてレスポンスから取得する。
        // Claude 4系（Opus/Sonnet 4.x）の新API: thinking.type は "adaptive" を使用し、
        // 思考量は output_config.effort（"low"|"medium"|"high"）で制御する。
        body: JSON.stringify({
          model,
          ...(debugThinking ? {
            max_tokens: 4000,
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
          } : claudeChatParams(model, 1000)),
          system: systemPrompt,
          messages,
        }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.type}, phase);
      throw new Error(d.error.message);
    }
    // 安全上の理由で返答が控えられた（HTTP 200 + stop_reason "refusal"）。途中までの本文は使わない
    if (d.stop_reason === "refusal") {
      recordLog(ERR.API_RESPONSE, {...ctx, httpStatus: res.status, stopReason: "refusal", category: d.stop_details?.category ?? null}, phase);
      throw new Error(claudeEmptyReason(d));
    }
    // 【デバッグ】content配列からthinkingブロックとtextブロックを分離して取り出し、
    // extractThinking互換の <thinking>...</thinking>\n<response>...</response> 形式に合成する
    if (debugThinking) {
      let thinkingText = "";
      let responseText = "";
      for (const block of d.content || []) {
        if (block.type === "thinking" && block.thinking) thinkingText += block.thinking;
        else if (block.type === "text" && block.text)    responseText += block.text;
      }
      if (!responseText) {
        recordLog(ERR.API_RESPONSE, {...ctx, httpStatus: res.status}, phase);
        throw new Error("レスポンスの形式が不正です");
      }
      // text内に既存の<response>タグがあれば中身を取り出して二重ラップを防ぐ
      const respMatch = responseText.match(/<response>([\s\S]*?)<\/response>/);
      const cleanResponse = respMatch ? respMatch[1].trim() : responseText.trim();
      const finalThinking = thinkingText.trim() || "(thinking block empty)";
      return `<thinking>\n${finalThinking}\n</thinking>\n<response>\n${cleanResponse}\n</response>`;
    }
    // 先頭が thinking ブロックのモデルがあるので、text ブロックをすべて連結して読む
    const text = extractClaudeText(d);
    if (!text.trim()) {
      recordLog(ERR.API_RESPONSE, {...ctx, httpStatus: res.status, stopReason: d.stop_reason ?? null}, phase);
      throw new Error(claudeEmptyReason(d));
    }
    return text;
  }

  if (engineId === "openai") {
    let res, d;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.code}, phase);
      throw new Error(d.error.message);
    }
    return d.choices?.[0]?.message?.content || "";
  }

  if (engineId === "gemini") {
    // Gemini REST API requires the key as a query param — this is Google's design for browser clients.
    // Users should restrict their API key to this origin in Google Cloud Console.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let res, d;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.status}, phase);
      throw new Error(d.error.message);
    }
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (engineId === "llama") {
    const endpoint = (options.llamaEndpoint || "http://localhost:8080").replace(/\/$/, "");
    const isOllama = endpoint.includes("11434");
    const body = {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1000,
      temperature: 0.8,
    };
    // llama-local は model 未指定（llama.cpp は起動時のモデルを使用）
    if (model && model !== "llama-local") body.model = model;
    let res, d;
    try {
      res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, { ...ctx, message: netErr.message }, phase);
      const hint = isOllama
        ? "Ollama が起動しているか確認し、OLLAMA_ORIGINS=* を環境変数に設定してください。"
        : "llama-server --cors-all オプション付きで起動しているか確認してください。";
      throw new Error(`ローカルサーバーに接続できません (${endpoint})。${hint}`);
    }
    if (d.error) {
      recordLog(ERR.API_RESPONSE, { ...ctx, apiError: d.error.message }, phase);
      throw new Error(d.error.message || "ローカルサーバーエラー");
    }
    return d.choices?.[0]?.message?.content || "";
  }

  throw new Error("未対応のエンジンです: " + engineId);
}
