// デスクトップアバター連携
// このPCで起動したアバターアプリ（AvatarSpeaker）に、AIの発言だけを送って読み上げてもらう。
//
// プライバシー方針:
//   - 送るのは AI の発言テキストとメッセージID・表情だけ。ユーザーの発言・プロフィール・長期記憶は送らない
//   - 送信先はローカル（127.0.0.1）のみ。外部サーバーには何も送らない
//   - 未接続のあいだの発言は溜めずに捨てる（あとから古い発言を読み上げない）。
//     ただし接続を試みている最中（ページを開いた直後など）に届いた発言だけは、つながった時点で送る
//   - recordLog() には何も記録しない（会話本文を含めない規約に合わせ、そもそもログを出さない）
//
// プロトコル（JSON テキスト）:
//   → {"type":"speak","id":"...","text":"...","emotion":"neutral"}   emotion は省略可
//   → {"type":"stop"}
//   ← {"type":"hello"} / {"type":"status","id":"...","state":"started|finished|stopped|error"}

export const AVATAR_BRIDGE_URL = "ws://127.0.0.1:50110";

export const AVATAR_STATUS = {
  OFF:         "off",
  CONNECTING:  "connecting",
  CONNECTED:   "connected",
  UNAVAILABLE: "unavailable", // アプリが起動していない等。自動で再接続を試み続ける
};

// 再接続の間隔（ms）。最後の値を上限として繰り返す
export const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

const WS_OPEN = 1;

/**
 * 危機モードでは明るい表情を出さない。それ以外は表情を指定せず、アバター側の既定に任せる。
 */
export function avatarEmotionForMode(mode) {
  return mode === "CRISIS" || mode === "WATCHFUL" ? "neutral" : null;
}

/**
 * msgs のうち seenIds に無いものを返し、seenIds に追加する（新しく増えたメッセージの検出）。
 */
export function takeNewMessages(seenIds, msgs) {
  const fresh = [];
  for (const m of msgs || []) {
    if (m == null || m.id == null || seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    fresh.push(m);
  }
  return fresh;
}

/**
 * 新しく増えたメッセージをアバターへの指示に変換する。
 * ユーザーが話したら、AI が読み上げ中でも止める（話をさえぎらない）。
 */
export function commandsForNewMessages(fresh) {
  const commands = [];
  for (const m of fresh) {
    if (m.role === "user") {
      commands.push({ type: "stop" });
    } else if (m.role === "ai" && typeof m.text === "string" && m.text.trim()) {
      const emotion = avatarEmotionForMode(m.mode);
      commands.push({ type: "speak", id: String(m.id), text: m.text, ...(emotion ? { emotion } : {}) });
    }
  }
  return commands;
}

/**
 * アバターアプリへの接続を作る。切断されたら自動で再接続する。
 */
export function createAvatarBridge({
  url = AVATAR_BRIDGE_URL,
  WebSocketImpl = globalThis.WebSocket,
  onStatusChange = () => {},
  reconnectDelaysMs = RECONNECT_DELAYS_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t),
} = {}) {
  let ws = null;
  let closed = false;
  let attempt = 0;
  let timer = null;
  let status = null;
  let connectingQueue = []; // CONNECTING のあいだだけ保持する

  const setStatus = (next) => {
    if (status === next) return;
    status = next;
    onStatusChange(next);
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = reconnectDelaysMs[Math.min(attempt, reconnectDelaysMs.length - 1)];
    attempt += 1;
    timer = setTimer(() => { timer = null; connect(); }, delay);
  };

  const connect = () => {
    if (closed) return;
    if (!WebSocketImpl) { setStatus(AVATAR_STATUS.UNAVAILABLE); return; }
    setStatus(AVATAR_STATUS.CONNECTING);
    let socket;
    try {
      socket = new WebSocketImpl(url);
    } catch {
      setStatus(AVATAR_STATUS.UNAVAILABLE);
      scheduleReconnect();
      return;
    }
    ws = socket;
    socket.onopen = () => {
      if (ws !== socket) return;
      attempt = 0;
      setStatus(AVATAR_STATUS.CONNECTED);
      const queued = connectingQueue;
      connectingQueue = [];
      queued.forEach(send);
    };
    socket.onclose = () => {
      if (ws !== socket) return;
      ws = null;
      connectingQueue = [];
      if (closed) return;
      setStatus(AVATAR_STATUS.UNAVAILABLE);
      scheduleReconnect();
    };
    // エラーの後には必ず close が来るので、ここでは何もしない
    socket.onerror = () => {};
  };

  const send = (payload) => {
    if (status === AVATAR_STATUS.CONNECTING) {
      connectingQueue.push(payload);
      return true;
    }
    if (!ws || ws.readyState !== WS_OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  };

  connect();

  return {
    get status() { return status; },
    send,
    speak: (id, text, emotion) => send({ type: "speak", id: String(id), text, ...(emotion ? { emotion } : {}) }),
    stop: () => send({ type: "stop" }),
    close: () => {
      closed = true;
      connectingQueue = [];
      if (timer != null) { clearTimer(timer); timer = null; }
      const socket = ws;
      ws = null;
      if (socket) { try { socket.close(); } catch { /* 既に閉じている */ } }
      setStatus(AVATAR_STATUS.OFF);
    },
  };
}
