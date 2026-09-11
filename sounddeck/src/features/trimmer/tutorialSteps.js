// src/features/options/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'options-step1',
    icon: '🎨',
    title: t('tutorialOptionsStep1Title'),
    description: t('tutorialOptionsStep1Desc'),
    hint: t('tutorialOptionsStep1Hint'),
    target: () => {
      const sections = document.querySelectorAll('[data-section="appearance"]');
      for (const section of sections) {
        if (section) return section;
      }
      const themeSelect = document.querySelector('select:has(option[value="dark"])');
      if (themeSelect) return themeSelect;
      return document.querySelector('.options-section:first-child');
    },
    fallbackTarget: '.options-appearance, .appearance-section',
  },
  {
    id: 'options-step2',
    icon: '🎛️',
    title: t('tutorialOptionsStep2Title'),
    description: t('tutorialOptionsStep2Desc'),
    hint: t('tutorialOptionsStep2Hint'),
    target: () => {
      const sections = document.querySelectorAll('[data-section="audio"]');
      for (const section of sections) {
        if (section) return section;
      }
      const toggle = document.querySelector('.toggle:has(.knob)');
      if (toggle) return toggle;
      return document.querySelector('.options-section:nth-child(2)');
    },
    fallbackTarget: '.options-audio, .audio-section',
  },
  {
    id: 'options-step3',
    icon: '⌨️',
    title: t('tutorialOptionsStep3Title'),
    description: t('tutorialOptionsStep3Desc'),
    hint: t('tutorialOptionsStep3Hint'),
    target: () => {
      const sections = document.querySelectorAll('[data-section="shortcuts"]');
      for (const section of sections) {
        if (section) return section;
      }
      const visualizer = document.querySelector('[class*="keyboard-visualizer"]');
      if (visualizer) return visualizer;
      return document.querySelector('.options-section:nth-child(3)');
    },
    fallbackTarget: '.options-shortcuts, .shortcuts-section',
  },
];