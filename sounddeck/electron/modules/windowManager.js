/**
 * @file Main BrowserWindow lifecycle manager for the Electron main process.
 *
 * Responsibilities:
 * - Create the main application window (with dev/prod path resolution)
 * - Manage window visibility (show / hide / focus / minimize detection)
 * - Block external navigation (`will-navigate`) and file downloads
 *   (`will-download`) — sounddeck is a local-first app that should
 *   never navigate away or trigger downloads
 * - Track the app's quitting state so the `close` handler can
 *   distinguish "user clicked X with close-to-tray enabled" from
 *   "user confirmed quit"
 *
 * This module deliberately keeps no reference to `app` beyond what it
 * needs — it's pure BrowserWindow state. The `electron/main.js` file
 * orchestrates the higher-level flow (tray, quit confirm, etc.).
 *
 * @see ./trayManager.js — where close-to-tray routes the X button
 * @see ../main.js — where `createWindow()` is called + close is handled
 */

const { BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

/**
 * The single BrowserWindow instance (or `null` before `createWindow()`
 * and after `cleanupWindow()`).
 * @type {import('electron').BrowserWindow | null}
 */
let mainWindow = null;

/**
 * True once the app has entered its shutdown sequence. Set by
 * `setQuitting(true)` from `main.js` when the user confirms quit, so
 * the window's `close` handler knows to let it actually close (instead
 * of hiding it to the tray).
 * @type {boolean}
 */
let isQuitting = false;

/**
 * True when a quit has been requested but not yet confirmed by the
 * user (they're looking at the quit-confirm dialog).
 * @type {boolean}
 */
let pendingQuit = false;

/**
 * Local mirror of `store.get("closeToTray")`. Kept in-sync by
 * `setCloseToTray()`, which is called from the IPC handler for the
 * quit-confirm dialog. Used by `getCloseToTray()` as the source of
 * truth during the close flow.
 * @type {boolean}
 */
let closeToTray = true;

/**
 * True when running in dev (unpackaged). Determines which URL / file
 * path is loaded and whether DevTools auto-open.
 * @type {boolean}
 */
const isDev = !require("electron").app.isPackaged;

// ─── WINDOW CREATION ────────────────────────────────────────────────────

/**
 * Creates the main application window.
 *
 * - 1100×700 default, 800×500 minimum
 * - `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`
 * - Loads `http://localhost:5173` in dev, `dist/index.html` in prod
 * - Sets up two navigational guards (see below)
 *
 * **`will-navigate` guard**: any external navigation is prevented.
 * `http(s)` URLs are opened in the user's default browser via
 * `shell.openExternal()`. This stops `window.location = "..."` from
 * hijacking the app window (some audio libraries do this on error).
 *
 * **`will-download` guard**: any download is silently prevented. This
 * avoids the default Electron download bar from popping up when a
 * renderer code path accidentally triggers one (e.g. clicking a
 * `data:` link).
 *
 * In production, if `dist/index.html` can't be found (broken build),
 * a native error dialog is shown and the app quits.
 *
 * @param {boolean} [shouldStartMinimized=false] - If true, the window
 *   is created with `show: false` (used when the user has
 *   "start minimized" enabled, or when launched at system startup).
 * @returns {import('electron').BrowserWindow} The created window
 *   (same instance as `getMainWindow()`).
 */
function createWindow(shouldStartMinimized = false) {
  const iconPath = path.join(__dirname, "../../public/icon.ico");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    backgroundColor: "#111113",
    show: !shouldStartMinimized,
    autoHideMenuBar: true,
    frame: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
  });

  // ─── Dev vs prod loading ─────────────────────────────────────────
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // Try multiple paths for dist/index.html — layouts differ between
    // `electron .` from repo root vs packaged `app.asar`.
    let indexPath = path.join(
      require("electron").app.getAppPath(),
      "dist",
      "index.html",
    );

    if (!fs.existsSync(indexPath)) {
      const resourcePath = path.join(
        process.resourcesPath,
        "app",
        "dist",
        "index.html",
      );
      if (fs.existsSync(resourcePath)) {
        indexPath = resourcePath;
      } else {
        const exePath = path.join(
          path.dirname(require("electron").app.getPath("exe")),
          "resources",
          "app",
          "dist",
          "index.html",
        );
        if (fs.existsSync(exePath)) {
          indexPath = exePath;
        }
      }
    }

    if (!fs.existsSync(indexPath)) {
      console.error("❌ ERREUR: index.html introuvable !");
      dialog.showErrorBox(
        "Erreur de chargement",
        "Impossible de trouver index.html.\n\n" +
          "Chemin recherché: " +
          indexPath +
          "\n\n" +
          "Vérifiez que le build est correct.",
      );
      require("electron").app.quit();
      return;
    }

    mainWindow.loadFile(indexPath);
  }

  // ─── Guard: block external navigation ────────────────────────────
  mainWindow.webContents.on("will-navigate", (e, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url === currentUrl) return;

    e.preventDefault();

    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        require("electron").shell.openExternal(url);
      } catch (err) {
        console.warn("[will-navigate] openExternal error:", err.message);
      }
    }

    if (isDev) {
      console.log(`🔒 [will-navigate] Navigation bloquée : ${url}`);
    }
  });

  // ─── Guard: block file downloads ─────────────────────────────────
  // (SoundDeck is local-first — a download usually means a bug.)
  mainWindow.webContents.session.on("will-download", (e, item) => {
    e.preventDefault();
    if (isDev) {
      console.log(
        `🔒 [will-download] Téléchargement bloqué : ${item?.getURL?.() || "unknown"}`,
      );
    }
  });

  return mainWindow;
}

// ─── WINDOW MANAGEMENT ──────────────────────────────────────────────────

/**
 * Returns the current main window (or `null` before creation / after
 * cleanup).
 *
 * @returns {import('electron').BrowserWindow | null}
 */
function getMainWindow() {
  return mainWindow;
}

/**
 * Shows and focuses the main window.
 *
 * If the window was hidden (minimized to tray), also sends a
 * `hide-quit-confirm` event to the renderer so any lingering quit
 * dialog is dismissed. This prevents a stale "Are you sure you want
 * to quit?" modal from blocking the freshly-shown window.
 *
 * @returns {void}
 */
function showMainWindow() {
  if (mainWindow) {
    const wasHidden = !mainWindow.isVisible();
    if (wasHidden) {
      mainWindow.webContents.send("hide-quit-confirm");
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Hides the main window (used by the tray "minimize to tray" flow).
 *
 * @returns {void}
 */
function hideMainWindow() {
  if (mainWindow) {
    mainWindow.hide();
  }
}

/**
 * Returns whether the main window is currently visible.
 *
 * @returns {boolean} `false` if there is no window or if it's hidden.
 */
function isWindowVisible() {
  return mainWindow ? mainWindow.isVisible() : false;
}

/**
 * Brings the main window to the front, restoring it first if it was
 * minimized.
 *
 * @returns {void}
 */
function focusMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

// ─── CLOSE / QUIT STATE ─────────────────────────────────────────────────

/**
 * Marks the app as (un)quitting.
 *
 * @param {boolean} value
 * @returns {void}
 */
function setQuitting(value) {
  isQuitting = value;
}

/**
 * Marks whether a quit is currently pending (user is on the confirm
 * dialog).
 *
 * @param {boolean} value
 * @returns {void}
 */
function setPendingQuit(value) {
  pendingQuit = value;
}

/**
 * Sets the local `closeToTray` mirror (persisted in the store by the
 * IPC handler in `ipcHandlers.js`).
 *
 * @param {boolean} value
 * @returns {void}
 */
function setCloseToTray(value) {
  closeToTray = value;
}

/**
 * Returns the local `closeToTray` mirror.
 *
 * @returns {boolean}
 */
function getCloseToTray() {
  return closeToTray;
}

/**
 * Returns whether the app is currently quitting.
 *
 * @returns {boolean}
 */
function getIsQuitting() {
  return isQuitting;
}

/**
 * Returns whether a quit is currently pending.
 *
 * @returns {boolean}
 */
function getPendingQuit() {
  return pendingQuit;
}

// ─── CLEANUP ────────────────────────────────────────────────────────────

/**
 * Releases the module-level `mainWindow` reference.
 *
 * Called from `main.js` on the `closed` event. Does **not** destroy
 * the window itself (Electron has already done that when `closed`
 * fires) — it just prevents us from trying to operate on a destroyed
 * window.
 *
 * @returns {void}
 */
function cleanupWindow() {
  if (mainWindow) {
    mainWindow = null;
  }
}

module.exports = {
  createWindow,
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  isWindowVisible,
  focusMainWindow,
  setQuitting,
  setPendingQuit,
  setCloseToTray,
  getCloseToTray,
  getIsQuitting,
  getPendingQuit,
  cleanupWindow,
};
