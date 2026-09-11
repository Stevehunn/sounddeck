/**
 * PluginManager - Gestionnaire central des plugins
 */
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
      onPluginUnload: []
    }
    this._initialized = false
    this._loadingPlugins = new Set()
    this.store = null
  }

  async initialize(store) {
    if (this._initialized) return
    this.store = store

    try {
      const installedPlugins = await window.electronAPI?.getInstalledPlugins?.() || []

      for (const pluginInfo of installedPlugins) {
        if (pluginInfo.enabled !== false) {
          await this.loadPlugin(pluginInfo)
        }
      }

      this._initialized = true
      this.runHook('onAppStart', store)

    } catch (e) {
      console.error('❌ Erreur lors de l\'initialisation du PluginManager:', e)
      this._initialized = true
    }
  }

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

      let pluginModule

      try {
        if (import.meta.env.DEV) {
          const paths = [
            `../../plugins/${pluginInfo.id}/index.js`,
            `../../plugins/${pluginInfo.id}/index.jsx`,
            `/src/plugins/${pluginInfo.id}/index.js`,
            `/src/plugins/${pluginInfo.id}/index.jsx`,
            `../plugins/${pluginInfo.id}/index`,
            `/src/plugins/${pluginInfo.id}/index`,
          ]

          let loaded = false
          let lastError = null

          for (const importPath of paths) {
            try {
              pluginModule = await import(/* @vite-ignore */ importPath)
              loaded = true
              break
            } catch (e) {
              lastError = e
            }
          }

          if (!loaded) {
            throw new Error(
              `Plugin ${pluginInfo.id} non trouvé dans les chemins: ${paths.join(', ')}\n${lastError?.message || ''}`
            )
          }
        } else {
          const fullPath = await window.electronAPI?.getPluginPath?.(pluginInfo.id)
          if (fullPath) {
            pluginModule = await import(/* @vite-ignore */ fullPath)
          } else {
            throw new Error(`Plugin ${pluginInfo.id} non trouvé`)
          }
        }
      } catch (e) {
        console.error(`❌ Erreur chargement du module ${pluginInfo.id}:`, e)
        this._loadingPlugins.delete(pluginInfo.id)
        return false
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
        loadedAt: Date.now()
      })

      if (plugin.pages) {
        for (const page of plugin.pages) {
          this.pages.set(page.id, {
            ...page,
            pluginId: plugin.id,
            componentPath: page.component || page.componentPath || `${plugin.id}/${page.id}`
          })

          if (page.component) {
            this.components.set(page.id, page.component)
          }
        }
      }

      if (plugin.i18n) {
        this._addTranslations(plugin.i18n)
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

  getAllPages(translateFn) {
    const t = translateFn || ((key) => key)

    const corePages = [
      { id: 'home', label: t('mySounds'), icon: 'ti-home', isCore: true, group: 'navigation' },
      { id: 'discover', label: t('discover'), icon: 'ti-compass', isCore: true, group: 'navigation' },
      { id: 'trimmer', label: t('trimmer'), icon: 'ti-cut', isCore: true, group: 'navigation' },
      { id: 'editor', label: t('editor'), icon: 'ti-wand', isCore: true, group: 'navigation' },
      { id: 'sequencer', label: t('sequencer'), icon: 'ti-playlist', isCore: true, group: 'navigation' },
      { id: 'youtube', label: t('youtube'), icon: 'ti-brand-youtube', isCore: true, group: 'navigation' },
      { id: 'stats', label: t('stats'), icon: 'ti-chart-bar', isCore: true, group: 'navigation' },
      { id: 'guide', label: t('guide'), icon: 'ti-book', isCore: true, group: 'footer' },
      { id: 'options', label: t('options'), icon: 'ti-settings', isCore: true, group: 'footer' }
    ]

    const pluginPages = Array.from(this.pages.values()).map(p => ({
      ...p,
      isCore: false,
      isPlugin: true
    }))

    const storePages = this._getStorePages()

    return [...corePages, ...pluginPages, ...storePages]
  }

  _getStorePages() {
    if (!this.store) return []

    const profiles = this.store.profiles || []
    return profiles.map(p => ({
      id: `profile-${p.id}`,
      label: p.name,
      icon: p.id === 'all' ? 'ti-stack' : 'ti-user',
      isCore: false,
      isProfile: true,
      group: 'profiles',
      profileId: p.id
    }))
  }

  getPage(pageId) {
    const allPages = this.getAllPages()
    return allPages.find(p => p.id === pageId)
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
      let module
      if (import.meta.env.DEV) {
        const plugin = this.plugins.get(page.pluginId)
        if (!plugin) return null

        const paths = [
          `../plugins/${page.pluginId}/${page.componentPath}`,
          `../plugins/${page.pluginId}/pages/${page.id}`,
          `../plugins/${page.pluginId}/${page.id}`,
          `../plugins/${page.pluginId}/components/${page.id}`
        ]

        for (const path of paths) {
          try {
            const module = await import(/* @vite-ignore */ path);
            if (module) {
              const Component = module.default || module
              this.components.set(pageId, Component)
              return Component
            }
          } catch (e) {
            // Continuer
          }
        }
        console.warn(`⚠️ Composant non trouvé pour la page ${pageId}`, paths)
        return null
      } else {
        const pluginPath = await window.electronAPI?.getPluginComponentPath?.(page.pluginId, page.id)
        if (pluginPath) {
          module = await import(/* @vite-ignore */ pluginPath);
        }
      }

      if (module) {
        const Component = module.default || module
        this.components.set(pageId, Component)
        return Component
      }
    } catch (e) {
      console.error(`❌ Erreur chargement du composant ${pageId}:`, e)
    }

    return null
  }

  _addTranslations(translations) {
    if (!window.__I18N__) {
      window.__I18N__ = {}
    }

    for (const [lang, keys] of Object.entries(translations)) {
      if (!window.__I18N__[lang]) {
        window.__I18N__[lang] = {}
      }
      Object.assign(window.__I18N__[lang], keys)
    }
  }

  _checkCompatibility(pluginInfo) {
    const appVersion = pluginInfo.appVersion || '1.3.0'
    if (pluginInfo.requires && !this._semverSatisfies(appVersion, pluginInfo.requires)) {
      console.warn(`⚠️ Plugin ${pluginInfo.id} requiert ${pluginInfo.requires}, version actuelle ${appVersion}`)
      return false
    }

    return true
  }

  _semverSatisfies(version, requirement) {
    if (requirement.startsWith('>=')) {
      const reqVersion = requirement.replace('>=', '')
      return version >= reqVersion
    }
    if (requirement.startsWith('>')) {
      const reqVersion = requirement.replace('>', '')
      return version > reqVersion
    }
    if (requirement.startsWith('<=')) {
      const reqVersion = requirement.replace('<=', '')
      return version <= reqVersion
    }
    if (requirement.startsWith('<')) {
      const reqVersion = requirement.replace('<', '')
      return version < reqVersion
    }
    if (requirement.startsWith('=')) {
      const reqVersion = requirement.replace('=', '')
      return version === reqVersion
    }
    return version === requirement
  }

  runHook(hookName, ...args) {
    const hooks = this.hooks[hookName] || []
    return hooks.map(fn => fn(...args))
  }

  addHook(hookName, fn) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = []
    }
    this.hooks[hookName].push(fn)
  }

  getLoadedPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name || p.id,
      version: p.version || '1.0.0',
      author: p.author || 'Inconnu',
      loadedAt: p.loadedAt,
      pages: p.pages?.length || 0
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