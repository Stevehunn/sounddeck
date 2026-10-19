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
    rules: {
      // ── React 19 strict rules downgraded to warn ────────────────
      // These rules didn't exist when the codebase was written. They're
      // legitimate in principle but enforcing them as errors would force
      // a massive refactor of components that are otherwise fine.
      // Existing/new code should still avoid them; fix incrementally.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },

  // ─── Vitest tests (src/) ─────────────────────────────────────────
  {
    files: [
      "src/**/*.test.{js,jsx}",
      "src/**/*.spec.{js,jsx}",
      "src/test/**/*.{js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node, // ← ADD THIS: `global`, `process`, `__dirname`, `require`, `Buffer`
        ...globals.browser,
        // Vitest globals
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
    rules: {
      "react-refresh/only-export-components": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      // Tests: unused imports / args are noise. They never cause bugs
      // in prod (the code isn't shipped), and enforcing them means
      // patching 20+ files just to prefix mock args with `_`.
      "no-unused-vars": "off",
    },
  },

  // ─── Node-side test setup (setup-electron.js) ────────────────────
  // Runs in Node ESM, but touches `window` and `File` for mocks.
  {
    files: ["src/test/setup-electron.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
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

  // ─── Electron preload (Node + browser context bridge) ─────────────
  // preload.js / preload-popup.js run in a browser-like context but
  // still `require('electron')`.
  {
    files: ["electron/preload*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // ─── Electron tests (Node.js + Vitest) ────────────────────────────
  {
    files: ["electron/**/*.test.js", "electron/**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
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
