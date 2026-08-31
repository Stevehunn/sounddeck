// src/features/stats/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'stats-step1',
    icon: '📊',
    title: t('tutorialStatsStep1Title', 'Voir vos statistiques'),
    description: t('tutorialStatsStep1Desc', 'Consultez vos sons les plus joués, le nombre total de lectures et vos statistiques d\'utilisation.'),
    hint: t('tutorialStatsStep1Hint', '💡 Astuce : Les statistiques sont mises à jour en temps réel.'),
    target: () => {
      // Chercher les cartes de statistiques
      const cards = document.querySelectorAll('.stat-card, [class*="stat-card"], .stats-grid > div');
      if (cards.length > 0) return cards[0];
      return document.querySelector('.stats-container, .stats-grid');
    },
    fallbackTarget: '.stats-grid, .stat-cards',
  },
  {
    id: 'stats-step2',
    icon: '📅',
    title: t('tutorialStatsStep2Title', 'Filtrer par période'),
    description: t('tutorialStatsStep2Desc', 'Affichez les statistiques pour différentes périodes : aujourd\'hui, cette semaine, ce mois-ci ou tout le temps.'),
    hint: t('tutorialStatsStep2Hint', '💡 Astuce : Les données sont conservées même après un redémarrage de l\'application.'),
    target: () => {
      // Chercher les boutons de filtre
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent && (btn.textContent.includes('Aujourd\'hui') || btn.textContent.includes('Today') || 
            btn.textContent.includes('Semaine') || btn.textContent.includes('Week'))) {
          return btn;
        }
      }
      return document.querySelector('.stats-filters, .period-selector');
    },
    fallbackTarget: '.stats-filters, .period-selector',
  },
];