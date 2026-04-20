// 暗号化ユーティリティ（Web Crypto API）
// AES-256-GCM + PBKDF2-SHA256（100,000回）
// ※ NIST SP 800-132（2023）はSHA-256で最低600,000回を推奨。
//    Phase 4セキュリティ監査時に既存エクスポートの後方互換性を保ちながら引き上げを検討する。

export const EXPORT_VERSION = "1.0";

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations:100000, hash:"SHA-256" },
    mat, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
  );
}

export async function encryptData(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const ct   = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(plaintext));
  const buf  = new Uint8Array(28 + ct.byteLength);
  buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptData(b64, password) {
  const buf   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key   = await deriveKey(password, buf.slice(0,16));
  const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)}, key, buf.slice(28));
  return new TextDecoder().decode(plain);
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
  const data = JSON.parse(await decryptData(p.data, password));
  if (data.longTermMemory && data.longTermMemory.length > 0) {
    try { localStorage.setItem("aico_longTermMemory", JSON.stringify(data.longTermMemory)); } catch {}
  }
  return data;
}
