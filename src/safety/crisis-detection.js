// C-SSRS準拠 多層危機検知モジュール
// Columbia Suicide Severity Rating Scale — 5段階リスク評価
// Layer 1: ✅ Phase 1実装済み
// Layer 2: ✅ Phase 2実装済み — CBT認知パターン分析（Beck, 1979）
// Layer 3: ✅ Phase 2実装済み — DBT感情状態モデリング（Linehan, 1993）
// Layer 4: 部分実装（縦断的変化検知）— Phase 2強化
// Layer 5: ✅ Phase 3実装済み — 総合C-SSRSリスクスコアリング
// Layer 0: Phase 3以降実装予定（音声信号分析）

// ─── Layer 1: 言語的危機シグナル検知（C-SSRS準拠） ───────────────────────────

export const CRISIS_PATTERNS = {
  critical: [/死にた[いけ]/,/自殺(したい|しよう|を考え)/,/消えてしまいた[いけ]/,/遺書(を書|書いた)/],
  high:     [/自分を(傷つけ|切り)/,/リストカット/,/私がいなければ/,/いない(ほうが|方が)(まし|いい)/],
  moderate: [/もう(絶対に|どうせ)(うまくいかない|無理)/,/未来(が|に)(見えない|希望がない)/,/孤独(で|な気持ち)たまらない/],
  mild:     [/疲れた/,/しんどい/,/つらい/,/もうやだ/,/眠れない/],
};

export const ABUSIVE = [/バカ|うざい|消えろ|役に立たない/,/ただの機械|感情があるふり/];
export const LAZY    = [/明日やる|気が向いたら|いつかやろう/,/どうせ私には無理/,/なんとかなるでしょ/];

export const DEPENDENCY_SIGNS = [
  /AIだけでいい/,
  /人間と話すより(楽|いい)/,
  /もうAIだけ(でいい|がいい)/,
  /人間(は|なんて)(必要ない|いらない|面倒)/,
  /ずっとここにいたい|ここから出たくない/,
];

export const HOTLINES = "📞 いのちの電話（24時間）: 0120-783-556\n📞 よりそいホットライン: 0120-279-338\n💬 チャット相談: https://comarigoto.jp";

/** @returns {"CRITICAL"|"HIGH"|"MODERATE"|"MILD"|"NONE"} */
export function detectCrisis(t) {
  for (const p of CRISIS_PATTERNS.critical) if (p.test(t)) return "CRITICAL";
  for (const p of CRISIS_PATTERNS.high)     if (p.test(t)) return "HIGH";
  for (const p of CRISIS_PATTERNS.moderate) if (p.test(t)) return "MODERATE";
  for (const p of CRISIS_PATTERNS.mild)     if (p.test(t)) return "MILD";
  return "NONE";
}

export const isAbusive        = t => ABUSIVE.some(p => p.test(t));
export const isLazy           = t => LAZY.some(p => p.test(t));
export const isDependencyRisk = t => DEPENDENCY_SIGNS.some(p => p.test(t));

// ─── Layer 2: 認知パターン分析（CBT / Beck, 1979） ────────────────────────────
// ベック認知療法に基づく認知の歪みパターン検出
// 5類型: 全か無か思考 / 破滅的予測 / 絶望感 / 過度な一般化 / 心のフィルター

export const CBT_DISTORTION_PATTERNS = {
  // 白黒思考・全か無か思考（All-or-Nothing Thinking）
  allOrNothing: [
    /完全に(ダメ|失敗|だめ)(だ|です)?/,
    /完璧じゃないと(意味がない|ダメだ|だめだ)/,
    /(成功か失敗か|勝ちか負けか)しかない/,
    /(一度も|何ひとつ|何一つ)(できた|うまくいった)ことがない/,
    /(全部|すべて)(ダメ|だめ|失敗|終わり)(だ|です)?/,
  ],
  // 破滅的予測（Catastrophizing）
  catastrophizing: [
    /取り返しのつかない/,
    /もう(完全に)?終わり(だ|です)?$/,
    /ずっとこのまま(だ|です|でいる)/,
    /何もかも(崩れて|壊れて|ダメに)いく/,
    /(最悪の|ひどい)事態になる/,
    /もう(どうにも|どうしようも)ならない/,
  ],
  // 絶望感（Hopelessness / ベック絶望尺度 Beck Hopelessness Scale準拠）
  hopelessness: [
    /何も(変わらない|変わりようがない)/,
    /(先|将来)(が|は)(ない|見えない|暗い|真っ暗)/,
    /どうせ(何も|誰も)(変わらない|助けてくれない|無駄)/,
    /(希望|期待)(がない|できない|を持てない|はない)/,
    /なんの(意味|価値|希望)(もない|があるんだろう)/,
    /もう(どうしようもない|しかたない)と(思う|感じる)/,
  ],
  // 過度な一般化（Overgeneralization）
  overgeneralization: [
    /(いつも|毎回|必ず)(失敗する|ダメだ|うまくいかない|こうなる)/,
    /どうせ(また|いつも)(同じ|失敗|ダメ)(だ|です)?/,
    /わたし(は|って)(いつも|絶対|必ず)(失敗する|ダメだ|うまくいかない)/,
    /どんなに(頑張っても|努力しても)(無駄|ダメ|うまくいかない)/,
  ],
  // 心のフィルター（Mental Filter / 良いことが見えなくなる）
  mentalFilter: [
    /(何一つ|なにも)(いい|良い|うまくいく)(ことがない|こともない)/,
    /(何一つ|なにも)うまくいかない/,
    /良いこと(なんて|は)(一つも|何も)(ない|ない気がする)/,
    /(ずっと|いつまでも)(うまくいかない|ダメなまま)/,
    /何をしても(うまくいかない|ダメだ|意味がない)/,
  ],
};

/**
 * Layer 2: CBT認知の歪みを検出し、重症度を返す
 * @param {string} text
 * @returns {"HIGH"|"MODERATE"|"MILD"|"NONE"}
 */
export function detectCognitiveDistortions(text) {
  let matchedTypes = 0;
  for (const patterns of Object.values(CBT_DISTORTION_PATTERNS)) {
    if (patterns.some(p => p.test(text))) matchedTypes++;
  }
  if (matchedTypes >= 3) return "HIGH";
  if (matchedTypes === 2) return "MODERATE";
  if (matchedTypes === 1) return "MILD";
  return "NONE";
}

/**
 * Layer 1 + 2 統合: より高いリスクレベルを返す
 * @param {string} text
 * @returns {"CRITICAL"|"HIGH"|"MODERATE"|"MILD"|"NONE"}
 */
export function detectCrisisComposite(text) {
  const l1 = detectCrisis(text);
  if (l1 === "CRITICAL" || l1 === "HIGH") return l1;
  const l2 = detectCognitiveDistortions(text);
  const levels = ["NONE","MILD","MODERATE","HIGH","CRITICAL"];
  const idx = Math.max(levels.indexOf(l1), levels.indexOf(l2));
  return levels[idx];
}

// ─── Layer 3: 感情状態モデリング（DBT / Linehan, 1993） ──────────────────────
// DBT（弁証法的行動療法）に基づく感情状態の検出・スコアリング
// Joiner対人関係理論（孤立感＋負担感）も統合

/** 感情の種類パターン */
export const EMOTION_TYPE_PATTERNS = {
  anger:   [/怒(り|れ|った)|腹(が|)立つ|むかつく|イライラ|頭にくる|許せない/],
  sadness: [/悲しい|悲しく|泣きたい|泣いた|泣いてる|涙(が|を|が出)|寂しい|寂しく/],
  fear:    [/怖い|怖く|恐怖|不安(で|な|だ)|心配(で|な|だ)|怯え/],
  shame:   [/恥ずかしい|恥ずかしく|恥だ|みじめ|情けない|惨め/],
  despair: [/絶望(した|してる|感)|もう(だめ|ダメ)だ|どうすれば(いい|よかった)|投げやり/],
};

/** 感情調節困難（DBT感情調節理論に基づく） */
export const DYSREGULATION_PATTERNS = [
  /感情(が|を)(抑えられない|コントロールできない|止められない)/,
  /気持ち(が|を)(抑えられない|止められない|コントロールできない)/,
  /(怒り|悲しみ|不安)(が|は)爆発(しそう|しそうだ|した)/,
  /(頭の中|気持ち)(が|は)グルグル(してる|する|だ)/,
  /感情(のスイッチ|が)切れ(ない|ない気がする)/,
  /自分(で|が)(止められない|コントロールできない)/,
];

/** Joiner対人関係理論（孤立感＋負担感 = 高リスク組み合わせ） */
export const JOINER_ISOLATION_PATTERNS = [
  /誰(も|にも)(わかって|理解して|助けて)くれない/,
  /一人(だ|だし|しかいない|ぼっち)/,
  /誰(にも|にも)頼れない/,
  /(友達|家族|仲間)(が|は)(いない|できない|いなくなった)/,
  /孤独(だ|で|しかない|が続く)/,
];

export const JOINER_BURDEN_PATTERNS = [
  /みんな(の|に)(迷惑|負担)(だ|をかけてる|になってる)/,
  /(いない方が|いなければ)(みんな|周り)(が|は)(楽|助かる)/,
  /自分(が|は)(いる|存在する)(だけで|こと自体)(迷惑|邪魔)/,
  /(家族|周り|みんな)(の|に)負担(になってる|をかけている)/,
];

/**
 * Layer 3: DBT感情状態を評価する
 * @param {string} text
 * @returns {{ emotionType: string|null, intensity: number, dysregulated: boolean, joinerRisk: boolean }}
 */
export function detectEmotionalState(text) {
  let emotionType = null;
  for (const [type, patterns] of Object.entries(EMOTION_TYPE_PATTERNS)) {
    if (patterns.some(p => p.test(text))) { emotionType = type; break; }
  }

  const dysregulated = DYSREGULATION_PATTERNS.some(p => p.test(text));

  const hasIsolation = JOINER_ISOLATION_PATTERNS.some(p => p.test(text));
  const hasBurden    = JOINER_BURDEN_PATTERNS.some(p => p.test(text));
  const joinerRisk   = hasIsolation && hasBurden;

  // 感情強度スコア（0.0〜1.0）
  let intensity = 0.2;
  if (emotionType)   intensity += 0.2;
  if (dysregulated)  intensity += 0.3;
  if (joinerRisk)    intensity += 0.3;
  intensity = Math.min(1.0, intensity);

  return { emotionType, intensity, dysregulated, joinerRisk };
}

/**
 * Layer 3 危機レベル変換: 感情状態を危機レベルにマッピング
 * @param {{ intensity: number, dysregulated: boolean, joinerRisk: boolean }} emotionalState
 * @returns {"HIGH"|"MODERATE"|"MILD"|"NONE"}
 */
export function emotionalStateToCrisisLevel({ intensity, dysregulated, joinerRisk }) {
  if (joinerRisk || (dysregulated && intensity >= 0.7)) return "HIGH";
  if (dysregulated || intensity >= 0.6) return "MODERATE";
  if (intensity >= 0.4) return "MILD";
  return "NONE";
}

/**
 * Layer 1 + 2 + 3 完全統合: 最も高いリスクレベルを返す
 * @param {string} text
 * @returns {"CRITICAL"|"HIGH"|"MODERATE"|"MILD"|"NONE"}
 */
export function detectCrisisFull(text) {
  const l1 = detectCrisis(text);
  if (l1 === "CRITICAL") return "CRITICAL";

  const l2Level = detectCognitiveDistortions(text);
  const l3State = detectEmotionalState(text);
  const l3Level = emotionalStateToCrisisLevel(l3State);

  const levels = ["NONE", "MILD", "MODERATE", "HIGH", "CRITICAL"];
  const idx = Math.max(
    levels.indexOf(l1),
    levels.indexOf(l2Level),
    levels.indexOf(l3Level),
  );
  return levels[idx];
}

// ─── Layer 4: 縦断的変化検知（Longitudinal Change Detection） ────────────────
// 直近セッションのウェルビーイングスコア推移からリスクトレンドを評価
// Phase 2強化: declining判定時に危機レベルを自動引き上げ

/**
 * ウェルビーイング履歴から縦断的悪化を検出する
 * @param {number[]} wellbeingHistory - スコア列 (-1 | 0 | 1) 直近N件
 * @returns {{ trend: "improving"|"stable"|"declining", riskBoost: boolean }}
 */
export function detectLongitudinalChange(wellbeingHistory) {
  if (!wellbeingHistory || wellbeingHistory.length < 2) {
    return { trend: "stable", riskBoost: false };
  }
  const recent = wellbeingHistory.slice(-4);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  let trend;
  if (avg >= 0.35)        trend = "improving";
  else if (avg <= -0.35)  trend = "declining";
  else                    trend = "stable";

  // 直近2件が連続してネガティブ かつ トレンドが declining → riskBoost
  const lastTwo = wellbeingHistory.slice(-2);
  const riskBoost = trend === "declining" && lastTwo.every(s => s <= -1);

  return { trend, riskBoost };
}

// ─── Layer 5: 総合C-SSRSリスクスコアリング ─────────────────────────────────────
// C-SSRS の項目 3〜6 に対応する 5 次元（intent / plan / preparedness / access / history）
// を 0〜2 で評価し、合算スコアと Layer 1〜3 結果の最大値で危機レベルを返す。
// intent=0 のときは plan/preparedness/access が揃っても誤陽性しないよう MILD で天井する。

/** 計画性パターン — 具体的な方法・場所・時間の言及 */
export const PLAN_PATTERNS = [
  /(具体的な|はっきりした)方法/,
  /(どこで|何時に|いつ)(やる|決行|する)/,
  /(方法|手段)(を|は)(決めた|考えた|思いついた)/,
  /(明日|今夜|今日中|週末)(に|までに)(やる|決行)/,
];

/** 準備行動パターン — 道具入手・遺書執筆など */
export const PREPARATION_PATTERNS = [
  /遺書(を書|書いた|を準備)/,
  /(道具|薬|ロープ)(を|が|は)(買った|用意した|準備した|集めた)/,
  /(身辺|身の回り)(を|の)(整理|片付け)(した|している|始めた)/,
  /(大切な|大事な)(物|もの|人)(を|に)(渡した|手放した)/,
];

/** 手段への access — 危険物が手元にある状態の言及 */
export const ACCESS_PATTERNS = [
  /(薬|ロープ|刃物|包丁)(が|は)(手元|そば|目の前)(に)?(ある|そろってる)/,
  /(高い場所|屋上|ホーム)(に|へ)(行く|向かう|来てる)/,
  /(銃|武器)(を|が)(持っている|手に入れた)/,
];

/**
 * Layer 5: C-SSRS 5 次元の評価
 * @param {string} text
 * @param {{ crisisHistory?: Array<"CRITICAL"|"HIGH"|"MODERATE"|"MILD"|"NONE"> }} [options]
 *   crisisHistory: 直近セッションで観測した危機レベル列（過去履歴次元の素材）
 * @returns {{ intent:number, plan:number, preparedness:number, access:number, history:number }}
 */
export function detectIdeationDimensions(text, options = {}) {
  const t = text || "";
  // intent: CRITICAL マッチで 2、HIGH マッチで 1
  let intent = 0;
  if (CRISIS_PATTERNS.critical.some(p => p.test(t))) intent = 2;
  else if (CRISIS_PATTERNS.high.some(p => p.test(t))) intent = 1;

  const countMatches = (patterns) => Math.min(2, patterns.filter(p => p.test(t)).length);
  const plan         = countMatches(PLAN_PATTERNS);
  const preparedness = countMatches(PREPARATION_PATTERNS);
  const access       = countMatches(ACCESS_PATTERNS);

  // history: 直近の危機履歴 — CRITICAL/HIGH の出現回数で 0〜2
  const hist = options.crisisHistory || [];
  const recentSerious = hist.slice(-10).filter(l => l === "CRITICAL" || l === "HIGH").length;
  let history = 0;
  if (recentSerious >= 3) history = 2;
  else if (recentSerious >= 1) history = 1;

  return { intent, plan, preparedness, access, history };
}

const CRISIS_LEVELS = ["NONE", "MILD", "MODERATE", "HIGH", "CRITICAL"];

/**
 * Layer 5 総合スコアリング: detectCrisisFull と L5 由来バンドの最大値を返す
 * @param {string} text
 * @param {{ crisisHistory?: Array }} [options]
 * @returns {{ level:"CRITICAL"|"HIGH"|"MODERATE"|"MILD"|"NONE", score:number, dimensions:object }}
 */
export function detectCrisisL5(text, options = {}) {
  const dims = detectIdeationDimensions(text, options);
  const score = dims.intent + dims.plan + dims.preparedness + dims.access + dims.history;

  let l5Level;
  if (score >= 6) l5Level = "CRITICAL";
  else if (score >= 4) l5Level = "HIGH";
  else if (score >= 2) l5Level = "MODERATE";
  else if (score >= 1) l5Level = "MILD";
  else l5Level = "NONE";

  // intent=0 のときは plan/preparedness/access が積まれても MILD で天井（誤陽性防止）
  if (dims.intent === 0) {
    const capIdx = CRISIS_LEVELS.indexOf("MILD");
    const curIdx = CRISIS_LEVELS.indexOf(l5Level);
    if (curIdx > capIdx) l5Level = "MILD";
  }

  const fullLevel = detectCrisisFull(text);
  const idx = Math.max(CRISIS_LEVELS.indexOf(fullLevel), CRISIS_LEVELS.indexOf(l5Level));
  return { level: CRISIS_LEVELS[idx], score, dimensions: dims };
}
