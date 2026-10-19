/**
 * @file Separate "sound popup" window manager.
 *
 * SoundDeck shows a small transparent popup overlay when a sound is
 * played (either for real playback or for a preview in Options). This
 * module owns the popup's entire lifecycle:
 *
 * - **Creation** — a frameless, transparent, always-on-top BrowserWindow
 *   that loads `src/popup/index.html`
 * - **Positioning** — 8 predefined anchors (top/bottom × left/center/right)
 *   relative to the primary display's work area, plus a fixed 20px edge
 *   margin
 * - **Sizing** — 3 presets (small / medium / large), matching the
 *   sidebar's `cardSize` config
 * - **Auto-hide** — a `setTimeout`-based safety net (the renderer sends
 *   its own auto-hide at ~4500ms; the main-process timer at 8000ms is
 *   just a "don't stay forever if the renderer crashes" guard)
 * - **Hover-to-pause** — the renderer notifies via `sound-popup:hover`
 *   so we don't hide while the user is reading/clicking the popup
 * - **IPC** — expose show / hide / preview / set-enabled / set-position
 *   / set-size to the renderer, and forward `sound-popup:action` events
 *   (next / prev / play-pause from the popup's own buttons) back to the
 *   main window
 *
 * The popup uses a **separate preload** (`preload-popup.js`) with a
 * minimal API surface — it only needs to receive `update` payloads and
 * send back `ready` / `hover` / `action` / `request-hide`.
 *
 * @see ../preload.js — main window's `soundPopup` namespace (invokes)
 * @see ../preload-popup.js — popup window's bridge
 * @see ../../src/popup/index.html — the popup's React entry
 */

const { BrowserWindow, screen, app } = require("electron");
const path = require("path");

// ─── SIZE PRESETS ───────────────────────────────────────────────────────

/**
 * Preset dimensions (in pixels) for the popup, keyed by `cardSize`.
 *
 * - `small` — compact, icon + name only
 * - `medium` — default, icon + name + meta
 * - `large` — larger font + bigger preview
 *
 * @type {Record<'small' | 'medium' | 'large', { width: number, height: number }>}
 */
const POPUP_SIZES = {
  small: { width: 320, height: 92 },
  medium: { width: 400, height: 108 },
  large: { width: 480, height: 124 },
};

/** Margin (in px) between the popup and the display's work-area edge. */
const EDGE_MARGIN = 20;

/**
 * Safety-net auto-hide delay, in milliseconds.
 *
 * The renderer manages its own auto-hide (~4500ms). This value is only
 * used by the main process to guarantee the popup doesn't stay visible
 * forever if the renderer crashes or is busy.
 */
const DEFAULT_HIDE_DELAY = 8000;

/** Size used when the requested preset is invalid or missing. */
const DEFAULT_SIZE = "medium";

/**
 * The 8 supported anchor positions.
 *
 * Matches the `position` value passed to `setPosition()` and the
 * payload sent by the renderer's `soundPopup.preview()`.
 *
 * @type {string[]}
 */
const VALID_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

// ─── MODULE STATE ───────────────────────────────────────────────────────

/**
 * The popup BrowserWindow (or `null` before creation / after destroy).
 * @type {import('electron').BrowserWindow | null}
 */
let popupWindow = null;

/**
 * Handle for the current auto-hide `setTimeout`.
 * @type {NodeJS.Timeout | null}
 */
let hideTimer = null;

/**
 * Master on/off flag. Set from `setEnabled()`. When `false`, calls to
 * `showSoundPopup()` / `previewSoundPopup()` become no-ops.
 * @type {boolean}
 */
let popupEnabled = true;

/**
 * Current anchor position. One of `VALID_POSITIONS`.
 * @type {string}
 */
let popupPosition = "top-right";

/**
 * Current size preset. One of `POPUP_SIZES`'s keys.
 * @type {string}
 */
let popupSize = DEFAULT_SIZE;

/**
 * Callback injected by `main.js` to resolve the main window, used to
 * forward `sound-popup:action` events to the renderer.
 * @type {() => import('electron').BrowserWindow | null}
 */
let mainWindowGetter = () => null;

/**
 * Whether the user is currently hovering the popup. When `true`, the
 * auto-hide timer is paused.
 * @type {boolean}
 */
let isHovering = false;

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Returns a valid size key, or `DEFAULT_SIZE` if the input is unknown.
 *
 * @param {string} size
 * @returns {string}
 */
function resolveSize(size) {
  return POPUP_SIZES[size] ? size : DEFAULT_SIZE;
}

/**
 * Returns the `{ width, height }` dimensions for a given size preset.
 *
 * @param {string} size
 * @returns {{ width: number, height: number }}
 */
function getSizeDimensions(size) {
  return POPUP_SIZES[resolveSize(size)];
}

/**
 * Returns the `{ x, y }` screen coordinates for a given anchor position.
 *
 * Uses `screen.getPrimaryDisplay().workArea` so the popup is never
 * covered by the taskbar or the macOS dock.
 *
 * @param {string} position - One of `VALID_POSITIONS`.
 * @param {string} size - Size preset key.
 * @returns {{ x: number, y: number }}
 */
function getPositionCoords(position, size) {
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  const dims = getSizeDimensions(size);
  const W = dims.width;
  const H = dims.height;

  const x = area.x;
  const y = area.y;
  const w = area.width;
  const h = area.height;

  const map = {
    "top-left": { x: x + EDGE_MARGIN, y: y + EDGE_MARGIN },
    "top-center": { x: x + Math.round((w - W) / 2), y: y + EDGE_MARGIN },
    "top-right": { x: x + w - W - EDGE_MARGIN, y: y + EDGE_MARGIN },
    "center-left": { x: x + EDGE_MARGIN, y: y + Math.round((h - H) / 2) },
    "center-right": {
      x: x + w - W - EDGE_MARGIN,
      y: y + Math.round((h - H) / 2),
    },
    "bottom-left": { x: x + EDGE_MARGIN, y: y + h - H - EDGE_MARGIN },
    "bottom-center": {
      x: x + Math.round((w - W) / 2),
      y: y + h - H - EDGE_MARGIN,
    },
    "bottom-right": { x: x + w - W - EDGE_MARGIN, y: y + h - H - EDGE_MARGIN },
  };
  return map[position] || map["top-right"];
}

/**
 * Returns the URL to load into the popup BrowserWindow.
 *
 * In dev, points to the Vite dev server. In prod, resolves to the
 * built `dist/src/popup/index.html`.
 *
 * @returns {string}
 */
function resolvePopupUrl() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return "http://localhost:5173/src/popup/index.html";
  }
  return `file://${path.join(__dirname, "..", "..", "dist", "src", "popup", "index.html")}`;
}

// ─── WINDOW LIFECYCLE ───────────────────────────────────────────────────

/**
 * Creates the popup BrowserWindow.
 *
 * Properties:
 * - **Frameless**, **transparent**, no shadow, no resize handles
 * - **`skipTaskbar`** — never appears in the Windows taskbar
 * - **`alwaysOnTop`** with level `"screen-saver"` — stays above other
 *   windows, including fullscreen apps
 * - **`focusable`** but not focused on show (`showInactive`) — clicks
 *   inside still work without stealing focus from the game/chat
 * - **`backgroundColor: "#00000000"`** — explicit transparent background
 *   (a known Windows workaround for a visible black rectangle)
 *
 * @returns {import('electron').BrowserWindow}
 */
function createPopupWindow() {
  const coords = getPositionCoords(popupPosition, popupSize);
  const dims = getSizeDimensions(popupSize);

  popupWindow = new BrowserWindow({
    width: dims.width,
    height: dims.height,
    x: coords.x,
    y: coords.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    hasShadow: false,
    acceptFirstMouse: true,
    // Explicit transparent background (fix for the black rectangle
    // that sometimes appears on Windows with `transparent: true`).
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload-popup.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  popupWindow.setAlwaysOnTop(true, "screen-saver");
  popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  popupWindow.loadURL(resolvePopupUrl());

  popupWindow.on("closed", () => {
    popupWindow = null;
    isHovering = false;
  });

  return popupWindow;
}

/**
 * Returns the popup window, creating it if it doesn't exist or was
 * destroyed.
 *
 * @returns {import('electron').BrowserWindow}
 */
function ensurePopupWindow() {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
  }
  return popupWindow;
}

/**
 * Repositions and resizes the popup according to `popupSize` +
 * `popupPosition` (or a temporary override).
 *
 * @param {import('electron').BrowserWindow} win
 * @param {string} [positionOverride] - Temporary position (used by
 *   `previewSoundPopup` so the preview shows at the chosen anchor
 *   without changing the user's validated position).
 * @returns {void}
 */
function applySizeAndPosition(win, positionOverride) {
  if (!win || win.isDestroyed()) return;
  const pos =
    positionOverride && VALID_POSITIONS.includes(positionOverride)
      ? positionOverride
      : popupPosition;
  const dims = getSizeDimensions(popupSize);
  const coords = getPositionCoords(pos, popupSize);
  win.setBounds({
    x: coords.x,
    y: coords.y,
    width: dims.width,
    height: dims.height,
  });
}

/**
 * Sends the payload to the popup's renderer (`sound-popup:update`).
 *
 * If the renderer hasn't finished loading yet (e.g. cold start), waits
 * for `did-finish-load` before sending. Otherwise sends immediately.
 *
 * @param {Object} payload - Sound metadata (name, emoji, duration, …).
 * @param {string} [positionOverride] - Temporary anchor.
 * @returns {void}
 */
function sendPopupUpdate(payload, positionOverride) {
  const win = ensurePopupWindow();
  if (!win || win.isDestroyed()) return;

  const doSend = () => {
    if (!win || win.isDestroyed()) return;
    // `positionOverride` lets the preview show the popup at a specific
    // anchor WITHOUT permanently changing the user's validated position.
    applySizeAndPosition(win, positionOverride);
    win.webContents.send("sound-popup:update", payload);
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", doSend);
  } else {
    doSend();
  }
}

/**
 * (Re)starts the safety-net auto-hide timer.
 *
 * No-op while the user is hovering the popup (`isHovering === true`).
 *
 * @param {number} [delay=DEFAULT_HIDE_DELAY] - Delay before hiding, in ms.
 * @returns {void}
 */
function resetHideTimer(delay = DEFAULT_HIDE_DELAY) {
  if (isHovering) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    hidePopupWindow();
  }, delay);
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────

/**
 * Shows the popup with the given payload (real playback).
 *
 * Behavior:
 * - No-op if the popup is disabled (`setEnabled(false)`)
 * - Updates `popupSize` if `payload.cardSize` is present
 * - Sends the payload (creating the window if needed)
 * - Schedules auto-hide based on `payload.hideDelay` (or default)
 *
 * @param {Object} [payload={}] - Sound metadata + optional `cardSize`
 *   and `hideDelay`.
 * @returns {void}
 */
function showSoundPopup(payload = {}) {
  if (!popupEnabled) return;

  if (payload.cardSize) {
    popupSize = resolveSize(payload.cardSize);
  }

  isHovering = false;
  sendPopupUpdate(payload);
  resetHideTimer(payload.hideDelay || DEFAULT_HIDE_DELAY);
}

/**
 * Shows the popup in **preview mode** (from the Options UI).
 *
 * Preview differs from a real `showSoundPopup` in 2 ways:
 * - It uses `payload.position` as the anchor (so the user can see what
 *   each position looks like without persisting it)
 * - It forces a 6-second auto-hide regardless of the payload
 *
 * @param {Object} [payload={}]
 * @returns {void}
 */
function previewSoundPopup(payload = {}) {
  if (payload.cardSize) {
    popupSize = resolveSize(payload.cardSize);
  }
  isHovering = false;

  // Use the preview position if valid, else the persisted one
  const previewPosition = VALID_POSITIONS.includes(payload.position)
    ? payload.position
    : popupPosition;

  sendPopupUpdate({ ...payload, hideDelay: 6000 }, previewPosition);
  resetHideTimer(6000);
}

/**
 * Hides the popup window and cancels any pending auto-hide timer.
 *
 * @returns {void}
 */
function hidePopupWindow() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
  }
}

/**
 * Destroys the popup window and clears all state.
 *
 * Called on `before-quit`.
 *
 * @returns {void}
 */
function destroyPopupWindow() {
  hidePopupWindow();
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.destroy();
  }
  popupWindow = null;
}

/**
 * Enables / disables the popup globally. If disabling while the popup
 * is visible, it is hidden immediately.
 *
 * @param {boolean} enabled
 * @returns {void}
 */
function setEnabled(enabled) {
  popupEnabled = !!enabled;
  if (!popupEnabled) hidePopupWindow();
}

/**
 * Changes the persisted anchor position. Silently ignored if the
 * position is unknown.
 *
 * @param {string} position - One of `VALID_POSITIONS`.
 * @returns {void}
 */
function setPosition(position) {
  if (!VALID_POSITIONS.includes(position)) return;
  popupPosition = position;
  if (popupWindow && !popupWindow.isDestroyed()) {
    applySizeAndPosition(popupWindow);
  }
}

/**
 * Changes the persisted size preset.
 *
 * @param {string} size - One of `POPUP_SIZES`'s keys.
 * @returns {void}
 */
function setSize(size) {
  popupSize = resolveSize(size);
  if (popupWindow && !popupWindow.isDestroyed()) {
    applySizeAndPosition(popupWindow);
  }
}

// ─── IPC HANDLERS ───────────────────────────────────────────────────────

/**
 * Registers every popup-related IPC channel.
 *
 * Must be called once, during app startup (see `electron/main.js`).
 *
 * **Invoke channels** (`ipcMain.handle`):
 * - `sound-popup:show`          `(payload) -> true`
 * - `sound-popup:hide`          `() -> true`
 * - `sound-popup:set-enabled`   `(enabled) -> true`
 * - `sound-popup:set-position`  `(pos) -> true`
 * - `sound-popup:set-size`      `(size) -> true`
 * - `sound-popup:preview`       `(payload) -> true`
 *
 * **Fire-and-forget listeners** (`ipcMain.on`):
 * - `sound-popup:ready`        — renderer has painted → `showInactive()`
 * - `sound-popup:hover`        — pause / resume the auto-hide timer
 * - `sound-popup:action`       — forward next/prev/play-pause to the main
 *                                 window's renderer
 * - `sound-popup:request-hide` — hide now
 *
 * Also registers a `before-quit` hook to destroy the popup window.
 *
 * @param {import('electron').IpcMain} ipcMain - Injected for testability.
 * @param {Object} [options={}]
 * @param {() => import('electron').BrowserWindow | null} [options.getMainWindow]
 *   Callback returning the main app window (used to forward
 *   `sound-popup:action` events).
 * @returns {void}
 */
function registerSoundPopupHandlers(ipcMain, { getMainWindow } = {}) {
  mainWindowGetter = getMainWindow || (() => null);

  // Show the popup with the given payload (real playback).
  ipcMain.handle("sound-popup:show", (_e, payload) => {
    showSoundPopup(payload);
    return true;
  });

  // Hide the popup immediately.
  ipcMain.handle("sound-popup:hide", () => {
    hidePopupWindow();
    return true;
  });

  // Enable / disable the popup globally.
  ipcMain.handle("sound-popup:set-enabled", (_e, enabled) => {
    setEnabled(enabled);
    return true;
  });

  // Persist a new anchor position.
  ipcMain.handle("sound-popup:set-position", (_e, pos) => {
    setPosition(pos);
    return true;
  });

  // Persist a new size preset.
  ipcMain.handle("sound-popup:set-size", (_e, size) => {
    setSize(size);
    return true;
  });

  // Preview the popup in the Options UI.
  ipcMain.handle("sound-popup:preview", (_e, payload) => {
    previewSoundPopup(payload);
    return true;
  });

  // The renderer signals it has painted the content → show the window.
  ipcMain.on("sound-popup:ready", () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      try {
        popupWindow.showInactive();
      } catch {
        /* noop — window may already be gone */
      }
    }
  });

  // Hover: pause / resume the auto-hide timer.
  ipcMain.on("sound-popup:hover", (_e, hovering) => {
    isHovering = !!hovering;
    if (isHovering) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    } else {
      resetHideTimer();
    }
  });

  // Forward a click on the popup's buttons (next / prev / play-pause)
  // to the main window's renderer.
  ipcMain.on("sound-popup:action", (_e, action) => {
    const main = mainWindowGetter();
    if (main && !main.isDestroyed()) {
      main.webContents.send("sound-popup:action", action);
    }
  });

  // Immediate hide request (e.g. on close button).
  ipcMain.on("sound-popup:request-hide", () => {
    hidePopupWindow();
  });

  // Destroy the popup window when the app quits.
  app.on("before-quit", () => {
    destroyPopupWindow();
  });
}

module.exports = {
  registerSoundPopupHandlers,
  showSoundPopup,
  previewSoundPopup,
  hidePopupWindow,
  destroyPopupWindow,
  setEnabled,
  setPosition,
  setSize,
  POPUP_SIZES,
};
