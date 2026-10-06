// src/core/services/SoundPopupService.js

export const POPUP_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const VALID_SIZES = ["small", "medium", "large"];

let _enabled = true;
let _position = "top-right";
let _size = "medium";
let _theme = "dark";
let _customTheme = null;

function getAPI() {
  return typeof window !== "undefined" ? window.electronAPI?.soundPopup : null;
}

// ─── INIT ─────────────────────────────────────────────────────────────────
export function initSoundPopup({
  enabled = true,
  position = "top-right",
  size = "medium",
  theme = "dark",
  customTheme = null,
} = {}) {
  _enabled = !!enabled;
  _position = POPUP_POSITIONS.includes(position) ? position : "top-right";
  _size = VALID_SIZES.includes(size) ? size : "medium";
  _theme = theme;
  _customTheme = customTheme;

  const api = getAPI();
  api?.setEnabled?.(_enabled);
  api?.setPosition?.(_position);
  api?.setSize?.(_size);
}

// ─── ENABLED ──────────────────────────────────────────────────────────────
export function isPopupEnabled() {
  return _enabled;
}

export function setPopupEnabled(enabled) {
  _enabled = !!enabled;
  getAPI()?.setEnabled?.(_enabled);
}

// ─── POSITION ─────────────────────────────────────────────────────────────
export function getPopupPosition() {
  return _position;
}

export function setPopupPosition(position) {
  if (!POPUP_POSITIONS.includes(position)) return;
  _position = position;
  getAPI()?.setPosition?.(_position);
}

// ─── SIZE ─────────────────────────────────────────────────────────────────
export function getPopupSize() {
  return _size;
}

export function setPopupSize(size) {
  if (!VALID_SIZES.includes(size)) return;
  _size = size;
  getAPI()?.setSize?.(_size);
}

// ─── THEME (mémorisé pour injection dans la popup) ────────────────────────
export function setPopupTheme(theme, customTheme) {
  _theme = theme || "dark";
  _customTheme = customTheme || null;
}

// ─── SHOW / HIDE ──────────────────────────────────────────────────────────
export function showSoundPopup({
  name,
  emoji,
  image,
  duration,
  index,
  total,
  hideDelay = 3500,
  cardSize,
} = {}) {
  if (!_enabled) return;
  const api = getAPI();
  if (!api?.show) return;

  // Si cardSize est fourni, il prime sur _size
  const size = VALID_SIZES.includes(cardSize) ? cardSize : _size;
  if (size !== _size) {
    _size = size;
    api?.setSize?.(size);
  }

  api.show({
    name,
    emoji,
    image,
    duration,
    index,
    total,
    hideDelay,
    cardSize: size,
    theme: _theme,
    customTheme: _customTheme,
  });
}

export function hideSoundPopup() {
  getAPI()?.hide?.();
}

export function previewSoundPopup(payload = {}) {
  const api = getAPI();
  if (!api?.preview) return;
  api.preview({
    name: payload.name || "Exemple de son",
    emoji: payload.emoji || "🔊",
    image: payload.image || null,
    duration: payload.duration ?? 12.4,
    index: payload.index ?? 2,
    total: payload.total ?? 5,
    hideDelay: 6000,
    cardSize: payload.cardSize || _size,
    theme: payload.theme || _theme,
    customTheme: payload.customTheme ?? _customTheme,
    position: payload.position || _position,
  });
}

export function onSoundPopupAction(cb) {
  const api = getAPI();
  if (!api?.onAction) return () => {};
  return api.onAction(cb);
}
