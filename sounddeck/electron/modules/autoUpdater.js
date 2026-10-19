/**
 * @file Auto-updater module (electron-updater).
 *
 * Responsibilities:
 * - Configure `electron-updater` (no auto-download, no prereleases)
 * - Forward update events to the renderer via IPC
 * - Register `update:*` IPC handlers (check / download / install / open-github)
 * - Schedule an automatic update check 5s after boot (production only)
 *
 * Behavior in development:
 * - The auto-check is skipped (no signed builds in dev)
 * - IPC handlers still work, but `checkForUpdates()` returns `{ok:false}`
 *
 * The renderer-side counterpart is `src/shared/hooks/useAutoUpdater.js`,
 * which listens to the IPC events and renders the update banner.
 *
 * @see https://www.electron.build/auto-update
 * @see https://www.electronjs.org/docs/latest/api/ipc-main
 */

const { autoUpdater } = require("electron-updater");
const { ipcMain, app, shell } = require("electron");

const isDev = !app.isPackaged;

/**
 * Logs a message prefixed with `[autoUpdater]`.
 *
 * @param {'info' | 'warn' | 'error'} level
 * @param {string} msg
 * @param {...unknown} args
 * @returns {void}
 */
const log = (level, msg, ...args) => {
  const prefix = "[autoUpdater]";
  if (level === "error") console.error(prefix, msg, ...args);
  else if (level === "warn") console.warn(prefix, msg, ...args);
  else console.log(prefix, msg, ...args);
};

/**
 * Configures the `electron-updater` singleton.
 *
 * - `autoDownload = false`: we wait for the user to click "Download"
 * - `autoInstallOnAppQuit = true`: if the download completed, install on quit
 * - `allowPrerelease = false`: ignore prereleases
 * - `logger`: routes electron-updater logs through our own logger
 *
 * @returns {void}
 */
function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.logger = {
    info: (m) => log("info", m),
    warn: (m) => log("warn", m),
    error: (m) => log("error", m),
    debug: (m) => log("info", m),
  };
}

/**
 * Subscribes to `electron-updater` events and forwards them to the renderer.
 *
 * Channels emitted:
 * - `update:checking`
 * - `update:available`        `{version, releaseDate, releaseNotes}`
 * - `update:not-available`    `{version}`
 * - `update:progress`         `{percent, transferred, total, bytesPerSecond}`
 * - `update:downloaded`       `{version, releaseNotes}`
 * - `update:error`            `{message}`
 *
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 *   Callback returning the current main window (or null if closed).
 * @returns {void}
 */
function forwardEvents(getMainWindow) {
  const send = (channel, payload) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };

  autoUpdater.on("checking-for-update", () => {
    log("info", "Checking for updates...");
    send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    log("info", `Update available: ${info.version}`);
    send("update:available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    log("info", `Up to date (${info.version})`);
    send("update:not-available", { version: info.version });
  });

  autoUpdater.on("download-progress", (progress) => {
    send("update:progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log("info", `Update downloaded: ${info.version}`);
    send("update:downloaded", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("error", (err) => {
    log("error", "Auto-update error:", err?.message || err);
    send("update:error", { message: err?.message || String(err) });
  });
}

/**
 * Registers the `update:*` IPC handlers on the main process.
 *
 * Handlers:
 * - `update:check`        → manual check (no-op in dev)
 * - `update:download`     → start download
 * - `update:install`      → quit and install
 * - `update:open-github`  → open the latest release page in the browser
 *
 * @returns {void}
 */
function registerIpcHandlers() {
  ipcMain.handle("update:check", async () => {
    if (isDev) {
      log("warn", "Skipping check: running in dev mode");
      return { ok: false, reason: "dev-mode" };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (e) {
      log("error", "checkForUpdates failed:", e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("update:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (e) {
      log("error", "downloadUpdate failed:", e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("update:install", () => {
    log("info", "Install + restart requested");
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle("update:open-github", () => {
    shell.openExternal(
      "https://github.com/Stevehunn/sounddeck/releases/latest",
    );
  });
}

/**
 * Initializes the auto-updater.
 *
 * Must be called once, after the main window is created.
 *
 * - Configures electron-updater
 * - Forwards IPC events to the renderer
 * - Registers `update:*` IPC handlers
 * - Schedules an automatic check 5s after boot (production only)
 *
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 *   Callback returning the current main window (or null if closed).
 * @returns {void}
 */
function initAutoUpdater(getMainWindow) {
  configureAutoUpdater();
  forwardEvents(getMainWindow);
  registerIpcHandlers();

  if (!isDev) {
    // Schedule update check 5s after boot to let the UI render first
    setTimeout(() => {
      log("info", "Auto-check on startup");
      autoUpdater.checkForUpdates().catch((e) => {
        log("warn", "Auto-check failed:", e.message);
      });
    }, 5000);
  } else {
    log("info", "Dev mode: auto-update disabled");
  }
}

module.exports = { initAutoUpdater };
