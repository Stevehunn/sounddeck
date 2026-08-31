// src/features/trimmer/tutorialSteps.js

/**
 * Sélectionne automatiquement le premier son de la liste
 */
function selectFirstSound() {
  console.log('🔍 [Tutorial] Tentative de sélection automatique du premier son...');
  
  // 1. Chercher le premier élément de la liste
  const items = document.querySelectorAll('[data-testid^="sound-list-item-"]');
  const firstItem = items[0];
  
  if (firstItem) {
    console.log('✅ [Tutorial] Premier son trouvé:', firstItem);
    
    // Vérifier si déjà actif
    if (firstItem.dataset.active === 'true') {
      console.log('✅ [Tutorial] Son déjà sélectionné');
      return firstItem;
    }
    
    // Cliquer pour sélectionner
    try {
      firstItem.click();
      console.log('✅ [Tutorial] Clic sur le premier son effectué');
      
      // Forcer l'événement de clic
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      firstItem.dispatchEvent(clickEvent);
      
      return firstItem;
    } catch (e) {
      console.warn('⚠️ [Tutorial] Erreur lors du clic:', e);
      return firstItem;
    }
  }
  
  // 2. Fallback: chercher un élément .sidebar-item
  const fallback = document.querySelector('.sidebar-item:not([style*="display: none"])');
  if (fallback) {
    console.log('✅ [Tutorial] Son trouvé par fallback');
    try {
      fallback.click();
    } catch (e) {}
    return fallback;
  }
  
  console.log('❌ [Tutorial] Aucun son trouvé');
  return null;
}

/**
 * Recherche un élément avec retry automatique
 */
function findElementWithRetry(findFn, maxRetries = 8, delay = 300) {
  let attempts = 0;
  
  const search = () => {
    attempts++;
    console.log(`🔍 [Tutorial] Recherche tentative ${attempts}/${maxRetries}...`);
    
    const result = typeof findFn === 'function' ? findFn() : document.querySelector(findFn);
    
    if (result && (result.offsetParent !== null || result.getClientRects().length > 0)) {
      console.log('✅ [Tutorial] Élément trouvé');
      return result;
    }
    
    if (attempts >= maxRetries) {
      console.log('❌ [Tutorial] Élément non trouvé après', maxRetries, 'tentatives');
      return null;
    }
    
    // Attendre puis réessayer
    setTimeout(search, delay);
    return null;
  };
  
  return search();
}

export const TUTORIAL_STEPS = (t) => [
  // ─── ÉTAPE 1 : Sélectionner un son ──────────────────────────────────
  {
    id: 'trimmer-step1',
    icon: '🎯',
    title: t('tutorialTrimmerStep1Title'),
    description: t('tutorialTrimmerStep1Desc'),
    hint: t('tutorialTrimmerStep1Hint'),
    target: () => {
      // D'abord, sélectionner automatiquement le premier son
      const selected = selectFirstSound();
      if (selected) return selected;
      
      // Sinon, chercher un élément de la liste
      return findElementWithRetry(() => {
        return document.querySelector('[data-testid^="sound-list-item-"], .sidebar-item:not([style*="display: none"])');
      }, 8, 300);
    },
    fallbackTarget: '.sidebar-item:first-child',
  },

  // ─── ÉTAPE 2 : Le waveform et les poignées ──────────────────────────
  {
    id: 'trimmer-step2',
    icon: '📊',
    title: t('tutorialTrimmerStep2Title'),
    description: t('tutorialTrimmerStep2Desc'),
    hint: t('tutorialTrimmerStep2Hint'),
    target: () => {
      return findElementWithRetry(() => {
        return document.querySelector('[data-testid="trimmer-waveform-container"], .waveform-container, canvas');
      }, 8, 300);
    },
    fallbackTarget: '.waveform-container, canvas',
  },

  // ─── ÉTAPE 3 : Écouter la sélection ──────────────────────────────────
  {
    id: 'trimmer-step3',
    icon: '👂',
    title: t('tutorialTrimmerStep3Title'),
    description: t('tutorialTrimmerStep3Desc'),
    hint: t('tutorialTrimmerStep3Hint'),
    target: () => {
      return findElementWithRetry(() => {
        return document.querySelector('[data-testid="trimmer-listen-button"]');
      }, 8, 300);
    },
    fallbackTarget: '.btn-secondary:has(.ti-player-play)',
  },

  // ─── ÉTAPE 4 : Personnaliser le son ─────────────────────────────────
  {
    id: 'trimmer-step4',
    icon: '🎨',
    title: t('tutorialTrimmerStep4Title'),
    description: t('tutorialTrimmerStep4Desc'),
    hint: t('tutorialTrimmerStep4Hint'),
    target: () => {
      return findElementWithRetry(() => {
        // Chercher le champ de nom
        const nameInput = document.querySelector('[data-testid="trimmer-name-input"], input[placeholder*="Nom"], input[placeholder*="Name"], input[placeholder*="Nombre"]');
        if (nameInput && nameInput.offsetParent !== null) return nameInput;
        
        // Chercher la section d'aperçu
        const preview = document.querySelector('[class*="preview"], .editor-preview');
        if (preview && preview.offsetParent !== null) return preview;
        
        return document.querySelector('.sound-editor-options, .editor-options');
      }, 8, 300);
    },
    fallbackTarget: '.editor-preview, .sound-editor-options',
  },

  // ─── ÉTAPE 5 : Créer le son ──────────────────────────────────────────
  {
    id: 'trimmer-step5',
    icon: '✅',
    title: t('tutorialTrimmerStep5Title'),
    description: t('tutorialTrimmerStep5Desc'),
    hint: t('tutorialTrimmerStep5Hint'),
    target: () => {
      return findElementWithRetry(() => {
        return document.querySelector('[data-testid="trimmer-create-button"]');
      }, 8, 300);
    },
    fallbackTarget: '.btn-primary:has(.ti-check)',
  },

  // ─── ÉTAPE 6 : Rechercher un son ─────────────────────────────────────
  {
    id: 'trimmer-step6',
    icon: '🔍',
    title: t('tutorialTrimmerStep6Title'),
    description: t('tutorialTrimmerStep6Desc'),
    hint: t('tutorialTrimmerStep6Hint'),
    target: () => {
      return findElementWithRetry(() => {
        return document.querySelector('[data-testid="trimmer-search-input"]');
      }, 8, 300);
    },
    fallbackTarget: '.sidebar input[type="text"], .sidebar input[type="search"]',
  },
];