/**
 * @file Disabled plugins persistence.
 *
 * Tracks plugins the user has explicitly disabled. Two store keys:
 * - `disabledPlugins` — array of plugin IDs
 * - `disabledPluginsMeta` — `{ [pluginId]: { id, name, version, … } }`
 *
 * The default author label ("Unknown") is user-facing (shown in the
 * plugin list) and is translated via `translate()`.
 *
 * @see ./constants.js (`STORE_KEY_DISABLED`, `STORE_KEY_DISABLED_META`)
 * @see @shared/utils/translator.js
 */

import { logWarn } from '@shared/utils/logger'
import { translate } from '@shared/utils/translator'
import {
  STORE_KEY_DISABLED,
  STORE_KEY_DISABLED_META,
} from './constants'

export class DisabledPluginsManager {
  constructor() {
    this.set = new Set()
    this.meta = {}
    this.loaded = false
  }

  /**
   * Loads the disabled plugin list from the store (lazy, once).
   * @returns {Promise<void>}
   */
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
      logWarn('PluginManager', 'Load disabled plugins error', e)
    }
  }

  /**
   * Persists the current disabled list + metadata.
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await window.electronAPI?.storeSet?.(
        STORE_KEY_DISABLED,
        Array.from(this.set)
      )
      await window.electronAPI?.storeSet?.(STORE_KEY_DISABLED_META, this.meta)
    } catch (e) {
      logWarn('PluginManager', 'Save disabled plugins error', e)
    }
  }

  /**
   * Returns `true` if the given plugin is disabled.
   * @param {string} pluginId
   * @returns {boolean}
   */
  has(pluginId) {
    return this.set.has(pluginId)
  }

  /**
   * Returns the full list of disabled plugins (with metadata).
   * @returns {Array<Object>}
   */
  list() {
    return Object.values(this.meta || {})
  }

  /**
   * Marks a plugin as disabled.
   * @param {string} pluginId
   * @param {Object} plugin - Plugin object (for metadata).
   * @returns {Promise<void>}
   */
  async add(pluginId, plugin) {
    await this.ensureLoaded()
    this.set.add(pluginId)

    this.meta[pluginId] = {
      id: pluginId,
      name: plugin.name || pluginId,
      nameKey: plugin.nameKey || null,
      version: plugin.version || '1.0.0',
      author: plugin.author || translate('pluginAuthorUnknown'),
      isIntegrated: !!plugin.isIntegrated,
      disabledAt: Date.now(),
    }

    await this.save()
  }

  /**
   * Removes a plugin from the disabled list.
   * @param {string} pluginId
   * @returns {Promise<void>}
   */
  async remove(pluginId) {
    await this.ensureLoaded()
    this.set.delete(pluginId)
    delete this.meta[pluginId]
    await this.save()
  }
}

export default DisabledPluginsManager