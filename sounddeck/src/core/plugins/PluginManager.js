/**
 * PluginManager - Gestionnaire central des plugins
 * 
 * Permet de :
 * - Enregistrer des plugins
 * - Charger des plugins dynamiquement
 * - Gérer les pages ajoutées par les plugins
 * - Exécuter des hooks
 * - Vérifier la compatibilité
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

  /**
   * Initialise le gestionnaire de plugins
   */
  async initialize(store) {
    if (this._initialized) return
    this.store = store

    console.log('🔌 Initialisation du PluginManager...')

    try {
      // Charger les plugins installés
      const installedPlugins = await window.electronAPI?.getInstalledPlugins?.() || []
      
      for (const pluginInfo of installedPlugins) {
        if (pluginInfo.enabled !== false) {
          await this.loadPlugin(pluginInfo)
        }
      }

      this._initialized = true
      console.log(`✅ PluginManager initialisé (${this.plugins.size} plugins chargés)`)
      
      // Exécuter les hooks onAppStart
      this.runHook('onAppStart', store)
      
    } catch (e) {
      console.error('❌ Erreur lors de l\'initialisation du PluginManager:', e)
      this._initialized = true // Pour ne pas bloquer l'app
    }
  }

  /**
   * Charge un plugin depuis ses informations
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
      // Vérifier la compatibilité
      if (!this._checkCompatibility(pluginInfo)) {
        console.error(`❌ Plugin ${pluginInfo.id} incompatible`)
        this._loadingPlugins.delete(pluginInfo.id)
        return false
      }

      // Charger le module du plugin
      let pluginModule

      try {
        if (import.meta.env.DEV) {
          // ✅ MEILLEURE GESTION DES CHEMINS
          const paths = [
            // Chemin relatif depuis le dossier courant
            `../../plugins/${pluginInfo.id}/index.js`,
            `../../plugins/${pluginInfo.id}/index.jsx`,
            // Depuis la racine du projet
            `/src/plugins/${pluginInfo.id}/index.js`,
            `/src/plugins/${pluginInfo.id}/index.jsx`,
            // Sans extension
            `../plugins/${pluginInfo.id}/index`,
            `/src/plugins/${pluginInfo.id}/index`,
          ]
          
          let loaded = false
          let lastError = null
          
          for (const importPath of paths) {
            try {
              console.log(`📂 Tentative de chargement depuis: ${importPath}`)
              // ✅ AJOUT DE @vite-ignore
              pluginModule = await import(/* @vite-ignore */ importPath)
              loaded = true
              break
            } catch (e) {
              lastError = e
              // Essayer le chemin suivant
            }
          }
          
          if (!loaded) {
            throw new Error(
              `Plugin ${pluginInfo.id} non trouvé dans les chemins: ${paths.join(', ')}\n${lastError?.message || ''}`
            )
          }
        } else {
          // En production : charger depuis userData/plugins/
          const fullPath = await window.electronAPI?.getPluginPath?.(pluginInfo.id)
          if (fullPath) {
            // ✅ AJOUT DE @vite-ignore
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

      // Valider le plugin
      if (!plugin.id) {
        console.error('❌ Plugin invalide: id manquant')
        this._loadingPlugins.delete(pluginInfo.id)
        return false
      }

      // Enregistrer le plugin
      this.plugins.set(plugin.id, {
        ...plugin,
        info: pluginInfo,
        loadedAt: Date.now()
      })

      // Enregistrer les pages
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

      // Ajouter les traductions
      if (plugin.i18n) {
        this._addTranslations(plugin.i18n)
      }

      // Initialiser le plugin
      if (typeof plugin.init === 'function') {
        await plugin.init(this.store, this)
      }

      // Exécuter les hooks
      this.runHook('onPluginLoad', plugin)

      console.log(`✅ Plugin ${plugin.id} (v${plugin.version}) chargé`)
      this._loadingPlugins.delete(plugin.id)
      return true

    } catch (e) {
      console.error(`❌ Erreur chargement plugin ${pluginInfo.id}:`, e)
      this._loadingPlugins.delete(pluginInfo.id)
      return false
    }
  }

  /**
   * Décharge un plugin
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    // Exécuter le hook de déchargement
    if (typeof plugin.destroy === 'function') {
      await plugin.destroy()
    }

    // Supprimer les pages du plugin
    const pageIds = Array.from(this.pages.keys())
    for (const pageId of pageIds) {
      if (this.pages.get(pageId).pluginId === pluginId) {
        this.pages.delete(pageId)
        this.components.delete(pageId)
      }
    }

    this.plugins.delete(pluginId)
    this.runHook('onPluginUnload', plugin)
    
    console.log(`🗑️ Plugin ${pluginId} déchargé`)
    return true
  }

  /**
   * Récupère toutes les pages (core + plugins)
   * @param {Function} translateFn - Fonction de traduction
   * @returns {Array} Liste des pages
   */
  getAllPages(translateFn) {
    // Si aucune fonction de traduction n'est fournie, on utilise une fonction d'identité
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

    // Fusionner avec les pages du store (profils, etc.)
    const storePages = this._getStorePages()

    return [...corePages, ...pluginPages, ...storePages]
  }

  /**
   * Récupère les pages du store (profils, etc.)
   */
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

  /**
   * Récupère une page par son ID
   */
  getPage(pageId) {
    const allPages = this.getAllPages()
    return allPages.find(p => p.id === pageId)
  }

  /**
   * Vérifie si une page est un plugin
   */
  isPluginPage(pageId) {
    return this.pages.has(pageId)
  }

  /**
   * Récupère le composant d'une page plugin
   */
  async getPluginComponent(pageId) {
    // Si le composant est déjà en cache
    if (this.components.has(pageId)) {
      return this.components.get(pageId)
    }

    const page = this.pages.get(pageId)
    if (!page) return null

    try {
      let module
      if (import.meta.env.DEV) {
        // En développement : charger depuis le dossier src/plugins/
        const plugin = this.plugins.get(page.pluginId)
        if (!plugin) return null
        
        // Essayer différents chemins
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
        // En production : charger depuis le dossier userData
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

  /**
   * Ajoute des traductions
   */
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

  /**
   * Vérifie la compatibilité du plugin
   */
  _checkCompatibility(pluginInfo) {
    // Vérifier la version de l'application
    const appVersion = pluginInfo.appVersion || '1.3.0'
    if (pluginInfo.requires && !this._semverSatisfies(appVersion, pluginInfo.requires)) {
      console.warn(`⚠️ Plugin ${pluginInfo.id} requiert ${pluginInfo.requires}, version actuelle ${appVersion}`)
      return false
    }

    return true
  }

  /**
   * Vérification semver simplifiée
   */
  _semverSatisfies(version, requirement) {
    // Version simplifiée
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

  /**
   * Exécute un hook
   */
  runHook(hookName, ...args) {
    const hooks = this.hooks[hookName] || []
    return hooks.map(fn => fn(...args))
  }

  /**
   * Ajoute un hook
   */
  addHook(hookName, fn) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = []
    }
    this.hooks[hookName].push(fn)
  }

  /**
   * Récupère la liste des plugins chargés
   */
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

  /**
   * Vérifie si un plugin est chargé
   */
  isPluginLoaded(pluginId) {
    return this.plugins.has(pluginId)
  }

  /**
   * Récupère un plugin par son ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null
  }
}

// Singleton
export const pluginManager = new PluginManager()