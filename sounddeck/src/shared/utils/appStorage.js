/**
 * @file Async storage wrapper backed by `electron-store`.
 *
 * Provides the same API as `localStorage` (`getItem` / `setItem` /
 * `removeItem`) but everything goes through IPC (`electronAPI.storeGet` /
 * `storeSet` / `storeDelete`). This makes the data persistent across
 * reinstallations of the renderer bundle and shared between windows.
 *
 * A one-time migration moves legacy `localStorage` keys (prefixed with
 * `sounddeck`, plus `autoTheme` and `myinstants_selected_categories`)
 * into the electron-store, then removes them from `localStorage`.
 *
 * Typed helpers `getBoolean` / `getNumber` handle the string coercion that
 * electron-store applies to primitive values.
 *
 * @see electron/store.js
 * @see electron/preload.js (`storeGet`, `storeSet`, `storeDelete`)
 */

import { logWarn, logInfo } from './logger'

const PREFIX = 'appStorage.'
const MIGRATION_FLAG = 'sounddeck_appStorage_migrated'

let migrationDone = false

/**
 * Reads a value from the electron-store (prefixed key).
 *
 * @param {string} key
 * @returns {Promise<any>} The stored value, or `undefined` on error.
 */
async function readStore(key) {
  try {
    return await window.electronAPI?.storeGet?.(PREFIX + key)
  } catch (e) {
    logWarn('appStorage', `read error for ${key}`, e)
    return undefined
  }
}

/**
 * Writes a value to the electron-store (prefixed key).
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
async function writeStore(key, value) {
  try {
    await window.electronAPI?.storeSet?.(PREFIX + key, value)
  } catch (e) {
    logWarn('appStorage', `write error for ${key}`, e)
  }
}

/**
 * Deletes a key from the electron-store (prefixed key).
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function deleteStore(key) {
  try {
    await window.electronAPI?.storeDelete?.(PREFIX + key)
  } catch (e) {
    logWarn('appStorage', `delete error for ${key}`, e)
  }
}

/**
 * One-time migration of legacy `localStorage` keys into electron-store.
 *
 * Runs at most once per app session (guarded by `migrationDone` and the
 * `MIGRATION_FLAG` store entry). Silently swallows per-key errors so a
 * single bad value can't block the whole migration.
 *
 * @returns {Promise<void>}
 */
async function migrateOnce() {
  if (migrationDone) return
  migrationDone = true

  try {
    const flag = await window.electronAPI?.storeGet?.(MIGRATION_FLAG)
    if (flag === true) return

    const keysToMigrate = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (
        key.startsWith('sounddeck') ||
        key === 'autoTheme' ||
        key === 'myinstants_selected_categories'
      ) {
        keysToMigrate.push(key)
      }
    }

    let migratedCount = 0
    for (const key of keysToMigrate) {
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) continue

        await window.electronAPI?.storeSet?.(PREFIX + key, raw)
        localStorage.removeItem(key)
        migratedCount++
      } catch {
        // Silently skip a single bad key; other keys still migrate.
      }
    }

    await window.electronAPI?.storeSet?.(MIGRATION_FLAG, true)
    if (migratedCount > 0) {
      logInfo('appStorage', `✅ Migrated ${migratedCount} localStorage key(s)`)
    }
  } catch (e) {
    logWarn('appStorage', 'migration error', e)
  }
}

/**
 * Reads a value from the persistent store.
 *
 * @param {string} key
 * @returns {Promise<string|null>} The stored value, or `null` if not found.
 */
export async function getItem(key) {
  await migrateOnce()

  const value = await readStore(key)
  if (value !== undefined && value !== null) {
    return value
  }

  try {
    const legacy = localStorage.getItem(key)
    if (legacy !== null) {
      await writeStore(key, legacy)
      localStorage.removeItem(key)
      return legacy
    }
  } catch {
    // ignore
  }

  return null
}

/**
 * Writes a value to the persistent store.
 *
 * Objects are JSON-stringified (electron-store expects primitives for
 * `set`); numbers/booleans are stringified for consistency with legacy
 * `localStorage` semantics.
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  await migrateOnce()

  let toStore = value
  if (typeof value === 'object' && value !== null) {
    try {
      toStore = JSON.stringify(value)
    } catch {
      toStore = String(value)
    }
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    toStore = String(value)
  }

  await writeStore(key, toStore)
}

/**
 * Removes a value from the persistent store (and from `localStorage`).
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
  await migrateOnce()
  await deleteStore(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Reads a boolean from the persistent store.
 *
 * @param {string} key
 * @param {boolean} [defaultValue=false] - Returned when the key is missing.
 * @returns {Promise<boolean>}
 */
export async function getBoolean(key, defaultValue = false) {
  const raw = await getItem(key)
  if (raw === null || raw === undefined) return defaultValue
  if (typeof raw === 'boolean') return raw
  return String(raw) === 'true'
}

/**
 * Reads a number from the persistent store.
 *
 * @param {string} key
 * @param {number} [defaultValue=0] - Returned when the key is missing or not a number.
 * @returns {Promise<number>}
 */
export async function getNumber(key, defaultValue = 0) {
  const raw = await getItem(key)
  if (raw === null || raw === undefined) return defaultValue
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

export default { getItem, setItem, removeItem, getBoolean, getNumber }