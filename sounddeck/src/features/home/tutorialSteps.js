// src/features/home/tutorialSteps.js

/**
 * Recherche un élément par sélecteur avec fallback
 */
function findElement(selectors) {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch (e) {
      // Ignorer les erreurs de sélecteur
    }
  }
  return null;
}

/**
 * Recherche le premier son dans la grille
 */
function findFirstSound() {
  const card = document.querySelector('.sound-card:not([style*="display: none"])');
  if (card) return card;
  return document.querySelector('.sound-grid .sound-card:first-child, .sound-card:first-child');
}

/**
 * Recherche le bouton "Ajouter un son" dans l'en-tête
 */
function findAddSoundButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Ajouter un son"...');
  
  // Recherche par texte
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const btnText = btn.textContent?.trim() || '';
    if (btnText === 'Ajouter un son' || 
        btnText === 'Add sound' || 
        btnText === 'Agregar sonido') {
      console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par texte');
      return btn;
    }
    // Recherche par icône + texte
    if (btn.querySelector('.ti-plus') && 
        (btnText.includes('Ajouter') || btnText.includes('Add') || btnText.includes('Agregar'))) {
      console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par icône + texte');
      return btn;
    }
  }
  
  // Recherche par classe ou attribut
  const addBtn = document.querySelector('.btn-primary:has(.ti-plus), [data-action="add-sound"]');
  if (addBtn) {
    console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par sélecteur');
    return addBtn;
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Ajouter un son" trouvé');
  return null;
}

/**
 * Recherche le bouton à trois points (menu contextuel)
 */
function findDotsButton() {
  console.log('🔍 [Tutorial] Recherche du bouton menu contextuel...');
  const card = findFirstSound();
  if (card) {
    console.log('📍 [Tutorial] Carte trouvée, recherche du bouton ⋮');
    const dotsBtn = card.querySelector('.ti-dots-vertical, .ti-dots, [class*="dots"]');
    if (dotsBtn) {
      const btn = dotsBtn.closest('button') || dotsBtn;
      console.log('✅ [Tutorial] Bouton ⋮ trouvé par classe');
      return btn;
    }
    const btns = card.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.querySelector('.ti-dots-vertical') || btn.querySelector('.ti-dots')) {
        console.log('✅ [Tutorial] Bouton ⋮ trouvé par icône');
        return btn;
      }
    }
    console.log('⚠️ [Tutorial] Aucun bouton ⋮ trouvé, retour de la carte');
    return card;
  }
  console.log('❌ [Tutorial] Aucune carte trouvée');
  return null;
}

/**
 * Recherche le bouton "Ajouter" dans la section "Autres sons"
 */
function findFirstOtherSoundAddButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Ajouter" dans une carte...');
  
  const allCards = document.querySelectorAll('.sound-card, [class*="card"], .outside-card');
  console.log(`📍 [Tutorial] ${allCards.length} cartes trouvées`);
  
  for (const card of allCards) {
    const style = card.style.opacity || window.getComputedStyle(card).opacity;
    const isOtherSound = parseFloat(style) < 0.9;
    
    if (isOtherSound) {
      console.log('📍 [Tutorial] Carte "Autres sons" trouvée');
      const buttons = card.querySelectorAll('button');
      for (const btn of buttons) {
        const btnText = btn.textContent?.trim() || '';
        if (btnText.includes('Ajouter') || btnText.includes('Add') || 
            btnText.includes('Agregar') || btnText.includes('Añadir')) {
          if (!btn.disabled) {
            console.log('✅ [Tutorial] Bouton "Ajouter" trouvé dans "Autres sons"');
            return btn;
          }
        }
        if (btn.querySelector('.ti-circle-plus, .ti-plus, .ti-plus-circle')) {
          if (!btn.disabled) {
            console.log('✅ [Tutorial] Bouton avec icône + trouvé dans "Autres sons"');
            return btn;
          }
        }
      }
      return card;
    }
  }
  
  console.log('🔍 [Tutorial] Recherche globale de boutons "Ajouter"...');
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const btnText = btn.textContent?.trim() || '';
    if ((btnText.includes('Ajouter') || btnText.includes('Add') || 
         btnText.includes('Agregar') || btnText.includes('Añadir')) &&
        !btnText.includes('Ajouter un son') && !btnText.includes('Add sound') &&
        !btn.closest('.home-header') && !btn.closest('.header')) {
      if (!btn.disabled) {
        console.log('✅ [Tutorial] Bouton "Ajouter" trouvé en fallback');
        return btn;
      }
    }
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Ajouter" trouvé');
  return null;
}

export const TUTORIAL_STEPS = (t) => [
  // ─── ÉTAPE 1 : Jouer un son ──────────────────────────────────────────
  {
    id: 'home-step1',
    icon: '🎵',
    title: t('tutorialHomeStep1Title'),
    description: t('tutorialHomeStep1Desc'),
    hint: t('tutorialHomeStep1Hint'),
    target: findFirstSound,
    fallbackTarget: '.sound-card:first-child',
  },

  // ─── ÉTAPE 2 : Ajouter un son ──────────────────────────────────────────
  {
    id: 'home-step2',
    icon: '➕',
    title: t('tutorialHomeStep2Title'),
    description: t('tutorialHomeStep2Desc'),
    hint: t('tutorialHomeStep2Hint'),
    target: findAddSoundButton,
    fallbackTarget: '.btn-primary:has(.ti-plus)',
  },

  // ─── ÉTAPE 3 : Favoris ────────────────────────────────────────────────
  {
    id: 'home-step3',
    icon: '⭐',
    title: t('tutorialHomeStep3Title'),
    description: t('tutorialHomeStep3Desc'),
    hint: t('tutorialHomeStep3Hint'),
    target: () => {
      const card = findFirstSound();
      if (card) {
        const starBtn = card.querySelector('.ti-star, .ti-star-filled, [class*="star"]');
        if (starBtn) return starBtn.closest('button') || starBtn;
        const btns = card.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.querySelector('.ti-star') || btn.querySelector('.ti-star-filled')) {
            return btn;
          }
        }
        return card;
      }
      return null;
    },
    fallbackTarget: '.sound-card:first-child button:has(.ti-star)',
  },

  // ─── ÉTAPE 4 : Menu contextuel - options ──────────────────────────────
  {
    id: 'home-step4',
    icon: '📋',
    title: t('tutorialHomeStep4Title'),
    description: t('tutorialHomeStep4Desc'),
    hint: t('tutorialHomeStep4Hint'),
    target: findDotsButton,
    fallbackTarget: '.sound-card:first-child button:has(.ti-dots-vertical)',
    action: 'click',
    actionDelay: 800,
  },

  // ─── ÉTAPE 5 : Profils ──────────────────────────────────────────────
  {
    id: 'home-step5',
    icon: '📂',
    title: t('tutorialHomeStep5Title'),
    description: t('tutorialHomeStep5Desc'),
    hint: t('tutorialHomeStep5Hint'),
    target: () => {
      const sidebar = document.querySelector('.sidebar, aside');
      if (sidebar) {
        const sections = sidebar.querySelectorAll('[class*="section"], [class*="group"]');
        for (const section of sections) {
          const title = section.querySelector('[class*="title"], [class*="label"]');
          if (title && title.textContent && 
              (title.textContent.includes('Profils') || 
               title.textContent.includes('Profiles') ||
               title.textContent.includes('Perfiles'))) {
            return section;
          }
        }
        const allSounds = sidebar.querySelector('[class*="item"]:has(.ti-stack)');
        if (allSounds) return allSounds.closest('[class*="section"]') || allSounds;
        return sidebar;
      }
      return null;
    },
    fallbackTarget: '.sidebar .profiles-section',
  },

  // ─── ÉTAPE 6 : Créer un nouveau profil ──────────────────────────────
  {
    id: 'home-step6',
    icon: '➕',
    title: t('tutorialHomeStep6Title'),
    description: t('tutorialHomeStep6Desc'),
    hint: t('tutorialHomeStep6Hint'),
    target: () => {
      const sidebar = document.querySelector('.sidebar, aside');
      if (sidebar) {
        const btns = sidebar.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent && 
              (btn.textContent.includes('Nouveau profil') || 
               btn.textContent.includes('New profile') ||
               btn.textContent.includes('Nuevo perfil'))) {
            return btn;
          }
          if (btn.querySelector('.ti-plus') && 
              btn.closest('[class*="section"]')?.querySelector('[class*="title"]')?.textContent?.includes('Profils')) {
            return btn;
          }
        }
        return sidebar.querySelector('[class*="new-profile"]');
      }
      return null;
    },
    fallbackTarget: '.sidebar .new-profile-btn',
  },

  // ─── ÉTAPE 7 : Ajouter un son depuis "Autres sons" ──────────────────
  {
    id: 'home-step7',
    icon: '📥',
    title: t('tutorialHomeStep7Title'),
    description: t('tutorialHomeStep7Desc'),
    hint: t('tutorialHomeStep7Hint'),
    target: findFirstOtherSoundAddButton,
    fallbackTarget: '.sound-card:has([class*="other"])',
  },

  // ─── ÉTAPE 8 : Ajouter un tag ────────────────────────────────────────
  {
    id: 'home-step8',
    icon: '🏷️',
    title: t('tutorialHomeStep8Title'),
    description: t('tutorialHomeStep8Desc'),
    hint: t('tutorialHomeStep8Hint'),
    target: () => {
      const card = findFirstSound();
      if (card) {
        const tagBtn = card.querySelector('[class*="tag"]:has(.ti-plus), button:has(.ti-tag)');
        if (tagBtn) return tagBtn;
        const btns = card.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent && btn.textContent.includes('Tag')) {
            return btn;
          }
        }
        return card;
      }
      return null;
    },
    fallbackTarget: '.sound-card:first-child button:has(.ti-tag)',
  },

  // ─── ÉTAPE 9 : Barre de recherche et tri ─────────────────────────────
  {
    id: 'home-step9',
    icon: '🔍',
    title: t('tutorialHomeStep9Title'),
    description: t('tutorialHomeStep9Desc'),
    hint: t('tutorialHomeStep9Hint'),
    target: () => {
      const searchInput = document.querySelector('.search-bar input, input[type="search"], input[placeholder*="Rechercher"]');
      if (searchInput) return searchInput;
      const sortSelect = document.querySelector('select[class*="sort"]');
      if (sortSelect) return sortSelect;
      return document.querySelector('.home-header');
    },
    fallbackTarget: '.search-bar, .home-header',
  },

  // ─── ÉTAPE 10 : Drag & Drop des sons ────────────────────────────────
  {
    id: 'home-step10',
    icon: '🔄',
    title: t('tutorialHomeStep10Title'),
    description: t('tutorialHomeStep10Desc'),
    hint: t('tutorialHomeStep10Hint'),
    target: () => {
      const card = findFirstSound();
      if (card && card.draggable !== undefined) return card;
      const draggable = document.querySelector('.sound-card[draggable="true"]');
      if (draggable) return draggable;
      return document.querySelector('.sound-card:first-child');
    },
    fallbackTarget: '.sound-card:first-child',
  },
];