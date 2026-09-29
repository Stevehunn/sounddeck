// src/test/setup.js
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

import { installElectronAPIMock } from './utils/mockElectronAPI'
import { installAudioContextMock } from './utils/mockAudioContext'
import { resetAllModuleState } from './utils/resetModules'

// ─── CLEANUP APRÈS CHAQUE TEST ────────────────────────────────────────────
afterEach(async () => {
  cleanup()
  await resetAllModuleState()
})

// ─── MOCK DE HOWLER ────────────────────────────────────────────────────────
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
    _sounds: [{ _node: { setSinkId: vi.fn() } }],
  })),
  Howler: {
    volume: vi.fn(),
  },
}))

// ─── MOCK DE UUID ──────────────────────────────────────────────────────────
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter}`
  }),
}))

// ─── MOCK DE NAVIGATOR.MEDIADEVICES ────────────────────────────────────────
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    enumerateDevices: vi.fn().mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'default', label: 'Default Speakers' },
      { kind: 'audiooutput', deviceId: 'cable-input', label: 'CABLE Input (VB-Audio Virtual Cable)' },
      { kind: 'audiooutput', deviceId: 'cable-output', label: 'CABLE Output (VB-Audio Virtual Cable)' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone (Realtek)' },
      { kind: 'audioinput', deviceId: 'mic-2', label: 'Microphone (USB)' },
    ]),
    getUserMedia: vi.fn().mockResolvedValue({
      getAudioTracks: vi.fn(() => [
        { label: 'Test Microphone', readyState: 'live', stop: vi.fn() },
      ]),
    }),
  },
  writable: true,
  configurable: true,
})

// ─── MOCKS INSTALLÉS AVANT TOUS LES TESTS ──────────────────────────────────
beforeAll(() => {
  installElectronAPIMock()
  installAudioContextMock()
})

// ─── MOCK DE CRYPTO ────────────────────────────────────────────────────────
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => 'test-crypto-uuid-' + Date.now())
}

// ─── MOCK DE LOCALSTORAGE ─────────────────────────────────────────────────
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

// ─── MOCK DE SESSIONSTORAGE ───────────────────────────────────────────────
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

// ─── MOCK DE FETCH ────────────────────────────────────────────────────────
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('.mp3') || url.includes('.wav')) {
    return Promise.resolve({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      blob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/mpeg' })),
    })
  }
  return Promise.resolve({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
  })
})

// ─── MOCK DE INTERSECTION OBSERVER ────────────────────────────────────────
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// ─── MOCK DE RESIZE OBSERVER ──────────────────────────────────────────────
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ─── MOCK DE WINDOW.MATCHMEDIA ────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ─── MOCK DE MEDIA STREAM ────────────────────────────────────────────────
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


// ─── MOCK GLOBAL i18n (fallback pour les tests sans mock i18n) ─────────────
// Les tests qui définissent leur PROPRE vi.mock('@core/i18n/LanguageContext')
// overrident ce mock (grâce au hoisting de vi.mock dans les fichiers de test).
vi.mock('@core/i18n/LanguageContext', async () => {
  const frTranslations = (await import('../core/i18n/locales/fr/index.js')).default

  const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]

  return {
    useLanguage: () => ({
      t: (key, params) => {
        let value = frTranslations[key]
        if (!value) return key
        if (typeof params === 'object' && params !== null) {
          return String(value).replace(/\{(\w+)\}/g, (m, k) =>
            params[k] != null ? String(params[k]) : m
          )
        }
        return String(value)
      },
      currentLang: 'fr',
      changeLanguage: vi.fn(),
      isLoading: false,
      subscribe: vi.fn(() => () => {}),
      languages: LANGUAGES,
      translations: frTranslations,
    }),
    LanguageProvider: ({ children }) => children,
    TRANSLATIONS: { fr: frTranslations },
    LANGUAGES,
  }
})

// ─── UTILITAIRES DE TEST ─────────────────────────────────────────────────
export const waitForStoreInit = async () => {
  const { act } = await import('@testing-library/react')
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150))
  })
}

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
  ...overrides,
})