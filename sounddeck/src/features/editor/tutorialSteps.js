// src/features/editor/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'editor-step1',
    icon: '🎚️',
    title: t('tutorialEditorStep1Title', 'Ajouter une piste'),
    description: t('tutorialEditorStep1Desc', 'Cliquez sur le bouton "Ajouter une piste" pour créer une nouvelle piste. Chaque piste peut contenir plusieurs clips audio.'),
    hint: t('tutorialEditorStep1Hint', '💡 Astuce : Vous pouvez glisser-déposer des fichiers audio directement dans l\'éditeur.'),
    // ✅ Sélecteur compatible - on cherche par texte ou attribut
    target: () => {
      // Chercher par attribut data-action
      let el = document.querySelector('[data-action="add-track"]');
      if (el) return el;
      
      // Chercher par titre
      el = document.querySelector('button[title*="Ajouter une piste"]');
      if (el) return el;
      
      // Chercher par texte (parcours des boutons)
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.includes('Ajouter une piste')) {
          return btn;
        }
        if (btn.textContent && btn.textContent.includes('Add track')) {
          return btn;
        }
      }
      
      // Chercher par icône + texte
      const toolbar = document.querySelector('.editor-toolbar');
      if (toolbar) {
        const btns = toolbar.querySelectorAll('button');
        for (const btn of btns) {
          const icon = btn.querySelector('.ti-plus');
          if (icon && btn.textContent && btn.textContent.includes('Piste')) {
            return btn;
          }
        }
      }
      
      return null;
    },
    fallbackTarget: '.editor-toolbar button:first-child',
  },
  {
    id: 'editor-step2',
    icon: '✂️',
    title: t('tutorialEditorStep2Title', 'Déplacer et rogner un clip'),
    description: t('tutorialEditorStep2Desc', 'Faites glisser un clip pour le déplacer. Utilisez les poignées sur les bords pour rogner ou couper le clip.'),
    hint: t('tutorialEditorStep2Hint', '💡 Astuce : Double-cliquez sur un clip pour l\'éditer rapidement.'),
    // ✅ Cibler le premier clip
    target: () => {
      const clip = document.querySelector('.editor-clip-wrapper');
      if (clip) return clip;
      return document.querySelector('.editor-track .clip');
    },
    fallbackTarget: '.editor-clip-wrapper',
  },
  {
    id: 'editor-step3',
    icon: '✨',
    title: t('tutorialEditorStep3Title', 'Ajouter des effets'),
    description: t('tutorialEditorStep3Desc', 'Sélectionnez un clip, puis ouvrez le panneau des effets. Vous pouvez ajouter Fade In/Out, écho, réverbération...'),
    hint: t('tutorialEditorStep3Hint', '💡 Astuce : L\'auto-preview vous permet d\'entendre les effets en temps réel.'),
    // ✅ Sélecteur compatible
    target: () => {
      // Chercher par attribut data-action
      let el = document.querySelector('[data-action="effects-panel"]');
      if (el) return el;
      
      // Chercher par titre
      el = document.querySelector('button[title*="Effets"]');
      if (el) return el;
      
      // Chercher par icône
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('.ti-wand');
        if (icon) return btn;
      }
      
      return null;
    },
    fallbackTarget: '.effects-panel-toggle, .editor-toolbar button:has(.ti-wand)',
  },
  {
    id: 'editor-step4',
    icon: '🔁',
    title: t('tutorialEditorStep4Title', 'Activer une boucle'),
    description: t('tutorialEditorStep4Desc', 'Cliquez sur la zone de boucle ou utilisez le bouton "Loop" pour répéter automatiquement une section.'),
    hint: t('tutorialEditorStep4Hint', '💡 Astuce : Vous pouvez définir une boucle sur un clip individuel ou sur toute la timeline.'),
    // ✅ Sélecteur compatible
    target: () => {
      // Chercher par attribut data-action
      let el = document.querySelector('[data-action="toggle-loop"]');
      if (el) return el;
      
      // Chercher par titre
      el = document.querySelector('button[title*="Boucle"]');
      if (el) return el;
      
      // Chercher par icône
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('.ti-repeat');
        if (icon) return btn;
      }
      
      // Chercher la zone de boucle
      el = document.querySelector('.timeline-loop');
      if (el) return el;
      
      return null;
    },
    fallbackTarget: '.timeline-loop, .loop-btn',
  },
];