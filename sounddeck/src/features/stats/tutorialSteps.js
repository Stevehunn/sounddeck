// src/features/stats/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => {
  console.log('🔍 [TUTORIAL] STATS TUTORIAL_STEPS appelé avec la fonction t:', typeof t)
  
  const steps = [
    {
      id: 'stats-1',
      title: t('tutorialStatsStep1Title') || 'Vue d\'ensemble des statistiques',
      description: t('tutorialStatsStep1Desc') || 'Cette page affiche toutes vos statistiques d\'utilisation : nombre total de sons, lectures, profils, tags et favoris.',
      icon: '📊',
      target: '[data-testid="stats-container"]',
      fallbackTarget: '.stats-grid, .stat-cards',
      hint: t('tutorialStatsStep1Hint') || '💡 Astuce : Les statistiques sont mises à jour en temps réel à chaque lecture.',
      position: 'bottom',
    },
    {
      id: 'stats-2',
      title: t('tutorialStatsStep2Title') || 'Cartes de statistiques',
      description: t('tutorialStatsStep2Desc') || 'Chaque carte affiche une statistique clé : nombre total de sons, lectures, profils, tags et favoris.',
      icon: '📈',
      target: () => {
        const cards = document.querySelectorAll('[data-testid="stat-card"]');
        if (cards.length > 0) return cards[0];
        const grid = document.querySelector('.stats-grid');
        if (grid) {
          const firstChild = grid.querySelector('div, [class*="stat"]');
          if (firstChild) return firstChild;
        }
        return null;
      },
      fallbackTarget: '.stats-grid, .stat-cards',
      hint: t('tutorialStatsStep2Hint') || '💡 Astuce : Les cartes avec une icône 🎵 montrent le total des sons, 🏆 les plus joués.',
      position: 'bottom',
    },
    {
      id: 'stats-3',
      title: t('tutorialStatsStep3Title') || 'Filtrer par période',
      description: t('tutorialStatsStep3Desc') || 'Utilisez les boutons de filtre pour afficher les statistiques sur différentes périodes : Tout, Semaine ou Mois.',
      icon: '📅',
      target: '[data-testid="stats-filters"]',
      fallbackTarget: '.stats-filters, .period-selector',
      hint: t('tutorialStatsStep3Hint') || '💡 Astuce : Les données sont conservées même après un redémarrage de l\'application.',
      position: 'bottom',
    },
    {
      id: 'stats-4',
      title: t('tutorialStatsStep4Title') || 'Top 10 des sons les plus joués',
      description: t('tutorialStatsStep4Desc') || 'Cette section affiche vos 10 sons les plus écoutés. Le numéro 1 est votre son le plus populaire !',
      icon: '🏆',
      target: '[data-testid="stats-top-sounds"]',
      fallbackTarget: '.top-sounds, [class*="top-sounds"]',
      hint: t('tutorialStatsStep4Hint') || '💡 Astuce : Les sons sont triés par nombre de lectures décroissant.',
      position: 'top',
    },
    {
      id: 'stats-5',
      title: t('tutorialStatsStep5Title') || 'Répartition des sons par profil',
      description: t('tutorialStatsStep5Desc') || 'Visualisez la répartition de vos sons entre vos différents profils. Chaque profil affiche le nombre de sons qu\'il contient.',
      icon: '👥',
      target: '[data-testid="stats-profiles"]',
      fallbackTarget: '.profile-stats, [class*="profile-stats"]',
      hint: t('tutorialStatsStep5Hint') || '💡 Astuce : Le profil "Tous les sons" affiche le total de tous vos sons.',
      position: 'top',
    },
  ]
  
  console.log('📋 [TUTORIAL] Stats Steps générés:', steps.length)
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.id}:`)
    console.log(`     title: "${step.title}"`)
    console.log(`     target: "${step.target}"`)
  })
  
  return steps
}