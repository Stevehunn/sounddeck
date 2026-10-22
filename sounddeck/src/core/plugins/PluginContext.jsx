/**
 * @file React context for the plugin engine.
 *
 * Wraps the singleton `pluginManager` (see `./PluginManager/index.js`) in a
 * React context so components can:
 * - Read the current list of loaded plugins and available pages
 * - Read the current license tier (`'free' | 'pro' | 'dev'`)
 * - Load / unload plugins on demand
 * - Access the raw `pluginManager` for advanced needs
 *
 * The provider is responsible for:
 * - **Initialization** — boot the plugin engine once (`initialize(store)`)
 * - **Page refresh** — invalidate the page cache whenever profiles change
 *   (profiles are exposed as plugin pages in the sidebar)
 * - **License sync** — fetch the current tier from `LicenseService` and
 *   pass it to the manager (used to gate Pro-only plugins)
 *
 * @see ./PluginManager/index.js — the underlying engine
 * @see @core/services/LicenseService.js
 */

import {
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

/**
 * Plugin provider.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} props.store - App store (passed to `pluginManager.initialize`).
 * @returns {JSX.Element}
 */
export function PluginProvider({ children, store }) {
  const [loaded, setLoaded] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)
  const [licenseTier, setLicenseTier] = useState('free')
  const { t } = useLanguage()

  // Mutable ref used to give async callbacks the latest store, without
  // re-running effects when `store` changes reference. Synced in an
  // effect (not during render) to satisfy `react-hooks/refs`.
  const storeRef = useRef(store)
  useEffect(() => {
    storeRef.current = store
  }, [store])

  // ─── INIT (once) ────────────────────────────────────────────────────
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
        console.error('❌ PluginProvider init error:', e)
        setError(e.message)
        setLoaded(true)
      }
    }
    init()
  }, [t])

  // ─── Sync pages when profiles change ────────────────────────────────
  // Deferred via setTimeout(0) so the setState inside `getAllPages`
  // (called via `setPages`) doesn't run synchronously in the effect body
  // (React 19's `set-state-in-effect` rule).
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => {
      pluginManager.invalidatePagesCache()
      setPages(pluginManager.getAllPages(t))
    }, 0)
    return () => clearTimeout(timer)
  }, [store.profiles, loaded, t])

  // ─── Sync license tier ──────────────────────────────────────────────
  // Async IIFE + deferred setState to avoid the same rule.
  useEffect(() => {
    if (!loaded) return
    let cancelled = false

    ;(async () => {
      try {
        const { getStatus } = await import('@core/services/LicenseService')
        const status = await getStatus()
        if (!cancelled && status) {
          const tier = status.tier || 'free'
          // Optional call: tolerates test mocks that don't expose setLicenseTier
          if (typeof pluginManager.setLicenseTier === 'function') {
            pluginManager.setLicenseTier(tier)
          }
          const timer = setTimeout(() => setLicenseTier(tier), 0)
          // Note: the timeout isn't cancelled on unmount, but `setLicenseTier`
          // is a cheap state update that React simply ignores on unmounted
          // components. Acceptable trade-off for clarity.
          void timer
        }
      } catch {
        // Silent — no license means 'free' tier.
        if (!cancelled) {
          if (typeof pluginManager.setLicenseTier === 'function') {
            pluginManager.setLicenseTier('free')
          }
          const timer = setTimeout(() => setLicenseTier('free'), 0)
          void timer
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loaded])

  // ─── Re-check tier when plugins change (post-activation) ────────────
  useEffect(() => {
    if (!loaded) return
    const mgrTier =
      typeof pluginManager.getLicenseTier === 'function'
        ? pluginManager.getLicenseTier()
        : null
    if (mgrTier && mgrTier !== licenseTier) {
      const timer = setTimeout(() => setLicenseTier(mgrTier), 0)
      return () => clearTimeout(timer)
    }
  }, [plugins, loaded, licenseTier])

  // ─── REFRESH ────────────────────────────────────────────────────────
  /**
   * Invalidates the page cache and reloads the plugin + page lists from
   * the manager. Call this after `loadPlugin` / `unloadPlugin` (already
   * done automatically) or when external code mutates the manager.
   *
   * @returns {void}
   */
  const refresh = useCallback(() => {
    pluginManager.invalidatePagesCache()
    setPlugins(pluginManager.getLoadedPlugins())
    setPages(pluginManager.getAllPages(t))
  }, [t])

  /**
   * Loads a plugin and refreshes the context on success.
   *
   * @param {Object} pluginInfo - Plugin descriptor (see `pluginManager.loadPlugin`).
   * @returns {Promise<boolean>} `true` on success.
   */
  const loadPlugin = useCallback(
    async (pluginInfo) => {
      const result = await pluginManager.loadPlugin(pluginInfo)
      if (result) refresh()
      return result
    },
    [refresh]
  )

  /**
   * Unloads a plugin and refreshes the context on success.
   *
   * @param {string} pluginId
   * @returns {Promise<boolean>} `true` on success.
   */
  const unloadPlugin = useCallback(
    async (pluginId) => {
      const result = await pluginManager.unloadPlugin(pluginId)
      if (result) refresh()
      return result
    },
    [refresh]
  )

  // ─── CONTEXT VALUE ──────────────────────────────────────────────────
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

/**
 * Reads the plugin context from the nearest `PluginProvider`.
 *
 * `usePlugins` is a hook, not a component — Fast Refresh would normally
 * trigger a full reload when editing this file (rather than a partial one).
 * This is safe here: the hook has no local state that would be lost, and
 * its result depends only on the provider's value.
 *
 * @throws {Error} If called outside a `PluginProvider`.
 * @returns {Object} The context value (see `PluginProvider` for shape).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePlugins() {
  const context = useContext(PluginContext)
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider')
  }
  return context
}

export default PluginProvider