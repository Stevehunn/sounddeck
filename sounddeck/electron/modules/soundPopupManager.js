// electron/modules/soundPopupManager.js
const { BrowserWindow, screen, app } = require("electron");
const path = require("path");

const POPUP_SIZES = {
  small: { width: 320, height: 92 },
  medium: { width: 400, height: 108 },
  large: { width: 480, height: 124 },
};

const EDGE_MARGIN = 20;
// Safety net : le renderer gère le vrai timing d'auto-hide (4500ms).
// Le main process ne fait que garantir qu'on ne reste pas affiché
// indéfiniment si le renderer crash.
const DEFAULT_HIDE_DELAY = 8000;

const DEFAULT_SIZE = "medium";

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

let popupWindow = null;
let hideTimer = null;
let popupEnabled = true;
let popupPosition = "top-right";
let popupSize = DEFAULT_SIZE;
let mainWindowGetter = () => null;
let isHovering = false;

function resolveSize(size) {
  return POPUP_SIZES[size] ? size : DEFAULT_SIZE;
}

function getSizeDimensions(size) {
  return POPUP_SIZES[resolveSize(size)];
}

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

function resolvePopupUrl() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return "http://localhost:5173/src/popup/index.html";
  }
  return `file://${path.join(__dirname, "..", "..", "dist", "src", "popup", "index.html")}`;
}

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
    // Fond transparent explicite (fix rectangle noir Windows)
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

function ensurePopupWindow() {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow();
  }
  return popupWindow;
}

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

function sendPopupUpdate(payload, positionOverride) {
  const win = ensurePopupWindow();
  if (!win || win.isDestroyed()) return;

  const doSend = () => {
    if (!win || win.isDestroyed()) return;
    // positionOverride permet à la preview d'afficher la popup
    //    à un endroit précis SANS toucher à la position validée.
    applySizeAndPosition(win, positionOverride);
    win.webContents.send("sound-popup:update", payload);
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", doSend);
  } else {
    doSend();
  }
}

function resetHideTimer(delay = DEFAULT_HIDE_DELAY) {
  if (isHovering) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    hidePopupWindow();
  }, delay);
}

function showSoundPopup(payload = {}) {
  if (!popupEnabled) return;

  if (payload.cardSize) {
    popupSize = resolveSize(payload.cardSize);
  }

  isHovering = false;
  sendPopupUpdate(payload);
  resetHideTimer(payload.hideDelay || DEFAULT_HIDE_DELAY);
}

function previewSoundPopup(payload = {}) {
  if (payload.cardSize) {
    popupSize = resolveSize(payload.cardSize);
  }
  isHovering = false;

  // Utilise la position passée en preview (fallback : position courante)
  const previewPosition = VALID_POSITIONS.includes(payload.position)
    ? payload.position
    : popupPosition;

  sendPopupUpdate({ ...payload, hideDelay: 6000 }, previewPosition);
  resetHideTimer(6000);
}

function hidePopupWindow() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
  }
}

function destroyPopupWindow() {
  hidePopupWindow();
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.destroy();
  }
  popupWindow = null;
}

function setEnabled(enabled) {
  popupEnabled = !!enabled;
  if (!popupEnabled) hidePopupWindow();
}

function setPosition(position) {
  if (!VALID_POSITIONS.includes(position)) return;
  popupPosition = position;
  if (popupWindow && !popupWindow.isDestroyed()) {
    applySizeAndPosition(popupWindow);
  }
}

function setSize(size) {
  popupSize = resolveSize(size);
  if (popupWindow && !popupWindow.isDestroyed()) {
    applySizeAndPosition(popupWindow);
  }
}

function registerSoundPopupHandlers(ipcMain, { getMainWindow } = {}) {
  mainWindowGetter = getMainWindow || (() => null);

  ipcMain.handle("sound-popup:show", (_e, payload) => {
    showSoundPopup(payload);
    return true;
  });
  ipcMain.handle("sound-popup:hide", () => {
    hidePopupWindow();
    return true;
  });
  ipcMain.handle("sound-popup:set-enabled", (_e, enabled) => {
    setEnabled(enabled);
    return true;
  });
  ipcMain.handle("sound-popup:set-position", (_e, pos) => {
    setPosition(pos);
    return true;
  });
  ipcMain.handle("sound-popup:set-size", (_e, size) => {
    setSize(size);
    return true;
  });
  ipcMain.handle("sound-popup:preview", (_e, payload) => {
    previewSoundPopup(payload);
    return true;
  });

  // Le renderer signale qu'il a peint le contenu → on affiche la fenêtre
  ipcMain.on("sound-popup:ready", () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      try {
        popupWindow.showInactive();
      } catch {
        /* noop */
      }
    }
  });

  // Hover : met en pause / relance le timer côté main
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

  ipcMain.on("sound-popup:action", (_e, action) => {
    const main = mainWindowGetter();
    if (main && !main.isDestroyed()) {
      main.webContents.send("sound-popup:action", action);
    }
  });
  ipcMain.on("sound-popup:request-hide", () => {
    hidePopupWindow();
  });

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
