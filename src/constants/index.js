// アプリ全体で使用する定数

export const INTERESTS = [
  {id:"science",label:"科学・テクノロジー",e:"🔬"},{id:"sf",label:"SF・ファンタジー",e:"🚀"},
  {id:"books",label:"読書・文学",e:"📚"},{id:"music",label:"音楽",e:"🎵"},
  {id:"movies",label:"映画・ドラマ",e:"🎬"},{id:"games",label:"ゲーム",e:"🎮"},
  {id:"cooking",label:"料理・グルメ",e:"🍳"},{id:"travel",label:"旅行",e:"✈️"},
  {id:"art",label:"アート",e:"🎨"},{id:"sports",label:"スポーツ",e:"⚽"},
  {id:"nature",label:"自然・動物",e:"🌿"},{id:"history",label:"歴史・文化",e:"🏛️"},
  {id:"philosophy",label:"哲学・思想",e:"💭"},{id:"anime",label:"アニメ・マンガ",e:"✨"},
  {id:"health",label:"健康",e:"🧘"},{id:"crafts",label:"ものづくり",e:"🔧"},
];

export const VOICES = [
  {id:"zundamon",label:"ずんだもん",  desc:"明るく元気",   emoji:"🌱"},
  {id:"metan",   label:"四国めたん", desc:"落ち着き・知的",emoji:"🍊"},
  {id:"tsumugi", label:"春日部つむぎ",desc:"明朗・活発",   emoji:"💙"},
  {id:"hau",     label:"雨晴はう",   desc:"穏やか・癒し",  emoji:"🌂"},
  {id:"ritsu",   label:"剣崎雌雄",   desc:"クール・低音",  emoji:"⚔️"},
];

export const THEMES = {
  light: {bg:"#F8F9FB",panel:"#FFF",panelBorder:"#E2E8F0",userText:"#FFF",aiText:"#1E293B",subText:"#64748B",inputBg:"#FFF",inputBorder:"#CBD5E1",headerBg:"#FFF",name:"ライト"},
  soft:  {bg:"#EFF6FF",panel:"#FFF",panelBorder:"#BFDBFE",userText:"#FFF",aiText:"#1E293B",subText:"#6B7280",inputBg:"#FFF",inputBorder:"#C7D2FE",headerBg:"#FFF",name:"ソフトブルー"},
  warm:  {bg:"#FFF7ED",panel:"#FFF",panelBorder:"#FED7AA",userText:"#FFF",aiText:"#1C1917",subText:"#78716C",inputBg:"#FFF",inputBorder:"#FDBA74",headerBg:"#FFF",name:"ウォーム"},
  dark:  {bg:"#0F172A",panel:"#1E293B",panelBorder:"#334155",userText:"#FFF",aiText:"#E2E8F0",subText:"#94A3B8",inputBg:"#1E293B",inputBorder:"#475569",headerBg:"#0F172A",name:"ダーク"},
};

export const ACCENTS = {
  blue:   {main:"#3B82F6",light:"#DBEAFE",name:"ブルー"},
  indigo: {main:"#6366F1",light:"#E0E7FF",name:"インディゴ"},
  green:  {main:"#10B981",light:"#D1FAE5",name:"グリーン"},
  amber:  {main:"#F59E0B",light:"#FEF3C7",name:"アンバー"},
  rose:   {main:"#F43F5E",light:"#FFE4E6",name:"ローズ"},
};

export const AI_ENGINES = [
  {
    id: "claude", name: "Claude", maker: "Anthropic",
    desc: "安全性重視・日本語優秀", color: "#D4743A",
    models: [
      {id:"claude-sonnet-4-20250514", label:"Sonnet 4.5（推奨）"},
      {id:"claude-opus-4-6",          label:"Opus 4.6（高性能）"},
      {id:"claude-haiku-4-5-20251001",label:"Haiku 4.5（高速・軽量）"},
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
    id: "llama", name: "Llama", maker: "Meta（オフライン）",
    desc: "完全オフライン・無料・プライバシー最強", color: "#A78BFA",
    models: [{id:"llama-local", label:"ローカルモデル（llama.cpp）"}],
    keyPrefix: "", keyLink: "https://llama.meta.com", keyLabel: "Llamaダウンロード",
    noKey: true,
  },
];

export const DEFAULT_SETTINGS = {
  theme: "light", accent: "blue", volume: 80, voice: "zundamon",
  showBlue: true, showYellow: true, showRed: true,
};

export const DEFAULT_API_MODELS = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro",
  llama:  "llama-local",
};
