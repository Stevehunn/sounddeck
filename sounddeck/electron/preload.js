const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  importSoundFile: (filePath) => ipcRenderer.invoke('import-sound-file', filePath),
  importImageFile: (filePath) => ipcRenderer.invoke('import-image-file', filePath),
  downloadSoundUrl: (url, fileName) => ipcRenderer.invoke('download-sound-url', url, fileName),
  deleteSoundFile: (filePath) => ipcRenderer.invoke('delete-sound-file', filePath),
  getSoundsDir: () => ipcRenderer.invoke('get-sounds-dir'),
  fetchMyinstants: (query) => ipcRenderer.invoke('fetch-myinstants', query),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  updateProfileShortcut: (accelerator) => ipcRenderer.invoke('update-profile-shortcut', accelerator),
  onPlaySound: (callback) => ipcRenderer.on('play-sound', (event, soundId) => callback(soundId)),
  onSwitchProfile: (callback) => ipcRenderer.on('switch-profile', () => callback()),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})