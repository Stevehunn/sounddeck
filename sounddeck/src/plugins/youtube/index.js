import YouTube from './YouTube'

const YouTubePlugin = {
  id: 'youtube',
  name: 'YouTube Import',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Import audio from YouTube, Spotify and SoundCloud',

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

  // ✅ Le plugin n'a plus besoin de ses propres traductions
  // car il utilise le contexte global

  init(store, manager) {
    console.log('▶️ Plugin YouTube initialisé')
  },

  destroy() {
    console.log('🗑️ Plugin YouTube déchargé')
  }
}

export default YouTubePlugin