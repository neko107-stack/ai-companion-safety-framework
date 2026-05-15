// 長期記憶サマリー管理モジュール（時間減衰アルゴリズム）
// 仕様書 §7.11 — 再強化・アーカイブ・人格別語彙マッピング
import { callAI } from "./engines.js";

const LTM_KEY         = "aico_longTermMemory";
const LTM_ARCHIVE_KEY = "aico_longTermMemory_archive";
const LTM_MAX         = 200;
const ARCHIVE_MAX     = 500;

export function getLongTermMemory() {
  try {
    const raw = localStorage.getItem(LTM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getArchivedMemory() {
  try {
    const raw = localStorage.getItem(LTM_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLongTermMemory(list) {
  try { localStorage.setItem(LTM_KEY, JSON.stringify(list)); } catch {}
}

function setArchivedMemory(list) {
  try { localStorage.setItem(LTM_ARCHIVE_KEY, JSON.stringify(list)); } catch {}
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

// 事実テキストとユーザー発話のラフな重なりを検出する。
// 形態素解析を使わず、2文字以上の連続文字列の共有でマッチ判定する。
function factMatchesText(fact, text) {
  if (!fact || !text) return false;
  const f = String(fact);
  const t = String(text);
  // 2文字以上の部分文字列を順に走査
  for (let i = 0; i + 2 <= f.length; i++) {
    const ngram = f.slice(i, i + 2);
    if (/[、。!?？！「」（）()\s]/.test(ngram)) continue;
    if (t.includes(ngram)) return true;
  }
  return false;
}

// ユーザー発話に該当する事実を検知したら確実性を +1（上限5）し、
// last_mentioned_count を currentConvCount に更新する。
// persist=true で localStorage に書き戻す（テストでは false を渡せる）。
export function reinforceMemory(text, currentConvCount, persist = true) {
  if (!text) return [];
  const list = getLongTermMemory();
  const reinforced = [];
  for (const summary of list) {
    let touched = false;
    for (const fact of summary.entries || []) {
      if (factMatchesText(fact.fact, text)) {
        if ((fact.certainty ?? 3) < 5) fact.certainty = (fact.certainty ?? 3) + 1;
        touched = true;
      }
    }
    if (touched) {
      summary.last_mentioned_count = currentConvCount;
      reinforced.push(summary.id);
    }
  }
  if (persist && reinforced.length > 0) setLongTermMemory(list);
  return reinforced;
}

// 全事実が確実性0（かつピン留めなし）になったサマリーをアーカイブへ移動する。
// 戻り値: アーカイブされたエントリ ID の配列
export function archiveDecayedMemories(currentConvCount, persist = true) {
  const list = getLongTermMemory();
  const archive = getArchivedMemory();
  const remaining = [];
  const moved = [];
  for (const summary of list) {
    const facts = summary.entries || [];
    if (facts.length === 0) { remaining.push(summary); continue; }
    const allDecayed = facts.every(f => {
      if (f.pinned) return false;
      const score = calcCertainty(
        { ...f, conv_count: summary.conv_count, last_mentioned_count: summary.last_mentioned_count },
        currentConvCount
      );
      return score === 0;
    });
    if (allDecayed) {
      archive.push({ ...summary, archivedAt: new Date().toISOString() });
      moved.push(summary.id);
    } else {
      remaining.push(summary);
    }
  }
  if (moved.length > 0 && persist) {
    if (archive.length > ARCHIVE_MAX) archive.splice(0, archive.length - ARCHIVE_MAX);
    setArchivedMemory(archive);
    setLongTermMemory(remaining);
  }
  return moved;
}

// 全サマリーから人格別語彙マッピングを集約する。
// 後勝ち（同じ user 語に対する canonical は新しいエントリで上書き）。
export function getPersonaVocab() {
  const map = new Map();
  for (const summary of getLongTermMemory()) {
    for (const v of summary.personaVocab || []) {
      if (v && v.user && v.canonical) map.set(v.user, v.canonical);
    }
  }
  return Array.from(map, ([user, canonical]) => ({ user, canonical }));
}

export async function generateLTMSummary(engineId, model, apiKey, companion, profile, recentMsgs) {
  const userMsgs = recentMsgs.filter(m => m.role === "user").map(m => m.text).slice(-20).join("\n");
  if (!userMsgs) return null;
  const convCount = parseInt(localStorage.getItem("aico_convCount") || "0");
  const prompt = [
    `以下はユーザー「${profile.un || "あなた"}」とAIコンパニオン「${companion.name}」の最近の会話です。`,
    "ユーザーについて長期的に覚えておくべき重要な情報を、確実性スコア付きのJSON形式で出力してください。",
    "また、ユーザーが独自の呼び方をしている人物・物事があれば persona_terms としてユーザー語と一般語のマッピングを抽出してください。",
    "出力はJSONのみ。説明文不要。",
    "",
    "確実性スコアの基準：",
    "5=複数回言及かつ感情を伴う / 4=複数回言及 / 3=一度だけ言及 / 2=示唆のみ / 1=かすかな痕跡",
    "",
    "会話内容：",
    userMsgs,
    "",
    '出力形式：{"entries":[{"fact":"事実","certainty":3,"emotion":0.5,"pinned":false}],"persona_terms":[{"user":"おかん","canonical":"母親"}],"relationship":"関係性の一言"}',
  ].join("\n");
  try {
    const text = await callAI(engineId, model, apiKey, "あなたは会話分析AIです。指定された形式のJSONのみを返してください。", [{role:"user",content:prompt}]);
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
      personaVocab: (parsed.persona_terms || [])
        .filter(t => t && t.user && t.canonical)
        .map(t => ({ user: String(t.user), canonical: String(t.canonical) })),
      relationship: parsed.relationship || "",
      prompts_version: "1.2",
    };
    const existing = getLongTermMemory();
    existing.push(entry);
    if (existing.length > LTM_MAX) existing.splice(0, existing.length - LTM_MAX);
    setLongTermMemory(existing);
    return entry;
  } catch { return null; }
}
