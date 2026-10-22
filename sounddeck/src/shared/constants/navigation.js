/**
 * @file Sidebar navigation constants (DEPRECATED — use `./pages.js` directly).
 *
 * Retained for backward compatibility. New code should import directly
 * from `./pages.js`.
 *
 * @deprecated Use `CORE_PAGES_MAP`, `CORE_PAGE_IDS`, and
 *   `DEFAULT_ITEM_ORDER` from `./pages.js`.
 */

import {
  CORE_PAGES,
  CORE_PAGE_IDS,
  CORE_PAGES_MAP,
  DEFAULT_ITEM_ORDER,
} from './pages'

/**
 * Backward-compat map: `{ [id]: { icon, group } }`.
 * @deprecated Use `CORE_PAGES_MAP`.
 */
export const NAV_ITEMS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, { icon: p.icon, group: p.group }])
)

/**
 * IDs of action items (items that cannot be hidden).
 * @deprecated Use `canHide` in `CORE_PAGES`.
 */
export const ACTION_IDS = CORE_PAGES
  .filter((p) => p.canHide === false)
  .map((p) => p.id)

/**
 * Default order of sidebar sections.
 */
export const DEFAULT_SECTION_ORDER = [
  'pinned',
  'profiles',
  'navigation',
  'actions',
  'footer',
]

/**
 * Default icon for each core page ID.
 */
export const DEFAULT_ICONS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, p.icon])
)

/**
 * Default group for each core page ID.
 */
export const DEFAULT_GROUPS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, p.group])
)

export {
  CORE_PAGES,
  CORE_PAGE_IDS,
  CORE_PAGES_MAP,
  DEFAULT_ITEM_ORDER,
}

export default {
  NAV_ITEMS,
  ACTION_IDS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_ICONS,
  DEFAULT_GROUPS,
  CORE_PAGES,
  CORE_PAGE_IDS,
  CORE_PAGES_MAP,
  DEFAULT_ITEM_ORDER,
}