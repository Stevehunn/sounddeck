const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  importSoundFile: (filePath) => ipcRenderer.invoke('import-sound-file', filePath),
  importImageFile: (filePath) => ipcRenderer.invoke('import-image-file', filePath),
  downloadSoundUrl: (url, fileName) => ipcRenderer.invoke('download-sound-url', url, fileName),
  trimSoundFile: (filePath, start, end) => ipcRenderer.invoke('trim-sound-file', filePath, start, end),
  deleteSoundFile: (filePath) => ipcRenderer.invoke('delete-sound-file', filePath),
  getSoundsDir: () => ipcRenderer.invoke('get-sounds-dir'),
  fetchMyinstants: (query) => ipcRenderer.invoke('fetch-myinstants', query),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  updateProfileShortcut: (acc) => ipcRenderer.invoke('update-profile-shortcut', acc),
  updateLoopShortcut: (acc) => ipcRenderer.invoke('update-loop-shortcut', acc),
  onPlaySound: (cb) => ipcRenderer.on('play-sound', (e, id) => cb(id)),
  onSwitchProfile: (cb) => ipcRenderer.on('switch-profile', () => cb()),
  onToggleLoop: (cb) => ipcRenderer.on('toggle-loop', () => cb()),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch)
})