/**
 * @file Global keyboard shortcuts manager for the Electron main process.
 *
 * Responsibilities:
 * - Register every user-configured global shortcut (sound play, profile
 *   switch, loop toggle, stop-all, presentation) at boot
 * - Handle the "shortcuts enabled/disabled" master toggle (persisted in
 *   the store under `globalShortcutsEnabled`)
 * - Handle the "toggle window visibility" shortcut (separate from the
 *   master toggle)
 * - Expose `update-*` IPC channels so the renderer can persist new
 *   accelerators and re-register them live
 *
 * Shortcuts are only effective while the app is running (registered via
 * `globalShortcut.register()`). If another app grabs the same key
 * combo, registration silently fails — hence the `safeRegister` wrapper
 * which catches the exception and logs a warning.
 *
 * All registered accelerators are kept in `registeredShortcuts` so a
 * full cleanup (`unregisterAllShortcuts`) can happen before a re-register
 * (called by `reregisterShortcuts`).
 *
 * @see ./windowManager.js — `getMainWindow()` used by IPC handlers
 * @see ../store.js — persists `globalShortcutsEnabled` + individual
 *      accelerators under `shortcuts`, `profileShortcut`, `loopShortcut`,
 *      `stopAllShortcut`, `presentationShortcut`,
 *      `toggleShortcutsAccelerator`, `toggleWindowShortcut`.
 * @see ../preload.js — exposes the `update-*` and `toggle-global-shortcuts`
 *      channels to the renderer.
 */

const { globalShortcut, ipcMain } = require("electron");
const store = require("../store");

/**
 * Master on/off flag for global shortcuts. Toggled by the tray menu
 * ("Raccourcis" submenu) and by the renderer's Options page.
 *
 * Initialized from the store so the state survives app restarts.
 *
 * @type {boolean}
 */
let globalShortcutsEnabled = store.get("globalShortcutsEnabled", true);

/**
 * Every accelerator successfully registered via `safeRegister()`.
 *
 * Kept so `unregisterAllShortcuts()` can clean them up in one shot
 * (used before a re-register).
 *
 * @type {string[]}
 */
let registeredShortcuts = [];

/**
 * Currently registered accelerator for "toggle main window visibility".
 *
 * Persisted separately because its behavior differs from the other
 * shortcuts (it hides/shows the window, not plays sounds). The default
 * is `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS).
 *
 * @type {string}
 */
let currentToggleWindowShortcut = "CommandOrControl+Shift+S";

// ─── REGISTRATION HELPERS ───────────────────────────────────────────────

/**
 * Registers a global shortcut, catching any error from
 * `globalShortcut.register()` (some accelerators throw on invalid syntax
 * or on OS-level conflicts).
 *
 * On success, the accelerator is pushed to `registeredShortcuts` so it
 * can be unregistered later.
 *
 * @param {string} accelerator - Accelerator string (e.g. `'Ctrl+1'`,
 *   `'CommandOrControl+Shift+S'`).
 * @param {() => void} callback - Function invoked when the shortcut fires.
 * @returns {boolean} `true` if registered, `false` otherwise.
 */
function safeRegister(accelerator, callback) {
  if (!accelerator) return false;
  try {
    const ok = globalShortcut.register(accelerator, callback);
    if (ok) registeredShortcuts.push(accelerator);
    return ok;
  } catch (e) {
    console.warn("Raccourci non supporté:", accelerator, e.message);
    return false;
  }
}

/**
 * Unregisters every accelerator currently tracked in
 * `registeredShortcuts`, then clears the list.
 *
 * @returns {void}
 */
function unregisterAllShortcuts() {
  registeredShortcuts.forEach((acc) => {
    try {
      globalShortcut.unregister(acc);
    } catch {
      // Some accelerators might already be unregistered by the OS
    }
  });
  registeredShortcuts = [];
  console.log("🔇 Tous les raccourcis désenregistrés");
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────

/**
 * Registers every user-configured global shortcut.
 *
 * Reads accelerators from the store and wires each one to an
 * `ipcRenderer.send` of the corresponding event on the main window:
 *
 * | Store key               | WebContents event          |
 * |-------------------------|----------------------------|
 * | `shortcuts[soundId]`    | `play-sound` (soundId)     |
 * | `profileShortcut`       | `switch-profile`           |
 * | `loopShortcut`          | `toggle-loop`              |
 * | `stopAllShortcut`       | `stop-all-sounds`          |
 * | `presentationShortcut`  | `toggle-presentation`      |
 *
 * No-op if `globalShortcutsEnabled` is `false`.
 *
 * @param {import('electron').BrowserWindow | null} mainWindow - The
 *   window that receives the IPC messages.
 * @returns {void}
 */
function registerShortcuts(mainWindow) {
  if (!globalShortcutsEnabled) {
    console.log("🔇 Raccourcis globaux désactivés");
    return;
  }

  // Per-sound shortcuts: `shortcuts` is `{ [soundId]: accelerator }`
  const shortcuts = store.get("shortcuts", {});
  Object.entries(shortcuts).forEach(([soundId, accelerator]) => {
    if (!accelerator) return;
    safeRegister(accelerator, () => {
      mainWindow?.webContents.send("play-sound", soundId);
    });
  });

  // Profile switch
  const profileShortcut = store.get("profileShortcut", "");
  if (profileShortcut) {
    safeRegister(profileShortcut, () => {
      mainWindow?.webContents.send("switch-profile");
    });
  }

  // Loop toggle
  const loopShortcut = store.get("loopShortcut", "");
  if (loopShortcut) {
    safeRegister(loopShortcut, () => {
      mainWindow?.webContents.send("toggle-loop");
    });
  }

  // Stop all sounds
  const stopAllShortcut = store.get("stopAllShortcut", "");
  if (stopAllShortcut) {
    safeRegister(stopAllShortcut, () => {
      mainWindow?.webContents.send("stop-all-sounds");
    });
  }

  // Presentation mode toggle
  const presentationShortcut = store.get("presentationShortcut", "");
  if (presentationShortcut) {
    safeRegister(presentationShortcut, () => {
      mainWindow?.webContents.send("toggle-presentation");
    });
  }

  console.log("✅ Raccourcis globaux activés");
}

/**
 * Unregisters then re-registers every shortcut.
 *
 * Called after the user saves new accelerators in the Options page so
 * the changes take effect immediately (without restart). Also notifies
 * the renderer of the current enabled/disabled state.
 *
 * @param {import('electron').BrowserWindow | null} mainWindow
 * @returns {void}
 */
function reregisterShortcuts(mainWindow) {
  unregisterAllShortcuts();
  if (globalShortcutsEnabled) {
    registerShortcuts(mainWindow);
  }
  if (mainWindow) {
    mainWindow.webContents.send("shortcuts-toggle", globalShortcutsEnabled);
  }
}

/**
 * Toggles the master `globalShortcutsEnabled` flag.
 *
 * - Persists the new value in the store
 * - Registers or unregisters shortcuts accordingly
 * - Notifies the renderer via `shortcuts-toggle`
 *
 * @param {import('electron').BrowserWindow | null} mainWindow
 * @returns {boolean} The new state (`true` = enabled).
 */
function toggleGlobalShortcuts(mainWindow) {
  globalShortcutsEnabled = !globalShortcutsEnabled;
  store.set("globalShortcutsEnabled", globalShortcutsEnabled);

  if (globalShortcutsEnabled) {
    registerShortcuts(mainWindow);
  } else {
    unregisterAllShortcuts();
  }

  if (mainWindow) {
    mainWindow.webContents.send("shortcuts-toggle", globalShortcutsEnabled);
  }

  return globalShortcutsEnabled;
}

/**
 * Registers the "toggle master shortcuts" accelerator.
 *
 * A separate shortcut (default: `Ctrl+Shift+K`) that enables/disables
 * the master switch from anywhere, without going through the tray or
 * the Options page. Its own accelerator is stored under
 * `toggleShortcutsAccelerator`.
 *
 * @param {import('electron').BrowserWindow | null} mainWindow
 * @returns {void}
 */
function registerToggleShortcut(mainWindow) {
  const toggleAccelerator = store.get(
    "toggleShortcutsAccelerator",
    "CommandOrControl+Shift+K",
  );
  if (!toggleAccelerator) return;

  try {
    // Re-register: unregister first in case an old accelerator is active
    globalShortcut.unregister(toggleAccelerator);

    const ok = globalShortcut.register(toggleAccelerator, () => {
      globalShortcutsEnabled = !globalShortcutsEnabled;
      store.set("globalShortcutsEnabled", globalShortcutsEnabled);

      if (globalShortcutsEnabled) {
        registerShortcuts(mainWindow);
      } else {
        unregisterAllShortcuts();
      }

      if (mainWindow) {
        mainWindow.webContents.send("shortcuts-toggle", globalShortcutsEnabled);
      }
    });

    if (ok) {
      console.log("✅ Raccourci toggle enregistré:", toggleAccelerator);
    } else {
      console.warn(
        "⚠️ Impossible d'enregistrer le raccourci toggle:",
        toggleAccelerator,
      );
    }
  } catch (e) {
    console.warn("Erreur enregistrement toggle:", e.message);
  }
}

/**
 * Registers the "toggle main window visibility" accelerator.
 *
 * Shows the window if it's hidden, hides it if it's visible. Its
 * accelerator is stored under `toggleWindowShortcut` (default:
 * `Ctrl+Shift+S`).
 *
 * Called from `main.js` at boot and from the
 * `update-toggle-window-shortcut` IPC handler.
 *
 * @param {import('electron').BrowserWindow | null} mainWindow
 * @param {string} [shortcut] - New accelerator. If omitted, uses the
 *   current one (or the persisted value).
 * @returns {void}
 */
function registerToggleWindowShortcut(mainWindow, shortcut) {
  if (!shortcut) {
    shortcut = currentToggleWindowShortcut;
  }

  try {
    globalShortcut.unregister(currentToggleWindowShortcut);
  } catch {
    // Ignore — the accelerator may not have been registered yet
  }

  if (!shortcut) {
    console.log("ℹ️ Raccourci toggle fenêtre désactivé");
    return;
  }

  try {
    const ok = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    if (ok) {
      currentToggleWindowShortcut = shortcut;
      console.log(
        `✅ Raccourci pour toggle la fenêtre enregistré: ${shortcut}`,
      );
    } else {
      console.warn(`⚠️ Impossible d'enregistrer le raccourci: ${shortcut}`);
    }
  } catch (e) {
    console.warn("Erreur enregistrement toggle fenêtre:", e.message);
  }
}

// ─── QUERIES ────────────────────────────────────────────────────────────

/**
 * Returns the current master on/off state of the shortcuts.
 *
 * @returns {boolean}
 */
function getShortcutsEnabled() {
  return globalShortcutsEnabled;
}

/**
 * Returns the list of currently registered accelerators.
 *
 * @returns {string[]}
 */
function getRegisteredShortcuts() {
  return registeredShortcuts;
}

// ─── CLEANUP ────────────────────────────────────────────────────────────

/**
 * Full cleanup: unregisters every tracked accelerator + any other
 * registered shortcut (defensive). Called on `before-quit`.
 *
 * @returns {void}
 */
function cleanupShortcuts() {
  unregisterAllShortcuts();
  globalShortcut.unregisterAll();
}

// ─── IPC HANDLERS ───────────────────────────────────────────────────────

/**
 * Registers every shortcut-related IPC handler.
 *
 * Must be called once, during app startup (see `electron/main.js`).
 *
 * Channels registered:
 * - `update-shortcuts`                    `(shortcuts) -> true`
 * - `update-profile-shortcut`             `(acc) -> true`
 * - `update-loop-shortcut`                `(acc) -> void`
 * - `update-stop-all-shortcut`            `(acc) -> true`
 * - `update-presentation-shortcut`        `(acc) -> void`
 * - `update-toggle-shortcuts-accelerator` `(acc) -> true`
 * - `update-toggle-window-shortcut`       `(acc) -> true`
 * - `toggle-global-shortcuts`             `() -> boolean`
 *
 * All `update-*` handlers persist the accelerator in the store, then
 * re-register everything (`reregisterShortcuts`) so the change takes
 * effect immediately.
 *
 * @returns {void}
 */
function registerShortcutHandlers() {
  console.log("🔧 [shortcutManager] Enregistrement des handlers IPC...");
  const getMain = () => require("./windowManager").getMainWindow();

  /**
   * Re-registers all shortcuts against the current main window.
   * @returns {void}
   */
  const reregister = () => {
    const w = getMain();
    reregisterShortcuts(w);
  };

  // Replace the entire per-sound shortcuts map
  if (!ipcMain.eventNames().includes("update-shortcuts")) {
    ipcMain.handle("update-shortcuts", (event, shortcuts) => {
      store.set("shortcuts", shortcuts);
      reregister();
      return true;
    });
  }

  // Profile switch shortcut
  if (!ipcMain.eventNames().includes("update-profile-shortcut")) {
    ipcMain.handle("update-profile-shortcut", (event, accelerator) => {
      store.set("profileShortcut", accelerator);
      reregister();
      return true;
    });
  }

  // Loop toggle shortcut
  if (!ipcMain.eventNames().includes("update-loop-shortcut")) {
    ipcMain.handle("update-loop-shortcut", (event, accelerator) => {
      store.set("loopShortcut", accelerator);
      reregister();
    });
  }

  // Stop-all shortcut
  if (!ipcMain.eventNames().includes("update-stop-all-shortcut")) {
    ipcMain.handle("update-stop-all-shortcut", (event, accelerator) => {
      store.set("stopAllShortcut", accelerator);
      reregister();
      return true;
    });
  }

  // Presentation toggle shortcut
  if (!ipcMain.eventNames().includes("update-presentation-shortcut")) {
    ipcMain.handle("update-presentation-shortcut", (event, accelerator) => {
      store.set("presentationShortcut", accelerator);
      reregister();
    });
  }

  // Master "toggle shortcuts" accelerator
  if (!ipcMain.eventNames().includes("update-toggle-shortcuts-accelerator")) {
    ipcMain.handle(
      "update-toggle-shortcuts-accelerator",
      (event, accelerator) => {
        store.set("toggleShortcutsAccelerator", accelerator);
        const w = getMain();
        if (w) registerToggleShortcut(w);
        return true;
      },
    );
  }

  // "Toggle window visibility" accelerator
  if (!ipcMain.eventNames().includes("update-toggle-window-shortcut")) {
    ipcMain.handle("update-toggle-window-shortcut", (event, accelerator) => {
      store.set("toggleWindowShortcut", accelerator);
      const w = getMain();
      if (w) registerToggleWindowShortcut(w, accelerator);
      return true;
    });
  }

  // Master on/off toggle (called from the renderer's Options page)
  if (!ipcMain.eventNames().includes("toggle-global-shortcuts")) {
    ipcMain.handle("toggle-global-shortcuts", () => {
      const mainWindow = require("./windowManager").getMainWindow();
      return toggleGlobalShortcuts(mainWindow);
    });
  }

  console.log("✅ [shortcutManager] Handlers IPC enregistrés");
}

// ─── EXPORTS ────────────────────────────────────────────────────────────

module.exports = {
  registerShortcuts,
  reregisterShortcuts,
  toggleGlobalShortcuts,
  registerToggleShortcut,
  registerToggleWindowShortcut,
  getShortcutsEnabled,
  getRegisteredShortcuts,
  cleanupShortcuts,
  unregisterAllShortcuts,
  registerShortcutHandlers,
};
