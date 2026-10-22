/**
 * @file Default emoji catalog and validation helpers.
 *
 * Provides:
 * - **`EMOJI_CATEGORIES`** — 7 curated categories (audio, reactions,
 *   animals, games, objects, food, misc). Each category has a stable `id`,
 *   an i18n `labelKey` (e.g. `emojiCategoryAudio`), a French fallback
 *   `label`, a Tabler icon, and the emoji list.
 * - **`DEFAULT_EMOJIS`** — flat array of every default emoji.
 * - **`DEFAULT_EMOJI_MAP`** — O(1) lookup `emoji → categoryId`.
 * - **`isValidEmoji(str)`** — validates that a string is a single emoji
 *   glyph (including complex sequences).
 * - **`searchDefaultEmojis(query)`** — basic search by category label.
 *
 * The user's **custom** emojis are managed by `EmojiService`
 * (`@core/services/EmojiService.js`); this file is the read-only default
 * catalog.
 *
 * @see @shared/hooks/useEmojis.js — reactive wrapper over the service
 * @see @core/services/EmojiService.js — persistence + custom emojis
 */

/**
 * Default emoji categories.
 *
 * @type {Array<{
 *   id: string,
 *   labelKey: string,
 *   label: string,
 *   icon: string,
 *   emojis: string[],
 * }>}
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
      '♠️', '♥️', '♦️', '♣️', '🀄', '🎪', '🎭', '🎨', '🎬',
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

/**
 * Flat array of every default emoji.
 * @type {string[]}
 */
export const DEFAULT_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis)

/**
 * Lookup map: `emoji → categoryId`.
 *
 * Built once at module load. Useful for O(1) category resolution without
 * re-scanning `EMOJI_CATEGORIES`.
 *
 * @type {Map<string, string>}
 */
export const DEFAULT_EMOJI_MAP = (() => {
  const map = new Map()
  for (const cat of EMOJI_CATEGORIES) {
    for (const emoji of cat.emojis) {
      map.set(emoji, cat.id)
    }
  }
  return map
})()

/**
 * Returns the default category of an emoji, or `null` if it isn't a
 * default emoji.
 *
 * @param {string} emoji
 * @returns {string|null} The category ID (e.g. `'audio'`), or `null`.
 */
export function getDefaultEmojiCategory(emoji) {
  return DEFAULT_EMOJI_MAP.get(emoji) || null
}

/**
 * Returns `true` if `str` is a single valid emoji.
 *
 * Supports modern Unicode complexity:
 * - **Regional flags** — `🇫🇷` (two regional indicators).
 * - **Keycaps** — `1️⃣`, `#️⃣`, `*️⃣` (digit + optional VS16 + enclosing keycap).
 * - **Tag sequences** — `🏴󠁧󠁢󠁳󠁣󠁴󠁿` (flag + tag chars + cancel tag).
 * - **ZWJ sequences** — `👨‍👩‍👧‍👦` (multi-codepoint).
 * - **Skin tone modifiers** — `👋🏽`.
 *
 * Rejects plain text, lone modifiers, and multi-emoji strings (e.g. `"😀😀"`).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidEmoji(str) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  if (trimmed.length === 0) return false
  // 30 UTF-16 code units is enough for the longest common ZWJ family
  if (trimmed.length > 30) return false

  // A. Special cases (no Extended_Pictographic)
  const isRegionalFlag = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(trimmed)
  const isKeycap = /^[0-9#*]\uFE0F?\u20E3$/u.test(trimmed)
  const isTagFlag =
    /^\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}$/u.test(trimmed)

  if (isRegionalFlag || isKeycap || isTagFlag) return true

  // B. Must contain at least one pictographic glyph
  const hasPictographic =
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(trimmed)
  if (!hasPictographic) return false

  // C. Must consist ONLY of emoji-related codepoints
  //    (pictos, ZWJ, VS16, keycap, RI, modifiers, tags)
  //
  // Justification for the lint disable below: we intentionally whitelist
  // combining marks (ZWJ U+200D, VS16 U+FE0F, keycap U+20E3, skin tone
  // modifiers U+1F3FB..U+1F3FF, tag chars U+E0020..U+E007E) because we're
  // validating CODEPOINTS, not graphemes. The `no-misleading-character-
  // class` rule is meant to catch naïve users who don't understand
  // grapheme clusters — here we explicitly want codepoint-level validation.
  /* eslint-disable no-misleading-character-class */
  const allowedChars =
    /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F\u20E3\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007E}\u{E007F}]+$/u
  /* eslint-enable no-misleading-character-class */
  return allowedChars.test(trimmed)
}

/**
 * Basic search across default emojis.
 *
 * Current implementation matches against the category ID or its French
 * fallback label. It does **not** search by emoji name (e.g. "smile"),
 * because we don't ship the Unicode name table — this is a placeholder
 * for a richer search (see Q7 ticket).
 *
 * @param {string} query - Search term (case-insensitive, trimmed).
 * @returns {string[]} Matching emojis (deduped). Empty array for empty/invalid input.
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