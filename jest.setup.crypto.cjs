// Jest(jsdom) は既定で crypto.subtle（Web Crypto）や TextEncoder 等を
// グローバルに公開しないため、Node 標準実装で polyfill して
// エクスポート/インポートのラウンドトリップをテスト可能にする。
const { webcrypto } = require("crypto");
const { TextEncoder, TextDecoder } = require("util");

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
if (typeof globalThis.TextEncoder === "undefined") globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === "undefined") globalThis.TextDecoder = TextDecoder;
if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (s) => Buffer.from(s, "binary").toString("base64");
}
if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
}
