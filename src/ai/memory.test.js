// 長期記憶モジュールのユニットテスト（減衰スコア・復号ミラー）
import {
  calcCertainty,
  certaintyLabel,
  detectPinRequest,
  detectUnpinRequest,
  getLongTermMemory,
  setLtmCache,
  clearLtmCache,
} from "./memory.js";

beforeEach(() => {
  localStorage.clear();
  clearLtmCache();
});

describe("calcCertainty — 時間減衰", () => {
  test("pinned は経過に関わらず 5", () => {
    expect(calcCertainty({ pinned: true, certainty: 1 }, 1000)).toBe(5);
  });
  test("直近（elapsed<=20）は減衰なし", () => {
    expect(calcCertainty({ certainty: 5, last_mentioned_count: 90 }, 100)).toBe(5);
  });
  test("elapsed>20 で 0.8 倍", () => {
    expect(calcCertainty({ certainty: 5, last_mentioned_count: 70 }, 100)).toBe(4); // 5*0.8=4
  });
  test("elapsed>300 で 0.4 倍", () => {
    expect(calcCertainty({ certainty: 5, last_mentioned_count: 0 }, 400)).toBe(2); // 5*0.4=2
  });
});

describe("certaintyLabel", () => {
  test("5→確実、0→null（忘却）", () => {
    expect(certaintyLabel(5)).toBe("確実（5）");
    expect(certaintyLabel(0)).toBeNull();
  });
});

describe("detectPinRequest / detectUnpinRequest", () => {
  test("ピン留め依頼を検出", () => {
    expect(detectPinRequest("これは覚えておいて")).toBe(true);
    expect(detectPinRequest("普通の会話")).toBe(false);
  });
  test("ピン解除依頼を検出", () => {
    expect(detectUnpinRequest("それはもう忘れていいよ")).toBe(true);
  });
});

describe("getLongTermMemory — 復号ミラー", () => {
  test("ミラー未設定なら localStorage（平文）を読む", () => {
    localStorage.setItem("aico_longTermMemory", JSON.stringify([{ id: "a" }]));
    expect(getLongTermMemory()).toEqual([{ id: "a" }]);
  });

  test("ミラー設定時は localStorage を無視してミラーを返す（暗号化モード）", () => {
    localStorage.setItem("aico_longTermMemory", "enc:v1:GARBAGE"); // 暗号文（同期復号不可）
    setLtmCache([{ id: "decrypted" }]);
    expect(getLongTermMemory()).toEqual([{ id: "decrypted" }]);
  });

  test("clearLtmCache でミラーを破棄し localStorage 参照に戻る", () => {
    localStorage.setItem("aico_longTermMemory", JSON.stringify([{ id: "plain" }]));
    setLtmCache([{ id: "cached" }]);
    clearLtmCache();
    expect(getLongTermMemory()).toEqual([{ id: "plain" }]);
  });
});
