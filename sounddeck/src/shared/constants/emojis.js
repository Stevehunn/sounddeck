// src/shared/constants/emojis.js
/**
 * Catégories d'emojis par défaut.
 * Chaque catégorie a :
 *  - id       : identifiant stable (utilisé dans emojiMetadata)
 *  - labelKey : clé i18n (ex: emojiCategoryAudio)
 *  - label    : label de secours si la traduction est absente
 *  - icon     : icône Tabler pour les onglets du picker
 *  - emojis   : liste des emojis de la catégorie
 */
export const EMOJI_CATEGORIES = [
  {
    id: 'audio',
    labelKey: 'emojiCategoryAudio',
    label: 'Audio',
    icon: 'ti-music',
    emojis: [
      '🔊', '🔉', '🔈', '🔇', '📢', '📣', '🎵', '🎶', '🎼', '🎤',
      '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎷', '🎙️', '🎚️', '🎛️',
      '🪗', '🪘', '🪇',
    ],
  },
  {
    id: 'reactions',
    labelKey: 'emojiCategoryReactions',
    label: 'Réactions',
    icon: 'ti-mood-happy',
    emojis: [
      '😂', '🤣', '😅', '😆', '😊', '😍', '🥰', '😎', '🤔', '😴',
      '😱', '😬', '🤯', '😭', '😡', '🤬', '🥺', '😇', '🤡', '💀',
      '👻', '👽', '🤖', '💩', '👍', '👎', '👏', '🙌', '🤝', '🙏',
      '💪', '✌️', '🤞', '🤘', '👋', '🤙', '👀', '👁️', '👂', '👄',
    ],
  },
  {
    id: 'animals',
    labelKey: 'emojiCategoryAnimals',
    label: 'Animaux',
    icon: 'ti-paw',
    emojis: [
      '🐸', '🐧', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯',
      '🐮', '🐷', '🐒', '🦄', '🐲', '🐉', '🦕', '🦖', '🐢', '🐍',
      '🦎', '🐙', '🦑', '🦀', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊',
      '🦅', '🦆', '🦉', '🦇', '🐝', '🦋', '🐌', '🐜', '🕷️', '🦂',
    ],
  },
  {
    id: 'games',
    labelKey: 'emojiCategoryGames',
    label: 'Jeux',
    icon: 'ti-device-gamepad-2',
    emojis: [
      '🎮', '🕹️', '🎯', '🎲', '🎰', '🎳', '🎱', '🧩', '🃏', '🎴',
      '♠️', '♥️', '♦️', '♣️', '🀄', '🎪', '🎭', '🎨', '🎬', '🎤',
    ],
  },
  {
    id: 'objects',
    labelKey: 'emojiCategoryObjects',
    label: 'Objets',
    icon: 'ti-box',
    emojis: [
      '💥', '🔥', '⭐', '🌟', '✨', '💫', '🌈', '⚡', '☄️', '💎',
      '🔮', '🧿', '🪄', '⚔️', '🛡️', '🏹', '🪃', '💣', '🧨', '🗡️',
      '💰', '💵', '💶', '💷', '💴', '🪙', '📱', '📲', '💻', '🖥️',
      '⌨️', '🖱️', '💽', '💾', '💿', '📀', '🧮', '📟', '☎️', '📞',
    ],
  },
  {
    id: 'food',
    labelKey: 'emojiCategoryFood',
    label: 'Nourriture',
    icon: 'ti-burger',
    emojis: [
      '🍕', '🍔', '🌮', '🌯', '🍣', '🍜', '🍩', '🍪', '🎂', '🧁',
      '🍫', '🍭', '🍬', '🍺', '🍻', '☕', '🍵', '🥤', '🍷', '🍸',
    ],
  },
  {
    id: 'misc',
    labelKey: 'emojiCategoryMisc',
    label: 'Divers',
    icon: 'ti-sparkles',
    emojis: [
      '🚀', '🛸', '🛰️', '🌍', '🌎', '🌏', '🌕', '🌙', '☀️', '⛅',
      '❄️', '🌊', '🍀', '🌲', '🌴', '🌵', '🍄', '🌺', '🌻', '💐',
      '⏰', '⏳', '⌛', '🕐', '📅', '📆', '🎉', '🎊', '🎈', '🎁',
    ],
  },
]

/** Liste plate de tous les emojis par défaut. */
export const DEFAULT_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis)

/** Lookup : emoji → catégorie. */
export const DEFAULT_EMOJI_MAP = (() => {
  const map = new Map()
  for (const cat of EMOJI_CATEGORIES) {
    for (const emoji of cat.emojis) {
      map.set(emoji, cat.id)
    }
  }
  return map
})()

/** Retourne la catégorie par défaut d'un emoji, ou null. */
export function getDefaultEmojiCategory(emoji) {
  return DEFAULT_EMOJI_MAP.get(emoji) || null
}

/**
 * Vérifie si un emoji est valide.
 * ✅ V2 : supporte drapeaux régionaux, keycaps, tag sequences, ZWJ complexes
 */
export function isValidEmoji(str) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  if (trimmed.length === 0) return false
  if (trimmed.length > 30) return false // 30 code units = marge pour familles

  // A. Cas spéciaux (pas de Extended_Pictographic)
  const isRegionalFlag = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(trimmed)
  const isKeycap = /^[0-9#*]\uFE0F?\u20E3$/u.test(trimmed)
  const isTagFlag = /^\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}$/u.test(trimmed)

  if (isRegionalFlag || isKeycap || isTagFlag) return true

  // B. Doit contenir au moins un pictogramme emoji
  const hasPictographic = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(
    trimmed
  )
  if (!hasPictographic) return false

  // C. Ne doit contenir QUE des caractères liés aux emojis
  //    (pictos, ZWJ, VS16, keycap, RI, modifiers, tags)
  const allowedChars =
    /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F\u20E3\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007E}\u{E007F}]+$/u
  return allowedChars.test(trimmed)
}

/**
 * ✅ Helper pour la recherche future (Q7) :
 * Retourne tous les emojis par défaut trouvés pour un mot-clé.
 * Recherche basique par nom Unicode ou par catégorie.
 * Note : ceci est un placeholder qui sera amélioré quand Q7 sera traité.
 */
export function searchDefaultEmojis(query) {
  if (!query || typeof query !== 'string') return []
  const q = query.toLowerCase().trim()
  if (!q) return []

  const results = []
  for (const cat of EMOJI_CATEGORIES) {
    const catMatches =
      cat.label.toLowerCase().includes(q) ||
      cat.id.toLowerCase().includes(q)
    if (catMatches) {
      results.push(...cat.emojis)
    }
  }
  return [...new Set(results)]
}

export default {
  EMOJI_CATEGORIES,
  DEFAULT_EMOJIS,
  DEFAULT_EMOJI_MAP,
  getDefaultEmojiCategory,
  isValidEmoji,
  searchDefaultEmojis,
}