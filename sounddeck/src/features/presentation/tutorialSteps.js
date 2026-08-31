// src/features/presentation/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'presentation-step1',
    icon: '🖥️',
    title: t('tutorialPresentationStep1Title', 'Mode présentation'),
    description: t('tutorialPresentationStep1Desc', 'Affichez vos sons en plein écran pour une présentation. Idéal pour les streams ou les réunions.'),
    hint: t('tutorialPresentationStep1Hint', '💡 Astuce : Appuyez sur Échap pour quitter le mode présentation.'),
    target: () => {
      // Chercher le bouton "Présentation" ou "Presentation"
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Présentation') || btn.textContent.includes('Presentation'))) {
          return btn;
        }
        const icon = btn.querySelector('.ti-layout-grid, .ti-presentation');
        if (icon) return btn;
      }
      return document.querySelector('.presentation-btn, .presentation-toggle');
    },
    fallbackTarget: '.sidebar-item:has(.ti-layout-grid)',
  },
  {
    id: 'presentation-step2',
    icon: '🖱️',
    title: t('tutorialPresentationStep2Title', 'Naviguer entre les sons'),
    description: t('tutorialPresentationStep2Desc', 'Utilisez la souris ou les touches fléchées pour naviguer entre les sons en mode présentation.'),
    hint: t('tutorialPresentationStep2Hint', '💡 Astuce : Les sons favoris sont affichés en premier.'),
    target: () => {
      // Chercher une carte de présentation
      const card = document.querySelector('.presentation-card, .presentation-grid > div');
      if (card) return card;
      return document.querySelector('.presentation-grid');
    },
    fallbackTarget: '.presentation-grid, .presentation-cards',
  },
];