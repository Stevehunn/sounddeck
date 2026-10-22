/**
 * @file Single source of truth for core pages.
 *
 * Consumed by: `PluginManager`, `Sidebar`, `SidebarEditor`,
 * `store/utils/constants`.
 */

/**
 * Canonical definition of every core page.
 *
 * @type {Array<{
 *   id: string,
 *   labelKey: string,
 *   icon: string,
 *   group: 'navigation'|'actions'|'footer',
 *   canHide?: boolean,
 * }>}
 */
export const CORE_PAGES = [
  // ─── Main navigation ─────────────────────────────────────────────────
  { id: 'home',        labelKey: 'mySounds',       icon: 'ti-home',              group: 'navigation' },
  { id: 'discover',    labelKey: 'discover',       icon: 'ti-compass',           group: 'navigation' },
  { id: 'trimmer',     labelKey: 'trimmer',        icon: 'ti-cut',               group: 'navigation' },
  { id: 'editor',      labelKey: 'editor',         icon: 'ti-wand',              group: 'navigation' },
  { id: 'sequencer',   labelKey: 'sequencer',      icon: 'ti-playlist',          group: 'navigation' },
  { id: 'youtube',     labelKey: 'youtube',        icon: 'ti-brand-youtube',     group: 'navigation' },
  { id: 'stats',       labelKey: 'stats',          icon: 'ti-chart-bar',         group: 'navigation' },
  { id: 'emoji',       labelKey: 'emojiPageTitle', icon: 'ti-mood-smile',        group: 'navigation' },

  // ─── Actions (rendered in the "⚡ Actions" section) ────────────────────
  { id: 'loop',         labelKey: 'loop',         icon: 'ti-repeat',            group: 'actions', canHide: false },
  { id: 'shortcuts',    labelKey: 'shortcuts',    icon: 'ti-keyboard',          group: 'actions', canHide: false },
  { id: 'presentation', labelKey: 'presentation', icon: 'ti-layout-grid',       group: 'actions', canHide: false },

  // ─── Footer (always at the bottom) ─────────────────────────────────
  { id: 'guide',        labelKey: 'guide',        icon: 'ti-book',              group: 'footer' },
  { id: 'options',      labelKey: 'options',      icon: 'ti-settings',          group: 'footer' },
]

/**
 * Set of IDs for O(1) lookups.
 * @type {Set<string>}
 */
export const CORE_PAGE_IDS = new Set(CORE_PAGES.map((p) => p.id))

/**
 * Map `id → full definition`.
 * @type {Map<string, Object>}
 */
export const CORE_PAGES_MAP = new Map(CORE_PAGES.map((p) => [p.id, p]))

/**
 * Default order of core pages (used by `DEFAULT_SIDEBAR_CONFIG`).
 * @type {string[]}
 */
export const DEFAULT_ITEM_ORDER = CORE_PAGES.map((p) => p.id)