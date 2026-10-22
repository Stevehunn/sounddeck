/**
 * @file Builds the complete pages list (core + plugins + profiles).
 *
 * @see ./PluginManager/index.js (`getAllPages`)
 */

import { CORE_PAGES } from './constants'
import { DEFAULT_ICONS, DEFAULT_GROUPS } from '@shared/constants/navigation'

/**
 * Builds the complete pages list.
 *
 * @param {Object} pluginManager
 * @param {(key: string) => string} [translateFn] - Optional i18n function.
 * @returns {Array<Object>}
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

/**
 * Builds "page" descriptors for the user's profiles.
 *
 * @param {Object|null} store
 * @returns {Array<Object>}
 */
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