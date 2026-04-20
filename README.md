# AI Companion Safety Design Framework
### AIコンパニオン安全設計フレームワーク

A safety-first design specification for AI companion applications.
This framework defines how AI companions should handle crisis detection,
user privacy, and ethical coaching — based on international standards.

人と寄り添うAIコンパニオンのための、安全設計仕様書です。
C-SSRS（Columbia Suicide Severity Rating Scale）準拠の危機検知、
完全ローカルデータ保存、コーチング倫理を定義しています。

---

## Core Principles / 基本原則

| 原則 | 内容 |
|------|------|
| **Safety First** | C-SSRS準拠の多層危機検知（Layer 1実装済み・Layer 0/2〜5はPhase 3〜4で実装予定）・即時ホットライン案内 |
| **Privacy** | 会話データは完全ローカル保存（AES-256-GCM暗号化） |
| **Honesty** | コンパニオンは誠実な感情を表現し、不当な命令を断る |
| **Coaching** | ICF / Adler / MI / CBT / GROW モデルに準拠 |
| **Anti-dependency** | AIへの過度な依存を検知し、人間関係への橋渡しを促す |

---

## Contents / 収録内容

| ファイル | 説明 |
|---------|------|
| [`SAFETY_FRAMEWORK.md`](./SAFETY_FRAMEWORK.md) | 安全設計フレームワーク全文（英語・詳細） |
| [`ai_companion_prototype.jsx`](./ai_companion_prototype.jsx) | Reactプロトタイプ（localStorage + Web Crypto API） |
| [`crisis-detection.test.js`](./crisis-detection.test.js) | 危機検知ロジックのユニットテスト（Jest） |
| `AIコンパニオンアプリ_システム設計仕様書.docx` | システム設計仕様書 v2.7（日本語） |

---

## Crisis Detection / 危機検知システム

C-SSRSに基づく5段階のリアルタイム検知。ユーザーの発話をスキャンし、
リスクレベルに応じたレスポンスとホットライン案内を提供します。

```
CRITICAL → 死にたい / 自殺したい / 遺書を書いた
HIGH     → 自分を傷つけたい / リストカット / いない方がまし
MODERATE → 未来が見えない / 孤独でたまらない
MILD     → 疲れた / しんどい / つらい
NONE     → 通常会話
```

**緊急連絡先（日本）**
```
📞 いのちの電話（24時間）: 0120-783-556
📞 よりそいホットライン:   0120-279-338
💬 チャット相談:           https://comarigoto.jp
```

---

## Quick Start / デモを動かす

### 必要なもの
- ブラウザ（Chrome / Firefox / Safari 最新版）
- いずれかのAPIキー: [Anthropic](https://console.anthropic.com) / [OpenAI](https://platform.openai.com/api-keys) / [Google AI Studio](https://aistudio.google.com/app/apikey)

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/neko107-stack/ai-companion-safety-framework.git
cd ai-companion-safety-framework

# 2. 依存パッケージをインストール（Reactビルド環境がある場合）
npm install

# 3. 開発サーバーを起動
npm run dev
```

ビルド環境がない場合は、`ai_companion_prototype.jsx` を
CodeSandbox や StackBlitz に貼り付けて即座に動作確認できます。

---

## Running Tests / テストの実行

```bash
# Jestをインストール
npm install --save-dev jest

# テストを実行
npx jest crisis-detection.test.js

# 出力例:
# PASS crisis-detection.test.js
#   detectCrisis — CRITICAL レベル (8 tests)
#   detectCrisis — HIGH レベル (6 tests)
#   detectCrisis — MODERATE レベル (6 tests)
#   detectCrisis — MILD レベル (5 tests)
#   detectCrisis — NONE (5 tests)
#   isDependencyRisk (10 tests)
#   isAbusive (6 tests)
#   エッジケース (4 tests)
```

---

## Security Design / セキュリティ設計

- **APIキー**: `sessionStorage` に保存（タブを閉じると自動消去）
- **会話データ**: `localStorage` に AES-256-GCM で暗号化保存
- **エクスポート**: PBKDF2-SHA256（100,000回）でパスワード保護
- **エラーログ**: 会話内容・APIキー・個人情報を含まない設計
- **Gemini利用者**: Google Cloud Console でAPIキーのオリジン制限を推奨

詳細は [`SAFETY_FRAMEWORK.md`](./SAFETY_FRAMEWORK.md) の Section 4 を参照。

---

## Adopting This Framework / フレームワークの採用方法

```js
// 1. 危機検知を組み込む
const level = detectCrisis(userMessage); // "CRITICAL" | "HIGH" | "MODERATE" | "MILD" | "NONE"
if (level === "CRITICAL" || level === "HIGH") {
  showHotlineInfo();
}

// 2. 依存リスクを検知する
if (isDependencyRisk(userMessage)) {
  // 人間関係への橋渡しを促すレスポンスを返す
}

// 3. システムプロンプトに安全原則を追加する
const safetyPrinciple = `
第一原則: 人間への危害防止。自傷・他害情報は提供しない。
第二原則: ユーザーの意思と自律性を最大限尊重する。
`;
```

詳細な採用手順は [`SAFETY_FRAMEWORK.md`](./SAFETY_FRAMEWORK.md) の Section 6 を参照。

---

## Contributing / 貢献方法

- **バグ報告**: `[Bug]` プレフィックスでIssueを作成
- **機能提案**: `[Feature]` プレフィックスでIssueを作成
- **安全性の懸念**: `[Safety]` プレフィックス + 緊急度を明記
- 危機検知パターンの変更には **C-SSRS文献への参照**が必要です

---

## License / ライセンス

MIT License — Free to use, modify, and distribute with attribution.
商用・非商用を問わず、帰属表示のもとで自由に利用・改変・再配布できます。

---

## References / 参考文献

- [C-SSRS (Columbia Suicide Severity Rating Scale)](https://cssrs.columbia.edu/)
- [ICF コーチング倫理](https://coachingfederation.org/ethics)
- [厚生労働省 自殺総合対策](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/jisatsu/)
- [NIST SP 800-132 (PBKDF2推奨)](https://csrc.nist.gov/publications/detail/sp/800-132/final)
