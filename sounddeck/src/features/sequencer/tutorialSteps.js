// src/features/sequencer/tutorialSteps.js

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
 * Recherche le bouton "Nouvelle playlist"
 */
function findNewPlaylistButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Nouvelle playlist"...');
  
  const btn = document.querySelector('[data-testid="new-playlist-button"]');
  if (btn && btn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Nouvelle playlist" trouvé par data-testid');
    return btn;
  }
  
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('Nouvelle playlist') || 
        text.includes('New playlist') || 
        text.includes('Nueva lista')) {
      if (btn.offsetParent !== null) {
        console.log('✅ [Tutorial] Bouton "Nouvelle playlist" trouvé par texte');
        return btn;
      }
    }
  }
  
  const plusBtn = document.querySelector('.btn-primary:has(.ti-plus)');
  if (plusBtn && plusBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Nouvelle playlist" trouvé par icône');
    return plusBtn;
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Nouvelle playlist" trouvé');
  return null;
}

/**
 * Recherche une playlist dans la sidebar et la sélectionne
 */
function selectFirstPlaylist() {
  console.log('🔍 [Tutorial] Recherche et sélection d\'une playlist...');
  
  const playlistItem = document.querySelector('[data-testid^="playlist-item-"]');
  if (playlistItem && playlistItem.offsetParent !== null) {
    const isActive = playlistItem.classList.contains('active');
    if (!isActive) {
      console.log('🖱️ [Tutorial] Clic sur la playlist pour la sélectionner');
      try {
        playlistItem.click();
        console.log('✅ [Tutorial] Playlist sélectionnée');
      } catch (e) {
        console.warn('⚠️ [Tutorial] Erreur lors du clic:', e);
      }
    } else {
      console.log('✅ [Tutorial] Playlist déjà sélectionnée');
    }
    return playlistItem;
  }
  
  const fallback = document.querySelector('.sidebar-item:has(.ti-playlist)');
  if (fallback && fallback.offsetParent !== null) {
    console.log('🖱️ [Tutorial] Clic sur la playlist (fallback)');
    try {
      fallback.click();
    } catch (e) {}
    return fallback;
  }
  
  console.log('❌ [Tutorial] Aucune playlist trouvée');
  return null;
}

/**
 * Recherche le bouton "Ajouter des sons"
 */
function findAddSoundsButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Ajouter des sons"...');
  
  const btn = document.querySelector('[data-testid="add-sounds-button"]');
  if (btn && btn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Ajouter des sons" trouvé par data-testid');
    return btn;
  }
  
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.includes('Ajouter des sons') || 
        text.includes('Add sounds') || 
        text.includes('Agregar sonidos')) {
      if (btn.offsetParent !== null) {
        console.log('✅ [Tutorial] Bouton "Ajouter des sons" trouvé par texte');
        return btn;
      }
    }
  }
  
  const plusBtn = document.querySelector('.btn-secondary:has(.ti-plus)');
  if (plusBtn && plusBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Ajouter des sons" trouvé par icône');
    return plusBtn;
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Ajouter des sons" trouvé');
  return null;
}

/**
 * Recherche le bouton "Play" (Lancer la séquence)
 */
function findPlayButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Play"...');
  
  const btn = document.querySelector('[data-testid="play-sequence-button"]');
  if (btn && btn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Play" trouvé par data-testid');
    return btn;
  }
  
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const icon = btn.querySelector('.ti-player-play, .ti-player-play-filled');
    if (icon && btn.offsetParent !== null) {
      const text = btn.textContent?.trim() || '';
      if (text.includes('Play') || text.includes('Lancer') || text.includes('Reproducir')) {
        console.log('✅ [Tutorial] Bouton "Play" trouvé par icône + texte');
        return btn;
      }
    }
  }
  
  const playBtn = document.querySelector('.btn-primary:has(.ti-player-play)');
  if (playBtn && playBtn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Play" trouvé par sélecteur');
    return playBtn;
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Play" trouvé');
  return null;
}

/**
 * Recherche le bouton "Loop" (Boucle)
 */
function findLoopButton() {
  console.log('🔍 [Tutorial] Recherche du bouton "Loop"...');
  
  const btn = document.querySelector('[data-testid="loop-sequence-button"]');
  if (btn && btn.offsetParent !== null) {
    console.log('✅ [Tutorial] Bouton "Loop" trouvé par data-testid');
    return btn;
  }
  
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const icon = btn.querySelector('.ti-repeat');
    if (icon && btn.offsetParent !== null) {
      const text = btn.textContent?.trim() || '';
      if (text.includes('Loop') || text.includes('Boucle') || text.includes('Repetir')) {
        console.log('✅ [Tutorial] Bouton "Loop" trouvé par icône + texte');
        return btn;
      }
    }
  }
  
  console.log('❌ [Tutorial] Aucun bouton "Loop" trouvé');
  return null;
}

/**
 * ✅ CORRIGÉ : Recherche un son dans la playlist (pas dans la sidebar)
 */
function findFirstPlaylistItem() {
  console.log('🔍 [Tutorial] Recherche du premier son dans la playlist...');
  
  // ✅ Chercher uniquement dans la zone de contenu principal, pas dans la sidebar
  // Exclure les éléments qui sont dans la sidebar
  const mainContent = document.querySelector('[style*="flex: 1"]') || document.querySelector('.sequencer-content') || document.body;
  
  // Chercher les éléments .sequencer-item dans le contenu principal
  const items = mainContent.querySelectorAll('.sequencer-item');
  for (const item of items) {
    if (item.offsetParent !== null) {
      console.log('✅ [Tutorial] Premier son de la playlist trouvé');
      return item;
    }
  }
  
  // Fallback: chercher par data-testid en excluant la sidebar
  const allItems = document.querySelectorAll('[data-testid^="playlist-item-"]');
  for (const item of allItems) {
    // Vérifier que l'élément n'est pas dans la sidebar
    const isInSidebar = item.closest('.sidebar, aside, [class*="sidebar"]');
    if (!isInSidebar && item.offsetParent !== null) {
      console.log('✅ [Tutorial] Premier son de la playlist trouvé par data-testid (hors sidebar)');
      return item;
    }
  }
  
  console.log('❌ [Tutorial] Aucun son trouvé dans la playlist');
  return null;
}

/**
 * Recherche le champ de recherche dans le modal "Ajouter des sons"
 */
function findAddSoundsSearchInput() {
  console.log('🔍 [Tutorial] Recherche du champ de recherche dans le modal...');
  
  const input = document.querySelector('[data-testid="add-sounds-search"]');
  if (input && input.offsetParent !== null) {
    console.log('✅ [Tutorial] Champ de recherche trouvé par data-testid');
    return input;
  }
  
  const modalInput = document.querySelector('.modal input[type="text"], .modal input[placeholder*="Rechercher"]');
  if (modalInput && modalInput.offsetParent !== null) {
    console.log('✅ [Tutorial] Champ de recherche trouvé dans le modal');
    return modalInput;
  }
  
  console.log('❌ [Tutorial] Aucun champ de recherche trouvé');
  return null;
}

export const TUTORIAL_STEPS = (t) => [
  // ─── ÉTAPE 1 : Créer une playlist ──────────────────────────────────
  {
    id: 'sequencer-step1',
    icon: '📋',
    title: t('tutorialSequencerStep1Title'),
    description: t('tutorialSequencerStep1Desc'),
    hint: t('tutorialSequencerStep1Hint'),
    target: findNewPlaylistButton,
    fallbackTarget: '.btn-primary:has(.ti-plus)',
  },

  // ─── ÉTAPE 2 : Sélectionner une playlist ────────────────────────────
  {
    id: 'sequencer-step2',
    icon: '📂',
    title: t('tutorialSequencerStep2Title'),
    description: t('tutorialSequencerStep2Desc'),
    hint: t('tutorialSequencerStep2Hint'),
    target: selectFirstPlaylist,
    fallbackTarget: '.sidebar-item:has(.ti-playlist)',
  },

  // ─── ÉTAPE 3 : Ajouter des sons à la playlist ──────────────────────
  {
    id: 'sequencer-step3',
    icon: '➕',
    title: t('tutorialSequencerStep3Title'),
    description: t('tutorialSequencerStep3Desc'),
    hint: t('tutorialSequencerStep3Hint'),
    target: findAddSoundsButton,
    fallbackTarget: '.btn-secondary:has(.ti-plus)',
  },

  // ─── ÉTAPE 4 : Réorganiser les sons (Drag & Drop) ──────────────────
  {
    id: 'sequencer-step4',
    icon: '🔄',
    title: t('tutorialSequencerStep4Title'),
    description: t('tutorialSequencerStep4Desc'),
    hint: t('tutorialSequencerStep4Hint'),
    target: findFirstPlaylistItem, // ✅ Maintenant cible les sons, pas la playlist
    fallbackTarget: '.sequencer-item:first-child',
  },

  // ─── ÉTAPE 5 : Activer la boucle ────────────────────────────────────
  {
    id: 'sequencer-step5',
    icon: '🔁',
    title: t('tutorialSequencerStep5Title'),
    description: t('tutorialSequencerStep5Desc'),
    hint: t('tutorialSequencerStep5Hint'),
    target: findLoopButton,
    fallbackTarget: '.btn-success:has(.ti-repeat), .btn-secondary:has(.ti-repeat)',
  },

  // ─── ÉTAPE 6 : Lancer la séquence ──────────────────────────────────
  {
    id: 'sequencer-step6',
    icon: '▶️',
    title: t('tutorialSequencerStep6Title'),
    description: t('tutorialSequencerStep6Desc'),
    hint: t('tutorialSequencerStep6Hint'),
    target: findPlayButton,
    fallbackTarget: '.btn-primary:has(.ti-player-play)',
  },

  // ─── ÉTAPE 7 : Navigation avec les touches ← et → ──────────────────
  {
    id: 'sequencer-step7',
    icon: '⌨️',
    title: t('tutorialSequencerStep7Title'),
    description: t('tutorialSequencerStep7Desc'),
    hint: t('tutorialSequencerStep7Hint'),
    target: () => {
      const item = document.querySelector('.sequencer-item');
      if (item && item.offsetParent !== null) return item;
      return document.querySelector('.btn-danger:has(.ti-player-stop)');
    },
    fallbackTarget: '.sequencer-item:first-child, .btn-danger',
  },
];