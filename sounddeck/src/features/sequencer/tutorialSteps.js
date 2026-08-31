// src/features/sequencer/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'sequencer-step1',
    icon: '📋',
    title: t('tutorialSequencerStep1Title', 'Créer une playlist'),
    description: t('tutorialSequencerStep1Desc', 'Cliquez sur "Nouvelle playlist" pour créer une playlist. Donnez-lui un nom et commencez à y ajouter des sons.'),
    hint: t('tutorialSequencerStep1Hint', '💡 Astuce : Les playlists sont sauvegardées automatiquement.'),
    target: () => {
      // Chercher le bouton "Nouvelle playlist"
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Nouvelle playlist') || btn.textContent.includes('New playlist'))) {
          return btn;
        }
      }
      return document.querySelector('.btn-primary:has(.ti-plus)') || document.querySelector('[class*="new-playlist"]');
    },
    fallbackTarget: '.sequencer-sidebar .btn-primary',
  },
  {
    id: 'sequencer-step2',
    icon: '➕',
    title: t('tutorialSequencerStep2Title', 'Ajouter des sons à la playlist'),
    description: t('tutorialSequencerStep2Desc', 'Cliquez sur "Ajouter des sons" pour sélectionner des sons depuis votre bibliothèque. Vous pouvez définir un délai entre chaque son.'),
    hint: t('tutorialSequencerStep2Hint', '💡 Astuce : Glissez-déposez les sons pour les réorganiser dans la playlist.'),
    target: () => {
      // Chercher le bouton "Ajouter des sons"
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Ajouter des sons') || btn.textContent.includes('Add sounds'))) {
          return btn;
        }
      }
      return document.querySelector('.sequencer-toolbar .btn-secondary') || document.querySelector('[class*="add-sounds"]');
    },
    fallbackTarget: '.sequencer-toolbar button:last-child',
  },
  {
    id: 'sequencer-step3',
    icon: '▶️',
    title: t('tutorialSequencerStep3Title', 'Lancer la séquence'),
    description: t('tutorialSequencerStep3Desc', 'Appuyez sur le bouton "Play" pour lancer la séquence. Utilisez les touches ← et → pour naviguer manuellement.'),
    hint: t('tutorialSequencerStep3Hint', '💡 Astuce : Activez la boucle pour répéter la playlist en continu.'),
    target: () => {
      // Chercher le bouton "Play" ou "Lancer"
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        const icon = btn.querySelector('.ti-player-play, .ti-player-play-filled');
        if (icon) return btn;
        if (btn.textContent && (btn.textContent.includes('Play') || btn.textContent.includes('Lancer'))) {
          return btn;
        }
      }
      return document.querySelector('.btn-primary:has(.ti-player-play)');
    },
    fallbackTarget: '.sequencer-controls .btn-primary',
  },
];