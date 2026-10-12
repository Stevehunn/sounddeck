// src/core/plugins/PluginManager/pluginLoader.js
import { logError, logWarn } from '@shared/utils/logger'
import { checkCompatibility } from './semver'
import { INTEGRATED_PLUGIN_IDS } from './constants'

/**
 * Charge un module de plugin (intégré ou externe).
 * Retourne le module OU null en cas d'échec.
 */
export async function importPluginModule(pluginInfo) {
  // Cas 1 : plugin intégré avec loader fourni
  if (pluginInfo._loader) {
    try {
      return await pluginInfo._loader()
    } catch (e) {
      logError('PluginManager', `Chargement intégré ${pluginInfo.id}`, e)
      return null
    }
  }

  // Cas 2 : plugin externe — essaie plusieurs chemins
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

  // Cas 3 : plugin externe sur disque
  try {
    const fullPath = await window.electronAPI?.getPluginPath?.(pluginInfo.id)
    if (fullPath) {
      return await import(/* @vite-ignore */ fullPath)
    }
  } catch (e) {
    lastError = e
  }

  logError('PluginManager', `Plugin ${pluginInfo.id} introuvable`, lastError)
  return null
}

/**
 * Valide la compatibilité + le module + la licence.
 */
export function validatePluginModule(pluginInfo, pluginModule) {
  if (!checkCompatibility(pluginInfo)) {
    logError('PluginManager', `Plugin ${pluginInfo.id} incompatible`)
    return null
  }

  const plugin = pluginModule?.default || pluginModule

  if (!plugin?.id) {
    logError('PluginManager', 'Plugin invalide: id manquant')
    return null
  }

  // ✅ Licence Pro requise ?
  const manifest = { ...plugin, ...pluginInfo }
  if (manifest.licenseRequired === true) {
    if (!pluginInfo._licenseTier) {
      logWarn(
        'PluginManager',
        `Plugin ${plugin.id} requiert une licence Pro (non fournie)`
      )
      return null
    }

    const requiredTier = manifest.minTier || 'pro'
    // Ranking : free=0, pro=10, dev=99
    const ranks = { free: 0, pro: 10, dev: 99 }
    const userRank = ranks[pluginInfo._licenseTier] ?? 0
    const requiredRank = ranks[requiredTier] ?? 10

    if (userRank < requiredRank) {
      logWarn(
        'PluginManager',
        `Plugin ${plugin.id} requiert tier "${requiredTier}", utilisateur a "${pluginInfo._licenseTier}"`
      )
      return null
    }
  }

  return plugin
}

/**
 * Enregistre les pages du plugin dans le manager.
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
 * Vérifie que l'ID du plugin est un plugin intégré.
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