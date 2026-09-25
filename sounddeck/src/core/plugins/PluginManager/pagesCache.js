// src/core/plugins/PluginManager/pagesCache.js
import { CORE_PAGES } from './constants'
import { DEFAULT_ICONS, DEFAULT_GROUPS } from '@shared/constants/navigation'

/**
 * Construit la liste complète des pages (core + plugins + profils).
 */
export function buildAllPages(pluginManager, translateFn) {
  const t = translateFn || ((key) => key)

  const corePages = CORE_PAGES.map(({ id, labelKey, group }) => ({
    id,
    label: t(labelKey),
    icon: DEFAULT_ICONS[id],
    group: DEFAULT_GROUPS[id] || group,
    isCore: true,
  }))

  const pluginPages = Array.from(pluginManager.pages.values()).map((p) => ({
    ...p,
    label: p.labelKey ? t(p.labelKey) : p.label,
    isCore: false,
    isPlugin: true,
  }))

  const storePages = buildStorePages(pluginManager.store)

  return [...corePages, ...pluginPages, ...storePages]
}

function buildStorePages(store) {
  if (!store) return []

  const profiles = store.profiles || []
  return profiles.map((p) => ({
    id: `profile-${p.id}`,
    label: p.name,
    icon: p.id === 'all' ? 'ti-stack' : 'ti-user',
    isCore: false,
    isProfile: true,
    group: 'profiles',
    profileId: p.id,
  }))
}

export default { buildAllPages }