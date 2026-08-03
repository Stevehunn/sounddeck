/**
 * Génère des ARIA labels pour les composants SoundDeck
 */

// Rôles ARIA personnalisés
export const ROLES = {
  SOUND_CARD: 'button',
  SOUND_GRID: 'grid',
  SOUND_ITEM: 'gridcell',
  SIDEBAR: 'navigation',
  MAIN: 'main',
  SEARCH: 'searchbox',
  DIALOG: 'dialog',
  TOOLBAR: 'toolbar',
  PROGRESS: 'progressbar',
  STATUS: 'status',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel'
}

/**
 * Génère les attributs ARIA pour une carte son
 */
export function getSoundCardAria(sound, isPlaying, shortcut) {
  return {
    role: ROLES.SOUND_CARD,
    'aria-label': `Son: ${sound.name}${shortcut ? `, raccourci ${shortcut}` : ''}`,
    'aria-pressed': isPlaying ? 'true' : 'false',
    'aria-describedby': `sound-desc-${sound.id}`,
    tabIndex: 0
  }
}

/**
 * Génère les attributs ARIA pour une grille de sons
 */
export function getSoundGridAria(totalItems) {
  return {
    role: ROLES.SOUND_GRID,
    'aria-label': 'Grille des sons',
    'aria-rowcount': totalItems,
    'aria-colcount': Math.min(totalItems, 6)
  }
}

/**
 * Génère les attributs ARIA pour la sidebar
 */
export function getSidebarAria() {
  return {
    role: ROLES.SIDEBAR,
    'aria-label': 'Navigation principale',
    'aria-controls': 'main-content'
  }
}

/**
 * Génère les attributs ARIA pour une barre de recherche
 */
export function getSearchAria(placeholder) {
  return {
    role: ROLES.SEARCH,
    'aria-label': placeholder || 'Rechercher des sons',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    autoComplete: 'off'
  }
}

/**
 * Génère les attributs ARIA pour un modal
 */
export function getModalAria(title) {
  return {
    role: ROLES.DIALOG,
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
    'aria-describedby': 'modal-desc'
  }
}

/**
 * Génère les attributs ARIA pour une barre de progression
 */
export function getProgressAria(value, max = 100) {
  return {
    role: ROLES.PROGRESS,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': 'Progression audio'
  }
}

/**
 * Génère les attributs ARIA pour un toggle
 */
export function getToggleAria(label, isActive) {
  return {
    role: 'switch',
    'aria-checked': isActive ? 'true' : 'false',
    'aria-label': label
  }
}

/**
 * Génère les attributs ARIA pour un onglet
 */
export function getTabAria(label, isSelected, controlsId) {
  return {
    role: ROLES.TAB,
    'aria-selected': isSelected ? 'true' : 'false',
    'aria-controls': controlsId,
    'aria-label': label,
    tabIndex: isSelected ? 0 : -1
  }
}

/**
 * Génère les attributs ARIA pour une liste d'onglets
 */
export function getTabListAria() {
  return {
    role: ROLES.TABLIST,
    'aria-label': 'Navigation par onglets'
  }
}

/**
 * Génère les attributs ARIA pour un panneau d'onglet
 */
export function getTabPanelAria(id, label) {
  return {
    role: ROLES.TABPANEL,
    'aria-labelledby': id,
    'aria-label': label
  }
}

/**
 * Génère des descriptions pour les lecteurs d'écran
 */
export const DESCRIPTIONS = {
  soundCard: (name, playCount) => 
    `${name}, ${playCount || 0} lectures. Cliquez pour jouer, clic droit pour le menu.`,
  
  volumeSlider: (value) => 
    `Volume à ${value}%. Utilisez les flèches haut/bas pour ajuster.`,
  
  shortcutRecorder: (shortcut) => 
    shortcut 
      ? `Raccourci: ${shortcut}. Cliquez pour modifier.` 
      : 'Aucun raccourci. Cliquez pour enregistrer un nouveau raccourci.',
  
  searchBox: (count) => 
    `Recherche de sons. ${count} résultats.`,
  
  profileSelector: (name, count) => 
    `Profil: ${name}, ${count} sons.`,
  
  playlistItem: (name, index, total) => 
    `Son ${index+1} sur ${total}: ${name}.`
}

export default {
  ROLES,
  getSoundCardAria,
  getSoundGridAria,
  getSidebarAria,
  getSearchAria,
  getModalAria,
  getProgressAria,
  getToggleAria,
  getTabAria,
  getTabListAria,
  getTabPanelAria,
  DESCRIPTIONS
}