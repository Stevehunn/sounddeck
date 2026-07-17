import { useEffect, useState, useRef } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Options from './pages/Options'
import Trimmer from './pages/Trimmer'
import Editor from './pages/editor/Editor'
import Sequencer from './pages/Sequencer'
import Guide from './pages/Guide'
import Stats from './pages/Stats'
import Presentation from './pages/Presentation'
import Toast from './components/Toast'
import QuitConfirm from './components/QuitConfirm'
import WelcomeScreen from './components/WelcomeScreen'
import Tutorial from './components/Tutorial'
import TutorialAdvanced from './components/TutorialAdvanced'
import { playSound, stopAllSounds, setStoreRef } from './utils/audio'
import { warmupAudioContext } from './utils/audioMixer'

// ✅ IMPORT DU SYSTÈME DE PLUGINS
import { PluginProvider, usePlugins } from './core/PluginContext'
import { usePluginPage } from './core/hooks/usePluginPage'

// ─── COMPOSANT PRINCIPAL AVEC PLUGINS ────────────────────────────────────────
function AppContent() {
  const store = useStore()
  const [currentPage, setCurrentPage] = useState('home')
  const [presentationMode, setPresentationMode] = useState(false)
  const [toasts, setToasts] = useState([])
  const [mixerInitialized, setMixerInitialized] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showAdvancedTutorial, setShowAdvancedTutorial] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  // ✅ Récupérer l'état des plugins
  const { isPluginPage, getPage, pages, loaded: pluginsLoaded, pluginManager } = usePlugins()

  // ✅ Charger la page plugin si nécessaire
  const { 
    Component: PluginComponent, 
    loading: pluginLoading, 
    error: pluginError 
  } = usePluginPage(isPluginPage(currentPage) ? currentPage : null)

  // ✅ Charger les plugins automatiquement au démarrage
  useEffect(() => {
    const loadPlugins = async () => {
      // Attendre que le PluginManager soit initialisé
      if (!pluginsLoaded) return
      
      // ─── 1. Plugin MyInstants ──────────────────────────────────────────────
      if (!pluginManager.isPluginLoaded('myinstants')) {
        try {
          console.log('📦 Chargement automatique du plugin MyInstants...')
          const pluginInfo = {
            id: 'myinstants',
            name: 'MyInstants Discovery',
            version: '1.0.0',
            path: './plugins/myinstants',
            enabled: true
          }
          const result = await pluginManager.loadPlugin(pluginInfo)
          if (result) {
            console.log('✅ Plugin MyInstants chargé avec succès')
          } else {
            console.warn('⚠️ Échec du chargement du plugin MyInstants')
          }
        } catch (e) {
          console.error('❌ Erreur lors du chargement du plugin MyInstants:', e)
        }
      }

      // ─── 2. Plugin YouTube ──────────────────────────────────────────────────
      if (!pluginManager.isPluginLoaded('youtube')) {
        try {
          console.log('📦 Chargement automatique du plugin YouTube...')
          const pluginInfo = {
            id: 'youtube',
            name: 'YouTube Import',
            version: '1.0.0',
            path: './plugins/youtube',
            enabled: true
          }
          const result = await pluginManager.loadPlugin(pluginInfo)
          if (result) {
            console.log('✅ Plugin YouTube chargé avec succès')
          } else {
            console.warn('⚠️ Échec du chargement du plugin YouTube')
          }
        } catch (e) {
          console.error('❌ Erreur lors du chargement du plugin YouTube:', e)
        }
      }
    }

    loadPlugins()
  }, [pluginsLoaded, pluginManager])

  const soundsRef = useRef([])
  const addToastRef = useRef(null)
  const switchToNextProfileRef = useRef(null)
  const toggleLoopRef = useRef(null)
  const playLocallyRef = useRef(true)
  const audioDeviceRef = useRef('default')
  const volumeRef = useRef(80)
  const setPresentationRef = useRef(null)
  const isQuittingRef = useRef(false)

  // ✅ Blocage simple avec ref
  const isPopupBlockedRef = useRef(false)
  const blockTimerRef = useRef(null)

  // ✅ Passer la référence du store à audio.js pour le mixeur
  useEffect(() => {
    setStoreRef(store)
  }, [store])

  // ✅ PRÉCHAUFFAGE DU CONTEXTE AUDIO - au démarrage de l'app
  useEffect(() => {
    if (store.loading) return
    
    const timer = setTimeout(() => {
      console.log('🔥 Démarrage du préchauffage audio...')
      warmupAudioContext()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [store.loading])

  useEffect(() => { soundsRef.current = store.sounds }, [store.sounds])
  useEffect(() => { switchToNextProfileRef.current = store.switchToNextProfile }, [store.switchToNextProfile])
  useEffect(() => { toggleLoopRef.current = store.toggleLoop }, [store.toggleLoop])
  useEffect(() => { playLocallyRef.current = store.playLocally }, [store.playLocally])
  useEffect(() => { audioDeviceRef.current = store.audioDevice }, [store.audioDevice])
  useEffect(() => { volumeRef.current = store.volume }, [store.volume])
  useEffect(() => { setPresentationRef.current = setPresentationMode }, [setPresentationMode])

  // ✅ Vérifier si c'est le premier lancement
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunchedBefore = await window.electronAPI.storeGet('hasLaunchedBefore')
        const tutorialDone = localStorage.getItem('sounddeck-tutorial-done')
        
        if (!hasLaunchedBefore) {
          setIsFirstLaunch(true)
        } else if (!tutorialDone) {
          setTimeout(() => {
            setShowTutorial(true)
          }, 500)
        }
      } catch (e) {
        console.warn('⚠️ Erreur vérification premier lancement:', e)
        setIsFirstLaunch(false)
      }
    }
    checkFirstLaunch()
  }, [])

  // ✅ Écouter l'ouverture du tutoriel avancé
  useEffect(() => {
    const handleOpenAdvanced = () => {
      setShowAdvancedTutorial(true)
    }
    
    window.addEventListener('open-advanced-tutorial', handleOpenAdvanced)
    
    return () => {
      window.removeEventListener('open-advanced-tutorial', handleOpenAdvanced)
    }
  }, [])

  // ✅ Raccourcis souris - Molette pour changer de profil
  useEffect(() => {
    const handleWheel = (e) => {
      const target = e.target
      const isOnSidebar = target.closest?.('aside') || target.closest?.('.sidebar')
      
      if (isOnSidebar && e.ctrlKey) {
        e.preventDefault()
        if (e.deltaY > 0) {
          store.switchToNextProfile?.()
        } else {
          const profiles = store.profiles || []
          const currentIndex = profiles.findIndex(p => p.id === store.currentProfileId)
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : profiles.length - 1
          store.switchProfile?.(profiles[prevIndex]?.id)
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [store.currentProfileId, store.profiles])

  // ✅ Gestion de la popup
  useEffect(() => {
    // ✅ Bloquer la popup pendant 1 seconde
    const blockPopup = () => {
      console.log('🚫 [BLOCK] Blocage de la popup')
      isPopupBlockedRef.current = true
      
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current)
      }
      
      blockTimerRef.current = setTimeout(() => {
        console.log('✅ [BLOCK] Fin du blocage')
        isPopupBlockedRef.current = false
        blockTimerRef.current = null
      }, 1000)
    }

    // ✅ Afficher la popup
    const handleShowQuitConfirm = () => {
      console.log(`📌 SHOW_QUIT_CONFIRM - blocked: ${isPopupBlockedRef.current}`)
      
      if (isPopupBlockedRef.current) {
        console.log('🚫 Popup REFUSÉE - Blocage actif')
        return
      }

      if (document.hidden) {
        console.log('🚫 Popup REFUSÉE - Fenêtre masquée')
        return
      }

      console.log('✅ Popup ACCEPTÉE')
      setShowQuitConfirm(true)
    }

    // ✅ Cacher la popup
    const handleHideQuitConfirm = () => {
      console.log('🔇 hide-quit-confirm reçu')
      setShowQuitConfirm(false)
      
      // ✅ Bloquer la popup pour éviter qu'elle ne réapparaisse
      blockPopup()
    }

    // ✅ Enregistrer les listeners
    window.electronAPI?.onShowQuitConfirm?.(handleShowQuitConfirm)
    window.electronAPI?.onHideQuitConfirm?.(handleHideQuitConfirm)

    return () => {
      window.electronAPI?.removeAllListeners?.('show-quit-confirm')
      window.electronAPI?.removeAllListeners?.('hide-quit-confirm')
      
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current)
        blockTimerRef.current = null
      }
      isPopupBlockedRef.current = false
    }
  }, [])

  // ✅ Debug de l'état de la popup
  useEffect(() => {
    if (showQuitConfirm) {
      console.log(`💬 showQuitConfirm = true`)
    }
  }, [showQuitConfirm])

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme)

    const existing = document.getElementById('custom-theme-style')
    if (store.theme === 'custom' && store.customTheme) {
      const c = store.customTheme
      const css = `
        [data-theme="custom"] {
          --bg-primary: ${c.bgPrimary};
          --bg-secondary: ${c.bgSecondary};
          --bg-tertiary: ${c.bgTertiary};
          --bg-hover: ${c.bgHover};
          --border: ${c.border};
          --text-primary: ${c.textPrimary};
          --text-secondary: ${c.textSecondary};
          --text-tertiary: ${c.textTertiary};
          --accent: ${c.accent};
          --accent-light: ${c.accentLight};
          --accent-hover: ${c.accentHover};
          --success: ${c.success};
          --warning: ${c.warning};
          --danger: ${c.danger};
        }
      `
      if (existing) {
        existing.textContent = css
      } else {
        const style = document.createElement('style')
        style.id = 'custom-theme-style'
        style.textContent = css
        document.head.appendChild(style)
      }
    } else if (existing) {
      existing.remove()
    }
  }, [store.theme, store.customTheme])

  // Mettre à jour le menu du tray quand la langue change
  useEffect(() => {
    if (window.electronAPI?.updateTrayLanguage) {
      window.electronAPI.updateTrayLanguage(store.lang)
    }
  }, [store.lang])

  // ✅ Initialiser le mixeur au démarrage si activé
  useEffect(() => {
    if (store.loading) return
    if (mixerInitialized) return
    
    const initMixer = async () => {
      if (store.mixerEnabled && store.initMixerOnStartup) {
        console.log('🎛️ Initialisation du mixeur au démarrage de l\'app...')
        await new Promise(resolve => setTimeout(resolve, 500))
        const success = await store.initMixerOnStartup()
        setMixerInitialized(true)
        if (success) {
          console.log('✅ Mixeur initialisé avec succès au démarrage')
        } else {
          console.warn('⚠️ Échec de l\'initialisation du mixeur au démarrage')
        }
      } else {
        setMixerInitialized(true)
      }
    }
    
    initMixer()
  }, [store.loading, store.mixerEnabled, store.initMixerOnStartup, mixerInitialized])

  // ✅ Vérifier l'état du mixeur quand la langue change
  useEffect(() => {
    if (!store.loading && store.mixerEnabled && mixerInitialized) {
      const checkMixer = async () => {
        try {
          const { isMixerOperational, repairMixer } = await import('./utils/audioMixer')
          if (!isMixerOperational()) {
            console.log('🔧 Mixeur non opérationnel après changement de langue, tentative de réparation...')
            repairMixer()
          }
        } catch (e) {
          console.warn('Erreur vérification mixeur:', e)
        }
      }
      checkMixer()
    }
  }, [store.lang, store.loading, store.mixerEnabled, mixerInitialized])

  // ✅ Vérifier le périphérique micro au démarrage
  useEffect(() => {
    if (store.loading) return
    
    const checkMicrophoneDevice = async () => {
      if (store.microphoneDevice && store.microphoneDevice !== 'default') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const audioInputs = devices.filter(d => d.kind === 'audioinput')
          const deviceExists = audioInputs.some(d => d.deviceId === store.microphoneDevice)
          
          if (!deviceExists) {
            console.log('🔧 Périphérique micro introuvable, réinitialisation au périphérique par défaut')
            await store.updateMicrophoneDeviceId('default')
          }
        } catch (e) {
          console.warn('⚠️ Erreur lors de la vérification du périphérique micro:', e)
        }
      }
    }
    
    checkMicrophoneDevice()
  }, [store.loading, store.microphoneDevice])

  // ✅ Enregistrer les listeners IPC
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onPlaySound((soundId) => {
      const sound = soundsRef.current.find(s => s.id === soundId)
      if (sound) {
        playSound(sound, audioDeviceRef.current, volumeRef.current, false, playLocallyRef.current)
      }
    })

    window.electronAPI.onSwitchProfile(async () => {
      if (switchToNextProfileRef.current) {
        await switchToNextProfileRef.current()
        addToastRef.current?.('Profil changé', 'info')
      }
    })

    window.electronAPI.onToggleLoop(async () => {
      if (toggleLoopRef.current) toggleLoopRef.current()
      addToastRef.current?.('Loop ' + (store.loopEnabled ? 'désactivé' : 'activé'), 'info')
    })

    window.electronAPI.onStopAllSounds(() => {
      stopAllSounds()
      addToastRef.current?.('Tous les sons arrêtés', 'info')
    })

    window.electronAPI.onTogglePresentation(() => {
      setPresentationRef.current?.(prev => !prev)
    })

    return () => {
      window.electronAPI.removeAllListeners('play-sound')
      window.electronAPI.removeAllListeners('switch-profile')
      window.electronAPI.removeAllListeners('toggle-loop')
      window.electronAPI.removeAllListeners('stop-all-sounds')
      window.electronAPI.removeAllListeners('toggle-presentation')
    }
  }, [store.loopEnabled, store.mixerEnabled])

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => { addToastRef.current = addToast }, [])

  // ✅ RENDU DES PAGES (avec support plugins)
  const renderPage = () => {
    // Pages core
    if (currentPage === 'home') {
      return <Home store={store} addToast={addToast} loopEnabled={store.loopEnabled} lang={store.lang} />
    }
    if (currentPage === 'options') {
      return <Options store={store} addToast={addToast} lang={store.lang} />
    }
    if (currentPage === 'trimmer') {
      return <Trimmer store={store} addToast={addToast} lang={store.lang} />
    }
    if (currentPage === 'editor') {
      return <Editor store={store} addToast={addToast} lang={store.lang} />
    }
    if (currentPage === 'sequencer') {
      return <Sequencer store={store} addToast={addToast} lang={store.lang} />
    }
    if (currentPage === 'guide') {
      return <Guide key={store.lang} lang={store.lang} />
    }
    if (currentPage === 'stats') {
      return <Stats store={store} lang={store.lang} />
    }

    // ✅ Pages plugin (YouTube est maintenant ici)
    if (isPluginPage(currentPage)) {
      if (pluginLoading) {
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-tertiary)',
            gap: 12
          }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Chargement du plugin...</span>
          </div>
        )
      }
      
      if (pluginError) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--danger)',
            gap: 12,
            padding: 20,
            textAlign: 'center'
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 32 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Erreur de chargement</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pluginError}</div>
            <button 
              className="btn-secondary btn-sm" 
              onClick={() => setCurrentPage('home')}
            >
              Retour à l'accueil
            </button>
          </div>
        )
      }
      
      if (PluginComponent) {
        return <PluginComponent store={store} addToast={addToast} lang={store.lang} />
      }
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          gap: 12
        }}>
          <i className="ti ti-puzzle" style={{ fontSize: 32 }} />
          <div style={{ fontSize: 16 }}>Plugin non trouvé</div>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => setCurrentPage('home')}
          >
            Retour à l'accueil
          </button>
        </div>
      )
    }

    // Page non trouvée
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12
      }}>
        <i className="ti ti-404" style={{ fontSize: 32 }} />
        <div style={{ fontSize: 16 }}>Page non trouvée</div>
      </div>
    )
  }

  // ✅ Si le store est en chargement
  if (store.loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'var(--text-secondary)', flexDirection: 'column', gap: 12
      }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 32, color: 'var(--accent)' }} />
        <span>Chargement de SoundDeck...</span>
      </div>
    )
  }

  // ✅ Si c'est le premier lancement, afficher l'écran de bienvenue
  if (isFirstLaunch === true) {
    return <WelcomeScreen onComplete={() => setIsFirstLaunch(false)} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Sidebar
        key={store.sidebarVersion}
        profiles={store.profiles}
        currentProfileId={store.currentProfileId}
        currentPage={currentPage}
        onSwitchProfile={store.switchProfile}
        onChangePage={setCurrentPage}
        onCreateProfile={store.createProfile}
        onToggleLoop={store.toggleLoop}
        loopEnabled={store.loopEnabled}
        volume={store.volume}
        onVolumeChange={store.updateVolume}
        onStopAll={() => { stopAllSounds(); addToast('Tous les sons arrêtés', 'info') }}
        onPresentation={() => setPresentationMode(true)}
        lang={store.lang}
        addToast={addToast}
        onReorderProfiles={store.reorderProfiles}
        sidebarConfig={store.sidebarConfig}
        sidebarEditMode={store.sidebarEditMode}
        sidebarVersion={store.sidebarVersion}
        // ✅ Passage des pages plugins
        pluginPages={pages}
        isPluginPage={isPluginPage}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </main>

      <Toast toasts={toasts} />

      {presentationMode && (
        <Presentation
          store={store}
          onExit={() => setPresentationMode(false)}
          lang={store.lang}
        />
      )}

      {showQuitConfirm && (
        <QuitConfirm 
          onClose={() => setShowQuitConfirm(false)} 
          lang={store.lang} 
        />
      )}

      {showTutorial && (
        <Tutorial 
          onComplete={() => setShowTutorial(false)} 
          lang={store.lang} 
        />
      )}

      {showAdvancedTutorial && (
        <TutorialAdvanced 
          onComplete={() => setShowAdvancedTutorial(false)} 
          lang={store.lang} 
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── WRAPPER AVEC PLUGIN PROVIDER ────────────────────────────────────────────

export default function App() {
  const store = useStore()
  
  // Ne pas rendre l'app tant que le store n'est pas chargé
  if (store.loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'var(--text-secondary)', flexDirection: 'column', gap: 12
      }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 32, color: 'var(--accent)' }} />
        <span>Chargement de SoundDeck...</span>
      </div>
    )
  }

  return (
    <PluginProvider store={store}>
      <AppContent />
    </PluginProvider>
  )
}