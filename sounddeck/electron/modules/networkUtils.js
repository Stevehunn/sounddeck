/**
 * @file Network utilities for the Electron main process.
 *
 * Two responsibilities:
 *
 * 1. **Error normalization** — turn flaky Node errors (DNS, sockets,
 *    timeouts, HTTP client libs, …) into a small set of stable codes
 *    (`'NETWORK_ERROR'` / `'NETWORK_TIMEOUT'`) so the UI can show a
 *    meaningful toast instead of a cryptic `getaddrinfo ENOTFOUND`.
 *    Used by `fileHandlers.js` and `ipcHandlers.js` in every network
 *    path (MyInstants, yt-dlp, URL download, thumbnails, …).
 *
 * 2. **Connectivity check** — `checkNetwork()`, a lightweight HEAD
 *    request to a known endpoint, used by the renderer's
 *    `NetworkContext` (via IPC) to hide online-only features when the
 *    machine is offline.
 *
 * @see ../../src/shared/contexts/NetworkContext.jsx (consumer of checkNetwork)
 * @see ./fileHandlers.js (consumer of normalizeNetworkError)
 * @see ./ipcHandlers.js  (consumer of normalizeNetworkError)
 */

const https = require("https");

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK ERROR DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate a genuine network error (DNS resolution,
 * socket reset, unreachable host, …).
 *
 * Matched **case-insensitively** as substrings against the error message.
 *
 * ⚠️ Order matters: this list is checked **before** `NETWORK_TIMEOUT_PATTERNS`
 * in `normalizeNetworkError()`, because:
 *   - `ETIMEDOUT` is both an errno **and** contains "timeout" as a substring
 *   - `ERR_SOCKET_CONNECTION_TIMEOUT` similarly contains "timeout"
 *
 * Both must be classified as `NETWORK_ERROR` (not `NETWORK_TIMEOUT`).
 *
 * @type {readonly string[]}
 */
const NETWORK_ERROR_PATTERNS = [
  // ── errno codes ────────────────────────────────────────────────────
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENETDOWN",
  "ERR_SOCKET_CONNECTION_TIMEOUT",
  // ── textual patterns (libc / Node / undici / curl) ────────────────
  "getaddrinfo",
  "Failed to resolve",
  "network is unreachable",
  "no such host",
  "Temporary failure in name resolution",
  "Name or service not known",
  "Could not resolve host",
];

/**
 * Patterns that indicate a timeout error.
 *
 * Checked **after** `NETWORK_ERROR_PATTERNS` so that errors like
 * `ETIMEDOUT` (which contain "timeout") are still classified as
 * `NETWORK_ERROR`.
 *
 * @type {readonly string[]}
 */
const NETWORK_TIMEOUT_PATTERNS = ["timeout", "timed out", "NETWORK_TIMEOUT"];

/**
 * Extracts a usable error message from common error-like inputs.
 *
 * Accepts:
 * - a **string** → returned as-is
 * - an **Error** (or anything with a string `message`) → `.message`
 * - anything else → `null`
 *
 * Numbers, `{ message: 42 }`, `{ code: 'X' }` without `.message`, etc.
 * all fall through to `null` — we do **not** stringify arbitrary values,
 * because `String({ code: 'ENOTFOUND' })` would be `"[object Object]"`
 * and produce false positives.
 *
 * @param {unknown} error
 * @returns {string | null}
 */
function extractErrorMessage(error) {
  if (error == null) return null;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    typeof (/** @type {{ message?: unknown }} */ (error).message) === "string"
  ) {
    return /** @type {{ message: string }} */ (error).message;
  }
  return null;
}

/**
 * Normalizes a network-ish error into a stable error code.
 *
 * Return values:
 * - `'NETWORK_ERROR'`   — DNS, connection refused, unreachable host, …
 * - `'NETWORK_TIMEOUT'` — timeout / timed out / connection timeout, …
 * - `null`              — anything else (or no usable message)
 *
 * Matching is **case-insensitive substring** matching against the
 * extracted error message.
 *
 * @param {unknown} error
 * @returns {'NETWORK_ERROR' | 'NETWORK_TIMEOUT' | null}
 */
function normalizeNetworkError(error) {
  const message = extractErrorMessage(error);
  if (!message) return null;

  const lower = message.toLowerCase();

  // 1. Check network-error patterns FIRST (so ETIMEDOUT wins over "timeout")
  for (const pattern of NETWORK_ERROR_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return "NETWORK_ERROR";
    }
  }

  // 2. Then check timeout patterns
  for (const pattern of NETWORK_TIMEOUT_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return "NETWORK_TIMEOUT";
    }
  }

  return null;
}

/**
 * Returns `true` if the given error looks like a network-related error.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isNetworkError(error) {
  return normalizeNetworkError(error) !== null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTIVITY CHECK
// ═══════════════════════════════════════════════════════════════════════════

/** Public endpoint used to test connectivity (returns 204 on HEAD). */
const CHECK_URL = "https://www.google.com/generate_204";

/** Timeout for the connectivity check, in milliseconds. */
const CHECK_TIMEOUT_MS = 3000;

/**
 * Checks whether the machine currently has internet access.
 *
 * Performs a HEAD request to a reliable endpoint. Any response (even 404)
 * means we're online. Network error or timeout means we're offline.
 *
 * @returns {Promise<boolean>} `true` if online, `false` otherwise.
 */
function checkNetwork() {
  return new Promise((resolve) => {
    const req = https.request(
      CHECK_URL,
      { method: "HEAD", timeout: CHECK_TIMEOUT_MS },
      () => {
        // Any HTTP response (2xx, 3xx, 4xx) = we can reach the network
        resolve(true);
      },
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

module.exports = {
  // ── error detection ────────────────────────────────────────────────
  NETWORK_ERROR_PATTERNS,
  NETWORK_TIMEOUT_PATTERNS,
  normalizeNetworkError,
  isNetworkError,
  // ── connectivity check ─────────────────────────────────────────────
  checkNetwork,
};
