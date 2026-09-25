// src/core/plugins/PluginManager/constants.js
import { CORE_PAGES as CORE_PAGES_DEFS } from '@shared/constants/pages'

// ─── CLÉS STORE ─────────────────────────────────────────────────────────
export const STORE_KEY_DISABLED = 'disabledPlugins'
export const STORE_KEY_DISABLED_META = 'disabledPluginsMeta'

// ─── PLUGINS INTÉGRÉS (bundlés) ─────────────────────────────────────────
export const INTEGRATED_PLUGIN_LOADERS = import.meta.glob(
  '../../../plugins/*/index.js'
)

export const INTEGRATED_PLUGINS = (() => {
  const map = new Map()
  for (const [path, loader] of Object.entries(INTEGRATED_PLUGIN_LOADERS)) {
    const match = path.match(/\/plugins\/([^/]+)\/index\.js$/)
    if (match) {
      map.set(match[1], loader)
    }
  }
  return map
})()

export const INTEGRATED_PLUGIN_IDS = new Set(INTEGRATED_PLUGINS.keys())

// ─── PAGES CORE ─────────────────────────────────────────────────────────
export const CORE_PAGES = CORE_PAGES_DEFS.map((p) => ({
  id: p.id,
  labelKey: p.labelKey,
  group: p.group,
}))