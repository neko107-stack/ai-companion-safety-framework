// デスクトップアバター連携のユニットテスト
import {
  AVATAR_STATUS,
  AVATAR_BRIDGE_URL,
  avatarEmotionForMode,
  takeNewMessages,
  commandsForNewMessages,
  createAvatarBridge,
} from "./avatar-bridge.js";

class FakeWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
  // テスト用の操作
  open() { this.readyState = 1; this.onopen?.(); }
  drop() { this.readyState = 3; this.onerror?.(); this.onclose?.(); }
}

// setTimeout を手動で進める簡易タイマー
function manualTimers() {
  const pending = [];
  return {
    setTimer: (fn, ms) => { const t = { fn, ms }; pending.push(t); return t; },
    clearTimer: (t) => { const i = pending.indexOf(t); if (i >= 0) pending.splice(i, 1); },
    runNext: () => { const t = pending.shift(); t?.fn(); return t?.ms; },
    get count() { return pending.length; },
  };
}

beforeEach(() => { FakeWebSocket.instances = []; });

describe("avatarEmotionForMode", () => {
  test("危機・見守りモードでは落ち着いた表情に固定する", () => {
    expect(avatarEmotionForMode("CRISIS")).toBe("neutral");
    expect(avatarEmotionForMode("WATCHFUL")).toBe("neutral");
  });
  test("通常モードでは表情を指定しない", () => {
    expect(avatarEmotionForMode("NORMAL")).toBeNull();
    expect(avatarEmotionForMode(undefined)).toBeNull();
  });
});

describe("takeNewMessages", () => {
  test("初めて見る id のメッセージだけを返し、既読に加える", () => {
    const seen = new Set([1]);
    const fresh = takeNewMessages(seen, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fresh.map(m => m.id)).toEqual([2, 3]);
    expect(takeNewMessages(seen, [{ id: 1 }, { id: 2 }, { id: 3 }])).toEqual([]);
  });
  test("id の無い要素は無視する", () => {
    expect(takeNewMessages(new Set(), [null, {}, { id: 0 }]).map(m => m.id)).toEqual([0]);
  });
});

describe("commandsForNewMessages", () => {
  test("AI の発言は speak、ユーザーの発言は stop になる", () => {
    const commands = commandsForNewMessages([
      { id: 10, role: "user", text: "こんにちは" },
      { id: 11, role: "ai", text: "やあ！", mode: "NORMAL" },
    ]);
    expect(commands).toEqual([
      { type: "stop" },
      { type: "speak", id: "11", text: "やあ！" },
    ]);
  });

  test("ユーザーの発言本文はアバターに送らない（プライバシー）", () => {
    const commands = commandsForNewMessages([{ id: 1, role: "user", text: "私の住所は東京都…" }]);
    expect(JSON.stringify(commands)).not.toContain("住所");
  });

  test("危機モードの AI 発言は neutral を付けて送る", () => {
    expect(commandsForNewMessages([{ id: 5, role: "ai", text: "そばにいるよ。", mode: "CRISIS" }]))
      .toEqual([{ type: "speak", id: "5", text: "そばにいるよ。", emotion: "neutral" }]);
  });

  test("空の発言は送らない", () => {
    expect(commandsForNewMessages([{ id: 1, role: "ai", text: "   " }])).toEqual([]);
  });
});

describe("createAvatarBridge", () => {
  test("ローカルのアバターアプリへ接続し、状態を通知する", () => {
    const statuses = [];
    const timers = manualTimers();
    createAvatarBridge({ WebSocketImpl: FakeWebSocket, onStatusChange: s => statuses.push(s), ...timers });
    expect(FakeWebSocket.instances[0].url).toBe(AVATAR_BRIDGE_URL);
    expect(AVATAR_BRIDGE_URL.startsWith("ws://127.0.0.1:")).toBe(true);
    FakeWebSocket.instances[0].open();
    expect(statuses).toEqual([AVATAR_STATUS.CONNECTING, AVATAR_STATUS.CONNECTED]);
  });

  test("接続中は speak / stop を JSON で送る", () => {
    const timers = manualTimers();
    const bridge = createAvatarBridge({ WebSocketImpl: FakeWebSocket, ...timers });
    const ws = FakeWebSocket.instances[0];
    ws.open();
    expect(bridge.speak(3, "こんにちは", "neutral")).toBe(true);
    expect(bridge.stop()).toBe(true);
    expect(ws.sent).toEqual([
      { type: "speak", id: "3", text: "こんにちは", emotion: "neutral" },
      { type: "stop" },
    ]);
  });

  test("接続を試みている最中の発言は、つながった時点で送る", () => {
    const timers = manualTimers();
    const bridge = createAvatarBridge({ WebSocketImpl: FakeWebSocket, ...timers });
    expect(bridge.speak(1, "おかえり")).toBe(true);
    FakeWebSocket.instances[0].open();
    expect(FakeWebSocket.instances[0].sent).toEqual([{ type: "speak", id: "1", text: "おかえり" }]);
  });

  test("アプリが見つからないあいだの発言は溜めずに捨てる", () => {
    const timers = manualTimers();
    const bridge = createAvatarBridge({ WebSocketImpl: FakeWebSocket, ...timers });
    bridge.speak(1, "接続試行中に届いた発言");
    FakeWebSocket.instances[0].drop();           // 接続失敗 → UNAVAILABLE（試行中の発言も破棄）
    expect(bridge.speak(2, "見つからないあいだの発言")).toBe(false);
    timers.runNext();                             // 再接続
    FakeWebSocket.instances[1].open();
    expect(FakeWebSocket.instances[1].sent).toEqual([]);
  });

  test("切断されたら間隔を広げながら再接続し、つながったら間隔を戻す", () => {
    const statuses = [];
    const timers = manualTimers();
    createAvatarBridge({
      WebSocketImpl: FakeWebSocket, onStatusChange: s => statuses.push(s),
      reconnectDelaysMs: [100, 200], ...timers,
    });
    FakeWebSocket.instances[0].drop();
    expect(statuses.at(-1)).toBe(AVATAR_STATUS.UNAVAILABLE);
    expect(timers.runNext()).toBe(100);
    FakeWebSocket.instances[1].drop();
    expect(timers.runNext()).toBe(200);
    FakeWebSocket.instances[2].drop();
    expect(timers.runNext()).toBe(200); // 上限で頭打ち
    FakeWebSocket.instances[3].open();
    expect(statuses.at(-1)).toBe(AVATAR_STATUS.CONNECTED);
    FakeWebSocket.instances[3].drop();
    expect(timers.runNext()).toBe(100); // 成功後はリセット
  });

  test("close 後は再接続しない", () => {
    const statuses = [];
    const timers = manualTimers();
    const bridge = createAvatarBridge({ WebSocketImpl: FakeWebSocket, onStatusChange: s => statuses.push(s), ...timers });
    FakeWebSocket.instances[0].drop();
    expect(timers.count).toBe(1);
    bridge.close();
    expect(timers.count).toBe(0);
    expect(statuses.at(-1)).toBe(AVATAR_STATUS.OFF);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  test("WebSocket が使えない環境では UNAVAILABLE になる", () => {
    const statuses = [];
    createAvatarBridge({ WebSocketImpl: null, onStatusChange: s => statuses.push(s), ...manualTimers() });
    expect(statuses).toEqual([AVATAR_STATUS.UNAVAILABLE]);
  });
});
