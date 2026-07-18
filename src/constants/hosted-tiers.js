// ホスト型ティアの使用モデル定義（単一情報源）
// フロントエンド（ai_companion_prototype.jsx）とサーバー（api/chat.js）の
// 双方がここを参照する。ティアとモデルの対応を変更する場合はこのファイルのみ修正する。
//
// サーバー側（api/chat.js）はこの定義で engine を検証し、model はここの値で
// 上書きする（リクエスト側の指定は信用しない）。これにより HOST_FREE が
// SUPPORTER 用の有償モデルを指定するといった不正・誤用をサーバーで遮断する。
export const HOSTED_TIER_MODELS = {
  HOST_FREE: { engine: "gemini", model: "gemini-2.0-flash" },
  SUPPORTER: { engine: "claude", model: "claude-haiku-4-5-20251001" },
};
