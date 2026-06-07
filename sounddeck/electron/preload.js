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
  updateStopAllShortcut: (acc) => ipcRenderer.invoke('update-stop-all-shortcut', acc),
  updatePresentationShortcut: (acc) => ipcRenderer.invoke('update-presentation-shortcut', acc),
  onPlaySound: (cb) => ipcRenderer.on('play-sound', (e, id) => cb(id)),
  onSwitchProfile: (cb) => ipcRenderer.on('switch-profile', () => cb()),
  onToggleLoop: (cb) => ipcRenderer.on('toggle-loop', () => cb()),
  onStopAllSounds: (cb) => ipcRenderer.on('stop-all-sounds', () => cb()),
  onTogglePresentation: (cb) => ipcRenderer.on('toggle-presentation', () => cb()),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),

  // Expose process.versions pour détecter Electron dans le renderer
  isElectron: true,

  writeDroppedFile: (fileName, arrayBuffer) => ipcRenderer.invoke('write-dropped-file', fileName, arrayBuffer),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  exportConfig: () => ipcRenderer.invoke('export-config'),
  exportFull: () => ipcRenderer.invoke('export-full'),
  exportSoundsOnly: () => ipcRenderer.invoke('export-sounds-only'),
  importBackup: () => ipcRenderer.invoke('import-backup')
})

// Exposer également via window pour accès direct dans les event handlers
window.addEventListener('DOMContentLoaded', () => {
  // Patch global pour s'assurer que file.path est accessible
  // Electron injecte nativement cette propriété sur les objets File
  // Ce patch n'est là qu'en sécurité
  const originalFileDescriptor = Object.getOwnPropertyDescriptor(File.prototype, 'path')
  if (!originalFileDescriptor) {
    console.warn('File.path non disponible nativement — drop limité')
  }
})