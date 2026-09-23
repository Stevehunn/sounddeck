// src/shared/constants/navigation.js

/**
 * Éléments de navigation par défaut
 * Source de vérité unique pour Sidebar, SidebarEditor et PluginManager
 */
export const NAV_ITEMS = {
  home: { icon: 'ti-home', group: 'navigation' },
  discover: { icon: 'ti-compass', group: 'navigation' },
  trimmer: { icon: 'ti-cut', group: 'navigation' },
  editor: { icon: 'ti-wand', group: 'navigation' },
  sequencer: { icon: 'ti-playlist', group: 'navigation' },
  youtube: { icon: 'ti-brand-youtube', group: 'navigation' },
  stats: { icon: 'ti-chart-bar', group: 'navigation' },
  emoji: { icon: 'ti-mood-smile', group: 'navigation' },

  loop: { icon: 'ti-repeat', group: 'actions' },
  shortcuts: { icon: 'ti-keyboard', group: 'actions' },
  presentation: { icon: 'ti-layout-grid', group: 'actions' },

  guide: { icon: 'ti-book', group: 'footer' },
  options: { icon: 'ti-settings', group: 'footer' },
}

/**
 * IDs qui ne peuvent pas être masqués ni réordonnés librement
 */
export const ACTION_IDS = ['loop', 'shortcuts', 'presentation']

/**
 * Ordre par défaut des sections de la sidebar
 */
export const DEFAULT_SECTION_ORDER = [
  'pinned',
  'profiles',
  'navigation',
  'actions',
  'footer',
]

/**
 * Map dérivée : id → icône
 */
export const DEFAULT_ICONS = Object.fromEntries(
  Object.entries(NAV_ITEMS).map(([id, item]) => [id, item.icon])
)

/**
 * Map dérivée : id → groupe
 */
export const DEFAULT_GROUPS = Object.fromEntries(
  Object.entries(NAV_ITEMS).map(([id, item]) => [id, item.group])
)

export default {
  NAV_ITEMS,
  ACTION_IDS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_ICONS,
  DEFAULT_GROUPS,
}