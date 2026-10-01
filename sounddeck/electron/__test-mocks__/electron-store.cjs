// electron/__test-mocks__/electron-store.cjs
// Pas besoin de vitest ici.

const globalStoreData = new Map()

class MockStore {
  constructor() {
    this._data = globalStoreData
  }
  get(key, defaultValue) {
    if (key === undefined) return Object.fromEntries(globalStoreData)
    return globalStoreData.has(key) ? globalStoreData.get(key) : defaultValue
  }
  set(key, value) {
    globalStoreData.set(key, value)
  }
  delete(key) {
    globalStoreData.delete(key)
  }
  has(key) {
    return globalStoreData.has(key)
  }
  clear() {
    globalStoreData.clear()
  }
}

module.exports = MockStore
module.exports.default = MockStore
module.exports.__esModule = true
module.exports.MockStore = MockStore
module.exports.__test = { globalStoreData }