// AIモデル動的検出モジュール
// 各プロバイダーの「モデル一覧」APIを叩いて、選択可能なモデルを動的に取得する。
// 失敗してもUIを壊さないよう、例外は投げず常に配列を返す（鍵・PIIはログに含めない）。
import { ERR, classifyApiError, recordLog } from "../utils/logger.js";

// チャット非対応のOpenAIモデルを除外するためのパターン
const OPENAI_CHAT_RE    = /^(gpt-|o1|o3|o4|chatgpt-)/i;
const OPENAI_EXCLUDE_RE = /(embedding|whisper|tts|dall-e|audio|image|realtime|moderation|transcribe|search|instruct|davinci|babbage|ada|curie|moderation)/i;

// 各社の list models API を叩いて [{id, label}] を返す。
// 失敗時（ネットワーク/認証/パース）は recordLog の上で [] を返し、throw しない。
export async function discoverModels(engineId, apiKey, { phase = "model-discovery" } = {}) {
  if (!apiKey || !engineId) return [];
  const ctx = { engine: engineId }; // 鍵・モデル本文は絶対に入れない

  try {
    if (engineId === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        recordLog(classifyApiError(res.status, d.error?.message), { ...ctx, httpStatus: res.status }, phase);
        return [];
      }
      // created_at 降順（新しい順）。has_more（ページング）は未対応：limit=1000で十分。
      const list = Array.isArray(d.data) ? d.data : [];
      return list
        .slice()
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
        .map(m => ({ id: m.id, label: m.display_name || m.id }))
        .filter(m => m.id);
    }

    if (engineId === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        recordLog(classifyApiError(res.status, d.error?.message), { ...ctx, httpStatus: res.status }, phase);
        return [];
      }
      const list = Array.isArray(d.data) ? d.data : [];
      return list
        .map(m => m.id)
        .filter(id => id && OPENAI_CHAT_RE.test(id) && !OPENAI_EXCLUDE_RE.test(id))
        .map(id => ({ id, label: id }));
    }

    if (engineId === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: "GET",
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        recordLog(classifyApiError(res.status, d.error?.message), { ...ctx, httpStatus: res.status }, phase);
        return [];
      }
      const list = Array.isArray(d.models) ? d.models : [];
      return list
        .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
        .map(m => {
          const id = (m.name || "").replace(/^models\//, "");
          return { id, label: m.displayName || id };
        })
        .filter(m => m.id);
    }

    // llama（ローカル）等は動的検出の対象外
    return [];
  } catch (netErr) {
    recordLog(ERR.API_NETWORK, { ...ctx, message: netErr.message }, phase);
    return [];
  }
}

// ベースライン（curated）と検出結果をマージする。
// - ベースラインの順序・ラベルを保持し、ベースラインに無い検出モデルのみ末尾に追加
// - id重複はベースライン優先
// - 検出のみのモデルはラベルに「（自動検出）」を付与
export function mergeModels(baseline = [], discovered = []) {
  const result = baseline.map(m => ({ ...m }));
  const seen = new Set(baseline.map(m => m.id));
  for (const m of discovered) {
    if (!m || !m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    const label = m.label && m.label !== m.id ? m.label : m.id;
    result.push({ id: m.id, label: `${label}（自動検出）` });
  }
  return result;
}
