import { useEffect, useState, useRef } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Options from './pages/Options'
import Editor from './pages/Editor'
import Presentation from './pages/Presentation'
import Sequencer from './pages/Sequencer'
import YouTube from './pages/YouTube'
import Toast from './components/Toast'
import { playSound, stopAllSounds } from './utils/audio'

export default function App() {
  const store = useStore()
  const [currentPage, setCurrentPage] = useState('home')
  const [presentationMode, setPresentationMode] = useState(false)
  const [toasts, setToasts] = useState([])

  // Refs pour toujours avoir les valeurs à jour dans les callbacks IPC
  const soundsRef = useRef([])
  const addToastRef = useRef(null)
  const switchToNextProfileRef = useRef(null)
  const toggleLoopRef = useRef(null)
  const playLocallyRef = useRef(true)
  const setPresentationRef = useRef(null)
  const audioDeviceRef = useRef('default')
  const volumeRef = useRef(80)

  useEffect(() => { soundsRef.current = store.sounds }, [store.sounds])
  useEffect(() => { addToastRef.current = addToast }, )
  useEffect(() => { switchToNextProfileRef.current = store.switchToNextProfile }, [store.switchToNextProfile])
  useEffect(() => { toggleLoopRef.current = store.toggleLoop }, [store.toggleLoop])
  useEffect(() => { playLocallyRef.current = store.playLocally }, [store.playLocally])
  useEffect(() => { setPresentationRef.current = setPresentationMode }, [setPresentationMode])
  useEffect(() => { audioDeviceRef.current = store.audioDevice }, [store.audioDevice])
  useEffect(() => { volumeRef.current = store.volume }, [store.volume])

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme)

    // Thème personnalisé : injecter les variables CSS directement
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

  // Enregistrer les listeners IPC une seule fois — mais via les refs
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onPlaySound((soundId) => {
      const sound = soundsRef.current.find(s => s.id === soundId)
      if (sound) playSound(sound, audioDeviceRef.current, volumeRef.current, false, playLocallyRef.current)
    })

    window.electronAPI.onSwitchProfile(async () => {
      if (switchToNextProfileRef.current) {
        await switchToNextProfileRef.current()
        // Lire le nouveau profil courant depuis la ref après le changement
        addToastRef.current?.('Profil changé', 'info')
      }
    })

    window.electronAPI.onToggleLoop(() => {
      if (toggleLoopRef.current) toggleLoopRef.current()
      addToastRef.current?.('Loop ' + (store.loopEnabled ? 'désactivé' : 'activé'), 'info')
    })

    return () => {
      window.electronAPI.removeAllListeners('play-sound')
      window.electronAPI.removeAllListeners('switch-profile')
      window.electronAPI.removeAllListeners('toggle-loop')
      window.electronAPI.removeAllListeners('stop-all-sounds')
      window.electronAPI.removeAllListeners('toggle-presentation')
    }
  }, [])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Sidebar
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
        addToast={addToast}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'home' && <Home store={store} addToast={addToast} loopEnabled={store.loopEnabled} />}
        {currentPage === 'discover' && <Discover store={store} addToast={addToast} />}
        {currentPage === 'options' && <Options store={store} addToast={addToast} />}
        {currentPage === 'editor' && <Editor store={store} addToast={addToast} />}
        {currentPage === 'sequencer' && <Sequencer store={store} addToast={addToast} />}
        {currentPage === 'youtube' && <YouTube store={store} addToast={addToast} />}
      </main>

      <Toast toasts={toasts} />
      {presentationMode && (
        <Presentation
          store={store}
          onExit={() => setPresentationMode(false)}
        />
      )}
    </div>
  )
}