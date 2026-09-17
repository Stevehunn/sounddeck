// src/plugins/emoji/categories.js
/**
 * Catégories scrapables depuis getemoji.com.
 * L'id correspond à la section HTML sur la page source.
 */
export const EMOJI_DISCOVER_CATEGORIES = [
  { id: 'smileys', labelKey: 'emojiDiscoverCatSmileys', icon: 'ti-mood-happy', emoji: '😀' },
  { id: 'people', labelKey: 'emojiDiscoverCatPeople', icon: 'ti-user', emoji: '👋' },
  { id: 'animals', labelKey: 'emojiDiscoverCatAnimals', icon: 'ti-paw', emoji: '🐾' },
  { id: 'food', labelKey: 'emojiDiscoverCatFood', icon: 'ti-burger', emoji: '🍕' },
  { id: 'travel', labelKey: 'emojiDiscoverCatTravel', icon: 'ti-plane', emoji: '✈️' },
  { id: 'activities', labelKey: 'emojiDiscoverCatActivities', icon: 'ti-ball-basketball', emoji: '⚽' },
  { id: 'objects', labelKey: 'emojiDiscoverCatObjects', icon: 'ti-bulb', emoji: '💡' },
  { id: 'symbols', labelKey: 'emojiDiscoverCatSymbols', icon: 'ti-heart', emoji: '❤️' },
  { id: 'flags', labelKey: 'emojiDiscoverCatFlags', icon: 'ti-flag', emoji: '🏁' },
]

export default { EMOJI_DISCOVER_CATEGORIES }