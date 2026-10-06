// electron/preload-popup.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('soundPopupAPI', {
  onUpdate: (cb) => {
    const listener = (_e, data) => cb(data)
    ipcRenderer.on('sound-popup:update', listener)
    return () => ipcRenderer.removeListener('sound-popup:update', listener)
  },
  sendAction: (action) => ipcRenderer.send('sound-popup:action', action),
  requestHide: () => ipcRenderer.send('sound-popup:request-hide'),
  sendReady: () => ipcRenderer.send('sound-popup:ready'),
  setHover: (hovering) => ipcRenderer.send('sound-popup:hover', !!hovering),
})