// src/features/options/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'options-step1',
    icon: '🎨',
    title: t('tutorialOptionsStep1Title', 'Personnaliser l\'apparence'),
    description: t('tutorialOptionsStep1Desc', 'Changez le thème (sombre, clair, personnalisé), la taille des cartes et la langue de l\'application.'),
    hint: t('tutorialOptionsStep1Hint', '💡 Astuce : Le thème automatique s\'adapte à l\'heure de la journée.'),
    target: () => {
      // Chercher la section Apparence
      const sections = document.querySelectorAll('[data-section="appearance"], .options-appearance, .appearance-section');
      for (const section of sections) {
        if (section) return section;
      }
      // Chercher le sélecteur de thème
      const themeSelect = document.querySelector('[class*="theme-select"], .theme-selector, select:has(option[value="dark"])');
      if (themeSelect) return themeSelect;
      return document.querySelector('.options-section:first-child');
    },
    fallbackTarget: '.options-appearance, .appearance-section',
  },
  {
    id: 'options-step2',
    icon: '🎛️',
    title: t('tutorialOptionsStep2Title', 'Configurer l\'audio'),
    description: t('tutorialOptionsStep2Desc', 'Configurez le mixeur pour Discord, sélectionnez votre micro et réglez les volumes.'),
    hint: t('tutorialOptionsStep2Hint', '💡 Astuce : Activez le monitoring pour vous entendre dans vos écouteurs.'),
    target: () => {
      // Chercher la section Audio
      const sections = document.querySelectorAll('[data-section="audio"], .options-audio, .audio-section');
      for (const section of sections) {
        if (section) return section;
      }
      // Chercher le toggle du mixeur
      const toggle = document.querySelector('.toggle:has(.knob), [class*="mixer-toggle"]');
      if (toggle) return toggle;
      return document.querySelector('.options-section:nth-child(2)');
    },
    fallbackTarget: '.options-audio, .audio-section',
  },
  {
    id: 'options-step3',
    icon: '⌨️',
    title: t('tutorialOptionsStep3Title', 'Gérer les raccourcis'),
    description: t('tutorialOptionsStep3Desc', 'Définissez vos raccourcis clavier pour changer de profil, activer la boucle ou arrêter tous les sons.'),
    hint: t('tutorialOptionsStep3Hint', '💡 Astuce : Le visualisateur de clavier montre toutes les touches utilisées.'),
    target: () => {
      // Chercher la section Raccourcis
      const sections = document.querySelectorAll('[data-section="shortcuts"], .options-shortcuts, .shortcuts-section');
      for (const section of sections) {
        if (section) return section;
      }
      // Chercher le visualisateur de clavier
      const visualizer = document.querySelector('[class*="keyboard-visualizer"]');
      if (visualizer) return visualizer;
      return document.querySelector('.options-section:nth-child(3)');
    },
    fallbackTarget: '.options-shortcuts, .shortcuts-section',
  },
];