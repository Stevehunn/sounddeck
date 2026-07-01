import { useEffect, useState, useRef } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Options from './pages/Options'
import Editor from './pages/Editor'
import Sequencer from './pages/Sequencer'
import YouTube from './pages/YouTube'
import Guide from './pages/Guide'
import Presentation from './pages/Presentation'
import Toast from './components/Toast'
import QuitConfirm from './components/QuitConfirm'
import WelcomeScreen from './components/WelcomeScreen'
import { playSound, stopAllSounds, setStoreRef } from './utils/audio'

export default function App() {
  const store = useStore()
  const [currentPage, setCurrentPage] = useState('home')
  const [presentationMode, setPresentationMode] = useState(false)
  const [toasts, setToasts] = useState([])
  const [mixerInitialized, setMixerInitialized] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)

  const soundsRef = useRef([])
  const addToastRef = useRef(null)
  const switchToNextProfileRef = useRef(null)
  const toggleLoopRef = useRef(null)
  const playLocallyRef = useRef(true)
  const audioDeviceRef = useRef('default')
  const volumeRef = useRef(80)
  const setPresentationRef = useRef(null)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const isQuittingRef = useRef(false)

  // ✅ Vérifier si c'est le premier lancement
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunchedBefore = await window.electronAPI.storeGet('hasLaunchedBefore')
        setIsFirstLaunch(!hasLaunchedBefore)
      } catch (e) {
        console.warn('⚠️ Erreur vérification premier lancement:', e)
        setIsFirstLaunch(false)
      }
    }
    checkFirstLaunch()
  }, [])

  // ✅ Passer la référence du store à audio.js pour le mixeur
  useEffect(() => {
    setStoreRef(store)
  }, [store])

  useEffect(() => { soundsRef.current = store.sounds }, [store.sounds])
  useEffect(() => { switchToNextProfileRef.current = store.switchToNextProfile }, [store.switchToNextProfile])
  useEffect(() => { toggleLoopRef.current = store.toggleLoop }, [store.toggleLoop])
  useEffect(() => { playLocallyRef.current = store.playLocally }, [store.playLocally])
  useEffect(() => { audioDeviceRef.current = store.audioDevice }, [store.audioDevice])
  useEffect(() => { volumeRef.current = store.volume }, [store.volume])
  useEffect(() => { setPresentationRef.current = setPresentationMode }, [setPresentationMode])

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

    window.electronAPI.onShowQuitConfirm(() => {
      if (!isQuittingRef.current) {
        setShowQuitConfirm(true)
      }
    })

    return () => {
      window.electronAPI.removeAllListeners('play-sound')
      window.electronAPI.removeAllListeners('switch-profile')
      window.electronAPI.removeAllListeners('toggle-loop')
      window.electronAPI.removeAllListeners('stop-all-sounds')
      window.electronAPI.removeAllListeners('toggle-presentation')
      window.electronAPI.removeAllListeners('show-quit-confirm')
    }
  }, [store.loopEnabled, store.mixerEnabled])

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => { addToastRef.current = addToast }, [])

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
        onToggleSectionFixed={store.toggleSectionFixed} // ✅ Nouveau prop
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'home' && <Home store={store} addToast={addToast} loopEnabled={store.loopEnabled} lang={store.lang} />}
        {currentPage === 'discover' && <Discover store={store} addToast={addToast} lang={store.lang} />}
        {currentPage === 'options' && <Options store={store} addToast={addToast} lang={store.lang} />}
        {currentPage === 'editor' && <Editor store={store} addToast={addToast} lang={store.lang} />}
        {currentPage === 'sequencer' && <Sequencer store={store} addToast={addToast} lang={store.lang} />}
        {currentPage === 'youtube' && <YouTube store={store} addToast={addToast} lang={store.lang} />}
        {currentPage === 'guide' && <Guide key={store.lang} lang={store.lang} />}
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
    </div>
  )
}