// src/core/plugins/PluginManager/index.js
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

    // Cache des pages
    this._pagesCache = null
    this._pagesCacheKey = null
    this._pagesVersion = 0

    // ✅ Tier courant de la licence (sync depuis LicenseService via PluginContext)
    // Valeurs possibles : 'free' | 'pro' | 'dev'
    this._licenseTier = 'free'

    // Délégation à un sous-manager
    this._disabled = new DisabledPluginsManager()
  }

  // ─── DISABLED (délégation) ────────────────────────────────────────────
  isPluginDisabled(pluginId) {
    return this._disabled.has(pluginId)
  }

  getDisabledPlugins() {
    return this._disabled.list()
  }

  // ─── LICENCE ──────────────────────────────────────────────────────────

  /**
   * Retourne le tier de licence courant.
   * @returns {'free'|'pro'|'dev'}
   */
  getLicenseTier() {
    return this._licenseTier || 'free'
  }

  /**
   * Définit le tier de licence courant (appelé par PluginContext au boot).
   * @param {'free'|'pro'|'dev'} tier
   */
  setLicenseTier(tier) {
    const valid = ['free', 'pro', 'dev']
    this._licenseTier = valid.includes(tier) ? tier : 'free'
  }

  // ─── INIT (idempotent, safe pour React StrictMode) ────────────────────
  async initialize(store) {
    if (this._initialized) return

    if (this._initPromise) return this._initPromise

    this._initPromise = (async () => {
      this.store = store

      try {
        await this._disabled.ensureLoaded()

        // Sync du tier AVANT de charger les plugins
        try {
          const { getStatus } = await import('@core/services/LicenseService')
          const status = await getStatus()
          this._licenseTier = status?.tier || 'free'
        } catch (e) {
          this._licenseTier = 'free'
        }

        // 1. Plugins intégrés — skip si désactivés
        for (const [pluginId, loader] of INTEGRATED_PLUGINS) {
          if (this._disabled.has(pluginId)) {
            logInfo('PluginManager', `Plugin intégré ${pluginId} désactivé`)
            continue
          }
          await this.loadPlugin({
            id: pluginId,
            enabled: true,
            _integrated: true,
            _loader: loader,
          })
        }

        // 2. Plugins externes
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
        logError('PluginManager', 'Erreur initialisation', e)
        this._initialized = true
      }
    })()

    return this._initPromise
  }

  // ─── LOAD PLUGIN ─────────────────────────────────────────────────────
  async loadPlugin(pluginInfo) {
    if (this._loadingPlugins.has(pluginInfo.id)) {
      logWarn(
        'PluginManager',
        `Plugin ${pluginInfo.id} déjà en cours de chargement`
      )
      return false
    }

    if (this.plugins.has(pluginInfo.id)) {
      logWarn('PluginManager', `Plugin ${pluginInfo.id} déjà chargé`)
      return true
    }

    this._loadingPlugins.add(pluginInfo.id)

    try {
      // ✅ Injecte le tier courant dans pluginInfo pour la validation licence
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
      logError('PluginManager', `Chargement plugin ${pluginInfo.id}`, e)
      this._loadingPlugins.delete(pluginInfo.id)
      return false
    }
  }

  // ─── UNLOAD ──────────────────────────────────────────────────────────
  async unloadPlugin(pluginId, options = {}) {
    const { permanent = false } = options
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    try {
      if (typeof plugin.destroy === 'function') {
        await plugin.destroy()
      }
    } catch (e) {
      logWarn('PluginManager', `Erreur destroy() du plugin ${pluginId}`, e)
    }

    // Retirer les pages enregistrées
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

  // ─── ENABLE ──────────────────────────────────────────────────────────
  async enablePlugin(pluginId) {
    await this._disabled.remove(pluginId)
    this.invalidatePagesCache()

    // Tentative de rechargement
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
    } catch (e) {
      // silencieux
    }

    return false
  }

  // ─── CACHE / PAGES ───────────────────────────────────────────────────
  invalidatePagesCache() {
    this._pagesVersion++
    this._pagesCache = null
    this._pagesCacheKey = null
  }

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

  getPage(pageId, translateFn) {
    return this.getAllPages(translateFn).find((p) => p.id === pageId)
  }

  isPluginPage(pageId) {
    return this.pages.has(pageId)
  }

  async getPluginComponent(pageId) {
    return loadPluginComponent(this, pageId)
  }

  // ─── HOOKS ───────────────────────────────────────────────────────────
  runHook(hookName, ...args) {
    const hooks = this.hooks[hookName] || []
    return hooks.map((fn) => fn(...args))
  }

  addHook(hookName, fn) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = []
    }
    this.hooks[hookName].push(fn)
  }

  // ─── QUERIES ─────────────────────────────────────────────────────────
  getLoadedPlugins() {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name || p.id,
      nameKey: p.nameKey || null,
      version: p.version || '1.0.0',
      author: p.author || 'Inconnu',
      loadedAt: p.loadedAt,
      pages: p.pages?.length || 0,
      isIntegrated: p.isIntegrated === true,
    }))
  }

  isPluginLoaded(pluginId) {
    return this.plugins.has(pluginId)
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null
  }
}

export const pluginManager = new PluginManager()
export default pluginManager