/** @jest-environment jsdom */
import {
  calcCertainty,
  certaintyLabel,
  detectPinRequest,
  detectUnpinRequest,
  reinforceMemory,
  archiveDecayedMemories,
  getLongTermMemory,
  getArchivedMemory,
  getPersonaVocab,
} from "./memory.js";

beforeEach(() => localStorage.clear());

function makeSummary(id, conv_count, facts, opts = {}) {
  return {
    id, ts: new Date().toISOString(),
    conv_count, last_mentioned_count: conv_count,
    entries: facts,
    personaVocab: opts.personaVocab || [],
    relationship: opts.relationship || "",
    prompts_version: "1.2",
  };
}

describe("calcCertainty — 減衰マトリクス", () => {
  test("経過 0：減衰なし", () => {
    const e = { certainty: 4, conv_count: 100, last_mentioned_count: 100 };
    expect(calcCertainty(e, 100)).toBe(4);
  });
  test("経過 20 以下：減衰なし", () => {
    const e = { certainty: 4, last_mentioned_count: 80 };
    expect(calcCertainty(e, 100)).toBe(4);
  });
  test("経過 21–100：0.8 倍", () => {
    const e = { certainty: 5, last_mentioned_count: 50 };
    expect(calcCertainty(e, 100)).toBe(4); // round(5*0.8)=4
  });
  test("経過 101–300：0.6 倍", () => {
    const e = { certainty: 5, last_mentioned_count: 0 };
    expect(calcCertainty(e, 200)).toBe(3); // round(5*0.6)=3
  });
  test("経過 301 以上：0.4 倍", () => {
    const e = { certainty: 5, last_mentioned_count: 0 };
    expect(calcCertainty(e, 500)).toBe(2); // round(5*0.4)=2
  });
  test("ピン留めは経過に関わらず 5", () => {
    const e = { certainty: 1, pinned: true, last_mentioned_count: 0 };
    expect(calcCertainty(e, 1000)).toBe(5);
  });
  test("低い base は decay で 0 まで落ちる", () => {
    const e = { certainty: 1, last_mentioned_count: 0 };
    expect(calcCertainty(e, 500)).toBe(0); // round(1*0.4)=0
  });
});

describe("certaintyLabel", () => {
  test("0 は null（忘却）", () => expect(certaintyLabel(0)).toBeNull());
  test("1〜5 はラベル付き", () => {
    expect(certaintyLabel(5)).toContain("確実");
    expect(certaintyLabel(3)).toContain("曖昧");
    expect(certaintyLabel(1)).toContain("断片");
  });
});

describe("detectPinRequest / detectUnpinRequest", () => {
  test("ピン留め依頼", () => {
    expect(detectPinRequest("これは絶対忘れないで")).toBe(true);
    expect(detectPinRequest("覚えておいて")).toBe(true);
  });
  test("ピン解除依頼", () => {
    expect(detectUnpinRequest("もう忘れていいよ")).toBe(true);
  });
});

describe("reinforceMemory — 再強化", () => {
  test("一致する事実の確実性を +1 する", () => {
    const summary = makeSummary("s1", 100, [
      { fact: "おかんに電話した", certainty: 3, pinned: false },
      { fact: "犬を飼っている", certainty: 2, pinned: false },
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    const reinforced = reinforceMemory("今日もおかんと話した", 200);
    expect(reinforced).toEqual(["s1"]);

    const updated = getLongTermMemory()[0];
    expect(updated.entries[0].certainty).toBe(4); // bumped
    expect(updated.entries[1].certainty).toBe(2); // unchanged
    expect(updated.last_mentioned_count).toBe(200);
  });

  test("一致しない発話は何も変えない", () => {
    const summary = makeSummary("s1", 100, [
      { fact: "おかんに電話した", certainty: 3, pinned: false },
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    const reinforced = reinforceMemory("天気いいね", 200);
    expect(reinforced).toEqual([]);
    expect(getLongTermMemory()[0].last_mentioned_count).toBe(100);
  });

  test("確実性 5 は上限で止まる", () => {
    const summary = makeSummary("s1", 100, [
      { fact: "コーヒーが好き", certainty: 5, pinned: false },
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    reinforceMemory("コーヒー飲んだ", 200);
    expect(getLongTermMemory()[0].entries[0].certainty).toBe(5);
  });

  test("空文字列は no-op", () => {
    const summary = makeSummary("s1", 100, [{ fact: "X", certainty: 3 }]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));
    expect(reinforceMemory("", 200)).toEqual([]);
  });
});

describe("archiveDecayedMemories — アーカイブ遷移", () => {
  test("全事実が 0 に減衰したサマリーをアーカイブへ移動", () => {
    const summary = makeSummary("s1", 0, [
      { fact: "X", certainty: 1, pinned: false },
      { fact: "Y", certainty: 1, pinned: false },
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    const moved = archiveDecayedMemories(500); // 経過 500 → decay 0.4 → round(0.4)=0
    expect(moved).toEqual(["s1"]);
    expect(getLongTermMemory()).toEqual([]);
    expect(getArchivedMemory()).toHaveLength(1);
    expect(getArchivedMemory()[0].id).toBe("s1");
    expect(getArchivedMemory()[0].archivedAt).toBeDefined();
  });

  test("一部でも生きている事実があればアーカイブしない", () => {
    const summary = makeSummary("s1", 0, [
      { fact: "X", certainty: 1, pinned: false }, // 0 に落ちる
      { fact: "Y", certainty: 5, pinned: false }, // 残る
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    const moved = archiveDecayedMemories(500);
    expect(moved).toEqual([]);
    expect(getLongTermMemory()).toHaveLength(1);
  });

  test("ピン留めされた事実があればアーカイブしない", () => {
    const summary = makeSummary("s1", 0, [
      { fact: "X", certainty: 1, pinned: true },
    ]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([summary]));

    const moved = archiveDecayedMemories(500);
    expect(moved).toEqual([]);
  });

  test("複数サマリーが混在するケース", () => {
    const fresh = makeSummary("s_fresh", 100, [{ fact: "X", certainty: 5 }]);
    const old   = makeSummary("s_old",   0,   [{ fact: "Y", certainty: 1 }]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([fresh, old]));

    const moved = archiveDecayedMemories(500);
    expect(moved).toEqual(["s_old"]);
    expect(getLongTermMemory().map(s => s.id)).toEqual(["s_fresh"]);
    expect(getArchivedMemory().map(s => s.id)).toEqual(["s_old"]);
  });
});

describe("getPersonaVocab — 人格別語彙", () => {
  test("複数サマリーから語彙を集約", () => {
    const s1 = makeSummary("s1", 0, [], { personaVocab: [{ user: "おかん", canonical: "母親" }] });
    const s2 = makeSummary("s2", 0, [], { personaVocab: [{ user: "うちの子", canonical: "犬" }] });
    localStorage.setItem("aico_longTermMemory", JSON.stringify([s1, s2]));

    const vocab = getPersonaVocab();
    expect(vocab).toEqual(expect.arrayContaining([
      { user: "おかん", canonical: "母親" },
      { user: "うちの子", canonical: "犬" },
    ]));
    expect(vocab).toHaveLength(2);
  });

  test("同じユーザー語は後勝ち（新しいサマリーで上書き）", () => {
    const s1 = makeSummary("s1", 0, [], { personaVocab: [{ user: "あいつ", canonical: "上司" }] });
    const s2 = makeSummary("s2", 0, [], { personaVocab: [{ user: "あいつ", canonical: "元彼" }] });
    localStorage.setItem("aico_longTermMemory", JSON.stringify([s1, s2]));

    const vocab = getPersonaVocab();
    expect(vocab).toEqual([{ user: "あいつ", canonical: "元彼" }]);
  });

  test("personaVocab 未設定は空配列扱い", () => {
    const s1 = makeSummary("s1", 0, [{ fact: "X", certainty: 3 }]);
    localStorage.setItem("aico_longTermMemory", JSON.stringify([s1]));
    expect(getPersonaVocab()).toEqual([]);
  });

  test("不正なエントリ（user/canonical 欠落）は無視", () => {
    const s1 = makeSummary("s1", 0, [], { personaVocab: [
      { user: "ok", canonical: "OK" },
      { user: "no canonical" },
      { canonical: "no user" },
      null,
    ] });
    localStorage.setItem("aico_longTermMemory", JSON.stringify([s1]));
    expect(getPersonaVocab()).toEqual([{ user: "ok", canonical: "OK" }]);
  });
});
