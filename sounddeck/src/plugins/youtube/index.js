// src/plugins/youtube/index.js
import YouTube from './YouTube.jsx'
import { logInfo } from '@shared/utils/logger'

const YouTubePlugin = {
  id: 'youtube',
  name: 'YouTube Import',
  nameKey: 'pluginNameYoutube',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Import audio from YouTube, Spotify and SoundCloud',

  pages: [
    {
      id: 'youtube',
      labelKey: 'youtubeTitle',
      icon: 'ti-brand-youtube',
      component: YouTube,
      componentPath: './YouTube.jsx',
      group: 'navigation',
      pinned: false,
      visible: true
    }
  ],

  init(store, manager) {
    logInfo('YouTubePlugin', 'Initialisé')
  },

  destroy() {
    logInfo('YouTubePlugin', 'Déchargé')
  }
}

export default YouTubePlugin