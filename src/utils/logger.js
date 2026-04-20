// エラーログシステム
// 会話内容・APIキー・個人情報は一切含めない設計

export const APP_VERSION = "2.6";
const LOG_KEY  = "aico_errorlog";
const LOG_MAX  = 200;

export const ERR = {
  API_AUTH:      { code:"API_AUTH_FAILED",      cat:"api",     label:"APIキー認証エラー" },
  API_RATE:      { code:"API_RATE_LIMITED",      cat:"api",     label:"レート制限" },
  API_MODEL:     { code:"API_MODEL_NOT_FOUND",   cat:"api",     label:"モデル不存在" },
  API_TIMEOUT:   { code:"API_TIMEOUT",           cat:"api",     label:"タイムアウト" },
  API_NETWORK:   { code:"API_NETWORK_ERROR",     cat:"api",     label:"ネットワークエラー" },
  API_RESPONSE:  { code:"API_INVALID_RESPONSE",  cat:"api",     label:"レスポンス不正" },
  API_UNKNOWN:   { code:"API_UNKNOWN",           cat:"api",     label:"API不明エラー" },
  LS_WRITE:      { code:"LS_WRITE_FAILED",       cat:"storage", label:"localStorage書き込み失敗" },
  LS_READ:       { code:"LS_READ_FAILED",        cat:"storage", label:"localStorage読み込み失敗" },
  SS_UNAVAIL:    { code:"SS_UNAVAILABLE",        cat:"storage", label:"sessionStorage利用不可" },
  CRYPTO_UNSUP:  { code:"CRYPTO_UNSUPPORTED",    cat:"crypto",  label:"Web Crypto API未対応" },
  CRYPTO_EXPORT: { code:"CRYPTO_EXPORT_FAILED",  cat:"crypto",  label:"エクスポート失敗" },
  CRYPTO_IMPORT: { code:"CRYPTO_IMPORT_FAILED",  cat:"crypto",  label:"インポート失敗" },
  CRYPTO_PASS:   { code:"CRYPTO_WRONG_PASSWORD", cat:"crypto",  label:"パスワード不一致" },
  CRISIS_TRANS:  { code:"CRISIS_TRANSITION",     cat:"crisis",  label:"危機レベル遷移" },
  UI_PHASE:      { code:"UI_PHASE_ERROR",        cat:"ui",      label:"画面遷移エラー" },
  UI_RENDER:     { code:"UI_RENDER_ERROR",       cat:"ui",      label:"描画エラー" },
};

export function classifyApiError(status, message) {
  if (status === 401 || status === 403) return ERR.API_AUTH;
  if (status === 429)                   return ERR.API_RATE;
  if (status === 404)                   return ERR.API_MODEL;
  if (status === 408 || status === 504) return ERR.API_TIMEOUT;
  if (!status && message && (message.includes("fetch") || message.includes("network") || message.includes("Failed")))
    return ERR.API_NETWORK;
  return ERR.API_UNKNOWN;
}

export function recordLog(errType, context = {}, phase = "unknown") {
  const entry = {
    id:         Math.random().toString(36).slice(2, 10),
    ts:         new Date().toISOString(),
    category:   errType.cat,
    code:       errType.code,
    label:      errType.label,
    context,
    appVersion: APP_VERSION,
    phase,
    sent:       false,
  };
  try {
    const raw  = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {}
  return entry;
}

export function getLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function exportLogs() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: APP_VERSION, logs: getLogs() }, null, 2);
}

export function clearLogs() {
  try { localStorage.removeItem(LOG_KEY); } catch {}
}
