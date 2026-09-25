// src/core/plugins/PluginContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { pluginManager } from './PluginManager/index.js'
import { useLanguage } from '@core/i18n/LanguageContext'

const PluginContext = createContext(null)

export function PluginProvider({ children, store }) {
  const [loaded, setLoaded] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)
  const { t } = useLanguage()

  const storeRef = useRef(store)
  storeRef.current = store

  useEffect(() => {
    const init = async () => {
      try {
        if (!pluginManager._initialized) {
          await pluginManager.initialize(storeRef.current)
          setPlugins(pluginManager.getLoadedPlugins())
        }
        pluginManager.invalidatePagesCache()
        setPages(pluginManager.getAllPages(t))
        setLoaded(true)
      } catch (e) {
        console.error('❌ Erreur initialisation PluginProvider:', e)
        setError(e.message)
        setLoaded(true)
      }
    }
    init()
  }, [t])

  useEffect(() => {
    if (!loaded) return
    pluginManager.invalidatePagesCache()
    setPages(pluginManager.getAllPages(t))
  }, [store.profiles, loaded, t])

  const refresh = useCallback(() => {
    pluginManager.invalidatePagesCache()
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

  const value = useMemo(() => ({
    pluginManager,
    plugins,
    pages,
    loaded,
    error,
    refresh,
    getPage: (id) => pluginManager.getPage(id, t),
    isPluginPage: (id) => pluginManager.isPluginPage(id),
    getPluginComponent: (id) => pluginManager.getPluginComponent(id),
    getPlugin: (id) => pluginManager.getPlugin(id),
    loadPlugin,
    unloadPlugin,
    isPluginLoaded: (id) => pluginManager.isPluginLoaded(id),
    getLoadedPlugins: () => pluginManager.getLoadedPlugins(),
  }), [plugins, pages, loaded, error, t, refresh, loadPlugin, unloadPlugin])

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