/**
 * @file Tutorial steps for the Home page.
 *
 * Each step has a `target` function that resolves to a DOM element to
 * highlight. The functions try a stable `data-testid` first, then fall
 * back to DOM heuristics (visible `offsetParent`, class names).
 *
 * `TUTORIAL_STEPS(t)` is a factory (not a constant) so titles / hints
 * react to language changes.
 *
 * @see @shared/components/ui/Tutorial
 */

/**
 * Finds the first visible sound card.
 * @returns {HTMLElement|null}
 */
function findFirstSound() {
  const card = document.querySelector('[data-testid^="sound-card-"]')
  if (card && card.offsetParent !== null) return card
  const fallback = document.querySelector(
    '.sound-card:not([style*="display: none"])'
  )
  if (fallback) return fallback
  return document.querySelector(
    '.sound-grid .sound-card:first-child, .sound-card:first-child'
  )
}

/**
 * Finds the "Add a sound" button.
 * @returns {HTMLElement|null}
 */
function findAddSoundButton() {
  const addBtn = document.querySelector('[data-testid="add-sound-button"]')
  if (addBtn && addBtn.offsetParent !== null) return addBtn

  const buttons = document.querySelectorAll('button')
  for (const btn of buttons) {
    if (btn.querySelector('.ti-plus')) {
      const section = btn.closest('[class*="header"], [class*="toolbar"]')
      if (section) return btn
    }
  }

  return null
}

/**
 * Finds the favorite (star) button on the first card.
 * @returns {HTMLElement|null}
 */
function findFavoriteButton() {
  const favoriteBtn = document.querySelector('[data-testid="favorite-button"]')
  if (favoriteBtn && favoriteBtn.offsetParent !== null) return favoriteBtn

  const card = findFirstSound()
  if (card) {
    const starBtn = card.querySelector(
      '.ti-star, .ti-star-filled, [class*="star"]'
    )
    if (starBtn) return starBtn.closest('button') || starBtn

    const btns = card.querySelectorAll('button')
    for (const btn of btns) {
      if (
        btn.querySelector('.ti-star') ||
        btn.querySelector('.ti-star-filled')
      ) {
        return btn
      }
    }
    return card
  }
  return null
}

/**
 * Finds the context menu (⋮) button on the first card.
 * @returns {HTMLElement|null}
 */
function findDotsButton() {
  const dotsBtn = document.querySelector('[data-testid="dots-button"]')
  if (dotsBtn && dotsBtn.offsetParent !== null) return dotsBtn

  const card = findFirstSound()
  if (card) {
    const dotsBtnFallback = card.querySelector(
      '.ti-dots-vertical, .ti-dots, [class*="dots"]'
    )
    if (dotsBtnFallback)
      return dotsBtnFallback.closest('button') || dotsBtnFallback

    const btns = card.querySelectorAll('button')
    for (const btn of btns) {
      if (
        btn.querySelector('.ti-dots-vertical') ||
        btn.querySelector('.ti-dots')
      ) {
        return btn
      }
    }
    return card
  }
  return null
}

/**
 * Targets the "Profiles" section of the sidebar (via its testid).
 * @returns {HTMLElement|null}
 */
function findProfilesSection() {
  const section = document.querySelector('[data-testid="profiles-section"]')
  if (section && section.offsetParent !== null) return section

  // Fallback: the whole sidebar
  const sidebar = document.querySelector('aside, .sidebar')
  return sidebar || null
}

/**
 * Finds the "+ Add" button on the first "other sounds" card.
 * @returns {HTMLElement|null}
 */
function findFirstOtherSoundAddButton() {
  const addBtn = document.querySelector('[data-testid^="add-other-sound-"]')
  if (addBtn && addBtn.offsetParent !== null) return addBtn

  const allCards = document.querySelectorAll(
    '.sound-card, [class*="card"], .outside-card'
  )
  for (const card of allCards) {
    const style = card.style.opacity || window.getComputedStyle(card).opacity
    const isOtherSound = parseFloat(style) < 0.9
    if (isOtherSound) {
      const buttons = card.querySelectorAll('button')
      for (const btn of buttons) {
        if (
          btn.querySelector('.ti-circle-plus, .ti-plus, .ti-plus-circle') &&
          !btn.disabled
        ) {
          return btn
        }
      }
      return card
    }
  }

  return null
}

/**
 * Finds the "+ New profile" button in the sidebar.
 * @returns {HTMLElement|null}
 */
function findNewProfileButton() {
  // 1) Official testid
  const btn = document.querySelector('[data-testid="new-profile-button"]')
  if (btn && btn.offsetParent !== null) return btn

  // 2) Fallback: in the sidebar, look for a `button.sidebar-item`
  //    with a <span class="label"> AND a `.ti-plus` icon
  const sidebar = document.querySelector('aside, .sidebar')
  if (sidebar) {
    const buttons = sidebar.querySelectorAll('button.sidebar-item')
    for (const b of buttons) {
      if (b.querySelector('.label') && b.querySelector('.ti-plus')) {
        return b
      }
    }
  }

  return null
}

/**
 * Finds the search input or sort select (or the header as fallback).
 * @returns {HTMLElement|null}
 */
function findSearchOrSortElement() {
  const searchInput = document.querySelector(
    '[data-testid="search-input"], .search-bar input, input[type="search"]'
  )
  if (searchInput) return searchInput

  const sortSelect = document.querySelector(
    '[data-testid="sort-select"], select[class*="sort"]'
  )
  if (sortSelect) return sortSelect

  return document.querySelector('.home-header')
}

/**
 * Builds the Home page tutorial steps.
 *
 * @param {(key: string) => string} t - i18n translator.
 * @returns {Array<Object>} Step descriptors.
 */
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'home-step1',
    icon: '🎵',
    title: t('tutorialHomeStep1Title'),
    description: t('tutorialHomeStep1Desc'),
    hint: t('tutorialHomeStep1Hint'),
    target: findFirstSound,
    fallbackTarget: '.sound-card:first-child',
  },
  {
    id: 'home-step2',
    icon: '➕',
    title: t('tutorialHomeStep2Title'),
    description: t('tutorialHomeStep2Desc'),
    hint: t('tutorialHomeStep2Hint'),
    target: findAddSoundButton,
    fallbackTarget: '.btn-primary:has(.ti-plus)',
  },
  {
    id: 'home-step3',
    icon: '⭐',
    title: t('tutorialHomeStep3Title'),
    description: t('tutorialHomeStep3Desc'),
    hint: t('tutorialHomeStep3Hint'),
    target: findFavoriteButton,
    fallbackTarget: '.sound-card:first-child button:has(.ti-star)',
  },
  {
    id: 'home-step4',
    icon: '📋',
    title: t('tutorialHomeStep4Title'),
    description: t('tutorialHomeStep4Desc'),
    hint: t('tutorialHomeStep4Hint'),
    target: findDotsButton,
    fallbackTarget: '.sound-card:first-child button:has(.ti-dots-vertical)',
    action: 'click',
    actionDelay: 800,
  },
  {
    id: 'home-step5',
    icon: '📂',
    title: t('tutorialHomeStep5Title'),
    description: t('tutorialHomeStep5Desc'),
    hint: t('tutorialHomeStep5Hint'),
    target: findProfilesSection,
    fallbackTarget: 'aside',
  },
  {
    id: 'home-step6',
    icon: '➕',
    title: t('tutorialHomeStep6Title'),
    description: t('tutorialHomeStep6Desc'),
    hint: t('tutorialHomeStep6Hint'),
    target: findNewProfileButton,
    fallbackTarget: '[data-testid="new-profile-button"]',
  },
  {
    id: 'home-step7',
    icon: '📥',
    title: t('tutorialHomeStep7Title'),
    description: t('tutorialHomeStep7Desc'),
    hint: t('tutorialHomeStep7Hint'),
    target: findFirstOtherSoundAddButton,
    fallbackTarget: '.sound-card:has([class*="other"])',
  },
  {
    id: 'home-step8',
    icon: '🏷️',
    title: t('tutorialHomeStep8Title'),
    description: t('tutorialHomeStep8Desc'),
    hint: t('tutorialHomeStep8Hint'),
    target: () => {
      const card = findFirstSound()
      if (card) {
        const tagBtn = card.querySelector(
          '[class*="tag"]:has(.ti-plus), button:has(.ti-tag)'
        )
        if (tagBtn) return tagBtn
        const btns = card.querySelectorAll('button')
        for (const btn of btns) {
          if (btn.textContent && btn.textContent.includes('Tag')) return btn
        }
        return card
      }
      return null
    },
    fallbackTarget: '.sound-card:first-child button:has(.ti-tag)',
  },
  {
    id: 'home-step9',
    icon: '🔍',
    title: t('tutorialHomeStep9Title'),
    description: t('tutorialHomeStep9Desc'),
    hint: t('tutorialHomeStep9Hint'),
    target: findSearchOrSortElement,
    fallbackTarget: '.search-bar, .home-header',
  },
  {
    id: 'home-step10',
    icon: '🔄',
    title: t('tutorialHomeStep10Title'),
    description: t('tutorialHomeStep10Desc'),
    hint: t('tutorialHomeStep10Hint'),
    target: () => {
      const card = findFirstSound()
      if (card && card.draggable !== undefined) return card
      const draggable = document.querySelector('.sound-card[draggable="true"]')
      if (draggable) return draggable
      return document.querySelector('.sound-card:first-child')
    },
    fallbackTarget: '.sound-card:first-child',
  },
]