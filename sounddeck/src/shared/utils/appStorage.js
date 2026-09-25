// src/shared/utils/appStorage.js
import { logWarn, logInfo } from './logger'

const PREFIX = 'appStorage.'
const MIGRATION_FLAG = 'sounddeck_appStorage_migrated'

let migrationDone = false

async function readStore(key) {
  try {
    return await window.electronAPI?.storeGet?.(PREFIX + key)
  } catch (e) {
    logWarn('appStorage', `read error for ${key}`, e)
    return undefined
  }
}

async function writeStore(key, value) {
  try {
    await window.electronAPI?.storeSet?.(PREFIX + key, value)
  } catch (e) {
    logWarn('appStorage', `write error for ${key}`, e)
  }
}

async function deleteStore(key) {
  try {
    await window.electronAPI?.storeDelete?.(PREFIX + key)
  } catch (e) {
    logWarn('appStorage', `delete error for ${key}`, e)
  }
}

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
      } catch (e) {
        // silencieux
      }
    }

    await window.electronAPI?.storeSet?.(MIGRATION_FLAG, true)
    if (migratedCount > 0) {
      logInfo('appStorage', `✅ Migré ${migratedCount} clé(s) localStorage`)
    }
  } catch (e) {
    logWarn('appStorage', 'migration error', e)
  }
}

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
  } catch (e) {
    // silencieux
  }

  return null
}

export async function setItem(key, value) {
  await migrateOnce()

  let toStore = value
  if (typeof value === 'object' && value !== null) {
    try {
      toStore = JSON.stringify(value)
    } catch (e) {
      toStore = String(value)
    }
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    toStore = String(value)
  }

  await writeStore(key, toStore)
}

export async function removeItem(key) {
  await migrateOnce()
  await deleteStore(key)
  try {
    localStorage.removeItem(key)
  } catch (e) {
    // silencieux
  }
}

export async function getBoolean(key, defaultValue = false) {
  const raw = await getItem(key)
  if (raw === null || raw === undefined) return defaultValue
  if (typeof raw === 'boolean') return raw
  return String(raw) === 'true'
}

export async function getNumber(key, defaultValue = 0) {
  const raw = await getItem(key)
  if (raw === null || raw === undefined) return defaultValue
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

export default { getItem, setItem, removeItem, getBoolean, getNumber }