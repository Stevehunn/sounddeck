// src/core/services/EmojiService.js

import {
  DEFAULT_EMOJIS,
  EMOJI_CATEGORIES,
  getDefaultEmojiCategory,
  isValidEmoji,
} from '@shared/constants/emojis'
import { logWarn } from '@shared/utils/logger'

const STORE_KEY_EMOJIS = 'customEmojis'
const STORE_KEY_METADATA = 'emojiMetadata'

class EmojiService {
  constructor() {
    this.customEmojis = []       // ['🦄', '🦊', '⭐']
    this.metadata = {}            // { '🦄': { category: 'animals', addedAt: 123 }, ... }
    this.listeners = new Set()
    this.loaded = false
    this.loadingPromise = null
  }

  // ─── CHARGEMENT ─────────────────────────────────────────────────────────

  async load() {
    if (this.loaded) return
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = (async () => {
      try {
        const emojis = await this._readStore(STORE_KEY_EMOJIS, [])
        const metadata = await this._readStore(STORE_KEY_METADATA, {})

        this.customEmojis = Array.isArray(emojis) ? emojis : []
        this.metadata = metadata && typeof metadata === 'object' ? metadata : {}
        this.loaded = true
        this._notify()
      } catch (e) {
        logWarn('EmojiService', 'Erreur load', e)
        this.loaded = true
      } finally {
        this.loadingPromise = null
      }
    })()

    return this.loadingPromise
  }

  // ─── PERSISTANCE ────────────────────────────────────────────────────────

  async _readStore(key, fallback) {
    try {
      if (window.electronAPI?.storeGet) {
        const value = await window.electronAPI.storeGet(key)
        return value ?? fallback
      }
      // Fallback dev web
      const raw = localStorage.getItem(`sounddeck-${key}`)
      return raw ? JSON.parse(raw) : fallback
    } catch (e) {
      return fallback
    }
  }

  async _writeStore(key, value) {
    try {
      if (window.electronAPI?.storeSet) {
        await window.electronAPI.storeSet(key, value)
      } else {
        localStorage.setItem(`sounddeck-${key}`, JSON.stringify(value))
      }
    } catch (e) {
      logWarn('EmojiService', `Erreur write ${key}`, e)
    }
  }

  async _persist() {
    await this._writeStore(STORE_KEY_EMOJIS, this.customEmojis)
    await this._writeStore(STORE_KEY_METADATA, this.metadata)
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────────

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  _notify() {
    for (const listener of this.listeners) {
      try { listener() } catch (e) { logWarn('EmojiService', 'Erreur listener', e) }
    }
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────────

  /**
   * Ajoute un emoji.
   * @param {string} emoji
   * @param {string|null} categoryId - Catégorie d'origine (optionnel)
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addEmoji(emoji, categoryId = null) {
    await this.load()

    const trimmed = String(emoji).trim()
    if (!trimmed) return { success: false, error: 'Emoji vide' }
    if (!isValidEmoji(trimmed)) return { success: false, error: 'Ce n\'est pas un emoji valide' }

    // Déjà dans les défauts ?
    const defaultCat = getDefaultEmojiCategory(trimmed)
    if (defaultCat) return { success: false, error: 'Cet emoji est déjà disponible par défaut' }

    // Déjà dans les customs ?
    if (this.customEmojis.includes(trimmed)) {
      return { success: false, error: 'Cet emoji est déjà dans votre bibliothèque' }
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
   * Ajoute une catégorie entière d'un coup.
   * @param {string} categoryId
   * @param {string[]} emojis
   * @returns {Promise<{ success: boolean, added: number, skipped: number }>}
   */
  async addCategory(categoryId, emojis) {
    await this.load()

    let added = 0
    let skipped = 0
    const nextEmojis = [...this.customEmojis]
    const nextMetadata = { ...this.metadata }

    for (const raw of emojis) {
      const emoji = String(raw).trim()
      if (!emoji || !isValidEmoji(emoji)) { skipped++; continue }
      if (getDefaultEmojiCategory(emoji)) { skipped++; continue }
      if (nextEmojis.includes(emoji)) { skipped++; continue }

      nextEmojis.push(emoji)
      nextMetadata[emoji] = { category: categoryId || null, addedAt: Date.now() }
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
   * Retire un emoji custom.
   */
  async removeEmoji(emoji) {
    await this.load()

    const trimmed = String(emoji).trim()
    if (!this.customEmojis.includes(trimmed)) {
      return { success: false, error: 'Emoji non trouvé' }
    }

    this.customEmojis = this.customEmojis.filter(e => e !== trimmed)
    const nextMetadata = { ...this.metadata }
    delete nextMetadata[trimmed]
    this.metadata = nextMetadata

    await this._persist()
    this._notify()
    return { success: true }
  }

  /**
   * Retire une catégorie entière (tous les emojis ajoutés depuis cette catégorie).
   */
  async removeCategory(categoryId) {
    await this.load()

    const toRemove = this.customEmojis.filter(
      e => this.metadata[e]?.category === categoryId
    )
    if (toRemove.length === 0) return { success: false, removed: 0 }

    const removeSet = new Set(toRemove)
    this.customEmojis = this.customEmojis.filter(e => !removeSet.has(e))

    const nextMetadata = { ...this.metadata }
    for (const e of toRemove) delete nextMetadata[e]
    this.metadata = nextMetadata

    await this._persist()
    this._notify()
    return { success: true, removed: toRemove.length }
  }

  // ─── GETTERS ────────────────────────────────────────────────────────────

  getCustomEmojis() {
    return [...this.customEmojis]
  }

  getAllEmojis() {
    // Défauts + customs, dédupliqué
    const set = new Set([...DEFAULT_EMOJIS, ...this.customEmojis])
    return Array.from(set)
  }

  /**
   * Retourne les customs groupés par catégorie.
   * Format : { [categoryId]: string[], __uncategorized__: string[] }
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

  hasEmoji(emoji) {
    const trimmed = String(emoji).trim()
    return DEFAULT_EMOJIS.includes(trimmed) || this.customEmojis.includes(trimmed)
  }

  isCustom(emoji) {
    return this.customEmojis.includes(String(emoji).trim())
  }

  /**
   * Vérifie si TOUS les emojis d'une catégorie donnée sont déjà possédés.
   */
  hasCategory(categoryId, emojis) {
    if (!emojis || emojis.length === 0) return false
    return emojis.every(e => this.hasEmoji(e))
  }

  getMetadata(emoji) {
    return this.metadata[String(emoji).trim()] || null
  }
}

export const emojiService = new EmojiService()
export default emojiService