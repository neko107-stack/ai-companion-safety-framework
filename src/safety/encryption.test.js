/** @jest-environment node */
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  KDF_ITERS_V1,
  KDF_ITERS_V2,
  EXPORT_VERSION,
  encryptData,
  decryptData,
  exportCompanionData,
  importCompanionData,
} from "./encryption.js";

// localStorage shim for exportCompanionData / importCompanionData
const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  clear: () => memStore.clear(),
};

beforeEach(() => memStore.clear());

describe("encryption — 定数", () => {
  test("EXPORT_VERSION は 2.0", () => {
    expect(EXPORT_VERSION).toBe("2.0");
  });
  test("反復回数定数", () => {
    expect(KDF_ITERS_V1).toBe(100_000);
    expect(KDF_ITERS_V2).toBe(600_000);
  });
});

describe("encryptData / decryptData — v2 round-trip", () => {
  test("短い ASCII 文字列", async () => {
    const enc = await encryptData("hello world", "pw");
    const dec = await decryptData(enc, "pw");
    expect(dec).toBe("hello world");
  });

  test("日本語文字列", async () => {
    const text = "おかんに電話した。元気そうだった。";
    const enc = await encryptData(text, "ぱすわーど123");
    const dec = await decryptData(enc, "ぱすわーど123");
    expect(dec).toBe(text);
  });

  test("大きめの JSON ペイロード", async () => {
    const obj = { msgs: Array.from({ length: 100 }, (_, i) => ({ i, t: "あ".repeat(20) })) };
    const enc = await encryptData(JSON.stringify(obj), "pw");
    const dec = await decryptData(enc, "pw");
    expect(JSON.parse(dec)).toEqual(obj);
  });

  test("間違ったパスワードでは失敗する", async () => {
    const enc = await encryptData("secret", "right");
    await expect(decryptData(enc, "wrong")).rejects.toBeDefined();
  });
});

describe("decryptData — v1 後方互換", () => {
  // v1 形式の暗号文をテスト用に生成（KDF_ITERS_V1 で派生した鍵を使用）
  async function encryptV1(plaintext, password) {
    const enc = new TextEncoder();
    const mat = await globalThis.crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv   = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key  = await globalThis.crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations:KDF_ITERS_V1, hash:"SHA-256" },
      mat, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
    );
    const ct  = await globalThis.crypto.subtle.encrypt(
      {name:"AES-GCM",iv}, key, enc.encode(plaintext)
    );
    const buf = new Uint8Array(28 + ct.byteLength);
    buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
    return btoa(String.fromCharCode(...buf));
  }

  test("hintVersion='1.0' で v1 暗号文を復号できる", async () => {
    const enc = await encryptV1("legacy data", "old-pw");
    const dec = await decryptData(enc, "old-pw", "1.0");
    expect(dec).toBe("legacy data");
  });

  test("hint なしでも v1 暗号文を自動フォールバックで復号できる", async () => {
    const enc = await encryptV1("legacy data 2", "old-pw");
    const dec = await decryptData(enc, "old-pw");
    expect(dec).toBe("legacy data 2");
  });

  test("v1 で間違ったパスワードは v2 フォールバック後も失敗する", async () => {
    const enc = await encryptV1("legacy", "right");
    await expect(decryptData(enc, "wrong")).rejects.toBeDefined();
  });
});

describe("exportCompanionData / importCompanionData", () => {
  const companion = { name: "テスト", personality: "warm" };
  const profile = { age: 30 };
  const msgs = [{ role: "user", text: "こんにちは" }];
  const settings = { theme: "dark" };

  test("v2 形式でラップ・round-trip", async () => {
    const blob = await exportCompanionData(companion, profile, msgs, settings, "pw");
    const wrap = JSON.parse(blob);
    expect(wrap.format).toBe("aico-companion");
    expect(wrap.v).toBe("2.0");

    const data = await importCompanionData(blob, "pw");
    expect(data.companion).toEqual(companion);
    expect(data.msgs).toEqual(msgs);
  });

  test("longTermMemory が localStorage に書き戻される", async () => {
    const ltm = [{ id: "a", text: "覚えている", certainty: 4 }];
    localStorage.setItem("aico_longTermMemory", JSON.stringify(ltm));
    const blob = await exportCompanionData(companion, profile, msgs, settings, "pw");

    localStorage.removeItem("aico_longTermMemory");
    await importCompanionData(blob, "pw");

    expect(JSON.parse(localStorage.getItem("aico_longTermMemory"))).toEqual(ltm);
  });

  test("v1.0 ラッパーを透過受理する", async () => {
    // v1 wrapper の手作り：内部 data も v1 反復回数で暗号化
    const enc = new TextEncoder();
    const password = "pw";
    const mat = await globalThis.crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv   = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key  = await globalThis.crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations:KDF_ITERS_V1, hash:"SHA-256" },
      mat, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
    );
    const inner = JSON.stringify({
      version: "1.0", exportedAt: "2025-01-01T00:00:00Z",
      companion, profile, msgs, settings, longTermMemory: [],
    });
    const ct  = await globalThis.crypto.subtle.encrypt(
      {name:"AES-GCM",iv}, key, enc.encode(inner)
    );
    const buf = new Uint8Array(28 + ct.byteLength);
    buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
    const dataB64 = btoa(String.fromCharCode(...buf));
    const v1Blob = JSON.stringify({ format:"aico-companion", v:"1.0", data:dataB64 });

    const data = await importCompanionData(v1Blob, password);
    expect(data.companion).toEqual(companion);
    expect(data.version).toBe("1.0");
  });

  test("不正フォーマットは拒否", async () => {
    await expect(importCompanionData(JSON.stringify({ format:"other" }), "pw"))
      .rejects.toThrow("コンパニオンデータ");
  });
});
