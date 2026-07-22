// システムプロンプト生成のユニットテスト
import { CONV_MODES, inferConvMode, buildPrompt, parseSettingAction } from "./prompt.js";

const companion = { name: "Aico" };
const profile = { un: "テストさん", interests: [], pem: "auto", cs: "auto" };
const settings = { theme: "light" };

beforeEach(() => localStorage.clear());

describe("inferConvMode", () => {
  test("つらい系 → listen", () => expect(inferConvMode("今日はしんどい", "friend")).toBe("listen"));
  test("どうすれば系 → coach", () => expect(inferConvMode("どうすればいい？", "friend")).toBe("coach"));
  test("シグナルなし → 現在モード維持", () => expect(inferConvMode("ふむ", "think")).toBe("think"));
});

describe("buildPrompt", () => {
  test("三原則と呼び名を必ず含む", () => {
    const p = buildPrompt(companion, "NORMAL", profile, settings, "friend");
    expect(p).toContain("第一原則: 人間への危害防止");
    expect(p).toContain("テストさん");
  });

  test("CRISIS モードは MI 原則の指示に切り替わる", () => {
    const p = buildPrompt(companion, "CRISIS", profile, settings, "friend");
    expect(p).toContain("動機づけ面接（MI）の原則");
    expect(p).toContain("「電話しなさい」は絶対に言わない");
    expect(p).not.toContain("【友人モード");
  });

  test("coach モードは GROW の各ステップ注釈を含む（稼働版の文言を正とする）", () => {
    const p = buildPrompt(companion, "NORMAL", profile, settings, "coach");
    expect(p).toContain("Goal（何を達成したいか）");
    expect(p).toContain("「やろうとしていること」を褒める");
  });

  test("長期記憶があれば確実性ラベルと返答ルールを含む", () => {
    localStorage.setItem("aico_convCount", "10");
    localStorage.setItem("aico_longTermMemory", JSON.stringify([
      { conv_count: 9, last_mentioned_count: 9, entries: [{ fact: "犬を飼っている", certainty: 5, pinned: false }] },
    ]));
    const p = buildPrompt(companion, "NORMAL", profile, settings, "friend");
    expect(p).toContain("【長期記憶】");
    expect(p).toContain("犬を飼っている");
    expect(p).toContain("でたらめを「覚えてる」と言わない");
  });
});

describe("parseSettingAction", () => {
  test("設定変更アクションを抽出する", () => {
    expect(parseSettingAction('前置き{"action":"set_setting","key":"theme","value":"dark"}後置き'))
      .toEqual({ key: "theme", value: "dark" });
  });
  test("アクションが無ければ null", () => {
    expect(parseSettingAction("ただの返事")).toBeNull();
  });
});

describe("CONV_MODES", () => {
  test("4モードが揃っている", () => {
    expect(Object.keys(CONV_MODES).sort()).toEqual(["coach", "friend", "listen", "think"]);
  });
});
