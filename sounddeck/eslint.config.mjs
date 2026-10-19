// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsdoc from "eslint-plugin-jsdoc";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "dist-electron",
    "dist-plugins",
    "coverage",
    "node_modules",
    "website",
    "server/.wrangler",
    "server/node_modules",
  ]),

  // ─── React renderer (src/) ────────────────────────────────────────
  {
    files: ["src/**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // ─── Electron main process (Node.js, CommonJS) ────────────────────
  {
    files: ["electron/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ─── Electron tests (Node.js + Vitest) ────────────────────────────
  {
    files: ["electron/**/*.test.js", "electron/**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },

  // ─── Cloudflare Worker (server/src) ───────────────────────────────
  {
    files: ["server/src/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        console: "readonly",
        crypto: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Web base64 (available in Workers runtime)
        btoa: "readonly",
        atob: "readonly",
      },
    },
  },

  // ─── Soft rules (warnings instead of errors) ──────────────────────
  {
    files: ["electron/**/*.js", "server/src/**/*.js", "src/**/*.{js,jsx}"],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-assignment": "warn",
    },
  },

  // ─── JSDoc rules for Electron + Worker ────────────────────────────
  {
    files: ["electron/**/*.js", "server/src/**/*.js"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "warn",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
          },
        },
      ],
      "jsdoc/require-param": "warn",
      "jsdoc/require-returns": "warn",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": "error",
    },
  },
]);
