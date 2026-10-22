/**
 * @file Store-level constants (default sidebar config + file extensions).
 *
 * The sidebar config is persisted in electron-store and drives:
 * - Which items are visible
 * - Their order and section
 * - Which items are pinned (top of the sidebar)
 * - Which sections are "fixed" (sticky at top/bottom of the scroll area)
 *
 * The default config is seeded on first launch (or after a "Reset" in the
 * Sidebar editor). Missing pages are re-added on hydration (see
 * `store/index.js`) so a config from an older version doesn't lose pages.
 *
 * @see src/core/store/index.js (hydrate + reconcile logic)
 * @see @shared/components/navigation/SidebarEditor (editor UI)
 */

import { NAV_ITEMS, ACTION_IDS } from '@shared/constants/navigation'

/** Default order of pages when no custom config exists. */
const DEFAULT_ITEM_ORDER = [
  'home',
  'discover',
  'trimmer',
  'editor',
  'sequencer',
  'youtube',
  'stats',
  'emoji',
  'loop',
  'shortcuts',
  'presentation',
  'guide',
  'options',
]

/**
 * Default sidebar configuration (used on first launch and on "Reset").
 *
 * `label` is a fallback — the actual display label is resolved via i18n
 * in `Sidebar.jsx` (`getItemLabel`). Profiles are appended by
 * `store/index.js` at hydration time (their IDs are user-generated).
 */
export const DEFAULT_SIDEBAR_CONFIG = {
  mode: 'default',
  items: DEFAULT_ITEM_ORDER.map((id, order) => ({
    id,
    group: NAV_ITEMS[id]?.group || 'navigation',
    label: id,
    icon: NAV_ITEMS[id]?.icon || 'ti-circle',
    visible: true,
    pinned: false,
    order,
    canHide: !ACTION_IDS.includes(id),
  })),
}

/**
 * Maximum number of undo/redo entries in the editor history.
 * @type {number}
 */
export const EDITOR_HISTORY_LIMIT = 50

/**
 * Extensions supported by the audio import (file picker + drag & drop).
 * @type {string[]}
 */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'ogg',
  'flac',
  'm4a',
  'aac',
  'opus',
  'webm',
]

/**
 * Extensions supported by the image picker (custom sound covers).
 * @type {string[]}
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
]