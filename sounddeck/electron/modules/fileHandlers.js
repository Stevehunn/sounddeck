/**
 * @file File-related IPC handlers for the Electron main process.
 *
 * Responsibilities:
 * - Native file / folder dialogs (open, save, directory picker)
 * - Import (copy) audio and image files into the userData directories
 * - Export / import backups (JSON config, full ZIP, sounds-only ZIP,
 *   individual profiles)
 * - Download files from URLs (Google Drive, Dropbox, OneDrive, direct)
 * - Trim audio files via ffmpeg
 * - YouTube / yt-dlp integration (check binary, download binary,
 *   fetch video info, download audio)
 * - Spotify / SoundCloud metadata stubs
 * - Audio format conversion (ffmpeg)
 * - Virtual audio driver (VB-Cable) install / uninstall / status
 * - Audio file write/read utilities (raw ArrayBuffer + base64)
 *
 * Every channel is registered via `ipcMain.handle()`, meaning it's
 * exposed to the renderer as a Promise-returning function (see
 * `electron/preload.js` for the 1:1 mapping of channel → method name).
 *
 * Binary discovery (`findFFmpeg` / `findYtDlp`) works in dev AND in
 * production builds: after `electron-builder` repacks the app into
 * `app.asar`, the code checks `app.asar.unpacked/` (thanks to
 * `asarUnpack` in `package.json`) and falls back to the system PATH.
 *
 * @see ./networkUtils.js — `normalizeNetworkError` used by every
 *      network path (MyInstants, yt-dlp, URL download, thumbnails).
 * @see ../preload.js — exposes these channels to the renderer.
 * @see ../../src/features/... — renderer-side consumers.
 */

const { ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const store = require("../store");
const { normalizeNetworkError } = require("./networkUtils");

// ─── BINARY DISCOVERY ────────────────────────────────────────────────────

/**
 * Locates a usable ffmpeg binary.
 *
 * Resolution order (first hit wins):
 *
 * 1. `@ffmpeg-installer/ffmpeg` — the bundled installer package
 * 2. `ffmpeg-static` — the alternative static build
 * 3. Manual `resourcesPath/app.asar.unpacked/...` fallbacks
 * 4. System `ffmpeg` on the PATH (via `execSync`)
 *
 * The `.replace('app.asar', 'app.asar.unpacked')` step is required in
 * packaged builds because `require()` returns a path *inside* the asar
 * archive, which can't be executed by `child_process`.
 *
 * @returns {string|null} Absolute path to the binary, or `null` if none
 *   was found. Callers must handle `null` (usually by skipping
 *   transcoding and copying the source file as-is).
 */
function findFFmpeg() {
  const { app } = require("electron");
  const isDev = !app?.isPackaged;

  // 1. @ffmpeg-installer/ffmpeg
  try {
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    if (ffmpegInstaller && ffmpegInstaller.path) {
      // In packaged builds, electron-builder rewrites the path to point
      // inside app.asar.unpacked when the package is in asarUnpack.
      const p = ffmpegInstaller.path.replace("app.asar", "app.asar.unpacked");
      if (fs.existsSync(p)) {
        if (isDev) console.log("✅ [findFFmpeg] @ffmpeg-installer →", p);
        return p;
      } else {
        console.warn("⚠️ [findFFmpeg] @ffmpeg-installer path introuvable:", p);
      }
    }
  } catch {
    if (isDev) console.log("ℹ️ [findFFmpeg] @ffmpeg-installer indisponible");
  }

  // 2. ffmpeg-static
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic) {
      const p = String(ffmpegStatic).replace("app.asar", "app.asar.unpacked");
      if (fs.existsSync(p)) {
        if (isDev) console.log("✅ [findFFmpeg] ffmpeg-static →", p);
        return p;
      } else {
        console.warn("⚠️ [findFFmpeg] ffmpeg-static path introuvable:", p);
      }
    }
  } catch {
    if (isDev) console.log("ℹ️ [findFFmpeg] ffmpeg-static indisponible");
  }

  // 3. Manual resourcesPath fallbacks (last-resort for weird layouts)
  try {
    const candidates = [
      path.join(
        process.resourcesPath || "",
        "app.asar.unpacked",
        "node_modules",
        "ffmpeg-static",
        "ffmpeg.exe",
      ),
      path.join(
        process.resourcesPath || "",
        "app.asar.unpacked",
        "node_modules",
        "ffmpeg-static",
        "ffmpeg",
      ),
      path.join(process.resourcesPath || "", "ffmpeg.exe"),
      path.join(process.resourcesPath || "", "ffmpeg"),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        console.log("✅ [findFFmpeg] resourcesPath fallback →", c);
        return c;
      }
    }
  } catch {
    // Ignore — fallback to PATH below
  }

  // 4. System ffmpeg on PATH
  try {
    const { execSync } = require("child_process");
    execSync("ffmpeg -version", { stdio: "ignore" });
    if (isDev) console.log("✅ [findFFmpeg] ffmpeg système (PATH)");
    return "ffmpeg";
  } catch {
    // Ignore — no ffmpeg anywhere
  }

  console.error("❌ [findFFmpeg] ffmpeg introuvable (dev + prod)");
  return null;
}

/**
 * Locates a usable yt-dlp binary.
 *
 * Resolution order:
 *
 * 1. `<userData>/yt-dlp.exe` (downloaded once via `downloadYtDlp()`)
 * 2. System `yt-dlp` on the PATH
 * 3. `yt-dlp.exe` sitting next to the Electron app's entry point
 *
 * Windows-only in practice, but the code path is platform-agnostic
 * (a Linux user with `yt-dlp` in `/usr/local/bin` will hit case 2).
 *
 * @returns {string|null} Path (or `'yt-dlp'` for PATH hits), or `null`
 *   if no binary is available.
 */
function findYtDlp() {
  try {
    const { app } = require("electron");
    const userDataPath = app.getPath("userData");

    // 1. Downloaded copy in userData
    const ytdlpPath = path.join(userDataPath, "yt-dlp.exe");
    if (fs.existsSync(ytdlpPath)) {
      return ytdlpPath;
    }

    // 2. System PATH
    try {
      const { execSync } = require("child_process");
      execSync("yt-dlp --version", { stdio: "ignore" });
      return "yt-dlp";
    } catch {
      // Not on PATH
    }

    // 3. Next to the Electron binary
    const appPath = app.getAppPath();
    const ytdlpAppPath = path.join(path.dirname(appPath), "yt-dlp.exe");
    if (fs.existsSync(ytdlpAppPath)) {
      return ytdlpAppPath;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── NETWORK HELPERS ─────────────────────────────────────────────────────

/**
 * Downloads a file from an HTTPS URL to the local filesystem, following
 * HTTP redirects (up to 10 hops).
 *
 * Behavior:
 * - Sends a desktop-like `User-Agent` (GitHub sometimes throttles bare
 *   clients)
 * - Aborts after 30s without a response, or 60s without data flowing
 * - Rejects empty / truncated files (< 1000 bytes) to catch redirect
 *   HTML pages that silently pass the 200 status check
 * - Deletes the partial file on any error / timeout
 *
 * Used for:
 * - Downloading yt-dlp itself (always https://github.com/...)
 * - Downloading user-supplied URLs (though `download-sound-url` uses
 *   its own redirect-aware logic, which supports http:// too)
 *
 * @param {string} url - The HTTPS URL to download.
 * @param {string} outputPath - Absolute path where the file will be written.
 * @returns {Promise<{success: true, path: string}>} Resolves on success.
 * @throws {Error} On HTTP error, network error, timeout, or if the file
 *   ends up smaller than 1000 bytes. The error is decorated with
 *   `err.isNetworkError = true|false` so callers can distinguish
 *   offline failures from "file invalid" failures.
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/octet-stream, */*",
      },
    };

    /**
     * Recursive GET with redirect following.
     *
     * @param {string} currentUrl
     * @param {number} [redirectCount=0]
     * @returns {void}
     */
    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        const err = new Error("Trop de redirections");
        err.isNetworkError = false;
        reject(err);
        return;
      }

      const req = https.get(currentUrl, options, (response) => {
        // Handle redirects (301/302/307/308)
        if (
          response.statusCode === 302 ||
          response.statusCode === 301 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl, redirectCount + 1);
            return;
          }
        }

        if (response.statusCode !== 200) {
          const err = new Error(`HTTP ${response.statusCode}`);
          err.isNetworkError = false;
          reject(err);
          return;
        }

        const fileStream = fs.createWriteStream(outputPath);
        let downloadedBytes = 0;

        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
        });

        // Belt-and-suspenders: if the stream stalls for 60s, abort.
        const timeoutId = setTimeout(() => {
          fileStream.close();
          fs.unlink(outputPath, () => {});
          const err = new Error("NETWORK_TIMEOUT");
          err.isNetworkError = true;
          reject(err);
        }, 60000);

        fileStream.on("finish", () => {
          clearTimeout(timeoutId);
          // Under 1000 bytes is almost certainly an HTML error page
          if (downloadedBytes < 1000) {
            fs.unlink(outputPath, () => {});
            const err = new Error("Fichier trop petit");
            err.isNetworkError = false;
            reject(err);
            return;
          }
          resolve({ success: true, path: outputPath });
        });

        fileStream.on("error", (e) => {
          clearTimeout(timeoutId);
          fs.unlink(outputPath, () => {});
          reject(e);
        });

        response.pipe(fileStream);
      });

      req.on("error", (e) => {
        const normalized = normalizeNetworkError(e);
        if (normalized) {
          const err = new Error(normalized);
          err.isNetworkError = true;
          reject(err);
        } else {
          reject(e);
        }
      });

      // 30s without any response bytes = timeout
      req.setTimeout(30000, () => {
        req.destroy();
        const err = new Error("NETWORK_TIMEOUT");
        err.isNetworkError = true;
        reject(err);
      });
    };

    request(url);
  });
}

/**
 * Downloads the latest yt-dlp Windows binary into `<userData>/yt-dlp.exe`.
 *
 * If a cached binary already exists, it's validated by running
 * `yt-dlp --version` — if that fails (corrupted / outdated executable),
 * the file is deleted and re-downloaded.
 *
 * Download is attempted against 3 URLs in order (latest release, then
 * two older pinned versions as fallbacks). The first one that produces
 * a working binary wins.
 *
 * @returns {Promise<{
 *   success: boolean,
 *   path?: string,
 *   error?: string,
 *   isNetworkError?: boolean
 * }>} `success: true` on success with `path` set.
 */
async function downloadYtDlp() {
  try {
    const { app } = require("electron");
    const userDataPath = app.getPath("userData");
    const ytdlpPath = path.join(userDataPath, "yt-dlp.exe");

    // Re-use cached binary if it still works
    if (fs.existsSync(ytdlpPath)) {
      try {
        const { execFile } = require("child_process");
        await new Promise((resolve, reject) => {
          execFile(ytdlpPath, ["--version"], { timeout: 5000 }, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        return { success: true, path: ytdlpPath };
      } catch {
        try {
          fs.unlinkSync(ytdlpPath);
        } catch {
          /* noop */
        }
      }
    }

    const urls = [
      "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
      "https://github.com/yt-dlp/yt-dlp/releases/download/2023.11.16/yt-dlp.exe",
      "https://github.com/yt-dlp/yt-dlp/releases/download/2023.10.13/yt-dlp.exe",
    ];

    let lastError = null;
    let lastNetworkError = false;

    for (const url of urls) {
      try {
        await downloadFile(url, ytdlpPath);

        // Validate the downloaded binary
        try {
          const { execFile } = require("child_process");
          await new Promise((resolve, reject) => {
            execFile(ytdlpPath, ["--version"], { timeout: 5000 }, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
          return { success: true, path: ytdlpPath };
        } catch {
          try {
            fs.unlinkSync(ytdlpPath);
          } catch {
            /* noop */
          }
          continue;
        }
      } catch (e) {
        lastError = e.message;
        if (e.isNetworkError) lastNetworkError = true;
      }
    }

    return {
      success: false,
      error: lastError || "Échec de tous les téléchargements",
      isNetworkError: lastNetworkError,
    };
  } catch (e) {
    console.error("❌ [download-ytdlp] Erreur:", e.message);
    const netErr = normalizeNetworkError(e);
    return {
      success: false,
      error: netErr || e.message,
      isNetworkError: !!netErr,
    };
  }
}

// ─── IPC HANDLERS ────────────────────────────────────────────────────────

/**
 * Registers every file-related IPC handler.
 *
 * Must be called exactly once at app startup (see `electron/main.js`).
 *
 * Channels registered (grouped by domain):
 *
 * **Dialogs**
 * - `open-file-dialog`      → `string[]` (empty on cancel)
 * - `open-image-dialog`     → `string | null`
 * - `open-directory-dialog` → `{ canceled: boolean, filePaths: string[] }`
 * - `save-file-dialog`      → `{ success: boolean, path?: string, error?: string }`
 *
 * **Import (copy into userData)**
 * - `import-sound-file` → `{ success, path?, name?, error? }`
 * - `import-image-file` → `{ success, path?, error? }`
 * - `write-dropped-file` → `{ success, path?, name?, error? }`
 * - `write-sound-file` → `{ success, path?, error? }`
 *
 * **Filesystem utilities**
 * - `file-exists`      → `boolean`
 * - `read-file`        → `{ success, data?: ArrayBuffer, error? }`
 * - `read-file-base64` → `{ success, base64?: string, error? }`
 * - `delete-sound-file` → `{ success, error? }`
 * - `get-sounds-dir`   → `string`
 *
 * **Download**
 * - `download-sound-url` → `{ success, path?, error?, isNetworkError? }`
 * - `download-thumbnail` → `{ success, path?, error?, isNetworkError? }`
 *
 * **Export / Import (backups)**
 * - `export-json-file`    → `{ success, path?, canceled?, error? }`
 * - `export-config`       → `{ success, path?, canceled?, error? }`
 * - `export-full`         → `{ success, path?, sizeMb?, canceled?, error? }`
 * - `export-sounds-only`  → `{ success, path?, sizeMb?, canceled?, error? }`
 * - `import-backup`       → `{ success, type?, canceled?, error?, importedSounds? }`
 * - `export-profile`      → `{ success, path?, soundCount?, sizeMb?, canceled?, error? }`
 * - `import-profile`      → `{ success, profileName?, soundCount?, canceled?, error? }`
 *
 * **Audio processing**
 * - `trim-sound-file`   → `{ success, path?, warning?, error? }`
 * - `convert-audio`     → `{ success, path?, size?, error? }`
 * - `export-audio-file` → `{ success, path?, canceled?, error? }`
 *
 * **YouTube / yt-dlp**
 * - `check-ytdlp`     → `{ available: boolean, path?, error? }`
 * - `download-ytdlp`  → (same shape as `downloadYtDlp()`)
 * - `youtube-info`    → `{ success, id?, title?, duration?, thumbnail?, uploader?, url?, error?, isNetworkError? }`
 * - `youtube-download` → `{ success, path?, error?, isNetworkError? }`
 *
 * **Spotify / SoundCloud stubs**
 * - `spotify-track-info`     → `{ success, data?, error? }`
 * - `soundcloud-track-info`  → `{ success, data?, error? }`
 * - `download-platform-track` → `{ success: false, error, outputPath? }`
 *
 * **Virtual audio driver (VB-Cable)**
 * - `install-virtual-driver`   → `{ success, installerPath?, warning?, error?, isNetworkError? }`
 * - `uninstall-virtual-driver` → `{ success, warning?, error? }`
 * - `get-virtual-driver-status` → `{ success, downloaded?, extracted?, installerPath?, error? }`
 *
 * @param {import('electron').BrowserWindow | null} mainWindow - The main
 *   window (passed as the first arg to native dialogs so they're modal
 *   to the app). `null` is accepted in tests.
 * @param {string} soundsDir - Absolute path to `<userData>/sounds`.
 *   Imported sounds are copied here; `write-dropped-file` and
 *   `download-sound-url` write here as well.
 * @returns {void}
 */
function registerFileHandlers(mainWindow, soundsDir) {
  // ─── DIALOGS ──────────────────────────────────────────────────────
  // Note: dialog titles stay in French (user-facing runtime strings).

  // Sounds picker — multi-select, audio file extensions.
  ipcMain.handle("open-file-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Importer des sons",
      filters: [
        {
          name: "Audio",
          extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
        },
      ],
      properties: ["openFile", "multiSelections"],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // Image picker — single file, image extensions.
  ipcMain.handle("open-image-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir une image",
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
      ],
      properties: ["openFile"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Directory picker — returns the raw dialog result.
  ipcMain.handle("open-directory-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir un dossier d'export",
      properties: ["openDirectory"],
    });
    return result;
  });

  // ─── IMPORT INTO userData ─────────────────────────────────────────

  // Copy an audio file into <soundsDir>. Prefixes with Date.now() if
  // the target name already exists (avoids silent overwrites).
  ipcMain.handle("import-sound-file", async (event, filePath) => {
    try {
      const fileName = path.basename(filePath);
      const destPath = path.join(soundsDir, fileName);
      const finalDest = fs.existsSync(destPath)
        ? path.join(soundsDir, `${Date.now()}_${fileName}`)
        : destPath;
      fs.copyFileSync(filePath, finalDest);
      return {
        success: true,
        path: finalDest.replace(/\\/g, "/"),
        name: path.basename(finalDest, path.extname(finalDest)),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Copy an image into <userData>/images with a timestamp prefix.
  ipcMain.handle("import-image-file", async (event, filePath) => {
    try {
      const { app } = require("electron");
      const imagesDir = path.join(app.getPath("userData"), "images");
      if (!fs.existsSync(imagesDir))
        fs.mkdirSync(imagesDir, { recursive: true });
      const fileName = `${Date.now()}_${path.basename(filePath)}`;
      const destPath = path.join(imagesDir, fileName);
      fs.copyFileSync(filePath, destPath);
      return { success: true, path: destPath.replace(/\\/g, "/") };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Delete an audio file. Silent success if the file was already gone.
  ipcMain.handle("delete-sound-file", async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ─── FILESYSTEM UTILITIES ─────────────────────────────────────────

  // Quick existence check (never throws).
  ipcMain.handle("file-exists", (event, filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  });

  // Read a file and return its underlying ArrayBuffer (structured-clone
  // friendly — Buffers don't survive IPC).
  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath);
      return { success: true, data: data.buffer };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Read a file and return its content as base64
  // (used for feedback attachments in FeedbackModal).
  ipcMain.handle("read-file-base64", async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath);
      return { success: true, base64: data.toString("base64") };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Write a Uint8Array to a file (renderer sends it as a typed array).
  ipcMain.handle("write-sound-file", async (event, filePath, data) => {
    try {
      const uint8Array = new Uint8Array(data);
      fs.writeFileSync(filePath, uint8Array);
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Return the current sounds directory (constant for the app's life).
  ipcMain.handle("get-sounds-dir", () => soundsDir);

  // Export arbitrary JSON (bypasses the will-download block).
  ipcMain.handle(
    "export-json-file",
    async (event, jsonContent, defaultFileName, title) => {
      try {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: title || "Exporter en JSON",
          defaultPath:
            defaultFileName ||
            `sounddeck-export-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });

        if (result.canceled) {
          return { success: false, canceled: true };
        }

        fs.writeFileSync(result.filePath, jsonContent, "utf-8");
        return { success: true, path: result.filePath };
      } catch (e) {
        console.error("❌ [export-json-file] Erreur:", e.message);
        return { success: false, error: e.message };
      }
    },
  );

  // Write a dropped file (drag & drop) into <soundsDir>. Sanitizes the
  // filename and prefixes it with Date.now().
  ipcMain.handle("write-dropped-file", async (event, fileName, arrayBuffer) => {
    try {
      const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const destPath = path.join(soundsDir, `${Date.now()}_${safeName}`);
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(destPath, buffer);
      const name = path.basename(destPath, path.extname(destPath));
      return { success: true, path: destPath.replace(/\\/g, "/"), name };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Save dialog + write a WAV file (used after normalization).
  ipcMain.handle("save-file-dialog", async (event, fileName, buffer) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Sauvegarder le fichier normalisé",
      defaultPath: fileName,
      filters: [{ name: "Audio WAV", extensions: ["wav"] }],
    });

    if (result.canceled) {
      return { success: false };
    }

    try {
      const uint8Array = new Uint8Array(buffer);
      fs.writeFileSync(result.filePath, uint8Array);
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ─── DOWNLOAD FROM URL (Google Drive / Dropbox / OneDrive) ────────

  // Download a user-supplied URL. Rewrites known cloud-share URLs into
  // direct-download URLs before making the request.
  ipcMain.handle("download-sound-url", async (event, rawUrl, fileName) => {
    const destPath = path.join(soundsDir, fileName);

    /**
     * Rewrites known cloud-share URLs into direct-download URLs.
     * Handles Google Drive (/file/d/... and /open?id=), Dropbox (?dl=0
     * → ?dl=1), and OneDrive (1drv.ms / onedrive.live.com → API).
     *
     * @param {string} url - The user-provided URL.
     * @returns {string} A URL that can be `http.get()`-ed directly.
     */
    const resolveDirectUrl = (url) => {
      const gdrive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (gdrive) {
        return `https://drive.google.com/uc?export=download&id=${gdrive[1]}`;
      }
      const gdriveOpen = url.match(
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      );
      if (gdriveOpen) {
        return `https://drive.google.com/uc?export=download&id=${gdriveOpen[1]}`;
      }
      if (url.includes("dropbox.com")) {
        return url.replace("?dl=0", "?dl=1").replace("&dl=0", "&dl=1");
      }
      if (url.includes("1drv.ms") || url.includes("onedrive.live.com")) {
        const b64 = Buffer.from(url)
          .toString("base64")
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
        return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`;
      }
      return url;
    };

    const url = resolveDirectUrl(rawUrl);

    /**
     * Recursive GET with redirect following. Tries https then http
     * depending on the URL scheme, and rejects HTML responses (share
     * pages) and empty / suspiciously-small files.
     *
     * @param {string} url - Current URL to fetch.
     * @param {string} dest - Destination file path.
     * @param {number} [redirectCount=0] - Loop guard.
     * @returns {Promise<{success: boolean, path?: string, error?: string, isNetworkError?: boolean}>}
     */
    const doRequest = (url, dest, redirectCount = 0) =>
      new Promise((resolve) => {
        if (redirectCount > 10) {
          resolve({
            success: false,
            error: "Trop de redirections",
            isNetworkError: false,
          });
          return;
        }
        const protocol = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(dest);

        const req = protocol.get(
          url,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "audio/*, */*",
            },
          },
          (res) => {
            // Follow redirects (absolute or relative Location header)
            if (
              [301, 302, 303, 307, 308].includes(res.statusCode) &&
              res.headers.location
            ) {
              file.close();
              fs.unlink(dest, () => {});
              const redirectUrl = res.headers.location.startsWith("http")
                ? res.headers.location
                : new URL(res.headers.location, url).href;
              doRequest(redirectUrl, dest, redirectCount + 1).then(resolve);
              return;
            }

            // Detect "share page" HTML responses — most cloud providers
            // return a landing page instead of 403 when the file is private.
            const contentType = res.headers["content-type"] || "";
            if (res.statusCode === 200 && contentType.includes("text/html")) {
              file.close();
              fs.unlink(dest, () => {});
              resolve({
                success: false,
                error:
                  'Le lien pointe vers une page web et non un fichier audio direct.\n\nPour Google Drive : ouvrez le fichier → cliquez "Télécharger" → copiez le lien direct.\nPour Dropbox : remplacez ?dl=0 par ?dl=1 dans l\'URL.',
                isNetworkError: false,
              });
              return;
            }

            if (res.statusCode !== 200) {
              file.close();
              fs.unlink(dest, () => {});
              resolve({
                success: false,
                error: `Erreur HTTP ${res.statusCode}`,
                isNetworkError: false,
              });
              return;
            }

            res.pipe(file);
            file.on("finish", () => {
              file.close();
              const stats = fs.statSync(dest);
              // Under 1000 bytes is almost certainly an HTML error page
              if (stats.size < 1000) {
                fs.unlink(dest, () => {});
                resolve({
                  success: false,
                  error:
                    "Fichier téléchargé trop petit — lien invalide ou protégé.",
                  isNetworkError: false,
                });
                return;
              }
              resolve({ success: true, path: dest.replace(/\\/g, "/") });
            });
            file.on("error", (e) => {
              fs.unlink(dest, () => {});
              resolve({
                success: false,
                error: e.message,
                isNetworkError: false,
              });
            });
          },
        );

        req.on("error", (e) => {
          fs.unlink(dest, () => {});
          const netErr = normalizeNetworkError(e);
          resolve({
            success: false,
            error: netErr || e.message,
            isNetworkError: !!netErr,
          });
        });

        // 15s without any response bytes = timeout
        req.setTimeout(15000, () => {
          req.destroy();
          fs.unlink(dest, () => {});
          resolve({
            success: false,
            error: "NETWORK_TIMEOUT",
            isNetworkError: true,
          });
        });
      });

    return doRequest(url, destPath);
  });

  // ─── TRIM (ffmpeg) ────────────────────────────────────────────────

  // Trim a sound file between startTime and endTime (seconds). Falls
  // back to a straight file copy if ffmpeg isn't available.
  ipcMain.handle(
    "trim-sound-file",
    async (event, filePath, startTime, endTime) => {
      try {
        if (!fs.existsSync(filePath)) {
          return { success: false, error: "Fichier non trouvé" };
        }

        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const newFileName = `${baseName}_trimmed_${Date.now()}${ext}`;
        const outputPath = path.join(dir, newFileName);

        const duration = endTime - startTime;
        if (duration <= 0) {
          return { success: false, error: "Durée de rognage invalide" };
        }

        const ffmpegPath = findFFmpeg();

        if (!ffmpegPath) {
          // No ffmpeg → copy the whole file (best-effort)
          fs.copyFileSync(filePath, outputPath);
          return {
            success: true,
            path: outputPath,
            warning:
              "ffmpeg non disponible, fichier copié sans rognage (le rognage précis nécessite ffmpeg)",
          };
        }

        const { execFile } = require("child_process");

        return new Promise((resolve) => {
          // Codec selection by extension
          const ext = path.extname(filePath).toLowerCase().replace(".", "");
          let codecArgs;
          if (ext === "mp3") {
            codecArgs = ["-c:a", "libmp3lame", "-q:a", "2"];
          } else if (ext === "wav") {
            codecArgs = ["-c:a", "pcm_s16le"];
          } else if (ext === "ogg" || ext === "opus") {
            codecArgs = ["-c:a", "libvorbis", "-q:a", "5"];
          } else if (ext === "m4a" || ext === "aac") {
            codecArgs = ["-c:a", "aac", "-b:a", "192k"];
          } else {
            codecArgs = ["-c:a", "libmp3lame", "-q:a", "2"];
          }

          const args = [
            "-i",
            filePath,
            "-ss",
            String(startTime),
            "-t",
            String(duration),
            ...codecArgs,
            "-y",
            outputPath,
          ];

          execFile(ffmpegPath, args, { timeout: 60000 }, (error) => {
            if (error) {
              console.error(
                "❌ [trim-sound-file] Erreur ffmpeg:",
                error.message,
              );
              // Fallback: copy the file as-is with a warning
              try {
                fs.copyFileSync(filePath, outputPath);
                resolve({
                  success: true,
                  path: outputPath,
                  warning: `Erreur ffmpeg (${error.message}), fichier copié sans rognage`,
                });
              } catch {
                resolve({ success: false, error: error.message });
              }
              return;
            }

            if (!fs.existsSync(outputPath)) {
              resolve({
                success: false,
                error: "Fichier de sortie non créé",
              });
              return;
            }

            const stats = fs.statSync(outputPath);
            if (stats.size === 0) {
              resolve({ success: false, error: "Fichier de sortie vide" });
              return;
            }

            resolve({ success: true, path: outputPath });
          });
        });
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
  );

  // ─── YOUTUBE (yt-dlp) ─────────────────────────────────────────────

  // Check if yt-dlp is available and working.
  ipcMain.handle("check-ytdlp", async () => {
    try {
      const ytdlpPath = findYtDlp();
      if (ytdlpPath) {
        try {
          const { execFile } = require("child_process");
          await new Promise((resolve, reject) => {
            execFile(ytdlpPath, ["--version"], { timeout: 10000 }, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
          return { available: true, path: ytdlpPath };
        } catch (e) {
          // Cached binary is broken → delete so it gets re-downloaded
          if (ytdlpPath !== "yt-dlp" && fs.existsSync(ytdlpPath)) {
            try {
              fs.unlinkSync(ytdlpPath);
            } catch {
              /* noop */
            }
          }
          return { available: false, error: e.message };
        }
      }
      return { available: false };
    } catch (e) {
      return { available: false, error: e.message };
    }
  });

  // Download the yt-dlp binary (delegates to `downloadYtDlp`).
  ipcMain.handle("download-ytdlp", async () => {
    return await downloadYtDlp();
  });

  // Fetch metadata for a YouTube video (title, duration, thumbnail, …).
  // Auto-downloads yt-dlp if it's missing.
  ipcMain.handle("youtube-info", async (event, url) => {
    try {
      let ytdlpPath = findYtDlp();

      if (!ytdlpPath) {
        const result = await downloadYtDlp();
        if (result.success) {
          ytdlpPath = result.path;
        } else {
          return {
            success: false,
            error: result.isNetworkError
              ? "NETWORK_ERROR"
              : "yt-dlp non disponible. Veuillez l'installer manuellement.",
            isNetworkError: !!result.isNetworkError,
          };
        }
      }

      const { execFile } = require("child_process");

      return new Promise((resolve) => {
        const args = [
          "--no-warnings",
          "--dump-json",
          "--no-download",
          "--flat-playlist",
          "--no-playlist",
          url,
        ];

        execFile(
          ytdlpPath,
          args,
          {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024,
          },
          (error, stdout) => {
            if (error) {
              console.error("❌ [youtube-info] Erreur:", error.message);
              // Delete the cached binary — it's probably broken
              if (ytdlpPath !== "yt-dlp" && fs.existsSync(ytdlpPath)) {
                try {
                  fs.unlinkSync(ytdlpPath);
                } catch {
                  /* noop */
                }
              }
              const netErr = normalizeNetworkError(error);
              return resolve({
                success: false,
                error: netErr || error.message,
                isNetworkError: !!netErr,
              });
            }

            // Extract the first balanced {...} block (yt-dlp sometimes
            // prefixes warnings / banners on stderr that break JSON.parse).
            let cleanOutput = stdout.trim();
            let jsonStr = "";
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < cleanOutput.length; i++) {
              const char = cleanOutput[i];

              if (escapeNext) {
                escapeNext = false;
                jsonStr += char;
                continue;
              }

              if (char === "\\") {
                escapeNext = true;
                jsonStr += char;
                continue;
              }

              if (char === '"' && !escapeNext) {
                inString = !inString;
                jsonStr += char;
                continue;
              }

              if (!inString) {
                if (char === "{") {
                  braceCount++;
                } else if (char === "}") {
                  braceCount--;
                  jsonStr += char;
                  if (braceCount === 0) {
                    break;
                  }
                  continue;
                }
              }

              jsonStr += char;
            }

            try {
              const data = JSON.parse(jsonStr);

              if (!data.id || !data.title) {
                return resolve({
                  success: false,
                  error: "Données vidéo incomplètes",
                });
              }

              resolve({
                success: true,
                id: data.id,
                title: data.title,
                duration: data.duration || 0,
                thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || null,
                uploader: data.uploader || data.channel || "Inconnu",
                url: data.webpage_url || data.url || url,
              });
            } catch (e) {
              console.error("❌ [youtube-info] Erreur parse JSON:", e.message);
              resolve({
                success: false,
                error: `Erreur de parsing: ${e.message}. Vérifiez que l'URL est valide.`,
              });
            }
          },
        );
      });
    } catch (e) {
      const netErr = normalizeNetworkError(e);
      return {
        success: false,
        error: netErr || e.message,
        isNetworkError: !!netErr,
      };
    }
  });

  // Download a YouTube video's audio as MP3. Supports a [start, end]
  // section (skip if start === 0).
  ipcMain.handle("youtube-download", async (event, url, start, end, title) => {
    try {
      let ytdlpPath = findYtDlp();

      if (!ytdlpPath) {
        const result = await downloadYtDlp();
        if (result.success) {
          ytdlpPath = result.path;
        } else {
          return {
            success: false,
            error: result.isNetworkError
              ? "NETWORK_ERROR"
              : "yt-dlp non disponible. Veuillez l'installer manuellement.",
            isNetworkError: !!result.isNetworkError,
          };
        }
      }

      const ffmpegPath = findFFmpeg();

      const { app } = require("electron");
      const { execFile } = require("child_process");

      const safeTitle = (title || "audio").replace(/[^a-zA-Z0-9]/g, "_");
      const outputDir = app.getPath("userData");
      const outputPath = path.join(outputDir, `${safeTitle}_${Date.now()}.mp3`);

      return new Promise((resolve) => {
        const args = [
          "-f",
          "bestaudio/best",
          "--extract-audio",
          "--audio-format",
          "mp3",
          "--audio-quality",
          "2",
          "-o",
          outputPath,
          "--no-playlist",
          "--no-warnings",
        ];

        if (ffmpegPath) {
          args.push("--ffmpeg-location", ffmpegPath);
        }

        // Only add section if we actually have a start offset
        if (start > 0) {
          args.push("--download-sections", `*${start}-${end > 0 ? end : ""}`);
          args.push("--force-keyframes-at-cuts");
        }

        args.push(url);

        execFile(ytdlpPath, args, { timeout: 300000 }, (error) => {
          if (error) {
            console.error("❌ [youtube-download] Erreur:", error.message);
            if (ytdlpPath !== "yt-dlp" && fs.existsSync(ytdlpPath)) {
              try {
                fs.unlinkSync(ytdlpPath);
              } catch {
                /* noop */
              }
            }
            const netErr = normalizeNetworkError(error);
            return resolve({
              success: false,
              error: netErr || error.message,
              isNetworkError: !!netErr,
            });
          }

          // yt-dlp may add suffixes (.mp3, .mp3.part, …) — match by prefix
          const files = fs.readdirSync(outputDir);
          const baseName = path.basename(outputPath, ".mp3");
          const audioFile = files.find(
            (f) => f.startsWith(baseName) && f.endsWith(".mp3"),
          );

          if (audioFile) {
            const finalPath = path.join(outputDir, audioFile);
            resolve({ success: true, path: finalPath.replace(/\\/g, "/") });
          } else {
            // Fallback: pick the most-recent MP3 in userData
            const mp3Files = files.filter((f) => f.endsWith(".mp3"));
            if (mp3Files.length > 0) {
              const latest = mp3Files.sort((a, b) => {
                return (
                  fs.statSync(path.join(outputDir, b)).mtime -
                  fs.statSync(path.join(outputDir, a)).mtime
                );
              })[0];
              const finalPath = path.join(outputDir, latest);
              resolve({ success: true, path: finalPath.replace(/\\/g, "/") });
            } else {
              resolve({ success: false, error: "Fichier audio non trouvé" });
            }
          }
        });
      });
    } catch (e) {
      const netErr = normalizeNetworkError(e);
      return {
        success: false,
        error: netErr || e.message,
        isNetworkError: !!netErr,
      };
    }
  });

  // ─── EXPORT / IMPORT (backups & profiles) ─────────────────────────

  // Export a JSON config snapshot (no sounds, just metadata).
  ipcMain.handle("export-config", async () => {
    try {
      const data = {
        profiles: store.get("profiles", []),
        sounds: store.get("sounds", []),
        shortcuts: store.get("shortcuts", {}),
        soundOrder: store.get("soundOrder", {}),
        tags: store.get("tags", {}),
        theme: store.get("theme", "dark"),
        customTheme: store.get("customTheme", null),
        audioDevice: store.get("audioDevice", "default"),
        volume: store.get("volume", 80),
        playLocally: store.get("playLocally", true),
        normalizationEnabled: store.get("normalizationEnabled", true),
        normalizationTarget: store.get("normalizationTarget", 0.2),
        timestamp: Date.now(),
        version: "1.0",
      };

      const result = await dialog.showSaveDialog({
        title: "Exporter la configuration",
        defaultPath: `sounddeck-config-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Export a full ZIP backup (config.json + sounds/ folder).
  ipcMain.handle("export-full", async () => {
    try {
      const archiver = require("archiver");

      const result = await dialog.showSaveDialog({
        title: "Exporter l'archive complète",
        defaultPath: `sounddeck-full-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: "ZIP", extensions: ["zip"] }],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const output = fs.createWriteStream(result.filePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      return new Promise((resolve) => {
        output.on("close", () => {
          const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(1);
          resolve({ success: true, path: result.filePath, sizeMb });
        });

        archive.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });

        archive.pipe(output);

        const config = {
          profiles: store.get("profiles", []),
          sounds: store.get("sounds", []),
          shortcuts: store.get("shortcuts", {}),
          soundOrder: store.get("soundOrder", {}),
          tags: store.get("tags", {}),
          theme: store.get("theme", "dark"),
          customTheme: store.get("customTheme", null),
          audioDevice: store.get("audioDevice", "default"),
          volume: store.get("volume", 80),
          playLocally: store.get("playLocally", true),
          normalizationEnabled: store.get("normalizationEnabled", true),
          normalizationTarget: store.get("normalizationTarget", 0.2),
          timestamp: Date.now(),
          version: "1.0",
        };
        archive.append(JSON.stringify(config, null, 2), {
          name: "config.json",
        });

        // Copy each sound referenced by the store (best-effort — skip
        // missing files silently so one broken path doesn't kill the
        // whole backup).
        const sounds = store.get("sounds", []);
        for (const sound of sounds) {
          if (sound.path) {
            const soundPath = sound.path.startsWith("file://")
              ? sound.path.replace("file:///", "").replace(/\\/g, "/")
              : sound.path;
            if (fs.existsSync(soundPath)) {
              archive.file(soundPath, {
                name: `sounds/${path.basename(soundPath)}`,
              });
            }
          }
        }

        archive.finalize();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Export a ZIP with only the sound files (no config).
  ipcMain.handle("export-sounds-only", async () => {
    try {
      const archiver = require("archiver");

      const result = await dialog.showSaveDialog({
        title: "Exporter les sons uniquement",
        defaultPath: `sounddeck-sounds-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: "ZIP", extensions: ["zip"] }],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const output = fs.createWriteStream(result.filePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      return new Promise((resolve) => {
        output.on("close", () => {
          const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(1);
          resolve({ success: true, path: result.filePath, sizeMb });
        });

        archive.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });

        archive.pipe(output);

        const sounds = store.get("sounds", []);
        for (const sound of sounds) {
          if (sound.path) {
            const soundPath = sound.path.startsWith("file://")
              ? sound.path.replace("file:///", "").replace(/\\/g, "/")
              : sound.path;
            if (fs.existsSync(soundPath)) {
              archive.file(soundPath, { name: path.basename(soundPath) });
            }
          }
        }

        archive.finalize();
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Import a backup (either a .json config or a .zip produced by
  // export-full). JSON is applied directly; ZIP is extracted into
  // <userData>/temp_extract, config.json is read, sounds are copied.
  ipcMain.handle("import-backup", async () => {
    try {
      const { app } = require("electron");
      const unzipper = require("unzipper");

      const result = await dialog.showOpenDialog({
        title: "Importer une sauvegarde",
        filters: [{ name: "JSON ou ZIP", extensions: ["json", "zip"] }],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();

      if (ext === ".json") {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        if (data.profiles) store.set("profiles", data.profiles);
        if (data.sounds) store.set("sounds", data.sounds);
        if (data.shortcuts) store.set("shortcuts", data.shortcuts);
        if (data.soundOrder) store.set("soundOrder", data.soundOrder);
        if (data.tags) store.set("tags", data.tags);
        if (data.theme) store.set("theme", data.theme);
        if (data.customTheme) store.set("customTheme", data.customTheme);
        if (data.audioDevice) store.set("audioDevice", data.audioDevice);
        if (data.volume !== undefined) store.set("volume", data.volume);
        if (data.playLocally !== undefined)
          store.set("playLocally", data.playLocally);
        if (data.normalizationEnabled !== undefined)
          store.set("normalizationEnabled", data.normalizationEnabled);
        if (data.normalizationTarget !== undefined)
          store.set("normalizationTarget", data.normalizationTarget);

        return { success: true, type: "json" };
      } else if (ext === ".zip") {
        const extractDir = path.join(app.getPath("userData"), "temp_extract");
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });

        await fs
          .createReadStream(filePath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .promise();

        const configPath = path.join(extractDir, "config.json");
        if (fs.existsSync(configPath)) {
          const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));

          if (data.profiles) store.set("profiles", data.profiles);
          if (data.sounds) store.set("sounds", data.sounds);
          if (data.shortcuts) store.set("shortcuts", data.shortcuts);
          if (data.soundOrder) store.set("soundOrder", data.soundOrder);
          if (data.tags) store.set("tags", data.tags);
          if (data.theme) store.set("theme", data.theme);
          if (data.customTheme) store.set("customTheme", data.customTheme);
          if (data.audioDevice) store.set("audioDevice", data.audioDevice);
          if (data.volume !== undefined) store.set("volume", data.volume);
          if (data.playLocally !== undefined)
            store.set("playLocally", data.playLocally);
          if (data.normalizationEnabled !== undefined)
            store.set("normalizationEnabled", data.normalizationEnabled);
          if (data.normalizationTarget !== undefined)
            store.set("normalizationTarget", data.normalizationTarget);

          // Copy sounds from <extract>/sounds/ into <userData>/sounds/
          const soundsDir = path.join(app.getPath("userData"), "sounds");
          const soundsSrc = path.join(extractDir, "sounds");
          if (fs.existsSync(soundsSrc)) {
            const files = fs.readdirSync(soundsSrc);
            for (const file of files) {
              const src = path.join(soundsSrc, file);
              const dest = path.join(soundsDir, file);
              fs.copyFileSync(src, dest);
            }
          }

          fs.rmSync(extractDir, { recursive: true, force: true });
          return {
            success: true,
            type: "full",
            importedSounds: data.sounds?.length || 0,
          };
        }

        fs.rmSync(extractDir, { recursive: true, force: true });
        return {
          success: false,
          error: "config.json non trouvé dans l'archive",
        };
      }

      return { success: false, error: "Format non supporté" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Export a single profile as JSON (profile + its sounds metadata).
  ipcMain.handle("export-profile", async (event, profileId) => {
    try {
      const profiles = store.get("profiles", []);
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) {
        return { success: false, error: "Profil non trouvé" };
      }

      const allSounds = store.get("sounds", []);
      const profileSounds = allSounds.filter((s) =>
        s.profiles.includes(profileId),
      );

      const data = {
        profile: profile,
        sounds: profileSounds,
        timestamp: Date.now(),
        version: "1.0",
      };

      const result = await dialog.showSaveDialog({
        title: `Exporter le profil "${profile.name}"`,
        defaultPath: `sounddeck-profile-${profile.name}-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return {
        success: true,
        path: result.filePath,
        soundCount: profileSounds.length,
        sizeMb: (fs.statSync(result.filePath).size / 1024 / 1024).toFixed(1),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Import a profile JSON file (skips existing profiles / sounds).
  ipcMain.handle("import-profile", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Importer un profil",
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (!data.profile || !data.sounds) {
        return { success: false, error: "Format de fichier invalide" };
      }

      // Add the profile only if its ID isn't already taken
      const profiles = store.get("profiles", []);
      if (!profiles.find((p) => p.id === data.profile.id)) {
        profiles.push(data.profile);
        store.set("profiles", profiles);
      }

      // Add each sound only if its ID isn't already present
      const sounds = store.get("sounds", []);
      let importedCount = 0;
      for (const sound of data.sounds) {
        if (!sounds.find((s) => s.id === sound.id)) {
          sounds.push(sound);
          importedCount++;
        }
      }
      store.set("sounds", sounds);

      return {
        success: true,
        profileName: data.profile.name,
        soundCount: importedCount,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ─── SPOTIFY / SOUNDCLOUD (stubs) ─────────────────────────────────

  // Spotify metadata — stub. Returns fake data so the UI can render.
  ipcMain.handle("spotify-track-info", async (event, trackId) => {
    return {
      success: true,
      data: {
        id: trackId,
        title: `Spotify - ${trackId.slice(0, 8)}`,
        artist: "Artiste Spotify",
        duration: 180,
        cover: null,
      },
    };
  });

  // SoundCloud metadata — extracts the track slug from the URL and
  // returns fake data (real API requires auth, out of scope for now).
  ipcMain.handle("soundcloud-track-info", async (event, url) => {
    try {
      const match = url.match(/soundcloud\.com\/(?:.*)\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return { success: false, error: "URL SoundCloud invalide" };
      }

      return {
        success: true,
        data: {
          id: match[1],
          title: `SoundCloud - ${match[1].slice(0, 8)}`,
          artist: "Artiste SoundCloud",
          duration: 180 + Math.floor(Math.random() * 120),
          cover: null,
        },
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Platform download — not implemented (only YouTube is supported).
  ipcMain.handle("download-platform-track", async (event, params) => {
    const { platform, url, outputPath } = params || {};
    console.warn(
      `⚠️ [download-platform-track] Non implémenté (platform=${platform}, url=${url})`,
    );
    return {
      success: false,
      error: `Le téléchargement depuis ${platform || "cette plateforme"} n'est pas implémenté. Utilisez YouTube ou MyInstants.`,
      outputPath,
    };
  });

  // ─── AUDIO CONVERSION (ffmpeg) ────────────────────────────────────

  // Convert an audio file to another format (mp3 / aac / ogg).
  ipcMain.handle(
    "convert-audio",
    async (event, inputPath, outputPath, format, bitrate) => {
      try {
        const ffmpegPath = findFFmpeg();

        if (!ffmpegPath) {
          return { success: false, error: "ffmpeg non disponible" };
        }

        const { execFile } = require("child_process");

        return new Promise((resolve) => {
          const args = [
            "-i",
            inputPath,
            "-b:a",
            `${bitrate || 192}k`,
            "-acodec",
            format === "mp3"
              ? "libmp3lame"
              : format === "aac"
                ? "aac"
                : "libvorbis",
            "-y",
            outputPath,
          ];

          execFile(ffmpegPath, args, { timeout: 60000 }, (error) => {
            if (error) {
              console.error("❌ [convert-audio] Erreur:", error.message);
              return resolve({ success: false, error: error.message });
            }

            if (!fs.existsSync(outputPath)) {
              return resolve({
                success: false,
                error: "Fichier de sortie non créé",
              });
            }

            const stats = fs.statSync(outputPath);
            resolve({ success: true, path: outputPath, size: stats.size });
          });
        });
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
  );

  // Save dialog + write raw audio bytes (from the Audio editor export).
  ipcMain.handle("export-audio-file", async (event, params) => {
    try {
      const { data, fileName } = params;

      const result = await dialog.showSaveDialog({
        title: "Exporter l'audio",
        defaultPath: fileName || "exported_audio.wav",
        filters: [
          { name: "Audio WAV", extensions: ["wav"] },
          { name: "Audio MP3", extensions: ["mp3"] },
          { name: "Audio OGG", extensions: ["ogg"] },
        ],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const uint8Array = new Uint8Array(data);
      fs.writeFileSync(result.filePath, uint8Array);

      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ─── VIRTUAL DRIVER (VB-CABLE) ────────────────────────────────────

  const VB_CABLE_URL =
    "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip";

  // Download + extract + launch the VB-Cable installer. Leaves the
  // actual install to the user (requires admin rights).
  ipcMain.handle("install-virtual-driver", async () => {
    try {
      const { app, shell } = require("electron");
      const driverDir = path.join(app.getPath("userData"), "virtual-driver");
      if (!fs.existsSync(driverDir)) {
        fs.mkdirSync(driverDir, { recursive: true });
      }

      const zipPath = path.join(driverDir, "VBCABLE_Driver_Pack43.zip");

      // Download once, cache forever
      if (!fs.existsSync(zipPath)) {
        await downloadFile(VB_CABLE_URL, zipPath);
      }

      // Extract
      const AdmZip = require("adm-zip");
      const extractDir = path.join(driverDir, "extracted");
      if (!fs.existsSync(extractDir)) {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
      }

      // Find the 64-bit installer (paths vary between releases)
      const candidates = [
        path.join(extractDir, "VBCABLE_Setup_x64.exe"),
        path.join(extractDir, "VBCABLE_Driver_Pack43", "VBCABLE_Setup_x64.exe"),
      ];
      let installerPath = candidates.find((p) => fs.existsSync(p));

      // Fallback: recursive search for any *setup*.exe
      if (!installerPath) {
        const findExe = (dir, depth = 0) => {
          if (depth > 3) return null;
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const p = path.join(dir, e.name);
              if (
                e.isFile() &&
                e.name.toLowerCase().includes("setup") &&
                e.name.endsWith(".exe")
              ) {
                return p;
              }
              if (e.isDirectory()) {
                const found = findExe(p, depth + 1);
                if (found) return found;
              }
            }
          } catch {}
          return null;
        };
        installerPath = findExe(extractDir);
      }

      if (!installerPath) {
        return {
          success: false,
          error: "Installeur VB-Cable introuvable dans l'archive",
        };
      }

      // Hand off to the OS (UAC prompt will be shown by the installer)
      await shell.openPath(installerPath);

      return {
        success: true,
        installerPath,
        warning:
          "L'installeur VB-Cable a été ouvert. Suivez les instructions et redémarrez votre PC.",
      };
    } catch (e) {
      console.error("❌ [install-virtual-driver] Erreur:", e);
      const netErr = normalizeNetworkError(e);
      return {
        success: false,
        error: netErr || e.message,
        isNetworkError: !!netErr,
      };
    }
  });

  // Uninstall VB-Cable — opens the Windows "Apps & features" page.
  ipcMain.handle("uninstall-virtual-driver", async () => {
    try {
      const { shell } = require("electron");
      if (process.platform === "win32") {
        await shell.openPath("ms-settings:appsfeatures");
      } else {
        await shell.openExternal("https://vb-audio.com/Cable/");
      }
      return {
        success: true,
        warning:
          'Recherchez "VB-CABLE" dans la liste et désinstallez-le manuellement.',
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Report the state of the cached installer (downloaded / extracted).
  ipcMain.handle("get-virtual-driver-status", async () => {
    try {
      const { app } = require("electron");
      const driverDir = path.join(app.getPath("userData"), "virtual-driver");
      const installerPath = path.join(
        driverDir,
        "extracted",
        "VBCABLE_Setup_x64.exe",
      );
      const zipPath = path.join(driverDir, "VBCABLE_Driver_Pack43.zip");

      return {
        success: true,
        downloaded: fs.existsSync(zipPath),
        extracted: fs.existsSync(installerPath),
        installerPath: fs.existsSync(installerPath) ? installerPath : null,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ─── YOUTUBE THUMBNAIL DOWNLOAD ───────────────────────────────────

  // Download a YouTube thumbnail and save it into <userData>/images.
  // The extension is picked from the URL (defaults to .jpg).
  ipcMain.handle("download-thumbnail", async (event, url, soundName) => {
    try {
      if (!url) return { success: false, error: "URL manquante" };

      const { app } = require("electron");
      const imagesDir = path.join(app.getPath("userData"), "images");
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Try to preserve the URL's extension
      let ext = "jpg";
      try {
        const urlPath = new URL(url).pathname;
        const urlExt = path.extname(urlPath).replace(".", "").toLowerCase();
        if (["jpg", "jpeg", "png", "webp", "gif"].includes(urlExt))
          ext = urlExt;
      } catch {
        /* ignore */
      }

      const safeName = (soundName || "thumbnail")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 50);
      const fileName = `thumb_${safeName}_${Date.now()}.${ext}`;
      const outputPath = path.join(imagesDir, fileName);

      await downloadFile(url, outputPath);

      return { success: true, path: outputPath.replace(/\\/g, "/") };
    } catch (e) {
      console.error("❌ [download-thumbnail] Erreur:", e);
      const netErr = normalizeNetworkError(e);
      return {
        success: false,
        error: netErr || e.message,
        isNetworkError: !!netErr,
      };
    }
  });
}

module.exports = {
  registerFileHandlers,
};
