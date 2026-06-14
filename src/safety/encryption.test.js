import {
  MIGRATABLE_KEYS,
  collectMigratable,
  applyMigratable,
  encryptData,
  exportCompanionData,
  importCompanionData,
  EXPORT_VERSION,
} from "./encryption.js";

const PW = "test-pass";

beforeEach(() => {
  localStorage.clear();
});

describe("collectMigratable", () => {
  test("アローリストの存在キーのみ生文字列で返す", () => {
    localStorage.setItem("aico_convCount", "42");
    localStorage.setItem("aico_apiMainEngine", "\"claude\"");
    const extra = collectMigratable();
    expect(extra.aico_convCount).toBe("42");
    expect(extra.aico_apiMainEngine).toBe("\"claude\"");
  });

  test("非アローリストキー（ログ等）は含めない", () => {
    localStorage.setItem("aico_errorlog", "[]");
    localStorage.setItem("aico_storagePaths", "{}");
    localStorage.setItem("aico_convCount", "3");
    const extra = collectMigratable();
    expect(extra).not.toHaveProperty("aico_errorlog");
    expect(extra).not.toHaveProperty("aico_storagePaths");
    expect(Object.keys(extra)).toEqual(["aico_convCount"]);
  });

  test("不在キーは返さない", () => {
    const extra = collectMigratable();
    expect(extra).toEqual({});
  });
});

describe("applyMigratable", () => {
  test("アローリスト内のキーのみ復元する", () => {
    applyMigratable({ aico_convCount: "7", aico_apiConfigured: "true" });
    expect(localStorage.getItem("aico_convCount")).toBe("7");
    expect(localStorage.getItem("aico_apiConfigured")).toBe("true");
  });

  test("アローリスト外の任意/悪意キーは復元しない（防御的）", () => {
    applyMigratable({ aico_errorlog: "leak", evilKey: "x", aico_convCount: "9" });
    expect(localStorage.getItem("aico_errorlog")).toBeNull();
    expect(localStorage.getItem("evilKey")).toBeNull();
    expect(localStorage.getItem("aico_convCount")).toBe("9");
  });

  test("null/非オブジェクトは no-op", () => {
    expect(() => applyMigratable(null)).not.toThrow();
    expect(() => applyMigratable("nope")).not.toThrow();
    expect(localStorage.length).toBe(0);
  });

  test("MIGRATABLE_KEYS は API鍵保管庫を含む", () => {
    expect(MIGRATABLE_KEYS).toContain("aico_apiKeyVault");
  });
});

describe("export → import ラウンドトリップ", () => {
  test("レガシー項目と進捗・状態系キーを完全復元する", async () => {
    const companion = { name: "Aico", e: "🤖" };
    const profile = { name: "User", interests: ["science"] };
    const msgs = [{ role: "user", text: "hi" }];
    const settings = { theme: "light" };

    localStorage.setItem("aico_convCount", "120");
    localStorage.setItem("aico_apiMainEngine", "\"claude\"");
    localStorage.setItem("aico_apiKeyVault", "ENCRYPTED_BLOB");
    localStorage.setItem("aico_longTermMemory", JSON.stringify([{ s: "memo" }]));

    const json = await exportCompanionData(companion, profile, msgs, settings, PW);

    // 別ブラウザを模して全消去してからインポート
    localStorage.clear();
    await importCompanionData(json, PW);

    expect(JSON.parse(localStorage.getItem("aico_companion"))).toEqual(companion);
    expect(JSON.parse(localStorage.getItem("aico_profile"))).toEqual(profile);
    expect(JSON.parse(localStorage.getItem("aico_msgs"))).toEqual(msgs);
    expect(JSON.parse(localStorage.getItem("aico_settings"))).toEqual(settings);
    expect(localStorage.getItem("aico_convCount")).toBe("120");
    expect(localStorage.getItem("aico_apiMainEngine")).toBe("\"claude\"");
    expect(localStorage.getItem("aico_apiKeyVault")).toBe("ENCRYPTED_BLOB");
    expect(JSON.parse(localStorage.getItem("aico_longTermMemory"))).toEqual([{ s: "memo" }]);
  });

  test("誤ったパスワードでは例外を投げる", async () => {
    const json = await exportCompanionData({}, {}, [], {}, PW);
    await expect(importCompanionData(json, "wrong")).rejects.toThrow();
  });

  test("非コンパニオンファイルは拒否する", async () => {
    const bogus = JSON.stringify({ format: "something-else", data: "x" });
    await expect(importCompanionData(bogus, PW)).rejects.toThrow();
  });
});

describe("後方互換", () => {
  test("extra を持たない旧形式 payload も例外なくインポートできる", async () => {
    const companion = { name: "Old" };
    const payload = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      companion,
      profile: { name: "U" },
      msgs: [],
      settings: { theme: "dark" },
      longTermMemory: [],
      // extra なし
    });
    const enc = await encryptData(payload, PW);
    const json = JSON.stringify({ format: "aico-companion", v: "1.0", data: enc });

    await importCompanionData(json, PW);
    expect(JSON.parse(localStorage.getItem("aico_companion"))).toEqual(companion);
    expect(JSON.parse(localStorage.getItem("aico_settings"))).toEqual({ theme: "dark" });
  });

  test("phase が欠落していれば chat を既定値にする", async () => {
    const payload = JSON.stringify({
      version: EXPORT_VERSION,
      companion: { name: "X" },
      profile: {}, msgs: [], settings: {},
      longTermMemory: [],
      extra: {}, // aico_phase なし
    });
    const enc = await encryptData(payload, PW);
    const json = JSON.stringify({ format: "aico-companion", v: EXPORT_VERSION, data: enc });

    await importCompanionData(json, PW);
    expect(localStorage.getItem("aico_phase")).toBe(JSON.stringify("chat"));
  });

  test("phase が含まれていればその値を保持する", async () => {
    localStorage.setItem("aico_phase", JSON.stringify("welcome"));
    const json = await exportCompanionData({}, {}, [], {}, PW);
    localStorage.clear();
    await importCompanionData(json, PW);
    expect(localStorage.getItem("aico_phase")).toBe(JSON.stringify("welcome"));
  });
});
