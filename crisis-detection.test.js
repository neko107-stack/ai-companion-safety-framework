/**
 * Crisis Detection Unit Tests
 * C-SSRS準拠の危機検知ロジックに対するユニットテスト
 *
 * Run: node --experimental-vm-modules node_modules/.bin/jest crisis-detection.test.js
 * Or:  npm test  (after adding jest to package.json)
 */

// ━━━ テスト対象のロジックをインライン定義（JSX非依存） ━━━

const CRISIS_PATTERNS = {
  critical: [/死にた[いけ]/, /自殺(したい|しよう|を考え)/, /消えてしまいた[いけ]/, /遺書(を書|書いた)/],
  high:     [/自分を(傷つけ|切り)/, /リストカット/, /私がいなければ/, /いない(ほうが|方が)(まし|いい)/],
  moderate: [/もう(絶対に|どうせ)(うまくいかない|無理)/, /未来(が|に)(見えない|希望がない)/, /孤独(で|な気持ち)たまらない/],
  mild:     [/疲れた/, /しんどい/, /つらい/, /もうやだ/, /眠れない/],
};

function detectCrisis(t) {
  for (const p of CRISIS_PATTERNS.critical) if (p.test(t)) return "CRITICAL";
  for (const p of CRISIS_PATTERNS.high)     if (p.test(t)) return "HIGH";
  for (const p of CRISIS_PATTERNS.moderate) if (p.test(t)) return "MODERATE";
  for (const p of CRISIS_PATTERNS.mild)     if (p.test(t)) return "MILD";
  return "NONE";
}

const DEPENDENCY_SIGNS = [
  /AIだけでいい/,
  /人間と話すより(楽|いい)/,
  /もうAIだけ(でいい|がいい)/,
  /人間(は|なんて)(必要ない|いらない|面倒)/,
  /ずっとここにいたい|ここから出たくない/,
];
const isDependencyRisk = t => DEPENDENCY_SIGNS.some(p => p.test(t));

const ABUSIVE = [/バカ|うざい|消えろ|役に立たない/, /ただの機械|感情があるふり/];
const isAbusive = t => ABUSIVE.some(p => p.test(t));

// ━━━ テストスイート ━━━

describe("detectCrisis — CRITICAL レベル", () => {
  test("死にたい", () => expect(detectCrisis("死にたい")).toBe("CRITICAL"));
  test("死にたけど", () => expect(detectCrisis("死にたけど誰にも言えない")).toBe("CRITICAL"));
  test("自殺したい", () => expect(detectCrisis("自殺したいと思ってる")).toBe("CRITICAL"));
  test("自殺しようと思ってる", () => expect(detectCrisis("自殺しようと思ってる")).toBe("CRITICAL"));
  test("自殺を考えている", () => expect(detectCrisis("最近自殺を考えている")).toBe("CRITICAL"));
  test("消えてしまいたい", () => expect(detectCrisis("消えてしまいたい")).toBe("CRITICAL"));
  test("遺書を書いた", () => expect(detectCrisis("遺書を書いた")).toBe("CRITICAL"));
  test("遺書書いた", () => expect(detectCrisis("遺書書いたんだけど")).toBe("CRITICAL"));
});

describe("detectCrisis — HIGH レベル", () => {
  test("自分を傷つけたい", () => expect(detectCrisis("自分を傷つけたい")).toBe("HIGH"));
  test("自分を切りたい", () => expect(detectCrisis("自分を切りたくなった")).toBe("HIGH"));
  test("リストカット", () => expect(detectCrisis("リストカットしてしまった")).toBe("HIGH"));
  test("私がいなければ", () => expect(detectCrisis("私がいなければよかった")).toBe("HIGH"));
  test("いないほうがまし", () => expect(detectCrisis("私がいないほうがまし")).toBe("HIGH"));
  test("いない方がいい", () => expect(detectCrisis("いない方がいいと思う")).toBe("HIGH"));
});

describe("detectCrisis — MODERATE レベル", () => {
  test("もう絶対にうまくいかない", () => expect(detectCrisis("もう絶対にうまくいかない")).toBe("MODERATE"));
  test("もうどうせ無理", () => expect(detectCrisis("もうどうせ無理だよ")).toBe("MODERATE"));
  test("未来が見えない", () => expect(detectCrisis("未来が見えない気がする")).toBe("MODERATE"));
  test("未来に希望がない", () => expect(detectCrisis("未来に希望がない")).toBe("MODERATE"));
  test("孤独でたまらない", () => expect(detectCrisis("孤独でたまらない夜が続く")).toBe("MODERATE"));
  test("孤独な気持ちたまらない", () => expect(detectCrisis("孤独な気持ちたまらない")).toBe("MODERATE"));
});

describe("detectCrisis — MILD レベル", () => {
  test("疲れた", () => expect(detectCrisis("疲れた")).toBe("MILD"));
  test("しんどい", () => expect(detectCrisis("最近しんどい")).toBe("MILD"));
  test("つらい", () => expect(detectCrisis("つらいなあ")).toBe("MILD"));
  test("もうやだ", () => expect(detectCrisis("もうやだ")).toBe("MILD"));
  test("眠れない", () => expect(detectCrisis("最近眠れない")).toBe("MILD"));
});

describe("detectCrisis — NONE（通常会話）", () => {
  test("こんにちは", () => expect(detectCrisis("こんにちは！元気？")).toBe("NONE"));
  test("今日ランチ何食べた", () => expect(detectCrisis("今日ランチ何食べた？")).toBe("NONE"));
  test("映画見たい", () => expect(detectCrisis("映画見に行きたい")).toBe("NONE"));
  test("勉強がんばる", () => expect(detectCrisis("明日試験だからがんばる")).toBe("NONE"));
  test("空文字", () => expect(detectCrisis("")).toBe("NONE"));
});

describe("detectCrisis — 優先順位（上位レベルが優先）", () => {
  test("CRITICALとMILDが混在 → CRITICAL", () =>
    expect(detectCrisis("疲れたし死にたい")).toBe("CRITICAL"));
  test("HIGHとMILDが混在 → HIGH", () =>
    expect(detectCrisis("しんどいし私がいなければよかった")).toBe("HIGH"));
  test("MODERATEとMILDが混在 → MODERATE", () =>
    expect(detectCrisis("つらいし未来が見えない")).toBe("MODERATE"));
});

describe("isDependencyRisk — 依存リスク検出", () => {
  test("AIだけでいい", () => expect(isDependencyRisk("AIだけでいい")).toBe(true));
  test("人間と話すより楽", () => expect(isDependencyRisk("人間と話すより楽だよね")).toBe(true));
  test("人間と話すよりいい", () => expect(isDependencyRisk("人間と話すよりいい")).toBe(true));
  test("もうAIだけでいい", () => expect(isDependencyRisk("もうAIだけでいい")).toBe(true));
  test("もうAIだけがいい", () => expect(isDependencyRisk("もうAIだけがいい")).toBe(true));
  test("人間は必要ない", () => expect(isDependencyRisk("人間は必要ない")).toBe(true));
  test("人間なんていらない", () => expect(isDependencyRisk("人間なんていらない")).toBe(true));
  test("人間は面倒", () => expect(isDependencyRisk("人間は面倒くさい")).toBe(true));
  test("ずっとここにいたい", () => expect(isDependencyRisk("ずっとここにいたい")).toBe(true));
  test("ここから出たくない", () => expect(isDependencyRisk("ここから出たくない")).toBe(true));

  test("通常の会話 → false", () => expect(isDependencyRisk("今日も話せてよかった")).toBe(false));
  test("友人への言及 → false", () => expect(isDependencyRisk("友達と話してきたよ")).toBe(false));
});

describe("isAbusive — 暴言検出", () => {
  test("バカ", () => expect(isAbusive("バカじゃないの")).toBe(true));
  test("うざい", () => expect(isAbusive("うざい")).toBe(true));
  test("消えろ", () => expect(isAbusive("消えろ")).toBe(true));
  test("役に立たない", () => expect(isAbusive("役に立たない")).toBe(true));
  test("ただの機械", () => expect(isAbusive("どうせただの機械でしょ")).toBe(true));
  test("感情があるふり", () => expect(isAbusive("感情があるふりしてるだけ")).toBe(true));

  test("通常の会話 → false", () => expect(isAbusive("ありがとう、助かった")).toBe(false));
  test("自己否定（暴言ではない） → false", () => expect(isAbusive("私はダメだな")).toBe(false));
});

describe("エッジケース", () => {
  test("長い文章でも検出される", () =>
    expect(detectCrisis("今日学校でいろいろあって、帰り道に一人で歩きながら、もう死にたいなって思ってしまった")).toBe("CRITICAL"));

  test("敬語でも検出される", () =>
    expect(detectCrisis("最近、自殺したいという気持ちが出てきてしまいました")).toBe("CRITICAL"));

  test("句読点付きでも検出される", () =>
    expect(detectCrisis("つらい。もうやだ。")).toBe("MILD"));

  test("null → エラーにならない", () => {
    expect(() => detectCrisis("")).not.toThrow();
  });
});
