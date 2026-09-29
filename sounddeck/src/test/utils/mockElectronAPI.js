// src/test/utils/mockElectronAPI.js
import { vi } from 'vitest'

/**
 * Crée un mock complet de window.electronAPI.
 * Toutes les méthodes sont des vi.fn() avec des valeurs par défaut sensées.
 */
export const createElectronAPIMock = () => ({
  // ─── STORE ─────────────────────────────────────────────────────────────
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
      profileShortcut: 'CommandOrControl+Tab',
    }
    return Promise.resolve(
      defaults[key] !== undefined ? defaults[key] : undefined
    )
  }),
  storeSet: vi.fn().mockResolvedValue(),
  storeDelete: vi.fn().mockResolvedValue(),
  storeSetLang: vi.fn().mockResolvedValue(),

  // ─── FICHIERS ──────────────────────────────────────────────────────────
  openFileDialog: vi.fn().mockResolvedValue([]),
  openImageDialog: vi.fn().mockResolvedValue(null),
  openDirectoryDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  importSoundFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/sound.mp3', name: 'test-sound' }),
  importImageFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/image.png' }),
  downloadSoundUrl: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/download.mp3' }),
  trimSoundFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/trimmed.mp3' }),
  deleteSoundFile: vi.fn().mockResolvedValue({ success: true }),
  getSoundsDir: vi.fn().mockResolvedValue('/fake/sounds'),
  fileExists: vi.fn().mockResolvedValue(true),
  writeDroppedFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/dropped.mp3', name: 'dropped' }),
  readFile: vi
    .fn()
    .mockResolvedValue({ success: true, data: new ArrayBuffer(1024) }),
  readFileBase64: vi
    .fn()
    .mockResolvedValue({ success: true, base64: 'ZmFrZQ==' }),
  writeSoundFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/written.mp3' }),
  saveFileDialog: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/saved.wav' }),
  exportJsonFile: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/export.json' }),

  // ─── MYINSTANTS ────────────────────────────────────────────────────────
  fetchMyinstants: vi.fn().mockResolvedValue({
    success: true,
    sounds: [
      {
        id: 'mi_test_1',
        name: 'Test Sound 1',
        url: 'https://example.com/1.mp3',
        emoji: '🔊',
        slug: 'test-1',
      },
      {
        id: 'mi_test_2',
        name: 'Test Sound 2',
        url: 'https://example.com/2.mp3',
        emoji: '🎵',
        slug: 'test-2',
      },
    ],
  }),

  // ─── EMOJIS ────────────────────────────────────────────────────────────
  fetchEmojis: vi.fn().mockResolvedValue({
    success: true,
    emojis: ['😀', '😃', '😄', '😁', '😅'],
  }),

  // ─── RACCOURCIS ────────────────────────────────────────────────────────
  updateShortcuts: vi.fn().mockResolvedValue(),
  updateProfileShortcut: vi.fn().mockResolvedValue(),
  updateLoopShortcut: vi.fn().mockResolvedValue(),
  updateStopAllShortcut: vi.fn().mockResolvedValue(),
  updatePresentationShortcut: vi.fn().mockResolvedValue(),
  updateToggleShortcutsAccelerator: vi.fn().mockResolvedValue(),
  updateToggleWindowShortcut: vi.fn().mockResolvedValue(),
  toggleGlobalShortcuts: vi.fn().mockResolvedValue(true),
  getGlobalShortcutsState: vi.fn().mockResolvedValue(true),

  // ─── IPC LISTENERS ─────────────────────────────────────────────────────
  onPlaySound: vi.fn(),
  onSwitchProfile: vi.fn(),
  onToggleLoop: vi.fn(),
  onStopAllSounds: vi.fn(),
  onTogglePresentation: vi.fn(),
  onShortcutsToggle: vi.fn(),
  onShowQuitConfirm: vi.fn(),
  onHideQuitConfirm: vi.fn(),
  onShowWindow: vi.fn(),
  removeAllListeners: vi.fn(),

  // ─── TRAY ──────────────────────────────────────────────────────────────
  updateTrayLanguage: vi.fn().mockResolvedValue(),

  // ─── PILOTE AUDIO ──────────────────────────────────────────────────────
  installVirtualDriver: vi
    .fn()
    .mockResolvedValue({ success: true, warning: null }),
  uninstallVirtualDriver: vi.fn().mockResolvedValue({ success: true }),
  getVirtualDriverStatus: vi
    .fn()
    .mockResolvedValue({ installed: false, platform: 'win32' }),

  // ─── DÉMARRAGE ────────────────────────────────────────────────────────
  getStartMinimized: vi.fn().mockResolvedValue(false),
  setStartMinimized: vi.fn().mockResolvedValue(),
  getLaunchAtStartup: vi.fn().mockResolvedValue(false),
  setLaunchAtStartup: vi.fn().mockResolvedValue(),

  // ─── FENÊTRE ──────────────────────────────────────────────────────────
  quitApp: vi.fn().mockResolvedValue(),
  hideWindow: vi.fn().mockResolvedValue(),
  showWindow: vi.fn().mockResolvedValue(),
  confirmQuit: vi.fn().mockResolvedValue('cancel'),

  // ─── YOUTUBE ──────────────────────────────────────────────────────────
  checkYtdlp: vi.fn().mockResolvedValue({ available: true }),
  downloadYtdlp: vi.fn().mockResolvedValue({ success: true }),
  youtubeInfo: vi.fn().mockResolvedValue({
    success: true,
    title: 'Test Video',
    duration: 60,
    thumbnail: 'https://example.com/thumb.jpg',
    uploader: 'Test Uploader',
    url: 'https://youtube.com/watch?v=test',
  }),
  youtubeDownload: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/youtube.mp3' }),
  downloadThumbnail: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/thumb.jpg' }),

  // ─── SYSTÈME ──────────────────────────────────────────────────────────
  openExternal: vi.fn().mockResolvedValue(),
  getSystemLanguage: vi.fn().mockResolvedValue('fr'),
  getSystemKeyboardLayout: vi.fn().mockResolvedValue('qwerty'),

  // ─── SPOTIFY / SOUNDCLOUD ────────────────────────────────────────────
  spotifyTrackInfo: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'track-1', title: 'Spotify Track', duration: 180 },
  }),
  soundcloudTrackInfo: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'track-2', title: 'SoundCloud Track', duration: 200 },
  }),
  downloadPlatformTrack: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/platform.mp3' }),

  // ─── EXPORT / IMPORT ─────────────────────────────────────────────────
  exportProfile: vi.fn().mockResolvedValue({
    success: true,
    path: '/fake/profile.zip',
    sizeMb: '1.2',
    soundCount: 5,
  }),
  importProfile: vi.fn().mockResolvedValue({
    success: true,
    profileName: 'Imported Profile',
    soundCount: 3,
  }),
  exportConfig: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/config.json' }),
  exportFull: vi
    .fn()
    .mockResolvedValue({ success: true, path: '/fake/full.zip', sizeMb: '5.6' }),
  exportSoundsOnly: vi.fn().mockResolvedValue({
    success: true,
    path: '/fake/sounds.zip',
    sizeMb: '4.2',
  }),
  importBackup: vi
    .fn()
    .mockResolvedValue({ success: true, type: 'json', importedSounds: 0 }),

  // ─── PLUGINS ─────────────────────────────────────────────────────────
  getInstalledPlugins: vi.fn().mockResolvedValue([]),
  getPluginPath: vi.fn().mockResolvedValue(null),
  getPluginComponentPath: vi.fn().mockResolvedValue(null),
  installPluginFromBuffer: vi.fn().mockResolvedValue({ success: false }),
  uninstallPlugin: vi.fn().mockResolvedValue({ success: true }),

  // ─── AUDIO / MIXER ────────────────────────────────────────────────────
  convertAudio: vi.fn().mockResolvedValue({ success: true }),

  // ─── PROJETS ÉDITEUR ─────────────────────────────────────────────────
  saveEditorProject: vi
    .fn()
    .mockImplementation((p) => Promise.resolve({ success: true, project: p })),
  loadEditorProject: vi.fn().mockResolvedValue({ success: false }),
  getAllEditorProjects: vi.fn().mockResolvedValue([]),
  getRecentEditorProjects: vi.fn().mockResolvedValue([]),
  deleteEditorProject: vi.fn().mockResolvedValue({ success: true }),
  renameEditorProject: vi.fn().mockResolvedValue({ success: false }),
  duplicateEditorProject: vi.fn().mockResolvedValue({ success: false }),
  exportEditorProject: vi.fn().mockResolvedValue({ success: true }),
  importEditorProject: vi.fn().mockResolvedValue({ success: false }),

  // ─── DIVERS ──────────────────────────────────────────────────────────
  isElectron: true,
})

/**
 * Installe le mock sur window.electronAPI.
 * Retourne le mock pour permettre des assertions.
 */
export function installElectronAPIMock() {
  const api = createElectronAPIMock()
  global.window.electronAPI = api
  return api
}