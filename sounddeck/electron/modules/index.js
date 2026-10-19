/**
 * @file Barrel file for Electron main-process modules.
 *
 * This file re-exports every module so `main.js` can import them all from
 * a single `require('./modules')`. Keeping the list centralized makes it
 * easy to see what's available in the main process at a glance.
 *
 * @see ../main.js (consumer)
 */

const storeHandlers = require("./storeHandlers");
const windowManager = require("./windowManager");
const trayManager = require("./trayManager");
const shortcutManager = require("./shortcutManager");
const ipcHandlers = require("./ipcHandlers");
const fileHandlers = require("./fileHandlers");
const diagnostic = require("./diagnostic");
const protocolHandler = require("./protocolHandler");
const { registerProjectHandlers } = require("./projectHandlers");

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
};
