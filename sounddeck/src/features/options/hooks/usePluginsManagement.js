// src/features/options/hooks/usePluginsManagement.js
import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { usePlugins } from '@core/plugins/PluginContext'
import { useLicense } from '@core/store/hooks/useLicense'
import { logWarn, logError } from '@shared/utils/logger'

export function usePluginsManagement({ addToast }) {
  const { t } = useLanguage()
  const { pluginManager, refresh: refreshPlugins } = usePlugins()
  const { tier: licenseTier, isPro } = useLicense()
  const [plugins, setPlugins] = useState([])
  const [disabledPlugins, setDisabledPlugins] = useState([])

  const loadPlugins = useCallback(async () => {
    try {
      const loaded = pluginManager.getLoadedPlugins()
      const disabled = pluginManager.getDisabledPlugins()
      setPlugins(loaded)
      setDisabledPlugins(disabled)
    } catch (e) {
      logWarn('usePluginsManagement', 'Erreur chargement plugins', e)
    }
  }, [pluginManager])

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  const handlePluginUninstall = useCallback(
    async (plugin) => {
      try {
        await pluginManager.unloadPlugin(plugin.id, { permanent: true })

        if (!plugin.isIntegrated) {
          try {
            await window.electronAPI.uninstallPlugin?.(plugin.id)
          } catch (e) {
            // silencieux
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
        logError('usePluginsManagement', 'Erreur uninstall plugin', e)
        addToast(t('pluginsUninstallError') + ': ' + e.message, 'error')
      }
    },
    [t, addToast, loadPlugins, pluginManager, refreshPlugins]
  )

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
        logError('usePluginsManagement', 'Erreur enable plugin', e)
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
    // ✅ NOUVEAU : expose le tier pour les consommateurs (Options, etc.)
    licenseTier,
    isPro,
  }
}