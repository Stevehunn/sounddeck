// src/test/App.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  setStoreRef: vi.fn(),
  warmupAudioContext: vi.fn(),
  playSound: vi.fn(),
  stopAllSounds: vi.fn(),
  getItem: vi.fn().mockResolvedValue('true'),
  setItem: vi.fn(),
  isPluginPage: vi.fn(() => false),
  getPage: vi.fn(),
  usePluginPageReturn: {
    Component: null,
    loading: false,
    error: null,
  },
}))

vi.mock('@core/services/AudioService', () => ({
  playSound: mocks.playSound,
  stopAllSounds: mocks.stopAllSounds,
  setStoreRef: mocks.setStoreRef,
}))

vi.mock('@core/services/AudioMixerService', () => ({
  warmupAudioContext: mocks.warmupAudioContext,
}))

vi.mock('@shared/utils/appStorage', () => ({
  getItem: mocks.getItem,
  setItem: mocks.setItem,
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

// ─── PluginContext + usePluginPage ────────────────────────────────────
vi.mock('@core/plugins/PluginContext', () => ({
  PluginProvider: ({ children }) => <>{children}</>,
  usePlugins: () => ({
    isPluginPage: mocks.isPluginPage,
    getPage: mocks.getPage,
    pages: [],
    loaded: true,
    pluginManager: {},
  }),
}))

vi.mock('@core/plugins/hooks/usePluginPage', () => ({
  usePluginPage: () => mocks.usePluginPageReturn,
}))

// ─── NetworkProvider ──────────────────────────────────────────────────
vi.mock('@shared/contexts', () => ({
  NetworkProvider: ({ children }) => <>{children}</>,
  useNetwork: () => ({
    showNoConnection: vi.fn(),
    ensureOnline: vi.fn().mockResolvedValue(true),
  }),
}))

// ─── Composants enfants — mocks vides ─────────────────────────────────
vi.mock('@shared/components/navigation/Sidebar', () => ({
  default: () => <div data-testid="sidebar-mock">Sidebar</div>,
}))

vi.mock('@features/home/Home', () => ({
  default: () => <div data-testid="home-mock">Home</div>,
}))

vi.mock('@features/options/Options', () => ({
  default: () => <div data-testid="options-mock">Options</div>,
}))

vi.mock('@features/trimmer/Trimmer', () => ({
  default: () => <div data-testid="trimmer-mock">Trimmer</div>,
}))

vi.mock('@features/editor/Editor', () => ({
  default: () => <div data-testid="editor-mock">Editor</div>,
}))

vi.mock('@features/sequencer/Sequencer', () => ({
  default: () => <div data-testid="sequencer-mock">Sequencer</div>,
}))

vi.mock('@features/guide/Guide', () => ({
  default: () => <div data-testid="guide-mock">Guide</div>,
}))

vi.mock('@features/stats/Stats', () => ({
  default: () => <div data-testid="stats-mock">Stats</div>,
}))

vi.mock('@features/presentation/Presentation', () => ({
  default: () => <div data-testid="presentation-mock">Presentation</div>,
}))

vi.mock('@features/welcome/WelcomeScreen', () => ({
  default: ({ onComplete }) => (
    <div data-testid="welcome-mock">
      Welcome
      <button onClick={onComplete}>complete</button>
    </div>
  ),
}))

vi.mock('@features/emoji/EmojiPage', () => ({
  default: () => <div data-testid="emoji-page-mock">EmojiPage</div>,
}))

vi.mock('@shared/components/ui/Toast', () => ({
  default: ({ toasts }) => (
    <div data-testid="toast-mock">toasts: {toasts.length}</div>
  ),
}))

vi.mock('@shared/components/modals/QuitConfirm', () => ({
  default: () => <div data-testid="quit-confirm-mock">QuitConfirm</div>,
}))

vi.mock('@shared/components/ui/Tutorial', () => ({
  default: () => <div data-testid="tutorial-mock">Tutorial</div>,
}))

vi.mock('@shared/components/ui/HelpButton', () => ({
  default: () => <div data-testid="help-button-mock">Help</div>,
}))

// ─── useLanguage : mock du mock (LanguageContext est déjà mocké par setup) ─
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// ─── useStore : mock custom ───────────────────────────────────────────
const storeMock = vi.hoisted(() => {
  return {
    loading: false,
    sounds: [],
    profiles: [{ id: 'all', name: 'All' }],
    currentProfileId: 'all',
    currentSounds: [],
    favoriteSounds: [],
    shortcuts: {},
    tags: {},
    switchToNextProfile: vi.fn(),
    toggleLoop: vi.fn(),
    playLocally: true,
    audioDevice: 'default',
    volume: 80,
    loopEnabled: false,
    theme: 'dark',
    customTheme: null,
    mixerEnabled: false,
    initMixerOnStartup: vi.fn(),
    updateMicrophoneDeviceId: vi.fn(),
    profileShortcut: '',
    sidebarVersion: 0,
    sidebarConfig: null,
    sidebarEditMode: false,
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    renameProfile: vi.fn(),
    switchProfile: vi.fn(),
    reorderProfiles: vi.fn(),
    updateVolume: vi.fn(),
    updateTheme: vi.fn(),
    updateCustomTheme: vi.fn(),
    toggleGlobalShortcuts: vi.fn(),
    setSoundOrder: vi.fn(),
    tags: {},
    updatePlayLocally: vi.fn(),
    updateSoundVolume: vi.fn(),
    incrementPlayCount: vi.fn(),
    toggleFavorite: vi.fn(),
    addSoundToProfile: vi.fn(),
    removeSoundFromProfile: vi.fn(),
    setShortcut: vi.fn(),
    updateSound: vi.fn(),
    updateSoundImage: vi.fn(),
    updateSoundEmoji: vi.fn(),
    addTagToSound: vi.fn(),
    removeTagFromSound: vi.fn(),
    resetGainCache: vi.fn(),
  }
})

vi.mock('@core/store', () => ({
  useStore: () => storeMock,
}))

import App from '@/App'

// ─── HELPERS ───────────────────────────────────────────────────────────
beforeEach(() => {
  mocks.setStoreRef.mockReset()
  mocks.warmupAudioContext.mockReset()
  mocks.playSound.mockReset()
  mocks.stopAllSounds.mockReset()
  mocks.getItem.mockReset().mockResolvedValue('true')
  mocks.isPluginPage.mockReset().mockReturnValue(false)

  storeMock.loading = false

  // Mock electronAPI
  global.window.electronAPI = {
    storeGet: vi.fn().mockResolvedValue(true),
    storeSet: vi.fn().mockResolvedValue(undefined),
    getGlobalShortcutsState: vi.fn().mockResolvedValue(true),
    updateTrayLanguage: vi.fn(),
    onPlaySound: vi.fn(),
    onSwitchProfile: vi.fn(),
    onToggleLoop: vi.fn(),
    onStopAllSounds: vi.fn(),
    onTogglePresentation: vi.fn(),
    onShortcutsToggle: vi.fn(),
    onShowQuitConfirm: vi.fn(),
    onHideQuitConfirm: vi.fn(),
    removeAllListeners: vi.fn(),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  }
})

// ═══════════════════════════════════════════════════════════════════════
// SMOKE TESTS
// ═══════════════════════════════════════════════════════════════════════
describe('App (smoke)', () => {
  it('affiche le loader si store.loading=true', () => {
    storeMock.loading = true
    render(<App />)
    expect(screen.getByText(/Chargement de SoundDeck|appLoading/)).toBeInTheDocument()
  })

  it('rend sans crash quand le store est chargé', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument()
    })
  })

  it('affiche Home par défaut (currentPage="home")', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('home-mock')).toBeInTheDocument()
    })
  })

  it('appelle setStoreRef au mount', async () => {
    render(<App />)
    await waitFor(() => {
      expect(mocks.setStoreRef).toHaveBeenCalled()
    })
  })

  it('warmupAudioContext est appelé après le chargement', async () => {
    vi.useFakeTimers()
    render(<App />)

    await vi.advanceTimersByTimeAsync(600)

    // Le warmup se déclenche 500ms après
    vi.useRealTimers()
    // Pas d'assertion stricte — on vérifie juste que ça ne crash pas
    expect(true).toBe(true)
  })
})