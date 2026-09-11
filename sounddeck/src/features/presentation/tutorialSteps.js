// src/features/presentation/tutorialSteps.js
const TUTORIAL_FAVORITE_TAG = '__tutorial_temp__'

export const TUTORIAL_STEPS = (t) => {
  const steps = [
    {
      id: 'presentation-1',
      title: t('tutorialPresentationStep1Title'),
      description: t('tutorialPresentationStep1Desc'),
      icon: '🖥️',
      target: '[data-testid="presentation-container"]',
      fallbackTarget: '.presentation-overlay',
      hint: t('tutorialPresentationStep1Hint'),
      position: 'bottom',
    },
    {
      id: 'presentation-2',
      title: t('tutorialPresentationStep2Title'),
      description: t('tutorialPresentationStep2Desc'),
      icon: '🔍',
      target: '[data-testid="presentation-search"]',
      fallbackTarget: '.presentation-header input[type="text"]',
      hint: t('tutorialPresentationStep2Hint'),
      position: 'bottom',
    },
    {
      id: 'presentation-3',
      title: t('tutorialPresentationStep3Title'),
      description: t('tutorialPresentationStep3Desc'),
      icon: '⭐',
      target: () => {
        const favoritesSection = document.querySelector('[data-testid="presentation-favorites"]');
        if (favoritesSection && favoritesSection.offsetParent !== null) {
          return favoritesSection;
        }
        return document.querySelector('.presentation-overlay') || document.body;
      },
      fallbackTarget: '.presentation-favorites, .presentation-overlay',
      hint: t('tutorialPresentationStep3Hint'),
      position: 'bottom',
    },
    {
      id: 'presentation-4',
      title: t('tutorialPresentationStep4Title'),
      description: t('tutorialPresentationStep4Desc'),
      icon: '🎵',
      target: () => {
        const cards = document.querySelectorAll('[data-testid="presentation-card"]');
        if (cards.length > 0) return cards[0];
        const card = document.querySelector('.presentation-card');
        if (card && card.offsetParent !== null) return card;
        return document.querySelector('.presentation-grid > div');
      },
      fallbackTarget: '.presentation-grid, .presentation-cards',
      hint: t('tutorialPresentationStep4Hint'),
      position: 'top',
    },
    {
      id: 'presentation-5',
      title: t('tutorialPresentationStep5Title'),
      description: t('tutorialPresentationStep5Desc'),
      icon: '📐',
      target: '[data-testid="presentation-grid"]',
      fallbackTarget: '.presentation-grid',
      hint: t('tutorialPresentationStep5Hint'),
      position: 'top',
    },
    {
      id: 'presentation-6',
      title: t('tutorialPresentationStep6Title'),
      description: t('tutorialPresentationStep6Desc'),
      icon: '⌨️',
      target: () => {
        const cards = document.querySelectorAll('[data-testid="presentation-card"]');
        for (const card of cards) {
          const shortcut = card.querySelector('kbd, [class*="shortcut"]');
          if (shortcut) return card;
        }
        return document.querySelector('.presentation-card kbd')?.closest('.presentation-card') || null;
      },
      fallbackTarget: '.presentation-card kbd',
      hint: t('tutorialPresentationStep6Hint'),
      position: 'top',
    },
  ]

  return steps
}

export const cleanupTutorialFavorites = (store) => {
  if (!store) return

  const currentProfileId = store.currentProfileId
  const allSounds = store.sounds || []

  const tutorialFavorites = allSounds.filter(s =>
    s.favorites &&
    s.favorites.includes(currentProfileId) &&
    s._tutorialTemp === true
  )

  if (tutorialFavorites.length === 0) {
    return
  }

  for (const sound of tutorialFavorites) {
    if (store.toggleFavorite) {
      store.toggleFavorite(sound.id)
      store.updateSound(sound.id, { _tutorialTemp: false })
    }
  }
}