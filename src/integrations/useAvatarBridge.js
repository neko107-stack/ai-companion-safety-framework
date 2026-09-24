// デスクトップアバター連携の React フック
// enabled の間だけアバターアプリへ接続し、msgs に新しく増えた AI の発言を送る。
// 有効にした時点ですでにある発言（過去の履歴）は読み上げない。
import { useEffect, useRef, useState } from "react";
import { AVATAR_STATUS, createAvatarBridge, takeNewMessages, commandsForNewMessages } from "./avatar-bridge.js";

export function useAvatarBridge(msgs, enabled) {
  const [status, setStatus] = useState(AVATAR_STATUS.OFF);
  const bridgeRef = useRef(null);
  const seenRef = useRef(new Set());
  const msgsRef = useRef(msgs);

  // 接続開始時に「既存の履歴」を知るための最新 msgs。下の effect より先に宣言して先に反映させる
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  useEffect(() => {
    if (!enabled) return undefined;
    seenRef.current = new Set((msgsRef.current || []).map(m => m?.id).filter(id => id != null));
    const bridge = createAvatarBridge({ onStatusChange: setStatus });
    bridgeRef.current = bridge;
    return () => {
      bridge.close();
      bridgeRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    // 未接続でも「見た」扱いにする（再接続後に古い発言をまとめて読み上げない）
    for (const command of commandsForNewMessages(takeNewMessages(seenRef.current, msgs))) {
      bridge.send(command);
    }
  }, [msgs]);

  return enabled ? status : AVATAR_STATUS.OFF;
}
