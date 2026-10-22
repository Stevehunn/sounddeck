/**
 * @file Sound popup — renders a floating notification when a sound plays.
 *
 * The actual popup window is a separate Electron `BrowserWindow` (see
 * `SoundPopupWindow.jsx` + `electron/modules/soundPopupManager.js`).
 * This service is a **thin wrapper** that:
 * - Stores the current user preferences (enabled, position, size, theme).
 * - Routes calls to the Electron API (`window.electronAPI.soundPopup`).
 * - Accepts and normalizes the payload sent to the popup.
 *
 * Positions are 3×3 grid corners/edges (excluding the center, which would
 * obstruct the app). Each popup auto-hides after `hideDelay` ms.
 *
 * @see src/popup/SoundPopupWindow.jsx — the actual popup renderer
 * @see electron/modules/soundPopupManager.js — window lifecycle
 */

/**
 * Available popup positions.
 * @type {string[]}
 */
export const POPUP_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

/** Allowed card sizes (must match the SoundCard sizes). */
const VALID_SIZES = ['small', 'medium', 'large']

let _enabled = true
let _position = 'top-right'
let _size = 'medium'
let _theme = 'dark'
let _customTheme = null

/**
 * Returns the Electron sound-popup API (or `null` when unavailable).
 * @returns {Object|null}
 */
function getAPI() {
  return typeof window !== 'undefined' ? window.electronAPI?.soundPopup : null
}

// ─── INIT ─────────────────────────────────────────────────────────────

/**
 * Initializes the service from persisted preferences.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]
 * @param {string} [options.position='top-right']
 * @param {'small'|'medium'|'large'} [options.size='medium']
 * @param {string} [options.theme='dark']
 * @param {Object|null} [options.customTheme=null]
 * @returns {void}
 */
export function initSoundPopup({
  enabled = true,
  position = 'top-right',
  size = 'medium',
  theme = 'dark',
  customTheme = null,
} = {}) {
  _enabled = !!enabled
  _position = POPUP_POSITIONS.includes(position) ? position : 'top-right'
  _size = VALID_SIZES.includes(size) ? size : 'medium'
  _theme = theme
  _customTheme = customTheme

  const api = getAPI()
  api?.setEnabled?.(_enabled)
  api?.setPosition?.(_position)
  api?.setSize?.(_size)
}

// ─── ENABLED ──────────────────────────────────────────────────────────

/**
 * Returns whether the popup is enabled.
 * @returns {boolean}
 */
export function isPopupEnabled() {
  return _enabled
}

/**
 * Enables / disables the popup.
 * @param {boolean} enabled
 * @returns {void}
 */
export function setPopupEnabled(enabled) {
  _enabled = !!enabled
  getAPI()?.setEnabled?.(_enabled)
}

// ─── POSITION ─────────────────────────────────────────────────────────

/**
 * Returns the current popup position.
 * @returns {string}
 */
export function getPopupPosition() {
  return _position
}

/**
 * Sets the popup position (ignored if invalid).
 * @param {string} position
 * @returns {void}
 */
export function setPopupPosition(position) {
  if (!POPUP_POSITIONS.includes(position)) return
  _position = position
  getAPI()?.setPosition?.(_position)
}

// ─── SIZE ─────────────────────────────────────────────────────────────

/**
 * Returns the current popup size.
 * @returns {'small'|'medium'|'large'}
 */
export function getPopupSize() {
  return _size
}

/**
 * Sets the popup size (ignored if invalid).
 * @param {'small'|'medium'|'large'} size
 * @returns {void}
 */
export function setPopupSize(size) {
  if (!VALID_SIZES.includes(size)) return
  _size = size
  getAPI()?.setSize?.(_size)
}

// ─── THEME (cached for injection into the popup) ──────────────────────

/**
 * Stores the current theme (used when the popup is shown).
 * @param {string} theme
 * @param {Object|null} customTheme
 * @returns {void}
 */
export function setPopupTheme(theme, customTheme) {
  _theme = theme || 'dark'
  _customTheme = customTheme || null
}

// ─── SHOW / HIDE ──────────────────────────────────────────────────────

/**
 * Shows the popup for a playing sound.
 *
 * The `cardSize` option overrides the persisted `_size` when provided
 * (e.g. when a sound is played with a specific card size).
 *
 * @param {Object} [options]
 * @param {string} [options.name]
 * @param {string} [options.emoji]
 * @param {string|null} [options.image]
 * @param {number} [options.duration]
 * @param {number} [options.index] - 1-based index in a multi-sound play.
 * @param {number} [options.total] - Total sounds being played.
 * @param {number} [options.hideDelay=3500] - Auto-hide delay (ms).
 * @param {'small'|'medium'|'large'} [options.cardSize]
 * @returns {void}
 */
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
  if (!_enabled) return
  const api = getAPI()
  if (!api?.show) return

  // `cardSize` (if valid) takes precedence over `_size`.
  const size = VALID_SIZES.includes(cardSize) ? cardSize : _size
  if (size !== _size) {
    _size = size
    api?.setSize?.(size)
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
  })
}

/**
 * Hides the popup.
 * @returns {void}
 */
export function hideSoundPopup() {
  getAPI()?.hide?.()
}

/**
 * Shows a preview of the popup (used in the Options → Sound popup section).
 *
 * Falls back to sensible defaults so the preview always renders something.
 *
 * @param {Object} [payload]
 * @returns {void}
 */
export function previewSoundPopup(payload = {}) {
  const api = getAPI()
  if (!api?.preview) return
  api.preview({
    name: payload.name || 'Sample sound',
    emoji: payload.emoji || '🔊',
    image: payload.image || null,
    duration: payload.duration ?? 12.4,
    index: payload.index ?? 2,
    total: payload.total ?? 5,
    hideDelay: 6000,
    cardSize: payload.cardSize || _size,
    theme: payload.theme || _theme,
    customTheme: payload.customTheme ?? _customTheme,
    position: payload.position || _position,
  })
}

/**
 * Subscribes to action events from the popup (prev/pause/next buttons).
 *
 * @param {(action: {type: string}) => void} cb
 * @returns {() => void} Unsubscribe function (no-op if API unavailable).
 */
export function onSoundPopupAction(cb) {
  const api = getAPI()
  if (!api?.onAction) return () => {}
  return api.onAction(cb)
}