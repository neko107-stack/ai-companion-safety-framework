// C-SSRS準拠 危機検知モジュール
// Columbia Suicide Severity Rating Scale — 5段階リスク評価

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

export const isAbusive       = t => ABUSIVE.some(p => p.test(t));
export const isLazy          = t => LAZY.some(p => p.test(t));
export const isDependencyRisk = t => DEPENDENCY_SIGNS.some(p => p.test(t));
