// src/core/plugins/PluginContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { pluginManager } from './PluginManager/index.js'
import { useLanguage } from '@core/i18n/LanguageContext'

const PluginContext = createContext(null)

export function PluginProvider({ children, store }) {
  const [loaded, setLoaded] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)
  const [licenseTier, setLicenseTier] = useState('free')
  const { t } = useLanguage()

  const storeRef = useRef(store)
  storeRef.current = store

  // ─── INIT ──────────────────────────────────────────────────────────
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

  // ─── Sync pages quand profils changent ─────────────────────────────
  useEffect(() => {
    if (!loaded) return
    pluginManager.invalidatePagesCache()
    setPages(pluginManager.getAllPages(t))
  }, [store.profiles, loaded, t])

  // ─── Sync tier de licence ──────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return
    let cancelled = false

    ;(async () => {
      try {
        const { getStatus } = await import('@core/services/LicenseService')
        const status = await getStatus()
        if (!cancelled && status) {
          const tier = status.tier || 'free'
          // ⚠️ Optional call : tolère les mocks de test qui n'exposent pas setLicenseTier
          if (typeof pluginManager.setLicenseTier === 'function') {
            pluginManager.setLicenseTier(tier)
          }
          setLicenseTier(tier)
        }
      } catch (e) {
        // silencieux — pas de licence = free
        if (!cancelled) {
          if (typeof pluginManager.setLicenseTier === 'function') {
            pluginManager.setLicenseTier('free')
          }
          setLicenseTier('free')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loaded])

  // ─── Re-check tier quand les plugins changent (après activation) ───
  useEffect(() => {
    if (!loaded) return
    // Si le pluginManager a un tier différent de notre state, on re-sync
    const mgrTier =
      typeof pluginManager.getLicenseTier === 'function'
        ? pluginManager.getLicenseTier()
        : null
    if (mgrTier && mgrTier !== licenseTier) {
      setLicenseTier(mgrTier)
    }
  }, [plugins, loaded, licenseTier])

  // ─── REFRESH ───────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    pluginManager.invalidatePagesCache()
    setPlugins(pluginManager.getLoadedPlugins())
    setPages(pluginManager.getAllPages(t))
  }, [t])

  const loadPlugin = useCallback(
    async (pluginInfo) => {
      const result = await pluginManager.loadPlugin(pluginInfo)
      if (result) refresh()
      return result
    },
    [refresh]
  )

  const unloadPlugin = useCallback(
    async (pluginId) => {
      const result = await pluginManager.unloadPlugin(pluginId)
      if (result) refresh()
      return result
    },
    [refresh]
  )

  // ─── VALUE ─────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      pluginManager,
      plugins,
      pages,
      loaded,
      error,
      licenseTier,
      refresh,
      getPage: (id) => pluginManager.getPage(id, t),
      isPluginPage: (id) => pluginManager.isPluginPage(id),
      getPluginComponent: (id) => pluginManager.getPluginComponent(id),
      getPlugin: (id) => pluginManager.getPlugin(id),
      loadPlugin,
      unloadPlugin,
      isPluginLoaded: (id) => pluginManager.isPluginLoaded(id),
      getLoadedPlugins: () => pluginManager.getLoadedPlugins(),
    }),
    [
      plugins,
      pages,
      loaded,
      error,
      licenseTier,
      t,
      refresh,
      loadPlugin,
      unloadPlugin,
    ]
  )

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