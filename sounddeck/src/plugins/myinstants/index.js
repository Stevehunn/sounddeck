import MyInstantsDiscover from './Discover'

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

  // ✅ Le plugin n'a plus besoin de ses propres traductions
  // car il utilise le contexte global

  init(store, manager) {
    console.log('🔍 Plugin MyInstants initialisé')
  },

  destroy() {
    console.log('🗑️ Plugin MyInstants déchargé')
  }
}

export default MyInstantsPlugin