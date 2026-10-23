/**
 * @file Emoji service — persistence + custom emoji collection.
 *
 * Owns the list of user-added custom emojis and their metadata (category,
 * add date). Listens to changes and notifies subscribers so React hooks
 * (see `@shared/hooks/useEmojis.js`) can re-render.
 *
 * All custom emojis are stored in electron-store under two keys:
 * - `customEmojis` — string[] of emoji characters
 * - `emojiMetadata` — `{ [emoji]: { category, addedAt } }`
 *
 * Error messages returned to the UI are translated via `translate()`
 * (FR/EN/ES) so they display in the user's language.
 *
 * @see @shared/constants/emojis.js — the default catalog
 * @see @shared/hooks/useEmojis.js — reactive wrapper
 * @see @shared/utils/translator.js
 */

import {
  DEFAULT_EMOJIS,
  getDefaultEmojiCategory,
  isValidEmoji,
} from '@shared/constants/emojis'
import { logWarn } from '@shared/utils/logger'
import { translate } from '@shared/utils/translator'

const STORE_KEY_EMOJIS = 'customEmojis'
const STORE_KEY_METADATA = 'emojiMetadata'

class EmojiService {
  constructor() {
    this.customEmojis = [] // ['🦄', '🦊', '⭐']
    this.metadata = {} // { '🦄': { category: 'animals', addedAt: 123 }, ... }
    this.listeners = new Set()
    this.loaded = false
    this.loadingPromise = null
  }

  // ─── LOADING ────────────────────────────────────────────────────────

  /**
   * Loads custom emojis from the store (idempotent, async).
   * @returns {Promise<void>}
   */
  async load() {
    if (this.loaded) return
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = (async () => {
      try {
        const emojis = await this._readStore(STORE_KEY_EMOJIS, [])
        const metadata = await this._readStore(STORE_KEY_METADATA, {})

        this.customEmojis = Array.isArray(emojis) ? emojis : []
        this.metadata =
          metadata && typeof metadata === 'object' ? metadata : {}
        this.loaded = true
        this._notify()
      } catch (e) {
        logWarn('EmojiService', 'Load error', e)
        this.loaded = true
      } finally {
        this.loadingPromise = null
      }
    })()

    return this.loadingPromise
  }

  // ─── PERSISTENCE ────────────────────────────────────────────────────

  /**
   * Reads a key from electron-store (falls back to localStorage in web dev).
   *
   * @param {string} key
   * @param {any} fallback
   * @returns {Promise<any>}
   */
  async _readStore(key, fallback) {
    try {
      if (window.electronAPI?.storeGet) {
        const value = await window.electronAPI.storeGet(key)
        return value ?? fallback
      }
      const raw = localStorage.getItem(`sounddeck-${key}`)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  }

  /**
   * Writes a key to electron-store (falls back to localStorage in web dev).
   *
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async _writeStore(key, value) {
    try {
      if (window.electronAPI?.storeSet) {
        await window.electronAPI.storeSet(key, value)
      } else {
        localStorage.setItem(`sounddeck-${key}`, JSON.stringify(value))
      }
    } catch (e) {
      logWarn('EmojiService', `Write error ${key}`, e)
    }
  }

  /**
   * Persists both custom emojis and metadata.
   * @returns {Promise<void>}
   */
  async _persist() {
    await this._writeStore(STORE_KEY_EMOJIS, this.customEmojis)
    await this._writeStore(STORE_KEY_METADATA, this.metadata)
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────

  /**
   * Subscribes to service changes.
   * @param {() => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notifies all listeners. Errors in one listener don't block others.
   * @returns {void}
   */
  _notify() {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (e) {
        logWarn('EmojiService', 'Listener error', e)
      }
    }
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────

  /**
   * Adds a custom emoji.
   *
   * @param {string} emoji
   * @param {string|null} [categoryId=null] - Source category (optional).
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async addEmoji(emoji, categoryId = null) {
    await this.load()

    const trimmed = String(emoji).trim()
    if (!trimmed) {
      return { success: false, error: translate('emojiEmptyInput') }
    }
    if (!isValidEmoji(trimmed)) {
      return { success: false, error: translate('emojiInvalidInput') }
    }

    // Already a default emoji?
    const defaultCat = getDefaultEmojiCategory(trimmed)
    if (defaultCat) {
      return {
        success: false,
        error: translate('emojiAlreadyDefault'),
      }
    }

    // Already a custom emoji?
    if (this.customEmojis.includes(trimmed)) {
      return {
        success: false,
        error: translate('emojiAlreadyCustom'),
      }
    }

    this.customEmojis = [...this.customEmojis, trimmed]
    this.metadata = {
      ...this.metadata,
      [trimmed]: { category: categoryId || null, addedAt: Date.now() },
    }
    await this._persist()
    this._notify()
    return { success: true }
  }

  /**
   * Adds an entire category of emojis in one call.
   *
   * @param {string} categoryId
   * @param {string[]} emojis
   * @returns {Promise<{success: boolean, added: number, skipped: number}>}
   */
  async addCategory(categoryId, emojis) {
    await this.load()

    let added = 0
    let skipped = 0
    const nextEmojis = [...this.customEmojis]
    const nextMetadata = { ...this.metadata }

    for (const raw of emojis) {
      const emoji = String(raw).trim()
      if (!emoji || !isValidEmoji(emoji)) {
        skipped++
        continue
      }
      if (getDefaultEmojiCategory(emoji)) {
        skipped++
        continue
      }
      if (nextEmojis.includes(emoji)) {
        skipped++
        continue
      }

      nextEmojis.push(emoji)
      nextMetadata[emoji] = {
        category: categoryId || null,
        addedAt: Date.now(),
      }
      added++
    }

    if (added === 0) return { success: false, added: 0, skipped }

    this.customEmojis = nextEmojis
    this.metadata = nextMetadata
    await this._persist()
    this._notify()
    return { success: true, added, skipped }
  }

  /**
   * Removes a single custom emoji.
   * @param {string} emoji
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeEmoji(emoji) {
    await this.load()

    const trimmed = String(emoji).trim()
    if (!this.customEmojis.includes(trimmed)) {
      return { success: false, error: translate('emojiNotFound') }
    }

    this.customEmojis = this.customEmojis.filter((e) => e !== trimmed)
    const nextMetadata = { ...this.metadata }
    delete nextMetadata[trimmed]
    this.metadata = nextMetadata

    await this._persist()
    this._notify()
    return { success: true }
  }

  /**
   * Removes every emoji added from the given category.
   * @param {string} categoryId
   * @returns {Promise<{success: boolean, removed: number}>}
   */
  async removeCategory(categoryId) {
    await this.load()

    const toRemove = this.customEmojis.filter(
      (e) => this.metadata[e]?.category === categoryId
    )
    if (toRemove.length === 0) return { success: false, removed: 0 }

    const removeSet = new Set(toRemove)
    this.customEmojis = this.customEmojis.filter((e) => !removeSet.has(e))

    const nextMetadata = { ...this.metadata }
    for (const e of toRemove) delete nextMetadata[e]
    this.metadata = nextMetadata

    await this._persist()
    this._notify()
    return { success: true, removed: toRemove.length }
  }

  // ─── GETTERS ────────────────────────────────────────────────────────

  /**
   * Returns a shallow copy of the custom emojis array.
   * @returns {string[]}
   */
  getCustomEmojis() {
    return [...this.customEmojis]
  }

  /**
   * Returns every emoji (defaults + custom), deduped.
   * @returns {string[]}
   */
  getAllEmojis() {
    const set = new Set([...DEFAULT_EMOJIS, ...this.customEmojis])
    return Array.from(set)
  }

  /**
   * Returns the custom emojis grouped by category.
   *
   * Format: `{ [categoryId]: string[], __uncategorized__: string[] }`.
   *
   * @returns {Record<string, string[]>}
   */
  getCustomGrouped() {
    const groups = {}
    for (const emoji of this.customEmojis) {
      const cat = this.metadata[emoji]?.category || '__uncategorized__'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(emoji)
    }
    return groups
  }

  /**
   * Returns `true` if the given emoji exists (default OR custom).
   * @param {string} emoji
   * @returns {boolean}
   */
  hasEmoji(emoji) {
    const trimmed = String(emoji).trim()
    return (
      DEFAULT_EMOJIS.includes(trimmed) || this.customEmojis.includes(trimmed)
    )
  }

  /**
   * Returns `true` if the given emoji was added by the user.
   * @param {string} emoji
   * @returns {boolean}
   */
  isCustom(emoji) {
    return this.customEmojis.includes(String(emoji).trim())
  }

  /**
   * Returns `true` if every emoji from the given list is already owned.
   * @param {string} categoryId
   * @param {string[]} emojis
   * @returns {boolean}
   */
  hasCategory(categoryId, emojis) {
    if (!emojis || emojis.length === 0) return false
    return emojis.every((e) => this.hasEmoji(e))
  }

  /**
   * Returns the metadata for a custom emoji, or `null`.
   * @param {string} emoji
   * @returns {{category: string|null, addedAt: number}|null}
   */
  getMetadata(emoji) {
    return this.metadata[String(emoji).trim()] || null
  }
}

export const emojiService = new EmojiService()
export default emojiService