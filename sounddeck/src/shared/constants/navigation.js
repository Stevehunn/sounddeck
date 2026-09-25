// src/shared/constants/navigation.js
// ⚠️ DÉPRÉCIÉ — conservé pour compat. Utiliser `pages.js` directement.
import { CORE_PAGES, CORE_PAGE_IDS, CORE_PAGES_MAP, DEFAULT_ITEM_ORDER } from './pages'

/**
 * Map rétro-compat : { [id]: { icon, group } }
 * @deprecated Utiliser CORE_PAGES_MAP
 */
export const NAV_ITEMS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, { icon: p.icon, group: p.group }])
)

/** @deprecated Utiliser `canHide` dans CORE_PAGES */
export const ACTION_IDS = CORE_PAGES
  .filter((p) => p.canHide === false)
  .map((p) => p.id)

export const DEFAULT_SECTION_ORDER = [
  'pinned', 'profiles', 'navigation', 'actions', 'footer',
]

export const DEFAULT_ICONS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, p.icon])
)

export const DEFAULT_GROUPS = Object.fromEntries(
  CORE_PAGES.map((p) => [p.id, p.group])
)

export { CORE_PAGES, CORE_PAGE_IDS, CORE_PAGES_MAP, DEFAULT_ITEM_ORDER }

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