// src/shared/constants/pages.js
// ─────────────────────────────────────────────────────────────────────────────
// ✅ SOURCE DE VÉRITÉ UNIQUE pour toutes les pages core.
// Utilisé par : PluginManager, Sidebar, SidebarEditor, store/utils/constants.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Définition canonique de chaque page core.
 *  - id       : identifiant unique (route)
 *  - labelKey : clé i18n (via t())
 *  - icon     : icône Tabler
 *  - group    : groupe sidebar (navigation/actions/footer)
 *  - pinned   : épinglé par défaut (dans la section "📌 Pinned")
 *  - canHide  : si false, ne peut pas être masqué (actions uniquement)
 */
export const CORE_PAGES = [
  // ─── Navigation principale ──────────────────────────────────────────────
  { id: 'home',        labelKey: 'mySounds',       icon: 'ti-home',              group: 'navigation' },
  { id: 'discover',    labelKey: 'discover',       icon: 'ti-compass',           group: 'navigation' },
  { id: 'trimmer',     labelKey: 'trimmer',        icon: 'ti-cut',               group: 'navigation' },
  { id: 'editor',      labelKey: 'editor',         icon: 'ti-wand',              group: 'navigation' },
  { id: 'sequencer',   labelKey: 'sequencer',      icon: 'ti-playlist',          group: 'navigation' },
  { id: 'youtube',     labelKey: 'youtube',        icon: 'ti-brand-youtube',     group: 'navigation' },
  { id: 'stats',       labelKey: 'stats',          icon: 'ti-chart-bar',         group: 'navigation' },
  { id: 'emoji',       labelKey: 'emojiPageTitle', icon: 'ti-mood-smile',        group: 'navigation' },

  // ─── Actions (visibles dans la section "⚡ Actions") ───────────────────
  { id: 'loop',         labelKey: 'loop',         icon: 'ti-repeat',            group: 'actions', canHide: false },
  { id: 'shortcuts',    labelKey: 'shortcuts',    icon: 'ti-keyboard',          group: 'actions', canHide: false },
  { id: 'presentation', labelKey: 'presentation', icon: 'ti-layout-grid',       group: 'actions', canHide: false },

  // ─── Footer (toujours en bas) ─────────────────────────────────────────
  { id: 'guide',        labelKey: 'guide',        icon: 'ti-book',              group: 'footer' },
  { id: 'options',      labelKey: 'options',      icon: 'ti-settings',          group: 'footer' },
]

/** Set d'IDs pour lookups O(1). */
export const CORE_PAGE_IDS = new Set(CORE_PAGES.map((p) => p.id))

/** Map id → définition complète. */
export const CORE_PAGES_MAP = new Map(CORE_PAGES.map((p) => [p.id, p]))

/** Ordre par défaut (utilisé par DEFAULT_SIDEBAR_CONFIG). */
export const DEFAULT_ITEM_ORDER = CORE_PAGES.map((p) => p.id)