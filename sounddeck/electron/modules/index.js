// electron/modules/index.js
const storeHandlers = require('./storeHandlers')
const windowManager = require('./windowManager')
const trayManager = require('./trayManager')
const shortcutManager = require('./shortcutManager')
const ipcHandlers = require('./ipcHandlers')
const fileHandlers = require('./fileHandlers')
const diagnostic = require('./diagnostic')
const protocolHandler = require('./protocolHandler')
const { registerProjectHandlers } = require('./projectHandlers')

module.exports = {
  storeHandlers,
  windowManager,
  trayManager,
  shortcutManager,
  ipcHandlers,
  fileHandlers,
  diagnostic,
  protocolHandler,
  registerProjectHandlers,
}