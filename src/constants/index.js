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
      {id:"claude-opus-4-8",           label:"Opus 4.8（最新・最高性能）"},
      {id:"claude-sonnet-4-6",         label:"Sonnet 4.6（推奨・バランス）"},
      {id:"claude-opus-4-7",           label:"Opus 4.7（高性能）"},
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
      {id:"gemini-2.5-flash", label:"Gemini 2.5 Flash（推奨・高速）"},
      {id:"gemini-2.5-pro",   label:"Gemini 2.5 Pro（高品質）"},
      {id:"gemini-2.0-flash", label:"Gemini 2.0 Flash（軽量）"},
    ],
    keyPrefix: "AIza",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLabel: "Google AI Studio",
  },
  {
    id: "llama", name: "Llama / Ollama", maker: "ローカル（オフライン）",
    desc: "完全オフライン・無料・プライバシー最強。Gemma・Qwen・Llama 等を Ollama または llama.cpp で動作。", color: "#A78BFA",
    models: [
      {id:"gemma3:4b",   label:"Gemma 3 4B（Ollama・入門・軽量）"},
      {id:"gemma3:12b",  label:"Gemma 3 12B（Ollama・推奨）"},
      {id:"gemma3:27b",  label:"Gemma 3 27B（Ollama・最高品質）"},
      {id:"qwen2.5:7b",  label:"Qwen2.5 7B（Ollama・日本語推奨）"},
      {id:"qwen2.5:3b",  label:"Qwen2.5 3B（Ollama・軽量）"},
      {id:"llama3.2:3b", label:"Llama 3.2 3B（Ollama）"},
      {id:"llama3.1:8b", label:"Llama 3.1 8B（Ollama）"},
      {id:"llama-local",  label:"llama.cpp（自動検出）"},
      {id:"custom",       label:"カスタム（直接入力）"},
    ],
    keyPrefix: "", keyLink: "https://ollama.com", keyLabel: "Ollamaをダウンロード",
    noKey: true,
  },
];

export const DEFAULT_SETTINGS = {
  theme: "light", accent: "blue", volume: 80, voice: "zundamon",
  showBlue: true, showYellow: true, showRed: true,
};

export const DEFAULT_API_MODELS = {
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
  llama:  "gemma3:12b",
};
