import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Howl } from 'howler'
import { CATEGORIES, CATEGORIES_LIST } from './categories'

// ✅ Traductions complètes avec les catégories
const TRANSLATIONS = {
  fr: {
    myinstantsTitle: 'Découverte MyInstants',
    myinstantsSearchPlaceholder: 'Rechercher un son...',
    myinstantsCategories: 'Catégories',
    myinstantsClearSearch: 'Effacer la recherche',
    myinstantsAdd: 'Ajouter',
    myinstantsRefresh: 'Actualiser',
    myinstantsSearch: 'Chercher',
    myinstantsPreview: 'Écouter',
    myinstantsStop: 'Arrêter',
    myinstantsShowMore: 'Voir toutes les catégories',
    myinstantsShowLess: 'Voir moins',
    myinstantsLoading: 'Chargement des sons...',
    myinstantsNoResults: 'Aucun son trouvé',
    myinstantsAlreadyAdded: 'Déjà ajouté',
    myinstantsAdded: 'ajouté à la bibliothèque !',
    myinstantsError: 'Erreur lors de la recherche',
    myinstantsSoundsAvailable: 'sons disponibles',
    myinstantsResultsFor: 'Résultats pour',
    myinstantsPreloading: 'Préchargement...',
    myinstantsCategoriesLoaded: 'Catégories chargées',
    myinstantsAllCategoriesLoaded: 'Toutes les catégories sont préchargées !',
    myinstantsTryDifferentSearch: 'Essayez une autre recherche',
    myinstantsSelectCategory: 'Sélectionnez une catégorie ou faites une recherche',
    myinstantsPlaying: 'Lecture en cours...',
    myinstantsPreloadCancel: 'Annuler',
    myinstantsPreloadInBackground: 'Chargement en arrière-plan',
    myinstantsLoadingFromCache: '📦 {count} sons en cache',
    myinstantsRefreshDatabase: '🔄 Mettre à jour la base de sons',
    myinstantsAddToProfile: 'Ajouter à quel profil ?',
    myinstantsAllProfiles: 'Tous les profils',

    // Catégories
    category_trending: 'Tendances',
    category_best: 'Meilleurs',
    category_popular: 'Populaires',
    category_memes: 'Memes',
    category_vines: 'Vines',
    category_reactions: 'Réactions',
    category_sounds: 'Sons cultes',
    category_discord: 'Discord',
    category_twitch: 'Twitch',
    category_streaming: 'Streaming',
    category_gaming: 'Gaming',
    category_anime: 'Anime',
    category_anime_sounds: 'Sons d\'anime',
    category_naruto: 'Naruto',
    category_one_piece: 'One Piece',
    category_dragon_ball: 'Dragon Ball',
    category_video_games: 'Jeux vidéo',
    category_minecraft: 'Minecraft',
    category_fortnite: 'Fortnite',
    category_roblox: 'Roblox',
    category_among_us: 'Among Us',
    category_movies: 'Films',
    category_star_wars: 'Star Wars',
    category_marvel: 'Marvel',
    category_harry_potter: 'Harry Potter',
    category_music: 'Musique',
    category_memes_music: 'Memes musicaux',
    category_sports: 'Sports',
    category_football: 'Football',
    category_politics: 'Politique',
    category_french_politics: 'Politique FR',
    category_animals: 'Animaux',
    category_cat: 'Chats',
    category_dog: 'Chiens',
    category_alerts: 'Alertes',
    category_alarms: 'Alarmes',
    category_notifications: 'Notifications',
    category_sfx: 'Effets sonores',
    category_impacts: 'Impacts',
    category_transitions: 'Transitions',
    category_new: 'Nouveautés',
  },
  en: {
    myinstantsTitle: 'MyInstants Discovery',
    myinstantsSearchPlaceholder: 'Search a sound...',
    myinstantsCategories: 'Categories',
    myinstantsClearSearch: 'Clear search',
    myinstantsAdd: 'Add',
    myinstantsRefresh: 'Refresh',
    myinstantsSearch: 'Search',
    myinstantsPreview: 'Preview',
    myinstantsStop: 'Stop',
    myinstantsShowMore: 'See all categories',
    myinstantsShowLess: 'Show less',
    myinstantsLoading: 'Loading sounds...',
    myinstantsNoResults: 'No sounds found',
    myinstantsAlreadyAdded: 'Already added',
    myinstantsAdded: 'added to library!',
    myinstantsError: 'Error during search',
    myinstantsSoundsAvailable: 'sounds available',
    myinstantsResultsFor: 'Results for',
    myinstantsPreloading: 'Preloading...',
    myinstantsCategoriesLoaded: 'Categories loaded',
    myinstantsAllCategoriesLoaded: 'All categories are preloaded!',
    myinstantsTryDifferentSearch: 'Try a different search',
    myinstantsSelectCategory: 'Select a category or search',
    myinstantsPlaying: 'Playing...',
    myinstantsPreloadCancel: 'Cancel',
    myinstantsPreloadInBackground: 'Loading in background',
    myinstantsLoadingFromCache: '📦 {count} sounds in cache',
    myinstantsRefreshDatabase: '🔄 Update sound database',
    myinstantsAddToProfile: 'Add to which profile?',
    myinstantsAllProfiles: 'All profiles',

    category_trending: 'Trending',
    category_best: 'Best',
    category_popular: 'Popular',
    category_memes: 'Memes',
    category_vines: 'Vines',
    category_reactions: 'Reactions',
    category_sounds: 'Iconic sounds',
    category_discord: 'Discord',
    category_twitch: 'Twitch',
    category_streaming: 'Streaming',
    category_gaming: 'Gaming',
    category_anime: 'Anime',
    category_anime_sounds: 'Anime sounds',
    category_naruto: 'Naruto',
    category_one_piece: 'One Piece',
    category_dragon_ball: 'Dragon Ball',
    category_video_games: 'Video games',
    category_minecraft: 'Minecraft',
    category_fortnite: 'Fortnite',
    category_roblox: 'Roblox',
    category_among_us: 'Among Us',
    category_movies: 'Movies',
    category_star_wars: 'Star Wars',
    category_marvel: 'Marvel',
    category_harry_potter: 'Harry Potter',
    category_music: 'Music',
    category_memes_music: 'Music memes',
    category_sports: 'Sports',
    category_football: 'Football',
    category_politics: 'Politics',
    category_french_politics: 'FR Politics',
    category_animals: 'Animals',
    category_cat: 'Cats',
    category_dog: 'Dogs',
    category_alerts: 'Alerts',
    category_alarms: 'Alarms',
    category_notifications: 'Notifications',
    category_sfx: 'Sound effects',
    category_impacts: 'Impacts',
    category_transitions: 'Transitions',
    category_new: 'New',
  },
  es: {
    myinstantsTitle: 'Descubrimiento MyInstants',
    myinstantsSearchPlaceholder: 'Buscar un sonido...',
    myinstantsCategories: 'Categorías',
    myinstantsClearSearch: 'Limpiar búsqueda',
    myinstantsAdd: 'Añadir',
    myinstantsRefresh: 'Actualizar',
    myinstantsSearch: 'Buscar',
    myinstantsPreview: 'Escuchar',
    myinstantsStop: 'Detener',
    myinstantsShowMore: 'Ver todas las categorías',
    myinstantsShowLess: 'Ver menos',
    myinstantsLoading: 'Cargando sonidos...',
    myinstantsNoResults: 'No se encontraron sonidos',
    myinstantsAlreadyAdded: 'Ya añadido',
    myinstantsAdded: '¡añadido a la biblioteca!',
    myinstantsError: 'Error durante la búsqueda',
    myinstantsSoundsAvailable: 'sonidos disponibles',
    myinstantsResultsFor: 'Resultados para',
    myinstantsPreloading: 'Precargando...',
    myinstantsCategoriesLoaded: 'Categorías cargadas',
    myinstantsAllCategoriesLoaded: '¡Todas las categorías están precargadas!',
    myinstantsTryDifferentSearch: 'Prueba otra búsqueda',
    myinstantsSelectCategory: 'Selecciona una categoría o busca',
    myinstantsPlaying: 'Reproduciendo...',
    myinstantsPreloadCancel: 'Cancelar',
    myinstantsPreloadInBackground: 'Cargando en segundo plano',
    myinstantsLoadingFromCache: '📦 {count} sonidos en caché',
    myinstantsRefreshDatabase: '🔄 Actualizar base de sonidos',
    myinstantsAddToProfile: '¿Añadir a qué perfil?',
    myinstantsAllProfiles: 'Todos los perfiles',

    category_trending: 'Tendencias',
    category_best: 'Mejores',
    category_popular: 'Populares',
    category_memes: 'Memes',
    category_vines: 'Vines',
    category_reactions: 'Reacciones',
    category_sounds: 'Sonidos icónicos',
    category_discord: 'Discord',
    category_twitch: 'Twitch',
    category_streaming: 'Streaming',
    category_gaming: 'Gaming',
    category_anime: 'Anime',
    category_anime_sounds: 'Sonidos de anime',
    category_naruto: 'Naruto',
    category_one_piece: 'One Piece',
    category_dragon_ball: 'Dragon Ball',
    category_video_games: 'Videojuegos',
    category_minecraft: 'Minecraft',
    category_fortnite: 'Fortnite',
    category_roblox: 'Roblox',
    category_among_us: 'Among Us',
    category_movies: 'Películas',
    category_star_wars: 'Star Wars',
    category_marvel: 'Marvel',
    category_harry_potter: 'Harry Potter',
    category_music: 'Música',
    category_memes_music: 'Memes musicales',
    category_sports: 'Deportes',
    category_football: 'Fútbol',
    category_politics: 'Política',
    category_french_politics: 'Política FR',
    category_animals: 'Animales',
    category_cat: 'Gatos',
    category_dog: 'Perros',
    category_alerts: 'Alertas',
    category_alarms: 'Alarmas',
    category_notifications: 'Notificaciones',
    category_sfx: 'Efectos de sonido',
    category_impacts: 'Impactos',
    category_transitions: 'Transiciones',
    category_new: 'Nuevo',
  }
}

export default function MyInstantsDiscover({ store, addToast, lang }) {
  const t = useCallback((key) => {
    const translations = TRANSLATIONS[lang] || TRANSLATIONS.fr
    return translations[key] || key
  }, [lang])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('trending')
  const [showAllCategories, setShowAllCategories] = useState(false)
  
  // ✅ État pour le modal de sélection de profil
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState('all')
  
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [preloadStatus, setPreloadStatus] = useState('')
  const [isPreloadComplete, setIsPreloadComplete] = useState(false)
  const [cacheInfo, setCacheInfo] = useState({})
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  const previewHowlRef = useRef(null)
  const preloadAbortRef = useRef(false)

  // ─── CACHE ──────────────────────────────────────────────────────────────────
  const CACHE_KEY = 'sounddeck_myinstants_cache'
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000

  function getCachedCategory(categoryId) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      const entry = cache[categoryId]
      if (!entry) return null
      
      if (Date.now() - entry.timestamp > CACHE_DURATION) {
        delete cache[categoryId]
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        return null
      }
      return entry.data
    } catch (e) {
      return null
    }
  }

  function setCachedCategory(categoryId, data) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      cache[categoryId] = {
        timestamp: Date.now(),
        data: data
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.warn('Erreur sauvegarde cache:', e)
    }
  }

  function getCacheInfo() {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      const info = {}
      for (const [key, entry] of Object.entries(cache)) {
        const age = Date.now() - entry.timestamp
        const hours = Math.floor(age / (60 * 60 * 1000))
        info[key] = {
          age: hours,
          expired: age > CACHE_DURATION,
          count: entry.data?.length || 0
        }
      }
      return info
    } catch (e) {
      return {}
    }
  }

  // ─── FONCTION DE CHARGEMENT ────────────────────────────────────────────────

  const loadCategory = useCallback(async (categoryId, forceRefresh = false) => {
    const category = CATEGORIES[categoryId]
    if (!category) return

    if (!forceRefresh && activeCategory === categoryId && results.length > 0) {
      return
    }

    if (!forceRefresh) {
      const cached = getCachedCategory(categoryId)
      if (cached && cached.length > 0) {
        setResults(cached)
        setError('')
        setActiveCategory(categoryId)
        setCacheInfo(getCacheInfo())
        return
      }
    }

    setLoading(true)
    setError('')
    setResults([])
    setActiveCategory(categoryId)

    try {
      let mode = category.mode
      let query = category.query

      const fetchWithTimeout = (promise, timeout = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ])
      }

      let result
      if (mode === 'local' || mode === 'trending') {
        result = await fetchWithTimeout(window.electronAPI.fetchMyinstants('', mode === 'local' ? 'local' : 'trending', lang))
      } else if (mode === 'multi') {
        const terms = query.split(',').map(t => t.trim()).filter(Boolean)
        const allResults = []
        const seen = new Set()
        const limitedTerms = terms.slice(0, 3)
        for (const term of limitedTerms) {
          const r = await fetchWithTimeout(window.electronAPI.fetchMyinstants(term, 'search', lang))
          if (r.success) {
            for (const sound of r.sounds) {
              if (!seen.has(sound.slug)) {
                seen.add(sound.slug)
                allResults.push(sound)
              }
            }
          }
        }
        result = { success: true, sounds: allResults }
      } else {
        result = await fetchWithTimeout(window.electronAPI.fetchMyinstants(query, 'search', lang))
      }

      if (result.success) {
        setResults(result.sounds || [])
        if (result.sounds.length > 0) {
          setCachedCategory(categoryId, result.sounds)
        }
        if (result.sounds.length === 0) {
          setError(t('myinstantsNoResults'))
        }
      } else {
        setError(result.error || t('myinstantsError'))
      }
    } catch (e) {
      console.error('Erreur chargement catégorie:', e)
      setError(e.message || t('myinstantsError'))
    }
    
    setLoading(false)
    setCacheInfo(getCacheInfo())
  }, [lang, t, activeCategory, results.length])

  // ─── PRÉCHARGEMENT OPTIMISÉ ──────────────────────────────────────────────

  const preloadAllCategories = useCallback(async () => {
    if (isPreloadComplete || isPreloading) return
    
    const allCached = Object.keys(CATEGORIES).every(id => {
      const cached = getCachedCategory(id)
      return cached && cached.length > 0
    })
    
    if (allCached) {
      setIsPreloadComplete(true)
      setCacheInfo(getCacheInfo())
      const cached = getCachedCategory('trending')
      if (cached && cached.length > 0) {
        setResults(cached)
        setActiveCategory('trending')
      }
      return
    }

    setIsPreloading(true)
    preloadAbortRef.current = false
    
    const categories = Object.entries(CATEGORIES)
    const total = categories.length
    let loaded = 0
    
    setPreloadStatus(t('myinstantsPreloading'))
    
    const priorityOrder = ['trending', 'best', 'popular', 'memes', 'discord', 'gaming']
    const sortedCategories = [...categories].sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a[0])
      const bIdx = priorityOrder.indexOf(b[0])
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    const loadOneCategory = async (id, config) => {
      if (preloadAbortRef.current) return false
      
      const cached = getCachedCategory(id)
      if (cached && cached.length > 0) return true
      
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
        
        let result
        if (config.mode === 'local' || config.mode === 'trending') {
          result = await Promise.race([
            window.electronAPI.fetchMyinstants('', config.mode === 'local' ? 'local' : 'trending', lang),
            timeoutPromise
          ])
        } else if (config.mode === 'multi') {
          const terms = config.query.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2)
          const allResults = []
          const seen = new Set()
          for (const term of terms) {
            const r = await Promise.race([
              window.electronAPI.fetchMyinstants(term, 'search', lang),
              timeoutPromise
            ])
            if (r.success) {
              for (const sound of r.sounds) {
                if (!seen.has(sound.slug)) {
                  seen.add(sound.slug)
                  allResults.push(sound)
                }
              }
            }
          }
          result = { success: true, sounds: allResults }
        } else {
          result = await Promise.race([
            window.electronAPI.fetchMyinstants(config.query, 'search', lang),
            timeoutPromise
          ])
        }
        
        if (result.success && result.sounds.length > 0) {
          setCachedCategory(id, result.sounds)
          return true
        }
        return false
      } catch (e) {
        console.warn(`⚠️ Échec préchargement de ${id}:`, e.message)
        return false
      }
    }

    const batchSize = 3
    for (let i = 0; i < sortedCategories.length; i += batchSize) {
      if (preloadAbortRef.current) break
      
      const batch = sortedCategories.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(([id, config]) => loadOneCategory(id, config))
      )
      
      loaded += results.filter(Boolean).length
      setPreloadProgress(Math.round((loaded / total) * 100))
      setPreloadStatus(`${t('myinstantsCategoriesLoaded')}: ${loaded}/${total}`)
    }
    
    setIsPreloading(false)
    setPreloadProgress(100)
    setIsPreloadComplete(true)
    setPreloadStatus(`✅ ${t('myinstantsAllCategoriesLoaded')}`)
    setCacheInfo(getCacheInfo())
    
    if (!preloadAbortRef.current) {
      const cached = getCachedCategory('trending')
      if (cached && cached.length > 0) {
        setResults(cached)
        setActiveCategory('trending')
      } else {
        loadCategory('trending')
      }
    }
    
  }, [lang, isPreloadComplete, isPreloading, t, loadCategory])

  // ─── INITIALISATION ──────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const cached = getCachedCategory('trending')
      if (cached && cached.length > 0) {
        setResults(cached)
        setActiveCategory('trending')
        setCacheInfo(getCacheInfo())
        setIsInitialLoad(false)
        
        const allCached = Object.keys(CATEGORIES).every(id => {
          const c = getCachedCategory(id)
          return c && c.length > 0
        })
        
        if (allCached) {
          setIsPreloadComplete(true)
          return
        }
      }
      
      if (!isInitialLoad) return
      setIsInitialLoad(false)
      
      await loadCategory('trending')
      setCacheInfo(getCacheInfo())
      
      setTimeout(() => {
        preloadAllCategories()
      }, 1500)
    }
    
    init()
    
    return () => {
      preloadAbortRef.current = true
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
        previewHowlRef.current = null
      }
    }
  }, [])

  // ─── RECHERCHE ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return

    setLoading(true)
    setError('')
    setResults([])
    setActiveCategory(null)

    try {
      const result = await window.electronAPI.fetchMyinstants(search.trim(), 'search', lang)
      if (result.success) {
        setResults(result.sounds || [])
        if (result.sounds.length === 0) {
          setError(t('myinstantsNoResults'))
        }
      } else {
        setError(result.error || t('myinstantsError'))
        addToast(t('myinstantsError') + ': ' + (result.error || 'Recherche échouée'), 'error')
      }
    } catch (e) {
      setError(e.message)
      addToast(t('myinstantsError') + ': ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, lang, addToast, t])

  // ─── PRÉVISUALISATION ──────────────────────────────────────────────────────

  const stopPreview = () => {
    if (previewHowlRef.current) {
      previewHowlRef.current.stop()
      previewHowlRef.current.unload()
      previewHowlRef.current = null
    }
    setPreviewing(null)
  }

  const togglePreview = (sound) => {
    if (previewing === sound.id) {
      stopPreview()
      return
    }
    
    stopPreview()
    setPreviewing(sound.id)
    
    const howl = new Howl({
      src: [sound.url],
      html5: true,
      volume: 0.8,
      onend: () => {
        setPreviewing(null)
        previewHowlRef.current = null
      },
      onloaderror: (id, err) => {
        console.error('Erreur lecture preview:', err)
        setPreviewing(null)
        previewHowlRef.current = null
        addToast('❌ Impossible de prévisualiser ce son', 'error')
      }
    })
    
    previewHowlRef.current = howl
    howl.play()
  }

  // ─── AJOUTER UN SON AVEC SÉLECTION DE PROFIL ──────────────────────────────

  // ✅ Ouvrir le modal de sélection de profil
  const openProfileModal = (sound) => {
    setShowProfileModal(sound)
    setSelectedProfile('all')
  }

  // ✅ Confirmer l'ajout avec le profil sélectionné
  const confirmAddSound = async () => {
    const sound = showProfileModal
    if (!sound) return

    setShowProfileModal(null)
    setDownloading(prev => ({ ...prev, [sound.id]: true }))

    const fileName = sound.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 40) + '_' + Date.now() + '.mp3'

    const result = await window.electronAPI.downloadSoundUrl(sound.url, fileName)

    if (result.success) {
      await store.addSound({
        name: sound.name,
        path: result.path,
        emoji: sound.emoji || '🔊',
        profiles: [selectedProfile]
      })
      const profileName = selectedProfile === 'all' 
        ? t('myinstantsAllProfiles') 
        : store.profiles.find(p => p.id === selectedProfile)?.name || selectedProfile
      addToast(`"${sound.name}" ${t('myinstantsAdded')} (${profileName})`, 'success')
    } else {
      addToast(t('myinstantsError') + ': ' + result.error, 'error')
    }

    setDownloading(prev => ({ ...prev, [sound.id]: false }))
  }

  // ─── VÉRIFICATION SI LE SON EXISTE DÉJÀ ───────────────────────────────────

  const isSoundOwned = (soundName) => {
    return store.sounds.some(s =>
      s.name.toLowerCase().trim() === soundName.toLowerCase().trim()
    )
  }

  // ─── RENDU DES CATÉGORIES ──────────────────────────────────────────────────

  const renderCategories = () => {
    const visibleCategories = showAllCategories ? CATEGORIES_LIST : CATEGORIES_LIST.slice(0, 8)

    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <i className="ti ti-category" style={{ marginRight: 4 }} />
            {t('myinstantsCategories')}
          </div>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setShowAllCategories(!showAllCategories)}
            style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
          >
            {showAllCategories ? t('myinstantsShowLess') : t('myinstantsShowMore')}
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          maxHeight: showAllCategories ? 'none' : '80px',
          overflow: 'hidden'
        }}>
          {visibleCategories.map(cat => {
            const isActive = activeCategory === cat.id
            const isCached = cacheInfo[cat.id]?.count > 0
            const categoryLabel = t(cat.labelKey)
            
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSearch('')
                  loadCategory(cat.id)
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? cat.color : 'var(--border)'}`,
                  background: isActive ? `${cat.color}22` : 'var(--bg-tertiary)',
                  color: isActive ? cat.color : 'var(--text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = cat.color
                    e.currentTarget.style.color = cat.color
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span style={{ fontSize: 14 }}>{cat.emoji || cat.icon}</span>
                <span>{categoryLabel}</span>
                {isActive && <i className="ti ti-check" style={{ fontSize: 10, marginLeft: 2 }} />}
                {isCached && !isActive && (
                  <span style={{ 
                    fontSize: 8, 
                    marginLeft: 2, 
                    color: 'var(--success)',
                    opacity: 0.6
                  }}>
                    💾
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────────

  if (isInitialLoad && results.length === 0 && !loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24 }} />
        <span>{t('myinstantsLoading')}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* En-tête */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{
          fontWeight: 600,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className="ti ti-compass" style={{ color: 'var(--accent)' }} />
          {t('myinstantsTitle')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {results.length > 0 && `${results.length} ${t('myinstantsSoundsAvailable')}`}
          {activeCategory && CATEGORIES[activeCategory] && ` · ${t(CATEGORIES[activeCategory].labelKey)}`}
          {search && ` · ${t('myinstantsResultsFor')} "${search}"`}
          {isPreloadComplete && (
            <span style={{ marginLeft: 8, color: 'var(--success)' }}>
              · ✅ {t('myinstantsAllCategoriesLoaded')}
            </span>
          )}
        </div>
      </div>

      {/* Barre de progression du préchargement */}
      {isPreloading && (
        <div style={{
          padding: '4px 20px',
          background: 'var(--accent-light)',
          borderBottom: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 14, color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>
              {preloadStatus}
            </span>
          </div>
          <div style={{ 
            flex: 1, 
            minWidth: 80,
            height: 4, 
            background: 'var(--bg-tertiary)', 
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${preloadProgress}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {preloadProgress}%
          </span>
        </div>
      )}

      {/* Barre de recherche */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('myinstantsSearchPlaceholder')}
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={loading}
            style={{ minWidth: 80 }}
          >
            {loading ? (
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <><i className="ti ti-search" /> {t('myinstantsSearch')}</>
            )}
          </button>
          
          {search && (
            <button
              className="btn-clear-search"
              onClick={() => {
                setSearch('')
                loadCategory(activeCategory || 'trending')
              }}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0 14px',
                minHeight: 40,
                minWidth: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all var(--transition-base) ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(224, 82, 82, 0.15)'
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.borderColor = 'var(--danger)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.color = 'var(--text-tertiary)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              title={t('myinstantsClearSearch')}
            >
              <i className="ti ti-trash" />
            </button>
          )}
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => loadCategory(activeCategory || 'trending', true)}
          disabled={loading}
          style={{ fontSize: 11 }}
        >
          <i className={`ti ${loading ? 'ti-loader' : 'ti-refresh'}`}
            style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          {t('myinstantsRefresh')}
        </button>
      </div>

      {/* Catégories */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}>
        {renderCategories()}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-loader" style={{
              animation: 'spin 1s linear infinite',
              fontSize: 32,
              display: 'block',
              marginBottom: 12
            }} />
            {t('myinstantsLoading')}
          </div>
        )}

        {error && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-alert-triangle" style={{
              fontSize: 32,
              display: 'block',
              marginBottom: 12,
              color: 'var(--warning)'
            }} />
            {error}
            <br />
            <button
              className="btn-secondary btn-sm"
              onClick={() => loadCategory(activeCategory || 'trending', true)}
              style={{ marginTop: 12 }}
            >
              {t('myinstantsRefresh')}
            </button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-music-off" style={{
              fontSize: 48,
              display: 'block',
              marginBottom: 16,
              color: 'var(--border)'
            }} />
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              {t('myinstantsNoResults')}
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? t('myinstantsTryDifferentSearch') : t('myinstantsSelectCategory')}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12
          }}>
            {results.map(sound => {
              const owned = isSoundOwned(sound.name)
              const isDownloading = downloading[sound.id]
              const isPreviewing = previewing === sound.id

              return (
                <div
                  key={sound.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${owned ? 'var(--success)' : isPreviewing ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                    opacity: owned ? 0.8 : 1,
                    boxShadow: isPreviewing ? '0 0 20px rgba(124,111,247,0.2)' : 'none'
                  }}
                >
                  <div style={{
                    fontSize: 32,
                    marginBottom: 8,
                    opacity: owned ? 0.6 : 1
                  }}>
                    {sound.emoji || '🔊'}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 8,
                    color: owned ? 'var(--text-tertiary)' : 'var(--text-primary)'
                  }}>
                    {sound.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`btn-${isPreviewing ? 'danger' : 'secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => togglePreview(sound)}
                      disabled={owned}
                    >
                      <i className={`ti ${isPreviewing ? 'ti-player-stop-filled' : 'ti-player-play'}`} />
                    </button>
                    <button
                      className={`btn-${owned ? 'success' : 'primary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => openProfileModal(sound)}
                      disabled={owned || isDownloading}
                    >
                      {owned ? (
                        <><i className="ti ti-check" /> {t('myinstantsAlreadyAdded')}</>
                      ) : isDownloading ? (
                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <><i className="ti ti-download" /> {t('myinstantsAdd')}</>
                      )}
                    </button>
                  </div>
                  {owned && (
                    <div style={{
                      fontSize: 9,
                      color: 'var(--success)',
                      marginTop: 4
                    }}>
                      <i className="ti ti-check" /> {t('myinstantsAlreadyAdded')}
                    </div>
                  )}
                  {isPreviewing && !owned && (
                    <div style={{
                      fontSize: 9,
                      color: 'var(--accent)',
                      marginTop: 4
                    }}>
                      <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> {t('myinstantsPlaying')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ✅ Modal de sélection de profil */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span style={{ fontSize: 22 }}>{showProfileModal.emoji || '🔊'}</span>
              {t('myinstantsAddToProfile')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {store.profiles.map(p => {
                const isSelected = selectedProfile === p.id
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={p.id}
                      checked={isSelected}
                      onChange={() => setSelectedProfile(p.id)}
                      style={{ accentColor: 'var(--accent)', width: 'auto' }}
                    />
                    <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: 13 }}>{p.id === 'all' ? t('myinstantsAllProfiles') : p.name}</span>
                  </label>
                )
              })}
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary btn-lg" onClick={() => setShowProfileModal(null)} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
                <i className="ti ti-x" /> {t('myinstantsStop')}
              </button>
              <button className="btn-primary btn-lg" onClick={confirmAddSound} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
                <i className="ti ti-download" /> {t('myinstantsAdd')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}