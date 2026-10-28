/**
 * @file Plugin list management hook.
 *
 * Loads the current plugin list (enabled + disabled) from the plugin
 * manager, and exposes imperative enable/uninstall handlers that keep the
 * list in sync after each mutation.
 *
 * @see @core/plugins/PluginContext
 * @see @core/store/hooks/useLicense
 */

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { usePlugins } from '@core/plugins/PluginContext'
import { useLicense } from '@core/store/hooks/useLicense'
import { logWarn, logError } from '@shared/utils/logger'

/**
 * Plugin list management hook.
 *
 * @param {Object} options
 * @param {(msg: string, type?: string) => void} options.addToast
 * @returns {{
 *   plugins: Array<Object>,
 *   disabledPlugins: Array<Object>,
 *   loadPlugins: () => Promise<void>,
 *   handlePluginUninstall: (plugin: Object) => Promise<void>,
 *   handlePluginEnable: (pluginMeta: Object) => Promise<void>,
 *   licenseTier: string,
 *   isPro: boolean,
 * }}
 */
export function usePluginsManagement({ addToast }) {
  const { t } = useLanguage()
  const { pluginManager, refresh: refreshPlugins } = usePlugins()
  const { tier: licenseTier, isPro } = useLicense()
  const [plugins, setPlugins] = useState([])
  const [disabledPlugins, setDisabledPlugins] = useState([])

  /**
   * Refreshes the enabled/disabled plugin lists.
   * @returns {Promise<void>}
   */
  const loadPlugins = useCallback(async () => {
    try {
      const loaded = pluginManager.getLoadedPlugins()
      const disabled = pluginManager.getDisabledPlugins()
      setPlugins(loaded)
      setDisabledPlugins(disabled)
    } catch (e) {
      logWarn('usePluginsManagement', 'Plugin loading error', e)
    }
  }, [pluginManager])

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  /**
   * Uninstalls a plugin (permanent), removes its files if it isn't an
   * integrated plugin, and refreshes the list.
   *
   * @param {Object} plugin
   * @returns {Promise<void>}
   */
  const handlePluginUninstall = useCallback(
    async (plugin) => {
      try {
        await pluginManager.unloadPlugin(plugin.id, { permanent: true })

        if (!plugin.isIntegrated) {
          try {
            await window.electronAPI.uninstallPlugin?.(plugin.id)
          } catch {
            // Ignore — the file removal is best-effort.
          }
        }

        refreshPlugins?.()
        await loadPlugins()

        addToast(
          t('pluginsUninstallSuccess').replace(
            '{name}',
            plugin.nameKey ? t(plugin.nameKey) : plugin.name
          ),
          'info'
        )
      } catch (e) {
        logError('usePluginsManagement', 'Plugin uninstall error', e)
        addToast(t('pluginsUninstallError') + ': ' + e.message, 'error')
      }
    },
    [t, addToast, loadPlugins, pluginManager, refreshPlugins]
  )

  /**
   * Re-enables a previously-disabled plugin.
   *
   * @param {{id: string, name?: string, nameKey?: string}} pluginMeta
   * @returns {Promise<void>}
   */
  const handlePluginEnable = useCallback(
    async (pluginMeta) => {
      try {
        const ok = await pluginManager.enablePlugin(pluginMeta.id)
        if (ok) {
          refreshPlugins?.()
          await loadPlugins()
          addToast(
            t('pluginsEnableSuccess').replace(
              '{name}',
              pluginMeta.nameKey ? t(pluginMeta.nameKey) : pluginMeta.name
            ),
            'success'
          )
        } else {
          addToast(t('pluginsEnableError'), 'error')
        }
      } catch (e) {
        logError('usePluginsManagement', 'Plugin enable error', e)
        addToast(t('pluginsEnableError') + ': ' + e.message, 'error')
      }
    },
    [t, addToast, loadPlugins, pluginManager, refreshPlugins]
  )

  return {
    plugins,
    disabledPlugins,
    loadPlugins,
    handlePluginUninstall,
    handlePluginEnable,
    licenseTier,
    isPro,
  }
}