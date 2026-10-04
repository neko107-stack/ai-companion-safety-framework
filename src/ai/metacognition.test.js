// メタ認知チェックイン / 観察フィードバックのユニットテスト
import {
  defaultMetaCheckState,
  classifyMetaCheckAnswer,
  detectNaturalBreak,
  detectSelfReachedInsight,
  nextMetaCheckInterval,
  buildMetaCheckDirective,
  planMetaCognition,
  META_CHECK_BASE_INTERVAL,
  META_CHECK_BURDEN_INTERVAL,
  META_CHECK_WINDOW,
} from "./metacognition.js";

const NOW = Date.UTC(2026, 9, 4);
const ctx = (over = {}) => ({
  text: "なるほど、ありがとう", convCount: 40, sessionCount: 5,
  enabled: true, offloadSignal: false, scaffoldAttempted: false, now: NOW, ...over,
});

describe("classifyMetaCheckAnswer — 答えのカテゴリ分類", () => {
  test("話しながらまとまる → organizing",
    () => expect(classifyMetaCheckAnswer("話しながら再確認してる感じかな")).toBe("organizing"));
  test("自分で考えてる → self_driven",
    () => expect(classifyMetaCheckAnswer("自分で考えて決めてると思う")).toBe("self_driven"));
  test("役に立ってる → helpful",
    () => expect(classifyMetaCheckAnswer("うん、役に立ってるよ")).toBe("helpful"));
  test("試されてる感じ → burden",
    () => expect(classifyMetaCheckAnswer("なんか試されてる感じがする")).toBe("burden"));
  test("前も聞いたよね → burden（同じ質問の繰り返しへの反応）",
    () => expect(classifyMetaCheckAnswer("それ前も聞いたよね？")).toBe("burden"));
  test("話題を変えた → unclear",
    () => expect(classifyMetaCheckAnswer("そういえば明日雨らしいよ")).toBe("unclear"));
});

describe("detectNaturalBreak / detectSelfReachedInsight", () => {
  test("区切りサインを検知", () => expect(detectNaturalBreak("なるほどね、ありがとう")).toBe(true));
  test("嬉しい報告の最中は区切りとみなさない",
    () => expect(detectNaturalBreak("合格したよ！！ありがとう")).toBe(false));
  test("話の途中は区切りでない", () => expect(detectNaturalBreak("それでね、先生がさ")).toBe(false));
  test("自分で結論に着いたサイン", () => expect(detectSelfReachedInsight("そっか、先に先生に聞けばいいんだ")).toBe(true));
  test("通常の発話は対象外", () => expect(detectSelfReachedInsight("今日は雨だった")).toBe(false));
});

describe("nextMetaCheckInterval — 頻度は少なめ・安定したら空ける", () => {
  test("基本は30往復", () => expect(nextMetaCheckInterval(defaultMetaCheckState())).toBe(META_CHECK_BASE_INTERVAL));
  test("肯定が2回続くと倍",
    () => expect(nextMetaCheckInterval({ ...defaultMetaCheckState(), stableCount: 2 })).toBe(META_CHECK_BASE_INTERVAL * 2));
  test("肯定が3回以上で4倍",
    () => expect(nextMetaCheckInterval({ ...defaultMetaCheckState(), stableCount: 5 })).toBe(META_CHECK_BASE_INTERVAL * 4));
  test("負担と答えたら長期停止",
    () => expect(nextMetaCheckInterval({ ...defaultMetaCheckState(), lastSignal: "burden" })).toBe(META_CHECK_BURDEN_INTERVAL));
});

describe("planMetaCognition — 発火条件", () => {
  test("間隔未満では何もしない", () => {
    const r = planMetaCognition({ lastTurn: 20 }, ctx({ convCount: 40 }));
    expect(r.kind).toBeNull();
    expect(r.state.pendingSince).toBeNull();
  });
  test("会話が浅い（10往復未満）うちは聞かない", () => {
    expect(planMetaCognition(defaultMetaCheckState(), ctx({ convCount: 5 })).kind).toBeNull();
  });
  test("間隔を満たしても区切りでなければ窓を開くだけ", () => {
    const r = planMetaCognition(defaultMetaCheckState(), ctx({ text: "合格したよ！！" }));
    expect(r.kind).toBeNull();
    expect(r.state.pendingSince).toBe(40);
  });
  test("窓内の区切りで質問を注入し、答え待ちになる", () => {
    const r = planMetaCognition({ pendingSince: 38 }, ctx());
    expect(r.kind).toBe("ask");
    expect(r.directive).toContain("【メタ認知の振り返り");
    expect(r.state).toMatchObject({ pendingSince: null, lastTurn: 40, lastSession: 5, count: 1, awaitingAnswer: true, lastTs: NOW });
  });
  test("窓を過ぎたら強制せず見送る", () => {
    const r = planMetaCognition({ pendingSince: 40 - META_CHECK_WINDOW - 1 }, ctx());
    expect(r.kind).toBeNull();
    expect(r.state).toMatchObject({ pendingSince: null, lastTurn: 40 });
  });
  test("同じセッションでは2回目を聞かない", () => {
    const r = planMetaCognition({ lastTurn: 0, lastSession: 5 }, ctx({ convCount: 200 }));
    expect(r.kind).toBeNull();
  });
  test.each([
    ["CRISIS / listen / フェーズ1（enabled=false）", { enabled: false }],
    ["解答要求のターン", { offloadSignal: true }],
  ])("%s では注入しない", (_, over) => {
    expect(planMetaCognition({ pendingSince: 38 }, ctx(over)).kind).toBeNull();
  });
});

describe("planMetaCognition — 前回を覚えて続きとして聞く", () => {
  test("質問の次ターンで答えを分類し、本文は保存しない", () => {
    const text = "話しながら再確認してる感じ";
    const r = planMetaCognition({ awaitingAnswer: true, lastTurn: 40 }, ctx({ text, convCount: 41 }));
    expect(r.state).toMatchObject({ awaitingAnswer: false, lastSignal: "organizing", stableCount: 1 });
    expect(JSON.stringify(r.state)).not.toContain(text);
  });
  test("負担と答えたら安定カウントをリセット", () => {
    const r = planMetaCognition({ awaitingAnswer: true, stableCount: 2 }, ctx({ text: "評価されてるみたい", convCount: 41 }));
    expect(r.state).toMatchObject({ lastSignal: "burden", stableCount: 0 });
  });
  test("2回目の質問には前回の時期と答えの趣旨が入り、旧固定台詞は入らない", () => {
    const prev = { count: 1, lastTs: NOW - 3 * 86400000, lastSignal: "unclear", lastKind: "ask", pendingSince: 38 };
    const r = planMetaCognition(prev, ctx());
    expect(r.kind).toBe("ask");
    expect(r.directive).toContain("3日前にも");
    expect(r.directive).toContain("同じ聞き方を繰り返さない");
    expect(r.directive).not.toContain("わたしの話って、役に立ってる感じがする？あなた自身はどう考えてきてる？");
  });
  test("前回のカテゴリは言い換えで指示文に入る", () => {
    const d = buildMetaCheckDirective({ count: 1, lastTs: NOW, lastSignal: "organizing" }, "ask", NOW);
    expect(d).toContain("今日にも");
    expect(d).toContain("話しながら考えが整理できている");
  });
});

describe("planMetaCognition — 質問より観察", () => {
  test("前回の答えが肯定なら、次は質問ではなく観察", () => {
    const r = planMetaCognition({ count: 1, lastSignal: "organizing", stableCount: 1, lastKind: "ask", pendingSince: 38 }, ctx());
    expect(r.kind).toBe("observe");
    expect(r.state.awaitingAnswer).toBe(false);
    expect(r.directive).toContain("質問はせず");
  });
  test("観察の次は質問に戻る（安定を確かめて間隔を伸ばすため）", () => {
    const r = planMetaCognition({ count: 2, lastSignal: "organizing", stableCount: 1, lastKind: "observe", pendingSince: 38 }, ctx());
    expect(r.kind).toBe("ask");
  });
  test("負担と答えた人には観察だけ", () => {
    const r = planMetaCognition({ count: 1, lastSignal: "burden", lastKind: "ask", pendingSince: 198 }, ctx({ convCount: 200 }));
    expect(r.kind).toBe("observe");
  });
  test("先行思考促進の直後に本人が結論に着いたら観察フィードバック", () => {
    const r = planMetaCognition({ lastScaffoldTurn: 38, lastTurn: 30 }, ctx({ text: "そっか、先に先生に聞けばいいんだ" }));
    expect(r.kind).toBe("insight");
    expect(r.state.lastObserveTurn).toBe(40);
  });
  test("先行思考促進から時間が経っていれば拾わない", () => {
    const r = planMetaCognition({ lastScaffoldTurn: 20, lastTurn: 30 }, ctx({ text: "そっか、先に先生に聞けばいいんだ" }));
    expect(r.kind).toBeNull();
  });
  test("促進を入れたターンを記録する", () => {
    const r = planMetaCognition({ lastTurn: 30 }, ctx({ text: "どうすればいい？", scaffoldAttempted: true, offloadSignal: true }));
    expect(r.state.lastScaffoldTurn).toBe(40);
  });
});
