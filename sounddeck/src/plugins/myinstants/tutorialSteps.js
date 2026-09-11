// src/plugins/myinstants/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => [
  {
    id: 'discover-1',
    title: t('tutorialDiscoverStep1Title'),
    description: t('tutorialDiscoverStep1Desc'),
    icon: '🔍',
    target: '[data-testid="discover-search"]',
    fallbackTarget: '.discover-search, input[placeholder*="Rechercher"], input[type="search"]',
    hint: t('tutorialDiscoverStep1Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-2',
    title: t('tutorialDiscoverStep2Title'),
    description: t('tutorialDiscoverStep2Desc'),
    icon: '🔎',
    target: '[data-testid="discover-search"]',
    fallbackTarget: '.discover-search, input[placeholder*="Rechercher"], input[type="search"]',
    hint: t('tutorialDiscoverStep2Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-3',
    title: t('tutorialDiscoverStep3Title'),
    description: t('tutorialDiscoverStep3Desc'),
    icon: '📂',
    target: '[data-testid="discover-categories"]',
    fallbackTarget: '.discover-categories, [class*="category"], .categories-container',
    hint: t('tutorialDiscoverStep3Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-4',
    title: t('tutorialDiscoverStep4Title'),
    description: t('tutorialDiscoverStep4Desc'),
    icon: '✏️',
    target: '[data-testid="discover-category-editor-button"]',
    fallbackTarget: 'button:contains("Personnaliser les catégories")',
    hint: t('tutorialDiscoverStep4Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-5',
    title: t('tutorialDiscoverStep5Title'),
    description: t('tutorialDiscoverStep5Desc'),
    icon: '📋',
    target: '[data-testid="discover-category-editor-modal"]',
    fallbackTarget: '.modal, [class*="category-editor"]',
    hint: t('tutorialDiscoverStep5Hint'),
    position: 'right',
    action: 'click',
    actionTarget: '[data-testid="discover-category-editor-button"]',
    actionDelay: 300,
    afterShow: () => {
      setTimeout(() => {
        const editBtn = document.querySelector('[data-testid="discover-category-editor-button"]')
        if (editBtn) {
          editBtn.click()
        }
      }, 300)
    },
    onLeave: () => {
      setTimeout(() => {
        const saveBtn = document.querySelector('[data-testid="discover-category-editor-modal"] .btn-primary')
        if (saveBtn) {
          saveBtn.click()
          return
        }

        const cancelBtn = document.querySelector('[data-testid="discover-category-editor-modal"] .btn-secondary')
        if (cancelBtn) {
          cancelBtn.click()
          return
        }

        const overlay = document.querySelector('.modal-overlay')
        if (overlay) {
          overlay.click()
          return
        }

        const escEvent = new KeyboardEvent('keydown', { key: 'Escape' })
        document.dispatchEvent(escEvent)
      }, 100)
    }
  },
  {
    id: 'discover-6',
    title: t('tutorialDiscoverStep6Title'),
    description: t('tutorialDiscoverStep6Desc'),
    icon: '🎵',
    target: '[data-testid="discover-preview-button"]',
    fallbackTarget: '.sound-card:first-child',
    hint: t('tutorialDiscoverStep6Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-7',
    title: t('tutorialDiscoverStep7Title'),
    description: t('tutorialDiscoverStep7Desc'),
    icon: '📥',
    target: '[data-testid="discover-add-button"]',
    fallbackTarget: '.sound-card:first-child [class*="add"]',
    hint: t('tutorialDiscoverStep7Hint'),
    position: 'bottom',
  },
  {
    id: 'discover-8',
    title: t('tutorialDiscoverStep8Title'),
    description: t('tutorialDiscoverStep8Desc'),
    icon: '🚀',
    target: '[data-testid="discover-load-more"]',
    fallbackTarget: '.load-more',
    hint: t('tutorialDiscoverStep8Hint'),
    position: 'bottom',
  }
]