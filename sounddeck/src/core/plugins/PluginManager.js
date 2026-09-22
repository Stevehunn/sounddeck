// src/core/plugins/PluginManager.js
/**
 * PluginManager - Gestionnaire central des plugins
 */
import { DEFAULT_ICONS, DEFAULT_GROUPS } from '@shared/constants/navigation'

// ─── PLUGINS INTÉGRÉS (bundlés) ─────────────────────────────────────────
const INTEGRATED_PLUGIN_LOADERS = import.meta.glob('../../plugins/*/index.js')

// Map : { 'myinstants' → loader, 'youtube' → loader, 'emoji' → loader }
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
  { id: 'discover', labelKey: 'discover', group: 'navigation' },
  { id: 'trimmer', labelKey: 'trimmer', group: 'navigation' },
  { id: 'editor', labelKey: 'editor', group: 'navigation' },
  { id: 'sequencer', labelKey: 'sequencer', group: 'navigation' },
  { id: 'youtube', labelKey: 'youtube', group: 'navigation' },
  { id: 'stats', labelKey: 'stats', group: 'navigation' },
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
  }

  /**
   * Initialise le gestionnaire de plugins.
   * Charge d'abord les plugins INTÉGRÉS (bundlés), puis les EXTERNES.
   */
  async initialize(store) {
    if (this._initialized) return
    this.store = store

    try {
      // 1. Plugins intégrés — toujours chargés
      for (const [pluginId, loader] of INTEGRATED_PLUGINS) {
        await this.loadPlugin({ id: pluginId, enabled: true, _integrated: true, _loader: loader })
      }

      // 2. Plugins externes — installés par l'utilisateur dans userData/plugins
      //    Note : les IDs déjà chargés (intégrés) sont skippés.
      const installedPlugins =
        (await window.electronAPI?.getInstalledPlugins?.()) || []

      for (const pluginInfo of installedPlugins) {
        if (pluginInfo.enabled === false) continue
        if (INTEGRATED_PLUGIN_IDS.has(pluginInfo.id)) continue // déjà chargé
        await this.loadPlugin(pluginInfo)
      }

      this._initialized = true
      this.runHook('onAppStart', store)
    } catch (e) {
      console.error('❌ Erreur lors de l\'initialisation du PluginManager:', e)
      this._initialized = true
    }
  }

  /**
   * Charge un plugin.
   * - Si le plugin est INTÉGRÉ : utilise le loader pré-bundlé via import.meta.glob
   * - Sinon : tentative de chargement dynamique (dev only en pratique)
   */
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

      //  Cas 1 : plugin intégré (bundlé par Vite)
      if (pluginInfo._loader) {
        try {
          pluginModule = await pluginInfo._loader()
        } catch (e) {
          console.error(`❌ Erreur chargement intégré ${pluginInfo.id}:`, e)
          this._loadingPlugins.delete(pluginInfo.id)
          return false
        }
      } else {
        // Cas 2 : plugin externe — on tente les chemins connus
        // (fonctionne en dev uniquement ; en prod c'est limité, cf O5)
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
          // Fallback : chemin disque (résolution par Vite en dev)
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
            // Composant React déjà résolu par l'import statique du plugin
            this.components.set(page.id, page.component)
          }
        }
      }

      if (typeof plugin.init === 'function') {
        await plugin.init(this.store, this)
      }

      this.runHook('onPluginLoad', plugin)

      this._loadingPlugins.delete(plugin.id)
      return true
    } catch (e) {
      console.error(`❌ Erreur chargement plugin ${pluginInfo.id}:`, e)
      this._loadingPlugins.delete(pluginInfo.id)
      return false
    }
  }

  /**
   * Décharge un plugin.
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    if (typeof plugin.destroy === 'function') {
      await plugin.destroy()
    }

    const pageIds = Array.from(this.pages.keys())
    for (const pageId of pageIds) {
      if (this.pages.get(pageId).pluginId === pluginId) {
        this.pages.delete(pageId)
        this.components.delete(pageId)
      }
    }

    this.plugins.delete(pluginId)
    this.runHook('onPluginUnload', plugin)

    return true
  }

  /**
   * Récupère toutes les pages (core + plugins + profils).
   */
  getAllPages(translateFn) {
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

    return [...corePages, ...pluginPages, ...storePages]
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

  /**
   * Récupère le composant d'une page plugin.
   */
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

      // Production : tenté via IPC (limité, cf O5)
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