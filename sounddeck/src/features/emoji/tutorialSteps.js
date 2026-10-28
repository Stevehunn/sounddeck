/**
 * @file Tutorial steps for the "My emojis" page.
 *
 * Each step resolves to a DOM element via a `data-testid` selector or a
 * fallback CSS selector. `TUTORIAL_STEPS(t)` is a factory so titles react
 * to language changes.
 *
 * @see @shared/components/ui/Tutorial
 */

/**
 * Finds the first custom emoji tile (if any).
 * @returns {HTMLElement|null}
 */
function findFirstCustomEmoji() {
  const el = document.querySelector('[data-testid^="emoji-page-item-"]')
  if (el && el.offsetParent !== null) return el
  return null
}

/**
 * Finds the custom-emojis section (or its empty state).
 * @returns {HTMLElement|null}
 */
function findCustomSection() {
  return (
    document.querySelector('[data-testid="emoji-page-custom-section"]') ||
    document.querySelector('[data-testid="emoji-page-empty-state"]')
  )
}

/**
 * Builds the "My emojis" page tutorial steps.
 *
 * @param {(key: string) => string} t - i18n translator.
 * @returns {Array<Object>} Step descriptors.
 */
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'emoji-page-1',
    icon: '😀',
    title: t('tutorialEmojiPageStep1Title'),
    description: t('tutorialEmojiPageStep1Desc'),
    hint: t('tutorialEmojiPageStep1Hint'),
    target: '[data-testid="emoji-page-container"]',
    fallbackTarget: '.main-content',
    position: 'bottom',
  },
  {
    id: 'emoji-page-2',
    icon: '⭐',
    title: t('tutorialEmojiPageStep2Title'),
    description: t('tutorialEmojiPageStep2Desc'),
    hint: t('tutorialEmojiPageStep2Hint'),
    target: findCustomSection,
    fallbackTarget: '[data-testid="emoji-page-custom-section"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-3',
    icon: '🗑️',
    title: t('tutorialEmojiPageStep3Title'),
    description: t('tutorialEmojiPageStep3Desc'),
    hint: t('tutorialEmojiPageStep3Hint'),
    target: findFirstCustomEmoji,
    fallbackTarget: '[data-testid="emoji-page-custom-section"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-4',
    icon: '🔍',
    title: t('tutorialEmojiPageStep4Title'),
    description: t('tutorialEmojiPageStep4Desc'),
    hint: t('tutorialEmojiPageStep4Hint'),
    target: '[data-testid="emoji-page-search"]',
    fallbackTarget: 'input[type="text"]',
    position: 'bottom',
  },
  {
    id: 'emoji-page-5',
    icon: '🧭',
    title: t('tutorialEmojiPageStep5Title'),
    description: t('tutorialEmojiPageStep5Desc'),
    hint: t('tutorialEmojiPageStep5Hint'),
    target: '[data-testid="emoji-page-open-discover-button"]',
    fallbackTarget: '.btn-primary',
    position: 'bottom',
  },
]