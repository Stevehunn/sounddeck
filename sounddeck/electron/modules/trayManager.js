/**
 * @file System tray icon manager for the Electron main process.
 *
 * Responsibilities:
 * - Create the tray icon (once)
 * - Build its context menu (open / shortcuts / startup prefs / quit)
 * - Rebuild the menu when the app language changes
 * - Destroy the icon on quit
 *
 * The menu is bilingual: all labels come from `TRAY_LABELS`, keyed by
 * language code (`fr` / `en` / `es`). Language changes are propagated
 * from `main.js` via `updateTrayMenu(newLang, callbacks)` — no restart
 * required.
 *
 * The tray icon path resolution is dev/prod aware: in dev it loads
 * from `public/`, in prod it tries `app.getAppPath()/dist/` first, then
 * `process.resourcesPath/` as a fallback.
 *
 * Double-click on the tray icon triggers `onDoubleClick` (typically
 * "show and focus the main window").
 *
 * @see ./windowManager.js — `showMainWindow()` is wired as `onOpen`
 * @see ../main.js — where `createTray` / `updateTrayMenu` are called
 */

const { Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const store = require("../store");

/**
 * Tray instance. Set once by `createTray()`; cleared by `destroyTray()`.
 * @type {import('electron').Tray | null}
 */
let tray = null;

/**
 * Defensive alias for `tray` (used by tests to check idempotency).
 * @type {import('electron').Tray | null}
 */
let trayInstance = null;

// ─── LANGUAGE LABELS ────────────────────────────────────────────────────

/**
 * All tray menu labels, keyed by language code.
 *
 * ⚠️ This is a **user-facing translation table** — do not translate
 * the keys, only the values.
 *
 * Each language must provide:
 * - `open` — "Open SoundDeck" (double-click behavior)
 * - `shortcuts` — submenu title
 * - `shortcutsOn` — submenu item when shortcuts are enabled (action:
 *   disable them)
 * - `shortcutsOff` — submenu item when shortcuts are disabled (action:
 *   enable them)
 * - `launchAtStartup` — "Launch at startup" checkbox label
 * - `startMinimized` — "Start minimized" checkbox label
 * - `quit` — "Quit SoundDeck"
 *
 * @type {Record<'fr' | 'en' | 'es', Record<string, string>>}
 */
const TRAY_LABELS = {
  fr: {
    open: "Ouvrir SoundDeck",
    shortcuts: "Raccourcis",
    shortcutsOn: "Désactiver les raccourcis",
    shortcutsOff: "Activer les raccourcis",
    launchAtStartup: "Lancer au démarrage",
    startMinimized: "Démarrer en arrière-plan",
    quit: "Quitter SoundDeck",
  },
  en: {
    open: "Open SoundDeck",
    shortcuts: "Shortcuts",
    shortcutsOn: "Disable shortcuts",
    shortcutsOff: "Enable shortcuts",
    launchAtStartup: "Launch at startup",
    startMinimized: "Start minimized",
    quit: "Quit SoundDeck",
  },
  es: {
    open: "Abrir SoundDeck",
    shortcuts: "Atajos",
    shortcutsOn: "Desactivar atajos",
    shortcutsOff: "Activar atajos",
    launchAtStartup: "Iniciar al arrancar",
    startMinimized: "Iniciar minimizado",
    quit: "Salir de SoundDeck",
  },
};

// ─── PUBLIC API ─────────────────────────────────────────────────────────

/**
 * Returns the app's current UI language (falls back to `'fr'`).
 *
 * Used by `main.js` when it needs the language for the initial
 * `createTray()` call.
 *
 * @returns {string} The language code (`'fr' | 'en' | 'es'`).
 */
function getCurrentTrayLanguage() {
  return store.get("lang", "fr");
}

/**
 * Builds the tray context menu for a given language + callback set.
 *
 * Menu structure:
 * - **Open** (calls `onOpen`)
 * - **Shortcuts** ▸ **<shortcutsOn or shortcutsOff>** (calls
 *   `onToggleShortcuts`)
 * - ─ separator ─
 * - **Launch at startup** (checkbox, state from store, calls
 *   `onLaunchAtStartup(checked)`)
 * - **Start minimized** (checkbox, state from store, calls
 *   `onStartMinimized(checked)`)
 * - ─ separator ─
 * - **Quit** (calls `onQuit`)
 *
 * @param {string} lang - Language code (`'fr' | 'en' | 'es'`).
 * @param {Object} callbacks
 * @param {() => void} [callbacks.onOpen]
 * @param {() => void} [callbacks.onToggleShortcuts]
 * @param {(checked: boolean) => void} [callbacks.onLaunchAtStartup]
 * @param {(checked: boolean) => void} [callbacks.onStartMinimized]
 * @param {() => void} [callbacks.onQuit]
 * @returns {import('electron').Menu} The built menu (caller must call
 *   `tray.setContextMenu(menu)`).
 */
function buildTrayMenu(lang, callbacks) {
  const labels = TRAY_LABELS[lang] || TRAY_LABELS.fr;
  const shortcutsEnabled = store.get("globalShortcutsEnabled", true);

  return Menu.buildFromTemplate([
    {
      label: labels.open,
      click: () => callbacks.onOpen?.(),
    },
    {
      label: labels.shortcuts,
      submenu: [
        {
          label: shortcutsEnabled ? labels.shortcutsOn : labels.shortcutsOff,
          click: () => callbacks.onToggleShortcuts?.(),
        },
      ],
    },
    { type: "separator" },
    {
      label: labels.launchAtStartup,
      type: "checkbox",
      checked: store.get("launchAtStartup", false),
      click: (menuItem) => callbacks.onLaunchAtStartup?.(menuItem.checked),
    },
    {
      label: labels.startMinimized,
      type: "checkbox",
      checked: store.get("startMinimized", false),
      click: (menuItem) => callbacks.onStartMinimized?.(menuItem.checked),
    },
    { type: "separator" },
    {
      label: labels.quit,
      click: () => callbacks.onQuit?.(),
    },
  ]);
}

/**
 * Creates the tray icon and sets up its initial context menu.
 *
 * Idempotent — if a tray icon already exists, this is a no-op. That
 * lets `main.js` call it safely on every `ready-to-show` without
 * spawning duplicates.
 *
 * Icon resolution:
 * - **Dev** (`!app.isPackaged`): `public/logo sd cadre.ico`
 * - **Prod**: `app.getAppPath()/dist/logo sd cadre.ico`, then
 *   `process.resourcesPath/logo sd cadre.ico`
 * - If neither exists: `nativeImage.createEmpty()` (no crash)
 *
 * The icon is resized to 16×16 for the system tray.
 *
 * @param {string} [lang='fr'] - Initial language for the menu labels.
 * @param {Object} [callbacks={}] - See `buildTrayMenu` for the callback
 *   signatures. `onDoubleClick` is also supported here and wired to the
 *   tray's `double-click` event.
 * @returns {void}
 */
function createTray(lang = "fr", callbacks = {}) {
  if (trayInstance) {
    console.log("ℹ️ Une icône du tray existe déjà");
    return;
  }

  const isDev = !require("electron").app.isPackaged;

  let iconPath;
  if (isDev) {
    iconPath = path.join(__dirname, "../../public/logo sd cadre.ico");
  } else {
    iconPath = path.join(
      require("electron").app.getAppPath(),
      "dist",
      "logo sd cadre.ico",
    );
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, "logo sd cadre.ico");
    }
  }

  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }

  const trayIcon = icon.resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  trayInstance = tray;
  tray.setToolTip("SoundDeck - Soundboard");

  const contextMenu = buildTrayMenu(lang, callbacks);
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    callbacks.onDoubleClick?.();
  });
}

/**
 * Rebuilds the tray menu for a new language / new state.
 *
 * Called from `main.js` whenever the language changes, when the
 * "shortcuts enabled" state toggles, or when the launch preferences
 * change. No-op if no tray icon exists.
 *
 * @param {string} lang - New language code.
 * @param {Object} callbacks - Same callback set as `createTray`.
 * @returns {void}
 */
function updateTrayMenu(lang, callbacks) {
  if (tray) {
    const contextMenu = buildTrayMenu(lang, callbacks);
    tray.setContextMenu(contextMenu);
  }
}

/**
 * Destroys the tray icon and clears the module-level state.
 *
 * Called on `before-quit` from `main.js`. Safe to call multiple times.
 *
 * @returns {void}
 */
function destroyTray() {
  if (trayInstance) {
    try {
      trayInstance.destroy();
      trayInstance = null;
      tray = null;
      console.log("🧹 Icône du tray nettoyée");
    } catch (e) {
      console.warn("⚠️ Erreur lors du nettoyage du tray:", e);
    }
  }
}

/**
 * Returns the current tray instance (or `null` if not created /
 * already destroyed).
 *
 * @returns {import('electron').Tray | null}
 */
function getTray() {
  return tray;
}

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray,
  getTray,
  TRAY_LABELS,
  getCurrentTrayLanguage,
};
