export const TUTORIAL_STEPS = (t) => [
  {
    id: 'emoji-discover-1',
    icon: '🧭',
    title: t('tutorialEmojiDiscoverStep1Title') || 'Découvrir des emojis',
    description:
      t('tutorialEmojiDiscoverStep1Desc') ||
      'Parcourez des centaines d\'emojis par catégorie et ajoutez-les à votre collection en un clic.',
    hint:
      t('tutorialEmojiDiscoverStep1Hint') ||
      '💡 Astuce : Les emojis déjà possédés sont marqués d\'un ✓.',
    target: '[data-testid="emoji-discover-container"]',
    fallbackTarget: '.main-content',
    position: 'bottom',
  },
  {
    id: 'emoji-discover-2',
    icon: '📂',
    title: t('tutorialEmojiDiscoverStep2Title') || 'Choisir une catégorie',
    description:
      t('tutorialEmojiDiscoverStep2Desc') ||
      'Cliquez sur une catégorie dans la colonne de gauche pour afficher les emojis correspondants.',
    hint:
      t('tutorialEmojiDiscoverStep2Hint') ||
      '💡 Astuce : Les emojis sont chargés depuis une base en ligne, mise en cache après le premier accès.',
    target: '[data-testid="emoji-discover-categories"]',
    fallbackTarget: 'aside',
    position: 'right',
  },
  {
    id: 'emoji-discover-3',
    icon: '➕',
    title: t('tutorialEmojiDiscoverStep3Title') || 'Ajouter un emoji',
    description:
      t('tutorialEmojiDiscoverStep3Desc') ||
      'Cliquez sur un emoji pour l\'ajouter à votre collection. Il apparaîtra ensuite dans le picker.',
    hint:
      t('tutorialEmojiDiscoverStep3Hint') ||
      '💡 Astuce : Le bouton reste désactivé si vous possédez déjà l\'emoji.',
    target: '[data-testid="emoji-discover-grid"]',
    fallbackTarget: '.emoji-grid',
    position: 'top',
  },
  {
    id: 'emoji-discover-4',
    icon: '📦',
    title: t('tutorialEmojiDiscoverStep4Title') || 'Ajouter une catégorie entière',
    description:
      t('tutorialEmojiDiscoverStep4Desc') ||
      'Utilisez le bouton "Ajouter la catégorie" pour importer tous les emojis d\'un coup. Pratique pour enrichir rapidement votre collection.',
    hint:
      t('tutorialEmojiDiscoverStep4Hint') ||
      '💡 Astuce : Vous pourrez retirer les emojis individuellement depuis la page "Mes emojis".',
    target: '[data-testid="emoji-discover-add-category-button"]',
    fallbackTarget: '.btn-primary',
    position: 'bottom',
  },
]