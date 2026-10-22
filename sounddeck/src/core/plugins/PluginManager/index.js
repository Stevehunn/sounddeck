/**
 * @file Plugin engine — the `PluginManager` singleton.
 *
 * Owns the full plugin lifecycle:
 * - **Loading** — bundled (integrated) plugins + external `.sdplugin` files
 * - **Pages** — every plugin can contribute sidebar pages (see `pagesCache.js`)
 * - **Components** — lazy-loaded React components for plugin pages
 * - **Hooks** — plugins can register hooks (`onAppStart`, `onSoundPlay`, …)
 * - **Disabling** — user can disable a plugin (persisted, see `disabledPlugins.js`)
 * - **Licensing** — Pro-gated plugins are skipped when the user isn't Pro
 *
 * The manager is a **singleton** (`pluginManager`), shared across the app.
 * `initialize(store)` is idempotent (safe for StrictMode double-invoke).
 *
 * @see ./pluginLoader.js — module loading + license validation
 * @see ./pagesCache.js — page list building
 * @see ./pluginComponent.js — component loading
 * @see ./disabledPlugins.js — disabled plugin persistence
 */

import { logError, logInfo, logWarn } from '@shared/utils/logger'
import {
  INTEGRATED_PLUGINS,
  INTEGRATED_PLUGIN_IDS,
} from './constants'
import { DisabledPluginsManager } from './disabledPlugins'
import {
  importPluginModule,
  validatePluginModule,
  registerPluginPages,
} from './pluginLoader'
import { buildAllPages } from './pagesCache'
import { loadPluginComponent } from './pluginComponent'

export class PluginManager {
  constructor() {
    this.plugins = new Map()
    this.pages = new Map()
    this.components = new Map()
    this.hooks = {
      beforePageRender: [],
      afterPageRender: [],
      onStoreInit: [],
      onSoundPlay: [],
      onAppStart: [],
      onPluginLoad: [],
      onPluginUnload: [],
    }
    this._initialized = false
    this._initPromise = null
    this._loadingPlugins = new Set()
    this.store = null

    // Page list cache (invalidated when plugins or profiles change)
    this._pagesCache = null
    this._pagesCacheKey = null
    this._pagesVersion = 0

    // Current license tier — synced from LicenseService via PluginContext.
    // Possible values: 'free' | 'pro' | 'dev'.
    this._licenseTier = 'free'

    // Delegated sub-manager for disabled plugins (persistence).
    this._disabled = new DisabledPluginsManager()
  }

  // ─── DISABLED (delegation) ──────────────────────────────────────────
  /**
   * Returns `true` if the given plugin is currently disabled by the user.
   * @param {string} pluginId
   * @returns {boolean}
   */
  isPluginDisabled(pluginId) {
    return this._disabled.has(pluginId)
  }

  /**
   * Returns the list of disabled plugins (with metadata).
   * @returns {Array<Object>}
   */
  getDisabledPlugins() {
    return this._disabled.list()
  }

  // ─── LICENSE ────────────────────────────────────────────────────────
  /**
   * Returns the current license tier.
   * @returns {'free'|'pro'|'dev'}
   */
  getLicenseTier() {
    return this._licenseTier || 'free'
  }

  /**
   * Sets the current license tier (called by PluginContext at boot).
   * Invalid values fall back to `'free'`.
   *
   * @param {'free'|'pro'|'dev'} tier
   * @returns {void}
   */
  setLicenseTier(tier) {
    const valid = ['free', 'pro', 'dev']
    this._licenseTier = valid.includes(tier) ? tier : 'free'
  }

  // ─── INIT (idempotent, StrictMode-safe) ─────────────────────────────
  /**
   * Boots the plugin engine. Idempotent: calling it twice returns the
   * same promise (StrictMode double-invoke is safe).
   *
   * @param {Object} store - App store (passed to plugin `init()` hooks).
   * @returns {Promise<void>}
   */
  async initialize(store) {
    if (this._initialized) return
    if (this._initPromise) return this._initPromise

    this._initPromise = (async () => {
      this.store = store

      try {
        await this._disabled.ensureLoaded()

        // Sync license tier BEFORE loading plugins
        try {
          const { getStatus } = await import('@core/services/LicenseService')
          const status = await getStatus()
          this._licenseTier = status?.tier || 'free'
        } catch {
          this._licenseTier = 'free'
        }

        // 1. Integrated (bundled) plugins — skip if disabled
        for (const [pluginId, loader] of INTEGRATED_PLUGINS) {
          if (this._disabled.has(pluginId)) {
            logInfo('PluginManager', `Integrated plugin ${pluginId} disabled`)
            continue
          }
          await this.loadPlugin({
            id: pluginId,
            enabled: true,
            _integrated: true,
            _loader: loader,
          })
        }

        // 2. External plugins
        const installedPlugins =
          (await window.electronAPI?.getInstalledPlugins?.()) || []

        for (const pluginInfo of installedPlugins) {
          if (pluginInfo.enabled === false) continue
          if (INTEGRATED_PLUGIN_IDS.has(pluginInfo.id)) continue
          if (this._disabled.has(pluginInfo.id)) continue
          await this.loadPlugin(pluginInfo)
        }

        this._initialized = true
        this.runHook('onAppStart', store)
      } catch (e) {
        logError('PluginManager', 'Init error', e)
        this._initialized = true
      }
    })()

    return this._initPromise
  }

  // ─── LOAD PLUGIN ────────────────────────────────────────────────────
  /**
   * Loads a single plugin.
   *
   * Steps:
   * 1. Skip if already loading or already loaded
   * 2. Import the plugin module (integrated or external)
   * 3. Validate the module (id present, license OK, version compatible)
   * 4. Register pages + call `plugin.init(store, this)`
   * 5. Fire `onPluginLoad` hook
   *
   * @param {Object} pluginInfo - Plugin descriptor
   * @param {string} pluginInfo.id
   * @param {boolean} [pluginInfo._integrated]
   * @param {Function} [pluginInfo._loader] - Vite loader for integrated plugins
   * @returns {Promise<boolean>} `true` on success.
   */
  async loadPlugin(pluginInfo) {
    if (this._loadingPlugins.has(pluginInfo.id)) {
      logWarn(
        'PluginManager',
        `Plugin ${pluginInfo.id} is already loading`
      )
      return false
    }

    if (this.plugins.has(pluginInfo.id)) {
      logWarn('PluginManager', `Plugin ${pluginInfo.id} already loaded`)
      return true
    }

    this._loadingPlugins.add(pluginInfo.id)

    try {
      // Inject current tier into pluginInfo for license validation
      const enrichedInfo = {
        ...pluginInfo,
        _licenseTier: this._licenseTier,
      }

      const pluginModule = await importPluginModule(enrichedInfo)
      const plugin = validatePluginModule(enrichedInfo, pluginModule)

      if (!plugin) {
        this._loadingPlugins.delete(pluginInfo.id)
        return false
      }

      this.plugins.set(plugin.id, {
        ...plugin,
        info: pluginInfo,
        isIntegrated: INTEGRATED_PLUGIN_IDS.has(plugin.id),
        loadedAt: Date.now(),
      })

      registerPluginPages(this, plugin)

      if (typeof plugin.init === 'function') {
        await plugin.init(this.store, this)
      }

      this.runHook('onPluginLoad', plugin)
      this.invalidatePagesCache()

      this._loadingPlugins.delete(pluginInfo.id)
      return true
    } catch (e) {
      logError('PluginManager', `Load plugin ${pluginInfo.id}`, e)
      this._loadingPlugins.delete(pluginInfo.id)
      return false
    }
  }

  // ─── UNLOAD ─────────────────────────────────────────────────────────
  /**
   * Unloads a plugin.
   *
   * @param {string} pluginId
   * @param {Object} [options]
   * @param {boolean} [options.permanent=false] - If `true`, add the plugin
   *   to the disabled list (persisted, won't be reloaded at next boot).
   * @returns {Promise<boolean>} `true` on success.
   */
  async unloadPlugin(pluginId, options = {}) {
    const { permanent = false } = options
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    try {
      if (typeof plugin.destroy === 'function') {
        await plugin.destroy()
      }
    } catch (e) {
      logWarn('PluginManager', `Error destroy() of plugin ${pluginId}`, e)
    }

    // Remove registered pages
    for (const pageId of Array.from(this.pages.keys())) {
      if (this.pages.get(pageId).pluginId === pluginId) {
        this.pages.delete(pageId)
        this.components.delete(pageId)
      }
    }

    this.plugins.delete(pluginId)
    this.runHook('onPluginUnload', plugin)
    this.invalidatePagesCache()

    if (permanent) {
      await this._disabled.add(pluginId, plugin)
    }

    return true
  }

  // ─── ENABLE ─────────────────────────────────────────────────────────
  /**
   * Re-enables a previously disabled plugin (removes it from the disabled
   * list, then attempts to reload it).
   *
   * @param {string} pluginId
   * @returns {Promise<boolean>} `true` if the plugin ended up loaded.
   */
  async enablePlugin(pluginId) {
    await this._disabled.remove(pluginId)
    this.invalidatePagesCache()

    // Attempt reload
    if (INTEGRATED_PLUGINS.has(pluginId)) {
      const loader = INTEGRATED_PLUGINS.get(pluginId)
      return this.loadPlugin({
        id: pluginId,
        enabled: true,
        _integrated: true,
        _loader: loader,
      })
    }

    try {
      const installedPlugins =
        (await window.electronAPI?.getInstalledPlugins?.()) || []
      const info = installedPlugins.find((p) => p.id === pluginId)
      if (info) {
        return this.loadPlugin(info)
      }
    } catch {
      // Silent — plugin simply couldn't be found on disk.
    }

    return false
  }

  // ─── CACHE / PAGES ──────────────────────────────────────────────────
  /**
   * Invalidates the page list cache. Must be called whenever the set of
   * plugins or the user's profiles change (profiles appear as pages).
   *
   * @returns {void}
   */
  invalidatePagesCache() {
    this._pagesVersion++
    this._pagesCache = null
    this._pagesCacheKey = null
  }

  /**
   * Returns the complete list of pages (core + plugins + profiles).
   *
   * The result is cached per `(version, translateFn)` pair.
   *
   * @param {(key: string) => string} [translateFn]
   * @returns {Array<Object>}
   */
  getAllPages(translateFn) {
    const cacheKey = `${this._pagesVersion}|${translateFn ? 't' : 'no-t'}`
    if (this._pagesCache && this._pagesCacheKey === cacheKey) {
      return this._pagesCache
    }

    const result = buildAllPages(this, translateFn)

    this._pagesCache = result
    this._pagesCacheKey = cacheKey
    return result
  }

  /**
   * Returns a single page by ID, or `undefined`.
   * @param {string} pageId
   * @param {(key: string) => string} [translateFn]
   * @returns {Object|undefined}
   */
  getPage(pageId, translateFn) {
    return this.getAllPages(translateFn).find((p) => p.id === pageId)
  }

  /**
   * Returns `true` if the given ID belongs to a plugin page.
   * @param {string} pageId
   * @returns {boolean}
   */
  isPluginPage(pageId) {
    return this.pages.has(pageId)
  }

  /**
   * Loads (or returns cached) React component for a plugin page.
   * @param {string} pageId
   * @returns {Promise<React.ComponentType|null>}
   */
  async getPluginComponent(pageId) {
    return loadPluginComponent(this, pageId)
  }

  // ─── HOOKS ──────────────────────────────────────────────────────────
  /**
   * Runs all registered callbacks for a hook.
   *
   * @param {string} hookName
   * @param {...any} args
   * @returns {Array<any>} Array of return values (one per callback).
   */
  runHook(hookName, ...args) {
    const hooks = this.hooks[hookName] || []
    return hooks.map((fn) => fn(...args))
  }

  /**
   * Registers a callback for the given hook.
   * @param {string} hookName
   * @param {Function} fn
   * @returns {void}
   */
  addHook(hookName, fn) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = []
    }
    this.hooks[hookName].push(fn)
  }

  // ─── QUERIES ────────────────────────────────────────────────────────
  /**
   * Returns a serializable list of currently loaded plugins.
   * @returns {Array<Object>}
   */
  getLoadedPlugins() {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name || p.id,
      nameKey: p.nameKey || null,
      version: p.version || '1.0.0',
      author: p.author || 'Unknown',
      loadedAt: p.loadedAt,
      pages: p.pages?.length || 0,
      isIntegrated: p.isIntegrated === true,
    }))
  }

  /**
   * Returns `true` if the given plugin is loaded.
   * @param {string} pluginId
   * @returns {boolean}
   */
  isPluginLoaded(pluginId) {
    return this.plugins.has(pluginId)
  }

  /**
   * Returns the raw plugin object, or `null`.
   * @param {string} pluginId
   * @returns {Object|null}
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null
  }
}

export const pluginManager = new PluginManager()
export default pluginManager