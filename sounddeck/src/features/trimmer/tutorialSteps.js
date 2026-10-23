/**
 * @file Tutorial steps for the trimmer page.
 *
 * Each step targets a UI element. Most targets are plain CSS selectors,
 * but a few need to be functions because they depend on the DOM state
 * (e.g. "first sound in the list" only exists once the user has sounds).
 *
 * All resolvers fall back to a safe element (search bar, empty state) so
 * the tutorial never blocks if a target is missing.
 *
 * @see @shared/components/ui/Tutorial.jsx
 */

/**
 * Resolves the highlighted sound (or the first one in the list).
 * Falls back to the search input, which is always visible.
 *
 * @returns {Element|null}
 */
function findSoundInList() {
  const activeItem = document.querySelector(
    '[data-testid^="sound-list-item-"][data-active="true"]'
  )
  if (activeItem && activeItem.offsetParent !== null) return activeItem

  const firstItem = document.querySelector('[data-testid^="sound-list-item-"]')
  if (firstItem && firstItem.offsetParent !== null) return firstItem

  return document.querySelector('[data-testid="trimmer-search-input"]')
}

/**
 * Resolves the interactive waveform (or the empty state if no sound
 * is selected).
 *
 * @returns {Element|null}
 */
function findWaveformArea() {
  const waveform = document.querySelector(
    '[data-testid="trimmer-waveform-container"]'
  )
  if (waveform && waveform.offsetParent !== null) return waveform
  return document.querySelector('[data-testid="trimmer-empty-state"]')
}

/**
 * Resolves the "Play selection" button (or "Reset" as fallback).
 * @returns {Element|null}
 */
function findListenButton() {
  const btn = document.querySelector('[data-testid="trimmer-listen-button"]')
  if (btn && btn.offsetParent !== null) return btn
  return document.querySelector('[data-testid="trimmer-reset-button"]')
}

/**
 * Resolves the "Select all" button.
 * @returns {Element|null}
 */
function findResetButton() {
  const btn = document.querySelector('[data-testid="trimmer-reset-button"]')
  if (btn && btn.offsetParent !== null) return btn
  return null
}

/**
 * Resolves the "Sound name" input.
 * @returns {Element|null}
 */
function findNameInput() {
  const input = document.querySelector('[data-testid="trimmer-name-input"]')
  if (input && input.offsetParent !== null) return input
  return null
}

/**
 * Resolves the "Create sound" button.
 * @returns {Element|null}
 */
function findCreateButton() {
  const btn = document.querySelector('[data-testid="trimmer-create-button"]')
  if (btn && btn.offsetParent !== null) return btn
  return null
}

export const TUTORIAL_STEPS = (t) => [
  {
    id: 'trimmer-step1',
    icon: '🎵',
    title: t('tutorialTrimmerStep1Title'),
    description: t('tutorialTrimmerStep1Desc'),
    hint: t('tutorialTrimmerStep1Hint'),
    target: findSoundInList,
    fallbackTarget: '[data-testid="trimmer-search-input"]',
    // Auto-select the first sound before moving to step 2, so the
    // targets (waveform, buttons, etc.) actually exist in the DOM.
    afterNextStep: () => {
      if (typeof window !== 'undefined' && window.__trimmerSelectFirstSound) {
        const ok = window.__trimmerSelectFirstSound()
        if (!ok) {
          console.warn(
            '[Tutorial Trimmer] No sound available to auto-select'
          )
        }
      }
    },
    // Wait for the waveform to render (async audio analysis ~1-2s).
    afterNextStepDelay: 2500,
  },
  {
    id: 'trimmer-step2',
    icon: '✂️',
    title: t('tutorialTrimmerStep2Title'),
    description: t('tutorialTrimmerStep2Desc'),
    hint: t('tutorialTrimmerStep2Hint'),
    target: findWaveformArea,
    fallbackTarget: '[data-testid="trimmer-empty-state"]',
  },
  {
    id: 'trimmer-step3',
    icon: '▶️',
    title: t('tutorialTrimmerStep3Title'),
    description: t('tutorialTrimmerStep3Desc'),
    hint: t('tutorialTrimmerStep3Hint'),
    target: findListenButton,
    fallbackTarget: '[data-testid="trimmer-listen-button"]',
  },
  {
    id: 'trimmer-step4',
    icon: '🔄',
    title: t('tutorialTrimmerStep4Title'),
    description: t('tutorialTrimmerStep4Desc'),
    hint: t('tutorialTrimmerStep4Hint'),
    target: findResetButton,
    fallbackTarget: '[data-testid="trimmer-reset-button"]',
  },
  {
    id: 'trimmer-step5',
    icon: '✏️',
    title: t('tutorialTrimmerStep5Title'),
    description: t('tutorialTrimmerStep5Desc'),
    hint: t('tutorialTrimmerStep5Hint'),
    target: findNameInput,
    fallbackTarget: '[data-testid="trimmer-name-input"]',
  },
  {
    id: 'trimmer-step6',
    icon: '✅',
    title: t('tutorialTrimmerStep6Title'),
    description: t('tutorialTrimmerStep6Desc'),
    hint: t('tutorialTrimmerStep6Hint'),
    target: findCreateButton,
    fallbackTarget: '[data-testid="trimmer-create-button"]',
  },
]