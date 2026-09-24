// Claude 応答の読み取りヘルパーのユニットテスト
import { thinksByDefault, claudeChatParams, extractClaudeText, claudeEmptyReason } from "./claude-response.js";

describe("thinksByDefault", () => {
  test("thinking が既定でオンのモデルを判定する", () => {
    for (const m of ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5", "claude-fable-5-1", "claude-mythos-5-1"]) {
      expect(thinksByDefault(m)).toBe(true);
    }
  });
  test("4.x 系や Haiku は対象外（effort 非対応モデルに送らない）", () => {
    for (const m of ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "", undefined]) {
      expect(thinksByDefault(m)).toBe(false);
    }
  });
});

describe("claudeChatParams", () => {
  test("従来モデルは max_tokens だけ", () => {
    expect(claudeChatParams("claude-sonnet-4-6", 1000)).toEqual({ max_tokens: 1000 });
  });
  test("既定で考えるモデルは effort low + max_tokens 4000 以上", () => {
    expect(claudeChatParams("claude-opus-5", 1000)).toEqual({ max_tokens: 4000, output_config: { effort: "low" } });
  });
});

describe("extractClaudeText", () => {
  test("text ブロックだけを連結する", () => {
    expect(extractClaudeText({ content: [
      { type: "thinking", thinking: "" },
      { type: "text", text: "A" },
      { type: "tool_use", id: "x" },
      { type: "text", text: "B" },
    ] })).toBe("AB");
  });
  test("content が無い・壊れていても空文字", () => {
    expect(extractClaudeText({})).toBe("");
    expect(extractClaudeText(null)).toBe("");
    expect(extractClaudeText({ content: [null, { type: "text" }] })).toBe("");
  });
});

describe("claudeEmptyReason", () => {
  test("stop_reason ごとに利用者向けの文言を返す", () => {
    expect(claudeEmptyReason({ stop_reason: "refusal" })).toContain("返答を控えました");
    expect(claudeEmptyReason({ stop_reason: "max_tokens" })).toContain("途中で止まりました");
    expect(claudeEmptyReason({ stop_reason: "end_turn" })).toBe("レスポンスの形式が不正です");
  });
});
