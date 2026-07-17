const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── FICHIERS ────────────────────────────────────────────────────────────
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  importSoundFile: (filePath) => ipcRenderer.invoke('import-sound-file', filePath),
  importImageFile: (filePath) => ipcRenderer.invoke('import-image-file', filePath),
  downloadSoundUrl: (url, fileName) => ipcRenderer.invoke('download-sound-url', url, fileName),
  trimSoundFile: (filePath, start, end) => ipcRenderer.invoke('trim-sound-file', filePath, start, end),
  deleteSoundFile: (filePath) => ipcRenderer.invoke('delete-sound-file', filePath),
  getSoundsDir: () => ipcRenderer.invoke('get-sounds-dir'),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  writeDroppedFile: (fileName, arrayBuffer) => ipcRenderer.invoke('write-dropped-file', fileName, arrayBuffer),

  // ─── STORE ──────────────────────────────────────────────────────────────
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeSetLang: (lang) => ipcRenderer.invoke('store-set-lang', lang),

  // ─── MYINSTANTS ──────────────────────────────────────────────────────────
  fetchMyinstants: (query, mode, lang) => ipcRenderer.invoke('fetch-myinstants', query, mode, lang),

  // ─── RACCOURCIS ──────────────────────────────────────────────────────────
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  updateProfileShortcut: (acc) => ipcRenderer.invoke('update-profile-shortcut', acc),
  updateLoopShortcut: (acc) => ipcRenderer.invoke('update-loop-shortcut', acc),
  updateStopAllShortcut: (acc) => ipcRenderer.invoke('update-stop-all-shortcut', acc),
  updatePresentationShortcut: (acc) => ipcRenderer.invoke('update-presentation-shortcut', acc),
  updateToggleShortcutsAccelerator: (accelerator) => ipcRenderer.invoke('update-toggle-shortcuts-accelerator', accelerator),
  updateToggleWindowShortcut: (accelerator) => ipcRenderer.invoke('update-toggle-window-shortcut', accelerator),
  toggleGlobalShortcuts: () => ipcRenderer.invoke('toggle-global-shortcuts'),
  getGlobalShortcutsState: () => ipcRenderer.invoke('get-global-shortcuts-state'),

  // ─── IPC LISTENERS ──────────────────────────────────────────────────────
  onPlaySound: (cb) => ipcRenderer.on('play-sound', (e, id) => cb(id)),
  onSwitchProfile: (cb) => ipcRenderer.on('switch-profile', () => cb()),
  onToggleLoop: (cb) => ipcRenderer.on('toggle-loop', () => cb()),
  onStopAllSounds: (cb) => ipcRenderer.on('stop-all-sounds', () => cb()),
  onTogglePresentation: (cb) => ipcRenderer.on('toggle-presentation', () => cb()),
  onShortcutsToggle: (cb) => ipcRenderer.on('shortcuts-toggle', (e, enabled) => cb(enabled)),
  onShowQuitConfirm: (cb) => ipcRenderer.on('show-quit-confirm', () => cb()),
  onHideQuitConfirm: (cb) => ipcRenderer.on('hide-quit-confirm', () => cb()),
  onShowWindow: (cb) => ipcRenderer.on('show-window', () => cb()),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),

  // ─── TRAY ────────────────────────────────────────────────────────────────
  updateTrayLanguage: (lang) => ipcRenderer.invoke('update-tray-language', lang),
  getStartMinimized: () => ipcRenderer.invoke('get-start-minimized'),
  setStartMinimized: (value) => ipcRenderer.invoke('set-start-minimized', value),
  getLaunchAtStartup: () => ipcRenderer.invoke('get-launch-at-startup'),
  setLaunchAtStartup: (value) => ipcRenderer.invoke('set-launch-at-startup', value),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  confirmQuit: (action, remember) => ipcRenderer.invoke('confirm-quit', action, remember),

  // ─── PILOTE AUDIO ────────────────────────────────────────────────────────
  installVirtualDriver: () => ipcRenderer.invoke('install-virtual-driver'),
  uninstallVirtualDriver: () => ipcRenderer.invoke('uninstall-virtual-driver'),
  getVirtualDriverStatus: () => ipcRenderer.invoke('get-virtual-driver-status'),
  setNoiseSuppression: (enabled) => ipcRenderer.invoke('set-noise-suppression', enabled),

  // ─── YOUTUBE ─────────────────────────────────────────────────────────────
  checkYtdlp: () => ipcRenderer.invoke('check-ytdlp'),
  downloadYtdlp: () => ipcRenderer.invoke('download-ytdlp'),
  youtubeInfo: (url) => ipcRenderer.invoke('youtube-info', url),
  youtubeDownload: (url, start, end, title) => ipcRenderer.invoke('youtube-download', url, start, end, title),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ─── SPOTIFY / SOUNDCLOUD ───────────────────────────────────────────────
  spotifyTrackInfo: (trackId) => ipcRenderer.invoke('spotify-track-info', trackId),
  soundcloudTrackInfo: (url) => ipcRenderer.invoke('soundcloud-track-info', url),
  downloadPlatformTrack: (params) => ipcRenderer.invoke('download-platform-track', params),

  // ─── EXPORT / IMPORT ────────────────────────────────────────────────────
  exportProfile: (profileId) => ipcRenderer.invoke('export-profile', profileId),
  importProfile: () => ipcRenderer.invoke('import-profile'),
  exportConfig: () => ipcRenderer.invoke('export-config'),
  exportFull: () => ipcRenderer.invoke('export-full'),
  exportSoundsOnly: () => ipcRenderer.invoke('export-sounds-only'),
  importBackup: () => ipcRenderer.invoke('import-backup'),

  // ─── SYSTÈME ─────────────────────────────────────────────────────────────
  getSystemLanguage: () => ipcRenderer.invoke('get-system-language'),
  getSystemKeyboardLayout: () => ipcRenderer.invoke('get-system-keyboard-layout'),

  // ─── PLUGINS ─────────────────────────────────────────────────────────────
  getInstalledPlugins: () => ipcRenderer.invoke('get-installed-plugins'),
  getPluginPath: (pluginId) => ipcRenderer.invoke('get-plugin-path', pluginId),
  getPluginComponentPath: (pluginId, pageId) => ipcRenderer.invoke('get-plugin-component-path', pluginId, pageId),
  installPlugin: (tempPath) => ipcRenderer.invoke('install-plugin', tempPath),
  installPluginFromBuffer: (buffer, fileName) => ipcRenderer.invoke('install-plugin-from-buffer', buffer, fileName),
  installPluginFromFile: (tempPath, fileName) => ipcRenderer.invoke('install-plugin-from-file', tempPath, fileName),
  installPluginFromUrl: (tempPath, url) => ipcRenderer.invoke('install-plugin-from-url', tempPath, url),
  uninstallPlugin: (pluginId) => ipcRenderer.invoke('uninstall-plugin', pluginId),

  // ─── DIVERS ──────────────────────────────────────────────────────────────
  isElectron: true,

  // ─── ADVANDED EDITOR ────────────────────────────────────────────────────────────
  saveFileDialog: (fileName, buffer) => ipcRenderer.invoke('save-file-dialog', fileName, buffer),
  writeSoundFile: (filePath, data) => ipcRenderer.invoke('write-sound-file', filePath, data),
})

// Exposer également via window pour accès direct dans les event handlers
window.addEventListener('DOMContentLoaded', () => {
  const originalFileDescriptor = Object.getOwnPropertyDescriptor(File.prototype, 'path')
  if (!originalFileDescriptor) {
    console.warn('File.path non disponible nativement — drop limité')
  }
})