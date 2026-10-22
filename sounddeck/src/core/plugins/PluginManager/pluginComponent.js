/**
 * @file Lazy loader for plugin page components.
 *
 * Two modes:
 * - **DEV** — tries several Vite-resolvable paths (`componentPath`,
 *   `pages/<id>`, `<id>`, `components/<id>`). This is needed because
 *   plugins can declare their component in different shapes.
 * - **PROD** — uses `electronAPI.getPluginComponentPath()` to resolve
 *   the absolute path of the component, then dynamic-imports it.
 *
 * Loaded components are cached in `pluginManager.components` so subsequent
 * calls are instant.
 *
 * @see ./PluginManager/index.js (`getPluginComponent`)
 */

import { logWarn, logError } from '@shared/utils/logger'

/**
 * Loads the React component for the given plugin page.
 *
 * @param {Object} pluginManager - The plugin manager instance.
 * @param {string} pageId
 * @returns {Promise<React.ComponentType|null>}
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
        } catch {
          // Try the next path
        }
      }
      logWarn('PluginManager', `Component not found for page ${pageId}`, {
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
    logError('PluginManager', `Component load error for ${pageId}`, e)
  }

  return null
}

export default { loadPluginComponent }