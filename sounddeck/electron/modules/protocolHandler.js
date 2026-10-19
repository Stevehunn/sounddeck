/**
 * @file Custom `sounddeck-local://` protocol for streaming local files
 * to the renderer.
 *
 * The renderer (React) needs to play audio files stored in
 * `<userData>/sounds/` and display images stored in `<userData>/images/`.
 * With `nodeIntegration: false` + `contextIsolation: true`, the renderer
 * has **no direct `fs` access** — the standard `file://` protocol is also
 * blocked by CSP for security reasons.
 *
 * This module solves both problems by:
 *
 * 1. Registering a **privileged custom protocol** (`sounddeck-local`)
 *    *before* `app.whenReady()` — see `registerLocalSchemes()`.
 * 2. Installing a **request handler** *after* `app.whenReady()` —
 *    see `registerLocalFileProtocol()`.
 *
 * The handler:
 * - Rejects requests outside `<userData>/sounds`, `<userData>/images`,
 *   `<userData>/plugins`, `<userData>/exports`, `<userData>`, or
 *   `resourcesPath/` (path traversal guard)
 * - Serves full files with `200 OK` + `Content-Length`
 * - Serves byte-range requests with `206 Partial Content` (required
 *   for `<audio>`/`<audio>` seeking)
 * - Uses `Cache-Control: no-store` so the browser doesn't cache a
 *   partial read and think it has the full file
 *
 * URL format: `sounddeck-local://file/<url-encoded-absolute-path>`
 * (e.g. `sounddeck-local://file/%2FUsers%2F...%2Fkick.mp3`)
 *
 * @see ../main.js — `registerLocalSchemes()` before `whenReady()`,
 *      `registerLocalFileProtocol()` after
 * @see ../../src/shared/utils/fileUrl.js — `buildFileUrl()` builds these URLs
 */

const { protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");

// ─── MIME TYPES ─────────────────────────────────────────────────────────

/**
 * Extension → MIME type map. Only the extensions that SoundDeck actually
 * serves are listed (audio, images, plus a few plugin assets).
 *
 * Unknown extensions fall back to `application/octet-stream`.
 *
 * @type {Record<string, string>}
 */
const MIME_MAP = {
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".weba": "audio/webm",
  ".webm": "audio/webm",
  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  // Plugin assets (JS / CSS / HTML / JSON)
  ".json": "application/json",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
};

/**
 * Returns the MIME type for a file path based on its extension.
 *
 * @param {string} filePath - Absolute path (used only for its extension).
 * @returns {string} A MIME type string, or `'application/octet-stream'`
 *   for unknown extensions.
 */
function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

/**
 * Converts a Node.js `Readable` stream into a Web `ReadableStream`.
 *
 * Required because `Response` (the global exposed by Electron's fetch
 * API in the main process) expects a Web stream, not a Node one.
 *
 * @param {import('stream').Readable} nodeStream
 * @returns {ReadableStream}
 */
function nodeStreamToWeb(nodeStream) {
  return Readable.toWeb(nodeStream);
}

// ─── SCHEME REGISTRATION (before app.whenReady()) ───────────────────────

/**
 * Registers the `sounddeck-local` scheme as **privileged**.
 *
 * This must be called **before** `app.whenReady()` (see `main.js`), and
 * only once. Without it, the custom protocol would be treated as an
 * opaque string (no `fetch`, no `<audio>`, no `<img>` support).
 *
 * Privileges enabled:
 * - `standard` — behaves like `http`/`file`, supports origin
 * - `secure` — not treated as "mixed content" by the browser
 * - `supportFetchAPI` — `fetch()` works from the renderer
 * - `corsEnabled` — `<audio crossOrigin>` works
 * - `stream` — required for `<audio>` seeking + `Response` streaming
 *
 * @returns {void}
 */
function registerLocalSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "sounddeck-local",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: false,
      },
    },
  ]);
}

// ─── PATH VALIDATION ────────────────────────────────────────────────────

/**
 * Returns the list of directories the custom protocol is allowed to
 * serve files from.
 *
 * Every path is normalized and lowercased for consistent prefix matching
 * on Windows (where the filesystem is case-insensitive).
 *
 * @returns {string[]} Absolute, normalized, lowercased directory paths.
 */
function getAllowedRoots() {
  const { app } = require("electron");
  const userData = app.getPath("userData");
  const resourcesPath = process.resourcesPath || "";

  const roots = [
    path.join(userData, "sounds"),
    path.join(userData, "images"),
    path.join(userData, "plugins"),
    path.join(userData, "exports"),
    userData,
  ];

  if (resourcesPath) {
    roots.push(resourcesPath);
  }

  return roots.map((r) => path.normalize(r).toLowerCase());
}

/**
 * Returns whether a given file path is inside one of the allowed roots.
 *
 * Guards:
 * - Any `..` in the path is rejected outright (path traversal)
 * - The path must start with `<root>` or `<root>/`
 *
 * @param {string} filePath - Decoded absolute path.
 * @returns {boolean} `true` if the path is safe to serve.
 */
function isPathAllowed(filePath) {
  const normalized = path.normalize(filePath).toLowerCase();
  const roots = getAllowedRoots();

  // Reject path traversal attempts (e.g. `../../../Windows`)
  if (normalized.includes("..")) return false;

  return roots.some((root) => {
    if (normalized === root) return true;
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    return normalized.startsWith(rootWithSep);
  });
}

// ─── REQUEST HANDLER (after app.whenReady()) ────────────────────────────

/**
 * Installs the request handler for the `sounddeck-local://` scheme.
 *
 * Must be called **after** `app.whenReady()`. Registers exactly one
 * `protocol.handle("sounddeck-local", …)` callback that:
 *
 * 1. Validates the URL:
 *    - Hostname must be `file` (else `400 Invalid hostname`)
 *    - Path must be non-empty (else `400 Missing path`)
 * 2. Decodes the path and validates it against `isPathAllowed()`:
 *    - Rejects escapes (else `403 Forbidden`)
 * 3. Checks the file exists (else `404 Not found`)
 * 4. Reads `Range` header if present:
 *    - Valid range → `206 Partial Content` + `Content-Range`
 *    - Range beyond EOF → `416 Range Not Satisfiable`
 *    - Malformed → falls through to full-response
 * 5. Serves the full file → `200 OK` + `Content-Length`
 *
 * Response headers in every successful case:
 * - `Content-Type` — from `getMime()`
 * - `Accept-Ranges: bytes` — advertises range support
 * - `Access-Control-Allow-Origin: *`
 * - `Cache-Control: no-store` — prevents the browser from thinking a
 *   partial read is the whole file
 *
 * @returns {void}
 */
function registerLocalFileProtocol() {
  protocol.handle("sounddeck-local", async (request) => {
    try {
      const url = new URL(request.url);

      // The hostname must be `file`
      if (url.hostname !== "file") {
        return new Response("Invalid hostname", { status: 400 });
      }

      // Strip the leading `/` from pathname
      const encodedPath = url.pathname.slice(1);
      if (!encodedPath) {
        return new Response("Missing path", { status: 400 });
      }

      const filePath = decodeURIComponent(encodedPath);

      // Security: is the path inside an allowed root?
      if (!isPathAllowed(filePath)) {
        console.warn(`🚫 [protocol] Accès refusé : ${filePath}`);
        return new Response("Forbidden", { status: 403 });
      }

      // File exists?
      if (!fs.existsSync(filePath)) {
        return new Response("Not found", { status: 404 });
      }

      // Stat to get the file size
      const stat = await fs.promises.stat(filePath);
      const mime = getMime(filePath);

      // Read the Range header (used by <audio> for seeking)
      const rangeHeader = request.headers.get("Range");

      // ─── Case 1: Range request (seek) ──────────────────────────
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

        if (match) {
          const startStr = match[1];
          const endStr = match[2];

          let start = startStr ? parseInt(startStr, 10) : 0;
          let end = endStr ? parseInt(endStr, 10) : stat.size - 1;

          if (isNaN(start)) start = 0;
          if (isNaN(end) || end >= stat.size) end = stat.size - 1;

          if (start >= stat.size || start > end) {
            return new Response(null, {
              status: 416,
              headers: {
                "Content-Range": `bytes */${stat.size}`,
                "Accept-Ranges": "bytes",
              },
            });
          }

          const chunkSize = end - start + 1;
          const nodeStream = fs.createReadStream(filePath, { start, end });

          return new Response(nodeStreamToWeb(nodeStream), {
            status: 206,
            headers: {
              "Content-Type": mime,
              "Content-Length": String(chunkSize),
              "Content-Range": `bytes ${start}-${end}/${stat.size}`,
              "Accept-Ranges": "bytes",
              "Access-Control-Allow-Origin": "*",
              // No aggressive cache: otherwise the browser thinks it
              // has the full file and stops requesting ranges.
              "Cache-Control": "no-store",
            },
          });
        }
      }

      // ─── Case 2: Full file request ─────────────────────────────
      const nodeStream = fs.createReadStream(filePath);

      return new Response(nodeStreamToWeb(nodeStream), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Length": String(stat.size),
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": "*",
          // Same rationale as above: prevents the browser from caching
          // a partial read as if it were the whole file.
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("❌ [protocol] Erreur handler:", e);
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  });
}

// ─── EXPORTS ────────────────────────────────────────────────────────────

module.exports = {
  registerLocalSchemes,
  registerLocalFileProtocol,
};
