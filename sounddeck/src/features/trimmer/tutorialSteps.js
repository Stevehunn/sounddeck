// src/features/trimmer/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'trimmer-step1',
    icon: '🎯',
    title: t('tutorialTrimmerStep1Title', 'Sélectionner une portion'),
    description: t('tutorialTrimmerStep1Desc', 'Utilisez les poignées sur le waveform pour sélectionner la portion du son à conserver.'),
    hint: t('tutorialTrimmerStep1Hint', '💡 Astuce : Vous pouvez aussi entrer les valeurs manuellement en secondes.'),
    target: '.waveform-container, .trim-waveform, [class*="waveform"]',
    fallbackTarget: '.trimmer-waveform, .audio-waveform',
  },
  {
    id: 'trimmer-step2',
    icon: '👂',
    title: t('tutorialTrimmerStep2Title', 'Écouter la sélection'),
    description: t('tutorialTrimmerStep2Desc', 'Cliquez sur "Écouter la sélection" pour prévisualiser le résultat avant de rogner.'),
    hint: t('tutorialTrimmerStep2Hint', '💡 Astuce : La barre de progression vous montre où vous en êtes dans le fichier.'),
    target: () => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Écouter') || btn.textContent.includes('Listen'))) {
          return btn;
        }
      }
      return document.querySelector('.btn-secondary:has(.ti-player-play)');
    },
    fallbackTarget: '.trimmer-controls .btn-secondary',
  },
  {
    id: 'trimmer-step3',
    icon: '✂️',
    title: t('tutorialTrimmerStep3Title', 'Rogner le fichier'),
    description: t('tutorialTrimmerStep3Desc', 'Cliquez sur "Rogner" pour créer un nouveau fichier audio avec uniquement la sélection.'),
    hint: t('tutorialTrimmerStep3Hint', '💡 Astuce : Le fichier original est conservé, un nouveau fichier est créé.'),
    target: () => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Rogner') || btn.textContent.includes('Trim'))) {
          return btn;
        }
      }
      return document.querySelector('.btn-primary:has(.ti-cut)');
    },
    fallbackTarget: '.trimmer-controls .btn-primary',
  },
];