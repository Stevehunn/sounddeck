/**
 * @file Tutorial steps for the presentation page.
 *
 * Each step exposes either a `target` selector string or a `target()`
 * function that resolves the element dynamically (needed when the DOM
 * shape depends on data, e.g. "first presentation card").
 *
 * @see @shared/components/ui/Tutorial.jsx (renders these steps)
 */

/**
 * Resolves the "favorites section" element if present.
 * Falls back to the presentation overlay so the tutorial always has a
 * valid target.
 *
 * @returns {Element}
 */
function findFavoritesOrOverlay() {
  const favoritesSection = document.querySelector(
    '[data-testid="presentation-favorites"]'
  )
  if (favoritesSection && favoritesSection.offsetParent !== null) {
    return favoritesSection
  }
  return document.querySelector('.presentation-overlay') || document.body
}

/**
 * Resolves the first presentation card (favorites have priority).
 * @returns {Element|null}
 */
function findFirstCard() {
  const cards = document.querySelectorAll('[data-testid="presentation-card"]')
  if (cards.length > 0) return cards[0]
  const card = document.querySelector('.presentation-card')
  if (card && card.offsetParent !== null) return card
  return document.querySelector('.presentation-grid > div')
}

/**
 * Resolves the first presentation card that has a visible shortcut badge.
 * @returns {Element|null}
 */
function findFirstCardWithShortcut() {
  const cards = document.querySelectorAll('[data-testid="presentation-card"]')
  for (const card of cards) {
    const shortcut = card.querySelector('kbd, [class*="shortcut"]')
    if (shortcut) return card
  }
  return (
    document
      .querySelector('.presentation-card kbd')
      ?.closest('.presentation-card') || null
  )
}

export const TUTORIAL_STEPS = (t) => [
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
    target: findFavoritesOrOverlay,
    fallbackTarget: '.presentation-favorites, .presentation-overlay',
    hint: t('tutorialPresentationStep3Hint'),
    position: 'bottom',
  },
  {
    id: 'presentation-4',
    title: t('tutorialPresentationStep4Title'),
    description: t('tutorialPresentationStep4Desc'),
    icon: '🎵',
    target: findFirstCard,
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
    target: findFirstCardWithShortcut,
    fallbackTarget: '.presentation-card kbd',
    hint: t('tutorialPresentationStep6Hint'),
    position: 'top',
  },
]

/**
 * Removes temporary favorites added by the tutorial flow.
 *
 * @deprecated Kept for API compatibility — favorites aren't mutated by the
 *   current tutorial steps.
 * @param {Object} store
 * @returns {void}
 */
export function cleanupTutorialFavorites(store) {
  if (!store) return
  const currentProfileId = store.currentProfileId
  const allSounds = store.sounds || []

  const tutorialFavorites = allSounds.filter(
    (s) =>
      s.favorites &&
      s.favorites.includes(currentProfileId) &&
      s._tutorialTemp === true
  )

  if (tutorialFavorites.length === 0) return

  for (const sound of tutorialFavorites) {
    if (store.toggleFavorite) {
      store.toggleFavorite(sound.id)
      store.updateSound(sound.id, { _tutorialTemp: false })
    }
  }
}