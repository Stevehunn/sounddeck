// src/features/stats/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'stats-1',
    title: t('tutorialStatsStep1Title'),
    description: t('tutorialStatsStep1Desc'),
    icon: '📊',
    target: '[data-testid="stats-container"]',
    fallbackTarget: '.stats-grid, .stat-cards',
    hint: t('tutorialStatsStep1Hint'),
    position: 'bottom',
  },
  {
    id: 'stats-2',
    title: t('tutorialStatsStep2Title'),
    description: t('tutorialStatsStep2Desc'),
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
    hint: t('tutorialStatsStep2Hint'),
    position: 'bottom',
  },
  {
    id: 'stats-3',
    title: t('tutorialStatsStep3Title'),
    description: t('tutorialStatsStep3Desc'),
    icon: '📅',
    target: '[data-testid="stats-filters"]',
    fallbackTarget: '.stats-filters, .period-selector',
    hint: t('tutorialStatsStep3Hint'),
    position: 'bottom',
  },
  {
    id: 'stats-4',
    title: t('tutorialStatsStep4Title'),
    description: t('tutorialStatsStep4Desc'),
    icon: '🏆',
    target: '[data-testid="stats-top-sounds"]',
    fallbackTarget: '.top-sounds, [class*="top-sounds"]',
    hint: t('tutorialStatsStep4Hint'),
    position: 'top',
  },
  {
    id: 'stats-5',
    title: t('tutorialStatsStep5Title'),
    description: t('tutorialStatsStep5Desc'),
    icon: '👥',
    target: '[data-testid="stats-profiles"]',
    fallbackTarget: '.profile-stats, [class*="profile-stats"]',
    hint: t('tutorialStatsStep5Hint'),
    position: 'top',
  },
]