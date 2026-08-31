// src/plugins/youtube/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'youtube-step1',
    icon: '▶️',
    title: t('tutorialYoutubeStep1Title', 'Coller un lien YouTube'),
    description: t('tutorialYoutubeStep1Desc', 'Collez l\'URL d\'une vidéo YouTube pour importer son audio dans SoundDeck.'),
    hint: t('tutorialYoutubeStep1Hint', '💡 Astuce : Fonctionne aussi avec YouTube Music et d\'autres plateformes.'),
    target: 'input[placeholder*="youtube"], input[placeholder*="YouTube"], input[type="url"]',
    fallbackTarget: '.youtube-url-input, .url-input',
  },
  {
    id: 'youtube-step2',
    icon: '✂️',
    title: t('tutorialYoutubeStep2Title', 'Sélectionner une portion'),
    description: t('tutorialYoutubeStep2Desc', 'Choisissez la portion de la vidéo à importer en ajustant les curseurs de début et de fin.'),
    hint: t('tutorialYoutubeStep2Hint', '💡 Astuce : Vous pouvez écouter la sélection avant de télécharger.'),
    target: 'input[type="range"], .trim-controls, .waveform-container',
    fallbackTarget: '.yt-trim-controls',
  },
  {
    id: 'youtube-step3',
    icon: '⬇️',
    title: t('tutorialYoutubeStep3Title', 'Télécharger et configurer'),
    description: t('tutorialYoutubeStep3Desc', 'Téléchargez l\'audio, puis configurez le nom, l\'image et les profils avant de l\'ajouter à votre bibliothèque.'),
    hint: t('tutorialYoutubeStep3Hint', '💡 Astuce : Vous pouvez ajouter une image personnalisée ou laisser l\'emoji par défaut.'),
    target: () => {
      const btn = document.querySelector('button[class*="download"], button:has(.ti-download)');
      if (btn) return btn;
      return document.querySelector('.btn-primary:last-child');
    },
    fallbackTarget: '.download-btn, .config-section',
  },
];