/**
 * @file Electron main process entry point.
 *
 * Responsibilities:
 * - Single-instance lock (prevent launching two SoundDeck windows)
 * - Create the main BrowserWindow (via `windowManager`)
 * - Register all IPC handlers (store, files, shortcuts, tray, projects, …)
 * - Inject feedback webhooks from `feedback-config.js` into the store
 * - Initialize the auto-updater
 * - Manage the system tray icon
 * - Handle app lifecycle (close-to-tray, minimize-on-close, quit confirmation)
 *
 * The renderer (React app in `src/`) never has direct access to Node.js —
 * all communication goes through the secure context bridge in `preload.js`.
 *
 * @see ./preload.js
 * @see ./modules/autoUpdater.js
 * @see ./modules/index.js
 */

const { app, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const {
  storeHandlers,
  windowManager,
  trayManager,
  shortcutManager,
  ipcHandlers,
  fileHandlers,
  diagnostic,
  protocolHandler,
  registerProjectHandlers,
} = require("./modules");

const { registerSoundPopupHandlers } = require("./modules/soundPopupManager");
const { initAutoUpdater } = require("./modules/autoUpdater");

const store = require("./store");

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK WEBHOOKS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initializes the feedback webhooks from `feedback-config.js` (if present)
 * and from environment variables (which take precedence).
 *
 * This must run **before** the main window is created, because the renderer
 * reads `feedbackWebhookUrl` / `feedbackWebhookUrls` from the store on boot.
 *
 * Priority order (highest to lowest):
 * 1. `SOUNDDECK_FEEDBACK_WEBHOOK*` environment variables
 * 2. Values from `feedback-config.js`
 * 3. Existing values already present in the store (never overwritten)
 *
 * @returns {void}
 */
function initFeedbackWebhooks() {
  try {
    let fileConfig = {};
    try {
      // eslint-disable-next-line global-require
      fileConfig = require("./feedback-config");
    } catch (e) {
      // No config file — that's fine
    }

    // ─── 1. Default webhook ─────────────────────────────────────────
    const envDefault = process.env.SOUNDDECK_FEEDBACK_WEBHOOK;
    const fileDefault = fileConfig?.default;
    const finalDefault = envDefault || fileDefault;

    const existingDefault = store.get("feedbackWebhookUrl");
    if (finalDefault && !existingDefault) {
      store.set("feedbackWebhookUrl", finalDefault);
    }

    // ─── 2. Per-type webhooks ──────────────────────────────────────
    const envPerType = {
      bug: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_BUG,
      feature: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_FEATURE,
      question: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_QUESTION,
      praise: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_PRAISE,
    };
    const filePerType = fileConfig?.perType || {};

    const finalPerType = {};
    for (const type of ["bug", "feature", "question", "praise"]) {
      const v = envPerType[type] || filePerType[type];
      if (v) finalPerType[type] = v;
    }

    const existingPerType = store.get("feedbackWebhookUrls") || {};
    const mergedPerType = { ...finalPerType, ...existingPerType };

    const hasNew = Object.keys(finalPerType).some(
      (k) => finalPerType[k] && !existingPerType[k],
    );
    if (hasNew) {
      store.set("feedbackWebhookUrls", mergedPerType);
    }

    // ─── 3. Summary log (dev only) ─────────────────────────────────
    if (!app.isPackaged) {
      const finalDefaultState = store.get("feedbackWebhookUrl");
      const finalPerTypeState = store.get("feedbackWebhookUrls") || {};
      console.log("📬 [feedback-config] Final state:", {
        default: finalDefaultState ? "(set)" : "(empty)",
        perType:
          Object.keys(finalPerTypeState).length > 0
            ? Object.keys(finalPerTypeState)
            : "(none)",
      });
    }
  } catch (e) {
    console.warn("⚠️ [feedback-config] Init error:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════════════════════════════════════════

// Remove the native menu bar
Menu.setApplicationMenu(null);

protocolHandler.registerLocalSchemes();

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
let isQuitting = false;

const isDev = !app.isPackaged;

// ─── Single instance lock ────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  windowManager.focusMainWindow();
});

// ─── Data directories ────────────────────────────────────────────────────

const soundsDir = path.join(app.getPath("userData"), "sounds");
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });

const shouldStartMinimized = store.get("startMinimized", false);

// ═══════════════════════════════════════════════════════════════════════════
// IPC HANDLERS REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registers every IPC handler exposed by the main process.
 *
 * Must be called once, after `mainWindow` has been created.
 *
 * Modules registered:
 * - Store (get/set/delete)
 * - Project handlers (editor projects)
 * - Global shortcuts
 * - System handlers (system language, keyboard layout, etc.)
 * - File handlers (dialogs, import/export, trimming)
 * - Quit confirmation
 * - Diagnostics (logs, error reports)
 * - Tray update handler
 * - Sound popup (separate window)
 *
 * @returns {void}
 */
function registerAllHandlers() {
  if (
    storeHandlers &&
    typeof storeHandlers.registerStoreHandlers === "function"
  ) {
    storeHandlers.registerStoreHandlers();
  } else {
    console.error("❌ storeHandlers.registerStoreHandlers is not a function!");
  }

  registerProjectHandlers(store);

  if (
    shortcutManager &&
    typeof shortcutManager.registerShortcutHandlers === "function"
  ) {
    shortcutManager.registerShortcutHandlers();
  }

  if (ipcHandlers && typeof ipcHandlers.registerSystemHandlers === "function") {
    ipcHandlers.registerSystemHandlers();
  }

  if (fileHandlers && typeof fileHandlers.registerFileHandlers === "function") {
    fileHandlers.registerFileHandlers(mainWindow, soundsDir);
  }

  if (
    ipcHandlers &&
    typeof ipcHandlers.registerConfirmHandlers === "function"
  ) {
    ipcHandlers.registerConfirmHandlers(windowManager);
  }

  if (
    diagnostic &&
    typeof diagnostic.registerDiagnosticHandlers === "function"
  ) {
    diagnostic.registerDiagnosticHandlers();
  }

  if (
    ipcHandlers &&
    typeof ipcHandlers.registerTrayUpdateHandler === "function"
  ) {
    ipcHandlers.registerTrayUpdateHandler(() => {
      updateTrayMenu();
    });
  }

  registerSoundPopupHandlers(ipcMain, { getMainWindow: () => mainWindow });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WINDOW CREATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates the main window, registers all IPC handlers, and wires up the
 * tray icon, global shortcuts, and auto-updater.
 *
 * @returns {import('electron').BrowserWindow} The created window.
 */
function createMainWindow() {
  mainWindow = windowManager.createWindow(shouldStartMinimized);

  registerAllHandlers();

  // Auto-updater (safe in dev: it just logs "disabled")
  initAutoUpdater(() => mainWindow);

  mainWindow.once("ready-to-show", () => {
    const lang = store.get("lang", "fr");

    trayManager.createTray(lang, {
      onOpen: () => {
        windowManager.showMainWindow();
      },
      onToggleShortcuts: () => {
        shortcutManager.toggleGlobalShortcuts(mainWindow);
        updateTrayMenu();
      },
      onLaunchAtStartup: (checked) => {
        store.set("launchAtStartup", checked);
      },
      onStartMinimized: (checked) => {
        store.set("startMinimized", checked);
      },
      onQuit: () => {
        isQuitting = true;
        app.quit();
      },
      onDoubleClick: () => {
        windowManager.showMainWindow();
      },
    });

    shortcutManager.registerShortcuts(mainWindow);
    shortcutManager.registerToggleShortcut(mainWindow);

    const savedToggleWindowShortcut = store.get(
      "toggleWindowShortcut",
      "CommandOrControl+Shift+S",
    );
    shortcutManager.registerToggleWindowShortcut(
      mainWindow,
      savedToggleWindowShortcut,
    );

    if (!shouldStartMinimized) {
      mainWindow.show();
    }

    if (isDev) {
      setTimeout(() => {
        diagnostic.runFullDiagnostic();
      }, 3000);
    }
  });

  mainWindow.on("close", (e) => {
    const closeToTray = store.get("closeToTray", true);

    if (isQuitting) return;

    if (closeToTray === false) {
      isQuitting = true;
      app.quit();
      return;
    }

    e.preventDefault();
    mainWindow.webContents.send("show-quit-confirm");
  });

  mainWindow.on("closed", () => {
    windowManager.cleanupWindow();
  });

  return mainWindow;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAY MENU
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rebuilds the tray menu with the current language and preferences.
 *
 * Called on startup, and whenever the language changes or the "shortcuts"
 * state is toggled via the tray menu.
 *
 * @returns {void}
 */
function updateTrayMenu() {
  const lang = store.get("lang", "fr");
  trayManager.updateTrayMenu(lang, {
    onOpen: () => windowManager.showMainWindow(),
    onToggleShortcuts: () => {
      shortcutManager.toggleGlobalShortcuts(mainWindow);
      setTimeout(() => updateTrayMenu(), 100);
    },
    onLaunchAtStartup: (checked) => {
      store.set("launchAtStartup", checked);
    },
    onStartMinimized: (checked) => {
      store.set("startMinimized", checked);
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
    onDoubleClick: () => {
      windowManager.showMainWindow();
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  protocolHandler.registerLocalFileProtocol();

  // Store the current app version in electron-store so the renderer and
  // the auto-updater hook can compare it against the latest GitHub release.
  try {
    store.set("appVersion", app.getVersion());
  } catch (e) {
    console.warn("⚠️ Failed to store appVersion:", e.message);
  }

  // Inject feedback webhooks (before creating the window)
  initFeedbackWebhooks();

  // Clean up orphan shortcuts (sounds that were deleted)
  const sounds = store.get("sounds", []);
  const soundIds = new Set(sounds.map((s) => s.id));
  const shortcuts = store.get("shortcuts", {});
  let hasChanges = false;

  Object.keys(shortcuts).forEach((id) => {
    if (!soundIds.has(id)) {
      delete shortcuts[id];
      hasChanges = true;
    }
  });

  if (hasChanges) {
    store.set("shortcuts", shortcuts);
  }

  // First-launch language detection
  const systemLang = app.getLocale().split("-")[0];
  const supportedLangs = ["fr", "en", "es"];
  const savedLang = store.get("lang");

  if (!savedLang && supportedLangs.includes(systemLang)) {
    store.set("lang", systemLang);
  }

  await createMainWindow();

  app.on("activate", () => {
    if (!mainWindow) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (isQuitting) {
    shortcutManager.cleanupShortcuts();
    trayManager.destroyTray();
    app.quit();
    return;
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  shortcutManager.cleanupShortcuts();
  trayManager.destroyTray();
});
