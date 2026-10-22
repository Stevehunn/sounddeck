/**
 * @file Plugin module loading + validation.
 *
 * - **`importPluginModule`** — imports an integrated or external plugin
 *   module (with multi-path fallback for Vite dev).
 * - **`validatePluginModule`** — checks compatibility, id presence, and
 *   Pro licensing.
 * - **`registerPluginPages`** — registers the plugin's pages in the manager.
 *
 * @see ./PluginManager/index.js
 * @see ./semver.js
 */

import { logError, logWarn } from '@shared/utils/logger'
import { checkCompatibility } from './semver'
import { INTEGRATED_PLUGIN_IDS } from './constants'

/**
 * Imports the plugin module.
 *
 * @param {Object} pluginInfo
 * @returns {Promise<Object|null>} The module, or `null` on failure.
 */
export async function importPluginModule(pluginInfo) {
  // Case 1: integrated plugin with a loader provided by Vite's glob
  if (pluginInfo._loader) {
    try {
      return await pluginInfo._loader()
    } catch (e) {
      logError('PluginManager', `Integrated load ${pluginInfo.id}`, e)
      return null
    }
  }

  // Case 2: external plugin — try several Vite paths
  const paths = [
    `../../plugins/${pluginInfo.id}/index.js`,
    `../../plugins/${pluginInfo.id}/index.jsx`,
    `/src/plugins/${pluginInfo.id}/index.js`,
    `/src/plugins/${pluginInfo.id}/index.jsx`,
    `../plugins/${pluginInfo.id}/index`,
    `/src/plugins/${pluginInfo.id}/index`,
  ]

  let lastError = null

  for (const importPath of paths) {
    try {
      return await import(/* @vite-ignore */ importPath)
    } catch (e) {
      lastError = e
    }
  }

  // Case 3: external plugin on disk (resolved by the main process)
  try {
    const fullPath = await window.electronAPI?.getPluginPath?.(pluginInfo.id)
    if (fullPath) {
      return await import(/* @vite-ignore */ fullPath)
    }
  } catch (e) {
    lastError = e
  }

  logError('PluginManager', `Plugin ${pluginInfo.id} not found`, lastError)
  return null
}

/**
 * Validates compatibility, module shape, and Pro licensing.
 *
 * @param {Object} pluginInfo
 * @param {Object} pluginModule
 * @returns {Object|null} The plugin object, or `null` if invalid.
 */
export function validatePluginModule(pluginInfo, pluginModule) {
  if (!checkCompatibility(pluginInfo)) {
    logError('PluginManager', `Plugin ${pluginInfo.id} incompatible`)
    return null
  }

  const plugin = pluginModule?.default || pluginModule

  if (!plugin?.id) {
    logError('PluginManager', 'Invalid plugin: missing id')
    return null
  }

  // Pro license required?
  const manifest = { ...plugin, ...pluginInfo }
  if (manifest.licenseRequired === true) {
    if (!pluginInfo._licenseTier) {
      logWarn(
        'PluginManager',
        `Plugin ${plugin.id} requires a Pro license (none provided)`
      )
      return null
    }

    const requiredTier = manifest.minTier || 'pro'
    // Ranking: free=0, pro=10, dev=99
    const ranks = { free: 0, pro: 10, dev: 99 }
    const userRank = ranks[pluginInfo._licenseTier] ?? 0
    const requiredRank = ranks[requiredTier] ?? 10

    if (userRank < requiredRank) {
      logWarn(
        'PluginManager',
        `Plugin ${plugin.id} requires tier "${requiredTier}", user has "${pluginInfo._licenseTier}"`
      )
      return null
    }
  }

  return plugin
}

/**
 * Registers the plugin's pages in the manager.
 *
 * @param {Object} pluginManager
 * @param {Object} plugin
 * @returns {void}
 */
export function registerPluginPages(pluginManager, plugin) {
  if (!plugin.pages) return

  for (const page of plugin.pages) {
    pluginManager.pages.set(page.id, {
      ...page,
      pluginId: plugin.id,
      componentPath:
        page.componentPath || page.component || `${plugin.id}/${page.id}`,
    })

    if (page.component && typeof page.component !== 'string') {
      pluginManager.components.set(page.id, page.component)
    }
  }
}

/**
 * Returns `true` if the given ID belongs to an integrated plugin.
 * @param {string} pluginId
 * @returns {boolean}
 */
export function isIntegrated(pluginId) {
  return INTEGRATED_PLUGIN_IDS.has(pluginId)
}

export default {
  importPluginModule,
  validatePluginModule,
  registerPluginPages,
  isIntegrated,
}