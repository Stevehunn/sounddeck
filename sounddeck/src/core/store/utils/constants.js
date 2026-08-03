// src/core/store/utils/constants.js

export const DEFAULT_SIDEBAR_CONFIG = {
  mode: 'default',
  items: [
    // Navigation principale
    { id: 'home', group: 'navigation', label: 'Mes sons', icon: 'ti-home', visible: true, pinned: false, order: 0, canHide: true },
    { id: 'discover', group: 'navigation', label: 'Découverte', icon: 'ti-compass', visible: true, pinned: false, order: 1, canHide: true },
    { id: 'trimmer', group: 'navigation', label: 'Rogner', icon: 'ti-cut', visible: true, pinned: false, order: 2, canHide: true },
    { id: 'editor', group: 'navigation', label: 'Éditeur', icon: 'ti-wand', visible: true, pinned: false, order: 3, canHide: true },
    { id: 'sequencer', group: 'navigation', label: 'Séquenceur', icon: 'ti-playlist', visible: true, pinned: false, order: 4, canHide: true },
    { id: 'youtube', group: 'navigation', label: 'YouTube', icon: 'ti-brand-youtube', visible: true, pinned: false, order: 5, canHide: true },
    { id: 'stats', group: 'navigation', label: 'Statistiques', icon: 'ti-chart-bar', visible: true, pinned: false, order: 6, canHide: true },
    // Actions
    { id: 'loop', group: 'actions', label: 'Répétition', icon: 'ti-repeat', visible: true, pinned: false, order: 7, canHide: false },
    { id: 'shortcuts', group: 'actions', label: 'Raccourcis', icon: 'ti-keyboard', visible: true, pinned: false, order: 8, canHide: false },
    { id: 'presentation', group: 'actions', label: 'Présentation', icon: 'ti-layout-grid', visible: true, pinned: false, order: 9, canHide: false },
    // Footer
    { id: 'guide', group: 'footer', label: 'Guide Discord', icon: 'ti-book', visible: true, pinned: false, order: 10, canHide: true },
    { id: 'options', group: 'footer', label: 'Options', icon: 'ti-settings', visible: true, pinned: false, order: 11, canHide: true },
  ]
}

export const EDITOR_HISTORY_LIMIT = 50

export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']
export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp']