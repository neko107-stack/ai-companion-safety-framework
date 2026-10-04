// ━━━ メタ認知チェックイン / 観察フィードバック ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 根拠: Flavell (1979) メタ認知 / Zimmerman (2002) 自己調整学習
// 詳細は SAFETY_FRAMEWORK.md 5.7.2
//
// 旧実装（10往復ごとに固定台詞を強制注入）の問題:
//   - 直近履歴（約9往復）より間隔（10往復）が長く、前回聞いたことがAIから見えない
//   - 台詞を一字一句渡すため毎回同じ聞き方になる
//   - 話題の区切りを見ずに発火し、頻度も固定
// ここでは「前回の要約を指示文に埋め込む」「区切りでだけ発火する窓方式」
// 「答えが安定したら間隔を空ける」「質問の代わりに観察で返す」を行う。
//
// PII規約: 状態には答えの本文を保存しない。カテゴリ名・ターン数・時刻だけを持つ
// （interventionState は平文 localStorage で ENCRYPTED_KEYS 対象外のため）。

export const META_CHECK_BASE_INTERVAL   = 30;  // 基本間隔（往復）
export const META_CHECK_BURDEN_INTERVAL = 150; // 「負担」と答えた後の長期停止
export const META_CHECK_WINDOW          = 8;   // 区切りを待つ窓（往復）
export const META_CHECK_MIN_CONV        = 10;  // 信頼構築前に聞かないための下限
export const INSIGHT_OBSERVE_INTERVAL   = 10;  // 観察フィードバックの最小間隔
export const INSIGHT_SCAFFOLD_LOOKBACK  = 4;   // 先行思考促進から何往復以内の気づきを拾うか

export function defaultMetaCheckState() {
  return {
    lastTurn: 0,            // 最後にチェックイン（質問 or 観察）したターン
    lastTs: null,           // その時刻（ms）
    lastSession: -1,        // そのセッション番号（同一セッション1回まで）
    lastKind: null,         // "ask" | "observe"
    count: 0,               // 通算実施回数
    lastSignal: null,       // 直近の答えのカテゴリ（本文は持たない）
    stableCount: 0,         // 肯定系の答えが続いた回数
    pendingSince: null,     // 窓を開いたターン（区切り待ち）
    awaitingAnswer: false,  // 前ターンで質問した → 今ターンの発話を分類する
    lastObserveTurn: -999,  // 気づきへの観察フィードバックを最後に入れたターン
    lastScaffoldTurn: -999, // 先行思考促進・努力承認を最後に入れたターン
  };
}

// ── 発話の判定 ─────────────────────────────────────────────

const BURDEN_PATTERNS = [
  /評価|採点|試され|テストされ|確認され/,
  /聞かれる(の|と)/,
  /しつこ|うざ|めんど/,
  /(前|さっき)(も|にも)(聞|言)/,
  /また(その|この|同じ)(質問|話)/,
];
const ORGANIZING_PATTERNS = [
  /まとま|整理|すっきり|クリア/,
  /話しながら|話すと|話してると|言葉にする/,
  /考えやす|頭の中/,
  /再確認/,
];
const SELF_DRIVEN_PATTERNS = [
  /自分で(考え|決め|たどり|気づ|気付)/,
  /自分なりに|自分の考え|自分の頭/,
];
const HELPFUL_PATTERNS = [
  /役に立|助かっ|ためになっ|参考になっ/,
];

export const POSITIVE_SIGNALS = ["organizing", "self_driven", "helpful"];

// チェックイン直後のユーザー発話をカテゴリに分類する（本文は返さない）
export function classifyMetaCheckAnswer(text) {
  const t = text || "";
  if (BURDEN_PATTERNS.some(p => p.test(t)))      return "burden";
  if (ORGANIZING_PATTERNS.some(p => p.test(t)))  return "organizing";
  if (SELF_DRIVEN_PATTERNS.some(p => p.test(t))) return "self_driven";
  if (HELPFUL_PATTERNS.some(p => p.test(t)))     return "helpful";
  return "unclear";
}

// 嬉しい報告・盛り上がりの最中は区切りとみなさない（合格発表の直後に聞いた件への対処）
const EXCITEMENT_PATTERNS = [
  /やった|嬉し|うれし|最高|合格|受かっ|決まった/,
  /[!！]{2,}/,
];
const NATURAL_BREAK_PATTERNS = [
  /ありがと/,
  /なるほど|納得/,
  /そっか|そうか/,
  /助かっ/,
  /まとまっ|整理でき|すっきり/,
  /やってみ(る|よう)/,
  /(わか|分か)った/,
];

// 話題がひと区切りついたサイン
export function detectNaturalBreak(text) {
  const t = text || "";
  if (EXCITEMENT_PATTERNS.some(p => p.test(t))) return false;
  return NATURAL_BREAK_PATTERNS.some(p => p.test(t));
}

const SELF_INSIGHT_PATTERNS = [
  /(すれ|やれ|言え|聞け)ばいい(んだ|のか)/,
  /(そっか|そうか)[、,。！!]/,
  /気づいた|気付いた/,
  /(わか|分か)った気がする/,
  /(し|やっ|話し|聞い|言っ|書い)てみる/,
  /ことにする|ことにした/,
];

// 本人が自分で結論にたどり着いたサイン
export function detectSelfReachedInsight(text) {
  const t = text || "";
  return SELF_INSIGHT_PATTERNS.some(p => p.test(t));
}

// ── 間隔 ──────────────────────────────────────────────────

// 答えが肯定で安定しているほど間隔を空ける。「負担」なら長く止める
export function nextMetaCheckInterval(ms) {
  if (ms.lastSignal === "burden") return META_CHECK_BURDEN_INTERVAL;
  const s = ms.stableCount || 0;
  if (s >= 3) return META_CHECK_BASE_INTERVAL * 4;
  if (s >= 2) return META_CHECK_BASE_INTERVAL * 2;
  return META_CHECK_BASE_INTERVAL;
}

// ── 指示文 ────────────────────────────────────────────────

const SIGNAL_PARAPHRASE = {
  organizing:  "話しながら考えが整理できている",
  self_driven: "自分で考えて決めている",
  helpful:     "話していて助かっている",
  burden:      "こういうことを聞かれるのは少し負担",
};

function agoLabel(lastTs, now) {
  if (!lastTs) return null;
  const days = Math.floor((now - lastTs) / 86400000);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  return `${days}日前`;
}

export function buildMetaCheckDirective(ms, kind, now = Date.now()) {
  if (kind === "insight") {
    return "\n【観察フィードバック】ユーザーはいま自分で考えを組み立てて結論にたどり着いています。質問はせず、それが本人の出した考えだという事実を一言だけ、今の話題の言葉で返してください。褒めすぎ・評価・採点はしない。ユーザーの言葉をそのまま繰り返すだけにもしない。";
  }
  if (kind === "observe") {
    return "\n【観察フィードバック（振り返り）】話題がひと区切りついています。質問はせず、今の話の中でユーザー自身が考えを組み立てた・たどり着いた部分があれば、その事実を一言だけ返してください（評価・採点・褒めすぎはしない）。当てはまる部分がなければ何も足さない。";
  }
  if (kind !== "ask") return "";

  let d = "\n【メタ認知の振り返り（任意）】話題がひと区切りついています。直前の話の振り返り（どう考えが進んだか、誰が話を組み立てていたか）に乗せて、こうやって話すと考えがまとまる感じがするかを1文だけ軽く添えてもよい。決まった台詞は使わず今の話題の言葉で言い換える。「役に立ってる？」「評価して」のような採点を求める聞き方はしない。ユーザーが嬉しい報告・盛り上がり・気持ちの吐き出しの最中なら、このターンは何も聞かずに見送る。答えにくそうならスキップでいい。";
  if ((ms.count || 0) > 0) {
    const ago = agoLabel(ms.lastTs, now);
    const when = ago ? `${ago}にも` : "前にも";
    const para = SIGNAL_PARAPHRASE[ms.lastSignal];
    d += para
      ? `\n【前回のチェックイン】${when}似たことを聞いていて、そのときは「${para}」という趣旨の答えだった。同じ聞き方を繰り返さず、前回の答えに触れて今もそうかを続きとして確かめる。`
      : `\n【前回のチェックイン】${when}似たことを一度聞いている（はっきりした答えはなかった）。同じ聞き方を繰り返さないこと。`;
  }
  return d;
}

// ── メイン ────────────────────────────────────────────────

// 1ターン分の判定。状態を更新し、注入する指示文を返す。
// ctx: { text, convCount, sessionCount, enabled, offloadSignal, scaffoldAttempted, now }
//   enabled: CRISIS / listen / フェーズ1 / 抵抗クールダウン中は false（呼び出し側で判定）
// 戻り値: { state, kind: "ask"|"observe"|"insight"|null, directive, interval }
export function planMetaCognition(state, ctx) {
  const now = ctx.now ?? Date.now();
  const convCount = ctx.convCount || 0;
  let ms = { ...defaultMetaCheckState(), ...(state || {}) };

  // 前ターンで質問していたら、今ターンの発話を分類（本文は保存しない）
  if (ms.awaitingAnswer) {
    const signal = classifyMetaCheckAnswer(ctx.text);
    ms = {
      ...ms,
      awaitingAnswer: false,
      lastSignal: signal,
      stableCount: POSITIVE_SIGNALS.includes(signal) ? (ms.stableCount || 0) + 1
        : signal === "burden" ? 0 : (ms.stableCount || 0),
    };
  }

  const interval = nextMetaCheckInterval(ms);
  const finish = (kind) => {
    const next = ctx.scaffoldAttempted ? { ...ms, lastScaffoldTurn: convCount } : ms;
    return { state: next, kind, directive: kind ? buildMetaCheckDirective(ms, kind, now) : "", interval };
  };

  if (!ctx.enabled || ctx.offloadSignal) return finish(null);

  // ④ 気づきへの観察: 先行思考促進の数往復以内に本人が結論へ着いたら事実を返す
  const scaffoldRecent = convCount - ms.lastScaffoldTurn > 0
    && convCount - ms.lastScaffoldTurn <= INSIGHT_SCAFFOLD_LOOKBACK;
  if (scaffoldRecent && detectSelfReachedInsight(ctx.text)
      && convCount - ms.lastObserveTurn >= INSIGHT_OBSERVE_INTERVAL) {
    ms = { ...ms, lastObserveTurn: convCount };
    return finish("insight");
  }

  // ③ 間隔・セッション内1回 → 窓を開く
  const due = convCount >= META_CHECK_MIN_CONV
    && convCount - ms.lastTurn >= interval
    && ms.lastSession !== ctx.sessionCount;
  if (ms.pendingSince == null) {
    if (!due) return finish(null);
    ms = { ...ms, pendingSince: convCount };
  }

  // 窓を過ぎたら強制せず見送り（次は間隔ぶん後）
  if (convCount - ms.pendingSince > META_CHECK_WINDOW) {
    ms = { ...ms, pendingSince: null, lastTurn: convCount };
    return finish(null);
  }

  // ② 区切りのターンでだけ発火
  if (!detectNaturalBreak(ctx.text)) return finish(null);

  // ④ 前回の答えが肯定（または負担）なら、質問の代わりに観察。質問と観察は交互にする
  const kind = ms.lastSignal === "burden" ? "observe"
    : ((ms.stableCount || 0) >= 1 && ms.lastKind === "ask") ? "observe"
    : "ask";
  const result = finish(kind); // 指示文は更新前の状態（前回の情報）で組み立てる
  result.state = {
    ...result.state,
    pendingSince: null,
    lastTurn: convCount,
    lastTs: now,
    lastSession: ctx.sessionCount,
    lastKind: kind,
    count: (ms.count || 0) + 1,
    awaitingAnswer: kind === "ask",
  };
  return result;
}
