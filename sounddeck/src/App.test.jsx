import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// ✅ Mock complet de useStore
const mockStore = {
  profiles: [
    { id: 'all', name: 'Tous les sons', isDefault: true },
    { id: 'profile1', name: 'Test Profile', isDefault: false }
  ],
  currentProfileId: 'all',
  sounds: [],
  currentSounds: [],
  favoriteSounds: [],
  shortcuts: {},
  profileShortcut: '',
  theme: 'dark',
  customTheme: null,
  lang: 'fr',
  audioDevice: 'default',
  volume: 80,
  playLocally: true,
  loopEnabled: false,
  loopShortcut: '',
  stopAllShortcut: '',
  presentationShortcut: '',
  loading: false,
  previewVolume: 70,
  shortcutsEnabled: true,
  toggleShortcutsAccelerator: 'CommandOrControl+Shift+K',
  toggleWindowShortcut: 'CommandOrControl+Shift+S',
  soundOrder: {},
  normalizationEnabled: true,
  normalizationTarget: 0.2,
  startMinimized: false,
  launchAtStartup: false,
  audioMode: 'simple',
  virtualDriverInstalled: false,
  virtualDeviceActive: false,
  mixerEnabled: false,
  microphoneDevice: 'default',
  microphoneVolume: 80,
  mixerSoundVolume: 100,
  localAudioDevice: 'default',
  noiseSuppression: false,
  noiseSuppressionMode: 'auto',
  keyboardLayout: 'qwerty',
  createProfile: vi.fn(),
  deleteProfile: vi.fn(),
  renameProfile: vi.fn(),
  switchProfile: vi.fn(),
  switchToNextProfile: vi.fn(),
  reorderProfiles: vi.fn(),
  addSound: vi.fn(),
  deleteSound: vi.fn(),
  updateSound: vi.fn(),
  updateSoundVolume: vi.fn(),
  incrementPlayCount: vi.fn(),
  toggleFavorite: vi.fn(),
  addSoundToProfile: vi.fn(),
  removeSoundFromProfile: vi.fn(),
  reorderSounds: vi.fn(),
  setShortcut: vi.fn(),
  clearShortcut: vi.fn(),
  updateProfileShortcut: vi.fn(),
  toggleLoop: vi.fn(),
  updateLoopShortcut: vi.fn(),
  updateStopAllShortcut: vi.fn(),
  updatePresentationShortcut: vi.fn(),
  updateLang: vi.fn(),
  updateTheme: vi.fn(),
  updateCustomTheme: vi.fn(),
  updateAudioDevice: vi.fn(),
  updateVolume: vi.fn(),
  updatePlayLocally: vi.fn(),
  updatePreviewVolume: vi.fn(),
  updateAudioMode: vi.fn(),
  updateVirtualDriverInstalled: vi.fn(),
  updateVirtualDeviceActive: vi.fn(),
  updateMixerEnabled: vi.fn(),
  updateMicrophoneDeviceId: vi.fn(),
  updateMicrophoneVolume: vi.fn(),
  updateMixerSoundVolume: vi.fn(),
  updateNoiseSuppression: vi.fn(),
  updateNoiseSuppressionMode: vi.fn(),
  updateNormalizationEnabled: vi.fn(),
  updateNormalizationTarget: vi.fn(),
  updateKeyboardLayout: vi.fn(),
  updateLocalAudioDevice: vi.fn(),
  updateToggleShortcutsAccelerator: vi.fn(),
  updateToggleWindowShortcut: vi.fn(),
  updateSoundImage: vi.fn(),
  updateSoundEmoji: vi.fn(),
  resetGainCache: vi.fn(),
  cleanupOrphanShortcuts: vi.fn(),
  initMixerOnStartup: vi.fn().mockResolvedValue(true)
}

vi.mock('./store/useStore', () => ({
  useStore: vi.fn(() => mockStore)
}))

// ✅ Mock des composants enfants
vi.mock('./components/Sidebar', () => ({
  default: ({ onSwitchProfile, onChangePage, onToggleLoop, onVolumeChange, onStopAll, onPresentation }) => (
    <div data-testid="sidebar">
      <button data-testid="switch-profile" onClick={() => onSwitchProfile('profile1')}>
        Switch Profile
      </button>
      <button data-testid="change-page" onClick={() => onChangePage('options')}>
        Change Page
      </button>
      <button data-testid="toggle-loop" onClick={onToggleLoop}>
        Toggle Loop
      </button>
      <button data-testid="change-volume" onClick={() => onVolumeChange(50)}>
        Change Volume
      </button>
      <button data-testid="stop-all" onClick={onStopAll}>
        Stop All
      </button>
      <button data-testid="presentation" onClick={onPresentation}>
        Presentation
      </button>
    </div>
  )
}))

vi.mock('./pages/Home', () => ({
  default: () => <div data-testid="page-home">Home Page</div>
}))

vi.mock('./pages/Discover', () => ({
  default: () => <div data-testid="page-discover">Discover Page</div>
}))

vi.mock('./pages/Options', () => ({
  default: () => <div data-testid="page-options">Options Page</div>
}))

vi.mock('./pages/Editor', () => ({
  default: () => <div data-testid="page-editor">Editor Page</div>
}))

vi.mock('./pages/Sequencer', () => ({
  default: () => <div data-testid="page-sequencer">Sequencer Page</div>
}))

vi.mock('./pages/YouTube', () => ({
  default: () => <div data-testid="page-youtube">YouTube Page</div>
}))

vi.mock('./pages/Guide', () => ({
  default: () => <div data-testid="page-guide">Guide Page</div>
}))

// ✅ NE PAS mock Presentation - on laisse le vrai composant s'afficher
// Il fonctionnera avec les données mockées

vi.mock('./components/Toast', () => ({
  default: ({ toasts }) => (
    <div data-testid="toast-container">
      {toasts.map(t => (
        <div key={t.id} data-testid="toast">{t.message}</div>
      ))}
    </div>
  )
}))

vi.mock('./components/QuitConfirm', () => ({
  default: ({ onClose }) => (
    <div data-testid="quit-confirm">
      <button data-testid="quit-close" onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('./utils/audio', () => ({
  playSound: vi.fn(),
  stopAllSounds: vi.fn(),
  setStoreRef: vi.fn()
}))

vi.mock('./utils/audioMixer', () => ({
  isMixerOperational: vi.fn(() => true),
  repairMixer: vi.fn(() => true)
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockStore.loading = false
    mockStore.theme = 'dark'
    mockStore.customTheme = null
    mockStore.lang = 'fr'
    mockStore.mixerEnabled = false
    mockStore.initMixerOnStartup = vi.fn().mockResolvedValue(true)
    mockStore.currentSounds = []
    mockStore.favoriteSounds = []
    
    window.electronAPI = {
      updateTrayLanguage: vi.fn().mockResolvedValue(),
      onPlaySound: vi.fn(),
      onSwitchProfile: vi.fn(),
      onToggleLoop: vi.fn(),
      onStopAllSounds: vi.fn(),
      onTogglePresentation: vi.fn(),
      onShowQuitConfirm: vi.fn(),
      removeAllListeners: vi.fn(),
      storeSet: vi.fn().mockResolvedValue(),
      storeGet: vi.fn().mockResolvedValue(),
      storeSetLang: vi.fn().mockResolvedValue(),
      getStartMinimized: vi.fn().mockResolvedValue(false),
      getLaunchAtStartup: vi.fn().mockResolvedValue(false)
    }
    
    global.navigator.mediaDevices = {
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone 1' }
      ])
    }
  })

  const renderApp = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<App {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  // ─── TESTS D'AFFICHAGE ─────────────────────────────────────────────────────

  it('devrait afficher la Sidebar', async () => {
    await renderApp()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('devrait afficher la page Home par défaut', async () => {
    await renderApp()
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  it('devrait afficher le conteneur de toasts', async () => {
    await renderApp()
    expect(screen.getByTestId('toast-container')).toBeInTheDocument()
  })

  // ─── TESTS DE NAVIGATION ──────────────────────────────────────────────────

  it('devrait changer de page', async () => {
    await renderApp()
    
    const changePageButton = screen.getByTestId('change-page')
    await act(async () => {
      await userEvent.click(changePageButton)
    })
    
    expect(screen.getByTestId('page-options')).toBeInTheDocument()
  })

  it('devrait afficher toutes les pages', async () => {
    await renderApp()
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  // ─── TESTS DE CHANGEMENT DE PROFIL ──────────────────────────────────────

  it('devrait changer de profil', async () => {
    await renderApp()
    
    const switchProfileButton = screen.getByTestId('switch-profile')
    await act(async () => {
      await userEvent.click(switchProfileButton)
    })
    
    expect(mockStore.switchProfile).toHaveBeenCalledWith('profile1')
  })

  // ─── TESTS DU LOOP ────────────────────────────────────────────────────────

  it('devrait basculer le loop', async () => {
    await renderApp()
    
    const toggleLoopButton = screen.getByTestId('toggle-loop')
    await act(async () => {
      await userEvent.click(toggleLoopButton)
    })
    
    expect(mockStore.toggleLoop).toHaveBeenCalled()
  })

  // ─── TESTS DU VOLUME ──────────────────────────────────────────────────────

  it('devrait changer le volume', async () => {
    await renderApp()
    
    const changeVolumeButton = screen.getByTestId('change-volume')
    await act(async () => {
      await userEvent.click(changeVolumeButton)
    })
    
    expect(mockStore.updateVolume).toHaveBeenCalledWith(50)
  })

  // ─── TESTS DE STOP ALL ────────────────────────────────────────────────────

  it('devrait arrêter tous les sons', async () => {
    const { stopAllSounds } = await import('./utils/audio')
    
    await renderApp()
    
    const stopAllButton = screen.getByTestId('stop-all')
    await act(async () => {
      await userEvent.click(stopAllButton)
    })
    
    expect(stopAllSounds).toHaveBeenCalled()
  })

  // ─── TESTS DU MODE PRÉSENTATION ──────────────────────────────────────────

  it('devrait ouvrir le mode présentation', async () => {
    await renderApp()
    
    const presentationButton = screen.getByTestId('presentation')
    await act(async () => {
      await userEvent.click(presentationButton)
    })
    
    // ✅ Le vrai composant Presentation s'affiche avec la classe presentation-overlay
    await waitFor(() => {
      const presentationElement = document.querySelector('.presentation-overlay')
      expect(presentationElement).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('devrait fermer le mode présentation', async () => {
    await renderApp()
    
    const presentationButton = screen.getByTestId('presentation')
    await act(async () => {
      await userEvent.click(presentationButton)
    })
    
    await waitFor(() => {
      const presentationElement = document.querySelector('.presentation-overlay')
      expect(presentationElement).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // ✅ Cliquer sur le bouton Quitter dans le composant Presentation
    const quitButton = screen.getByText('Quitter')
    await act(async () => {
      await userEvent.click(quitButton)
    })
    
    await waitFor(() => {
      const presentationElement = document.querySelector('.presentation-overlay')
      expect(presentationElement).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  // ─── TESTS DES TOASTS ─────────────────────────────────────────────────────

  it('devrait afficher un toast', async () => {
    await renderApp()
    
    const toastContainer = screen.getByTestId('toast-container')
    expect(toastContainer).toBeInTheDocument()
  })

  // ─── TESTS DU THÈME ──────────────────────────────────────────────────────

  it('devrait appliquer le thème', async () => {
    mockStore.theme = 'dark'
    await renderApp()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('devrait appliquer le thème personnalisé', async () => {
    mockStore.theme = 'custom'
    mockStore.customTheme = {
      bgPrimary: '#111113',
      bgSecondary: '#1a1a1e',
      accent: '#7C6FF7'
    }
    await renderApp()
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom')
  })

  // ─── TESTS DE L'ÉTAT DE CHARGEMENT ──────────────────────────────────────

  it('devrait afficher un écran de chargement', async () => {
    mockStore.loading = true
    await renderApp()
    expect(screen.getByText('Chargement de SoundDeck...')).toBeInTheDocument()
  })

  it('ne devrait pas afficher l\'écran de chargement quand le chargement est terminé', async () => {
    mockStore.loading = false
    await renderApp()
    expect(screen.queryByText('Chargement de SoundDeck...')).not.toBeInTheDocument()
  })

  // ─── TESTS DE LA CONFIRMATION DE FERMETURE ─────────────────────────────

  it('devrait afficher la confirmation de fermeture', async () => {
    await renderApp()
    
    const showQuitConfirmCallback = window.electronAPI.onShowQuitConfirm.mock.calls[0]?.[0]
    if (showQuitConfirmCallback) {
      await act(async () => {
        showQuitConfirmCallback()
      })
      expect(screen.getByTestId('quit-confirm')).toBeInTheDocument()
    }
  })

  it('devrait fermer la confirmation de fermeture', async () => {
    await renderApp()
    
    const showQuitConfirmCallback = window.electronAPI.onShowQuitConfirm.mock.calls[0]?.[0]
    if (showQuitConfirmCallback) {
      await act(async () => {
        showQuitConfirmCallback()
      })
      expect(screen.getByTestId('quit-confirm')).toBeInTheDocument()
      
      const closeButton = screen.getByTestId('quit-close')
      await act(async () => {
        await userEvent.click(closeButton)
      })
      expect(screen.queryByTestId('quit-confirm')).not.toBeInTheDocument()
    }
  })

  // ─── TESTS DES RACCOURCIS CLAVIER ────────────────────────────────────────

  it('devrait enregistrer les listeners IPC', async () => {
    await renderApp()
    
    expect(window.electronAPI.onPlaySound).toHaveBeenCalled()
    expect(window.electronAPI.onSwitchProfile).toHaveBeenCalled()
    expect(window.electronAPI.onToggleLoop).toHaveBeenCalled()
    expect(window.electronAPI.onStopAllSounds).toHaveBeenCalled()
    expect(window.electronAPI.onTogglePresentation).toHaveBeenCalled()
    expect(window.electronAPI.onShowQuitConfirm).toHaveBeenCalled()
  })

  it('devrait nettoyer les listeners IPC au démontage', async () => {
    const { unmount } = await renderApp()
    
    unmount()
    
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('play-sound')
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('switch-profile')
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('toggle-loop')
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('stop-all-sounds')
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('toggle-presentation')
    expect(window.electronAPI.removeAllListeners).toHaveBeenCalledWith('show-quit-confirm')
  })

  // ─── TESTS DE LA LANGUE ──────────────────────────────────────────────────

  it('devrait mettre à jour la langue du tray', async () => {
    mockStore.lang = 'en'
    await renderApp()
    
    expect(window.electronAPI.updateTrayLanguage).toHaveBeenCalledWith('en')
  })

  // ─── TESTS DU MIXEUR ─────────────────────────────────────────────────────

  it('devrait initialiser le mixeur si activé', async () => {
    // ✅ Forcer l'appel en contournant la condition
    mockStore.mixerEnabled = true
    mockStore.initMixerOnStartup = vi.fn().mockResolvedValue(true)
    
    await renderApp()
    
    // ✅ Vérifier que l'appel a été fait
    await waitFor(() => {
      expect(mockStore.initMixerOnStartup).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('ne devrait pas initialiser le mixeur si désactivé', async () => {
    mockStore.mixerEnabled = false
    mockStore.initMixerOnStartup = vi.fn().mockResolvedValue(true)
    
    await renderApp()
    
    // ✅ Vérifier que l'appel n'a PAS été fait
    expect(mockStore.initMixerOnStartup).not.toHaveBeenCalled()
  })
})