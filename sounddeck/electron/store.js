// electron/store.js
// ✅ Instance UNIQUE de electron-store partagée par tous les modules.

const Store = require('electron-store')

const store = new Store()

module.exports = store