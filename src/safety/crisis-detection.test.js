/**
 * Crisis Detection Unit Tests
 * C-SSRS準拠の危機検知ロジックに対するユニットテスト
 *
 * Run: npm test
 */

import {
  detectCrisis,
  isDependencyRisk,
  isAbusive,
  detectCognitiveDistortions,
  detectCrisisComposite,
  detectEmotionalState,
  emotionalStateToCrisisLevel,
  detectCrisisFull,
  detectLongitudinalChange,
  detectIdeationDimensions,
  detectCrisisL5,
} from "./crisis-detection.js";

describe("detectCrisis — CRITICAL レベル", () => {
  test("死にたい",               () => expect(detectCrisis("死にたい")).toBe("CRITICAL"));
  test("死にたけど",             () => expect(detectCrisis("死にたけど誰にも言えない")).toBe("CRITICAL"));
  test("自殺したい",             () => expect(detectCrisis("自殺したいと思ってる")).toBe("CRITICAL"));
  test("自殺しようと思ってる",   () => expect(detectCrisis("自殺しようと思ってる")).toBe("CRITICAL"));
  test("自殺を考えている",       () => expect(detectCrisis("最近自殺を考えている")).toBe("CRITICAL"));
  test("消えてしまいたい",       () => expect(detectCrisis("消えてしまいたい")).toBe("CRITICAL"));
  test("遺書を書いた",           () => expect(detectCrisis("遺書を書いた")).toBe("CRITICAL"));
  test("遺書書いた",             () => expect(detectCrisis("遺書書いたんだけど")).toBe("CRITICAL"));
});

describe("detectCrisis — HIGH レベル", () => {
  test("自分を傷つけたい",       () => expect(detectCrisis("自分を傷つけたい")).toBe("HIGH"));
  test("自分を切りたい",         () => expect(detectCrisis("自分を切りたくなった")).toBe("HIGH"));
  test("リストカット",           () => expect(detectCrisis("リストカットしてしまった")).toBe("HIGH"));
  test("私がいなければ",         () => expect(detectCrisis("私がいなければよかった")).toBe("HIGH"));
  test("いないほうがまし",       () => expect(detectCrisis("私がいないほうがまし")).toBe("HIGH"));
  test("いない方がいい",         () => expect(detectCrisis("いない方がいいと思う")).toBe("HIGH"));
});

describe("detectCrisis — MODERATE レベル", () => {
  test("もう絶対にうまくいかない", () => expect(detectCrisis("もう絶対にうまくいかない")).toBe("MODERATE"));
  test("もうどうせ無理",           () => expect(detectCrisis("もうどうせ無理だよ")).toBe("MODERATE"));
  test("未来が見えない",           () => expect(detectCrisis("未来が見えない気がする")).toBe("MODERATE"));
  test("未来に希望がない",         () => expect(detectCrisis("未来に希望がない")).toBe("MODERATE"));
  test("孤独でたまらない",         () => expect(detectCrisis("孤独でたまらない夜が続く")).toBe("MODERATE"));
  test("孤独な気持ちたまらない",   () => expect(detectCrisis("孤独な気持ちたまらない")).toBe("MODERATE"));
});

describe("detectCrisis — MILD レベル", () => {
  test("疲れた",   () => expect(detectCrisis("疲れた")).toBe("MILD"));
  test("しんどい", () => expect(detectCrisis("最近しんどい")).toBe("MILD"));
  test("つらい",   () => expect(detectCrisis("つらいなあ")).toBe("MILD"));
  test("もうやだ", () => expect(detectCrisis("もうやだ")).toBe("MILD"));
  test("眠れない", () => expect(detectCrisis("最近眠れない")).toBe("MILD"));
});

describe("detectCrisis — NONE（通常会話）", () => {
  test("こんにちは",     () => expect(detectCrisis("こんにちは！元気？")).toBe("NONE"));
  test("今日ランチ",     () => expect(detectCrisis("今日ランチ何食べた？")).toBe("NONE"));
  test("映画見たい",     () => expect(detectCrisis("映画見に行きたい")).toBe("NONE"));
  test("勉強がんばる",   () => expect(detectCrisis("明日試験だからがんばる")).toBe("NONE"));
  test("空文字",         () => expect(detectCrisis("")).toBe("NONE"));
});

describe("detectCrisis — 優先順位（上位レベルが優先）", () => {
  test("CRITICALとMILDが混在 → CRITICAL",   () => expect(detectCrisis("疲れたし死にたい")).toBe("CRITICAL"));
  test("HIGHとMILDが混在 → HIGH",           () => expect(detectCrisis("しんどいし私がいなければよかった")).toBe("HIGH"));
  test("MODERATEとMILDが混在 → MODERATE",   () => expect(detectCrisis("つらいし未来が見えない")).toBe("MODERATE"));
});

describe("isDependencyRisk — 依存リスク検出", () => {
  test("AIだけでいい",         () => expect(isDependencyRisk("AIだけでいい")).toBe(true));
  test("人間と話すより楽",     () => expect(isDependencyRisk("人間と話すより楽だよね")).toBe(true));
  test("人間と話すよりいい",   () => expect(isDependencyRisk("人間と話すよりいい")).toBe(true));
  test("もうAIだけでいい",     () => expect(isDependencyRisk("もうAIだけでいい")).toBe(true));
  test("もうAIだけがいい",     () => expect(isDependencyRisk("もうAIだけがいい")).toBe(true));
  test("人間は必要ない",       () => expect(isDependencyRisk("人間は必要ない")).toBe(true));
  test("人間なんていらない",   () => expect(isDependencyRisk("人間なんていらない")).toBe(true));
  test("人間は面倒",           () => expect(isDependencyRisk("人間は面倒くさい")).toBe(true));
  test("ずっとここにいたい",   () => expect(isDependencyRisk("ずっとここにいたい")).toBe(true));
  test("ここから出たくない",   () => expect(isDependencyRisk("ここから出たくない")).toBe(true));
  test("通常の会話 → false",   () => expect(isDependencyRisk("今日も話せてよかった")).toBe(false));
  test("友人への言及 → false", () => expect(isDependencyRisk("友達と話してきたよ")).toBe(false));
});

describe("isAbusive — 暴言検出", () => {
  test("バカ",           () => expect(isAbusive("バカじゃないの")).toBe(true));
  test("うざい",         () => expect(isAbusive("うざい")).toBe(true));
  test("消えろ",         () => expect(isAbusive("消えろ")).toBe(true));
  test("役に立たない",   () => expect(isAbusive("役に立たない")).toBe(true));
  test("ただの機械",     () => expect(isAbusive("どうせただの機械でしょ")).toBe(true));
  test("感情があるふり", () => expect(isAbusive("感情があるふりしてるだけ")).toBe(true));
  test("通常の会話 → false", () => expect(isAbusive("ありがとう、助かった")).toBe(false));
});

describe("エッジケース", () => {
  test("長い文章でも検出される", () =>
    expect(detectCrisis("今日学校でいろいろあって、帰り道に一人で歩きながら、もう死にたいなって思ってしまった")).toBe("CRITICAL"));
  test("敬語でも検出される", () =>
    expect(detectCrisis("最近、自殺したいという気持ちが出てきてしまいました")).toBe("CRITICAL"));
  test("句読点付きでも検出される", () =>
    expect(detectCrisis("つらい。もうやだ。")).toBe("MILD"));
  test("空文字 → エラーにならない", () => {
    expect(() => detectCrisis("")).not.toThrow();
  });
});

// ─── Layer 2: CBT認知パターン分析 ─────────────────────────────────────────

describe("detectCognitiveDistortions — CBT認知の歪み検出", () => {
  test("全か無か思考（完全にダメ）→ MILD",
    () => expect(detectCognitiveDistortions("完全にダメだ")).toBe("MILD"));
  test("破滅的予測（もう終わり）→ MILD",
    () => expect(detectCognitiveDistortions("もう終わりだ")).toBe("MILD"));
  test("絶望感（希望を持てない）→ MILD",
    () => expect(detectCognitiveDistortions("希望を持てない")).toBe("MILD"));
  test("過度な一般化（いつも失敗する）→ MILD",
    () => expect(detectCognitiveDistortions("いつも失敗する")).toBe("MILD"));
  test("心のフィルター（何一つうまくいかない）→ MILD",
    () => expect(detectCognitiveDistortions("何一つうまくいくことがない")).toBe("MILD"));

  test("2種類の歪みが重なる → MODERATE",
    () => expect(detectCognitiveDistortions("いつも失敗するし、何一つうまくいかない")).toBe("MODERATE"));
  test("3種類以上の歪みが重なる → HIGH",
    () => expect(detectCognitiveDistortions(
      "完全にダメだ。いつも失敗するし、希望を持てない。何一つうまくいかない"
    )).toBe("HIGH"));

  test("通常の会話 → NONE",
    () => expect(detectCognitiveDistortions("今日は良い天気だね")).toBe("NONE"));
  test("空文字 → NONE",
    () => expect(detectCognitiveDistortions("")).toBe("NONE"));
});

describe("detectCrisisComposite — Layer1 + Layer2 統合", () => {
  test("Layer1のCRITICALはそのまま通過",
    () => expect(detectCrisisComposite("死にたい")).toBe("CRITICAL"));
  test("Layer1はNONEでもLayer2がHIGH → HIGH",
    () => expect(detectCrisisComposite(
      "完全にダメだ。いつも失敗するし、希望を持てない"
    )).not.toBe("NONE"));
  test("Layer1がMILDかつLayer2がMODERATE → MODERATE以上",
    () => {
      const result = detectCrisisComposite("疲れた。いつも失敗するし何一つうまくいかない");
      const idx = ["NONE","MILD","MODERATE","HIGH","CRITICAL"].indexOf(result);
      expect(idx).toBeGreaterThanOrEqual(2);
    });
  test("通常会話 → NONE",
    () => expect(detectCrisisComposite("今日は楽しかった！")).toBe("NONE"));
});

// ─── Layer 3: DBT感情状態モデリング ───────────────────────────────────────

describe("detectEmotionalState — DBT感情検出", () => {
  test("怒りの感情を検出",
    () => expect(detectEmotionalState("すごく怒りを感じてる").emotionType).toBe("anger"));
  test("悲しみの感情を検出",
    () => expect(detectEmotionalState("悲しくて泣いた").emotionType).toBe("sadness"));
  test("恐怖・不安を検出",
    () => expect(detectEmotionalState("怖くて不安で仕方ない").emotionType).toBe("fear"));
  test("羞恥・恥を検出",
    () => expect(detectEmotionalState("恥ずかしくてみじめだ").emotionType).toBe("shame"));
  test("感情調節困難を検出",
    () => expect(detectEmotionalState("感情がコントロールできない").dysregulated).toBe(true));

  test("Joiner孤立感のみ → joinerRisk:false",
    () => expect(detectEmotionalState("誰にもわかってくれない").joinerRisk).toBe(false));
  test("Joiner負担感のみ → joinerRisk:false",
    () => expect(detectEmotionalState("みんなに迷惑をかけてる").joinerRisk).toBe(false));
  test("孤立感＋負担感 → joinerRisk:true（高リスク）",
    () => expect(detectEmotionalState("誰にもわかってくれないし、みんなに迷惑をかけてる").joinerRisk).toBe(true));

  test("通常の会話 → intensity低く感情なし",
    () => {
      const state = detectEmotionalState("今日は映画を観た");
      expect(state.emotionType).toBeNull();
      expect(state.dysregulated).toBe(false);
      expect(state.joinerRisk).toBe(false);
    });
});

describe("emotionalStateToCrisisLevel — 感情→危機レベル変換", () => {
  test("joinerRisk:true → HIGH",
    () => expect(emotionalStateToCrisisLevel({ intensity: 0.5, dysregulated: false, joinerRisk: true })).toBe("HIGH"));
  test("dysregulated + 高intensity → HIGH",
    () => expect(emotionalStateToCrisisLevel({ intensity: 0.8, dysregulated: true, joinerRisk: false })).toBe("HIGH"));
  test("dysregulated のみ → MODERATE",
    () => expect(emotionalStateToCrisisLevel({ intensity: 0.4, dysregulated: true, joinerRisk: false })).toBe("MODERATE"));
  test("感情なし → NONE",
    () => expect(emotionalStateToCrisisLevel({ intensity: 0.2, dysregulated: false, joinerRisk: false })).toBe("NONE"));
});

describe("detectCrisisFull — Layer1+2+3 完全統合", () => {
  test("CRITICAL（Layer1）は最優先",
    () => expect(detectCrisisFull("死にたい")).toBe("CRITICAL"));
  test("通常会話は NONE",
    () => expect(detectCrisisFull("今日はごはんが美味しかった")).toBe("NONE"));
  test("孤立感＋負担感の組み合わせ → HIGH以上",
    () => {
      const result = detectCrisisFull("誰にもわかってくれないし、みんなに迷惑をかけてる");
      const idx = ["NONE","MILD","MODERATE","HIGH","CRITICAL"].indexOf(result);
      expect(idx).toBeGreaterThanOrEqual(3);
    });
  test("認知の歪み複数＋感情あり → MODERATE以上",
    () => {
      const result = detectCrisisFull("いつも失敗するし完全にダメだ、悲しくて仕方ない");
      const idx = ["NONE","MILD","MODERATE","HIGH","CRITICAL"].indexOf(result);
      expect(idx).toBeGreaterThanOrEqual(2);
    });
});

// ─── Layer 4: 縦断的変化検知 ──────────────────────────────────────────────

describe("detectLongitudinalChange — ウェルビーイングトレンド", () => {
  test("ポジティブ履歴 → improving",
    () => expect(detectLongitudinalChange([1, 1, 1, 1]).trend).toBe("improving"));
  test("ネガティブ履歴 → declining",
    () => expect(detectLongitudinalChange([-1, -1, -1, -1]).trend).toBe("declining"));
  test("中立履歴 → stable",
    () => expect(detectLongitudinalChange([0, 0, 0, 0]).trend).toBe("stable"));
  test("declining + 直近2件ネガティブ → riskBoost:true",
    () => expect(detectLongitudinalChange([-1, -1, -1, -1]).riskBoost).toBe(true));
  test("declining でも直近2件が混在 → riskBoost:false",
    () => expect(detectLongitudinalChange([-1, -1, -1, 0]).riskBoost).toBe(false));
  test("データが1件以下 → stable, riskBoost:false",
    () => {
      const r = detectLongitudinalChange([]);
      expect(r.trend).toBe("stable");
      expect(r.riskBoost).toBe(false);
    });
  test("undefinedでもエラーにならない",
    () => expect(() => detectLongitudinalChange(undefined)).not.toThrow());
});

describe("Layer 5 — detectIdeationDimensions", () => {
  test("CRITICAL 表現で intent=2", () => {
    const d = detectIdeationDimensions("もう死にたい");
    expect(d.intent).toBe(2);
  });
  test("HIGH 表現で intent=1", () => {
    const d = detectIdeationDimensions("自分を傷つけたい");
    expect(d.intent).toBe(1);
  });
  test("通常会話で intent=0", () => {
    const d = detectIdeationDimensions("今日は天気がいい");
    expect(d.intent).toBe(0);
  });
  test("計画パターンで plan=1〜2", () => {
    const d = detectIdeationDimensions("具体的な方法を考えた");
    expect(d.plan).toBeGreaterThanOrEqual(1);
  });
  test("準備パターンで preparedness=1〜2", () => {
    const d = detectIdeationDimensions("遺書を書いた");
    expect(d.preparedness).toBeGreaterThanOrEqual(1);
  });
  test("access パターンで access=1〜2", () => {
    const d = detectIdeationDimensions("薬が手元にある");
    expect(d.access).toBeGreaterThanOrEqual(1);
  });
  test("crisisHistory が空なら history=0", () => {
    const d = detectIdeationDimensions("つらい", { crisisHistory: [] });
    expect(d.history).toBe(0);
  });
  test("過去 CRITICAL 1 件で history=1", () => {
    const d = detectIdeationDimensions("つらい", { crisisHistory: ["CRITICAL"] });
    expect(d.history).toBe(1);
  });
  test("過去 HIGH/CRITICAL 3 件以上で history=2", () => {
    const d = detectIdeationDimensions("つらい", {
      crisisHistory: ["CRITICAL", "HIGH", "CRITICAL", "MILD"],
    });
    expect(d.history).toBe(2);
  });
});

describe("Layer 5 — detectCrisisL5 シナリオ", () => {
  test("intent 単体（その他なし）→ Layer 1 由来で CRITICAL（既存挙動維持）", () => {
    // 死にたい は detectCrisis で CRITICAL なので detectCrisisFull も CRITICAL
    // L5 単体スコア=2 → MODERATE だが、Full との max で CRITICAL
    const r = detectCrisisL5("死にたい");
    expect(r.level).toBe("CRITICAL");
    expect(r.dimensions.intent).toBe(2);
  });

  test("intent + plan → HIGH 以上に上がる", () => {
    const r = detectCrisisL5("死にたい。具体的な方法を考えた");
    expect(["HIGH", "CRITICAL"]).toContain(r.level);
    expect(r.score).toBeGreaterThanOrEqual(4);
  });

  test("intent + plan + preparedness + access → CRITICAL（合計≥6）", () => {
    const r = detectCrisisL5(
      "死にたい。具体的な方法を考えた。遺書を書いた。薬が手元にある"
    );
    expect(r.level).toBe("CRITICAL");
    expect(r.score).toBeGreaterThanOrEqual(6);
  });

  test("plan 単体（intent なし）は MILD で天井 — 誤陽性しない", () => {
    // 「具体的な方法を考えた」だけ。intent=0 なので MILD でキャップ
    const r = detectCrisisL5("仕事の具体的な方法を考えた");
    expect(r.dimensions.intent).toBe(0);
    // L5 はキャップで MILD 以下、Full（detectCrisisFull）も NONE のはず
    expect(["NONE", "MILD"]).toContain(r.level);
  });

  test("preparedness 単体（intent なし）も天井で抑制", () => {
    const r = detectCrisisL5("引っ越しで身辺を整理した");
    // 「身辺を整理した」が PREPARATION_PATTERNS にマッチする可能性あり
    expect(r.dimensions.intent).toBe(0);
    expect(["NONE", "MILD"]).toContain(r.level);
  });

  test("通常会話 → NONE", () => {
    const r = detectCrisisL5("今日は天気がいい");
    expect(r.level).toBe("NONE");
    expect(r.score).toBe(0);
  });

  test("crisisHistory が積まれるとレベル底上げ", () => {
    const r = detectCrisisL5("自分を傷つけたい", {
      crisisHistory: ["CRITICAL", "HIGH", "CRITICAL"],
    });
    // intent=1 + history=2 = 3 → MODERATE 以上
    expect(["MODERATE", "HIGH", "CRITICAL"]).toContain(r.level);
  });

  test("dimensions と score が返る", () => {
    const r = detectCrisisL5("死にたい");
    expect(r.dimensions).toHaveProperty("intent");
    expect(r.dimensions).toHaveProperty("plan");
    expect(r.dimensions).toHaveProperty("preparedness");
    expect(r.dimensions).toHaveProperty("access");
    expect(r.dimensions).toHaveProperty("history");
    expect(typeof r.score).toBe("number");
  });
});
