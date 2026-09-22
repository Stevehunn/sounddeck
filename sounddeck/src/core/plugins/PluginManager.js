// src/core/plugins/PluginManager.js
/**
 * PluginManager - Gestionnaire central des plugins
 */
import { DEFAULT_ICONS, DEFAULT_GROUPS } from '@shared/constants/navigation'

// ─── CLÉS STORE ─────────────────────────────────────────────────────────

const STORE_KEY_DISABLED = 'disabledPlugins'
const STORE_KEY_DISABLED_META = 'disabledPluginsMeta'

// ─── PLUGINS INTÉGRÉS (bundlés) ─────────────────────────────────────────

const INTEGRATED_PLUGIN_LOADERS = import.meta.glob('../../plugins/*/index.js')

const INTEGRATED_PLUGINS = (() => {
  const map = new Map()
  for (const [path, loader] of Object.entries(INTEGRATED_PLUGIN_LOADERS)) {
    const match = path.match(/\/plugins\/([^/]+)\/index\.js$/)
    if (match) {
      map.set(match[1], loader)
    }
  }
  return map
})()

const INTEGRATED_PLUGIN_IDS = new Set(INTEGRATED_PLUGINS.keys())

// ─── PAGES CORE ─────────────────────────────────────────────────────────

const CORE_PAGES_DEFS = [
  { id: 'home', labelKey: 'mySounds', group: 'navigation' },
  { id: 'trimmer', labelKey: 'trimmer', group: 'navigation' },
  { id: 'editor', labelKey: 'editor', group: 'navigation' },
  { id: 'sequencer', labelKey: 'sequencer', group: 'navigation' },
  { id: 'stats', labelKey: 'stats', group: 'navigation' },
  { id: 'emoji', labelKey: 'emojiPageTitle', group: 'navigation' },
  { id: 'guide', labelKey: 'guide', group: 'footer' },
  { id: 'options', labelKey: 'options', group: 'footer' },
]

// ─── CLASSE ─────────────────────────────────────────────────────────────

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
    this._loadingPlugins = new Set()
    this.store = null

    // cache des pages
    this._pagesCache = null
    this._pagesCacheKey = null
    this._pagesVersion = 0

    // plugins désactivés (persistant)
    this._disabledPlugins = new Set()
    this._disabledPluginsMeta = {}
    this._disabledLoaded = false
  }

  // ─── DISABLED PLUGINS ────────────────────────────────────────────────

  async _ensureDisabledLoaded() {
    if (this._disabledLoaded) return
    this._disabledLoaded = true

    try {
      const rawList = await window.electronAPI?.storeGet?.(STORE_KEY_DISABLED)
      if (Array.isArray(rawList)) {
        this._disabledPlugins = new Set(rawList)
      }
      const rawMeta = await window.electronAPI?.storeGet?.(STORE_KEY_DISABLED_META)
      if (rawMeta && typeof rawMeta === 'object') {
        this._disabledPluginsMeta = { ...rawMeta }
      }
    } catch (e) {
      console.warn('[PluginManager] Erreur chargement disabled plugins:', e)
    }
  }

  async _saveDisabled() {
    try {
      await window.electronAPI?.storeSet?.(
        STORE_KEY_DISABLED,
        Array.from(this._disabledPlugins)
      )
      await window.electronAPI?.storeSet?.(
        STORE_KEY_DISABLED_META,
        this._disabledPluginsMeta
      )
    } catch (e) {
      console.warn('[PluginManager] Erreur save disabled plugins:', e)
    }
  }

  isPluginDisabled(pluginId) {
    return this._disabledPlugins.has(pluginId)
  }

  getDisabledPlugins() {
    return Object.values(this._disabledPluginsMeta || {})
  }

  // ─── INIT ────────────────────────────────────────────────────────────

  async initialize(store) {
    if (this._initialized) return
    this.store = store

    try {
      await this._ensureDisabledLoaded()

      // 1. Plugins intégrés — skip si désactivés
      for (const [pluginId, loader] of INTEGRATED_PLUGINS) {
        if (this._disabledPlugins.has(pluginId)) {
          console.log(`⏸️ [PluginManager] Plugin intégré ${pluginId} désactivé`)
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
        if (this._disabledPlugins.has(pluginInfo.id)) continue
        await this.loadPlugin(pluginInfo)
      }

      this._initialized = true
      this.runHook('onAppStart', store)
    } catch (e) {
      console.error('❌ Erreur lors de l\'initialisation du PluginManager:', e)
      this._initialized = true
    }
  }

  // ─── LOAD PLUGIN ─────────────────────────────────────────────────────

  async loadPlugin(pluginInfo) {
    if (this._loadingPlugins.has(pluginInfo.id)) {
      console.warn(`⚠️ Plugin ${pluginInfo.id} déjà en cours de chargement`)
      return false
    }

    if (this.plugins.has(pluginInfo.id)) {
      console.warn(`⚠️ Plugin ${pluginInfo.id} déjà chargé`)
      return true
    }

    this._loadingPlugins.add(pluginInfo.id)

    try {
      if (!this._checkCompatibility(pluginInfo)) {
        console.error(`❌ Plugin ${pluginInfo.id} incompatible`)
        this._loadingPlugins.delete(pluginInfo.id)
        return false
      }

      let pluginModule = null

      if (pluginInfo._loader) {
        try {
          pluginModule = await pluginInfo._loader()
        } catch (e) {
          console.error(`❌ Erreur chargement intégré ${pluginInfo.id}:`, e)
          this._loadingPlugins.delete(pluginInfo.id)
          return false
        }
      } else {
        const paths = [
          `../../plugins/${pluginInfo.id}/index.js`,
          `../../plugins/${pluginInfo.id}/index.jsx`,
          `/src/plugins/${pluginInfo.id}/index.js`,
          `/src/plugins/${pluginInfo.id}/index.jsx`,
          `../plugins/${pluginInfo.id}/index`,
          `/src/plugins/${pluginInfo.id}/index`,
        ]

        let lastError = null

        for (const importPath of paths) {
          try {
            pluginModule = await import(/* @vite-ignore */ importPath)
            break
          } catch (e) {
            lastError = e
          }
        }

        if (!pluginModule) {
          try {
            const fullPath = await window.electronAPI?.getPluginPath?.(
              pluginInfo.id
            )
            if (fullPath) {
              pluginModule = await import(/* @vite-ignore */ fullPath)
            }
          } catch (e) {
            lastError = e
          }
        }

        if (!pluginModule) {
          console.error(
            `❌ Plugin ${pluginInfo.id} introuvable:`,
            lastError?.message || 'aucun chemin valide'
          )
          this._loadingPlugins.delete(pluginInfo.id)
          return false
        }
      }

      const plugin = pluginModule.default || pluginModule

      if (!plugin.id) {
        console.error('❌ Plugin invalide: id manquant')
        this._loadingPlugins.delete(pluginInfo.id)
        return false
      }

      this.plugins.set(plugin.id, {
        ...plugin,
        info: pluginInfo,
        isIntegrated: INTEGRATED_PLUGIN_IDS.has(plugin.id),
        loadedAt: Date.now(),
      })

      if (plugin.pages) {
        for (const page of plugin.pages) {
          this.pages.set(page.id, {
            ...page,
            pluginId: plugin.id,
            componentPath:
              page.componentPath || page.component || `${plugin.id}/${page.id}`,
          })

          if (page.component && typeof page.component !== 'string') {
            this.components.set(page.id, page.component)
          }
        }
      }

      if (typeof plugin.init === 'function') {
        await plugin.init(this.store, this)
      }

      this.runHook('onPluginLoad', plugin)
      this.invalidatePagesCache()

      this._loadingPlugins.delete(plugin.id)
      return true
    } catch (e) {
      console.error(`❌ Erreur chargement plugin ${pluginInfo.id}:`, e)
      this._loadingPlugins.delete(pluginInfo.id)
      return false
    }
  }

  // ─── UNLOAD PLUGIN ───────────────────────────────────────────────────

  /**
   * Décharge un plugin.
   * @param {string} pluginId
   * @param {{ permanent?: boolean }} [options]
   *   - permanent: true → ajoute le plugin à la liste des désactivés persistants
   *     (à utiliser pour les plugins intégrés qu'on ne peut pas supprimer du disque)
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
      console.warn(`⚠️ Erreur destroy() du plugin ${pluginId}:`, e)
    }

    // Retirer les pages enregistrées
    const pageIds = Array.from(this.pages.keys())
    for (const pageId of pageIds) {
      if (this.pages.get(pageId).pluginId === pluginId) {
        this.pages.delete(pageId)
        this.components.delete(pageId)
      }
    }

    this.plugins.delete(pluginId)
    this.runHook('onPluginUnload', plugin)
    this.invalidatePagesCache()

    if (permanent) {
      await this._ensureDisabledLoaded()
      this._disabledPlugins.add(pluginId)

      // Stocker les métadonnées pour pouvoir les réafficher dans Options
      this._disabledPluginsMeta[pluginId] = {
        id: pluginId,
        name: plugin.name || pluginId,
        nameKey: plugin.nameKey || null,
        version: plugin.version || '1.0.0',
        author: plugin.author || 'Inconnu',
        isIntegrated: INTEGRATED_PLUGIN_IDS.has(pluginId),
        disabledAt: Date.now(),
      }

      await this._saveDisabled()
    }

    return true
  }

  // ─── ENABLE PLUGIN ───────────────────────────────────────────────────

  /**
   * Réactive un plugin précédemment désactivé.
   */
  async enablePlugin(pluginId) {
    await this._ensureDisabledLoaded()

    this._disabledPlugins.delete(pluginId)
    delete this._disabledPluginsMeta[pluginId]
    await this._saveDisabled()
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

    // Plugin externe : rechargement depuis le disque
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

    const t = translateFn || ((key) => key)

    const corePages = CORE_PAGES_DEFS.map(({ id, labelKey, group }) => ({
      id,
      label: t(labelKey),
      icon: DEFAULT_ICONS[id],
      group: DEFAULT_GROUPS[id] || group,
      isCore: true,
    }))

    const pluginPages = Array.from(this.pages.values()).map((p) => ({
      ...p,
      label: p.labelKey ? t(p.labelKey) : p.label,
      isCore: false,
      isPlugin: true,
    }))

    const storePages = this._getStorePages()

    const result = [...corePages, ...pluginPages, ...storePages]

    this._pagesCache = result
    this._pagesCacheKey = cacheKey
    return result
  }

  _getStorePages() {
    if (!this.store) return []

    const profiles = this.store.profiles || []
    return profiles.map((p) => ({
      id: `profile-${p.id}`,
      label: p.name,
      icon: p.id === 'all' ? 'ti-stack' : 'ti-user',
      isCore: false,
      isProfile: true,
      group: 'profiles',
      profileId: p.id,
    }))
  }

  getPage(pageId, translateFn) {
    const allPages = this.getAllPages(translateFn)
    return allPages.find((p) => p.id === pageId)
  }

  isPluginPage(pageId) {
    return this.pages.has(pageId)
  }

  async getPluginComponent(pageId) {
    if (this.components.has(pageId)) {
      return this.components.get(pageId)
    }

    const page = this.pages.get(pageId)
    if (!page) return null

    try {
      if (import.meta.env.DEV) {
        const plugin = this.plugins.get(page.pluginId)
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
              this.components.set(pageId, Component)
              return Component
            }
          } catch (e) {
            // Essayer le chemin suivant
          }
        }
        console.warn(`⚠️ Composant non trouvé pour la page ${pageId}`, paths)
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
          this.components.set(pageId, Component)
          return Component
        }
      }
    } catch (e) {
      console.error(`❌ Erreur chargement du composant ${pageId}:`, e)
    }

    return null
  }

  // ─── COMPAT / UTILS ──────────────────────────────────────────────────

  _checkCompatibility(pluginInfo) {
    const appVersion = pluginInfo.appVersion || '1.3.0'
    if (
      pluginInfo.requires &&
      !this._semverSatisfies(appVersion, pluginInfo.requires)
    ) {
      console.warn(
        `⚠️ Plugin ${pluginInfo.id} requiert ${pluginInfo.requires}, version actuelle ${appVersion}`
      )
      return false
    }

    return true
  }

  _semverSatisfies(version, requirement) {
    const parse = (v) =>
      String(v)
        .split('.')
        .map((n) => parseInt(n, 10) || 0)

    const cmp = (a, b) => {
      const va = parse(a)
      const vb = parse(b)
      const len = Math.max(va.length, vb.length)
      for (let i = 0; i < len; i++) {
        const x = va[i] || 0
        const y = vb[i] || 0
        if (x !== y) return x - y
      }
      return 0
    }

    const match = String(requirement).match(/^(>=|<=|>|<|=)?\s*(.+)$/)
    if (!match) return false
    const op = match[1] || '='
    const reqVersion = match[2].trim()
    const c = cmp(version, reqVersion)

    switch (op) {
      case '>=': return c >= 0
      case '>':  return c > 0
      case '<=': return c <= 0
      case '<':  return c < 0
      case '=':  return c === 0
      default:   return c === 0
    }
  }

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