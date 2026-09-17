// src/features/emoji/tutorialSteps.js

function findFirstCustomEmoji() {
  const el = document.querySelector('[data-testid^="emoji-page-item-"]')
  if (el && el.offsetParent !== null) return el
  return null
}

function findCustomSection() {
  return (
    document.querySelector('[data-testid="emoji-page-custom-section"]') ||
    document.querySelector('[data-testid="emoji-page-empty-state"]')
  )
}

export const TUTORIAL_STEPS = (t) => [
  {
    id: 'emoji-page-1',
    icon: '😀',
    title: t('tutorialEmojiPageStep1Title') || 'Votre bibliothèque d\'emojis',
    description:
      t('tutorialEmojiPageStep1Desc') ||
      'Cette page regroupe tous vos emojis : ceux par défaut, ceux que vous avez ajoutés manuellement, et ceux téléchargés depuis la page Découvrir.',
    hint:
      t('tutorialEmojiPageStep1Hint') ||
      '💡 Astuce : Les emojis par défaut sont toujours disponibles dans le picker.',
    target: '[data-testid="emoji-page-container"]',
    fallbackTarget: '.main-content',
    position: 'bottom',
  },
  {
    id: 'emoji-page-2',
    icon: '⭐',
    title: t('tutorialEmojiPageStep2Title') || 'Vos emojis ajoutés',
    description:
      t('tutorialEmojiPageStep2Desc') ||
      'Cette section affiche uniquement les emojis que vous avez ajoutés. Ils sont groupés par catégorie d\'origine.',
    hint:
      t('tutorialEmojiPageStep2Hint') ||
      '💡 Astuce : Les emojis sans catégorie apparaissent dans "Sans catégorie".',
    target: findCustomSection,
    fallbackTarget: '[data-testid="emoji-page-custom-section"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-3',
    icon: '🗑️',
    title: t('tutorialEmojiPageStep3Title') || 'Retirer un emoji',
    description:
      t('tutorialEmojiPageStep3Desc') ||
      'Survolez un emoji ajouté pour voir le bouton ×. Cliquez dessus pour le retirer de votre collection. Les emojis par défaut ne peuvent pas être retirés.',
    hint:
      t('tutorialEmojiPageStep3Hint') ||
      '💡 Astuce : Utilisez le bouton "Retirer la catégorie" pour en supprimer plusieurs d\'un coup.',
    target: findFirstCustomEmoji,
    fallbackTarget: '[data-testid="emoji-page-custom-section"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-4',
    icon: '🔍',
    title: t('tutorialEmojiPageStep4Title') || 'Rechercher',
    description:
      t('tutorialEmojiPageStep4Desc') ||
      'Utilisez la barre de recherche pour filtrer vos emojis ajoutés.',
    hint:
      t('tutorialEmojiPageStep4Hint') ||
      '💡 Astuce : La recherche porte sur le caractère emoji lui-même.',
    target: '[data-testid="emoji-page-search"]',
    fallbackTarget: 'input[type="text"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-5',
    icon: '🧭',
    title: t('tutorialEmojiPageStep5Title') || 'Découvrir plus d\'emojis',
    description:
      t('tutorialEmojiPageStep5Desc') ||
      'Cliquez sur "Ajouter plus d\'emojis" pour ouvrir la page Découvrir et enrichir votre collection par catégorie entière.',
    hint:
      t('tutorialEmojiPageStep5Hint') ||
      '💡 Astuce : Vous pouvez ajouter 30 emojis d\'un seul clic depuis la page Découvrir.',
    target: '[data-testid="emoji-page-open-discover-button"]',
    fallbackTarget: '.btn-primary',
    position: 'bottom',
  },
]