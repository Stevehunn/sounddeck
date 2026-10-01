// electron/modules/__test-helpers__.js
// Helpers de test — utilisent l'instance globale du mock electron.

function getIpcMain() {
  if (!globalThis.__electronMock?.ipcMain) {
    throw new Error(
      '[__test-helpers__] globalThis.__electronMock non défini. ' +
      'setup-electron.js doit être chargé avant les tests.'
    )
  }
  return globalThis.__electronMock.ipcMain
}

export function getIpcHandler(channel) {
  const ipcMain = getIpcMain()
  const handler = ipcMain._handlers.get(channel)
  if (!handler) {
    const registered = Array.from(ipcMain._handlers.keys())
    throw new Error(
      `Handler IPC introuvable: "${channel}"\n` +
      `Handlers enregistrés (${registered.length}): ${registered.join(', ')}`
    )
  }
  return handler
}

export function hasIpcHandler(channel) {
  return getIpcMain()._handlers.has(channel)
}

export function getRegisteredChannels() {
  return Array.from(getIpcMain()._handlers.keys())
}

export function clearIpcHandlers() {
  const ipcMain = getIpcMain()
  ipcMain._handlers.clear()
  ipcMain._listeners.clear()
}