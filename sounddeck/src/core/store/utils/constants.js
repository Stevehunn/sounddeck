// src/core/store/utils/constants.js
import { NAV_ITEMS, ACTION_IDS } from '@shared/constants/navigation'

const DEFAULT_ITEM_ORDER = [
  'home',
  'discover',
  'trimmer',
  'editor',
  'sequencer',
  'youtube',
  'stats',
  'emoji',
  'loop',
  'shortcuts',
  'presentation',
  'guide',
  'options',
]

export const DEFAULT_SIDEBAR_CONFIG = {
  mode: 'default',
  items: DEFAULT_ITEM_ORDER.map((id, order) => ({
    id,
    group: NAV_ITEMS[id]?.group || 'navigation',
    // Le label est un fallback brut (ID). Le Sidebar le traduit via i18n.
    label: id,
    icon: NAV_ITEMS[id]?.icon || 'ti-circle',
    visible: true,
    pinned: false,
    order,
    canHide: !ACTION_IDS.includes(id),
  })),
}

export const EDITOR_HISTORY_LIMIT = 50

export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm',
]
export const SUPPORTED_IMAGE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp',
]