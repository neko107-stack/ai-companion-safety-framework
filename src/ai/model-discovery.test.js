// モデル動的検出のユニットテスト
import { jest } from "@jest/globals";
import { discoverModels, mergeModels } from "./model-discovery.js";
import { getLogs, clearLogs } from "../utils/logger.js";

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
const errResponse = (status, body) => ({ ok: false, status, json: async () => body });

beforeEach(() => {
  clearLogs();
  global.fetch = jest.fn();
});
afterEach(() => { jest.restoreAllMocks(); });

describe("mergeModels", () => {
  const baseline = [
    { id: "claude-opus-4-8", label: "Opus 4.8（最新・最高性能）" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6（推奨・バランス）" },
  ];

  test("検出結果が空ならベースラインそのまま", () => {
    expect(mergeModels(baseline, [])).toEqual(baseline);
  });

  test("新しいidは末尾に追加され（自動検出）ラベルが付く", () => {
    const merged = mergeModels(baseline, [{ id: "claude-future-9", label: "Future 9" }]);
    expect(merged).toHaveLength(3);
    expect(merged[2]).toEqual({ id: "claude-future-9", label: "Future 9（自動検出）" });
  });

  test("重複idはベースライン優先（ラベルを保持）", () => {
    const merged = mergeModels(baseline, [{ id: "claude-opus-4-8", label: "別ラベル" }]);
    expect(merged).toHaveLength(2);
    expect(merged[0].label).toBe("Opus 4.8（最新・最高性能）");
  });

  test("ベースライン空 + 検出ありで検出のみ返す", () => {
    const merged = mergeModels([], [{ id: "x", label: "X" }]);
    expect(merged).toEqual([{ id: "x", label: "X（自動検出）" }]);
  });

  test("両方空なら空配列", () => {
    expect(mergeModels([], [])).toEqual([]);
    expect(mergeModels()).toEqual([]);
  });
});

describe("discoverModels - claude", () => {
  test("200応答を display_name でラベル化し新しい順に並べる", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      data: [
        { id: "claude-opus-4-7", display_name: "Opus 4.7", created_at: "2025-01-01" },
        { id: "claude-opus-4-8", display_name: "Opus 4.8", created_at: "2026-05-01" },
      ],
    }));
    const out = await discoverModels("claude", "sk-ant-xxxxxxxx");
    expect(out[0]).toEqual({ id: "claude-opus-4-8", label: "Opus 4.8" });
    expect(out[1]).toEqual({ id: "claude-opus-4-7", label: "Opus 4.7" });
  });

  test("401でも throw せず [] を返す", async () => {
    global.fetch.mockResolvedValueOnce(errResponse(401, { error: { message: "invalid" } }));
    await expect(discoverModels("claude", "sk-ant-xxxxxxxx")).resolves.toEqual([]);
  });

  test("fetch reject でも [] を返す", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network down"));
    await expect(discoverModels("claude", "sk-ant-xxxxxxxx")).resolves.toEqual([]);
  });
});

describe("discoverModels - openai", () => {
  test("チャット系のみ抽出し embedding/whisper/dall-e を除外", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      data: [
        { id: "gpt-4o" },
        { id: "o3-mini" },
        { id: "text-embedding-3-large" },
        { id: "whisper-1" },
        { id: "dall-e-3" },
        { id: "gpt-4o-realtime-preview" },
      ],
    }));
    const ids = (await discoverModels("openai", "sk-xxxxxxxx")).map(m => m.id);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("o3-mini");
    expect(ids).not.toContain("text-embedding-3-large");
    expect(ids).not.toContain("whisper-1");
    expect(ids).not.toContain("dall-e-3");
    expect(ids).not.toContain("gpt-4o-realtime-preview");
  });
});

describe("discoverModels - gemini", () => {
  test("models/接頭辞を除去し generateContent 非対応を除外", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({
      models: [
        { name: "models/gemini-1.5-pro", displayName: "Gemini 1.5 Pro", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", displayName: "Embedding", supportedGenerationMethods: ["embedContent"] },
      ],
    }));
    const out = await discoverModels("gemini", "AIzaxxxxxxxx");
    expect(out).toEqual([{ id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }]);
  });
});

describe("discoverModels - 安全性とガード", () => {
  test("鍵なしなら fetch を呼ばず []", async () => {
    await expect(discoverModels("claude", "")).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("llama は fetch を呼ばず []", async () => {
    await expect(discoverModels("llama", "anything")).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("失敗ログに APIキーの値が含まれない", async () => {
    const SECRET = "sk-ant-SUPERSECRETKEY123";
    global.fetch.mockResolvedValueOnce(errResponse(401, { error: { message: "bad" } }));
    await discoverModels("claude", SECRET);
    const dump = JSON.stringify(getLogs());
    expect(dump).not.toContain(SECRET);
  });
});
