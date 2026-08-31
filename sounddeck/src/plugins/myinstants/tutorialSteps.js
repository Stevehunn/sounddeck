// src/plugins/myinstants/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'discover-step1',
    icon: '📂',
    title: t('tutorialDiscoverStep1Title', 'Explorer les catégories'),
    description: t('tutorialDiscoverStep1Desc', 'La barre des catégories vous permet de naviguer parmi des milliers de sons organisés par thème.'),
    hint: t('tutorialDiscoverStep1Hint', '💡 Astuce : Vous pouvez personnaliser les catégories affichées via le bouton "Personnaliser".'),
    target: '.categories-scroll, .discover-categories, [class*="categories"]',
    fallbackTarget: '.discover-categories',
  },
  {
    id: 'discover-step2',
    icon: '🔍',
    title: t('tutorialDiscoverStep2Title', 'Rechercher des sons'),
    description: t('tutorialDiscoverStep2Desc', 'Utilisez la barre de recherche pour trouver un son spécifique par nom ou mot-clé.'),
    hint: t('tutorialDiscoverStep2Hint', '💡 Astuce : La recherche est instantanée, pas besoin d\'appuyer sur Entrée !'),
    target: 'input[type="search"], input[placeholder*="rechercher"], input[placeholder*="search"]',
    fallbackTarget: '.discover-search input',
  },
  {
    id: 'discover-step3',
    icon: '➕',
    title: t('tutorialDiscoverStep3Title', 'Ajouter un son à votre bibliothèque'),
    description: t('tutorialDiscoverStep3Desc', 'Cliquez sur "Ajouter" sur un son pour l\'importer dans votre bibliothèque. Vous pouvez choisir le profil de destination.'),
    hint: t('tutorialDiscoverStep3Hint', '💡 Astuce : Les sons déjà dans votre bibliothèque sont marqués "Ajouté" en vert.'),
    target: () => {
      const cards = document.querySelectorAll('.discover-card, [class*="discover-card"]');
      if (cards.length > 0) {
        const btn = cards[0].querySelector('button:last-child, .btn-add, [class*="add"]');
        if (btn) return btn;
        return cards[0];
      }
      return null;
    },
    fallbackTarget: '.discover-card:first-child button',
  },
];