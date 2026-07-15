import MyInstantsDiscover from './Discover'
import translations from './i18n'

const MyInstantsPlugin = {
  id: 'myinstants',
  name: 'MyInstants Discovery',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Recherche et ajout de sons depuis MyInstants',

  // Pages ajoutées par le plugin
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

  // Traductions
  i18n: translations,

  // Initialisation du plugin
  init(store, manager) {
    console.log('🔍 Plugin MyInstants initialisé')
  },

  // Nettoyage
  destroy() {
    console.log('🗑️ Plugin MyInstants déchargé')
  }
}

export default MyInstantsPlugin