// Claude Messages API の応答から返答テキストを取り出す（ブラウザ側 engines.js とサーバー側 api/chat.js で共用）
//
// Claude Opus 5 / Opus 5.5 / Sonnet 5 / Fable 5・5.1 / Mythos は、thinking を指定しなくても
// 思考（adaptive thinking）が既定でオンになり、content の先頭に thinking ブロックが入る。
// そのため content[0].text ではなく、type === "text" のブロックをすべて連結して読む。
// 思考の token も max_tokens に含まれるので、これらのモデルでは上限と effort を調整する。

// thinking が既定でオンのモデル（ID の接頭辞で判定。日付付き ID にも一致する）
export function thinksByDefault(model) {
  return /^claude-(opus-5|sonnet-5|fable-|mythos-)/.test(model || "");
}

// 通常の会話リクエストに足すパラメータ。
// 既定で考えるモデルは、会話の返答には深い思考が要らないので effort を low にし、
// 思考で上限を使い切って返答が空にならないよう max_tokens を広げる。
export function claudeChatParams(model, baseMaxTokens = 1000) {
  if (!thinksByDefault(model)) return { max_tokens: baseMaxTokens };
  return { max_tokens: Math.max(baseMaxTokens, 4000), output_config: { effort: "low" } };
}

// type === "text" のブロックだけを順に連結する
export function extractClaudeText(d) {
  return (d?.content || [])
    .filter(b => b && b.type === "text" && typeof b.text === "string")
    .map(b => b.text)
    .join("");
}

// 返答テキストが得られなかった理由を、利用者に見せる文言にする
export function claudeEmptyReason(d) {
  if (d?.stop_reason === "refusal") return "AIがこの内容への返答を控えました。言い方を変えて、もう一度話しかけてみてね。";
  if (d?.stop_reason === "max_tokens") return "返答をまとめきれずに途中で止まりました。もう一度送ってみてね。";
  return "レスポンスの形式が不正です";
}
