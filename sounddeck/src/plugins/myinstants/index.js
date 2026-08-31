// src/plugins/myinstants/index.js
import MyInstantsDiscover from './Discover.jsx'

const MyInstantsPlugin = {
  id: 'myinstants',
  name: 'MyInstants Discovery',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Recherche et ajout de sons depuis MyInstants',

  pages: [
    {
      id: 'discover',
      label: 'Découverte MyInstants',
      icon: 'ti-compass',
      component: MyInstantsDiscover,
      componentPath: './Discover.jsx',
      group: 'navigation',
      pinned: false,
      visible: true
    }
  ],

  init(store, manager) {
    console.log('🔍 Plugin MyInstants initialisé')
  },

  destroy() {
    console.log('🗑️ Plugin MyInstants déchargé')
  }
}

export default MyInstantsPlugin