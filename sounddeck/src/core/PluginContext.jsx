import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { pluginManager } from './PluginManager'
import { useLanguage } from '../context/LanguageContext'

const PluginContext = createContext(null)

export function PluginProvider({ children, store }) {
  const [loaded, setLoaded] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)
  const { t } = useLanguage()

  // Initialisation du PluginManager
  useEffect(() => {
    const init = async () => {
      try {
        await pluginManager.initialize(store)
        setPlugins(pluginManager.getLoadedPlugins())
        // ✅ Passer la fonction de traduction à getAllPages
        setPages(pluginManager.getAllPages(t))
        setLoaded(true)
      } catch (e) {
        console.error('❌ Erreur initialisation PluginProvider:', e)
        setError(e.message)
        setLoaded(true) // Ne pas bloquer l'app
      }
    }
    init()
  }, [store, t])

  // Rafraîchir la liste des plugins et pages
  const refresh = useCallback(() => {
    setPlugins(pluginManager.getLoadedPlugins())
    // ✅ Passer la fonction de traduction à getAllPages
    setPages(pluginManager.getAllPages(t))
  }, [t])

  // Charger un plugin
  const loadPlugin = useCallback(async (pluginInfo) => {
    const result = await pluginManager.loadPlugin(pluginInfo)
    if (result) {
      refresh()
    }
    return result
  }, [refresh])

  // Décharger un plugin
  const unloadPlugin = useCallback(async (pluginId) => {
    const result = await pluginManager.unloadPlugin(pluginId)
    if (result) {
      refresh()
    }
    return result
  }, [refresh])

  const value = {
    pluginManager,
    plugins,
    pages,
    loaded,
    error,
    refresh,
    getPage: (id) => pluginManager.getPage(id),
    isPluginPage: (id) => pluginManager.isPluginPage(id),
    getPluginComponent: (id) => pluginManager.getPluginComponent(id),
    getPlugin: (id) => pluginManager.getPlugin(id),
    loadPlugin,
    unloadPlugin,
    isPluginLoaded: (id) => pluginManager.isPluginLoaded(id),
    getLoadedPlugins: () => pluginManager.getLoadedPlugins()
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