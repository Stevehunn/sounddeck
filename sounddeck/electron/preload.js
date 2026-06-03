const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Fichiers ───────────────────────────────────────────────────────────────
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  importSoundFile: (filePath) => ipcRenderer.invoke('import-sound-file', filePath),
  downloadSoundUrl: (url, fileName) => ipcRenderer.invoke('download-sound-url', url, fileName),
  deleteSoundFile: (filePath) => ipcRenderer.invoke('delete-sound-file', filePath),
  getSoundsDir: () => ipcRenderer.invoke('get-sounds-dir'),

  // ─── Store ──────────────────────────────────────────────────────────────────
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),

  // ─── Raccourcis ─────────────────────────────────────────────────────────────
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  updateProfileShortcut: (accelerator) => ipcRenderer.invoke('update-profile-shortcut', accelerator),

  // ─── Événements reçus depuis main ───────────────────────────────────────────
  onPlaySound: (callback) => ipcRenderer.on('play-sound', (event, soundId) => callback(soundId)),
  onSwitchProfile: (callback) => ipcRenderer.on('switch-profile', () => callback()),

  // ─── Nettoyage des listeners ────────────────────────────────────────────────
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})