// src/core/plugins/PluginManager/pluginComponent.js
import { logWarn, logError } from '@shared/utils/logger'

/**
 * Charge un composant de page de plugin.
 * En DEV : essaie plusieurs chemins Vite.
 * En PROD : utilise le chemin fourni par le main process.
 */
export async function loadPluginComponent(pluginManager, pageId) {
  if (pluginManager.components.has(pageId)) {
    return pluginManager.components.get(pageId)
  }

  const page = pluginManager.pages.get(pageId)
  if (!page) return null

  try {
    if (import.meta.env.DEV) {
      const plugin = pluginManager.plugins.get(page.pluginId)
      if (!plugin) return null

      const paths = [
        `../../plugins/${page.pluginId}/${page.componentPath}`,
        `../../plugins/${page.pluginId}/pages/${page.id}`,
        `../../plugins/${page.pluginId}/${page.id}`,
        `../../plugins/${page.pluginId}/components/${page.id}`,
      ]

      for (const importPath of paths) {
        try {
          const mod = await import(/* @vite-ignore */ importPath)
          if (mod) {
            const Component = mod.default || mod
            pluginManager.components.set(pageId, Component)
            return Component
          }
        } catch (e) {
          // Essayer le chemin suivant
        }
      }
      logWarn('PluginManager', `Composant non trouvé pour la page ${pageId}`, {
        paths,
      })
      return null
    }

    const pluginPath = await window.electronAPI?.getPluginComponentPath?.(
      page.pluginId,
      page.id
    )
    if (pluginPath) {
      const mod = await import(/* @vite-ignore */ pluginPath)
      if (mod) {
        const Component = mod.default || mod
        pluginManager.components.set(pageId, Component)
        return Component
      }
    }
  } catch (e) {
    logError('PluginManager', `Chargement composant ${pageId}`, e)
  }

  return null
}

export default { loadPluginComponent }