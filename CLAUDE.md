# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 開発サーバー起動 (localhost:3000)
npm run build        # 本番ビルド → dist/
npm run preview      # ビルド成果物をローカルプレビュー
npm test             # 全テスト実行（Jest + jsdom）
npm run test:watch   # テストウォッチモード
npm run lint         # ESLint (src/**/*.{js,jsx})

# 単一テストファイルを実行
node --experimental-vm-modules node_modules/.bin/jest src/safety/crisis-detection.test.js

# 特定のdescribeブロックだけ実行
node --experimental-vm-modules node_modules/.bin/jest --testNamePattern="CRITICAL"
```

テストは `**/*.test.js` と `src/**/*.test.js` にマッチする。`babel.config.cjs` が Jest 用の Babel 変換を担当し、`package.json` の `jest` フィールドに設定が集約されている。

## アーキテクチャ

### 2つの「コード層」

| 層 | パス | 役割 |
|----|------|------|
| モノリシック原型 | `ai_companion_prototype.jsx` (231KB) | 参照用プロトタイプ。機能追加はしない |
| モジュール実装 | `src/` | 本番コード。こちらを編集する |

`src/` 以下が正規の実装。`ai_companion_prototype.jsx` は仕様参照用であり、通常の開発では**読まなくてよい**。

### `src/` モジュール構成と依存関係

```
src/
  main.jsx                   ← Reactエントリ、ルートコンポーネント
  constants/index.js         ← AI_ENGINES / THEMES / ACCENTS / INTERESTS 等の定数
  ai/
    engines.js               ← callAI() — Claude/OpenAI/Gemini/Llama への統一APIアダプター
    memory.js                ← 長期記憶 CRUD + 時間減衰スコアリング (calcCertainty)
    prompt.js                ← buildPrompt() — システムプロンプト組み立て
  safety/
    crisis-detection.js      ← 危機検知 (Layer 1〜4)
    crisis-detection.test.js ← 危機検知ユニットテスト
    encryption.js            ← AES-256-GCM + PBKDF2 エクスポート/インポート
  utils/
    logger.js                ← recordLog() — PII不含エラーログ
```

依存の向き: `prompt.js` → `memory.js` → `engines.js` → `logger.js` ← `engines.js`

### Vercel サーバーレス関数 (`api/`)

ホスト型利用者向けのサーバー側 AI プロキシ。ユーザー自身の API キーを持たない場合に使用。

| ファイル | エンドポイント | 概要 |
|--------|------------|------|
| `api/chat.js` | `POST /api/chat` | Claude / Gemini プロキシ。`HOST_FREE`（無料）と `SUPPORTER`（Stripe決済済み）の2ティア |
| `api/stripe-checkout.js` | `/api/stripe-checkout` | Stripe 決済セッション作成 |
| `api/stripe-webhook.js` | `/api/stripe-webhook` | Stripe Webhook処理 |
| `api/verify-session.js` | `/api/verify-session` | Stripe セッション検証 |

必要な環境変数: `GEMINI_API_KEY`, `CLAUDE_API_KEY`, `STRIPE_SECRET_KEY`

### データフロー

- **APIキー**: `sessionStorage` に保存（タブを閉じると自動消去）
- **会話・設定**: `localStorage` に AES-256-GCM（`src/safety/encryption.js`）で暗号化保存
- **長期記憶**: `aico_longTermMemory` キーに最大200件。`calcCertainty()` が会話数の経過（elapsed）に応じてスコアを 1.0→0.8→0.6→0.4 に減衰させる
- **エラーログ**: `aico_errorlog` キーに最大200件。会話内容・APIキー・個人情報は**絶対に含めない**

### 危機検知システム (`src/safety/crisis-detection.js`)

C-SSRS準拠の4層アーキテクチャ。`detectCrisisFull()` が L1+L2+L3 の最大値を返す統合関数。

| レイヤー | 関数 | 手法 | 実装状況 |
|---------|------|------|---------|
| L1 | `detectCrisis()` | 正規表現パターンマッチ | ✅ Phase 1 |
| L2 | `detectCognitiveDistortions()` | CBT認知の歪み5分類（Beck） | ✅ Phase 2 |
| L3 | `detectEmotionalState()` | DBT感情モデリング + Joiner対人理論 | ✅ Phase 2 |
| L4 | `detectLongitudinalChange()` | ウェルビーイングスコアの時系列トレンド | 部分実装 |

`CRISIS_PATTERNS` の正規表現を変更する場合は **C-SSRS文献への参照**が必要（README参照）。

### 会話モードと AI プロンプト生成

`buildPrompt()` (`src/ai/prompt.js`) が以下を合成してシステムプロンプトを返す:
- 安全原則（変更不可のロボット三原則）
- 会話モード指示（`CONV_MODES`: listen / friend / think / coach）
- ユーザープロフィール・興味・長期記憶（確実性ラベル付き）
- 危機モード(`CRISIS` / `WATCHFUL` / `NORMAL`)に応じた応答スタイル

`inferConvMode()` がユーザー発話テキストから自動的に会話モードを推定する。

## 重要な規約

### 安全機能への変更
- `CRISIS_PATTERNS` の追加・変更・削除は C-SSRS文献の根拠を PR に明記する
- `detectCrisisFull()` の判定ロジックを下げる方向の変更は慎重に行う
- Issue/PRには `[Safety]` プレフィックスを付け、緊急度を記載する

### エラーログ
`recordLog()` の `context` オブジェクトに会話テキスト・APIキー・ユーザー名・個人情報を**絶対に含めない**。`engines.js` の実装パターンを踏襲すること。

### テスト
`src/safety/crisis-detection.test.js` と `crisis-detection.test.js`（ルート）が存在する。`src/` 以下のモジュールを参照する方が正規。危機検知ロジックを変更したら対応テストも必ず更新する。

## トークン節約のための規約

- `ai_companion_prototype.jsx` は 231KB のモノリシックファイル。**読む前に `src/` を確認する**。対応するモジュールが `src/` にあれば `src/` を読む
- ファイル全体が不要なら `offset`/`limit` を使って必要な行だけ読む
- 定数の確認は `src/constants/index.js` 1ファイルで完結する
- API呼び出しの実装を確認するなら `src/ai/engines.js` のみ読めば足りる（`api/chat.js` はサーバー側プロキシで別物）
- 危機検知の実装は `src/safety/crisis-detection.js`、テストは同ディレクトリの `crisis-detection.test.js`（ルートの同名ファイルは旧版）
