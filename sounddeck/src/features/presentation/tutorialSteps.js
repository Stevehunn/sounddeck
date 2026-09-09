// src/features/presentation/tutorialSteps.js

// ✅ Clé utilisée pour marquer les favoris ajoutés par le tutoriel
const TUTORIAL_FAVORITE_TAG = '__tutorial_temp__'

export const TUTORIAL_STEPS = (t) => {
  console.log('🔍 [TUTORIAL] PRESENTATION TUTORIAL_STEPS appelé avec la fonction t:', typeof t)
  
  const steps = [
    {
      id: 'presentation-1',
      title: t('tutorialPresentationStep1Title') || 'Mode présentation',
      description: t('tutorialPresentationStep1Desc') || 'Le mode présentation affiche vos sons en plein écran. Idéal pour les streams, les réunions ou les démonstrations.',
      icon: '🖥️',
      target: '[data-testid="presentation-container"]',
      fallbackTarget: '.presentation-overlay',
      hint: t('tutorialPresentationStep1Hint') || '💡 Astuce : Appuyez sur Échap (Esc) pour quitter le mode présentation à tout moment.',
      position: 'bottom',
    },
    {
      id: 'presentation-2',
      title: t('tutorialPresentationStep2Title') || 'Barre de recherche',
      description: t('tutorialPresentationStep2Desc') || 'Utilisez la barre de recherche pour trouver rapidement un son par nom.',
      icon: '🔍',
      target: '[data-testid="presentation-search"]',
      fallbackTarget: '.presentation-header input[type="text"]',
      hint: t('tutorialPresentationStep2Hint') || '💡 Astuce : La recherche est instantanée, les résultats se mettent à jour en temps réel.',
      position: 'bottom',
    },
    {
      id: 'presentation-3',
      title: t('tutorialPresentationStep3Title') || 'Favoris en avant',
      description: t('tutorialPresentationStep3Desc') || 'Les sons favoris sont affichés en premier, dans une section dédiée en haut de la présentation.',
      icon: '⭐',
      target: () => {
        console.log('🎯 [Tutorial] Recherche de la section favoris...')
        const favoritesSection = document.querySelector('[data-testid="presentation-favorites"]');
        if (favoritesSection && favoritesSection.offsetParent !== null) {
          console.log('✅ [Tutorial] Section favoris trouvée par data-testid')
          return favoritesSection;
        }
        console.log('⚠️ [Tutorial] Section favoris non trouvée, fallback sur le conteneur')
        return document.querySelector('.presentation-overlay') || document.body;
      },
      fallbackTarget: '.presentation-favorites, .presentation-overlay',
      hint: t('tutorialPresentationStep3Hint') || '💡 Astuce : Ajoutez des sons aux favoris depuis la page d\'accueil pour les retrouver facilement ici.',
      position: 'bottom',
    },
    {
      id: 'presentation-4',
      title: t('tutorialPresentationStep4Title') || 'Jouer un son',
      description: t('tutorialPresentationStep4Desc') || 'Cliquez sur une carte pour lancer le son. Pendant la lecture, une barre de progression et des ondes animées apparaissent.',
      icon: '🎵',
      target: () => {
        const cards = document.querySelectorAll('[data-testid="presentation-card"]');
        if (cards.length > 0) return cards[0];
        const card = document.querySelector('.presentation-card');
        if (card && card.offsetParent !== null) return card;
        return document.querySelector('.presentation-grid > div, [class*="presentation-card"]');
      },
      fallbackTarget: '.presentation-grid, .presentation-cards',
      hint: t('tutorialPresentationStep4Hint') || '💡 Astuce : Cliquez à nouveau sur le son en cours de lecture pour l\'arrêter.',
      position: 'top',
    },
    {
      id: 'presentation-5',
      title: t('tutorialPresentationStep5Title') || 'Taille des cartes',
      description: t('tutorialPresentationStep5Desc') || 'La taille des cartes s\'adapte automatiquement à vos préférences (Petite, Moyenne ou Grande).',
      icon: '📐',
      target: '[data-testid="presentation-grid"]',
      fallbackTarget: '.presentation-grid',
      hint: t('tutorialPresentationStep5Hint') || '💡 Astuce : Ajustez la taille des cartes dans les options de SoundDeck.',
      position: 'top',
    },
    {
      id: 'presentation-6',
      title: t('tutorialPresentationStep6Title') || 'Raccourcis clavier',
      description: t('tutorialPresentationStep6Desc') || 'Chaque carte affiche son raccourci clavier si vous en avez défini un. Pratique pour lancer vos sons sans souris !',
      icon: '⌨️',
      target: () => {
        const cards = document.querySelectorAll('[data-testid="presentation-card"]');
        for (const card of cards) {
          const shortcut = card.querySelector('kbd, [class*="shortcut"]');
          if (shortcut) return card;
        }
        return document.querySelector('.presentation-card kbd')?.closest('.presentation-card') || null;
      },
      fallbackTarget: '.presentation-card kbd',
      hint: t('tutorialPresentationStep6Hint') || '💡 Astuce : Définissez vos raccourcis dans la page Options pour une utilisation encore plus rapide.',
      position: 'top',
    },
  ]
  
  console.log('📋 [TUTORIAL] Presentation Steps générés:', steps.length)
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.id}:`)
    console.log(`     title: "${step.title}"`)
    console.log(`     target: "${step.target}"`)
  })
  
  return steps
}

// ✅ Fonction exportée pour nettoyer les favoris temporaires (appelée à la fin du tutoriel)
export const cleanupTutorialFavorites = (store) => {
  if (!store) return
  
  console.log('🧹 [Tutorial] Nettoyage des favoris temporaires...')
  
  const currentProfileId = store.currentProfileId
  const allSounds = store.sounds || []
  
  // ✅ Trouver les sons qui ont été marqués comme temporaires
  const tutorialFavorites = allSounds.filter(s => 
    s.favorites && 
    s.favorites.includes(currentProfileId) && 
    s._tutorialTemp === true
  )
  
  if (tutorialFavorites.length === 0) {
    console.log('✅ [Tutorial] Aucun favori temporaire à nettoyer')
    return
  }
  
  console.log(`📌 [Tutorial] Suppression de ${tutorialFavorites.length} favori(s) temporaire(s)`)
  
  // ✅ Retirer les favoris temporaires
  for (const sound of tutorialFavorites) {
    if (store.toggleFavorite) {
      console.log(`📌 [Tutorial] Suppression du favori temporaire: ${sound.name}`)
      store.toggleFavorite(sound.id)
      // ✅ Marquer comme non-temporaire pour éviter une suppression double
      store.updateSound(sound.id, { _tutorialTemp: false })
    }
  }
}