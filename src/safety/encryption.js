// 暗号化ユーティリティ（Web Crypto API）
// AES-256-GCM + PBKDF2-SHA256
// v2.0 は NIST SP 800-132（2023）推奨の 600,000 反復を使用。
// 旧 v1.0（100,000 反復）でエクスポートされたデータも復号できるよう後方互換を維持する。

export const KDF_ITERS_V1 = 100_000;
export const KDF_ITERS_V2 = 600_000;
export const EXPORT_VERSION = "2.0";

async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations, hash:"SHA-256" },
    mat, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
  );
}

export async function encryptData(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt, KDF_ITERS_V2);
  const ct   = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(plaintext));
  const buf  = new Uint8Array(28 + ct.byteLength);
  buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
  return btoa(String.fromCharCode(...buf));
}

async function decryptWithIterations(b64, password, iterations) {
  const buf   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key   = await deriveKey(password, buf.slice(0,16), iterations);
  const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)}, key, buf.slice(28));
  return new TextDecoder().decode(plain);
}

// 復号は v2 → v1 の順で試行する。
// AES-GCM 認証失敗は決定的なので、v2 が失敗したら確実に v1 形式とみなせる。
export async function decryptData(b64, password, hintVersion) {
  if (hintVersion === "1.0") {
    return decryptWithIterations(b64, password, KDF_ITERS_V1);
  }
  try {
    return await decryptWithIterations(b64, password, KDF_ITERS_V2);
  } catch {
    return decryptWithIterations(b64, password, KDF_ITERS_V1);
  }
}

export async function exportCompanionData(companion, profile, msgs, settings, password) {
  let longTermMemory = [];
  try {
    const raw = localStorage.getItem("aico_longTermMemory");
    if (raw) longTermMemory = JSON.parse(raw);
  } catch {}
  const payload = JSON.stringify({
    version: EXPORT_VERSION, exportedAt: new Date().toISOString(),
    companion, profile, msgs, settings, longTermMemory,
  });
  const enc = await encryptData(payload, password);
  return JSON.stringify({ format:"aico-companion", v:EXPORT_VERSION, data:enc });
}

export async function importCompanionData(jsonStr, password) {
  const p = JSON.parse(jsonStr);
  if (p.format !== "aico-companion") throw new Error("このファイルはコンパニオンデータではありません");
  const data = JSON.parse(await decryptData(p.data, password, p.v));
  if (data.longTermMemory && data.longTermMemory.length > 0) {
    try { localStorage.setItem("aico_longTermMemory", JSON.stringify(data.longTermMemory)); } catch {}
  }
  return data;
}
