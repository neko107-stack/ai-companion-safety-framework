// 会話系データの保存時暗号化ストレージ層（PIN オプトイン方式）
// PROJECT_REVIEW.md §4.1 #1 / §3.5 の対応。
//
// 設計方針:
// - 暗号プリミティブ（AES-256-GCM + PBKDF2）は encryption.js を再利用する。
// - 暗号化対象は「機微な会話・人物情報」に限定する。設定・フラグ系は対象外
//   （暗号化の価値が低く、同期的な state 初期化を保つため）。
// - PIN 未設定のユーザーは従来どおり平文で保存する（後方互換・移行の強制なし）。
// - PIN はモジュール内クロージャにのみ保持し、どこにも永続化しない
//   （API キーボルトと同一の設計。忘れると暗号化データは復元不能）。
import { encryptData, decryptData } from "./encryption.js";

// 暗号化対象の localStorage キー（"aico_" プレフィックス込み）。
export const ENCRYPTED_KEYS = [
  "aico_msgs",
  "aico_history",
  "aico_companion",
  "aico_profile",
  "aico_longTermMemory",
];

// 暗号文の識別プレフィックス。平文 JSON と判別し、後方互換読み取りを可能にする。
export const ENC_PREFIX = "enc:v1:";

// セッション鍵（PIN）はモジュール内クロージャに保持し、永続化しない。
let _sessionPin = null;

export function setSessionPin(pin) { _sessionPin = pin || null; }
export function clearSessionPin() { _sessionPin = null; }
export function isUnlocked() { return _sessionPin !== null; }

export function isEncryptedKey(key) { return ENCRYPTED_KEYS.includes(key); }
export function isEncryptedValue(raw) {
  return typeof raw === "string" && raw.startsWith(ENC_PREFIX);
}

// localStorage から読み込む。暗号文なら復号して JSON.parse、
// 平文（未移行）ならそのまま JSON.parse する。
// 鍵が無いのに暗号文を読もうとした場合は例外を投げる（呼び出し側が解錠を促す）。
export async function secureRead(key, def = null) {
  let raw;
  try { raw = localStorage.getItem(key); } catch { return def; }
  if (raw === null) return def;
  if (isEncryptedValue(raw)) {
    if (_sessionPin === null) throw new Error("locked: encrypted data requires unlock");
    const json = await decryptData(raw.slice(ENC_PREFIX.length), _sessionPin);
    try { return JSON.parse(json); } catch { return def; }
  }
  try { return JSON.parse(raw); } catch { return def; }
}

// localStorage へ保存する。鍵ありなら暗号化して保存、なしなら平文で保存する
// （オプトイン外・後方互換）。
export async function secureWrite(key, val) {
  const json = JSON.stringify(val);
  if (_sessionPin !== null) {
    const blob = await encryptData(json, _sessionPin);
    localStorage.setItem(key, ENC_PREFIX + blob);
  } else {
    localStorage.setItem(key, json);
  }
}

// 既存の平文データを暗号化して書き戻す（オプトイン有効化時に一度だけ）。
// 既に暗号化済み・存在しないキーはスキップする。
export async function migrateToEncrypted(pin) {
  for (const key of ENCRYPTED_KEYS) {
    let raw;
    try { raw = localStorage.getItem(key); } catch { continue; }
    if (raw === null || isEncryptedValue(raw)) continue;
    // raw は lsSet 由来の JSON 文字列。そのまま暗号化する（secureRead と対称）。
    const blob = await encryptData(raw, pin);
    localStorage.setItem(key, ENC_PREFIX + blob);
  }
}

// 暗号化データを平文へ戻す（オプトイン解除時）。pin で復号できる必要がある。
export async function migrateToPlaintext(pin) {
  for (const key of ENCRYPTED_KEYS) {
    let raw;
    try { raw = localStorage.getItem(key); } catch { continue; }
    if (raw === null || !isEncryptedValue(raw)) continue;
    const json = await decryptData(raw.slice(ENC_PREFIX.length), pin);
    localStorage.setItem(key, json);
  }
}
