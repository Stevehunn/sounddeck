// src/plugins/myinstants/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'discover-1',
    title: t('tutorialDiscoverStep1Title') || 'Bienvenue dans la découverte',
    description: t('tutorialDiscoverStep1Desc') || 'Explorez une vaste bibliothèque de sons populaires depuis MyInstants.',
    icon: '🔍',
    target: '[data-testid="discover-search"]',
    fallbackTarget: '.discover-search, input[placeholder*="Rechercher"], input[type="search"]',
    hint: t('tutorialDiscoverStep1Hint') || '💡 Astuce : Utilisez la barre de recherche pour trouver des sons spécifiques.',
    position: 'bottom',
  },
  {
    id: 'discover-2',
    title: t('tutorialDiscoverStep2Title') || 'Rechercher des sons',
    description: t('tutorialDiscoverStep2Desc') || 'Tapez un mot-clé pour trouver des sons correspondants sur MyInstants.',
    icon: '🔎',
    target: '[data-testid="discover-search"]',
    fallbackTarget: '.discover-search, input[placeholder*="Rechercher"], input[type="search"]',
    hint: t('tutorialDiscoverStep2Hint') || '💡 Astuce : Essayez des mots-clés comme "laugh", "applause" ou "bruh".',
    position: 'bottom',
  },
  {
    id: 'discover-3',
    title: t('tutorialDiscoverStep3Title') || 'Parcourir les catégories',
    description: t('tutorialDiscoverStep3Desc') || 'Naviguez à travers les différentes catégories pour découvrir de nouveaux sons.',
    icon: '📂',
    target: '[data-testid="discover-categories"]',
    fallbackTarget: '.discover-categories, [class*="category"], .categories-container',
    hint: t('tutorialDiscoverStep3Hint') || '💡 Astuce : Les catégories vous aident à trouver des sons par thème.',
    position: 'bottom',
  },
  {
    id: 'discover-4',
    title: t('tutorialDiscoverStep4Title') || 'Personnaliser vos catégories',
    description: t('tutorialDiscoverStep4Desc') || 'Cliquez sur le bouton "Personnaliser les catégories" pour choisir les catégories que vous voulez voir.',
    icon: '✏️',
    target: '[data-testid="discover-category-editor-button"]',
    fallbackTarget: 'button:contains("Personnaliser les catégories"), button:contains("Customize categories"), button:contains("Personalizar categorías")',
    hint: t('tutorialDiscoverStep4Hint') || '💡 Astuce : Vous pouvez choisir les catégories qui vous intéressent le plus pour une navigation personnalisée.',
    position: 'bottom',
  },
  {
    id: 'discover-5',
    title: t('tutorialDiscoverStep5Title') || 'Choisir vos catégories',
    description: t('tutorialDiscoverStep5Desc') || 'Sélectionnez ou désélectionnez les catégories que vous souhaitez afficher dans la page Découverte.',
    icon: '📋',
    target: '[data-testid="discover-category-editor-modal"]',
    fallbackTarget: '.modal, [class*="category-editor"], [class*="category-modal"]',
    hint: t('tutorialDiscoverStep5Hint') || '💡 Astuce : Vous pouvez sélectionner toutes les catégories ou seulement celles qui vous intéressent.',
    position: 'right',
    action: 'click',
    actionTarget: '[data-testid="discover-category-editor-button"]',
    actionDelay: 300,
    afterShow: () => {
      // ✅ Ouvrir le menu automatiquement
      setTimeout(() => {
        const editBtn = document.querySelector('[data-testid="discover-category-editor-button"]')
        if (editBtn) {
          editBtn.click()
        }
      }, 300)
    },
    // ✅ Fonction pour fermer le menu quand on quitte l'étape
    onLeave: () => {
      console.log('🔚 [Tutorial] Fermeture du menu des catégories')
      
      // ✅ Méthode 1: Cliquer sur le bouton "Sauvegarder" pour fermer le modal
      const saveBtn = document.querySelector('[data-testid="discover-category-editor-modal"] .btn-primary')
      if (saveBtn) {
        console.log('  ✅ Clic sur le bouton Sauvegarder')
        saveBtn.click()
        return
      }
      
      // ✅ Méthode 2: Cliquer sur le bouton "Annuler" si présent
      const cancelBtn = document.querySelector('[data-testid="discover-category-editor-modal"] .btn-secondary')
      if (cancelBtn) {
        console.log('  ✅ Clic sur le bouton Annuler')
        cancelBtn.click()
        return
      }
      
      // ✅ Méthode 3: Cliquer sur l'overlay (fond) pour fermer
      const overlay = document.querySelector('.modal-overlay')
      if (overlay) {
        console.log('  ✅ Clic sur l\'overlay pour fermer')
        overlay.click()
        return
      }
      
      // ✅ Méthode 4: Appuyer sur la touche Escape
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escEvent)
      console.log('  ✅ Envoi de la touche Escape')
    }
  },
  {
    id: 'discover-6',
    title: t('tutorialDiscoverStep6Title') || 'Écouter un son',
    description: t('tutorialDiscoverStep6Desc') || 'Cliquez sur le bouton "Écouter" pour prévisualiser le son avant de l\'importer.',
    icon: '🎵',
    target: '[data-testid="discover-preview-button"]',
    fallbackTarget: '.sound-card:first-child, .discover-sound:first-child, [class*="sound-card"]:first-child',
    hint: t('tutorialDiscoverStep6Hint') || '💡 Astuce : Vous pouvez écouter le son en entier avant de décider de l\'importer.',
    position: 'bottom',
  },
  {
    id: 'discover-7',
    title: t('tutorialDiscoverStep7Title') || 'Ajouter un son à votre bibliothèque',
    description: t('tutorialDiscoverStep7Desc') || 'Cliquez sur le bouton "Ajouter" pour importer le son dans votre bibliothèque SoundDeck.',
    icon: '📥',
    target: '[data-testid="discover-add-button"]',
    fallbackTarget: '.sound-card:first-child [class*="add"], .discover-sound:first-child [class*="add"]',
    hint: t('tutorialDiscoverStep7Hint') || '💡 Astuce : Le son sera téléchargé et ajouté à votre bibliothèque. Vous pourrez ensuite le personnaliser.',
    position: 'bottom',
  },
  {
    id: 'discover-8',
    title: t('tutorialDiscoverStep8Title') || 'Explorer plus de sons',
    description: t('tutorialDiscoverStep8Desc') || 'Continuez à explorer et à importer des sons pour enrichir votre bibliothèque !',
    icon: '🚀',
    target: '[data-testid="discover-load-more"]',
    fallbackTarget: '.load-more, button:contains("Charger plus"), button:contains("Voir plus"), .pagination button:last-child',
    hint: t('tutorialDiscoverStep8Hint') || '💡 Astuce : Plus vous explorez, plus vous trouverez de sons pour vos projets !',
    position: 'bottom',
  }
]