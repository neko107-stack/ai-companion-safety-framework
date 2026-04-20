// AIエンジン呼び出しモジュール（ユーザーのAPIキーを使用）
import { ERR, classifyApiError, recordLog } from "../utils/logger.js";

export const maskKey = k => k ? k.slice(0, 8) + "••••••••••" + k.slice(-4) : "";

export async function callAI(engineId, model, apiKey, systemPrompt, messages, phase = "chat") {
  const ctx = { engine: engineId, model };

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
        body: JSON.stringify({ model, max_tokens: 1000, system: systemPrompt, messages }),
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
    if (!d.content?.[0]?.text) {
      recordLog(ERR.API_RESPONSE, {...ctx, httpStatus: res.status}, phase);
      throw new Error("レスポンスの形式が不正です");
    }
    return d.content[0].text;
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

  throw new Error("Llamaはローカル環境で動作します。ローカルサーバーが必要です。");
}
