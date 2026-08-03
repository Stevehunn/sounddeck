// src/plugins/youtube/index.js - CE FICHIER EST CORRECT
import YouTube from './YouTube.jsx'

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

  init(store, manager) {
    console.log('▶️ Plugin YouTube initialisé')
  },

  destroy() {
    console.log('🗑️ Plugin YouTube déchargé')
  }
}

export default YouTubePlugin