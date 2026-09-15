// src/core/plugins/PluginContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { pluginManager } from './PluginManager'
import { useLanguage } from '@core/i18n/LanguageContext'

const PluginContext = createContext(null)

export function PluginProvider({ children, store }) {
  const [loaded, setLoaded] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)
  const { t } = useLanguage()

  // ✅ FIX S4 : initialisation UNE FOIS + rafraîchissement des labels
  // au changement de langue sans re-init (early-return d'initialize)
  useEffect(() => {
    const init = async () => {
      try {
        if (!pluginManager._initialized) {
          await pluginManager.initialize(store)
          setPlugins(pluginManager.getLoadedPlugins())
        }
        // Toujours rafraîchir les labels avec la langue courante
        setPages(pluginManager.getAllPages(t))
        setLoaded(true)
      } catch (e) {
        console.error('❌ Erreur initialisation PluginProvider:', e)
        setError(e.message)
        setLoaded(true)
      }
    }
    init()
  }, [store, t])

  const refresh = useCallback(() => {
    setPlugins(pluginManager.getLoadedPlugins())
    setPages(pluginManager.getAllPages(t))
  }, [t])

  const loadPlugin = useCallback(async (pluginInfo) => {
    const result = await pluginManager.loadPlugin(pluginInfo)
    if (result) refresh()
    return result
  }, [refresh])

  const unloadPlugin = useCallback(async (pluginId) => {
    const result = await pluginManager.unloadPlugin(pluginId)
    if (result) refresh()
    return result
  }, [refresh])

  const value = {
    pluginManager,
    plugins,
    pages,
    loaded,
    error,
    refresh,
    // ✅ FIX S4 : passer `t` à getPage pour traduire les labels
    getPage: (id) => pluginManager.getPage(id, t),
    isPluginPage: (id) => pluginManager.isPluginPage(id),
    getPluginComponent: (id) => pluginManager.getPluginComponent(id),
    getPlugin: (id) => pluginManager.getPlugin(id),
    loadPlugin,
    unloadPlugin,
    isPluginLoaded: (id) => pluginManager.isPluginLoaded(id),
    getLoadedPlugins: () => pluginManager.getLoadedPlugins(),
  }

  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  )
}

export function usePlugins() {
  const context = useContext(PluginContext)
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider')
  }
  return context
}

export default PluginProvider