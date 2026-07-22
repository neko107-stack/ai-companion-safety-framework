// 長期記憶サマリー管理モジュール（時間減衰アルゴリズム）
import { callAI } from "./engines.js";
import { isUnlocked, secureWrite } from "../safety/secure-storage.js";

const LTM_KEY = "aico_longTermMemory";

// 保存時暗号化（オプトイン）が有効なとき、aico_longTermMemory は暗号文になり
// 同期的な JSON.parse では読めない。そのため解錠時に復号済みの配列を
// この「復号ミラー」に載せ、getLongTermMemory はここを同期的に返す。
// （buildPrompt などが getLongTermMemory を同期呼び出しするため非同期化しない）
let _ltmCache = null;

// 解錠時に prototype が復号済みの長期記憶を注入する。
export function setLtmCache(arr) { _ltmCache = Array.isArray(arr) ? arr : null; }
// ロック/ログアウト時にミラーを破棄する。
export function clearLtmCache() { _ltmCache = null; }

export function getLongTermMemory() {
  if (_ltmCache !== null) return _ltmCache;
  try {
    const raw = localStorage.getItem(LTM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function calcCertainty(entry, currentConvCount) {
  if (entry.pinned) return 5;
  const base = entry.certainty ?? 3;
  const elapsed = currentConvCount - (entry.last_mentioned_count ?? entry.conv_count ?? 0);
  let decay = 1.0;
  if (elapsed > 300) decay = 0.4;
  else if (elapsed > 100) decay = 0.6;
  else if (elapsed > 20)  decay = 0.8;
  return Math.max(0, Math.min(5, Math.round(base * decay)));
}

export function certaintyLabel(score) {
  if (score >= 5) return "確実（5）";
  if (score === 4) return "やや確か（4）";
  if (score === 3) return "曖昧（3）";
  if (score === 2) return "不確か（2）";
  if (score === 1) return "断片（1）";
  return null; // 0は忘却
}

export const detectPinRequest   = text => /覚えておいて|絶対忘れないで|ピン留め|必ず覚えて/.test(text);
export const detectUnpinRequest = text => /忘れていい|覚えなくていい|それはいい/.test(text);

// options は callAI にそのまま透過する（llamaEndpoint / debugThinking 等）
export async function generateLTMSummary(engineId, model, apiKey, companion, profile, recentMsgs, options = {}) {
  const userMsgs = recentMsgs.filter(m => m.role === "user").map(m => m.text).slice(-20).join("\n");
  if (!userMsgs) return null;
  const convCount = parseInt(localStorage.getItem("aico_convCount") || "0");
  const prompt = [
    `以下はユーザー「${profile.un || "あなた"}」とAIコンパニオン「${companion.name}」の最近の会話です。`,
    "ユーザーについて長期的に覚えておくべき重要な情報を、確実性スコア付きのJSON形式で出力してください。",
    "出力はJSONのみ。説明文不要。",
    "",
    "確実性スコアの基準：",
    "5=複数回言及かつ感情を伴う / 4=複数回言及 / 3=一度だけ言及 / 2=示唆のみ / 1=かすかな痕跡",
    "",
    "会話内容：",
    userMsgs,
    "",
    '出力形式：{"entries":[{"fact":"事実","certainty":3,"emotion":0.5,"pinned":false}],"relationship":"関係性の一言"}',
  ].join("\n");
  try {
    const text = await callAI(engineId, model, apiKey, "あなたは会話分析AIです。指定された形式のJSONのみを返してください。", [{role:"user",content:prompt}], "ltm", options);
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = JSON.parse(json);
    const entry = {
      id: `mem_${Date.now()}`,
      ts: new Date().toISOString(),
      conv_count: convCount,
      last_mentioned_count: convCount,
      entries: (parsed.entries || []).map(e => ({
        fact: e.fact || "",
        certainty: Math.min(5, Math.max(1, parseInt(e.certainty) || 3)),
        emotion: parseFloat(e.emotion) || 0.5,
        pinned: false,
      })),
      relationship: parsed.relationship || "",
      prompts_version: "1.1",
    };
    const existing = getLongTermMemory();
    existing.push(entry);
    if (existing.length > 200) existing.splice(0, existing.length - 200);
    // 解錠中は暗号化して保存し、復号ミラーも更新する。未解錠（平文モード）は従来どおり。
    if (isUnlocked()) {
      _ltmCache = existing;
      await secureWrite(LTM_KEY, existing);
    } else {
      localStorage.setItem(LTM_KEY, JSON.stringify(existing));
    }
    return entry;
  } catch { return null; }
}
