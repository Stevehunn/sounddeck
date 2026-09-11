// src/shared/utils/accessibility.js

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

const defaultT = (key, fallback) => fallback || key

export function getSoundCardAria(sound, isPlaying, shortcut, t = defaultT) {
  const shortcutLabel = shortcut ? `, ${t('a11yShortcut', 'raccourci')} ${shortcut}` : ''
  return {
    role: ROLES.SOUND_CARD,
    'aria-label': `${t('a11ySound', 'Son')}: ${sound.name}${shortcutLabel}`,
    'aria-pressed': isPlaying ? 'true' : 'false',
    'aria-describedby': `sound-desc-${sound.id}`,
    tabIndex: 0
  }
}

export function getSoundGridAria(totalItems, t = defaultT) {
  return {
    role: ROLES.SOUND_GRID,
    'aria-label': t('a11ySoundGrid', 'Grille des sons'),
    'aria-rowcount': totalItems,
    'aria-colcount': Math.min(totalItems, 6)
  }
}

export function getSidebarAria(t = defaultT) {
  return {
    role: ROLES.SIDEBAR,
    'aria-label': t('a11yMainNav', 'Navigation principale'),
    'aria-controls': 'main-content'
  }
}

export function getSearchAria(placeholder, t = defaultT) {
  return {
    role: ROLES.SEARCH,
    'aria-label': placeholder || t('a11ySearch', 'Rechercher des sons'),
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    autoComplete: 'off'
  }
}

export function getModalAria(title, t = defaultT) {
  return {
    role: ROLES.DIALOG,
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
    'aria-describedby': 'modal-desc'
  }
}

export function getProgressAria(value, max = 100, t = defaultT) {
  return {
    role: ROLES.PROGRESS,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': t('a11yAudioProgress', 'Progression audio')
  }
}

export function getToggleAria(label, isActive) {
  return {
    role: 'switch',
    'aria-checked': isActive ? 'true' : 'false',
    'aria-label': label
  }
}

export function getTabAria(label, isSelected, controlsId) {
  return {
    role: ROLES.TAB,
    'aria-selected': isSelected ? 'true' : 'false',
    'aria-controls': controlsId,
    'aria-label': label,
    tabIndex: isSelected ? 0 : -1
  }
}

export function getTabListAria(t = defaultT) {
  return {
    role: ROLES.TABLIST,
    'aria-label': t('a11yTabs', 'Navigation par onglets')
  }
}

export function getTabPanelAria(id, label) {
  return {
    role: ROLES.TABPANEL,
    'aria-labelledby': id,
    'aria-label': label
  }
}

export const DESCRIPTIONS = {
  soundCard: (name, playCount, t = defaultT) =>
    `${name}, ${playCount || 0} ${t('a11yPlays', 'lectures')}. ${t('a11yClickToPlay', 'Cliquez pour jouer, clic droit pour le menu.')}`,

  volumeSlider: (value, t = defaultT) =>
    `${t('a11yVolumeAt', 'Volume à')} ${value}%. ${t('a11yVolumeHint', 'Utilisez les flèches haut/bas pour ajuster.')}`,

  shortcutRecorder: (shortcut, t = defaultT) =>
    shortcut
      ? `${t('a11yShortcut', 'Raccourci')}: ${shortcut}. ${t('a11yClickToEdit', 'Cliquez pour modifier.')}`
      : t('a11yNoShortcut', 'Aucun raccourci. Cliquez pour enregistrer un nouveau raccourci.'),

  searchBox: (count, t = defaultT) =>
    `${t('a11ySearchSounds', 'Recherche de sons.')} ${count} ${t('a11yResults', 'résultats.')}`,

  profileSelector: (name, count, t = defaultT) =>
    `${t('a11yProfile', 'Profil')}: ${name}, ${count} ${t('a11ySounds', 'sons.')}`,

  playlistItem: (name, index, total, t = defaultT) =>
    `${t('a11ySoundOf', 'Son')} ${index+1} ${t('a11yOf', 'sur')} ${total}: ${name}.`
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