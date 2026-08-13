import js from "@eslint/js";
import globals from "globals";

// Minimales ESLint-Setup für Vanilla-JS im Browser (kein Framework, siehe
// architecture.md). Bewusst schlank gehalten – reicht als Basis-Qualitätssicherung
// für die nachfolgenden Stories, ohne zusätzliches Tooling-Gewicht.
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
];
