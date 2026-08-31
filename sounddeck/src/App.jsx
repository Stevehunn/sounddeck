// src/App.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@core/store'
import { useLanguage } from '@core/i18n/LanguageContext'
import Sidebar from '@shared/components/navigation/Sidebar'
import Home from '@features/home/Home'
import Options from '@features/options/Options'
import Trimmer from '@features/trimmer/Trimmer'
import Editor from '@features/editor/Editor'
import Sequencer from '@features/sequencer/Sequencer'
import Guide from '@features/guide/Guide'
import Stats from '@features/stats/Stats'
import Presentation from '@features/presentation/Presentation'
import Toast from '@shared/components/ui/Toast'
import QuitConfirm from '@shared/components/modals/QuitConfirm'
import WelcomeScreen from '@features/welcome/WelcomeScreen'
import Tutorial from '@shared/components/ui/Tutorial'
import HelpButton from '@shared/components/ui/HelpButton'

// ✅ IMPORTS AUDIO CORRECTS
import { playSound, stopAllSounds, setStoreRef } from '@core/services/AudioService'
import { warmupAudioContext } from '@core/services/AudioMixerService'

// ✅ IMPORTS PLUGINS
import { PluginProvider, usePlugins } from '@core/plugins/PluginContext'
import { usePluginPage } from '@core/plugins/hooks/usePluginPage'

// ─── COMPOSANT PRINCIPAL AVEC PLUGINS ────────────────────────────────────────
function AppContent() {
  const store = useStore()
  const { t, currentLang, changeLanguage, version: langVersion } = useLanguage()
  const [currentPage, setCurrentPage] = useState('home')
  const [presentationMode, setPresentationMode] = useState(false)
  const [toasts, setToasts] = useState([])
  const [mixerInitialized, setMixerInitialized] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showAdvancedTutorial, setShowAdvancedTutorial] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [tutorialPageId, setTutorialPageId] = useState('home')

  // ✅ Récupérer l'état des plugins
  const { isPluginPage, getPage, pages, loaded: pluginsLoaded, pluginManager } = usePlugins()

  // ✅ Charger la page plugin si nécessaire
  const { 
    Component: PluginComponent, 
    loading: pluginLoading, 
    error: pluginError 
  } = usePluginPage(isPluginPage(currentPage) ? currentPage : null)

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

  // ✅ Fonction pour ouvrir le tutoriel
  const openTutorial = (pageId) => {
    setTutorialPageId(pageId)
    setShowTutorial(true)
  }

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

    const handleHideQuitConfirm = () => {
      console.log('🔇 hide-quit-confirm reçu')
      setShowQuitConfirm(false)
      blockPopup()
    }

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
      window.electronAPI.updateTrayLanguage(currentLang)
    }
  }, [currentLang])

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
          const { isMixerOperational, repairMixer } = await import("@core/services/AudioMixerService");
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
  }, [currentLang, store.loading, store.mixerEnabled, mixerInitialized])

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
        addToastRef.current?.(t('toastProfileChanged'), 'info')
      }
    })

    window.electronAPI.onToggleLoop(async () => {
      if (toggleLoopRef.current) toggleLoopRef.current()
      addToastRef.current?.(store.loopEnabled ? t('toastLoopOff') : t('toastLoopOn'), 'info')
    })

    window.electronAPI.onStopAllSounds(() => {
      stopAllSounds()
      addToastRef.current?.(t('toastAllStopped'), 'info')
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
  }, [store.loopEnabled, store.mixerEnabled, t])

  // ✅ Fonction addToast
  const addToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  useEffect(() => { addToastRef.current = addToast }, [addToast])

  // ✅ Wrapper pour ajouter le HelpButton à une page
  const PageWrapper = ({ children, pageId }) => (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {children}
      <HelpButton onClick={() => openTutorial(pageId)} />
    </div>
  )

  // ✅ RENDU DES PAGES
  const renderPage = () => {
    if (currentPage === 'home') {
      return (
        <PageWrapper pageId="home">
          <Home key={`home-${currentLang}`} store={store} addToast={addToast} loopEnabled={store.loopEnabled} />
        </PageWrapper>
      )
    }
    if (currentPage === 'options') {
      return (
        <PageWrapper pageId="options">
          <Options key={`options-${currentLang}`} store={store} addToast={addToast} />
        </PageWrapper>
      )
    }
    if (currentPage === 'trimmer') {
      return (
        <PageWrapper pageId="trimmer">
          <Trimmer key={`trimmer-${currentLang}`} store={store} addToast={addToast} />
        </PageWrapper>
      )
    }
    if (currentPage === 'editor') {
      return (
        <PageWrapper pageId="editor">
          <Editor key={`editor-${currentLang}`} store={store} addToast={addToast} />
        </PageWrapper>
      )
    }
    if (currentPage === 'sequencer') {
      return (
        <PageWrapper pageId="sequencer">
          <Sequencer key={`sequencer-${currentLang}`} store={store} addToast={addToast} />
        </PageWrapper>
      )
    }
    if (currentPage === 'guide') {
      return (
        <PageWrapper pageId="guide">
          <Guide key={`guide-${currentLang}`} />
        </PageWrapper>
      )
    }
    if (currentPage === 'stats') {
      return (
        <PageWrapper pageId="stats">
          <Stats key={`stats-${currentLang}`} store={store} />
        </PageWrapper>
      )
    }
    
    // ✅ CORRECTION : La page "discover" est un plugin, pas un import direct
    // Elle est gérée par le système de plugins plus bas
    // On supprime ce bloc qui cause l'erreur
    // if (currentPage === 'discover') { ... }

    // ✅ Gestion des pages plugins (inclut discover, youtube, etc.)
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
            <span>{t('appLoading')}</span>
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
            <div style={{ fontSize: 16, fontWeight: 600 }}>{t('error')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pluginError}</div>
            <button 
              className="btn-secondary btn-sm" 
              onClick={() => setCurrentPage('home')}
            >
              {t('close')}
            </button>
          </div>
        )
      }
      
      if (PluginComponent) {
        return (
          <PageWrapper pageId={currentPage}>
            <PluginComponent key={`plugin-${currentPage}-${currentLang}`} store={store} addToast={addToast} />
          </PageWrapper>
        )
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
          <div style={{ fontSize: 16 }}>{t('optionsPlugins')}</div>
          <button 
            className="btn-secondary btn-sm" 
            onClick={() => setCurrentPage('home')}
          >
            {t('close')}
          </button>
        </div>
      )
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
        <i className="ti ti-404" style={{ fontSize: 32 }} />
        <div style={{ fontSize: 16 }}>404</div>
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
        <span>{t('appLoading')}</span>
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
        key={`sidebar-${store.sidebarVersion}-${currentLang}`}
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
        onStopAll={() => { stopAllSounds(); addToast(t('toastAllStopped'), 'info') }}
        onPresentation={() => setPresentationMode(true)}
        addToast={addToast}
        onReorderProfiles={store.reorderProfiles}
        sidebarConfig={store.sidebarConfig}
        sidebarEditMode={store.sidebarEditMode}
        sidebarVersion={store.sidebarVersion}
        pluginPages={pages}
        isPluginPage={isPluginPage}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </main>

      <Toast toasts={toasts} />

      {presentationMode && (
        <Presentation
          key={`presentation-${currentLang}`}
          store={store}
          onExit={() => setPresentationMode(false)}
        />
      )}

      {showQuitConfirm && (
        <QuitConfirm 
          key={`quitconfirm-${currentLang}`}
          onClose={() => setShowQuitConfirm(false)} 
        />
      )}

      {showTutorial && (
        <Tutorial 
          key={`tutorial-${currentLang}`}
          pageId={tutorialPageId}
          onComplete={() => setShowTutorial(false)} 
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