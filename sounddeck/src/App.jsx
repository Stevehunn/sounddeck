import { useEffect, useState, useRef } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Options from './pages/Options'
import Toast from './components/Toast'
import { playSound } from './utils/audio'

export default function App() {
  const store = useStore()
  const [currentPage, setCurrentPage] = useState('home')
  const [toasts, setToasts] = useState([])
  const soundsRef = useRef([])

  // Sync ref pour accès dans les callbacks IPC
  useEffect(() => { soundsRef.current = store.sounds }, [store.sounds])

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme)
  }, [store.theme])

  // Écouter les raccourcis globaux depuis Electron
  useEffect(() => {
    if (!window.electronAPI) return

    // Jouer un son via raccourci global
    window.electronAPI.onPlaySound((soundId) => {
      const sound = soundsRef.current.find(s => s.id === soundId)
      if (sound) playSound(sound, store.audioDevice, store.volume)
    })

    // Changer de profil via raccourci global
    window.electronAPI.onSwitchProfile(() => {
      store.switchToNextProfile()
    })

    return () => {
      window.electronAPI.removeAllListeners('play-sound')
      window.electronAPI.removeAllListeners('switch-profile')
    }
  }, [])

  // Système de notifications toast
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
        addToast={addToast}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'home' && (
          <Home store={store} addToast={addToast} />
        )}
        {currentPage === 'discover' && (
          <Discover store={store} addToast={addToast} />
        )}
        {currentPage === 'options' && (
          <Options store={store} addToast={addToast} />
        )}
      </main>

      <Toast toasts={toasts} />
    </div>
  )
}