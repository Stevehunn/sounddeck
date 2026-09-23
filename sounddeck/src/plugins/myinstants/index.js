// src/plugins/myinstants/index.js
import MyInstantsDiscover from './Discover.jsx'
import { logInfo } from '@shared/utils/logger'

const MyInstantsPlugin = {
  id: 'myinstants',
  name: 'MyInstants Discovery',
  nameKey: 'pluginNameMyInstants',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Recherche et ajout de sons depuis MyInstants',

  pages: [
    {
      id: 'discover',
      labelKey: 'myinstantsTitle',
      icon: 'ti-compass',
      component: MyInstantsDiscover,
      componentPath: './Discover.jsx',
      group: 'navigation',
      pinned: false,
      visible: true
    }
  ],

  init(store, manager) {
    logInfo('MyInstantsPlugin', 'Initialisé')
  },

  destroy() {
    logInfo('MyInstantsPlugin', 'Déchargé')
  }
}

export default MyInstantsPlugin