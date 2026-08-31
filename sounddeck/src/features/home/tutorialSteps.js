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
 * Recherche un élément avec data-testid
 */
function findByTestId(testId) {
  return document.querySelector(`[data-testid="${testId}"]`);
}

/**
 * Recherche le premier son dans la grille
 */
function findFirstSound() {
  // Chercher par data-testid d'abord
  const card = document.querySelector('[data-testid^="sound-card-"]');
  if (card) return card;
  
  // Fallback
  const fallback = document.querySelector('.sound-card:not([style*="display: none"])');
  if (fallback) return fallback;
  return document.querySelector('.sound-grid .sound-card:first-child, .sound-card:first-child');
}

/**
 * Recherche le bouton "Ajouter un son" dans l'en-tête
 */
function findAddSoundButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Ajouter un son"...');
  
  // Chercher par data-testid
  const addBtn = document.querySelector('[data-testid="add-sound-button"]');
  if (addBtn) {
    console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par data-testid');
    return addBtn;
  }
  
  // Fallback par texte
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const btnText = btn.textContent?.trim() || '';
    if (btnText === 'Ajouter un son' || 
        btnText === 'Add sound' || 
        btnText === 'Agregar sonido') {
      console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par texte');
      return btn;
    }
    if (btn.querySelector('.ti-plus') && 
        (btnText.includes('Ajouter') || btnText.includes('Add') || btnText.includes('Agregar'))) {
      console.log('✅ [Tutorial] Bouton "Ajouter un son" trouvé par icône + texte');
      return btn;
    }
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Ajouter un son" trouvé');
  return null;
}

/**
 * Recherche le bouton étoile (favoris) sur une carte
 */
function findFavoriteButton() {
  console.log('🔍 [Tutorial] Recherche du bouton favoris...');
  
  // Chercher par data-testid
  const favoriteBtn = document.querySelector('[data-testid="favorite-button"]');
  if (favoriteBtn && favoriteBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton favoris trouvé par data-testid');
    return favoriteBtn;
  }
  
  // Fallback
  const card = findFirstSound();
  if (card) {
    const starBtn = card.querySelector('.ti-star, .ti-star-filled, [class*="star"]');
    if (starBtn) {
      const btn = starBtn.closest('button') || starBtn;
      console.log('✅ [Tutorial] Bouton favoris trouvé par fallback');
      return btn;
    }
    const btns = card.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.querySelector('.ti-star') || btn.querySelector('.ti-star-filled')) {
        console.log('✅ [Tutorial] Bouton favoris trouvé par icône');
        return btn;
      }
    }
    return card;
  }
  console.log('❌ [Tutorial] Aucun bouton favoris trouvé');
  return null;
}

/**
 * Recherche le bouton à trois points (menu contextuel)
 */
function findDotsButton() {
  console.log('🔍 [Tutorial] Recherche du bouton menu contextuel...');
  
  // Chercher par data-testid
  const dotsBtn = document.querySelector('[data-testid="dots-button"]');
  if (dotsBtn && dotsBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton ⋮ trouvé par data-testid');
    return dotsBtn;
  }
  
  // Fallback
  const card = findFirstSound();
  if (card) {
    const dotsBtnFallback = card.querySelector('.ti-dots-vertical, .ti-dots, [class*="dots"]');
    if (dotsBtnFallback) {
      const btn = dotsBtnFallback.closest('button') || dotsBtnFallback;
      console.log('✅ [Tutorial] Bouton ⋮ trouvé par fallback');
      return btn;
    }
    const btns = card.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.querySelector('.ti-dots-vertical') || btn.querySelector('.ti-dots')) {
        console.log('✅ [Tutorial] Bouton ⋮ trouvé par icône');
        return btn;
      }
    }
    return card;
  }
  console.log('❌ [Tutorial] Aucun bouton ⋮ trouvé');
  return null;
}

/**
 * Recherche la section "Profils" dans la sidebar
 */
function findProfilesSection() {
  console.log('🔍 [Tutorial] Recherche de la section "Profils"...');
  
  // Chercher par data-testid
  const section = document.querySelector('[data-testid="profiles-section"]');
  if (section) {
    console.log('✅ [Tutorial] Section "Profils" trouvée par data-testid');
    return section;
  }
  
  // Fallback
  const sidebar = document.querySelector('.sidebar, aside');
  if (sidebar) {
    const sections = sidebar.querySelectorAll('[class*="section"], [class*="group"]');
    for (const section of sections) {
      const title = section.querySelector('[class*="title"], [class*="label"]');
      if (title && title.textContent && 
          (title.textContent.includes('Profils') || 
           title.textContent.includes('Profiles') ||
           title.textContent.includes('Perfiles'))) {
        console.log('✅ [Tutorial] Section "Profils" trouvée par fallback');
        return section;
      }
    }
    const allSounds = sidebar.querySelector('[class*="item"]:has(.ti-stack)');
    if (allSounds) {
      const section = allSounds.closest('[class*="section"]');
      if (section) return section;
      return allSounds;
    }
    return sidebar;
  }
  console.log('❌ [Tutorial] Sidebar non trouvée');
  return null;
}

/**
 * Recherche le bouton "Ajouter" dans la section "Autres sons"
 */
function findFirstOtherSoundAddButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Ajouter" dans une carte...');
  
  // Chercher par data-testid
  const addBtn = document.querySelector('[data-testid^="add-other-sound-"]');
  if (addBtn && addBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Ajouter" trouvé par data-testid');
    return addBtn;
  }
  
  // Fallback
  const allCards = document.querySelectorAll('.sound-card, [class*="card"], .outside-card');
  for (const card of allCards) {
    const style = card.style.opacity || window.getComputedStyle(card).opacity;
    const isOtherSound = parseFloat(style) < 0.9;
    if (isOtherSound) {
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
  
  console.log('❌ [Tutorial] Aucun bouton "Ajouter" trouvé');
  return null;
}

/**
 * Recherche le bouton "Nouveau profil"
 */
function findNewProfileButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Nouveau profil"...');
  
  // Chercher par data-testid
  const newProfileBtn = document.querySelector('[data-testid="new-profile-button"]');
  if (newProfileBtn) {
    console.log('✅ [Tutorial] Bouton "Nouveau profil" trouvé par data-testid');
    return newProfileBtn;
  }
  
  // Fallback
  const sidebar = document.querySelector('.sidebar, aside');
  if (sidebar) {
    const btns = sidebar.querySelectorAll('button');
    for (const btn of btns) {
      const btnText = btn.textContent?.trim() || '';
      if (btnText && 
          (btnText.includes('Nouveau profil') || 
           btnText.includes('New profile') ||
           btnText.includes('Nuevo perfil'))) {
        console.log('✅ [Tutorial] Bouton "Nouveau profil" trouvé par texte');
        return btn;
      }
      if (btn.querySelector('.ti-plus')) {
        const section = btn.closest('[class*="section"]');
        if (section) {
          const title = section.querySelector('[class*="title"], [class*="label"]');
          if (title && title.textContent && 
              (title.textContent.includes('Profils') || 
               title.textContent.includes('Profiles') ||
               title.textContent.includes('Perfiles'))) {
            console.log('✅ [Tutorial] Bouton "Nouveau profil" trouvé par icône + contexte');
            return btn;
          }
        }
      }
    }
    const fallback = sidebar.querySelector('[class*="new-profile"]');
    if (fallback) {
      console.log('✅ [Tutorial] Bouton "Nouveau profil" trouvé par classe');
      return fallback;
    }
  }
  console.log('❌ [Tutorial] Aucun bouton "Nouveau profil" trouvé');
  return null;
}

/**
 * Recherche le bouton de tri ou la barre de recherche
 */
function findSearchOrSortElement() {
  console.log('🔍 [Tutorial] Recherche de la barre de recherche ou du tri...');
  
  const searchInput = document.querySelector('[data-testid="search-input"], .search-bar input, input[type="search"], input[placeholder*="Rechercher"]');
  if (searchInput) {
    console.log('✅ [Tutorial] Barre de recherche trouvée');
    return searchInput;
  }
  
  const sortSelect = document.querySelector('[data-testid="sort-select"], select[class*="sort"]');
  if (sortSelect) {
    console.log('✅ [Tutorial] Sélecteur de tri trouvé');
    return sortSelect;
  }
  
  return document.querySelector('.home-header');
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

  // ─── ÉTAPE 3 : Ajouter aux favoris ──────────────────────────────────
  {
    id: 'home-step3',
    icon: '⭐',
    title: t('tutorialHomeStep3Title'),
    description: t('tutorialHomeStep3Desc'),
    hint: t('tutorialHomeStep3Hint'),
    target: findFavoriteButton,
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

  // ─── ÉTAPE 5 : Gérer vos profils ──────────────────────────────────────
  {
    id: 'home-step5',
    icon: '📂',
    title: t('tutorialHomeStep5Title'),
    description: t('tutorialHomeStep5Desc'),
    hint: t('tutorialHomeStep5Hint'),
    target: findProfilesSection,
    fallbackTarget: '.sidebar .profiles-section',
  },

  // ─── ÉTAPE 6 : Créer un nouveau profil ──────────────────────────────
  {
    id: 'home-step6',
    icon: '➕',
    title: t('tutorialHomeStep6Title'),
    description: t('tutorialHomeStep6Desc'),
    hint: t('tutorialHomeStep6Hint'),
    target: findNewProfileButton,
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
    target: findSearchOrSortElement,
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