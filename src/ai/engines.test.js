// callAI 統一アダプタのユニットテスト（fetch モック）
import { jest } from "@jest/globals";
import { callAI, maskKey } from "./engines.js";
import { clearLogs, getLogs } from "../utils/logger.js";

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  clearLogs();
  global.fetch = jest.fn();
});
afterEach(() => { jest.restoreAllMocks(); });

describe("maskKey", () => {
  test("先頭8文字+末尾4文字以外をマスクする", () => {
    expect(maskKey("sk-ant-abcdefy-12345678zzzz")).toBe("sk-ant-a••••••••••zzzz");
  });
  test("空値は空文字を返す", () => {
    expect(maskKey("")).toBe("");
  });
});

describe("callAI — claude", () => {
  test("通常呼び出しは text を返し thinking パラメータを送らない", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ content: [{ type: "text", text: "こんにちは" }] }));
    const out = await callAI("claude", "claude-sonnet-4-6", "sk-ant-x", "sys", [{ role: "user", content: "hi" }]);
    expect(out).toBe("こんにちは");
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(1000);
    expect(body).not.toHaveProperty("thinking");
  });

  test("debugThinking 時は Extended Thinking を要求し <thinking>/<response> 形式で返す", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      content: [
        { type: "thinking", thinking: "考え中…" },
        { type: "text", text: "答えです" },
      ],
    }));
    const out = await callAI("claude", "m", "k", "sys", [], "chat", { debugThinking: true });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.thinking).toEqual({ type: "adaptive" });
    expect(body.max_tokens).toBe(4000);
    expect(out).toBe("<thinking>\n考え中…\n</thinking>\n<response>\n答えです\n</response>");
  });

  test("先頭が thinking ブロックの応答（Opus 5 系など）でも text を返す", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "text", text: "やあ、" },
        { type: "text", text: "元気？" },
      ],
    }));
    const out = await callAI("claude", "claude-opus-5", "k", "sys", [{ role: "user", content: "hi" }]);
    expect(out).toBe("やあ、元気？");
  });

  test("既定で考えるモデルには effort low と広めの max_tokens を送る", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ content: [{ type: "text", text: "ok" }] }));
    await callAI("claude", "claude-sonnet-5", "k", "sys", []);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(4000);
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body).not.toHaveProperty("thinking");
  });

  test("refusal は本文を使わず、分かる文言で throw する（カテゴリだけ記録）", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber" },
      content: [{ type: "text", text: "途中まで" }],
    }));
    await expect(callAI("claude", "claude-opus-5", "k", "s", [])).rejects.toThrow("返答を控えました");
    const log = getLogs().slice(-1)[0];
    expect(log.code).toBe("API_INVALID_RESPONSE");
    expect(JSON.stringify(log)).not.toContain("途中まで");
  });

  test("思考だけで max_tokens に達し本文が無いときは、途中で止まったと伝える", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      stop_reason: "max_tokens",
      content: [{ type: "thinking", thinking: "", signature: "sig" }],
    }));
    await expect(callAI("claude", "claude-opus-5-5", "k", "s", [])).rejects.toThrow("途中で止まりました");
  });

  test("APIエラーは分類ログの上で throw する", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { type: "auth", message: "bad key" } }) });
    await expect(callAI("claude", "m", "k", "s", [])).rejects.toThrow("bad key");
    expect(getLogs().some(l => l.code === "API_AUTH_FAILED")).toBe(true);
  });
});

describe("callAI — llama / Ollama", () => {
  test("llamaEndpoint の /v1/chat/completions に POST し応答を返す", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ choices: [{ message: { content: "ローカル応答" } }] }));
    const out = await callAI("llama", "gemma3:12b", "", "sys", [{ role: "user", content: "hi" }], "chat",
      { llamaEndpoint: "http://localhost:11434/" });
    expect(out).toBe("ローカル応答");
    expect(global.fetch.mock.calls[0][0]).toBe("http://localhost:11434/v1/chat/completions");
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.model).toBe("gemma3:12b");
  });

  test("llama-local はモデル未指定で送る（llama.cpp は起動時モデルを使用）", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ choices: [{ message: { content: "x" } }] }));
    await callAI("llama", "llama-local", "", "s", []);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("model");
    expect(global.fetch.mock.calls[0][0]).toBe("http://localhost:8080/v1/chat/completions");
  });

  test("Ollama への接続失敗は OLLAMA_ORIGINS のヒント付きで throw する", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(
      callAI("llama", "m", "", "s", [], "chat", { llamaEndpoint: "http://localhost:11434" })
    ).rejects.toThrow(/OLLAMA_ORIGINS/);
  });
});

describe("callAI — その他", () => {
  test("openai は choices[0].message.content を返す", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ choices: [{ message: { content: "GPT応答" } }] }));
    expect(await callAI("openai", "gpt-4o", "sk", "s", [])).toBe("GPT応答");
  });

  test("gemini は candidates[0] の text を返す", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ candidates: [{ content: { parts: [{ text: "Gemini応答" }] } }] }));
    expect(await callAI("gemini", "g", "k", "s", [{ role: "assistant", content: "prev" }])).toBe("Gemini応答");
  });

  test("未対応エンジンは throw する", async () => {
    await expect(callAI("unknown", "m", "k", "s", [])).rejects.toThrow("未対応のエンジンです");
  });
});
