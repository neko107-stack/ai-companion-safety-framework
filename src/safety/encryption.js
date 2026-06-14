// 暗号化ユーティリティ（Web Crypto API）
// AES-256-GCM + PBKDF2-SHA256（100,000回）
// ※ NIST SP 800-132（2023）はSHA-256で最低600,000回を推奨。
//    Phase 4セキュリティ監査時に既存エクスポートの後方互換性を保ちながら引き上げを検討する。

export const EXPORT_VERSION = "1.1";

// 別ブラウザ/端末へ移行すべきユーザー進捗・状態キー。
// 5つのレガシー項目（aico_companion/profile/msgs/settings/longTermMemory）は
// 後方互換のため payload トップレベルで別途扱うのでここには含めない。
// デバイス固有・ログ・セッション系・課金一過性キーは意図的に除外している。
export const MIGRATABLE_KEYS = [
  // 進捗・状態系
  "aico_convCount", "aico_phase", "aico_convMode", "aico_autoMode",
  "aico_intervention_v1", "aico_weeklyChallenge",
  // 介入・ブリッジング履歴
  "aico_bridgingHistory", "aico_bridgingStage", "aico_phaseBridgingHist",
  "aico_depHistory", "aico_socialStats",
  // API設定（鍵以外）
  "aico_apiMainEngine", "aico_apiModels", "aico_apiLlamaEndpoint",
  "aico_apiLlamaCustomModel", "aico_apiConfigured", "aico_userTier",
  // 暗号化API鍵保管庫（PIN暗号化済み・復元には別途PINが必要）
  "aico_apiKeyVault",
];

// アローリストキーの生文字列を退避する（JSON/素文字列の差異に依存しない）。
export function collectMigratable(storage = localStorage) {
  const extra = {};
  for (const k of MIGRATABLE_KEYS) {
    const v = storage.getItem(k);
    if (v !== null) extra[k] = v;
  }
  return extra;
}

// アローリストに含まれるキーのみ復元する。悪意あるファイルが任意キーを
// 注入するのを防ぐため、必ずアローリストでフィルタする（防御的設計）。
export function applyMigratable(extra, storage = localStorage) {
  if (!extra || typeof extra !== "object") return;
  for (const k of MIGRATABLE_KEYS) {
    if (typeof extra[k] === "string") {
      try { storage.setItem(k, extra[k]); } catch {}
    }
  }
}

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
    extra: collectMigratable(),
  });
  const enc = await encryptData(payload, password);
  return JSON.stringify({ format:"aico-companion", v:EXPORT_VERSION, data:enc });
}

export async function importCompanionData(jsonStr, password) {
  const p = JSON.parse(jsonStr);
  if (p.format !== "aico-companion") throw new Error("このファイルはコンパニオンデータではありません");
  const data = JSON.parse(await decryptData(p.data, password));

  // レガシー項目を localStorage に復元
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  if (data.companion) save("aico_companion", data.companion);
  if (data.profile)   save("aico_profile",   data.profile);
  if (data.msgs)      save("aico_msgs",      data.msgs);
  if (data.settings)  save("aico_settings",  data.settings);
  if (data.longTermMemory && data.longTermMemory.length > 0) {
    save("aico_longTermMemory", data.longTermMemory);
  }

  // 進捗・状態系キー（生文字列）を復元
  applyMigratable(data.extra);

  // フェーズが欠落していればチャット画面へ（旧来の強制挙動の後方互換）
  try {
    if (!localStorage.getItem("aico_phase")) localStorage.setItem("aico_phase", JSON.stringify("chat"));
  } catch {}

  return data;
}
