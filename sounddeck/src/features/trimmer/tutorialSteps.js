// src/features/trimmer/tutorialSteps.js

/**
 * Cible : le son actuellement sélectionné (priorité) ou le premier de la liste.
 * Fallback : la zone de recherche si aucun son n'est dispo.
 */
function findSoundInList() {
  // 1) Le son actuellement actif (mis en surbrillance)
  const activeItem = document.querySelector(
    '[data-testid^="sound-list-item-"][data-active="true"]'
  )
  if (activeItem && activeItem.offsetParent !== null) return activeItem

  // 2) Le premier son de la liste
  const firstItem = document.querySelector('[data-testid^="sound-list-item-"]')
  if (firstItem && firstItem.offsetParent !== null) return firstItem

  // 3) La zone de recherche en haut du sidebar (toujours visible)
  return document.querySelector('[data-testid="trimmer-search-input"]')
}

/**
 * Cible : la waveform interactive.
 * Fallback : la zone vide si aucun son n'est sélectionné.
 */
function findWaveformArea() {
  const waveform = document.querySelector('[data-testid="trimmer-waveform-container"]')
  if (waveform && waveform.offsetParent !== null) return waveform

  return document.querySelector('[data-testid="trimmer-empty-state"]')
}

/**
 * Cible : le bouton "Écouter la sélection".
 */
function findListenButton() {
  const btn = document.querySelector('[data-testid="trimmer-listen-button"]')
  if (btn && btn.offsetParent !== null) return btn

  // Fallback : le bouton "reset"
  return document.querySelector('[data-testid="trimmer-reset-button"]')
}

/**
 * Cible : le bouton "Tout sélectionner".
 */
function findResetButton() {
  const btn = document.querySelector('[data-testid="trimmer-reset-button"]')
  if (btn && btn.offsetParent !== null) return btn
  return null
}

/**
 * Cible : le champ "Nom du son".
 */
function findNameInput() {
  const input = document.querySelector('[data-testid="trimmer-name-input"]')
  if (input && input.offsetParent !== null) return input
  return null
}

/**
 * Cible : le bouton "Créer".
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
    // ✅ Sélectionne automatiquement le premier son avant de passer à l'étape 2
    // pour que les éléments cibles (waveform, boutons, etc.) existent dans le DOM.
    afterNextStep: () => {
      if (typeof window !== 'undefined' && window.__trimmerSelectFirstSound) {
        const ok = window.__trimmerSelectFirstSound()
        if (!ok) {
          console.warn('[Tutorial Trimmer] Aucun son disponible à auto-sélectionner')
        }
      }
    },
    // Attend que la waveform se génère (analyse audio async ~1-2s)
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