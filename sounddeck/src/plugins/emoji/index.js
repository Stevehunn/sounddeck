// src/plugins/emoji/index.js
import EmojiDiscover from './EmojiDiscover.jsx'
import { logInfo } from '@shared/utils/logger'

const EmojiPlugin = {
  id: 'emoji',
  name: 'Emoji Discovery',
  nameKey: 'pluginNameEmoji',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Découvrir et ajouter des emojis par catégorie',

  pages: [
    {
      id: 'emoji-discover',
      labelKey: 'emojiDiscoverTitle',
      icon: 'ti-mood-smile-beam',
      component: EmojiDiscover,
      componentPath: './EmojiDiscover.jsx',
      group: 'navigation',
      pinned: false,
      visible: true,
    },
  ],

  init(store, manager) {
    logInfo('EmojiPlugin', 'Initialisé')
  },

  destroy() {
    logInfo('EmojiPlugin', 'Déchargé')
  },
}

export default EmojiPlugin