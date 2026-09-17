// src/shared/hooks/useEmojis.jsx
import { useState, useEffect, useCallback } from 'react'
import { emojiService } from '@core/services/EmojiService'
import {
  DEFAULT_EMOJIS,
  EMOJI_CATEGORIES,
  getDefaultEmojiCategory,
} from '@shared/constants/emojis'

export function useEmojis() {
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(!emojiService.loaded)

  // Charge initialement + s'abonne aux changements
  useEffect(() => {
    let mounted = true

    if (!emojiService.loaded) {
      emojiService.load().then(() => {
        if (mounted) setLoading(false)
      })
    } else {
      setLoading(false)
    }

    const unsubscribe = emojiService.subscribe(() => {
      if (mounted) setVersion(v => v + 1)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // ─── DONNÉES DÉRIVÉES ───────────────────────────────────────────────────
  // Note : on utilise `version` pour forcer le recalcul à chaque notify

  const customEmojis = emojiService.getCustomEmojis()
  const customGrouped = emojiService.getCustomGrouped()
  const allEmojis = emojiService.getAllEmojis()

  // ─── ACTIONS (stables) ──────────────────────────────────────────────────

  const addEmoji = useCallback((emoji, categoryId = null) => {
    return emojiService.addEmoji(emoji, categoryId)
  }, [])

  const addCategory = useCallback((categoryId, emojis) => {
    return emojiService.addCategory(categoryId, emojis)
  }, [])

  const removeEmoji = useCallback((emoji) => {
    return emojiService.removeEmoji(emoji)
  }, [])

  const removeCategory = useCallback((categoryId) => {
    return emojiService.removeCategory(categoryId)
  }, [])

  const hasEmoji = useCallback((emoji) => {
    return emojiService.hasEmoji(emoji)
  }, [])

  const isCustom = useCallback((emoji) => {
    return emojiService.isCustom(emoji)
  }, [])

  const hasCategory = useCallback((categoryId, emojis) => {
    return emojiService.hasCategory(categoryId, emojis)
  }, [])

  const getMetadata = useCallback((emoji) => {
    return emojiService.getMetadata(emoji)
  }, [])

  // ─── HELPERS ────────────────────────────────────────────────────────────

  /**
   * Récupère le label d'une catégorie (custom ou par défaut).
   * Retourne { id, label, icon, isCustom } ou null.
   */
  const getCategoryInfo = useCallback((categoryId) => {
    // Catégorie par défaut ?
    const defCat = EMOJI_CATEGORIES.find(c => c.id === categoryId)
    if (defCat) return { ...defCat, isCustom: false }

    // Catégorie custom (uniquement si l'utilisateur a ajouté des emojis dedans)
    const emojisInCat = customGrouped[categoryId]
    if (emojisInCat && emojisInCat.length > 0) {
      return {
        id: categoryId,
        label: categoryId,
        icon: 'ti-folder',
        emojis: emojisInCat,
        isCustom: true,
      }
    }

    return null
  }, [customGrouped])

  return {
    // Données
    defaultEmojis: DEFAULT_EMOJIS,
    customEmojis,
    customGrouped,
    allEmojis,
    categories: EMOJI_CATEGORIES,

    // Actions
    addEmoji,
    addCategory,
    removeEmoji,
    removeCategory,

    // Queries
    hasEmoji,
    isCustom,
    hasCategory,
    getMetadata,
    getCategoryInfo,
    getDefaultEmojiCategory,

    // État
    loading,
  }
}

export default useEmojis