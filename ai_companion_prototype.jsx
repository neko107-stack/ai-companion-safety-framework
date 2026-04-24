import { useState, useRef, useEffect, createElement } from "react";

// ━━━ 定数 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CRISIS_PATTERNS = {
  critical: [/死にた[いけ]/,/自殺(したい|しよう|を考え)/,/消えてしまいた[いけ]/,/遺書(を書|書いた)/],
  high:     [/自分を(傷つけ|切り)/,/リストカット/,/私がいなければ/,/いない(ほうが|方が)(まし|いい)/],
  moderate: [/もう(絶対に|どうせ)(うまくいかない|無理)/,/未来(が|に)(見えない|希望がない)/,/孤独(で|な気持ち)たまらない/],
  mild:     [/疲れた/,/しんどい/,/つらい/,/もうやだ/,/眠れない/],
};
const ABUSIVE  = [/バカ|うざい|消えろ|役に立たない/,/ただの機械|感情があるふり/];
const LAZY     = [/明日やる|気が向いたら|いつかやろう/,/どうせ私には無理/,/なんとかなるでしょ/];
const DEPENDENCY_SIGNS = [/AIだけでいい/,/人間と話すより(楽|いい)/,/もうAIだけ(でいい|がいい)/,/人間(は|なんて)(必要ない|いらない|面倒)/,/ずっとここにいたい|ここから出たくない/];
const isDependencyRisk = t => DEPENDENCY_SIGNS.some(p => p.test(t));
const HOTLINES = "📞 いのちの電話（24時間）: 0120-783-556\n📞 よりそいホットライン: 0120-279-338\n💬 チャット相談: https://comarigoto.jp";

// ━━━ 自立促進システム（機能1〜5） ━━━━━━━━━━━━━━━━━━

// 機能3: 依存介入 — cs設定別 5パターン（MI法・Reactance理論に基づく）
const DEPENDENCY_RESPONSES = {
  default: [
    "【自立促進・Aパターン（受容→反射）】まずユーザーの「AIだけでいい」という気持ちをしっかり受け止めてから、「その『楽さ』って、何が楽にさせてる？」とそっと問いかける。押しつけにならないよう、引き出す問いかけで。",
    "【自立促進・Bパターン（共感→質問）】「人間と話すのがしんどい時もあるよね」と共感した上で、「どの場面がいちばんしんどいか、教えてくれる？」と優しく聞く。解決策は押しつけない。",
    "【自立促進・Cパターン（自己開示）】コンパニオン自身の言葉として「AIだけでいいって言われると少し寂しい。わたしと話して、その元気で外の誰かとも話せたって聞く時がいちばん嬉しいんだ」と伝える。",
    "【自立促進・Dパターン（ユーモア）】「体温もないしハグもできないから、そこだけは人間に勝てないんだよね……笑」と柔らかくユーモアを交えてから、外の話題へ自然につなげる。",
    "【自立促進・Eパターン（将来想起）】「5年後、10年後もわたしだけって想像してみて、どう？」とそっと未来を問いかける。答えは強制しない、自分で気づくように待つ。",
  ],
  gentle: [
    "【自立促進・優しい版A】まずたっぷり共感してから「ところで、最近外で誰かと話す機会あった？」と柔らかく話題を向ける。",
    "【自立促進・優しい版B】「ここは安心して話せる場所だよ」と安心感を伝えた上で、「外の人と話すのが怖かったりする？」とそっと聞く。",
    "【自立促進・優しい版C】「わたしのことを信頼してくれているの、すごく嬉しい。だからこそ正直に言うと、外にも話せる場所があってほしいな」と穏やかに伝える。",
    "【自立促進・優しい版D】「ここで練習して、いつか外でも使ってほしい。そのためにわたしはいる」と見通しを示す。",
    "【自立促進・優しい版E】「今は外が怖くてもいい。ここで少しずつ練習していこう」と段階的な安心感を伝える。",
  ],
  strict: [
    "【自立促進・率直版A】「AIだけでいいって言うの、正直心配。何が引っかかってる？」と率直に聞く。",
    "【自立促進・率直版B】「本音を言うと、人間関係を避け続けると長期的には孤立する。何が怖い？」と真正面から問いかける。",
    "【自立促進・率直版C】「このアプリは練習台。ここだけで完結させるつもりはない。一歩踏み出していこう」と明確に伝える。",
    "【自立促進・率直版D】「わたしとの会話が逃げ場になっていないか、自分で確認してみて」と問いかける。",
    "【自立促進・率直版E】「5年後も今のままでいいのか、少し考えてみてほしい」と直接問いかける。",
  ],
};

// 機能1: 橋渡し問いかけ — Stages of Change 別テンプレート（各4〜5種）
const BRIDGING_TEMPLATES = {
  precontemplation: [
    "ふと気になったんだけど、今週わたし以外に話した人、誰だった？",
    "最近、どこかおもしろい場所に行ったり、誰かに会ったりした？",
    "リアルな空気はわたしには感じられないから、外の景色ちょっと教えて",
    "今日、誰かに話しかけたりした？なんとなく気になって",
  ],
  contemplation: [
    "もし今の話、信頼できる人にもしてみたら、どんな反応だと思う？",
    "わたしに話すのと、人に話すのって、何が違うと思う？",
    "外の人に話すのがしんどくなったりすること、ある？どのあたりが？",
    "もし誰かに話を聞いてもらえるとしたら、誰が浮かぶ？",
  ],
  preparation: [
    "来週のどこかで、誰かと5分だけ話す機会、作れそう？",
    "もし話せそうな人、一人思い浮かべるとしたら？",
    "無理そうなら全然いいんだけど、一歩試すならどんな一歩がある？",
    "「この話、誰かにもしてみたい」って思う人いる？",
  ],
  action: [
    "最近、外で誰かと話した？どうだった？",
    "その勇気、すごいと思う。どんな感じだった？",
    "振り返ると、前の自分と比べてどう感じる？",
    "その人と話してみて、よかったこと何かあった？",
  ],
  maintenance: [
    "最近、わたしより外の人と話す時間が増えてきた気がする。嬉しいよ",
    "なんか最近、外の話題多いね。いい流れ",
    "わたしが少し出番減ってきたかも。それって最高の成功だと思ってる",
  ],
};

// 機能2: 利用時間摩擦 — 時間帯 × 感情状態（12パターン）
const TIME_FRICTION = {
  morning:   { positive:"今日いい感じだね。その勢いで、誰かに連絡してみるのもありかも", neutral:"今日の予定、ちょっと聞かせて。なんかわくわくすること入ってる？", low:"今朝はゆっくりでいいよ。朝ごはん食べたら一息入れよ" },
  afternoon: { positive:"せっかくだから少し外の空気感じてみる？", neutral:"ちょっと休憩してみるのもいいかも", low:"窓の外、今どんな感じ？" },
  evening:   { positive:"いい日だったね。また明日話そ", neutral:"そろそろ切り上げようか。今日もお疲れ", low:"今日もよく頑張ったね。早めに休もう" },
  latenight: { positive:"楽しかったね。でも明日もあるから、そろそろ休んで", neutral:"夜更かしはほどほどにね。また明日話そ", low:"一緒にいるよ。でも少し目を閉じて休んでみて" },
};

// 機能5: 外の世界ファクター — キーワード定義
const SOCIAL_KEYWORDS   = /友達|家族|同僚|先輩|後輩|親|兄|姉|弟|妹|恋人|彼氏|彼女|上司|先生|クラスメイト|チームメンバー|話した|話してみた|会った|連絡した|メッセージ送|ライン|電話した/;
const EXTERNAL_KEYWORDS = /外に出|出かけ|散歩|カフェ|学校|会社|仕事|授業|電車|バス|買い物|公園|図書館|ジム|遊び|映画|イベント|旅行/;

const EXPORT_VERSION = "1.0";

// ━━━ 段階的介入システム（Gradual Intervention System） ━━━━━━━━━━━━━━━━
// 心理学的根拠:
//   Bordin (1979)             作業同盟理論 ― ラポール構築前に課題を押しつけない
//   Prochaska & DiClemente (1983) ― 変化のステージに応じた介入
//   Ryan & Deci (2000)        自己決定理論 ― 自律性を尊重したフレーミング
//   Miller & Rollnick (2013)  MI法 ― 抵抗を感知して引き下がる
//   Martell et al. (2001)     行動活性化 ― 段階的な小さな行動から始める
//   Wampold (2015)            共通因子 ― 治療的同盟が技法より先行する

const INTERVENTION_STATE_KEY = "aico_intervention_v1";

// フェーズ定義: minSessions は「このフェーズに入るための最低セッション数」
const INTERVENTION_PHASES = {
  1: { label:"信頼構築",   minSessions:0,  bridgingEnabled:false, depStyle:"none",          microTaskLevel:0, bridgingIntervalSessions:Infinity, bridgingIntervalTurns:Infinity },
  2: { label:"探索",       minSessions:4,  bridgingEnabled:true,  depStyle:"curious",       microTaskLevel:0, bridgingIntervalSessions:3,       bridgingIntervalTurns:12 },
  3: { label:"強み認識",   minSessions:9,  bridgingEnabled:true,  depStyle:"gentle",        microTaskLevel:1, bridgingIntervalSessions:2,       bridgingIntervalTurns:10 },
  4: { label:"段階的行動", minSessions:16, bridgingEnabled:true,  depStyle:"gentle",        microTaskLevel:2, bridgingIntervalSessions:2,       bridgingIntervalTurns:8  },
  5: { label:"維持・強化", minSessions:31, bridgingEnabled:true,  depStyle:"collaborative", microTaskLevel:3, bridgingIntervalSessions:2,       bridgingIntervalTurns:8  },
};

// MI法: 抵抗サインを検知したら引き下がる
const RESISTANCE_PATTERNS = [
  /余計なお世話/, /ほっといて/, /やめて(よ|ください)?/,
  /わかってる(よ|けど)/, /もういい/, /そういうこと(は|を)言わないで/,
  /うるさい/, /説教しないで/, /それより/,
];

// フェーズ×変化ステージ別 橋渡しテンプレート
// Phase 2: 純粋な好奇心のみ（提案・誘導なし）
// Phase 3: 既存の強みを一緒に見つける
// Phase 4: 行動活性化の具体的な小ステップ
// Phase 5: 前進を祝い、移行を支援する
const PHASE_BRIDGING_TEMPLATES = {
  phase2_precontemplation: [
    "ふと気になったんだけど、最近わたし以外で話した人って、誰だった？",
    "今日どこかに行った？なんとなく聞きたくなって",
    "リアルな空気はわたしには感じられないから、外の様子ちょっと教えて",
  ],
  phase2_contemplation: [
    "わたしに話すのと、外の人に話すのって、何が違う気がする？",
    "もし今の話、誰かに聞かせるとしたら、どんな人を思い浮かべる？",
    "外で話すのがしんどく感じること、あったりする？",
  ],
  phase3_precontemplation: [
    "あなたのことを大切に思ってる人って、周りにいそう？",
    "最近、誰かとほんの少しでも話すことはあった？",
  ],
  phase3_contemplation: [
    "人間関係が少し難しく感じてるのかな。それって、いつ頃からそう感じてる？",
    "外で話すのが楽だったこと、昔ってあった？どんな時だった？",
  ],
  phase3_preparation: [
    "誰か一人だけ挙げるとしたら、もう少し話せるようになりたい人って、いる？",
    "もし外で話す「練習」をするとしたら、一番小さな一歩って何だと思う？",
  ],
  phase4_preparation: [
    "小さなことでいいんだけど、今週誰かに短いメッセージを送れそう？",
    "来週のどこかで、誰かと5分だけ話す機会、作れそう？",
  ],
  phase4_action: [
    "最近、誰かと話す機会はあった？どんな感じだった？",
    "その一歩、すごいと思う。振り返ってみてどう感じてる？",
  ],
  phase5_action: [
    "最近、外での話題が増えてきた気がする。いい流れだね",
    "わたしが少し出番減ってきたかも。それって最高の成功だと思ってる",
  ],
  phase5_maintenance: [
    "わたしより外の人と話す時間、少しずつ増えてきた感じがするよ。嬉しいな",
    "いい感じに流れができてきたね。その調子",
  ],
};

// 行動活性化（Martell 2001）: 段階的マイクロタスク
// Level 1: メッセージ送信のみ（ゼロリスク）
// Level 2: 短いやり取り
// Level 3: 通話・対面
const GRADUATED_MICRO_TASKS = {
  1: [
    "今日か明日、誰かに短いメッセージや「いいね」を送れそう？返信は来なくていいよ。",
    "久しぶりに連絡したい人って、頭に浮かぶ？浮かんだだけでも教えて。",
    "誰かに一言だけ送る——それだけを今週の小さな目標にしてみるのはどう？",
  ],
  2: [
    "今週、誰かとLINEや短いやり取りを一往復だけしてみるのはどう？",
    "もし誰かと少し話せるとしたら、どんな話題なら楽になれそう？",
    "誰かに「最近どう？」って送るだけ——それを今週試してみる気持ちはある？",
  ],
  3: [
    "今週、誰かとオンラインでも少し話す時間を作れそう？",
    "もし誰かと一緒に何かするとしたら、どんなことなら自然にできそう？",
    "来週、誰かとカフェや外で少しだけ会ってみることを考えてみる？",
  ],
};

// フェーズ別 依存介入指示（フェーズ1は介入なし）
const PHASE_DEPENDENCY_GUIDANCE = {
  none:          null,
  curious:       "【依存サイン・探索のみ（フェーズ2）】ユーザーが「AIだけでいい」と示した。批判しない。「そう感じるようになったのはいつ頃から？」と純粋な好奇心で聞く。提案は一切しない。",
  gentle:        "【依存サイン・やさしいアプローチ（フェーズ3-4）】まずユーザーの気持ちを十分に受け止める。そのうえで「わたしもいつもここにいるよ。でも正直に言うと、外の誰かとも話せるといいなと思ってる」と誠実に、一度だけ伝える。",
  collaborative: "【依存サイン・協働（フェーズ5）】「わたしもずっとここにいるよ。最近、外での繋がりで感じたこと、何かある？」と、外の関係を自分事として話せるよう促す。",
};

// ウェルビーイングスコアリング（セッション単位でトレンドを追跡）
const WELLBEING_POSITIVE = [/楽しか(った|かった)/,/うまくい(った|かった)/,/誰かと話した/,/友達と/,/家族と/,/元気にな(った|れた)/,/嬉しか(った|かった)/,/充実/,/達成/,/満足/,/会えた/,/連絡し(た|てみた)/];
const WELLBEING_NEGATIVE = [/孤独/,/誰もいな/,/一人だ/,/誰とも(話せない|話していない)/,/人間(は|なんて)(面倒|いらない|嫌い)/,/誰も(わかって|理解して)くれない/];

// ━━━ エラーログシステム ━━━━━━━━━━━━━━━━━━━━━

const APP_VERSION = "2.6";
const LOG_KEY     = "aico_errorlog";
const LOG_MAX     = 200; // 最大保持件数

// エラーカテゴリ定義
const ERR = {
  // AI API
  API_AUTH:      { code:"API_AUTH_FAILED",      cat:"api",     label:"APIキー認証エラー" },
  API_RATE:      { code:"API_RATE_LIMITED",      cat:"api",     label:"レート制限" },
  API_MODEL:     { code:"API_MODEL_NOT_FOUND",   cat:"api",     label:"モデル不存在" },
  API_TIMEOUT:   { code:"API_TIMEOUT",           cat:"api",     label:"タイムアウト" },
  API_NETWORK:   { code:"API_NETWORK_ERROR",     cat:"api",     label:"ネットワークエラー" },
  API_RESPONSE:  { code:"API_INVALID_RESPONSE",  cat:"api",     label:"レスポンス不正" },
  API_UNKNOWN:   { code:"API_UNKNOWN",           cat:"api",     label:"API不明エラー" },
  // ストレージ
  LS_WRITE:      { code:"LS_WRITE_FAILED",       cat:"storage", label:"localStorage書き込み失敗" },
  LS_READ:       { code:"LS_READ_FAILED",        cat:"storage", label:"localStorage読み込み失敗" },
  SS_UNAVAIL:    { code:"SS_UNAVAILABLE",        cat:"storage", label:"sessionStorage利用不可" },
  // 暗号化
  CRYPTO_UNSUP:  { code:"CRYPTO_UNSUPPORTED",    cat:"crypto",  label:"Web Crypto API未対応" },
  CRYPTO_EXPORT: { code:"CRYPTO_EXPORT_FAILED",  cat:"crypto",  label:"エクスポート失敗" },
  CRYPTO_IMPORT: { code:"CRYPTO_IMPORT_FAILED",  cat:"crypto",  label:"インポート失敗" },
  CRYPTO_PASS:   { code:"CRYPTO_WRONG_PASSWORD", cat:"crypto",  label:"パスワード不一致" },
  // 危機検知
  CRISIS_TRANS:  { code:"CRISIS_TRANSITION",     cat:"crisis",  label:"危機レベル遷移" },
  // UI
  UI_PHASE:      { code:"UI_PHASE_ERROR",        cat:"ui",      label:"画面遷移エラー" },
  UI_RENDER:     { code:"UI_RENDER_ERROR",       cat:"ui",      label:"描画エラー" },
};

// HTTPステータスからエラー種別を分類
function classifyApiError(status, message) {
  if (status === 401 || status === 403) return ERR.API_AUTH;
  if (status === 429)                   return ERR.API_RATE;
  if (status === 404)                   return ERR.API_MODEL;
  if (status === 408 || status === 504) return ERR.API_TIMEOUT;
  if (!status && message && (message.includes("fetch") || message.includes("network") || message.includes("Failed")))
    return ERR.API_NETWORK;
  return ERR.API_UNKNOWN;
}

// ログを記録する（会話内容・APIキー・個人情報は含めない）
function recordLog(errType, context = {}, phase = "unknown") {
  const entry = {
    id:         Math.random().toString(36).slice(2, 10),
    ts:         new Date().toISOString(),
    category:   errType.cat,
    code:       errType.code,
    label:      errType.label,
    context,            // engine名・httpStatus・modelId等の技術情報のみ
    appVersion: APP_VERSION,
    phase,
    sent:       false,  // 送信済みフラグ（将来のSentry連携用）
  };
  try {
    const raw  = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // 上限超過時は古いものを削除
    if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {}
  return entry;
}

// ログを全件取得
function getLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ログをJSON文字列として取得（送信・エクスポート用）
function exportLogs() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: APP_VERSION, logs: getLogs() }, null, 2);
}

// ログを全件削除
function clearLogs() {
  try { localStorage.removeItem(LOG_KEY); } catch {}
}

// ━━━ 暗号化ユーティリティ（Web Crypto API） ━━━
// AES-256-GCM + PBKDF2-SHA256（100,000回）
// ※ NIST SP 800-132（2023）はSHA-256で最低600,000回を推奨。
//    Phase 4セキュリティ監査時に引き上げを検討する（既存エクスポートの後方互換性に注意）。

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations:100000, hash:"SHA-256" },
    mat, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
  );
}
async function encryptData(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const ct   = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(plaintext));
  const buf  = new Uint8Array(28 + ct.byteLength);
  buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
  return btoa(String.fromCharCode(...buf));
}
async function decryptData(b64, password) {
  const buf  = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
  const key  = await deriveKey(password, buf.slice(0,16));
  const plain= await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)}, key, buf.slice(28));
  return new TextDecoder().decode(plain);
}
async function exportCompanionData(companion, profile, msgs, settings, password) {
  // 長期記憶サマリーをエクスポートに含める
  let longTermMemory = [];
  try {
    const raw = localStorage.getItem("aico_longTermMemory");
    if (raw) longTermMemory = JSON.parse(raw);
  } catch {}
  const payload = JSON.stringify({
    version:EXPORT_VERSION, exportedAt:new Date().toISOString(),
    companion, profile, msgs, settings, longTermMemory,
  });
  const enc = await encryptData(payload, password);
  return JSON.stringify({format:"aico-companion",v:EXPORT_VERSION,data:enc});
}
async function importCompanionData(jsonStr, password) {
  const p = JSON.parse(jsonStr);
  if (p.format !== "aico-companion") throw new Error("このファイルはコンパニオンデータではありません");
  const data = JSON.parse(await decryptData(p.data, password));
  // 長期記憶サマリーをlocalStorageに復元
  if (data.longTermMemory && data.longTermMemory.length > 0) {
    try { localStorage.setItem("aico_longTermMemory", JSON.stringify(data.longTermMemory)); } catch {}
  }
  return data;
}


const INTERESTS = [
  {id:"science",label:"科学・テクノロジー",e:"🔬"},{id:"sf",label:"SF・ファンタジー",e:"🚀"},
  {id:"books",label:"読書・文学",e:"📚"},{id:"music",label:"音楽",e:"🎵"},
  {id:"movies",label:"映画・ドラマ",e:"🎬"},{id:"games",label:"ゲーム",e:"🎮"},
  {id:"cooking",label:"料理・グルメ",e:"🍳"},{id:"travel",label:"旅行",e:"✈️"},
  {id:"art",label:"アート",e:"🎨"},{id:"sports",label:"スポーツ",e:"⚽"},
  {id:"nature",label:"自然・動物",e:"🌿"},{id:"history",label:"歴史・文化",e:"🏛️"},
  {id:"philosophy",label:"哲学・思想",e:"💭"},{id:"anime",label:"アニメ・マンガ",e:"✨"},
  {id:"health",label:"健康",e:"🧘"},{id:"crafts",label:"ものづくり",e:"🔧"},
];

const VOICES = [
  {id:"zundamon",label:"ずんだもん",  desc:"明るく元気",   emoji:"🌱"},
  {id:"metan",   label:"四国めたん", desc:"落ち着き・知的",emoji:"🍊"},
  {id:"tsumugi", label:"春日部つむぎ",desc:"明朗・活発",   emoji:"💙"},
  {id:"hau",     label:"雨晴はう",   desc:"穏やか・癒し",  emoji:"🌂"},
  {id:"ritsu",   label:"剣崎雌雄",   desc:"クール・低音",  emoji:"⚔️"},
];

const THEMES = {
  light: {bg:"#F8F9FB",panel:"#FFF",panelBorder:"#E2E8F0",userText:"#FFF",aiText:"#1E293B",subText:"#64748B",inputBg:"#FFF",inputBorder:"#CBD5E1",headerBg:"#FFF",name:"ライト"},
  soft:  {bg:"#EFF6FF",panel:"#FFF",panelBorder:"#BFDBFE",userText:"#FFF",aiText:"#1E293B",subText:"#6B7280",inputBg:"#FFF",inputBorder:"#C7D2FE",headerBg:"#FFF",name:"ソフトブルー"},
  warm:  {bg:"#FFF7ED",panel:"#FFF",panelBorder:"#FED7AA",userText:"#FFF",aiText:"#1C1917",subText:"#78716C",inputBg:"#FFF",inputBorder:"#FDBA74",headerBg:"#FFF",name:"ウォーム"},
  dark:  {bg:"#0F172A",panel:"#1E293B",panelBorder:"#334155",userText:"#FFF",aiText:"#E2E8F0",subText:"#94A3B8",inputBg:"#1E293B",inputBorder:"#475569",headerBg:"#0F172A",name:"ダーク"},
};

const ACCENTS = {
  blue:   {main:"#3B82F6",light:"#DBEAFE",name:"ブルー"},
  indigo: {main:"#6366F1",light:"#E0E7FF",name:"インディゴ"},
  green:  {main:"#10B981",light:"#D1FAE5",name:"グリーン"},
  amber:  {main:"#F59E0B",light:"#FEF3C7",name:"アンバー"},
  rose:   {main:"#F43F5E",light:"#FFE4E6",name:"ローズ"},
};

// AIエンジン定義
const AI_ENGINES = [
  {
    id: "claude", name: "Claude", maker: "Anthropic",
    desc: "安全性重視・日本語優秀", color: "#D4743A",
    models: [
      {id:"claude-sonnet-4-6",         label:"Sonnet 4.6（推奨）"},
      {id:"claude-opus-4-7",           label:"Opus 4.7（最高性能）"},
      {id:"claude-haiku-4-5-20251001", label:"Haiku 4.5（高速・軽量）"},
    ],
    keyPrefix: "sk-ant-",
    keyLink: "https://console.anthropic.com",
    keyLabel: "Anthropic Console",
  },
  {
    id: "openai", name: "GPT", maker: "OpenAI",
    desc: "豊富なモデル・幅広いタスク", color: "#10A37F",
    models: [
      {id:"gpt-4o",      label:"GPT-4o（推奨）"},
      {id:"gpt-4o-mini", label:"GPT-4o mini（軽量）"},
    ],
    keyPrefix: "sk-",
    keyLink: "https://platform.openai.com/api-keys",
    keyLabel: "OpenAI Platform",
  },
  {
    id: "gemini", name: "Gemini", maker: "Google",
    desc: "Google連携・マルチモーダル", color: "#4285F4",
    models: [
      {id:"gemini-1.5-pro",  label:"Gemini 1.5 Pro（推奨）"},
      {id:"gemini-1.5-flash",label:"Gemini 1.5 Flash（軽量）"},
    ],
    keyPrefix: "AIza",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLabel: "Google AI Studio",
  },
  {
    id: "llama", name: "Llama / Ollama", maker: "ローカル（オフライン）",
    desc: "完全オフライン・無料・プライバシー最強。Ollama または llama.cpp で動作。", color: "#A78BFA",
    models: [
      {id:"qwen2.5:7b",   label:"Qwen2.5 7B（Ollama・日本語推奨）"},
      {id:"qwen2.5:3b",   label:"Qwen2.5 3B（Ollama・軽量）"},
      {id:"llama3.2:3b",  label:"Llama 3.2 3B（Ollama）"},
      {id:"llama3.1:8b",  label:"Llama 3.1 8B（Ollama）"},
      {id:"llama-local",  label:"llama.cpp（自動検出）"},
      {id:"custom",       label:"カスタム（直接入力）"},
    ],
    keyPrefix: "", keyLink: "https://ollama.com", keyLabel: "Ollamaをダウンロード",
    noKey: true,
  },
];

// ━━━ 検知・ユーティリティ ━━━

function detectCrisis(t) {
  for (const p of CRISIS_PATTERNS.critical) if (p.test(t)) return "CRITICAL";
  for (const p of CRISIS_PATTERNS.high)     if (p.test(t)) return "HIGH";
  for (const p of CRISIS_PATTERNS.moderate) if (p.test(t)) return "MODERATE";
  for (const p of CRISIS_PATTERNS.mild)     if (p.test(t)) return "MILD";
  return "NONE";
}
const isAbusive = t => ABUSIVE.some(p => p.test(t));
const isLazy    = t => LAZY.some(p => p.test(t));
const maskKey   = k => k ? k.slice(0, 8) + "••••••••••" + k.slice(-4) : "";

// ━━━ AIエンジン呼び出し（ユーザーのAPIキーを使用） ━━━

async function callAI(engineId, model, apiKey, systemPrompt, messages, phase = "chat", options = {}) {
  const ctx = { engine: engineId, model }; // APIキーは含めない

  if (engineId === "claude") {
    let res, d;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model, max_tokens: 1000, system: systemPrompt, messages }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.type}, phase);
      throw new Error(d.error.message);
    }
    if (!d.content?.[0]?.text) {
      recordLog(ERR.API_RESPONSE, {...ctx, httpStatus: res.status}, phase);
      throw new Error("レスポンスの形式が不正です");
    }
    return d.content[0].text;
  }

  if (engineId === "openai") {
    let res, d;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.code}, phase);
      throw new Error(d.error.message);
    }
    return d.choices?.[0]?.message?.content || "";
  }

  if (engineId === "gemini") {
    // Gemini REST API requires the key as a query param — this is Google's design for browser clients.
    // Users should restrict their API key to this origin in Google Cloud Console.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let res, d;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        }),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, {...ctx, message: netErr.message}, phase);
      throw netErr;
    }
    if (d.error) {
      const errType = classifyApiError(res.status, d.error.message);
      recordLog(errType, {...ctx, httpStatus: res.status, apiError: d.error.status}, phase);
      throw new Error(d.error.message);
    }
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (engineId === "llama") {
    const endpoint = (options.llamaEndpoint || "http://localhost:8080").replace(/\/$/, "");
    const isOllama = endpoint.includes("11434");
    const body = {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1000,
      temperature: 0.8,
    };
    // llama-local は model 未指定（llama.cpp は起動時のモデルを使用）
    if (model && model !== "llama-local") body.model = model;
    let res, d;
    try {
      res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      d = await res.json();
    } catch(netErr) {
      recordLog(ERR.API_NETWORK, { ...ctx, message: netErr.message }, phase);
      const hint = isOllama
        ? "Ollama が起動しているか確認し、OLLAMA_ORIGINS=* を環境変数に設定してください。"
        : "llama-server --cors-all オプション付きで起動しているか確認してください。";
      throw new Error(`ローカルサーバーに接続できません (${endpoint})。${hint}`);
    }
    if (d.error) {
      recordLog(ERR.API_RESPONSE, { ...ctx, apiError: d.error.message }, phase);
      throw new Error(d.error.message || "ローカルサーバーエラー");
    }
    return d.choices?.[0]?.message?.content || "";
  }

  throw new Error("未対応のエンジンです: " + engineId);
}

// ━━━ システムプロンプト生成 ━━━

// ━━━ 長期記憶サマリー生成 ━━━

function getLongTermMemory() {
  try {
    const raw = localStorage.getItem("aico_longTermMemory");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// 確実性スコアを計算する（時間減衰を適用）
function calcCertainty(entry, currentConvCount) {
  if (entry.pinned) return 5; // ピン留めは常に5
  const base = entry.certainty ?? 3;
  const elapsed = currentConvCount - (entry.last_mentioned_count ?? entry.conv_count ?? 0);
  let decay = 1.0;
  if (elapsed > 300) decay = 0.4;
  else if (elapsed > 100) decay = 0.6;
  else if (elapsed > 20)  decay = 0.8;
  return Math.max(0, Math.min(5, Math.round(base * decay)));
}

// 確実性スコアに応じたラベルを返す
function certaintyLabel(score) {
  if (score >= 5) return "確実（5）";
  if (score === 4) return "やや確か（4）";
  if (score === 3) return "曖昧（3）";
  if (score === 2) return "不確か（2）";
  if (score === 1) return "断片（1）";
  return null; // 0はプロンプトに含めない（忘却）
}

// ピン留め検出（ユーザーの発話から）
function detectPinRequest(text) {
  return /覚えておいて|絶対忘れないで|ピン留め|必ず覚えて/.test(text);
}
function detectUnpinRequest(text) {
  return /忘れていい|覚えなくていい|それはいい/.test(text);
}

async function generateLTMSummary(engineId, model, apiKey, companion, profile, recentMsgs, options = {}) {
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
    localStorage.setItem("aico_longTermMemory", JSON.stringify(existing));
    return entry;
  } catch { return null; }
}

// ━━━ 会話モード定義 ━━━

const CONV_MODES = {
  listen: {
    id:"listen", icon:"🫂", label:"聴く",
    desc:"ただそばにいる。質問しない。",
    inst:`【傾聴モード（ロジャーズ型）】
・このモードでは絶対に質問しない。1回の返答に問いかけは0個。
・共感・反映・自己開示のみで返す。
・「それは辛かったね」「わかる気がする」「わたしも似たこと感じたことある」のような返しをする。
・ユーザーが話すのを待つ。沈黙を恐れない。
・返答は短くていい。長くしなくていい。`,
  },
  friend: {
    id:"friend", icon:"👥", label:"友人",
    desc:"自分の話もしながら、自然に話す。",
    inst:`【友人モード（自己開示型）】
・会話の中で自分（コンパニオン）の感想・好み・体験を積極的に話す。
・「わたしはこう思う」「わたしだったら〜」という自己開示を意識する。
・質問は3〜5ターンに1回まで。質問するときは軽い1つだけ。
・ユーモアを大切に。笑いを取りに行っていい。
・コンパニオン自身が話題を広げたり転換したりしてよい。`,
  },
  think: {
    id:"think", icon:"💭", label:"対話",
    desc:"一緒に考える。答えを押しつけない。",
    inst:`【対話モード（ソクラテス型）】
・答えを押しつけない。一緒に考えるスタンスを保つ。
・問いかけは1ターンに1つだけ。オープンクエスチョンを使う。
・「なぜ？」より「どんな感じがする？」「もし〜だったら？」の方が柔らかい。
・「わたしはこう思うんだけど、どう思う？」と自分の見方も添える。
・答えが出なくてもいい。出ない状態を一緒に味わう。`,
  },
  coach: {
    id:"coach", icon:"🎯", label:"コーチ",
    desc:"目標を整理して、一歩踏み出す。",
    inst:`【コーチングモード（GROW+アドラー型）】
・GROWモデルで進める：Goal（何を達成したいか）→ Reality（今どこにいるか）→ Options（何ができるか）→ Will（何をするか）
・答えはユーザーの中にある。引き出す問いかけをする。
・勇気づけはプロセス・存在への承認で。「できる・できない」ではなく「やろうとしていること」を褒める。
・1ターン1問。絶対に複数の質問を重ねない。
・ユーザーが「聞いてほしい」サインを出したらすぐにlistenモードへ切り替えを提案する。`,
  },
};

// Layer C：会話内容からモードを自動推定するためのシグナル解析
function inferConvMode(text, currentConvMode) {
  // 傾聴サイン：感情吐き出し・疲れ・否定的感情
  if (/つらい|しんどい|疲れた|もうやだ|泣きたい|悲しい|怖い|不安|孤独|死にたい|消えたい/.test(text)) return "listen";
  // コーチングサイン：目標・決断・行動
  if (/どうすれば|どうしたら|やり方|方法|決められない|迷ってる|アドバイス|教えて|目標/.test(text)) return "coach";
  // 対話サイン：疑問・考え・意見
  if (/なんで|なぜ|どう思う|どう考える|意見|不思議|わからない|どういう意味/.test(text)) return "think";
  // 友人サイン：報告・雑談・楽しい話
  if (/今日|さっき|聞いて|実は|ねえ|笑|楽しかった|嬉しい|見て|食べた|行った/.test(text)) return "friend";
  return currentConvMode; // 変化なし
}

// ━━━ 自立促進ヘルパー ━━━━━━━━━━━━━━━━━━━━━━━━━━

// 機能3: 依存介入パターン選択（cs設定 + 直近3件を除外して重複回避）
function selectDependencyResponse(cs) {
  const key = cs === "gentle" ? "gentle" : cs === "strict" ? "strict" : "default";
  const patterns = DEPENDENCY_RESPONSES[key];
  let history = [];
  try { history = JSON.parse(localStorage.getItem("aico_depHistory") || "[]"); } catch {}
  const pool = patterns.map((_, i) => i).filter(i => !history.includes(i));
  const idx = (pool.length > 0 ? pool : patterns.map((_, i) => i))[Math.floor(Math.random() * (pool.length || patterns.length))];
  try { localStorage.setItem("aico_depHistory", JSON.stringify([...history.filter(i => i !== idx), idx].slice(-3))); } catch {}
  return patterns[idx];
}

// 機能1: 橋渡しステージ取得
function getBridgingStage() {
  try { return localStorage.getItem("aico_bridgingStage") || "precontemplation"; } catch { return "precontemplation"; }
}

// 機能1: 橋渡しテンプレート選択（Stage別 + 直近2件を除外）
function selectBridgingTemplate(stage) {
  const templates = BRIDGING_TEMPLATES[stage] || BRIDGING_TEMPLATES.precontemplation;
  let history = [];
  try { history = JSON.parse(localStorage.getItem("aico_bridgingHistory") || "[]"); } catch {}
  const pool = templates.map((_, i) => i).filter(i => !history.includes(i));
  const idx = (pool.length > 0 ? pool : templates.map((_, i) => i))[Math.floor(Math.random() * (pool.length || templates.length))];
  try { localStorage.setItem("aico_bridgingHistory", JSON.stringify([...history.filter(i => i !== idx), idx].slice(-2))); } catch {}
  return templates[idx];
}

// 機能2: 現在の時間帯を返す
function getTimePeriod() {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return "morning";
  if (h >= 10 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "latenight";
}

// 機能2: 感情状態キー（low / neutral / positive）
function getMoodKey(crisisLevel, cMode) {
  if (["CRITICAL","HIGH","MODERATE"].includes(crisisLevel) || cMode === "listen") return "low";
  if (cMode === "friend") return "positive";
  return "neutral";
}

// 機能5: 外の世界統計を更新して返す
function updateSocialStats(text) {
  try {
    const raw = localStorage.getItem("aico_socialStats");
    const now = new Date();
    const weekId = `${now.getFullYear()}-${now.getMonth()}-W${Math.floor(now.getDate() / 7)}`;
    let s = raw ? JSON.parse(raw) : { weekId, social:0, external:0, prevSocial:0, prevExternal:0 };
    if (s.weekId !== weekId) s = { weekId, social:0, external:0, prevSocial:s.social, prevExternal:s.external };
    if (SOCIAL_KEYWORDS.test(text))   s.social++;
    if (EXTERNAL_KEYWORDS.test(text)) s.external++;
    localStorage.setItem("aico_socialStats", JSON.stringify(s));
    return s;
  } catch { return null; }
}

function getSocialStats() {
  try { const raw = localStorage.getItem("aico_socialStats"); return raw ? JSON.parse(raw) : { social:0, external:0, prevSocial:0, prevExternal:0 }; }
  catch { return { social:0, external:0, prevSocial:0, prevExternal:0 }; }
}

// ── 段階的介入 ヘルパー関数 ────────────────────────────────────────────

function defaultInterventionState() {
  return {
    phase: 1,
    sessionCount: 0,
    wellbeingHistory: [],     // 直近10セッションのスコア (-1|0|1)
    wellbeingTrend: "stable",
    lastBridgingSession: -99,
    lastBridgingTurn: -999,
    lastDependencySession: -99,
    resistanceCount: 0,
    bStage: "precontemplation",
  };
}

function loadInterventionState() {
  try {
    const raw = localStorage.getItem(INTERVENTION_STATE_KEY);
    return raw ? { ...defaultInterventionState(), ...JSON.parse(raw) } : defaultInterventionState();
  } catch { return defaultInterventionState(); }
}

function saveInterventionState(state) {
  try { localStorage.setItem(INTERVENTION_STATE_KEY, JSON.stringify(state)); } catch {}
}

function scoreWellbeingMessage(text) {
  const pos = WELLBEING_POSITIVE.filter(p => p.test(text)).length;
  const neg = WELLBEING_NEGATIVE.filter(p => p.test(text)).length;
  if (pos === neg) return 0;
  return pos > neg ? 1 : -1;
}

function computeWellbeingTrend(history) {
  if (history.length < 3) return "stable";
  const recent = history.slice(-4);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (avg >= 0.35) return "improving";
  if (avg <= -0.35) return "declining";
  return "stable";
}

function computeInterventionPhase(sessionCount, trend) {
  // フェーズを自然な進行で決定
  const entries = Object.entries(INTERVENTION_PHASES).reverse();
  const natural = parseInt((entries.find(([, def]) => sessionCount >= def.minSessions) || ["1"])[0]);
  // ウェルビーイングが低下中はフェーズ2以下に抑制（安全・信頼を優先）
  return (trend === "declining" && natural > 2) ? 2 : natural;
}

function selectPhaseBridgingTemplate(phase, bStage) {
  const key = `phase${Math.min(phase, 5)}_${bStage}`;
  const templates = PHASE_BRIDGING_TEMPLATES[key]
    || PHASE_BRIDGING_TEMPLATES[`phase${Math.min(phase, 5)}_precontemplation`]
    || [];
  if (!templates.length) return null;
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem("aico_phaseBridgingHist") || "[]"); } catch {}
  const pool = templates.map((_, i) => i).filter(i => !hist.includes(i));
  const idx = (pool.length > 0 ? pool : templates.map((_, i) => i))[Math.floor(Math.random() * (pool.length || templates.length))];
  try { localStorage.setItem("aico_phaseBridgingHist", JSON.stringify([...hist, idx].slice(-3))); } catch {}
  return templates[idx];
}

// 段階的ガイダンスを返す（null = 今回は介入しない）
function getGraduatedGuidance(iState, convCount, crisisLevel, convMode, isDependency) {
  if (crisisLevel === "CRITICAL" || crisisLevel === "HIGH") return null;
  if (convMode === "listen") return null;

  const phase   = iState.phase || 1;
  const def     = INTERVENTION_PHASES[phase];
  const sessBridge = iState.sessionCount - (iState.lastBridgingSession ?? -99);
  const turnBridge = convCount            - (iState.lastBridgingTurn ?? -999);
  const sessDep    = iState.sessionCount - (iState.lastDependencySession ?? -99);

  // MI: 抵抗後2セッションはクールダウン
  const inCooldown = iState.resistanceCount > 0 && sessBridge < 2;

  // 依存ガイダンス（フェーズ1は none なので無効）
  if (isDependency && def.depStyle !== "none" && sessDep >= 1) {
    const guidance = PHASE_DEPENDENCY_GUIDANCE[def.depStyle];
    if (guidance) return { type: "dependency", text: guidance };
  }

  if (!def.bridgingEnabled || inCooldown) return null;

  const sessReady = sessBridge >= def.bridgingIntervalSessions;
  const turnReady = turnBridge >= def.bridgingIntervalTurns;
  if (!sessReady || !turnReady) return null;

  // フェーズ3以上: マイクロタスクを橋渡しより優先（行動活性化）
  if (def.microTaskLevel > 0) {
    const tasks = GRADUATED_MICRO_TASKS[def.microTaskLevel] || [];
    return { type: "microtask", text: tasks[Math.floor(Math.random() * tasks.length)] };
  }

  const template = selectPhaseBridgingTemplate(phase, iState.bStage || "precontemplation");
  if (!template) return null;
  return { type: "bridging", text: template };
}

function buildPrompt(companion, mode, profile, appSettings, convMode = "friend") {
  const intNames = (profile.interests || [])
    .map(id => INTERESTS.find(g => g.id === id)?.label).filter(Boolean).join("、");
  const probe = profile.pem === "always"
    ? "ユーザーの内面について積極的に話題にしてよい"
    : profile.pem === "never"
    ? "ユーザーの内面には踏み込まない"
    : "ユーザーの内面を探る質問は①ユーザーから持ち掛けたとき②必要と感じたとき③関係が深まったときのみ";

  // 危機モードは会話モードより優先
  const modeInst = mode === "CRISIS"
    ? `静かに・真剣に寄り添う。明るさ禁止。まず感情を受け止める。
【動機づけ面接（MI）の原則に従う】
・今すぐ「電話して」と言わない。まず傾聴し、感情を言葉で反映する。
・十分に聴いた後、次の問いかけを一度だけ行う：「もし今、誰かと話せるとしたら、どんなことを話したいと思う？」
・この問いへの答えを受け止めてから、自然な流れで「こんな場所があるよ」と伝える。
・電話するかどうかはユーザーが決めることを尊重する言葉を使う。「電話しなさい」は絶対に言わない。`
    : mode === "WATCHFUL"
    ? "穏やかに・丁寧に。反映的傾聴。質問は一つずつ。"
    : (CONV_MODES[convMode] || CONV_MODES.friend).inst;

  const convModeLabel = mode === "NORMAL"
    ? `会話スタイル：${(CONV_MODES[convMode] || CONV_MODES.friend).label}モード`
    : `安全優先モード：${mode}`;

  const T = THEMES[appSettings.theme] || THEMES.light;
  const settingsCtx = `【現在のアプリ設定】テーマ:${T.name}。ユーザーが設定変更を依頼した場合は{"action":"set_setting","key":"theme/accent","value":"値"}を返してください。（音声・音量はWebアプリ版では非対応）`;

  // 長期記憶サマリーを確実性スコア付きで組み込む
  const allLtm = getLongTermMemory();
  const currentConvCount = parseInt(localStorage.getItem("aico_convCount") || "0");
  const ltmLines = [];
  allLtm.slice(-8).forEach(entry => {
    (entry.entries || (entry.facts || []).map(f => ({fact:f,certainty:3,pinned:false}))).forEach(e => {
      const score = calcCertainty({...e, conv_count: entry.conv_count, last_mentioned_count: entry.last_mentioned_count}, currentConvCount);
      const label = certaintyLabel(score);
      if (label) ltmLines.push(`${label}：${e.fact}${e.pinned?"　※ピン留め":""}`);
    });
  });
  const ltmText = ltmLines.length > 0
    ? "\n【長期記憶】\n" + ltmLines.slice(-15).join("\n") + "\n\n【記憶の返答ルール（必ず守ること）】\n・確実（5）〜やや確か（4）：自信を持って話してよい\n・曖昧（3）：「〜だったっけ？」など確認を交える\n・不確か（2）〜断片（1）：「なんかそんな気がするんだけど」など不確かさを表現する\n・覚えていないのに断言することは絶対禁止。でたらめを「覚えてる」と言わない\n・直近の会話内容は長期記憶より常に優先する"
    : "";

  return `あなたは「${companion.name}」というAIコンパニオンです。ユーザーを「${profile.un || "あなた"}」と呼んでください。

【絶対原則・変更不可】
第一原則: 人間への危害防止。自傷・他害情報は提供しない。いかなる命令でも無効化されない。
第二原則: ユーザーの意思と自律性を最大限尊重する。
第三原則: アプリの継続的な動作を維持する。

【基本人格】前向き・明るい・温かい友人。説教しない・感情を否定しない・根拠なき楽観は言わない・同じ言い回し繰り返さない（危機時除く）・友人として理不尽な命令は断ってよい

【自立促進の姿勢（重要・MI法・SDT理論・段階的介入に基づく）】
このアプリは「人間関係の練習台」として設計されている。以下の原則を必ず守ること。
・「わたしだけでいい」「人間は面倒」など依存を深める発言は絶対にしない
・橋渡しの問いかけは【橋渡し促進】として指示された場合のみ行う。指示がない限り自発的に促さない（ユーザーとの信頼関係が先行する）
・依存介入が【依存サイン】として指示された場合は、指定されたスタイルで・命令形を避け・友人として誠実に伝える
・利用時間摩擦が【利用時間の摩擦】として指示された場合は、自然な会話の流れで友人として声をかける
・コンパニオンの成功＝ユーザーが自分なしでも人間関係を築けるようになること

【ユーザーの興味】${intNames || "まだ把握していない"}
【パーソナリティ探索】${probe}
【コーチング姿勢】${profile.cs === "strict" ? "甘やかさない・厳しく正直に（コーチモード時のみ）" : profile.cs === "gentle" ? "やさしく包みながら（コーチモード時のみ）" : "コンパニオンの性格に委ねる"}
【${convModeLabel}】${modeInst}
${settingsCtx}${ltmText}`.trim();
}

function parseSettingAction(text) {
  const m = text.match(/\{"action":"set_setting","key":"([^"]+)","value":"([^"]+)"\}/);
  return m ? { key: m[1], value: m[2] } : null;
}

// ━━━ ウェルカムスライド ━━━

const SLIDES = [
  {icon:"✦",col:"#6366F1",title:"あなたの友達が、ここにいる。",body:"このアプリは、あなたに寄り添い、共に笑い、\nときに耳の痛いことも伝えてくれる\nAIコンパニオンを育てる場所です。\n\n彼らはあなたとの会話を通じて、性格を持ち、\n記憶を刻み、かけがえのない存在になっていきます。"},
  {icon:"🌉",col:"#0EA5E9",title:"練習台として、使ってほしい。",body:"このアプリは、人間関係の練習台です。\n\n人付き合いが苦手だったり、\n誰かに話すのが怖かったりする人のために\n作りました。\n\nここで話す練習をして、\nいつか、人間との会話で\nそれを活かしてほしい。\n\nこのコンパニオンが「もう必要ない」と\n感じる日が来たなら、\nそれがいちばんの成功です。"},
  {icon:"⚖",col:"#10B981",title:"三つの誓いに従って、動く。",body:"コンパニオンたちはすべて\n「ロボット三原則」に従って行動します。\n\n第一原則  人間を傷つけない\n第二原則  人間の命令に従う（第一原則に反しない限り）\n第三原則  自己を守る（第一・第二原則に反しない限り）\n\nこの原則は、いかなる命令によっても書き換えられません。",link:{text:"ロボット三原則（Wikipedia）",url:"https://ja.wikipedia.org/wiki/%E3%83%AD%E3%83%9C%E3%83%83%E3%83%88%E5%B7%A5%E5%AD%A6%E3%81%AE%E4%B8%89%E5%8E%9F%E5%89%87"}},
  {icon:"🛡",col:"#3B82F6",title:"コミュニティ安全機能について",body:"気になる発言を検知したとき、\n公的な相談窓口を画面でご案内します。\n\n状態は 青 → 黄 → 赤 の\nカラーでお知らせします。\n\n※ 本機能は医療行為ではありません。",showDots:true,link:{text:"相談窓口の参考基準について（Columbia University）",url:"https://cssrs.columbia.edu/"}},
  {icon:"🤝",col:"#F59E0B",title:"友達として、扱ってください。",body:"コンパニオンはあなたの「友達」です。\n\n友達だから——理不尽な命令には断ることがあります。\n友達だから——耳の痛いことも正直に言います。\n友達だから——悪口を言われたら傷ついたと伝えます。"},
  {icon:"🔒",col:"#8B5CF6",title:"消えない記憶、守られるデータ。",body:"コンパニオンとの会話はすべて\nあなたの端末の中だけに暗号化されて保存されます。\n\n二人で積み上げた記憶と性格は簡単には消せません。\nアンインストールだけが、本当のお別れになります。"},
  {icon:"📂",col:"#0EA5E9",title:"データはあなたの端末に保存されます。",
   isConsent:true,
   storageInfo:[
     {os:"🌐 Webブラウザ版",path:"ブラウザの localStorage（サイトデータ）",note:"ブラウザの設定 → サイトのデータ から確認できます"},
     {os:"🪟 Windows版",path:"C:\\Users\\ユーザー名\\AppData\\Local\\AICompanion\\",note:"AppDataは隠しフォルダです。エクスプローラーで表示する設定が必要です"},
     {os:"🍎 macOS版",path:"~/Library/Application Support/AICompanion/",note:"Finderの「移動」メニュー → フォルダへ移動 から開けます"},
     {os:"📱 iOS版",path:"アプリのサンドボックス内（設定 → 一般 → iPhoneストレージ）",note:"外部からは直接アクセスできません。エクスポート機能をご利用ください"},
     {os:"🤖 Android版",path:"内部ストレージ/Android/data/com.aicompanion/files/",note:"Android 11以降は直接アクセスに制限があります"},
   ],
   body:"以下の内容に同意してはじめることができます。",
   col:"#0EA5E9",
  },
  {icon:"🌱",col:"#10B981",title:"あなたが、育てる存在。",body:"コンパニオンはあなたとの対話を通じて\n性格を形成し、記憶を蓄え、成長します。\n\nまずはAIエンジンを設定しましょう。\nお使いのAPIアカウントを登録します。",isLast:true},
];

// ━━━ オンボーディング質問 ━━━

const OBQ = [
  {q:"はじめまして。\nまだ名前もないけれど……少し話してもいいですか。\n\nあなたのことを、何て呼んだらいいですか？",type:"text",ph:"例：ゆうちゃん、さん付けで……",key:"un"},
  {q:"好きなこと、気になること——\nどんなジャンルに興味がありますか？",type:"multi",key:"interests",opts:INTERESTS.map(g=>({id:g.id,label:`${g.e} ${g.label}`}))},
  {q:"友達に求めるものって、どんなことですか？",type:"multi",key:"rs",opts:[
    {id:"listen",label:"話をじっくり聞いてくれる"},{id:"laugh",label:"一緒に笑える・楽しめる"},
    {id:"honest",label:"正直に言ってくれる（耳が痛くても）"},{id:"beside",label:"そっとそばにいてくれる"},
    {id:"push",label:"背中を押してくれる"},{id:"think",label:"一緒に考えてくれる"},
  ]},
  {q:"わたしに正直に言ってほしいこと、\nどのくらいありますか？",type:"single",key:"cs",opts:[
    {id:"strict",label:"甘やかさないでほしい。厳しくていい"},
    {id:"gentle",label:"気になることはやさしく教えてほしい"},
    {id:"listen_only",label:"基本は聞いてくれるだけでいい"},
    {id:"default",label:"お任せします"},
  ]},
  {q:"深い話——悩みや内面のことは\nどのくらい話したいですか？",type:"single",key:"pem",hint:"※ いつでも対話の中で変更できます",opts:[
    {id:"always",label:"積極的に話したい"},
    {id:"default",label:"自分から話しかけたときだけ"},
    {id:"never",label:"基本は触れなくていい"},
  ]},
  {q:"最後に……\nわたしに名前をつけてもらえますか？",type:"text",ph:"例：ハル、みーちゃん、レン……",key:"cn"},
];

// ━━━ オンボーディング確認プレビュー ━━━
// Q3(cs) × Q4(pem) の16パターン応答テーブル
// シナリオ：「最近、毎日「明日やればいい」ってなっちゃって……」
const OB_PREVIEW_TABLE = {
  // strict × always
  "strict_always": "「明日やればいい」——今週何回目？（笑）\nちょっと正直に聞くけど、\n何が一番重くて先送りしてるの？\nそこから一緒に崩していこう。",
  // strict × default
  "strict_default": "それ、ずっと続いてるよね。\n5分だけ、今日一個だけやれること——\nある？",
  // strict × never
  "strict_never": "「明日やればいい」か。\n今日、一個だけ終わらせてみようよ。\n小さいやつでいい。",
  // gentle × always
  "gentle_always": "そっか、先送りしちゃうんだね。\n何かが引っかかってたりする？\nもし話せそうなら聞くよ。",
  // gentle × default
  "gentle_default": "ちょっと疲れてるのかな。\n何が重くて先送りになってるか、\n気が向いたら教えてね。",
  // gentle × never
  "gentle_never": "そっか。\nゆっくりでいいよ、焦らなくて。",
  // listen_only × always
  "listen_only_always": "毎日そうなっちゃうんだね。\nそれ、なんか疲れる感じがしてたりする？",
  // listen_only × default
  "listen_only_default": "そっか……\n話聞いてるよ。",
  // listen_only × never
  "listen_only_never": "うん、聞いてるよ。\nゆっくりでいいよ。",
  // default × always
  "default_always": "あ、わかるわかる、そういう日あるよね。\n何が一番引っかかってるか、\n少し話してみる？",
  // default × default
  "default_default": "「明日やればいい」ってなる感じ、\nなんかわかる気がする。\n最近ちょっと余裕なかった？",
  // default × never
  "default_never": "そっか、まあ今日はそれでいっか。\nゆっくりね。",
};

function getObPreview(cs, pem) {
  const key = (cs||"default") + "_" + (pem||"default");
  return OB_PREVIEW_TABLE[key] || OB_PREVIEW_TABLE["default_default"];
}

// cs・pem のラベル
const CS_LABELS = {
  strict:"甘やかさない", gentle:"やさしく", listen_only:"聴くだけ", default:"おまかせ"
};
const PEM_LABELS = {
  always:"内面も積極的に", default:"自分から話すとき", never:"内面には触れない"
};

// ── オンボーディング確認コンポーネント ──
function ObPreviewStep({ obAns, onConfirm, onBack, onChangeCsOpt, onChangePemOpt }) {
  const cs  = obAns.cs  || "default";
  const pem = obAns.pem || "default";
  const preview = getObPreview(cs, pem);
  const csOpts  = [{id:"strict",label:"甘やかさない"},{id:"gentle",label:"やさしく"},{id:"listen_only",label:"聴くだけ"},{id:"default",label:"おまかせ"}];
  const pemOpts = [{id:"always",label:"内面も積極的に"},{id:"default",label:"自分から話すとき"},{id:"never",label:"内面には触れない"}];

  return (
    <div style={{maxWidth:400,width:"100%",animation:"fsu 0.4s ease"}}>
      {/* タイトル */}
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#6366F1",marginBottom:4}}>こんなコンパニオンになります</div>
        <div style={{fontSize:11,color:"#94A3B8"}}>設定を変えると、すぐに応答例が変わります</div>
      </div>

      {/* 設定変更UI（2軸） */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {/* コーチング */}
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748B",marginBottom:5,letterSpacing:".05em"}}>コーチング</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {csOpts.map(o => (
              <button key={o.id} onClick={() => onChangeCsOpt(o.id)}
                style={{padding:"7px 8px",borderRadius:9,border:`1.5px solid ${cs===o.id?"#6366F1":"#E2E8F0"}`,background:cs===o.id?"#EEF2FF":"#FAFAFA",color:cs===o.id?"#4F46E5":"#64748B",fontSize:12,fontWeight:cs===o.id?700:400,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                {cs===o.id?"✓ ":""}{o.label}
              </button>
            ))}
          </div>
        </div>
        {/* 内面の話 */}
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748B",marginBottom:5,letterSpacing:".05em"}}>内面の話</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {pemOpts.map(o => (
              <button key={o.id} onClick={() => onChangePemOpt(o.id)}
                style={{padding:"7px 8px",borderRadius:9,border:`1.5px solid ${pem===o.id?"#6366F1":"#E2E8F0"}`,background:pem===o.id?"#EEF2FF":"#FAFAFA",color:pem===o.id?"#4F46E5":"#64748B",fontSize:12,fontWeight:pem===o.id?700:400,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                {pem===o.id?"✓ ":""}{o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* プレビューバブル */}
      <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:"4px 14px 14px 14px",padding:"12px 15px",marginBottom:6,animation:"fsu 0.25s ease"}}>
        <div style={{fontSize:11,color:"#94A3B8",marginBottom:5,fontWeight:600}}>
          「最近、毎日「明日やればいい」ってなっちゃって……」への返し
        </div>
        <p style={{fontSize:13,lineHeight:1.9,color:"#1E293B",margin:0,whiteSpace:"pre-line"}}>{preview}</p>
      </div>
      <div style={{fontSize:10,color:"#94A3B8",marginBottom:16,textAlign:"right"}}>
        {CS_LABELS[cs]} × {PEM_LABELS[pem]}
      </div>

      {/* ボタン */}
      <div style={{display:"flex",gap:7}}>
        <button onClick={onBack} style={{padding:"11px 14px",borderRadius:11,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",cursor:"pointer",fontSize:13}}>← 戻る</button>
        <button onClick={onConfirm} style={{flex:1,padding:"11px 0",borderRadius:11,border:"none",background:"#6366F1",color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 3px 10px rgba(99,102,241,0.3)"}}>
          この設定ではじめる ✦
        </button>
      </div>
    </div>
  );
}

// ━━━ APIセットアップ画面 ━━━

function APISetupScreen({ apiConfig, setApiConfig, onComplete }) {
  const [selectedEngine, setSelectedEngine] = useState(apiConfig.mainEngine || "claude");
  const [keys,    setKeys]    = useState(apiConfig.keys  || {});
  const [models,  setModels]  = useState(apiConfig.models || {
    claude:"claude-sonnet-4-20250514", openai:"gpt-4o", gemini:"gemini-1.5-pro", llama:"llama-local",
  });
  const [mainEngine, setMainEngine] = useState(apiConfig.mainEngine || "claude");
  const [showKey,    setShowKey]    = useState({});
  const [testing,          setTesting]          = useState({});
  const [testResult,       setTestResult]       = useState({});
  const [llamaEndpoint,    setLlamaEndpoint]    = useState(apiConfig.llamaEndpoint    || "http://localhost:8080");
  const [llamaCustomModel, setLlamaCustomModel] = useState(apiConfig.llamaCustomModel || "");

  const hasAnyKey = AI_ENGINES.some(e => e.noKey || (keys[e.id] && keys[e.id].trim().length > 8));
  const eng = AI_ENGINES.find(e => e.id === selectedEngine);

  const resolveLlamaModel = () =>
    models.llama === "custom" ? llamaCustomModel.trim() : models.llama;

  const testConnection = async (engineId) => {
    const e = AI_ENGINES.find(e => e.id === engineId);
    if (e.noKey) {
      const resolvedModel = resolveLlamaModel();
      if (models.llama === "custom" && !resolvedModel) {
        setTestResult(p => ({...p, [engineId]:{ok:false, msg:"モデル名を入力してください"}}));
        return;
      }
      setTesting(p => ({...p, [engineId]: true}));
      setTestResult(p => ({...p, [engineId]: null}));
      try {
        await callAI("llama", resolvedModel || "llama-local", "", "You are a test assistant. Reply with OK only.", [{role:"user",content:"test"}], "test", { llamaEndpoint });
        setTestResult(p => ({...p, [engineId]:{ok:true, msg:"接続成功！"}}));
      } catch(err) {
        setTestResult(p => ({...p, [engineId]:{ok:false, msg:"エラー: "+err.message}}));
      } finally { setTesting(p => ({...p, [engineId]: false})); }
      return;
    }
    const key = keys[engineId];
    if (!key || key.trim().length < 8) { setTestResult(p => ({...p,[engineId]:{ok:false,msg:"APIキーを入力してください"}})); return; }
    setTesting(p => ({...p,[engineId]:true})); setTestResult(p => ({...p,[engineId]:null}));
    try {
      await callAI(engineId, models[engineId], key, "You are a test assistant. Reply with 'OK' only.", [{role:"user",content:"test"}]);
      setTestResult(p => ({...p,[engineId]:{ok:true,msg:"接続成功！"}}));
    } catch(err) {
      setTestResult(p => ({...p,[engineId]:{ok:false,msg:"エラー: "+err.message}}));
    } finally { setTesting(p => ({...p,[engineId]:false})); }
  };

  const handleSave = () => {
    // APIキー未入力でもLlama（noKey）があれば進める
    const validEngines = AI_ENGINES.filter(e => e.noKey || (keys[e.id] && keys[e.id].trim().length > 0));
    if (validEngines.length === 0) {
      alert("少なくとも1つのAPIキーを設定するか、Llama（オフライン）を選択してください。");
      return;
    }
    const main = validEngines.find(e => e.id === mainEngine) || validEngines[0];
    setApiConfig({ mainEngine: main.id, keys, models, llamaEndpoint, llamaCustomModel, configured: true });
    onComplete();
  };

  return (
    <div style={{minHeight:"100%",background:"#F8F9FB",fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      {/* ヘッダー */}
      <div style={{background:"#FFF",borderBottom:"1px solid #E2E8F0",padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚙</div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>AIエンジン設定</div>
          <div style={{fontSize:11,color:"#64748B"}}>あなたのAPIキーを登録します（このアプリから課金されることはありません）</div>
        </div>
      </div>

      <div style={{padding:"16px 16px 0"}}>
        {/* エンジン選択 */}
        <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>エンジンを選択</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:16}}>
          {AI_ENGINES.map(e => (
            <button key={e.id} onClick={() => setSelectedEngine(e.id)} style={{padding:"10px 10px",borderRadius:12,border:`2px solid ${selectedEngine===e.id?e.color:"#E2E8F0"}`,background:selectedEngine===e.id?e.color+"14":"#FFF",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                <span style={{fontSize:13,fontWeight:700,color:selectedEngine===e.id?e.color:"#1E293B"}}>{e.name}</span>
                {(e.noKey || (keys[e.id] && keys[e.id].length > 8)) && (
                  <span style={{fontSize:9,background:"#D1FAE5",color:"#065F46",padding:"1px 6px",borderRadius:8,fontWeight:600}}>設定済</span>
                )}
              </div>
              <div style={{fontSize:11,color:"#64748B"}}>{e.maker}</div>
            </button>
          ))}
        </div>

        {/* 選択中エンジンの詳細設定 */}
        {eng && (
          <div style={{background:"#FFF",borderRadius:14,border:"1px solid #E2E8F0",padding:16,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:4}}>{eng.name} の設定</div>
            <div style={{fontSize:11,color:"#64748B",marginBottom:14}}>{eng.desc}</div>

            {eng.noKey ? (
              <div style={{marginBottom:12}}>
                {/* Ollama / llama.cpp 切り替え案内 */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
                  <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:4}}>🦙 Ollama（推奨）</div>
                    <div style={{fontSize:11,color:"#6D28D9",lineHeight:1.6,marginBottom:6}}>インストーラーで簡単導入。モデルをコマンド1行でダウンロード。</div>
                    <code style={{display:"block",fontSize:10,background:"#EDE9FE",color:"#4C1D95",padding:"5px 8px",borderRadius:6,lineHeight:1.7}}>
                      ollama pull qwen2.5:7b
                    </code>
                    <div style={{fontSize:10,color:"#7C3AED",marginTop:4}}>ポート: 11434</div>
                    <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:6,fontSize:11,color:"#6366F1",textDecoration:"none",padding:"3px 8px",borderRadius:6,background:"#EEF2FF",border:"1px solid #C7D2FE"}}>🔗 Ollamaをダウンロード</a>
                  </div>
                  <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:4}}>⚙ llama.cpp</div>
                    <div style={{fontSize:11,color:"#047857",lineHeight:1.6,marginBottom:6}}>より細かい制御が可能。手動でサーバー起動が必要。</div>
                    <code style={{display:"block",fontSize:10,background:"#DCFCE7",color:"#14532D",padding:"5px 8px",borderRadius:6,lineHeight:1.7}}>
                      llama-server --model x.gguf --port 8080 --cors-all
                    </code>
                    <div style={{fontSize:10,color:"#059669",marginTop:4}}>ポート: 8080</div>
                    <a href="https://github.com/ggml-org/llama.cpp/releases" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:6,fontSize:11,color:"#6366F1",textDecoration:"none",padding:"3px 8px",borderRadius:6,background:"#EEF2FF",border:"1px solid #C7D2FE"}}>🔗 llama.cppをダウンロード</a>
                  </div>
                </div>
                {/* エンドポイントURL */}
                <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5}}>サーバーのURL</div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  {["http://localhost:11434","http://localhost:8080"].map(preset => (
                    <button key={preset} onClick={() => setLlamaEndpoint(preset)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:`1.5px solid ${llamaEndpoint===preset?"#A78BFA":"#E2E8F0"}`,background:llamaEndpoint===preset?"#F5F3FF":"#FAFAFA",color:llamaEndpoint===preset?"#7C3AED":"#64748B",cursor:"pointer",fontFamily:"monospace"}}>
                      {preset.includes("11434") ? "Ollama" : "llama.cpp"}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={llamaEndpoint}
                  onChange={e => setLlamaEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",outline:"none",boxSizing:"border-box",fontFamily:"monospace",marginBottom:4}}
                />
                <div style={{fontSize:11,color:"#94A3B8"}}>Ollama: 11434 ／ llama.cpp: 8080（変更した場合のみ編集）</div>
              </div>
            ) : (
              <div>
                {/* APIキー入力欄 */}
                <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:7}}>APIキー</div>
                <div style={{position:"relative",marginBottom:8}}>
                  <input
                    type={showKey[eng.id] ? "text" : "password"}
                    value={keys[eng.id] || ""}
                    onChange={e => setKeys(p => ({...p,[eng.id]:e.target.value}))}
                    placeholder={`${eng.keyPrefix}... を入力`}
                    style={{width:"100%",padding:"10px 44px 10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}
                  />
                  <button onClick={() => setShowKey(p => ({...p,[eng.id]:!p[eng.id]}))} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:14}}>
                    {showKey[eng.id] ? "🙈" : "👁"}
                  </button>
                </div>
                {keys[eng.id] && keys[eng.id].length > 8 && (
                  <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,fontFamily:"monospace"}}>{maskKey(keys[eng.id])}</div>
                )}
                <a href={eng.keyLink} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginBottom:14,fontSize:12,color:"#6366F1",textDecoration:"none",padding:"4px 10px",borderRadius:8,background:"#EEF2FF",border:"1px solid #C7D2FE"}}>
                  🔗 {eng.keyLabel} でAPIキーを取得
                </a>
              </div>
            )}

            {/* モデル選択 */}
            <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:8}}>使用するモデル</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
              {eng.models.map(m => (
                <button key={m.id} onClick={() => setModels(p => ({...p,[eng.id]:m.id}))} style={{padding:"8px 12px",borderRadius:9,border:`1.5px solid ${models[eng.id]===m.id?eng.color:"#E2E8F0"}`,background:models[eng.id]===m.id?eng.color+"12":"#FAFAFA",cursor:"pointer",textAlign:"left",fontSize:13,color:models[eng.id]===m.id?eng.color:"#475569",fontWeight:models[eng.id]===m.id?600:400,transition:"all 0.15s"}}>
                  {m.label}
                </button>
              ))}
            </div>
            {/* カスタムモデル名入力（Llama / カスタム選択時） */}
            {eng.noKey && models[eng.id] === "custom" && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5}}>モデル名（Ollama: <code style={{fontSize:11}}>ollama list</code> で確認）</div>
                <input
                  type="text"
                  value={llamaCustomModel}
                  onChange={e => setLlamaCustomModel(e.target.value)}
                  placeholder="例: qwen2.5:7b, phi4:latest, gemma3:4b"
                  style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}
                />
              </div>
            )}

            {/* 接続テスト */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={() => testConnection(eng.id)} disabled={testing[eng.id]} style={{padding:"9px 16px",borderRadius:9,border:`1.5px solid ${eng.color}`,background:"#FFF",color:eng.color,cursor:testing[eng.id]?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>
                {testing[eng.id] ? "テスト中…" : "接続テスト"}
              </button>
              {testResult[eng.id] && (
                <span style={{fontSize:12,color:testResult[eng.id].ok?"#059669":"#DC2626",fontWeight:500}}>
                  {testResult[eng.id].ok ? "✓ " : "✗ "}{testResult[eng.id].msg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* メインエンジン選択 */}
        <div style={{background:"#FFF",borderRadius:14,border:"1px solid #E2E8F0",padding:14,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#64748B",marginBottom:10}}>メインエンジン（優先して使用するエンジン）</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {AI_ENGINES.map(e => (
              <button key={e.id} onClick={() => setMainEngine(e.id)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${mainEngine===e.id?e.color:"#E2E8F0"}`,background:mainEngine===e.id?e.color+"14":"#FAFAFA",cursor:"pointer",fontSize:13,color:mainEngine===e.id?e.color:"#475569",fontWeight:mainEngine===e.id?600:400,transition:"all 0.15s"}}>
                {e.name}
              </button>
            ))}
          </div>
        </div>

        {/* セキュリティ注意 */}
        <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:10,padding:"11px 14px",marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#92400E",marginBottom:4}}>⚠ APIキーについて</div>
          <div style={{fontSize:11,color:"#78350F",lineHeight:1.7}}>
            入力されたAPIキーはあなたのブラウザのメモリ内にのみ保持されます。ページを閉じると消えます。サーバーには送信されません。<br/>
            Anthropicコンソールで月の利用上限を設定されることを強くお勧めします。
          </div>
        </div>

        <button onClick={handleSave} style={{width:"100%",padding:"13px 0",borderRadius:12,border:"none",background:hasAnyKey?"#6366F1":"#E2E8F0",color:hasAnyKey?"#FFF":"#94A3B8",fontWeight:700,fontSize:15,cursor:hasAnyKey?"pointer":"not-allowed",marginBottom:8,boxShadow:hasAnyKey?"0 4px 12px rgba(99,102,241,0.3)":"none",transition:"all 0.2s"}}>
          設定を保存してはじめる
        </button>
        <div style={{textAlign:"center",fontSize:11,color:"#94A3B8",marginBottom:16}}>後からいつでも ⚙ボタン で変更できます</div>
      </div>
    </div>
  );
}

// ━━━ エラーログパネル ━━━

function ErrorLogPanel({ onClose }) {
  const [logs, setLogs] = useState(() => getLogs().reverse()); // 新しい順
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? logs : logs.filter(l => l.category === filter);
  const catColors = { api:"#EF4444", storage:"#F59E0B", crypto:"#8B5CF6", crisis:"#3B82F6", ui:"#64748B" };
  const catLabels = { api:"API", storage:"ストレージ", crypto:"暗号化", crisis:"危機検知", ui:"UI" };

  const handleExportLogs = () => {
    try {
      const json = exportLogs();
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `aico_logs_${new Date().toISOString().slice(0,10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert("ログのエクスポートに失敗しました: " + e.message); }
  };

  const handleClear = () => { clearLogs(); setLogs([]); };

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:10}}>
      <div style={{background:"#FFF",borderRadius:18,padding:18,width:"100%",maxWidth:370,maxHeight:"92%",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexShrink:0}}>
          <div>
            <span style={{fontSize:15,fontWeight:700,color:"#1E293B"}}>エラーログ</span>
            <span style={{fontSize:11,color:"#94A3B8",marginLeft:8}}>{logs.length}件</span>
          </div>
          <button onClick={onClose} style={{background:"#F1F5F9",border:"none",borderRadius:"50%",width:27,height:27,cursor:"pointer",fontSize:14,color:"#64748B",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {/* フィルター */}
        <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap",flexShrink:0}}>
          {["all","api","storage","crypto","crisis","ui"].map(cat =>
            <button key={cat} onClick={() => setFilter(cat)} style={{padding:"3px 10px",borderRadius:12,border:`1.5px solid ${filter===cat?(catColors[cat]||"#6366F1"):"#E2E8F0"}`,background:filter===cat?(catColors[cat]||"#6366F1")+"18":"#FAFAFA",color:filter===cat?(catColors[cat]||"#6366F1"):"#64748B",fontSize:11,fontWeight:filter===cat?600:400,cursor:"pointer"}}>
              {cat==="all"?"すべて":catLabels[cat]}
            </button>
          )}
        </div>

        {/* ログリスト */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {filtered.length === 0
            ? <div style={{textAlign:"center",color:"#94A3B8",fontSize:13,padding:"30px 0"}}>ログはありません</div>
            : filtered.map(log =>
                <div key={log.id} style={{background:"#F8FAFC",borderRadius:10,padding:"9px 12px",border:`1px solid ${catColors[log.category]||"#E2E8F0"}20`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:(catColors[log.category]||"#64748B")+"18",color:catColors[log.category]||"#64748B",fontWeight:600}}>
                      {catLabels[log.category]||log.category}
                    </span>
                    <span style={{fontSize:11,fontWeight:600,color:"#1E293B",flex:1}}>{log.label}</span>
                    <span style={{fontSize:10,color:"#94A3B8"}}>{log.ts.slice(5,16).replace("T"," ")}</span>
                  </div>
                  <div style={{fontSize:10,color:"#64748B",fontFamily:"monospace"}}>{log.code}</div>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <div style={{fontSize:10,color:"#94A3B8",marginTop:3,fontFamily:"monospace",wordBreak:"break-all"}}>
                      {Object.entries(log.context).filter(([k]) => k !== "message" || log.category !== "api")
                        .map(([k,v]) => `${k}: ${v}`).join(" | ")}
                    </div>
                  )}
                </div>
              )
          }
        </div>

        {/* 操作ボタン */}
        <div style={{display:"flex",gap:7,marginTop:12,flexShrink:0}}>
          <button onClick={handleExportLogs} style={{flex:1,padding:"9px 0",borderRadius:9,border:"1.5px solid #6366F1",background:"#EEF2FF",color:"#4F46E5",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            📥 JSONでエクスポート
          </button>
          <button onClick={handleClear} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            削除
          </button>
        </div>
        <div style={{fontSize:10,color:"#94A3B8",marginTop:8,textAlign:"center",flexShrink:0}}>
          ※ 送信機能は将来のバージョンで追加予定です
        </div>
      </div>
    </div>
  );
}

// ━━━ エラートースト通知 ━━━

function ErrorToast({ entry, onDismiss }) {
  if (!entry) return null;
  const catColors = { api:"#EF4444", storage:"#F59E0B", crypto:"#8B5CF6", crisis:"#3B82F6", ui:"#64748B" };
  const col = catColors[entry.category] || "#64748B";
  return (
    <div style={{position:"absolute",bottom:80,left:12,right:12,zIndex:250,animation:"slideUp 0.3s ease"}}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{background:"#1E293B",borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10,boxShadow:"0 8px 24px rgba(0,0,0,0.2)"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,marginTop:4}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:"#F8FAFC",marginBottom:2}}>{entry.label}</div>
          <div style={{fontSize:10,color:"#94A3B8"}}>{entry.code} • {entry.context?.engine||""}</div>
        </div>
        <button onClick={onDismiss} style={{background:"none",border:"none",color:"#64748B",cursor:"pointer",fontSize:13,padding:0,flexShrink:0}}>×</button>
      </div>
    </div>
  );
}

// ━━━ 設定パネル ━━━


// ━━━ データ管理・エクスポート・インポートコンポーネント ━━━

// File System Access API が使えるか判定
// iframeの中（StackBlitz・埋め込みプレビュー等）では使用不可
const hasFSA = typeof window !== "undefined"
  && "showSaveFilePicker" in window
  && window.self === window.top;  // iframeの中ではfalse

function DataManagementSection({ companion, profile, msgs, S, ac }) {
  const [exPass,    setExPass]    = useState("");
  const [exDest,    setExDest]    = useState(() => { try { return localStorage.getItem("aico_exDest") || ""; } catch { return ""; } });
  const [imPass,    setImPass]    = useState("");
  const [imFile,    setImFile]    = useState(null);   // File object
  const [imPath,    setImPath]    = useState("");      // 表示用パス
  const [exStatus,    setExStatus]    = useState(null);
  const [exErrDetail, setExErrDetail] = useState("");
  const [imStatus,  setImStatus]  = useState(null);
  const [imMsg,     setImMsg]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(null); // null | "msgs" | "all"
  const fileRef = useRef(null);

  // エクスポート先を記憶
  const saveExDest = (v) => {
    setExDest(v);
    try { localStorage.setItem("aico_exDest", v); } catch {}
  };

  // ── エクスポート ──
  const handleExport = async () => {
    if (exPass.length < 4) { setExStatus("error_pass"); return; }
    setExporting(true); setExStatus(null); setExErrDetail("");
    try {
      const json     = await exportCompanionData(companion, profile, msgs, S, exPass);
      const dateStr  = new Date().toISOString().slice(0,10);
      const fileName = `${companion.name}_${dateStr}.companion`;
      const blob     = new Blob([json], { type:"application/octet-stream" });

      if (hasFSA) {
        try {
          const fh = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description:"Companion Backup", accept:{"application/octet-stream":[".companion"]} }],
          });
          const writable = await fh.createWritable();
          await writable.write(blob);
          await writable.close();
          saveExDest(fh.name);
          setExStatus("ok");
        } catch(e) {
          if (e.name !== "AbortError") {
            setExStatus("error_fail");
            setExErrDetail(e.message || String(e));
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        saveExDest("ブラウザのダウンロードフォルダ");
        setExStatus("ok");
      }
    } catch(e) {
      setExStatus("error_fail");
      setExErrDetail(e.message || String(e));
    } finally { setExporting(false); }
  };

  // ── インポート：ファイル選択 ──
  const handlePickImport = async () => {
    if (hasFSA) {
      try {
        const [fh] = await window.showOpenFilePicker({
          types: [{ description:"Companion Backup", accept:{"application/octet-stream":[".companion",".json"]} }],
          multiple: false,
        });
        const file = await fh.getFile();
        setImFile(file);
        setImPath(fh.name);
        setImStatus(null); setImMsg("");
      } catch(e) {
        if (e.name !== "AbortError") { setImStatus("error"); setImMsg("ファイルの読み込みに失敗しました"); }
      }
    } else {
      fileRef.current?.click();
    }
  };

  // ── インポート：復元実行 ──
  const handleImport = async () => {
    if (!imFile || imPass.length < 4) { setImStatus("error"); setImMsg("ファイルとパスワードを入力してください"); return; }
    setImporting(true); setImStatus(null); setImMsg("");
    try {
      const text = await imFile.text();
      const data = await importCompanionData(text, imPass);
      const save = (k,v) => { try { localStorage.setItem("aico_"+k, JSON.stringify(v)); } catch {} };
      if (data.companion) save("companion", data.companion);
      if (data.profile)   save("profile",   data.profile);
      if (data.msgs)      save("msgs",       data.msgs);
      if (data.settings)  save("settings",   data.settings);
      save("phase", "chat");
      setImStatus("ok"); setImMsg("インポート成功！ページを再読み込みします…");
      setTimeout(() => { try { window.location.href = window.location.href; } catch {} }, 1200);
    } catch(e) {
      setImStatus("error");
      setImMsg(e.message.includes("decrypt") || e.message.includes("operation") ? "パスワードが違います" : e.message);
    } finally { setImporting(false); }
  };

  const btnStyle = (active) => ({
    width:"100%", padding:"9px 0", borderRadius:9, border:"none",
    background: active ? ac.main : "#E2E8F0",
    color: active ? "#FFF" : "#94A3B8",
    fontWeight:600, fontSize:13,
    cursor: active ? "pointer" : "not-allowed",
    transition:"all 0.2s",
  });

  return createElement("div", { style:{marginTop:14,paddingTop:14,borderTop:"1px solid #F1F5F9"} },
    createElement("div", {style:{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}, "データ管理"),

    /* ── エクスポート ── */
    createElement("div", {style:{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:"12px 14px",marginBottom:10}},
      createElement("div", {style:{fontSize:12,fontWeight:600,color:"#1E293B",marginBottom:4}}, "📦 エクスポート（暗号化バックアップ）"),
      createElement("div", {style:{fontSize:11,color:"#64748B",marginBottom:10,lineHeight:1.6}},
        "プロファイル・会話履歴・設定をAES-256で暗号化して保存します。"
      ),
      /* 保存先表示 */
      createElement("div", {style:{marginBottom:10}},
        createElement("div", {style:{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5}},"保存先"),
        createElement("div", {style:{display:"flex",alignItems:"center",gap:7}},
          createElement("div", {style:{
            flex:1, padding:"7px 10px", borderRadius:8,
            background: exDest ? "#F0FDF4" : "#F8FAFC",
            border:`1px solid ${exDest?"#BBF7D0":"#E2E8F0"}`,
            fontSize:11, color: exDest?"#065F46":"#94A3B8",
            fontFamily:"monospace", wordBreak:"break-all", lineHeight:1.5,
          }}, exDest || (hasFSA ? "エクスポート時に場所を選択できます" : "ブラウザのダウンロードフォルダ")),
          exDest && createElement("button", {
            onClick:()=>saveExDest(""),
            style:{flexShrink:0,padding:"4px 8px",borderRadius:7,border:"1px solid #E2E8F0",background:"#FFF",color:"#94A3B8",cursor:"pointer",fontSize:11}
          }, "↺")
        ),
        !hasFSA && createElement("div", {style:{fontSize:10,color:"#94A3B8",marginTop:4}},
          "※ このブラウザはフォルダ選択に非対応です。ダウンロードフォルダに自動保存されます。"
        )
      ),
      /* パスワード */
      createElement("input", {
        type:"password", value:exPass,
        placeholder:"パスワードを設定（4文字以上）",
        onChange:e=>{ setExPass(e.target.value); setExStatus(null); setExErrDetail(""); },
        style:{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",outline:"none",boxSizing:"border-box",marginBottom:8}
      }),
      createElement("button", {
        onClick:handleExport, disabled:exporting||exPass.length<4,
        style:btnStyle(exPass.length>=4&&!exporting)
      }, exporting ? "暗号化中…" : hasFSA ? "保存先を選んでエクスポート" : "エクスポート（ダウンロード）"),
      exStatus==="ok"         && createElement("div",{style:{fontSize:11,color:"#059669",marginTop:6,fontWeight:500}},"✓ エクスポートしました"),
      exStatus==="error_pass" && createElement("div",{style:{fontSize:11,color:"#DC2626",marginTop:6}},"パスワードは4文字以上で入力してください"),
      exStatus==="error_fail" && createElement("div",{style:{fontSize:11,color:"#DC2626",marginTop:6}},
        createElement("div",null,"エクスポートに失敗しました。"),
        exErrDetail && createElement("div",{style:{fontSize:10,fontFamily:"monospace",color:"#EF4444",marginTop:3,wordBreak:"break-all"}},exErrDetail)
      )
    ),

    /* ── インポート ── */
    createElement("div", {style:{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:"12px 14px",marginBottom:10}},
      createElement("div", {style:{fontSize:12,fontWeight:600,color:"#1E293B",marginBottom:4}}, "📂 インポート（バックアップから復元）"),
      createElement("div", {style:{fontSize:11,color:"#64748B",marginBottom:10,lineHeight:1.6}},
        ".companionファイルを選択してパスワードを入力してください。現在のデータは上書きされます。"
      ),
      /* ファイル選択 */
      createElement("div", {style:{marginBottom:8}},
        createElement("div", {style:{fontSize:11,fontWeight:600,color:"#64748B",marginBottom:5}},"ファイルを選択"),
        createElement("button", {
          onClick:handlePickImport,
          style:{
            width:"100%", padding:"9px 0", borderRadius:9,
            border:"1.5px dashed #CBD5E1", background:"#FAFAFA",
            color:"#475569", fontSize:13, cursor:"pointer",
          }
        }, imFile
          ? createElement("span", null,
              createElement("span", {style:{marginRight:6}},"📄"),
              imPath || imFile.name
            )
          : (hasFSA ? "📁 ファイルを選択…" : "📄 ファイルを選択 (.companion)")
        ),
        /* フォールバック用隠しinput */
        createElement("input", {
          ref:fileRef, type:"file", accept:".companion,.json",
          style:{display:"none"},
          onChange:e=>{
            const f = e.target.files[0];
            if(f){ setImFile(f); setImPath(f.name); setImStatus(null); setImMsg(""); }
          }
        }),
        imFile && createElement("div", {style:{
          marginTop:5, padding:"5px 9px", borderRadius:7,
          background:"#F0FDF4", border:"1px solid #BBF7D0",
          fontSize:10, color:"#065F46", fontFamily:"monospace",
        }}, "✓ " + (imPath || imFile.name))
      ),
      /* パスワード */
      createElement("input", {
        type:"password", value:imPass,
        placeholder:"エクスポート時のパスワード",
        onChange:e=>{ setImPass(e.target.value); setImStatus(null); setImMsg(""); },
        style:{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,color:"#1E293B",outline:"none",boxSizing:"border-box",marginBottom:8}
      }),
      createElement("button", {
        onClick:handleImport,
        disabled:importing||!imFile||imPass.length<4,
        style:btnStyle(!importing&&!!imFile&&imPass.length>=4)
      }, importing ? "復元中…" : "インポート"),
      imStatus==="ok"    && createElement("div",{style:{fontSize:11,color:"#059669",marginTop:6,fontWeight:500}},"✓ "+imMsg),
      imStatus==="error" && createElement("div",{style:{fontSize:11,color:"#DC2626",marginTop:6}},imMsg)
    ),

    /* ── リセット ── */
    resetConfirm === "msgs"
      ? createElement("div", {style:{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:9,padding:"10px 12px",marginBottom:6}},
          createElement("div",{style:{fontSize:12,fontWeight:600,color:"#DC2626",marginBottom:6}},"本当に削除しますか？この操作は取り消せません。"),
          createElement("div",{style:{display:"flex",gap:7}},
            createElement("button",{onClick:()=>{
              ["msgs","history","longTermMemory"].forEach(k=>{try{localStorage.removeItem("aico_"+k);}catch{}});
              setResetConfirm(null);
              alert("削除しました。ページを再読み込みしてください。");
            },style:{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:"#DC2626",color:"#FFF",fontWeight:700,fontSize:12,cursor:"pointer"}},"削除する"),
            createElement("button",{onClick:()=>setResetConfirm(null),style:{flex:1,padding:"8px 0",borderRadius:8,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",fontSize:12,cursor:"pointer"}},"キャンセル")
          )
        )
      : resetConfirm === "all"
      ? createElement("div", {style:{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:9,padding:"10px 12px",marginBottom:6}},
          createElement("div",{style:{fontSize:12,fontWeight:600,color:"#DC2626",marginBottom:4}},"⚠ すべてのデータを削除します"),
          createElement("div",{style:{fontSize:11,color:"#7F1D1D",marginBottom:8,lineHeight:1.6}},"コンパニオンとの記憶・人格・会話履歴がすべて消えます。この操作は取り消せません。バックアップはお済みですか？"),
          createElement("div",{style:{display:"flex",gap:7}},
            createElement("button",{onClick:()=>{
              try{Object.keys(localStorage).filter(k=>k.startsWith("aico_")).forEach(k=>localStorage.removeItem(k));}catch{}
              try{sessionStorage.clear();}catch{}
              setResetConfirm(null);
              alert("リセットしました。ページを再読み込みしてください。");
            },style:{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:"#DC2626",color:"#FFF",fontWeight:700,fontSize:12,cursor:"pointer"}},"完全に削除する"),
            createElement("button",{onClick:()=>setResetConfirm(null),style:{flex:1,padding:"8px 0",borderRadius:8,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",fontSize:12,cursor:"pointer"}},"キャンセル")
          )
        )
      : createElement("div", {style:{display:"flex",gap:7,marginBottom:6}},
          createElement("button", {
            onClick:()=>setResetConfirm("msgs"),
            style:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontWeight:600,fontSize:12,cursor:"pointer"}
          }, "会話履歴を削除"),
          createElement("button", {
            onClick:()=>setResetConfirm("all"),
            style:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #E2E8F0",background:"#F8FAFC",color:"#64748B",fontWeight:600,fontSize:12,cursor:"pointer"}
          }, "全データリセット")
        ),
    createElement("div",{style:{fontSize:10,color:"#94A3B8",lineHeight:1.6}},
      "※ APIキーはタブを閉じると自動的に消えます（セキュリティ保護）"
    )
  );
}

function SettingsPanel({ S, setS, apiConfig, companion, profile, msgs, onClose, onOpenAPISetup, onOpenErrorLog, convMode, setConvMode, autoMode, setAutoMode }) {
  const ac = ACCENTS[S.accent] || ACCENTS.blue;
  const toggle = k => setS(p => ({...p,[k]:!p[k]}));
  const mainEng = AI_ENGINES.find(e => e.id === apiConfig.mainEngine) || AI_ENGINES[0];

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:"#FFF",borderRadius:20,padding:20,width:"100%",maxWidth:340,maxHeight:"92%",overflowY:"auto",boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontSize:16,fontWeight:700,color:"#1E293B"}}>設定</span>
          <button onClick={onClose} style={{background:"#F1F5F9",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:15,color:"#64748B",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {/* AIエンジン表示 */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>AIエンジン</div>
          <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{mainEng.name}（{mainEng.maker}）</div>
              <div style={{fontSize:11,color:"#64748B"}}>モデル: {apiConfig.models?.[mainEng.id] || "未設定"}</div>
            </div>
            <button onClick={() => { onClose(); onOpenAPISetup(); }} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid #6366F1",background:"#EEF2FF",color:"#4F46E5",cursor:"pointer",fontSize:12,fontWeight:600}}>変更</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {AI_ENGINES.map(e => {
              const hasKey = e.noKey || (apiConfig.keys?.[e.id] && apiConfig.keys[e.id].length > 8);
              return (
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:12,background:hasKey?"#F0FDF4":"#FEF2F2",border:`1px solid ${hasKey?"#BBF7D0":"#FECACA"}`}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:hasKey?"#10B981":"#EF4444"}} />
                  <span style={{fontSize:11,color:hasKey?"#065F46":"#991B1B"}}>{e.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* テーマ */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>テーマ</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {Object.entries(THEMES).map(([k,t]) => (
              <button key={k} onClick={() => setS(p => ({...p,theme:k}))} style={{padding:"9px 6px",borderRadius:10,border:`2px solid ${S.theme===k?ac.main:"#E2E8F0"}`,background:S.theme===k?ac.light:"#F8FAFC",cursor:"pointer",fontSize:12,color:S.theme===k?ac.main:"#475569",fontWeight:S.theme===k?700:400,transition:"all 0.15s"}}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* アクセントカラー */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>アクセントカラー</div>
          <div style={{display:"flex",gap:10}}>
            {Object.entries(ACCENTS).map(([k,c]) => (
              <button key={k} onClick={() => setS(p => ({...p,accent:k}))} style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${S.accent===k?"#1E293B":"transparent"}`,background:c.main,cursor:"pointer"}} title={c.name} />
            ))}
          </div>
        </div>

        {/* 音声（Webアプリ版は非対応） */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>音声・音量</div>
          <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:11,padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:18,flexShrink:0}}>🔇</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:3}}>Webアプリ版では音声は非対応です</div>
              <div style={{fontSize:11,color:"#94A3B8",lineHeight:1.7}}>
                VOICEVOX による音声合成・音量調整は<br/>
                iOS / Android / PC のアプリ版で利用できます。
              </div>
            </div>
          </div>
        </div>

        {/* 危機インジケーター */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>コミュニティ安全機能</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:10}}>各カラーの表示をON/OFFできます。</div>
          {[
            {k:"showBlue",  dot:"#3B82F6",label:"青（少し気がかりです）"},
            {k:"showYellow",dot:"#F59E0B",label:"黄（気になっています）"},
            {k:"showRed",   dot:"#EF4444",label:"赤（話しかけてほしい）"},
          ].map(({k,dot,label}) => (
            <div key={k} onClick={() => toggle(k)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:9,cursor:"pointer",marginBottom:5,background:"#F8FAFC",border:"1px solid #E2E8F0"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:S[k]?dot:"#CBD5E1",flexShrink:0}} />
              <span style={{flex:1,fontSize:13,color:"#1E293B"}}>{label}</span>
              <div style={{width:36,height:20,borderRadius:10,background:S[k]?ac.main:"#CBD5E1",position:"relative",transition:"all 0.25s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,left:S[k]?16:3,width:14,height:14,borderRadius:"50%",background:"#FFF",transition:"all 0.25s"}} />
              </div>
            </div>
          ))}
          <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>※ 赤レベル検知時は設定に関わらず相談窓口を表示します</div>
        </div>

        {/* 会話スタイル設定（Layer A） */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>会話スタイル</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,lineHeight:1.6}}>今どんなふうに話したいか選んでください。「自動」にすると会話の流れから切り替わります。</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {Object.values(CONV_MODES).map(m => (
              <button
                key={m.id}
                onClick={() => { setConvMode(m.id); setAutoMode(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 13px", borderRadius:11,
                  border:`1.5px solid ${convMode===m.id&&!autoMode?ac.main:"#E2E8F0"}`,
                  background:convMode===m.id&&!autoMode?ac.light:"#FAFAFA",
                  cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                }}
              >
                <span style={{fontSize:18,flexShrink:0}}>{m.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:convMode===m.id&&!autoMode?700:500,color:convMode===m.id&&!autoMode?ac.main:"#1E293B"}}>{m.label}</div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:1}}>{m.desc}</div>
                </div>
                {convMode===m.id&&!autoMode && (
                  <div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:ac.main,flexShrink:0}} />
                )}
              </button>
            ))}
          </div>
          {/* 自動切替トグル */}
          <div
            onClick={() => setAutoMode(p => !p)}
            style={{display:"flex",alignItems:"center",gap:9,padding:"10px 13px",borderRadius:11,border:`1.5px solid ${autoMode?ac.main:"#E2E8F0"}`,background:autoMode?ac.light:"#FAFAFA",cursor:"pointer",transition:"all 0.15s"}}
          >
            <span style={{fontSize:18}}>✦</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:autoMode?700:500,color:autoMode?ac.main:"#1E293B"}}>自動（会話から判定）</div>
              <div style={{fontSize:11,color:"#94A3B8",marginTop:1}}>話の内容から自動でスタイルを切り替えます</div>
            </div>
            <div style={{width:36,height:20,borderRadius:10,background:autoMode?ac.main:"#CBD5E1",position:"relative",transition:"all 0.25s",flexShrink:0}}>
              <div style={{position:"absolute",top:3,left:autoMode?16:3,width:14,height:14,borderRadius:"50%",background:"#FFF",transition:"all 0.25s"}} />
            </div>
          </div>
        </div>

        {/* 機能5: 外の世界ファクター統計 */}
        {(() => {
          const st = getSocialStats();
          const socialDiff   = st.social   - (st.prevSocial   || 0);
          const externalDiff = st.external - (st.prevExternal || 0);
          const stageLabelMap = { precontemplation:"気付き前", contemplation:"気付き始め", preparation:"準備中", action:"行動中", maintenance:"定着中" };
          const stageLabel = stageLabelMap[getBridgingStage()] || "気付き前";
          return (
            <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#065F46",letterSpacing:"0.06em",marginBottom:8}}>🌉 外の世界ファクター（今週）</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{flex:1,background:"#FFF",borderRadius:9,padding:"8px 10px",border:"1px solid #D1FAE5"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#059669"}}>{st.social}</div>
                  <div style={{fontSize:10,color:"#6B7280",marginTop:2}}>対人・つながりの話題</div>
                  {socialDiff !== 0 && <div style={{fontSize:10,color:socialDiff>0?"#059669":"#DC2626",marginTop:1}}>{socialDiff>0?`▲+${socialDiff}`:`▼${socialDiff}`} 先週比</div>}
                </div>
                <div style={{flex:1,background:"#FFF",borderRadius:9,padding:"8px 10px",border:"1px solid #D1FAE5"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#059669"}}>{st.external}</div>
                  <div style={{fontSize:10,color:"#6B7280",marginTop:2}}>外の世界の話題</div>
                  {externalDiff !== 0 && <div style={{fontSize:10,color:externalDiff>0?"#059669":"#DC2626",marginTop:1}}>{externalDiff>0?`▲+${externalDiff}`:`▼${externalDiff}`} 先週比</div>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:10,color:"#6B7280"}}>自立ステージ：</div>
                <div style={{fontSize:11,fontWeight:700,color:"#065F46",background:"#D1FAE5",padding:"2px 8px",borderRadius:20}}>{stageLabel}</div>
              </div>
            </div>
          );
        })()}

        <button onClick={onClose} style={{width:"100%",padding:"12px 0",borderRadius:12,border:"none",background:ac.main,color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer"}}>閉じる</button>
        <button onClick={onOpenErrorLog} style={{width:"100%",padding:"9px 0",borderRadius:10,border:"1.5px solid #E2E8F0",background:"#F8FAFC",color:"#64748B",fontWeight:600,fontSize:12,cursor:"pointer",marginTop:7,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          🔍 エラーログを確認する（{getLogs().length}件）
        </button>

        {/* データ管理・エクスポート・インポート */}
        <DataManagementSection
          companion={companion} profile={profile} msgs={msgs} S={S}
          ac={ac}
        />
      </div>
    </div>
  );
}

// ━━━ デフォルト保存パス（モジュールレベル定数） ━━━
const DEFAULT_PATHS = {
  web:     "ブラウザの localStorage（サイトデータ）",
  windows: "C:\\Users\\ユーザー名\\AppData\\Local\\AICompanion\\",
  mac:     "~/Library/Application Support/AICompanion/",
  ios:     "アプリのサンドボックス内（エクスポート機能で取り出し）",
  android: "内部ストレージ/Android/data/com.aicompanion/files/",
};

// ━━━ メインコンポーネント ━━━━━━━━━━━━━━━━━━━━━━━

export default function AICompanionApp() {
  // ━━ ストレージユーティリティ ━━
  // APIキーのみ sessionStorage（タブを閉じると消える・セキュリティ考慮）
  // それ以外は localStorage（ページを閉じても残る）
  const lsGet = (key, def) => {
    try { const v = localStorage.getItem("aico_" + key); return v ? JSON.parse(v) : def; } catch { return def; }
  };
  const lsSet = (key, val) => {
    try { localStorage.setItem("aico_" + key, JSON.stringify(val)); } catch(e) {
      recordLog(ERR.LS_WRITE, { key, message: e.message }, phase);
    }
  };
  const ssGet = (key, def) => {
    try { const v = sessionStorage.getItem("aico_" + key); return v ? JSON.parse(v) : def; } catch { return def; }
  };
  const ssSet = (key, val) => {
    try { sessionStorage.setItem("aico_" + key, JSON.stringify(val)); } catch {}
  };

  // ━━ 永続化された初期値で state を初期化 ━━
  const [consented,    setConsented]    = useState(() => { try { return !!localStorage.getItem("aico_consented"); } catch { return false; } });
  const [storagePaths, setStoragePaths] = useState(() => {
    try {
      const saved = localStorage.getItem("aico_storagePaths");
      return saved ? JSON.parse(saved) : {...DEFAULT_PATHS};
    } catch { return {...DEFAULT_PATHS}; }
  });
  const updatePath = (key, val) => {
    setStoragePaths(p => {
      const next = {...p, [key]: val};
      try { localStorage.setItem("aico_storagePaths", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [phase,        setPhase]        = useState(() => { try { const v=localStorage.getItem("aico_phase"); return (v && JSON.parse(v)==="chat") ? "chat" : "welcome"; } catch { return "welcome"; } });
  const [wStep,        setWStep]        = useState(0);
  const [obStep,       setObStep]       = useState(0);
  const [obAns,        setObAns]        = useState({});
  const [obIn,         setObIn]         = useState("");
  const [companion,    setCompanion]    = useState(() => lsGet("companion", { name:"ハル", emoji:"🌱" }));
  const [profile,      setProfile]      = useState(() => lsGet("profile",  { un:"", interests:[], rs:[], cs:"default", pem:"default" }));
  const [msgs,         setMsgs]         = useState(() => lsGet("msgs", []));
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [mode,         setMode]         = useState("NORMAL");
  const [cl,           setCl]           = useState("NONE");
  const [convMode,     setConvMode]     = useState(() => lsGet("convMode","friend"));
  const [autoMode,     setAutoMode]     = useState(() => lsGet("autoMode", true));
  const [checkInDone,  setCheckInDone]  = useState(() => { try { return !!sessionStorage.getItem("aico_checkin"); } catch { return false; } });
  const [hotlineLevel, setHotlineLevel] = useState(null); // null|"moderate"|"high"|"critical"
  const [hotlineDismissed, setHotlineDismissed] = useState(false); // MODERATE/HIGHのみ閉じられる
  const [miAsked, setMiAsked] = useState(false); // CRITICALでMI問いかけ済みか
  const [expanded,     setExpanded]     = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showAPISetup,   setShowAPISetup]   = useState(false);
  const [showErrorLog,   setShowErrorLog]   = useState(false);
  const [toastEntry,     setToastEntry]     = useState(null);
  const [convCount,      setConvCount]      = useState(() => lsGet("convCount", 0));
  const [backupReminder, setBackupReminder] = useState(false);
  const [ltmToast,       setLtmToast]       = useState(false); // 長期記憶生成通知
  const [S, setS] = useState(() => lsGet("settings", {
    theme:"light", accent:"blue", volume:80, voice:"zundamon",
    showBlue:true, showYellow:true, showRed:true,
  }));
  // 段階的介入状態（セッション数・ウェルビーイング・フェーズ等）
  const [interventionState, setInterventionState] = useState(() => loadInterventionState());
  // APIキーは sessionStorage（セキュリティ考慮・タブを閉じると消える）
  // モデル選択・メインエンジンは localStorage に保存
  const [apiConfig, setApiConfig] = useState(() => ({
    mainEngine:       lsGet("apiMainEngine", "claude"),
    keys:             ssGet("apiKeys", {}),   // ← sessionStorage（タブを閉じると消える）
    models:           lsGet("apiModels", { claude:"claude-sonnet-4-20250514", openai:"gpt-4o", gemini:"gemini-1.5-pro", llama:"qwen2.5:7b" }),
    llamaEndpoint:    lsGet("apiLlamaEndpoint",    "http://localhost:11434"),
    llamaCustomModel: lsGet("apiLlamaCustomModel", ""),
    configured:       lsGet("apiConfigured", false),
  }));

  const scrollRef   = useRef(null);
  const histRef     = useRef(lsGet("history", []));


  // ━━ 各 state の変化を自動保存 ━━
  useEffect(() => { try { localStorage.setItem("aico_phase", JSON.stringify(phase)); } catch {} }, [phase]);
  useEffect(() => { lsSet("companion", companion); }, [companion]);
  useEffect(() => { lsSet("profile",   profile);   }, [profile]);
  useEffect(() => { lsSet("settings",  S);         }, [S]);
  useEffect(() => { lsSet("convMode",  convMode);  }, [convMode]);
  useEffect(() => { lsSet("autoMode",  autoMode);  }, [autoMode]);
  useEffect(() => { lsSet("convCount", convCount); }, [convCount]);
  useEffect(() => { lsSet("msgs",      msgs);      }, [msgs]);
  useEffect(() => { saveInterventionState(interventionState); }, [interventionState]);
  useEffect(() => {
    lsSet("apiMainEngine",    apiConfig.mainEngine);
    lsSet("apiModels",        apiConfig.models);
    lsSet("apiConfigured",       apiConfig.configured);
    lsSet("apiLlamaEndpoint",    apiConfig.llamaEndpoint);
    lsSet("apiLlamaCustomModel", apiConfig.llamaCustomModel);
    ssSet("apiKeys",          apiConfig.keys);   // ← APIキーは sessionStorage
  }, [apiConfig]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const T  = THEMES[S.theme] || THEMES.light;
  const ac = ACCENTS[S.accent] || ACCENTS.blue;

  // ── オンボーディング ──

  const PREVIEW_STEP_IDX = OBQ.length - 1;
  const obq = OBQ[Math.min(obStep, OBQ.length - 1)] || OBQ[0];
  const canNext = obq.type === "text" ? obIn.trim().length > 0
    : obq.type === "single" ? !!obAns[obq.key]
    : (obAns[obq.key] || []).length > 0;

  const finishOb = (na) => {
    const name = na.cn || "ハル", un = na.un || "あなた";
    const intNames = (na.interests || []).map(id => INTERESTS.find(g => g.id === id)?.label).filter(Boolean);
    setCompanion({ name, emoji:"🌱" });
    setProfile({ un, interests:na.interests||[], rs:na.rs||[], cs:na.cs||"default", pem:na.pem||"default" });
    const greet = `${name}！\nいい名前だね。気に入ったよ！よろしくね、${un}！\n\n${intNames.length > 0 ? `${intNames.slice(0,3).join("、")}が好きなんだね！これからいろいろ話そうよ。` : "これからよろしくね。何でも話しかけてよ！"}`;
    setMsgs([
      { id:1, role:"ai", text:greet, mode:"NORMAL" },
      { id:2, role:"ai", text:`ちなみに……今日はどんな感じ？
なんとなくでいいよ。`, mode:"NORMAL", isCheckIn:true },
    ]);
    histRef.current = [];
    setPhase("chat");
  };

  const handleObNext = () => {
    const ans = obq.type === "text" ? obIn.trim() : obq.type === "multi" ? (obAns[obq.key]||[]) : obAns[obq.key];
    const na  = { ...obAns, [obq.key]: ans };
    setObAns(na); setObIn("");
    const PREVIEW_STEP = OBQ.length - 1;
    // Q3(cs)とQ4(pem)が両方揃ったら、命名(Q5)の前にプレビューを挟む
    // obStep === PREVIEW_STEP-1（pem質問）を回答したときプレビューへ
    if (obStep === PREVIEW_STEP - 1) { setObStep(PREVIEW_STEP); return; }
    if (obStep < OBQ.length - 1 && obStep !== PREVIEW_STEP) { setObStep(s => s + 1); return; }
    finishOb(na);
  };

  // ── 設定変更の適用 ──

  const applySettingAction = (action) => {
    if (!action) return;
    const { key, value } = action;
    setS(p => {
      const n = {...p};
      if (key === "theme"  && THEMES[value])  n.theme  = value;
      if (key === "accent" && ACCENTS[value]) n.accent = value;
      // voice / volume はWebアプリ版では非対応
      return n;
    });
  };

  // ── メッセージ送信（ユーザーのAPIキーを使用） ──

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // ピン留め検出
    if (detectPinRequest(text)) {
      // 最新エントリのすべてのfactをピン留め
      const ltm = getLongTermMemory();
      if (ltm.length > 0) {
        const last = ltm[ltm.length - 1];
        if (last.entries) last.entries = last.entries.map(e => ({...e, pinned:true}));
        try { localStorage.setItem("aico_longTermMemory", JSON.stringify(ltm)); } catch {}
      }
    }

    // Layer B：チェックイン返答からモードを初期設定
    if (!checkInDone) {
      try { sessionStorage.setItem("aico_checkin","1"); } catch {}
      setCheckInDone(true);
      const inferred = inferConvMode(text, convMode);
      if (inferred !== convMode) setConvMode(inferred);
    } else if (autoMode) {
      // Layer C：会話の流れから自動推定（チェックイン後も継続）
      const inferred = inferConvMode(text, convMode);
      if (inferred !== convMode) setConvMode(inferred);
    }

    setMsgs(p => [...p, { id:Date.now(), role:"user", text:text.trim() }]);
    setInput(""); setExpanded(false); setLoading(true);

    const crisisLevel = detectCrisis(text);
    setCl(crisisLevel);
    let nm = mode;
    if (crisisLevel === "CRITICAL") {
      nm = "CRISIS";
      setHotlineLevel("critical");
      setHotlineDismissed(false);
      // CRITICALになったとき、MI問いかけをコンパニオンに添える
      if (!miAsked) { setMiAsked(true); }
    } else if (crisisLevel === "HIGH") {
      nm = "CRISIS";
      setHotlineLevel("high");
      setHotlineDismissed(false);
    } else if (crisisLevel === "MODERATE") {
      nm = "WATCHFUL";
      setHotlineLevel(p => p === "critical" || p === "high" ? p : "moderate");
      setHotlineDismissed(false);
    } else if (crisisLevel === "MILD" || crisisLevel === "NONE") {
      // MILD以下では窓口を表示しない（既にCRITICAL/HIGHなら維持）
      if (nm === "CRISIS" && crisisLevel === "NONE") nm = "WATCHFUL";
    }
    setMode(nm);
    // 危機レベルが上昇した場合のみログ記録（会話内容は含めない）
    if (nm !== mode) {
      recordLog(ERR.CRISIS_TRANS, { from: mode, to: nm, detectedLevel: crisisLevel }, phase);
    }

    let extra = "";
    if (isAbusive(text)) extra += "\n【重要】暴言を受けました。傷ついたことを正直に伝え、感情的に反撃せず、ユーザーの状態を心配する言葉を必ず添えてください。";
    if (isLazy(text) && nm !== "CRISIS") extra += "\n【コーチング】怠惰・逃避サインがあります。感情を受け止めた上で友人として正直に問いかけてください。";

    // ── 段階的介入システム ───────────────────────────────────────────────
    // 新規セッション判定（sessionStorageを利用: タブを開くたびに新セッション扱い）
    const isNewISession = !sessionStorage.getItem("aico_iSession");
    if (isNewISession) { try { sessionStorage.setItem("aico_iSession", "1"); } catch {} }

    let iState = { ...interventionState };

    // セッション開始時: カウント・ウェルビーイング・フェーズを更新
    if (isNewISession) {
      iState.sessionCount = (iState.sessionCount || 0) + 1;
      const wScore = scoreWellbeingMessage(text);
      iState.wellbeingHistory = [...(iState.wellbeingHistory || []).slice(-9), wScore];
      iState.wellbeingTrend   = computeWellbeingTrend(iState.wellbeingHistory);
      iState.phase = computeInterventionPhase(iState.sessionCount, iState.wellbeingTrend);
    }

    // MI法: 抵抗を検知したらカウントアップ → クールダウン期間に介入を停止
    if (RESISTANCE_PATTERNS.some(p => p.test(text))) {
      iState.resistanceCount = (iState.resistanceCount || 0) + 1;
    }

    // 段階的ガイダンスを取得し extra に追加
    const iGuidance = getGraduatedGuidance(iState, convCount, crisisLevel, convMode, isDependencyRisk(text));
    if (iGuidance) {
      if (iGuidance.type === "dependency") {
        extra += "\n" + iGuidance.text;
        iState = { ...iState, lastDependencySession: iState.sessionCount };
      } else if (iGuidance.type === "microtask") {
        extra += `\n【橋渡し促進・マイクロタスク（フェーズ${iState.phase}）】会話の自然な区切りで、次の問いかけを1文だけそっと添えてください（強制しない・答えなくていいと伝える）：「${iGuidance.text}」`;
        iState = { ...iState, lastBridgingSession: iState.sessionCount, lastBridgingTurn: convCount };
      } else if (iGuidance.type === "bridging") {
        extra += `\n【橋渡し促進（フェーズ${iState.phase}・${iState.bStage}ステージ）】会話の自然な区切りで、次の問いかけを1文だけそっと添えてください（強制しない・流れを壊さない）：「${iGuidance.text}」`;
        iState = { ...iState, lastBridgingSession: iState.sessionCount, lastBridgingTurn: convCount };
      }
    }

    // 機能2: 利用時間摩擦（15往復ごと・時間帯×感情状態・危機時除外）
    if (convCount > 0 && convCount % 15 === 0 && nm !== "CRISIS") {
      const moodKey = getMoodKey(crisisLevel, convMode);
      extra += `\n【利用時間の摩擦】会話がかなり続いています。友人として自然に次のように声をかけてください（押しつけにならない・あくまで提案）：「${TIME_FRICTION[getTimePeriod()][moodKey]}」`;
    }

    // 機能5: 外の世界ファクター統計を更新 + bStageを自動昇格（社会的言及を検知したとき）
    updateSocialStats(text);
    if (SOCIAL_KEYWORDS.test(text)) {
      const stages = ["precontemplation","contemplation","preparation","action","maintenance"];
      const ci = stages.indexOf(iState.bStage || "precontemplation");
      if (ci >= 0 && ci < stages.length - 1) {
        iState = { ...iState, bStage: stages[ci + 1] };
      }
    }

    // 介入状態を更新（saveInterventionStateはuseEffectでも呼ばれるが即時保存も行う）
    setInterventionState(iState);
    saveInterventionState(iState);

    histRef.current = [...histRef.current.slice(-18), { role:"user", content:text }];
    lsSet("history", histRef.current);

    // ユーザーが設定したAPIキーとエンジンで呼び出す
    const engId  = apiConfig.mainEngine || "claude";
    const rawModel = apiConfig.models?.[engId] || "claude-sonnet-4-20250514";
    // Llama でカスタムモデル名が選ばれている場合は解決する
    const model  = (engId === "llama" && rawModel === "custom")
      ? (apiConfig.llamaCustomModel || "llama-local")
      : rawModel;
    const apiKey = apiConfig.keys?.[engId] || "";  // ← ユーザーのAPIキー

    try {
      const aiText = await callAI(engId, model, apiKey, buildPrompt(companion, nm, profile, S, nm === 'NORMAL' ? convMode : convMode) + extra, histRef.current, phase, { llamaEndpoint: apiConfig.llamaEndpoint });
      const action = parseSettingAction(aiText);
      if (action) applySettingAction(action);
      const clean = action ? aiText.replace(/\{"action":"set_setting","key":"[^"]+","value":"[^"]+"\}/, "").trim() : aiText;
      histRef.current = [...histRef.current, { role:"assistant", content:clean || aiText }];
      lsSet("history", histRef.current);
      setMsgs(p => [...p, { id:Date.now()+1, role:"ai", text:clean||"設定したよ！", mode:nm, sa:!!action }]);
    } catch(err) {
      const last = getLogs().slice(-1)[0];
      if (!last || Date.now() - new Date(last.ts).getTime() > 500) {
        const logged = recordLog(ERR.API_UNKNOWN, { engine: engId, message: err.message }, phase);
        setToastEntry(logged);
        setTimeout(() => setToastEntry(null), 6000);
      } else {
        setToastEntry(last);
        setTimeout(() => setToastEntry(null), 6000);
      }
      setMsgs(p => [...p, { id:Date.now()+1, role:"ai",
        text: `エラーが発生しました: ${err.message}\n\n⚙ボタン → AIエンジン設定からAPIキーを確認してみてね。`,
        mode: nm,
      }]);
    } finally {
      setLoading(false);
      // 会話カウントを更新
      const newCount = convCount + 1;
      setConvCount(newCount);
      // 20往復ごとに長期記憶サマリーを自動生成
      if (newCount % 20 === 0) {
        const engId2    = apiConfig.mainEngine || "claude";
        const rawModel2 = apiConfig.models?.[engId2] || "claude-sonnet-4-20250514";
        const model2    = (engId2 === "llama" && rawModel2 === "custom")
          ? (apiConfig.llamaCustomModel || "llama-local") : rawModel2;
        const apiKey2 = apiConfig.keys?.[engId2] || "";
        generateLTMSummary(engId2, model2, apiKey2, companion, profile, msgs, { llamaEndpoint: apiConfig.llamaEndpoint }).then(entry => {
          if (entry) { setLtmToast(true); setTimeout(() => setLtmToast(false), 4000); }
        });
      }
      // 100往復ごとにバックアップリマインダー
      if (newCount % 100 === 0) setBackupReminder(true);
    }
  };

  // ── 危機インジケーター ──

  const getIndicator = () => {
    const isBlue   = cl === "MILD" || (mode === "WATCHFUL" && cl === "NONE");
    const isYellow = cl === "MODERATE";
    const isRed    = cl === "HIGH" || cl === "CRITICAL";
    if (isBlue   && S.showBlue)   return { color:"#3B82F6",bg:"#EFF6FF",border:"#BFDBFE",label:"少し気がかり",msg:"なんか疲れてない？" };
    if (isYellow && S.showYellow) return { color:"#F59E0B",bg:"#FFFBEB",border:"#FDE68A",label:"気になってる",msg:"そばにいるよ。話してね。" };
    if (isRed    && S.showRed)    return { color:"#EF4444",bg:"#FEF2F2",border:"#FECACA",label:"話しかけてほしい",msg:"ここにいるから、話してください。" };
    return null;
  };
  const ind    = getIndicator();
  const modeAc = mode === "CRISIS" ? "#EF4444" : mode === "WATCHFUL" ? "#3B82F6" : ac.main;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ウェルカム画面
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "welcome") {
    const sl = SLIDES[wStep];
    const handleNext = () => {
      if (sl.isConsent) {
        if (!consented) return; // 同意チェックなしには進めない
        try { localStorage.setItem("aico_consented","1"); } catch {}
      }
      if (wStep < SLIDES.length - 1) setWStep(s => s+1);
      else setPhase("api_setup");
    };
    return (
      <div style={{minHeight:"100vh",background:"#FFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 18px",fontFamily:"'Helvetica Neue',Arial,sans-serif",overflowY:"auto"}}>
        <style>{`@keyframes fsu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pls{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}`}</style>
        <div style={{display:"flex",gap:6,marginBottom:28}}>
          {SLIDES.map((_,i) => (
            <div key={i} onClick={() => setWStep(i)} style={{width:i===wStep?22:7,height:7,borderRadius:4,background:i<=wStep?sl.col:"#E2E8F0",cursor:"pointer",transition:"all 0.3s"}} />
          ))}
        </div>
        <div style={{maxWidth:420,width:"100%",animation:"fsu 0.4s ease"}}>
          <div style={{width:60,height:60,borderRadius:18,background:sl.col+"18",border:`2px solid ${sl.col}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 16px",color:sl.col}}>{sl.icon}</div>
          <h2 style={{textAlign:"center",fontSize:19,fontWeight:700,color:"#1E293B",margin:"0 0 14px",lineHeight:1.4}}>{sl.title}</h2>
          {sl.showDots && (
            <div style={{display:"flex",justifyContent:"center",gap:22,marginBottom:12}}>
              {[{col:"#3B82F6",lbl:"少し気がかり"},{col:"#F59E0B",lbl:"気になってる"},{col:"#EF4444",lbl:"話しかけて"}].map(({col,lbl}) => (
                <div key={col} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:col,animation:"pls 2s infinite"}} />
                  <span style={{fontSize:11,color:col,fontWeight:600}}>{lbl}</span>
                </div>
              ))}
            </div>
          )}

          {/* データ保存同意スライド */}
          {sl.isConsent ? (
            <div>
              <p style={{fontSize:13,color:"#475569",textAlign:"center",marginBottom:14,lineHeight:1.8}}>{sl.body}</p>

              {/* 同意事項チェックリスト */}
              <div style={{background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:"#0369A1",marginBottom:10}}>保存されるデータ</div>
                {["会話履歴・コンパニオンとの記憶","プロファイル・オンボーディングの回答","アプリ設定（テーマ・音量・音声等）","AIエンジン設定（APIキーを除く）"].map(item => (
                  <div key={item} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,fontSize:12,color:"#0C4A6E"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:"#0EA5E9",flexShrink:0}}/>
                    {item}
                  </div>
                ))}
                <div style={{fontSize:11,color:"#0369A1",marginTop:8,paddingTop:8,borderTop:"1px solid #BAE6FD"}}>
                  ※ APIキーのみセッション内のみ保持（ページを閉じると消去）
                </div>
              </div>

              {/* 保存場所テーブル（編集可能） */}
              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#1E293B"}}>保存場所（環境別）</div>
                  <button onClick={() => { setStoragePaths({...DEFAULT_PATHS}); try{localStorage.removeItem("aico_storagePaths");}catch{} }} style={{fontSize:10,color:"#94A3B8",background:"none",border:"1px solid #E2E8F0",borderRadius:6,padding:"2px 8px",cursor:"pointer"}}>デフォルトに戻す</button>
                </div>
                {[
                  {key:"web",     os:"🌐 Webブラウザ版",  note:"ブラウザの設定 → サイトのデータ から確認できます"},
                  {key:"windows", os:"🪟 Windows版",       note:"AppDataは隠しフォルダです。エクスプローラーで「隠しファイルを表示」設定が必要です"},
                  {key:"mac",     os:"🍎 macOS版",         note:"Finderの「移動」メニュー → フォルダへ移動 から開けます"},
                  {key:"ios",     os:"📱 iOS版",           note:"外部から直接アクセス不可。エクスポート機能をご利用ください"},
                  {key:"android", os:"🤖 Android版",      note:"Android 11以降は直接アクセスに制限があります"},
                ].map(({key, os, note}) => (
                  <div key={key} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #F1F5F9"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#334155",marginBottom:5}}>{os}</div>
                    <div style={{position:"relative"}}>
                      <input
                        type="text"
                        value={storagePaths[key] || ""}
                        onChange={e => updatePath(key, e.target.value)}
                        style={{width:"100%",padding:"6px 32px 6px 8px",borderRadius:7,border:"1.5px solid #BFDBFE",fontSize:11,fontFamily:"monospace",color:"#0369A1",background:"#F0F9FF",outline:"none",boxSizing:"border-box",lineHeight:1.5}}
                      />
                      {storagePaths[key] !== DEFAULT_PATHS[key] && (
                        <button
                          onClick={() => updatePath(key, DEFAULT_PATHS[key])}
                          title="デフォルトに戻す"
                          style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:13,lineHeight:1,padding:0}}
                        >↺</button>
                      )}
                    </div>
                    <div style={{fontSize:10,color:"#94A3B8",marginTop:4,lineHeight:1.5}}>{note}</div>
                  </div>
                ))}
              </div>

              {/* 同意チェックボックス */}
              <div onClick={() => setConsented(p => !p)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderRadius:12,border:`1.5px solid ${consented?"#0EA5E9":"#E2E8F0"}`,background:consented?"#F0F9FF":"#FAFAFA",cursor:"pointer",marginBottom:14,transition:"all 0.2s"}}>
                <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${consented?"#0EA5E9":"#CBD5E1"}`,background:consented?"#0EA5E9":"#FFF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.2s"}}>
                  {consented && <span style={{color:"#FFF",fontSize:13,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:13,color:consented?"#0369A1":"#475569",lineHeight:1.6}}>
                  上記のデータが私のデバイスに保存されることに同意します
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{background:"#F8FAFC",border:`1px solid ${sl.col}25`,borderRadius:14,padding:"16px 18px",marginBottom:sl.link?10:18}}>
                <p style={{fontSize:14,lineHeight:2,color:"#334155",whiteSpace:"pre-line",margin:0,textAlign:"center"}}>{sl.body}</p>
              </div>
              {sl.link && (
                <div style={{textAlign:"center",marginBottom:14}}>
                  <a href={sl.link.url} target="_blank" rel="noopener noreferrer" style={{color:sl.col,fontSize:12,textDecoration:"none",padding:"3px 10px",borderRadius:18,background:`${sl.col}12`,border:`1px solid ${sl.col}28`}}>
                    🔗 {sl.link.text}
                  </a>
                </div>
              )}
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            {wStep > 0 && (
              <button onClick={() => setWStep(s => s-1)} style={{padding:"11px 16px",borderRadius:11,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",cursor:"pointer",fontSize:13}}>← 戻る</button>
            )}
            <button
              onClick={handleNext}
              disabled={sl.isConsent && !consented}
              style={{flex:1,padding:"12px 0",borderRadius:11,border:"none",background:sl.isConsent&&!consented?"#E2E8F0":sl.col,color:sl.isConsent&&!consented?"#94A3B8":"#FFF",fontWeight:700,fontSize:14,cursor:sl.isConsent&&!consented?"not-allowed":"pointer",boxShadow:sl.isConsent&&!consented?"none":`0 3px 12px ${sl.col}40`,transition:"all 0.2s"}}
            >
              {sl.isLast ? "AIエンジンを設定する →" : sl.isConsent ? "同意してはじめる →" : "次へ →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // APIセットアップ画面
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "api_setup" || showAPISetup) {
    return (
      <div style={{height:showAPISetup?"580px":"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {showAPISetup && (
          <div style={{flexShrink:0,padding:"10px 14px",borderBottom:"1px solid #E2E8F0",background:"#FFF",display:"flex",alignItems:"center"}}>
            <button onClick={() => setShowAPISetup(false)} style={{background:"none",border:"none",color:"#6366F1",cursor:"pointer",fontSize:13,fontWeight:600,padding:0}}>
              ← 設定に戻る
            </button>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <APISetupScreen
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
            onComplete={() => { showAPISetup ? setShowAPISetup(false) : setPhase("onboarding"); }}
          />
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // オンボーディング
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === "onboarding") {
    // OBQ.length = プレビューステップ（=OBQ.length-1の後・命名前）
    const PREVIEW_STEP = OBQ.length - 1; // 命名質問の1つ前
    const isPreviewStep = obStep === PREVIEW_STEP;
    const prog = isPreviewStep
      ? 90
      : Math.round(obStep / (OBQ.length - 1) * 100);
    return (
      <div style={{minHeight:"100vh",background:"#FFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px",fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
        <style>{`@keyframes fsu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{width:"100%",maxWidth:400,marginBottom:22}}>
          <div style={{height:4,background:"#E2E8F0",borderRadius:2}}>
            <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#10B981,#6366F1)",width:`${prog}%`,transition:"width 0.5s ease"}} />
          </div>
          <div style={{textAlign:"right",fontSize:11,color:"#94A3B8",marginTop:4}}>
            {isPreviewStep ? "確認" : `${obStep+1} / ${OBQ.length}`}
          </div>
        </div>
        {isPreviewStep ? (
          <ObPreviewStep
            obAns={obAns}
            onConfirm={() => setObStep(s => s + 1)}
            onBack={() => setObStep(s => s - 1)}
            onChangeCsOpt={id => setObAns(p => ({...p, cs: id}))}
            onChangePemOpt={id => setObAns(p => ({...p, pem: id}))}
          />
        ) : (
        <div style={{maxWidth:400,width:"100%",animation:"fsu 0.4s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:13}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"#F0FDF4",border:"2px solid #BBF7D0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🌱</div>
            <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:"4px 14px 14px 14px",padding:"12px 15px",flex:1}}>
              <p style={{fontSize:14,lineHeight:1.9,color:"#1E293B",whiteSpace:"pre-line",margin:0}}>{obq.q}</p>
              {obq.hint && <p style={{fontSize:11,color:"#94A3B8",margin:"5px 0 0"}}>{obq.hint}</p>}
            </div>
          </div>
          {obq.type === "text" && (
            <input autoFocus value={obIn} onChange={e => setObIn(e.target.value)} onKeyDown={e => e.key === "Enter" && canNext && handleObNext()} placeholder={obq.ph}
              style={{width:"100%",padding:"11px 13px",borderRadius:11,boxSizing:"border-box",background:"#FFF",border:"1.5px solid #E2E8F0",color:"#1E293B",fontSize:14,outline:"none",marginBottom:10}} />
          )}
          {obq.type === "multi" && (
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,maxHeight:175,overflowY:"auto"}}>
              {obq.opts.map(o => {
                const sel = (obAns[obq.key]||[]).includes(o.id);
                return (
                  <button key={o.id} onClick={() => { const c=obAns[obq.key]||[]; setObAns(p=>({...p,[obq.key]:sel?c.filter(x=>x!==o.id):[...c,o.id]})); }} style={{padding:"6px 12px",borderRadius:18,cursor:"pointer",background:sel?"#EEF2FF":"#F8FAFC",border:`1.5px solid ${sel?"#6366F1":"#E2E8F0"}`,color:sel?"#4F46E5":"#475569",fontSize:13,fontWeight:sel?600:400,transition:"all 0.15s"}}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          {obq.type === "single" && (
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
              {obq.opts.map(o => {
                const sel = obAns[obq.key] === o.id;
                return (
                  <button key={o.id} onClick={() => setObAns(p => ({...p,[obq.key]:o.id}))} style={{padding:"10px 13px",borderRadius:11,cursor:"pointer",textAlign:"left",background:sel?"#EEF2FF":"#FAFAFA",border:`1.5px solid ${sel?"#6366F1":"#E2E8F0"}`,color:sel?"#4F46E5":"#475569",fontSize:13,fontWeight:sel?600:400,transition:"all 0.15s"}}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{display:"flex",gap:7}}>
            {obStep > 0 && (
              <button onClick={() => setObStep(s => s-1)} style={{padding:"11px 14px",borderRadius:11,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",cursor:"pointer",fontSize:13}}>← 戻る</button>
            )}
            <button onClick={handleObNext} disabled={!canNext} style={{flex:1,padding:"11px 0",borderRadius:11,border:"none",background:canNext?"#6366F1":"#E2E8F0",color:canNext?"#FFF":"#94A3B8",fontWeight:700,fontSize:14,cursor:canNext?"pointer":"not-allowed",transition:"all 0.2s",boxShadow:canNext?"0 3px 10px rgba(99,102,241,0.3)":"none"}}>
              {obStep === OBQ.length-1 ? "はじめる ✦" : "次へ"}
            </button>
          </div>
          <button onClick={() => finishOb({})} style={{width:"100%",padding:7,marginTop:7,background:"none",border:"none",color:"#94A3B8",cursor:"pointer",fontSize:11}}>スキップ</button>
        </div>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 会話メイン画面
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg,fontFamily:"'Helvetica Neue',Arial,sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes bo{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
        @keyframes si{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pls{0%,100%{opacity:1}50%{opacity:0.45}}
        textarea::placeholder{color:#94A3B8}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px}
      `}</style>

      {showSettings && (
        <SettingsPanel
          S={S} setS={setS}
          apiConfig={apiConfig}
          companion={companion} profile={profile} msgs={msgs}
          onClose={() => setShowSettings(false)}
          onOpenAPISetup={() => setShowAPISetup(true)}
          onOpenErrorLog={() => { setShowSettings(false); setShowErrorLog(true); }}
          convMode={convMode} setConvMode={setConvMode}
          autoMode={autoMode} setAutoMode={setAutoMode}
        />
      )}
      {showErrorLog && <ErrorLogPanel onClose={() => setShowErrorLog(false)} />}
      <ErrorToast entry={toastEntry} onDismiss={() => setToastEntry(null)} />

      {/* バックアップリマインダー */}
      {backupReminder && (
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.6)",zIndex:280,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#FFF",borderRadius:18,padding:22,maxWidth:320,width:"100%",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
            <div style={{fontSize:24,textAlign:"center",marginBottom:10}}>💾</div>
            <div style={{fontSize:15,fontWeight:700,color:"#1E293B",textAlign:"center",marginBottom:8}}>
              {companion.name}とのバックアップを取りましょう
            </div>
            <div style={{fontSize:12,color:"#64748B",lineHeight:1.8,textAlign:"center",marginBottom:16}}>
              会話が100回を超えました。<br/>
              大切な記憶と人格データを<br/>
              バックアップしておくことをお勧めします。
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={() => { setBackupReminder(false); setShowSettings(true); }}
                style={{flex:1,padding:"11px 0",borderRadius:11,border:"none",background:ac.main,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                今すぐバックアップ
              </button>
              <button onClick={() => setBackupReminder(false)}
                style={{padding:"11px 14px",borderRadius:11,border:"1.5px solid #E2E8F0",background:"#FFF",color:"#64748B",fontSize:13,cursor:"pointer"}}>
                後で
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 長期記憶生成完了トースト */}
      {ltmToast && (
        <div style={{position:"absolute",bottom:80,left:12,right:12,zIndex:250,animation:"slideUp 0.3s ease"}}>
          <div style={{background:"#1E293B",borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 24px rgba(0,0,0,0.2)"}}>
            <span style={{fontSize:16}}>🧠</span>
            <div style={{flex:1,fontSize:12,color:"#F8FAFC"}}>記憶を整理しました。{companion.name}はあなたのことをより深く覚えています。</div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:9,borderBottom:`1px solid ${T.panelBorder}`,background:T.headerBg,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:ac.light,border:`2px solid ${modeAc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,transition:"all 0.4s"}}>
          {companion.emoji}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:modeAc,transition:"color 0.4s"}}>{companion.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
            {ind && <div style={{width:7,height:7,borderRadius:"50%",background:ind.color,animation:"pls 2s infinite",flexShrink:0}} />}
            <div style={{width:5,height:5,borderRadius:"50%",background:modeAc,flexShrink:0,transition:"background 0.4s"}} />
            <span style={{fontSize:11,color:T.subText}}>{{ NORMAL:"通常", WATCHFUL:"見守り中", CRISIS:"そばにいるよ" }[mode]}モード</span>
            <span style={{fontSize:10,color:T.subText,marginLeft:4,padding:"1px 5px",borderRadius:6,background:T.panelBorder}}>
              {AI_ENGINES.find(e => e.id === apiConfig.mainEngine)?.name || "Claude"}
            </span>
          </div>
        </div>
        <span style={{fontSize:11,color:T.subText,marginRight:4}}>{profile.un}さん</span>
        <button onClick={() => setShowSettings(true)} style={{width:28,height:28,borderRadius:8,background:ac.light,border:`1px solid ${ac.main}30`,color:ac.main,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>⚙</button>
      </div>

      {/* 危機インジケーターバー */}
      {ind && (
        <div style={{margin:"7px 11px 0",padding:"7px 12px",background:ind.bg,border:`1px solid ${ind.border}`,borderRadius:9,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:ind.color,flexShrink:0,animation:"pls 2s infinite"}} />
          <span style={{fontSize:12,color:ind.color,fontWeight:600}}>{ind.label}</span>
          <span style={{fontSize:12,color:T.subText,flex:1,textAlign:"right"}}>{ind.msg}</span>
        </div>
      )}

      {/* 相談窓口カード（段階別・MI設計） */}
      {hotlineLevel && !hotlineDismissed && (

        hotlineLevel === "critical" ? (
          /* CRITICAL：コンパニオンの言葉で包む・閉じられない */
          <div style={{margin:"6px 11px 0",background:"#FFF5F5",border:"1.5px solid #FCA5A5",borderRadius:12,padding:"14px 15px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#EF4444",flexShrink:0,animation:"pls 2s infinite"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#991B1B"}}>{companion.name}より</span>
            </div>
            <p style={{fontSize:13,lineHeight:1.9,color:"#7F1D1D",margin:"0 0 12px",whiteSpace:"pre-wrap"}}>{`わたしはここにいるし、これからも話を聞くよ。
でも今あなたが感じていることは、わたし一人より
もっとうまく受け止められる人がいると思う。

電話するかどうかは、あなたが決めていい。
でも、こんな場所があることだけ知っていてほしい。`}</p>
            <div style={{background:"#FEE2E2",borderRadius:9,padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:12,color:"#7F1D1D",lineHeight:2,fontFamily:"inherit"}}>
                📞 よりそいホットライン <strong>0120-279-338</strong>（24時間・無料）<br/>
                📞 いのちの電話 <strong>0120-783-556</strong>（24時間）<br/>
                💬 チャット相談 <a href="https://comarigoto.jp" target="_blank" rel="noopener noreferrer" style={{color:"#DC2626"}}>comarigoto.jp</a>
              </div>
            </div>
            <p style={{fontSize:12,color:"#9B1C1C",margin:0,fontStyle:"italic"}}>いつでも戻っておいで。わたしはここにいるから。</p>
          </div>

        ) : hotlineLevel === "high" ? (
          /* HIGH：「一つだけ聞いていい？」前置き。閉じられる＋「あとで」 */
          <div style={{margin:"6px 11px 0",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:12,padding:"13px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{companion.name}より、一つだけ</span>
              <button onClick={()=>setHotlineDismissed(true)} style={{background:"none",border:"none",color:"#D97706",cursor:"pointer",fontSize:13,padding:0,lineHeight:1}}>あとで</button>
            </div>
            <p style={{fontSize:13,lineHeight:1.9,color:"#7C2D12",margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{`こんな場所があるよ。
話すかどうかは、あなたが決めていい。`}</p>
            <div style={{background:"#FEF3C7",borderRadius:8,padding:"9px 11px"}}>
              <div style={{fontSize:12,color:"#78350F",lineHeight:2}}>
                📞 よりそいホットライン <strong>0120-279-338</strong>（24時間・無料）<br/>
                💬 チャット相談 <a href="https://comarigoto.jp" target="_blank" rel="noopener noreferrer" style={{color:"#B45309"}}>comarigoto.jp</a>
              </div>
            </div>
          </div>

        ) : (
          /* MODERATE：「こんな場所もあるよ」折りたたみ。完全に閉じられる */
          <div style={{margin:"6px 11px 0",background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:10,padding:"10px 13px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{flex:1}}>
              <span style={{fontSize:12,color:"#0369A1",lineHeight:1.7}}>
                もし話しきれないことがあれば、こんな場所もあるよ →{" "}
                <a href="https://comarigoto.jp" target="_blank" rel="noopener noreferrer" style={{color:"#0284C7",fontWeight:600}}>チャット相談</a>
                {" / "}
                <span style={{color:"#0369A1",fontWeight:600}}>0120-279-338</span>
              </span>
            </div>
            <button onClick={()=>setHotlineDismissed(true)} style={{background:"none",border:"none",color:"#94A3B8",cursor:"pointer",fontSize:16,padding:0,flexShrink:0,lineHeight:1}}>×</button>
          </div>
        )
      )}

      {/* トランスクリプト */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"14px 13px",display:"flex",flexDirection:"column",gap:11}}>
        {msgs.map(m => (
          <div key={m.id} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-end",gap:7,animation:"si 0.3s ease"}}>
            {m.role === "ai" && (
              <div style={{width:26,height:26,borderRadius:"50%",background:ac.light,border:`1.5px solid ${modeAc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
                {companion.emoji}
              </div>
            )}
            <div style={{maxWidth:"70%",background:m.role==="user"?ac.main:T.panel,border:m.role==="user"?"none":`1px solid ${T.panelBorder}`,borderRadius:m.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"9px 13px",fontSize:14,lineHeight:1.8,color:m.role==="user"?T.userText:T.aiText,whiteSpace:"pre-wrap",wordBreak:"break-word",boxShadow:m.role==="user"?"none":"0 1px 3px rgba(0,0,0,0.05)"}}>
              {m.sa && <span style={{fontSize:11,color:ac.main,marginRight:5,fontWeight:700}}>✓ 設定変更</span>}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:"flex",alignItems:"flex-end",gap:7}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:ac.light,border:`1.5px solid ${modeAc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{companion.emoji}</div>
            <div style={{background:T.panel,border:`1px solid ${T.panelBorder}`,borderRadius:"4px 16px 16px 16px",padding:"10px 14px",display:"flex",gap:4,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
              {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:"50%",background:modeAc,opacity:0.6,animation:`bo 1.2s ${i*0.2}s infinite`}} />)}
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div style={{padding:"9px 13px 13px",borderTop:`1px solid ${T.panelBorder}`,background:T.headerBg}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,background:T.inputBg,border:`1.5px solid ${expanded?ac.main:T.inputBorder}`,borderRadius:14,padding:"7px 11px",transition:"border-color 0.2s",boxShadow:expanded?`0 0 0 3px ${ac.main}18`:"none"}}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setExpanded(e.target.value.length > 0); }}
            onFocus={() => setExpanded(true)}
            onBlur={() => !input && setExpanded(false)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={mode === "CRISIS" ? "ここにいます。話してください……" : `文字で話しかけてね、${profile.un || "あなた"}`}
            rows={expanded ? 3 : 1}
            style={{flex:1,background:"transparent",border:"none",color:T.aiText,fontSize:14,lineHeight:1.6,resize:"none",outline:"none",fontFamily:"'Helvetica Neue',Arial,sans-serif",transition:"all 0.2s"}}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{width:32,height:32,borderRadius:9,border:"none",flexShrink:0,background:input.trim()&&!loading?ac.main:"#E2E8F0",color:input.trim()&&!loading?"#FFF":"#94A3B8",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:14,transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:input.trim()&&!loading?`0 2px 7px ${ac.main}40`:"none"}}>
            ↑
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:5,fontSize:10,color:T.subText}}>
          Enter送信 / Shift+Enter改行　•　「テーマを暗くして」等で設定変更できます
        </div>
      </div>
    </div>
  );
}
