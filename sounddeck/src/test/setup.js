import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'

// Nettoyer après chaque test
afterEach(() => {
  cleanup()
})

// ─── MOCK DE HOWLER ────────────────────────────────────────────────────────────
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    unload: vi.fn(),
    volume: vi.fn(),
    duration: vi.fn(() => 10),
    seek: vi.fn(() => 5),
    on: vi.fn(),
    once: vi.fn(),
    playing: vi.fn(() => false),
    _sounds: [{ _node: { setSinkId: vi.fn() } }]
  })),
  Howler: {
    volume: vi.fn()
  }
}))

// ─── MOCK DE UUID ──────────────────────────────────────────────────────────────
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter}`
  })
}))

// ─── MOCK DE NAVIGATOR.MEDIADEVICES ──────────────────────────────────────────
// ✅ CORRECTION : Utiliser Object.defineProperty pour éviter l'erreur de lecture seule
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    enumerateDevices: vi.fn().mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'default', label: 'Default Speakers' },
      { kind: 'audiooutput', deviceId: 'cable-input', label: 'CABLE Input (VB-Audio Virtual Cable)' },
      { kind: 'audiooutput', deviceId: 'cable-output', label: 'CABLE Output (VB-Audio Virtual Cable)' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone (Realtek)' },
      { kind: 'audioinput', deviceId: 'mic-2', label: 'Microphone (USB)' }
    ]),
    getUserMedia: vi.fn().mockResolvedValue({
      getAudioTracks: vi.fn(() => [
        { label: 'Test Microphone', readyState: 'live', stop: vi.fn() }
      ])
    })
  },
  writable: true,
  configurable: true
})

// ─── MOCK DE L'API ELECTRON ──────────────────────────────────────────────────
const createElectronAPIMock = () => ({
  // Store
  storeGet: vi.fn().mockImplementation((key) => {
    const defaults = {
      shortcuts: {},
      soundOrder: {},
      profiles: [],
      sounds: [],
      currentProfileId: 'all',
      theme: 'dark',
      customTheme: null,
      lang: 'fr',
      audioDevice: 'default',
      volume: 80,
      playLocally: true,
      loopShortcut: '',
      stopAllShortcut: '',
      presentationShortcut: '',
      previewVolume: 70,
      shortcutsEnabled: true,
      toggleShortcutsAccelerator: 'CommandOrControl+Shift+K',
      toggleWindowShortcut: 'CommandOrControl+Shift+S',
      normalizationEnabled: true,
      normalizationTarget: 0.2,
      noiseSuppression: false,
      noiseSuppressionMode: 'auto',
      audioMode: 'simple',
      virtualDriverInstalled: false,
      virtualDeviceActive: false,
      mixerEnabled: false,
      microphoneDevice: 'default',
      microphoneVolume: 80,
      mixerSoundVolume: 100,
      localAudioDevice: 'default',
      keyboardLayout: 'qwerty',
      closeToTray: true,
      startMinimized: false,
      launchAtStartup: false,
      profileShortcut: 'CommandOrControl+Tab'
    }
    return Promise.resolve(defaults[key] !== undefined ? defaults[key] : undefined)
  }),
  storeSet: vi.fn().mockResolvedValue(),
  storeDelete: vi.fn().mockResolvedValue(),
  storeSetLang: vi.fn().mockResolvedValue(),

  // Fichiers
  openFileDialog: vi.fn().mockResolvedValue([]),
  openImageDialog: vi.fn().mockResolvedValue(null),
  importSoundFile: vi.fn().mockResolvedValue({ success: true, path: '/fake/sound.mp3', name: 'test-sound' }),
  importImageFile: vi.fn().mockResolvedValue({ success: true, path: '/fake/image.png' }),
  downloadSoundUrl: vi.fn().mockResolvedValue({ success: true, path: '/fake/download.mp3' }),
  trimSoundFile: vi.fn().mockResolvedValue({ success: true, path: '/fake/trimmed.mp3' }),
  deleteSoundFile: vi.fn().mockResolvedValue({ success: true }),
  getSoundsDir: vi.fn().mockResolvedValue('/fake/sounds'),
  fileExists: vi.fn().mockResolvedValue(true),
  writeDroppedFile: vi.fn().mockResolvedValue({ success: true, path: '/fake/dropped.mp3', name: 'dropped' }),

  // MyInstants
  fetchMyinstants: vi.fn().mockResolvedValue({
    success: true,
    sounds: [
      { id: 'mi_test_1', name: 'Test Sound 1', url: 'https://example.com/1.mp3', emoji: '🔊', slug: 'test-1' },
      { id: 'mi_test_2', name: 'Test Sound 2', url: 'https://example.com/2.mp3', emoji: '🎵', slug: 'test-2' }
    ]
  }),

  // Raccourcis
  updateShortcuts: vi.fn().mockResolvedValue(),
  updateProfileShortcut: vi.fn().mockResolvedValue(),
  updateLoopShortcut: vi.fn().mockResolvedValue(),
  updateStopAllShortcut: vi.fn().mockResolvedValue(),
  updatePresentationShortcut: vi.fn().mockResolvedValue(),
  updateToggleShortcutsAccelerator: vi.fn().mockResolvedValue(),
  updateToggleWindowShortcut: vi.fn().mockResolvedValue(),
  toggleGlobalShortcuts: vi.fn().mockResolvedValue(true),
  getGlobalShortcutsState: vi.fn().mockResolvedValue(true),

  // IPC Listeners
  onPlaySound: vi.fn(),
  onSwitchProfile: vi.fn(),
  onToggleLoop: vi.fn(),
  onStopAllSounds: vi.fn(),
  onTogglePresentation: vi.fn(),
  onShortcutsToggle: vi.fn(),
  onShowQuitConfirm: vi.fn(),
  removeAllListeners: vi.fn(),

  // Tray
  updateTrayLanguage: vi.fn().mockResolvedValue(),

  // Audio
  setNoiseSuppression: vi.fn().mockResolvedValue(),
  installVirtualDriver: vi.fn().mockResolvedValue({ success: true }),
  uninstallVirtualDriver: vi.fn().mockResolvedValue({ success: true }),
  getVirtualDriverStatus: vi.fn().mockResolvedValue({ installed: false, platform: 'win32' }),

  // Démarrage
  getStartMinimized: vi.fn().mockResolvedValue(false),
  setStartMinimized: vi.fn().mockResolvedValue(),
  getLaunchAtStartup: vi.fn().mockResolvedValue(false),
  setLaunchAtStartup: vi.fn().mockResolvedValue(),

  // Fenêtre
  quitApp: vi.fn().mockResolvedValue(),
  hideWindow: vi.fn().mockResolvedValue(),
  showWindow: vi.fn().mockResolvedValue(),
  confirmQuit: vi.fn().mockResolvedValue('cancel'),

  // YouTube
  checkYtdlp: vi.fn().mockResolvedValue({ available: true }),
  downloadYtdlp: vi.fn().mockResolvedValue({ success: true }),
  youtubeInfo: vi.fn().mockResolvedValue({
    success: true,
    title: 'Test Video',
    duration: 60,
    thumbnail: 'https://example.com/thumb.jpg',
    uploader: 'Test Uploader',
    url: 'https://youtube.com/watch?v=test'
  }),
  youtubeDownload: vi.fn().mockResolvedValue({ success: true, path: '/fake/youtube.mp3' }),

  // Export/Import
  openExternal: vi.fn().mockResolvedValue(),
  exportProfile: vi.fn().mockResolvedValue({ success: true, path: '/fake/profile.zip', sizeMb: '1.2', soundCount: 5 }),
  importProfile: vi.fn().mockResolvedValue({ success: true, profileName: 'Imported Profile', soundCount: 3 }),
  exportConfig: vi.fn().mockResolvedValue({ success: true, path: '/fake/config.json' }),
  exportFull: vi.fn().mockResolvedValue({ success: true, path: '/fake/full.zip', sizeMb: '5.6' }),
  exportSoundsOnly: vi.fn().mockResolvedValue({ success: true, path: '/fake/sounds.zip', sizeMb: '4.2' }),
  importBackup: vi.fn().mockResolvedValue({ success: true, type: 'json', importedSounds: 0 }),

  // Playlists
  storeGetPlaylists: vi.fn().mockResolvedValue([]),
  storeSetPlaylists: vi.fn().mockResolvedValue(),

  isElectron: true
})

// Appliquer le mock
global.window.electronAPI = createElectronAPIMock()

// ─── MOCK DE CRYPTO ────────────────────────────────────────────────────────────
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => 'test-crypto-uuid-' + Date.now())
}

// ─── MOCK DE LOCALSTORAGE ─────────────────────────────────────────────────────
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

// ─── MOCK DE SESSIONSTORAGE ──────────────────────────────────────────────────
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

// ─── MOCK DE AUDIO CONTEXT ────────────────────────────────────────────────────
class MockAudioContext {
  constructor() {
    this.state = 'running'
    this.audioWorklet = {
      addModule: vi.fn().mockResolvedValue()
    }
    this.createGain = vi.fn(() => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
    this.createMediaStreamDestination = vi.fn(() => ({
      stream: new MediaStream()
    }))
    this.createBiquadFilter = vi.fn(() => ({
      type: 'lowpass',
      frequency: { value: 4000 },
      Q: { value: 0.7 },
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
    this.createDynamicsCompressor = vi.fn(() => ({
      threshold: { value: -30 },
      knee: { value: 40 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
    this.createMediaStreamSource = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
    this.createBufferSource = vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null
    }))
    this.createAudioWorkletNode = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
    this.resume = vi.fn().mockResolvedValue()
    this.close = vi.fn().mockResolvedValue()
    this.decodeAudioData = vi.fn().mockResolvedValue({
      getChannelData: vi.fn(() => new Float32Array(100)),
      duration: 10,
      sampleRate: 44100,
      numberOfChannels: 2
    })
  }
}

global.AudioContext = vi.fn(() => new MockAudioContext())
global.webkitAudioContext = global.AudioContext

// ─── MOCK DE FETCH ────────────────────────────────────────────────────────────
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('.mp3') || url.includes('.wav')) {
    return Promise.resolve({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      blob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/mpeg' }))
    })
  }
  return Promise.resolve({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
  })
})

// ─── MOCK DE INTERSECTION OBSERVER ───────────────────────────────────────────
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// ─── MOCK DE RESIZE OBSERVER ─────────────────────────────────────────────────
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// ─── MOCK DE WINDOW.MATCHMEDIA ──────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// ─── MOCK DE MEDIA STREAM ────────────────────────────────────────────────────
class MockMediaStream {
  constructor() {
    this.active = true
    this._tracks = []
  }
  getAudioTracks() {
    return this._tracks
  }
  addTrack(track) {
    this._tracks.push(track)
  }
}

global.MediaStream = vi.fn(() => new MockMediaStream())

// ─── UTILITAIRES DE TEST ─────────────────────────────────────────────────────

// Fonction pour attendre l'initialisation du store
export const waitForStoreInit = async () => {
  const { act } = await import('@testing-library/react')
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
  })
}

// Fonction pour créer un mock de store
export const createMockStore = (overrides = {}) => ({
  profiles: [{ id: 'all', name: 'Tous les sons', isDefault: true }],
  currentProfileId: 'all',
  sounds: [],
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
  reorderProfiles: vi.fn(),
  ...overrides
})

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
export { act } from '@testing-library/react'