// AIモデル・バージョン管理レジストリ（仕様書 §21.4）
// 退役モデルが指定された場合は後継に解決し、移行履歴を localStorage に残す。

export const MODEL_LOG_KEY = "aico_modelVersionLog";
const MODEL_LOG_MAX = 100;

export const MODEL_REGISTRY = {
  // Claude（Anthropic）
  "claude-opus-4-7": {
    family: "claude", displayName: "Claude Opus 4.7",
    contextWindow: 200_000, retiredAt: null, replacement: null,
  },
  "claude-sonnet-4-6": {
    family: "claude", displayName: "Claude Sonnet 4.6",
    contextWindow: 200_000, retiredAt: null, replacement: null,
  },
  "claude-haiku-4-5-20251001": {
    family: "claude", displayName: "Claude Haiku 4.5",
    contextWindow: 200_000, retiredAt: null, replacement: null,
  },

  // 退役済み Claude → 後継への自動移行
  "claude-3-5-sonnet-20240620": {
    family: "claude", displayName: "Claude 3.5 Sonnet (legacy)",
    contextWindow: 200_000, retiredAt: "2026-04-01", replacement: "claude-sonnet-4-6",
  },
  "claude-3-5-sonnet-20241022": {
    family: "claude", displayName: "Claude 3.5 Sonnet v2 (legacy)",
    contextWindow: 200_000, retiredAt: "2026-04-01", replacement: "claude-sonnet-4-6",
  },
  "claude-3-haiku-20240307": {
    family: "claude", displayName: "Claude 3 Haiku (legacy)",
    contextWindow: 200_000, retiredAt: "2026-04-01", replacement: "claude-haiku-4-5-20251001",
  },
  "claude-3-opus-20240229": {
    family: "claude", displayName: "Claude 3 Opus (legacy)",
    contextWindow: 200_000, retiredAt: "2026-04-01", replacement: "claude-opus-4-7",
  },

  // OpenAI
  "gpt-4o": {
    family: "openai", displayName: "GPT-4o",
    contextWindow: 128_000, retiredAt: null, replacement: null,
  },
  "gpt-4o-mini": {
    family: "openai", displayName: "GPT-4o mini",
    contextWindow: 128_000, retiredAt: null, replacement: null,
  },

  // Gemini（Google）
  "gemini-2.0-flash": {
    family: "gemini", displayName: "Gemini 2.0 Flash",
    contextWindow: 1_000_000, retiredAt: null, replacement: null,
  },
  "gemini-1.5-pro": {
    family: "gemini", displayName: "Gemini 1.5 Pro",
    contextWindow: 2_000_000, retiredAt: null, replacement: null,
  },
  "gemini-1.5-flash": {
    family: "gemini", displayName: "Gemini 1.5 Flash",
    contextWindow: 1_000_000, retiredAt: null, replacement: null,
  },
};

// requestedId を解決する。
// 戻り値: { id, info, replaced: boolean, requestedId }
//   未登録 ID は素通し（id = requestedId, info = null, replaced = false）
//   退役済みは replacement へ差替（id = replacement, replaced = true）
export function resolveModel(requestedId) {
  const info = MODEL_REGISTRY[requestedId] || null;
  if (info && info.replacement) {
    const replInfo = MODEL_REGISTRY[info.replacement] || null;
    return { id: info.replacement, info: replInfo, replaced: true, requestedId };
  }
  return { id: requestedId, info, replaced: false, requestedId };
}

// 移行履歴を localStorage に追記する（最大 MODEL_LOG_MAX 件）。
export function recordModelTransition(requestedId, resolvedId, phase = "chat") {
  if (requestedId === resolvedId) return null;
  const entry = {
    ts: new Date().toISOString(),
    requestedId, resolvedId, phase,
  };
  try {
    const raw = localStorage.getItem(MODEL_LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    if (logs.length > MODEL_LOG_MAX) logs.splice(0, logs.length - MODEL_LOG_MAX);
    localStorage.setItem(MODEL_LOG_KEY, JSON.stringify(logs));
  } catch {}
  return entry;
}

export function getModelTransitionLog() {
  try {
    const raw = localStorage.getItem(MODEL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
