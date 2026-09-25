// src/core/plugins/PluginManager/disabledPlugins.js
import { logWarn } from '@shared/utils/logger'
import {
  STORE_KEY_DISABLED,
  STORE_KEY_DISABLED_META,
} from './constants'

/**
 * Gestion des plugins désactivés (persistance electron-store).
 */
export class DisabledPluginsManager {
  constructor() {
    this.set = new Set()
    this.meta = {}
    this.loaded = false
  }

  async ensureLoaded() {
    if (this.loaded) return
    this.loaded = true

    try {
      const rawList = await window.electronAPI?.storeGet?.(STORE_KEY_DISABLED)
      if (Array.isArray(rawList)) {
        this.set = new Set(rawList)
      }
      const rawMeta = await window.electronAPI?.storeGet?.(
        STORE_KEY_DISABLED_META
      )
      if (rawMeta && typeof rawMeta === 'object') {
        this.meta = { ...rawMeta }
      }
    } catch (e) {
      logWarn('PluginManager', 'Erreur chargement disabled plugins', e)
    }
  }

  async save() {
    try {
      await window.electronAPI?.storeSet?.(
        STORE_KEY_DISABLED,
        Array.from(this.set)
      )
      await window.electronAPI?.storeSet?.(STORE_KEY_DISABLED_META, this.meta)
    } catch (e) {
      logWarn('PluginManager', 'Erreur save disabled plugins', e)
    }
  }

  has(pluginId) {
    return this.set.has(pluginId)
  }

  list() {
    return Object.values(this.meta || {})
  }

  async add(pluginId, plugin) {
    await this.ensureLoaded()
    this.set.add(pluginId)

    this.meta[pluginId] = {
      id: pluginId,
      name: plugin.name || pluginId,
      nameKey: plugin.nameKey || null,
      version: plugin.version || '1.0.0',
      author: plugin.author || 'Inconnu',
      isIntegrated: !!plugin.isIntegrated,
      disabledAt: Date.now(),
    }

    await this.save()
  }

  async remove(pluginId) {
    await this.ensureLoaded()
    this.set.delete(pluginId)
    delete this.meta[pluginId]
    await this.save()
  }
}

export default DisabledPluginsManager