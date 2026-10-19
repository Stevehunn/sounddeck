/**
 * @file System-level IPC handlers for the Electron main process.
 *
 * Two separate domains live in this module:
 *
 * 1. **Emoji scraping** (`fetch-emojis`) — fetches getemoji.com, parses
 *    the HTML, and returns the emoji list for a given category. Emojis
 *    are cached in-memory for 1 hour to avoid hammering the site.
 *
 * 2. **System + confirm + tray handlers**:
 *    - Open external URLs / quit / hide / show window
 *    - System language + keyboard layout detection (azerty vs qwerty)
 *    - `fetch-myinstants`: scrape myinstants.com for sounds
 *    - `confirm-quit`: user answered the close-to-tray dialog
 *    - Tray language updates (via a global callback registered by `main.js`)
 *
 * All network handlers route errors through `normalizeNetworkError()` so
 * the renderer always gets a stable code (`NETWORK_ERROR` /
 * `NETWORK_TIMEOUT`) instead of a cryptic Node errno string.
 *
 * @see ./networkUtils.js — `normalizeNetworkError` used by every network
 *      path in this file.
 * @see ../preload.js — exposes these channels to the renderer as
 *      `electronAPI.fetchMyinstants`, `.fetchEmojis`, `.openExternal`, …
 * @see ./trayManager.js — consumer of the `update-tray-language` channel
 *      (via the `registerTrayUpdateHandler` callback).
 */

const { ipcMain, shell } = require("electron");
const https = require("https");
const store = require("../store");

const { normalizeNetworkError } = require("./networkUtils");

// ─── EMOJI SCRAPING (getemoji.com) ──────────────────────────────────────

/**
 * URL of the emoji catalog used for scraping.
 * @type {string}
 */
const EMOJI_SOURCE_URL = "https://getemoji.com/";

/**
 * How long a category's emoji list stays cached, in milliseconds.
 * @type {number}
 */
const EMOJI_CACHE_TTL = 60 * 60 * 1000; // 1h

/**
 * In-memory cache: `categoryId -> { emojis: string[], fetchedAt: number }`.
 * Cleared by `__resetEmojiCache()` (used by tests).
 * @type {Map<string, { emojis: string[], fetchedAt: number }>}
 */
const emojiCache = new Map();

/**
 * Maps our internal category IDs to the section titles used on
 * getemoji.com. Matched case-insensitively by substring against the
 * `<h2>` text of each `<section>` on the page.
 *
 * ⚠️ These strings are **functional values** (they must match the
 * actual site HTML) — do **not** translate them.
 *
 * `people` intentionally spans 3 sections because getemoji.com splits
 * humans across them.
 *
 * @type {Record<string, string[]>}
 */
const EMOJI_SECTION_MATCHERS = {
  smileys: ["Smileys"],
  people: [
    "Gestures and Body Parts",
    "People and Fantasy",
    "Clothing and Accessories",
  ],
  animals: ["Animals & Nature"],
  food: ["Food & Drink"],
  travel: ["Travel & Places"],
  activities: ["Activity and Sports"],
  objects: ["Objects"],
  symbols: ["Symbols"],
  flags: ["Flags"],
};

/**
 * Fetches a URL and returns its HTML body.
 *
 * Follows up to 5 redirects, uses a desktop `User-Agent` (getemoji.com
 * throttles bare clients), and aborts after 15 s of no response.
 *
 * On any failure (timeout, network error, non-200 status, too many
 * redirects), the promise **resolves** (never rejects) with
 * `{ ok: false, error, isNetworkError, html: "" }` — this makes the
 * call site cleaner and lets it forward a structured error to the
 * renderer.
 *
 * @param {string} url - The URL to fetch.
 * @param {number} [redirectCount=0] - Loop guard (internal).
 * @returns {Promise<{
 *   ok: true,
 *   html: string
 * } | {
 *   ok: false,
 *   error: string,
 *   isNetworkError: boolean,
 *   html: ""
 * }>} Success object with HTML, or failure object with error code.
 */
function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) {
      resolve({
        ok: false,
        error: "Trop de redirections",
        isNetworkError: false,
        html: "",
      });
      return;
    }
    const timeout = setTimeout(
      () =>
        resolve({
          ok: false,
          error: "NETWORK_TIMEOUT",
          isNetworkError: true,
          html: "",
        }),
      15000,
    );

    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
        (res) => {
          clearTimeout(timeout);
          if (
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location
          ) {
            const next = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            fetchHtml(next, redirectCount + 1).then(resolve);
            return;
          }
          if (res.statusCode !== 200) {
            resolve({
              ok: false,
              error: `HTTP ${res.statusCode}`,
              isNetworkError: false,
              html: "",
            });
            return;
          }
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ ok: true, html: data }));
        },
      )
      .on("error", (e) => {
        clearTimeout(timeout);
        const normalized = normalizeNetworkError(e);
        resolve({
          ok: false,
          error: normalized || e.message,
          isNetworkError: !!normalized,
          html: "",
        });
      });
  });
}

/**
 * Parses emoji characters out of getemoji.com's HTML for a given
 * category ID.
 *
 * The page is a flat list of `<section>` blocks, each with a `<h2>`
 * title followed by `<div class="emoji emoji-button">😀</div>` items.
 * We match the section title against `EMOJI_SECTION_MATCHERS[categoryId]`
 * (case-insensitive substring) and collect every emoji div inside it.
 *
 * Emoji are deduplicated **across** all matched sections (e.g. `people`
 * matches 3 sections) via a single `Set`. No artificial limit — the
 * whole category is returned.
 *
 * @param {string} html - Full HTML of getemoji.com.
 * @param {string} categoryId - One of the keys of `EMOJI_SECTION_MATCHERS`.
 * @returns {string[]} Array of emoji characters (may be empty if the
 *   category ID is unknown or the site HTML changed).
 */
function parseEmojisFromHtml(html, categoryId) {
  if (!html || !categoryId) return [];

  const matchers = EMOJI_SECTION_MATCHERS[categoryId] || [];
  if (matchers.length === 0) return [];

  // Single global Set: deduplicated AND accumulated across all matched
  // sections (e.g. `people` spans 3 sections on getemoji.com).
  const globalSeen = new Set();
  const allEmojis = [];

  const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/g;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const sectionHtml = sectionMatch[1];

    // Extract the title from the h2
    let title = null;
    const titleWithLink = sectionHtml.match(
      /<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/h2>/,
    );
    if (titleWithLink) {
      title = titleWithLink[1];
    } else {
      const titleDirect = sectionHtml.match(/<h2[^>]*>([^<]+)<\/h2>/);
      if (titleDirect) title = titleDirect[1];
    }
    if (!title) continue;

    // Decode HTML entities
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ")
      .trim();

    const tl = title.toLowerCase();
    const isTarget = matchers.some((m) => {
      const ml = m.toLowerCase();
      return tl === ml || tl.includes(ml);
    });
    if (!isTarget) continue;

    // Extract the emojis from this section and accumulate
    const emojiRegex = /<div class="emoji emoji-button">([^<]+)<\/div>/g;
    let emojiMatch;

    while ((emojiMatch = emojiRegex.exec(sectionHtml)) !== null) {
      const emoji = emojiMatch[1].trim();
      if (emoji && !globalSeen.has(emoji)) {
        globalSeen.add(emoji);
        allEmojis.push(emoji);
      }
    }
    // No early return — keep scanning other sections to accumulate them.
  }

  return allEmojis;
}

// ─── SYSTEM HANDLERS ────────────────────────────────────────────────────

/**
 * Registers every system-level IPC handler.
 *
 * Must be called once, during app startup (see `electron/main.js`).
 *
 * Channels registered:
 *
 * **External / window**
 * - `open-external`              `(url) -> void`
 * - `quit-app`                   `() -> true`
 * - `hide-window`                `() -> true`
 * - `show-window`                `() -> true`
 *
 * **System info**
 * - `update-tray-language`       `(lang) -> true`
 * - `get-system-language`        `() -> 'fr' | 'en' | 'es'` (fallback `'fr'`)
 * - `get-system-keyboard-layout` `() -> 'azerty' | 'qwerty'`
 *
 * **Network scraping**
 * - `fetch-myinstants`           `(query, mode, lang) -> { success, sounds?, error?, isNetworkError? }`
 * - `fetch-emojis`               `(categoryId) -> { success, emojis, error?, isNetworkError?, fromCache? }`
 *
 * All handlers are idempotent w.r.t. their registration (`fetch-*` are
 * guarded by `ipcMain.eventNames().includes(...)` so re-running this
 * function in tests / dev doesn't throw `"Attempted to register a
 * second handler"`).
 *
 * @returns {void}
 */
function registerSystemHandlers() {
  if (!ipcMain) {
    console.error("❌ [ipcHandlers] ipcMain is undefined!");
    return;
  }

  // Open an external URL in the user's default browser.
  ipcMain.handle("open-external", (event, url) => {
    shell.openExternal(url);
  });

  // Quit the app immediately (bypasses the close-to-tray flow).
  ipcMain.handle("quit-app", () => {
    const { app } = require("electron");
    app.quit();
    return true;
  });

  // Hide the main window (used by the tray "close to tray" flow).
  ipcMain.handle("hide-window", () => {
    const { getMainWindow } = require("./windowManager");
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.hide();
    }
    return true;
  });

  // Show and focus the main window.
  ipcMain.handle("show-window", () => {
    const { showMainWindow } = require("./windowManager");
    showMainWindow();
    return true;
  });

  // Forward a language change to the tray menu (callback set by main.js).
  ipcMain.handle("update-tray-language", (event, lang) => {
    if (global.__updateTrayCallback) {
      global.__updateTrayCallback(lang);
    }
    return true;
  });

  // Detect the OS locale and map it to a supported app language.
  ipcMain.handle("get-system-language", () => {
    try {
      const { app } = require("electron");
      const locale = app.getLocale();
      const lang = locale.split("-")[0];
      const supported = ["fr", "en", "es"];
      return supported.includes(lang) ? lang : "fr";
    } catch (e) {
      console.warn("⚠️ Erreur détection langue:", e);
      return "fr";
    }
  });

  // Detect whether the system keyboard is AZERTY (fr / be / ch) or QWERTY.
  // Windows: registry check first, then locale fallback.
  ipcMain.handle("get-system-keyboard-layout", () => {
    if (process.platform === "win32") {
      try {
        const { execSync } = require("child_process");
        try {
          const result = execSync(
            'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Keyboard Layout\\DosKeybCodes" /v "0000040c" 2>nul || echo NOT_FOUND',
            { encoding: "utf8", timeout: 3000 },
          );
          if (result.includes("0000040c")) {
            return "azerty";
          }
        } catch {
          // Registry lookup failed — fall through to locale check
        }

        try {
          const locale = require("electron").app.getLocale();
          const azertyLocales = ["fr", "fr-FR", "fr-BE", "fr-CH"];
          if (azertyLocales.some((l) => locale.startsWith(l))) {
            return "azerty";
          }
        } catch {
          // Locale detection failed — fall through to qwerty
        }

        return "qwerty";
      } catch (e) {
        console.warn("⚠️ Erreur détection clavier:", e);
        return "qwerty";
      }
    }
    return "qwerty";
  });

  // ─── MYINSTANTS HANDLER ─────────────────────────────────────────────
  // Idempotency guard: skip if already registered (safe to re-run).
  if (!ipcMain.eventNames().includes("fetch-myinstants")) {
    ipcMain.handle(
      "fetch-myinstants",
      async (event, query, mode = "search", lang = "fr") => {
        try {
          const { LANGUAGES } = require("../i18n");
          const langData =
            LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
          const country = langData.country || "fr";

          const TRENDING_URLS = {
            fr: "https://www.myinstants.com/fr/index/fr/",
            us: "https://www.myinstants.com/fr/index/us/",
            es: "https://www.myinstants.com/fr/index/es/",
          };

          /**
           * Fetches a page and returns `{ ok, html }` (or an error
           * object with `isNetworkError`). 15 s timeout, follows 3xx
           * redirects.
           *
           * @param {string} url
           * @returns {Promise<{ok: true, html: string, status: number} | {ok: false, error: string, isNetworkError: boolean, html: ""}>}
           */
          const fetchPage = (url) => {
            return new Promise((resolve) => {
              const timeout = setTimeout(() => {
                resolve({
                  ok: false,
                  error: "NETWORK_TIMEOUT",
                  isNetworkError: true,
                  html: "",
                });
              }, 15000);

              https
                .get(
                  url,
                  {
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
                      Accept: "text/html,application/xhtml+xml",
                      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                    },
                  },
                  (res) => {
                    clearTimeout(timeout);
                    if (
                      [301, 302, 303, 307].includes(res.statusCode) &&
                      res.headers.location
                    ) {
                      fetchPage(res.headers.location).then(resolve);
                      return;
                    }
                    let data = "";
                    res.on("data", (chunk) => (data += chunk));
                    res.on("end", () =>
                      resolve({ ok: true, html: data, status: res.statusCode }),
                    );
                  },
                )
                .on("error", (e) => {
                  clearTimeout(timeout);
                  const normalized = normalizeNetworkError(e);
                  resolve({
                    ok: false,
                    error: normalized || e.message,
                    isNetworkError: !!normalized,
                    html: "",
                  });
                });
            });
          };

          /**
           * Extracts the list of sounds from a myinstants HTML page.
           * Returns at most 40 items, each with `{ id, name, slug, url, emoji }`.
           * The `url` is picked from the inline `play('media/sounds/...')`
           * calls when present (best-effort — some entries stay `null`
           * and are resolved lazily by the caller).
           *
           * @param {string} html
           * @returns {Array<{id: string, name: string, slug: string, url: string|null, emoji: string}>}
           */
          const parseSoundList = (html) => {
            const sounds = [];
            const seen = new Set();

            const patterns = [
              /href="https?:\/\/(?:www\.)?myinstants\.com\/(?:fr\/)?instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
              /href="\/fr\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
              /href="\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
            ];

            const slugToName = {};
            const allSlugs = [];

            for (const pattern of patterns) {
              const matches = [...html.matchAll(pattern)];
              for (const m of matches) {
                const slug = m[1];
                const name = m[2]?.trim();
                if (
                  slug &&
                  !seen.has(slug) &&
                  slug.length > 0 &&
                  slug.length < 80
                ) {
                  const ignore = [
                    "favorites",
                    "recent",
                    "trending",
                    "search",
                    "categories",
                    "new",
                    "profile",
                    "settings",
                    "uploaded",
                    "best_of_all_time",
                    "report",
                    "add",
                    "embed",
                  ];
                  if (ignore.some((i) => slug.includes(i))) continue;
                  seen.add(slug);
                  allSlugs.push(slug);
                  if (
                    name &&
                    name.length > 0 &&
                    !name.startsWith("!") &&
                    !name.includes("svg")
                  ) {
                    slugToName[slug] = name;
                  }
                }
              }
            }

            const soundUrlRegex = /play\('(media\/sounds\/[^']+)'\)/g;
            const directUrls = [...html.matchAll(soundUrlRegex)].map(
              (m) => `https://www.myinstants.com/${m[1]}`,
            );

            /**
             * Picks an emoji based on keywords in the sound name.
             * @param {string} name
             * @returns {string}
             */
            const getEmojiForName = (name) => {
              const n = name.toLowerCase();
              if (n.includes("boom") || n.includes("explo")) return "💥";
              if (n.includes("sad") || n.includes("trombone")) return "🎺";
              if (n.includes("air") || n.includes("horn")) return "📣";
              if (
                n.includes("laugh") ||
                n.includes("lol") ||
                n.includes("bruh")
              )
                return "😂";
              if (n.includes("win") || n.includes("yes") || n.includes("epic"))
                return "🏆";
              if (n.includes("oof") || n.includes("rip") || n.includes("fail"))
                return "😬";
              if (
                n.includes("scream") ||
                n.includes("aah") ||
                n.includes("wtf")
              )
                return "😱";
              if (n.includes("bell") || n.includes("ding")) return "🔔";
              if (n.includes("drum") || n.includes("ba dum")) return "🥁";
              if (n.includes("cat") || n.includes("meow")) return "🐱";
              if (n.includes("noot") || n.includes("penguin")) return "🐧";
              return "🔊";
            };

            for (let i = 0; i < Math.min(allSlugs.length, 40); i++) {
              const slug = allSlugs[i];
              const rawName =
                slugToName[slug] ||
                slug.replace(/-\d+$/, "").replace(/-/g, " ");
              const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
              const url = directUrls[i] || null;

              sounds.push({
                id: `mi_${slug}_${Date.now()}`,
                name,
                slug,
                url,
                emoji: getEmojiForName(name),
              });
            }

            return sounds;
          };

          let sounds = [];

          if (mode === "multi") {
            const terms = query
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            let lastNetworkError = null;
            for (const term of terms.slice(0, 4)) {
              const r = await fetchPage(
                `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(term)}`,
              );
              if (r.ok) {
                const found = parseSoundList(r.html);
                sounds.push(...found);
              } else if (r.isNetworkError) {
                lastNetworkError = r.error;
              }
              await new Promise((r) => setTimeout(r, 200));
            }
            const seen = new Set();
            sounds = sounds.filter((s) => {
              if (seen.has(s.slug)) return false;
              seen.add(s.slug);
              return true;
            });

            if (!sounds.length && lastNetworkError) {
              return {
                success: false,
                error: lastNetworkError,
                isNetworkError: true,
                sounds: [],
              };
            }
          } else if (mode === "local") {
            let url = query;
            if (!url.startsWith("http")) {
              url = TRENDING_URLS[country] || TRENDING_URLS["fr"];
            }
            const result = await fetchPage(url);
            if (!result.ok)
              return {
                success: false,
                error: result.error,
                isNetworkError: result.isNetworkError,
                sounds: [],
              };
            sounds = parseSoundList(result.html);
          } else {
            let url;
            if (mode === "trending") {
              url = TRENDING_URLS[country] || TRENDING_URLS["fr"];
            } else if (mode === "category") {
              url = `https://www.myinstants.com/fr/categories/${encodeURIComponent(query)}/`;
            } else {
              const q = query && query.trim() ? query : "meme";
              url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(q)}`;
            }

            const result = await fetchPage(url);
            if (!result.ok)
              return {
                success: false,
                error: result.error,
                isNetworkError: result.isNetworkError,
                sounds: [],
              };
            sounds = parseSoundList(result.html);
          }

          if (!sounds.length) {
            return { success: false, error: "Aucun son trouvé", sounds: [] };
          }

          // Resolve direct audio URLs for sounds that don't have one yet
          // (by fetching each instant page). Batched by 3 for politeness.
          const needsResolve = sounds.filter((s) => !s.url && s.slug);
          if (needsResolve.length > 0) {
            const toResolve = needsResolve.slice(0, 20);
            for (let i = 0; i < toResolve.length; i += 3) {
              const batch = toResolve.slice(i, i + 3);
              await Promise.all(
                batch.map(async (sound) => {
                  const url = `https://www.myinstants.com/fr/instant/${sound.slug}/`;
                  const result = await fetchPage(url);
                  if (result.ok) {
                    const ogAudio = result.html.match(
                      /meta-og:audio:\s*(https?:\/\/[^\s\n]+)/,
                    );
                    if (ogAudio) {
                      sound.url = ogAudio[0].trim();
                    } else {
                      const audioMatch = result.html.match(
                        /href="(\/media\/sounds\/[^"]+\.mp3)"/,
                      );
                      if (audioMatch) {
                        sound.url = `https://www.myinstants.com${audioMatch[1]}`;
                      }
                    }
                  }
                }),
              );
              if (i + 3 < toResolve.length) {
                await new Promise((r) => setTimeout(r, 300));
              }
            }
          }

          sounds = sounds.filter((s) => s.url);

          return { success: true, sounds };
        } catch (e) {
          console.error("❌ fetch-myinstants error:", e.message);
          const normalized = normalizeNetworkError(e);
          return {
            success: false,
            error: normalized || e.message,
            isNetworkError: !!normalized,
            sounds: [],
          };
        }
      },
    );
  }

  // ─── EMOJIS HANDLER ─────────────────────────────────────────────────
  // Idempotency guard: skip if already registered (safe to re-run).
  if (!ipcMain.eventNames().includes("fetch-emojis")) {
    ipcMain.handle("fetch-emojis", async (event, categoryId) => {
      try {
        if (!categoryId) {
          return { success: false, error: "Catégorie manquante", emojis: [] };
        }

        // Cache hit → serve from memory
        const cached = emojiCache.get(categoryId);
        if (cached && Date.now() - cached.fetchedAt < EMOJI_CACHE_TTL) {
          return { success: true, emojis: cached.emojis, fromCache: true };
        }

        const { ok, html, error, isNetworkError } =
          await fetchHtml(EMOJI_SOURCE_URL);
        if (!ok) {
          console.error("❌ [fetch-emojis] Fetch error:", error);
          return {
            success: false,
            error,
            isNetworkError: !!isNetworkError,
            emojis: [],
          };
        }

        const emojis = parseEmojisFromHtml(html, categoryId);

        if (emojis.length === 0) {
          console.warn(
            `⚠️ [fetch-emojis] No emoji found for "${categoryId}". Site HTML may have changed.`,
          );
          return {
            success: false,
            error: "Aucun emoji trouvé dans cette catégorie",
            emojis: [],
          };
        }

        emojiCache.set(categoryId, { emojis, fetchedAt: Date.now() });
        return { success: true, emojis };
      } catch (e) {
        console.error("❌ [fetch-emojis] Exception:", e.message);
        const normalized = normalizeNetworkError(e);
        return {
          success: false,
          error: normalized || e.message,
          isNetworkError: !!normalized,
          emojis: [],
        };
      }
    });
  }
}

// ─── CONFIRM HANDLERS ───────────────────────────────────────────────────

/**
 * Registers the quit-confirmation handler.
 *
 * Called once, during app startup, with the shared `windowManager` module
 * so we can toggle its quitting / pendingQuit flags.
 *
 * Channel registered:
 * - `confirm-quit` `(action, remember) -> 'quit' | 'minimize' | 'cancel'`
 *
 * Behavior:
 * - `action: 'quit'` → mark `isQuitting` + `pendingQuit`, then `app.quit()`
 * - `action: 'minimize'` → hide the window, notify the renderer to close
 *   the confirm dialog, then optionally persist `closeToTray: true`
 * - anything else → `'cancel'` (no state change)
 *
 * @param {{
 *   setQuitting: (v: boolean) => void,
 *   setPendingQuit: (v: boolean) => void,
 *   getMainWindow: () => import('electron').BrowserWindow | null
 * }} windowManager - The `./windowManager` module (injected so tests can
 *   pass a mock).
 * @returns {void}
 */
function registerConfirmHandlers(windowManager) {
  if (!ipcMain) {
    console.error("❌ [ipcHandlers] ipcMain is undefined!");
    return;
  }

  ipcMain.handle("confirm-quit", (event, action, remember) => {
    if (action === "quit") {
      if (remember) {
        store.set("closeToTray", false);
      }
      windowManager.setQuitting(true);
      windowManager.setPendingQuit(true);
      require("electron").app.quit();
      return "quit";
    } else if (action === "minimize") {
      if (remember) {
        store.set("closeToTray", true);
      }

      const mainWindow = windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send("hide-quit-confirm");
        setTimeout(() => {
          mainWindow.hide();
        }, 500);
      }
      return "minimize";
    } else {
      return "cancel";
    }
  });
}

// ─── TRAY UPDATE CALLBACK ───────────────────────────────────────────────

/**
 * Stores the callback used by the `update-tray-language` IPC channel.
 *
 * The `update-tray-language` handler itself is registered in
 * `registerSystemHandlers()`, but it needs a reference to the tray
 * menu rebuilder (`updateTrayMenu` in `main.js`) to actually do its job.
 * `main.js` calls this once at startup to wire them together.
 *
 * Kept on `global.__updateTrayCallback` (not a module-level variable)
 * so that tests can reset it via `delete globalThis.__updateTrayCallback`.
 *
 * @param {(lang: string) => void} callback - Receives the new language
 *   code (`'fr' | 'en' | 'es'`) and rebuilds the tray menu.
 * @returns {void}
 */
function registerTrayUpdateHandler(callback) {
  global.__updateTrayCallback = callback;
}

module.exports = {
  registerSystemHandlers,
  registerConfirmHandlers,
  registerTrayUpdateHandler,
  __resetEmojiCache: () => emojiCache.clear(),
};