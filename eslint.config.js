// ESLint 9 flat config
// 対象は src/ 配下の正規モジュール。ai_companion_prototype.jsx は
// 二重実装の解消（PROJECT_REVIEW.md §4.2）が完了するまで対象外。
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX の React import は Vite の automatic runtime で不要
      "react/react-in-jsx-scope": "off",
      // 既存コードは catch {} で握りつぶすパターンを多用する（設計上の判断）
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
  {
    files: ["src/**/*.test.js", "jest.setup.crypto.cjs"],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
  },
  {
    files: ["api/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "ai_companion_prototype.jsx"],
  },
];
