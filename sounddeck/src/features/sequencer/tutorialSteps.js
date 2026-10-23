/**
 * @file Tutorial steps for the sequencer page.
 *
 * Each step targets a UI element (button, list item, etc.). Many steps
 * also perform a side-effect when navigating to them (e.g. select the
 * first playlist so the tutorial has an item to point at).
 *
 * @see @shared/components/ui/Tutorial.jsx
 */

/**
 * Resolves the "New playlist" button.
 * @returns {Element|null}
 */
function findNewPlaylistButton() {
  const btn = document.querySelector('[data-testid="new-playlist-button"]')
  if (btn && btn.offsetParent !== null) return btn

  const buttons = document.querySelectorAll('button')
  for (const b of buttons) {
    const text = b.textContent?.trim() || ''
    if (
      text.includes('Nouvelle playlist') ||
      text.includes('New playlist') ||
      text.includes('Nueva lista')
    ) {
      if (b.offsetParent !== null) return b
    }
  }

  const plusBtn = document.querySelector('.btn-primary:has(.ti-plus)')
  if (plusBtn && plusBtn.offsetParent !== null) return plusBtn

  return null
}

/**
 * Selects the first playlist in the sidebar (auto-selection for step 2).
 * @returns {Element|null}
 */
function selectFirstPlaylist() {
  const playlistItem = document.querySelector(
    '[data-testid^="playlist-item-"]'
  )
  if (playlistItem && playlistItem.offsetParent !== null) {
    const isActive = playlistItem.classList.contains('active')
    if (!isActive) {
      try {
        playlistItem.click()
      } catch {
        // Ignore — the playlist is simply not selectable.
      }
    }
    return playlistItem
  }

  const fallback = document.querySelector('.sidebar-item:has(.ti-playlist)')
  if (fallback && fallback.offsetParent !== null) {
    try {
      fallback.click()
    } catch {
      // Ignore.
    }
    return fallback
  }

  return null
}

/**
 * Resolves the "Add sounds" button.
 * @returns {Element|null}
 */
function findAddSoundsButton() {
  const btn = document.querySelector('[data-testid="add-sounds-button"]')
  if (btn && btn.offsetParent !== null) return btn

  const buttons = document.querySelectorAll('button')
  for (const b of buttons) {
    const text = b.textContent?.trim() || ''
    if (
      text.includes('Ajouter des sons') ||
      text.includes('Add sounds') ||
      text.includes('Agregar sonidos')
    ) {
      if (b.offsetParent !== null) return b
    }
  }

  const plusBtn = document.querySelector('.btn-secondary:has(.ti-plus)')
  if (plusBtn && plusBtn.offsetParent !== null) return plusBtn

  return null
}

/**
 * Resolves the "Play sequence" button.
 * @returns {Element|null}
 */
function findPlayButton() {
  const btn = document.querySelector('[data-testid="play-sequence-button"]')
  if (btn && btn.offsetParent !== null) return btn

  const playBtn = document.querySelector('.btn-primary:has(.ti-player-play)')
  if (playBtn && playBtn.offsetParent !== null) return playBtn

  return null
}

/**
 * Resolves the "Loop" button.
 * @returns {Element|null}
 */
function findLoopButton() {
  const btn = document.querySelector('[data-testid="loop-sequence-button"]')
  if (btn && btn.offsetParent !== null) return btn

  const buttons = document.querySelectorAll('button')
  for (const b of buttons) {
    const icon = b.querySelector('.ti-repeat')
    if (icon && b.offsetParent !== null) {
      const text = b.textContent?.trim() || ''
      if (
        text.includes('Loop') ||
        text.includes('Boucle') ||
        text.includes('Repetir')
      ) {
        return b
      }
    }
  }

  return null
}

/**
 * Resolves the first playlist item (main content, not sidebar).
 * @returns {Element|null}
 */
function findFirstPlaylistItem() {
  const mainContent =
    document.querySelector('[style*="flex: 1"]') || document.body

  const items = mainContent.querySelectorAll('.sequencer-item')
  for (const item of items) {
    if (item.offsetParent !== null) return item
  }

  const allItems = document.querySelectorAll(
    '[data-testid^="playlist-item-"]'
  )
  for (const item of allItems) {
    const isInSidebar = item.closest(
      '.sidebar, aside, [class*="sidebar"]'
    )
    if (!isInSidebar && item.offsetParent !== null) return item
  }

  return null
}

/**
 * Resolves the "Configure sound popup" button.
 * @returns {Element|null}
 */
function findSoundPopupConfigButton() {
  const btn = document.querySelector(
    '[data-testid="sound-popup-config-button"]'
  )
  if (btn && btn.offsetParent !== null) return btn
  return null
}

export const TUTORIAL_STEPS = (t) => [
  {
    id: 'sequencer-step1',
    icon: '📋',
    title: t('tutorialSequencerStep1Title'),
    description: t('tutorialSequencerStep1Desc'),
    hint: t('tutorialSequencerStep1Hint'),
    target: findNewPlaylistButton,
    fallbackTarget: '.btn-primary:has(.ti-plus)',
  },
  {
    id: 'sequencer-step2',
    icon: '📂',
    title: t('tutorialSequencerStep2Title'),
    description: t('tutorialSequencerStep2Desc'),
    hint: t('tutorialSequencerStep2Hint'),
    target: selectFirstPlaylist,
    fallbackTarget: '.sidebar-item:has(.ti-playlist)',
  },
  {
    id: 'sequencer-step3',
    icon: '➕',
    title: t('tutorialSequencerStep3Title'),
    description: t('tutorialSequencerStep3Desc'),
    hint: t('tutorialSequencerStep3Hint'),
    target: findAddSoundsButton,
    fallbackTarget: '.btn-secondary:has(.ti-plus)',
  },
  {
    id: 'sequencer-step4',
    icon: '🔄',
    title: t('tutorialSequencerStep4Title'),
    description: t('tutorialSequencerStep4Desc'),
    hint: t('tutorialSequencerStep4Hint'),
    target: findFirstPlaylistItem,
    fallbackTarget: '.sequencer-item:first-child',
  },
  {
    id: 'sequencer-step5',
    icon: '🔁',
    title: t('tutorialSequencerStep5Title'),
    description: t('tutorialSequencerStep5Desc'),
    hint: t('tutorialSequencerStep5Hint'),
    target: findLoopButton,
    fallbackTarget:
      '.btn-success:has(.ti-repeat), .btn-secondary:has(.ti-repeat)',
  },
  {
    id: 'sequencer-step6',
    icon: '▶️',
    title: t('tutorialSequencerStep6Title'),
    description: t('tutorialSequencerStep6Desc'),
    hint: t('tutorialSequencerStep6Hint'),
    target: findPlayButton,
    fallbackTarget: '.btn-primary:has(.ti-player-play)',
  },
  {
    id: 'sequencer-step7',
    icon: '⌨️',
    title: t('tutorialSequencerStep7Title'),
    description: t('tutorialSequencerStep7Desc'),
    hint: t('tutorialSequencerStep7Hint'),
    target: () => {
      const item = document.querySelector('.sequencer-item')
      if (item && item.offsetParent !== null) return item
      return document.querySelector('.btn-danger:has(.ti-player-stop)')
    },
    fallbackTarget: '.sequencer-item:first-child, .btn-danger',
  },
  {
    id: 'sequencer-step8',
    icon: '🔔',
    title: t('tutorialSequencerStep8Title'),
    description: t('tutorialSequencerStep8Desc'),
    hint: t('tutorialSequencerStep8Hint'),
    target: findSoundPopupConfigButton,
    fallbackTarget: '[data-testid="sound-popup-config-button"]',
  },
]