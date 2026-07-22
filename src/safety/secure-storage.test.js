// 保存時暗号化ストレージ層のユニットテスト
import {
  ENCRYPTED_KEYS,
  ENC_PREFIX,
  setSessionPin,
  clearSessionPin,
  isUnlocked,
  isEncryptedValue,
  secureRead,
  secureWrite,
  migrateToEncrypted,
  migrateToPlaintext,
} from "./secure-storage.js";

const PIN = "1234-secret";

beforeEach(() => {
  localStorage.clear();
  clearSessionPin();
});

describe("セッション鍵の管理", () => {
  test("初期状態はロック（未解錠）", () => {
    expect(isUnlocked()).toBe(false);
  });
  test("setSessionPin で解錠、clearSessionPin でロック", () => {
    setSessionPin(PIN);
    expect(isUnlocked()).toBe(true);
    clearSessionPin();
    expect(isUnlocked()).toBe(false);
  });
});

describe("secureWrite / secureRead", () => {
  test("鍵あり: 暗号化して保存し、復号して読める（ラウンドトリップ）", async () => {
    setSessionPin(PIN);
    const msgs = [{ role: "user", text: "秘密の会話" }];
    await secureWrite("aico_msgs", msgs);

    const raw = localStorage.getItem("aico_msgs");
    expect(isEncryptedValue(raw)).toBe(true);
    expect(raw).not.toContain("秘密の会話"); // 平文が残っていない

    expect(await secureRead("aico_msgs")).toEqual(msgs);
  });

  test("鍵なし: 平文で保存され、そのまま読める（オプトイン外・後方互換）", async () => {
    const val = { name: "Aico" };
    await secureWrite("aico_companion", val);
    const raw = localStorage.getItem("aico_companion");
    expect(isEncryptedValue(raw)).toBe(false);
    expect(JSON.parse(raw)).toEqual(val);
    expect(await secureRead("aico_companion")).toEqual(val);
  });

  test("平文（未移行）データは鍵の有無に関わらず読める", async () => {
    localStorage.setItem("aico_profile", JSON.stringify({ un: "User" }));
    expect(await secureRead("aico_profile")).toEqual({ un: "User" });
    setSessionPin(PIN);
    expect(await secureRead("aico_profile")).toEqual({ un: "User" });
  });

  test("不在キーは既定値を返す", async () => {
    expect(await secureRead("aico_msgs", [])).toEqual([]);
  });

  test("鍵なしで暗号文を読もうとすると例外（要解錠）", async () => {
    setSessionPin(PIN);
    await secureWrite("aico_msgs", [{ text: "x" }]);
    clearSessionPin();
    await expect(secureRead("aico_msgs")).rejects.toThrow(/locked/);
  });

  test("誤った PIN では復号に失敗する", async () => {
    setSessionPin(PIN);
    await secureWrite("aico_msgs", [{ text: "x" }]);
    setSessionPin("wrong-pin");
    await expect(secureRead("aico_msgs")).rejects.toThrow();
  });

  test("大きな会話ログ（>256KB）でも壊れない", async () => {
    setSessionPin(PIN);
    const big = Array.from({ length: 5000 }, (_, i) => ({ role: "user", text: `メッセージ${i}`.repeat(5) }));
    await secureWrite("aico_msgs", big);
    expect(await secureRead("aico_msgs")).toEqual(big);
  });
});

describe("migrateToEncrypted", () => {
  test("対象キーの平文を暗号化し、非対象キーには触れない", async () => {
    localStorage.setItem("aico_msgs", JSON.stringify([{ text: "会話" }]));
    localStorage.setItem("aico_settings", JSON.stringify({ theme: "dark" })); // 非対象

    await migrateToEncrypted(PIN);

    expect(isEncryptedValue(localStorage.getItem("aico_msgs"))).toBe(true);
    // 非対象キーは平文のまま
    expect(localStorage.getItem("aico_settings")).toBe(JSON.stringify({ theme: "dark" }));

    // 移行後、その PIN で読める
    setSessionPin(PIN);
    expect(await secureRead("aico_msgs")).toEqual([{ text: "会話" }]);
  });

  test("既に暗号化済みのキーは二重暗号化しない", async () => {
    setSessionPin(PIN);
    await secureWrite("aico_msgs", [{ text: "会話" }]);
    const before = localStorage.getItem("aico_msgs");
    clearSessionPin();

    await migrateToEncrypted(PIN);
    expect(localStorage.getItem("aico_msgs")).toBe(before); // 変化なし
  });

  test("全 ENCRYPTED_KEYS を対象にする", async () => {
    for (const k of ENCRYPTED_KEYS) localStorage.setItem(k, JSON.stringify({ k }));
    await migrateToEncrypted(PIN);
    for (const k of ENCRYPTED_KEYS) {
      expect(localStorage.getItem(k).startsWith(ENC_PREFIX)).toBe(true);
    }
  });
});

describe("migrateToPlaintext", () => {
  test("暗号化データを平文へ戻す（オプトイン解除）", async () => {
    setSessionPin(PIN);
    await secureWrite("aico_msgs", [{ text: "会話" }]);
    clearSessionPin();

    await migrateToPlaintext(PIN);

    const raw = localStorage.getItem("aico_msgs");
    expect(isEncryptedValue(raw)).toBe(false);
    expect(JSON.parse(raw)).toEqual([{ text: "会話" }]);
  });
});
