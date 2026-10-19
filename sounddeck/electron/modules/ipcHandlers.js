// electron/modules/ipcHandlers.js
const { ipcMain, shell } = require("electron");
const https = require("https");
const store = require("../store");

const { normalizeNetworkError } = require("./networkUtils");

// ─── EMOJI SCRAPING (getemoji.com) ──────────────────────────────────────────

const EMOJI_SOURCE_URL = "https://getemoji.com/";
const EMOJI_CACHE_TTL = 60 * 60 * 1000; // 1h
const emojiCache = new Map();

// Mapping categoryId → titres de section sur getemoji.com
// Basé sur la structure réelle du site (vérifié 2024)
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
 * Parse le HTML de getemoji.com pour extraire les emojis d'une section.
 * ✅ V2 : cumule TOUTES les sections qui matchent (ex: "people" = 3 sections)
 * ✅ V2 : pas de limite hardcodée à 200
 * @param html
 * @param categoryId
 */
function parseEmojisFromHtml(html, categoryId) {
  if (!html || !categoryId) return [];

  const matchers = EMOJI_SECTION_MATCHERS[categoryId] || [];
  if (matchers.length === 0) return [];

  // ✅ Set global : dédupliqué ET cumulé sur toutes les sections matchées
  const globalSeen = new Set();
  const allEmojis = [];

  const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/g;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const sectionHtml = sectionMatch[1];

    // Cherche le titre dans le h2
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

    // Décode les entités HTML
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

    // Extrait les emojis de cette section et cumule
    const emojiRegex = /<div class="emoji emoji-button">([^<]+)<\/div>/g;
    let emojiMatch;

    while ((emojiMatch = emojiRegex.exec(sectionHtml)) !== null) {
      const emoji = emojiMatch[1].trim();
      if (emoji && !globalSeen.has(emoji)) {
        globalSeen.add(emoji);
        allEmojis.push(emoji);
      }
    }
    // ✅ PAS de return ici — on continue pour cumuler les autres sections
  }

  // ✅ Pas de slice(0, 200) — on laisse tout passer
  return allEmojis;
}

// ─── HANDLERS SYSTÈME ────────────────────────────────────────────────────────

/**
 *
 */
function registerSystemHandlers() {
  if (!ipcMain) {
    console.error("❌ [ipcHandlers] ipcMain est undefined !");
    return;
  }

  // Open external URL
  ipcMain.handle("open-external", (event, url) => {
    shell.openExternal(url);
  });

  // Quit app
  ipcMain.handle("quit-app", () => {
    const { app } = require("electron");
    app.quit();
    return true;
  });

  // Hide window
  ipcMain.handle("hide-window", () => {
    const { getMainWindow } = require("./windowManager");
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.hide();
    }
    return true;
  });

  // Show window
  ipcMain.handle("show-window", () => {
    const { showMainWindow } = require("./windowManager");
    showMainWindow();
    return true;
  });

  // Update tray language
  ipcMain.handle("update-tray-language", (event, lang) => {
    if (global.__updateTrayCallback) {
      global.__updateTrayCallback(lang);
    }
    return true;
  });

  // Get system language
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

  // Get system keyboard layout
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
        } catch (e) {}

        try {
          const locale = require("electron").app.getLocale();
          const azertyLocales = ["fr", "fr-FR", "fr-BE", "fr-CH"];
          if (azertyLocales.some((l) => locale.startsWith(l))) {
            return "azerty";
          }
        } catch (e) {}

        return "qwerty";
      } catch (e) {
        console.warn("⚠️ Erreur détection clavier:", e);
        return "qwerty";
      }
    }
    return "qwerty";
  });

  // ─── HANDLER MYINSTANTS ──────────────────────────────────────────────────
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

  // ─── HANDLER EMOJIS ──────────────────────────────────────────────────────
  if (!ipcMain.eventNames().includes("fetch-emojis")) {
    ipcMain.handle("fetch-emojis", async (event, categoryId) => {
      try {
        if (!categoryId) {
          return { success: false, error: "Catégorie manquante", emojis: [] };
        }

        // Cache
        const cached = emojiCache.get(categoryId);
        if (cached && Date.now() - cached.fetchedAt < EMOJI_CACHE_TTL) {
          return { success: true, emojis: cached.emojis, fromCache: true };
        }

        const { ok, html, error, isNetworkError } =
          await fetchHtml(EMOJI_SOURCE_URL);
        if (!ok) {
          console.error("❌ [fetch-emojis] Erreur fetch:", error);
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
            `⚠️ [fetch-emojis] Aucun emoji trouvé pour "${categoryId}". Le HTML du site a peut-être changé.`,
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

// ─── HANDLERS CONFIRMATION ──────────────────────────────────────────────────

/**
 *
 * @param windowManager
 */
function registerConfirmHandlers(windowManager) {
  if (!ipcMain) {
    console.error("❌ [ipcHandlers] ipcMain est undefined !");
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

// ─── REGISTRE POUR LE CALLBACK DE MISE À JOUR DU TRAY ─────────────────────

/**
 *
 * @param callback
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
