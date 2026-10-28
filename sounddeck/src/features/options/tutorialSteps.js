/**
 * @file Tutorial steps for the Options page.
 *
 * Each step resolves to the DOM node of a section via its
 * `data-testid="section-{id}"` (or its `data-section="{id}"` fallback).
 * `TUTORIAL_STEPS(t)` is a factory so titles react to language changes.
 *
 * @see @shared/components/ui/Tutorial
 * @see ./constants.js (`SECTIONS`)
 */

/**
 * Finds the DOM node of a section (by testid or data-attribute).
 *
 * @param {string} sectionId
 * @returns {HTMLElement|null}
 */
function findSection(sectionId) {
  const el = document.querySelector(`[data-testid="section-${sectionId}"]`)
  if (el && el.offsetParent !== null) return el
  const fallback = document.querySelector(`[data-section="${sectionId}"]`)
  if (fallback && fallback.offsetParent !== null) return fallback
  return null
}

/**
 * Builds the Options page tutorial steps.
 *
 * @param {(key: string) => string} t - i18n translator.
 * @returns {Array<Object>} Step descriptors.
 */
export const TUTORIAL_STEPS = (t) => [
  // ─── 1. APPEARANCE ──────────────────────────────────────────────────
  {
    id: 'options-step1',
    icon: '🎨',
    title: t('tutorialOptionsStep1Title'),
    description: t('tutorialOptionsStep1Desc'),
    hint: t('tutorialOptionsStep1Hint'),
    target: () => findSection('appearance'),
    fallbackTarget: '[data-section="appearance"]',
    position: 'bottom',
  },

  // ─── 2. AUDIO ───────────────────────────────────────────────────────
  {
    id: 'options-step2',
    icon: '🎛️',
    title: t('tutorialOptionsStep2Title'),
    description: t('tutorialOptionsStep2Desc'),
    hint: t('tutorialOptionsStep2Hint'),
    target: () => findSection('audio'),
    fallbackTarget: '[data-section="audio"]',
    position: 'bottom',
  },

  // ─── 3. SHORTCUTS ───────────────────────────────────────────────────
  {
    id: 'options-step3',
    icon: '⌨️',
    title: t('tutorialOptionsStep3Title'),
    description: t('tutorialOptionsStep3Desc'),
    hint: t('tutorialOptionsStep3Hint'),
    target: () => findSection('shortcuts'),
    fallbackTarget: '[data-section="shortcuts"]',
    position: 'bottom',
  },

  // ─── 4. SOUND MANAGEMENT ────────────────────────────────────────────
  {
    id: 'options-step4',
    icon: '🎵',
    title: t('tutorialOptionsStep4Title'),
    description: t('tutorialOptionsStep4Desc'),
    hint: t('tutorialOptionsStep4Hint'),
    target: () => findSection('soundManagement'),
    fallbackTarget: '[data-section="soundManagement"]',
    position: 'bottom',
  },

  // ─── 5. PLUGINS ─────────────────────────────────────────────────────
  {
    id: 'options-step5',
    icon: '🧩',
    title: t('tutorialOptionsStep5Title'),
    description: t('tutorialOptionsStep5Desc'),
    hint: t('tutorialOptionsStep5Hint'),
    target: () => findSection('plugins'),
    fallbackTarget: '[data-section="plugins"]',
    position: 'bottom',
  },

  // ─── 6. INTEGRATIONS ────────────────────────────────────────────────
  {
    id: 'options-step6',
    icon: '🔌',
    title: t('tutorialOptionsStep6Title'),
    description: t('tutorialOptionsStep6Desc'),
    hint: t('tutorialOptionsStep6Hint'),
    target: () => findSection('integrations'),
    fallbackTarget: '[data-section="integrations"]',
    position: 'bottom',
  },

  // ─── 7. ADVANCED ────────────────────────────────────────────────────
  {
    id: 'options-step7',
    icon: '⚙️',
    title: t('tutorialOptionsStep7Title'),
    description: t('tutorialOptionsStep7Desc'),
    hint: t('tutorialOptionsStep7Hint'),
    target: () => findSection('advanced'),
    fallbackTarget: '[data-section="advanced"]',
    position: 'bottom',
  },

  // ─── 8. BACKUP ──────────────────────────────────────────────────────
  {
    id: 'options-step8',
    icon: '💾',
    title: t('tutorialOptionsStep8Title'),
    description: t('tutorialOptionsStep8Desc'),
    hint: t('tutorialOptionsStep8Hint'),
    target: () => findSection('backup'),
    fallbackTarget: '[data-section="backup"]',
    position: 'bottom',
  },

  // ─── 9. PROFILES ────────────────────────────────────────────────────
  {
    id: 'options-step9',
    icon: '👥',
    title: t('tutorialOptionsStep9Title'),
    description: t('tutorialOptionsStep9Desc'),
    hint: t('tutorialOptionsStep9Hint'),
    target: () => findSection('profiles'),
    fallbackTarget: '[data-section="profiles"]',
    position: 'bottom',
  },
]

export default { TUTORIAL_STEPS }