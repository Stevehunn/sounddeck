// electron/modules/index.js
const storeHandlers = require('./storeHandlers')
const windowManager = require('./windowManager')
const trayManager = require('./trayManager')
const shortcutManager = require('./shortcutManager')
const ipcHandlers = require('./ipcHandlers')
const fileHandlers = require('./fileHandlers')
const diagnostic = require('./diagnostic')

console.log('🔧 Chargement des modules...')
console.log(`  - storeHandlers: ${typeof storeHandlers}`)
console.log(`  - storeHandlers.registerStoreHandlers: ${typeof storeHandlers.registerStoreHandlers}`)
console.log(`  - windowManager: ${typeof windowManager}`)
console.log(`  - trayManager: ${typeof trayManager}`)
console.log(`  - shortcutManager: ${typeof shortcutManager}`)
console.log(`  - ipcHandlers: ${typeof ipcHandlers}`)
console.log(`  - fileHandlers: ${typeof fileHandlers}`)
console.log(`  - diagnostic: ${typeof diagnostic}`)

module.exports = {
  storeHandlers,
  windowManager,
  trayManager,
  shortcutManager,
  ipcHandlers,
  fileHandlers,
  diagnostic,
}