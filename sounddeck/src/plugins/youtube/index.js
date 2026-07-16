import YouTube from './YouTube'
import translations from './i18n'

const YouTubePlugin = {
  id: 'youtube',
  name: 'YouTube Import',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Import audio from YouTube, Spotify and SoundCloud',

  // Pages ajoutées par le plugin
  pages: [
    {
      id: 'youtube',
      label: 'YouTube',
      icon: 'ti-brand-youtube',
      component: YouTube,
      componentPath: './YouTube.jsx',
      group: 'navigation',
      pinned: false,
      visible: true
    }
  ],

  // Traductions
  i18n: translations,

  // Initialisation du plugin
  init(store, manager) {
    console.log('▶️ Plugin YouTube initialisé')
  },

  // Nettoyage
  destroy() {
    console.log('🗑️ Plugin YouTube déchargé')
  }
}

export default YouTubePlugin