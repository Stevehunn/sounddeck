// src/store/middleware/persistence.js

// Clés de sauvegarde
export const STORE_KEYS = {
  PROFILES: 'profiles',
  SOUNDS: 'sounds',
  SHORTCUTS: 'shortcuts',
  SOUND_ORDER: 'soundOrder',
  TAGS: 'tags',
  THEME: 'theme',
  CUSTOM_THEME: 'customTheme',
  LANG: 'lang',
  AUDIO_DEVICE: 'audioDevice',
  LOCAL_AUDIO_DEVICE: 'localAudioDevice',
  VOLUME: 'volume',
  PLAY_LOCALLY: 'playLocally',
  PREVIEW_VOLUME: 'previewVolume',
  KEYBOARD_LAYOUT: 'keyboardLayout',
  CARD_SIZE: 'cardSize',
  NORMALIZATION_ENABLED: 'normalizationEnabled',
  NORMALIZATION_TARGET: 'normalizationTarget',
  START_MINIMIZED: 'startMinimized',
  LAUNCH_AT_STARTUP: 'launchAtStartup',
  VIRTUAL_DRIVER_INSTALLED: 'virtualDriverInstalled',
  VIRTUAL_DEVICE_ACTIVE: 'virtualDeviceActive',
  MIXER_ENABLED: 'mixerEnabled',
  MICROPHONE_DEVICE: 'microphoneDevice',
  MICROPHONE_VOLUME: 'microphoneVolume',
  MIXER_SOUND_VOLUME: 'mixerSoundVolume',
  NOISE_SUPPRESSION: 'noiseSuppression',
  NOISE_SUPPRESSION_MODE: 'noiseSuppressionMode',
  LOW_LATENCY_MODE: 'lowLatencyMode',
  MONITORING_ENABLED: 'monitoringEnabled',
  COMPRESS_ON_IMPORT: 'compressOnImport',
  COMPRESSION_BITRATE: 'compressionBitrate',
  AUTO_BACKUP_ENABLED: 'autoBackupEnabled',
  BACKUP_INTERVAL: 'backupInterval',
  LAZY_LOADING_ENABLED: 'lazyLoadingEnabled',
  PROFILE_SHORTCUT: 'profileShortcut',
  LOOP_SHORTCUT: 'loopShortcut',
  STOP_ALL_SHORTCUT: 'stopAllShortcut',
  PRESENTATION_SHORTCUT: 'presentationShortcut',
  TOGGLE_SHORTCUTS_ACCELERATOR: 'toggleShortcutsAccelerator',
  TOGGLE_WINDOW_SHORTCUT: 'toggleWindowShortcut',
  SHORTCUTS_ENABLED: 'shortcutsEnabled',
  CURRENT_PROFILE_ID: 'currentProfileId',
  EDITOR_PROJECT: 'editorProject',
  SIDEBAR_CONFIG: 'sidebarConfig',
}

// Map des actions vers les clés de sauvegarde
export const ACTION_TO_STORE_KEY = {
  // Sounds
  'sounds/addSound': STORE_KEYS.SOUNDS,
  'sounds/deleteSound': STORE_KEYS.SOUNDS,
  'sounds/updateSound': STORE_KEYS.SOUNDS,
  'sounds/updateSoundVolume': STORE_KEYS.SOUNDS,
  'sounds/incrementPlayCount': STORE_KEYS.SOUNDS,
  'sounds/toggleFavorite': STORE_KEYS.SOUNDS,
  'sounds/addSoundToProfile': STORE_KEYS.SOUNDS,
  'sounds/removeSoundFromProfile': STORE_KEYS.SOUNDS,
  'sounds/reorderSounds': STORE_KEYS.SOUND_ORDER,
  'sounds/updateSoundImage': STORE_KEYS.SOUNDS,
  'sounds/updateSoundEmoji': STORE_KEYS.SOUNDS,
  'sounds/setSounds': STORE_KEYS.SOUNDS,
  'sounds/setSoundOrder': STORE_KEYS.SOUND_ORDER,
  
  // Tags
  'sounds/addTagToSound': STORE_KEYS.TAGS,
  'sounds/removeTagFromSound': STORE_KEYS.TAGS,
  'sounds/setTags': STORE_KEYS.TAGS,
  
  // Profiles
  'profiles/createProfile': STORE_KEYS.PROFILES,
  'profiles/deleteProfile': STORE_KEYS.PROFILES,
  'profiles/renameProfile': STORE_KEYS.PROFILES,
  'profiles/switchProfile': STORE_KEYS.CURRENT_PROFILE_ID,
  'profiles/setProfiles': STORE_KEYS.PROFILES,
  'profiles/setCurrentProfileId': STORE_KEYS.CURRENT_PROFILE_ID,
  
  // Shortcuts
  'shortcuts/setShortcut': STORE_KEYS.SHORTCUTS,
  'shortcuts/clearShortcut': STORE_KEYS.SHORTCUTS,
  'shortcuts/setShortcuts': STORE_KEYS.SHORTCUTS,
  'shortcuts/setProfileShortcut': STORE_KEYS.PROFILE_SHORTCUT,
  'shortcuts/setLoopShortcut': STORE_KEYS.LOOP_SHORTCUT,
  'shortcuts/setStopAllShortcut': STORE_KEYS.STOP_ALL_SHORTCUT,
  'shortcuts/setPresentationShortcut': STORE_KEYS.PRESENTATION_SHORTCUT,
  'shortcuts/setToggleShortcutsAccelerator': STORE_KEYS.TOGGLE_SHORTCUTS_ACCELERATOR,
  'shortcuts/setToggleWindowShortcut': STORE_KEYS.TOGGLE_WINDOW_SHORTCUT,
  'shortcuts/setShortcutsEnabled': STORE_KEYS.SHORTCUTS_ENABLED,
  
  // Settings
  'settings/setTheme': STORE_KEYS.THEME,
  'settings/setCustomTheme': [STORE_KEYS.THEME, STORE_KEYS.CUSTOM_THEME],
  'settings/setLang': STORE_KEYS.LANG,
  'settings/setAudioDevice': STORE_KEYS.AUDIO_DEVICE,
  'settings/setLocalAudioDevice': STORE_KEYS.LOCAL_AUDIO_DEVICE,
  'settings/setVolume': STORE_KEYS.VOLUME,
  'settings/setPlayLocally': STORE_KEYS.PLAY_LOCALLY,
  'settings/setPreviewVolume': STORE_KEYS.PREVIEW_VOLUME,
  'settings/setKeyboardLayout': STORE_KEYS.KEYBOARD_LAYOUT,
  'settings/setCardSize': STORE_KEYS.CARD_SIZE,
  'settings/setNormalizationEnabled': STORE_KEYS.NORMALIZATION_ENABLED,
  'settings/setNormalizationTarget': STORE_KEYS.NORMALIZATION_TARGET,
  'settings/setStartMinimized': STORE_KEYS.START_MINIMIZED,
  'settings/setLaunchAtStartup': STORE_KEYS.LAUNCH_AT_STARTUP,
  'settings/setVirtualDriverInstalled': STORE_KEYS.VIRTUAL_DRIVER_INSTALLED,
  'settings/setVirtualDeviceActive': STORE_KEYS.VIRTUAL_DEVICE_ACTIVE,
  'settings/setMixerEnabled': STORE_KEYS.MIXER_ENABLED,
  'settings/setMicrophoneDevice': STORE_KEYS.MICROPHONE_DEVICE,
  'settings/setMicrophoneVolume': STORE_KEYS.MICROPHONE_VOLUME,
  'settings/setMixerSoundVolume': STORE_KEYS.MIXER_SOUND_VOLUME,
  'settings/setNoiseSuppression': STORE_KEYS.NOISE_SUPPRESSION,
  'settings/setNoiseSuppressionMode': STORE_KEYS.NOISE_SUPPRESSION_MODE,
  'settings/setLowLatencyMode': STORE_KEYS.LOW_LATENCY_MODE,
  'settings/setMonitoringEnabled': STORE_KEYS.MONITORING_ENABLED,
  'settings/toggleMonitoring': STORE_KEYS.MONITORING_ENABLED,
  'settings/setCompressOnImport': STORE_KEYS.COMPRESS_ON_IMPORT,
  'settings/setCompressionBitrate': STORE_KEYS.COMPRESSION_BITRATE,
  'settings/setAutoBackupEnabled': STORE_KEYS.AUTO_BACKUP_ENABLED,
  'settings/setBackupInterval': STORE_KEYS.BACKUP_INTERVAL,
  'settings/setLazyLoadingEnabled': STORE_KEYS.LAZY_LOADING_ENABLED,
  
  // Editor
  'editor/createEditorProject': STORE_KEYS.EDITOR_PROJECT,
  'editor/setEditorProject': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateEditorProjectName': STORE_KEYS.EDITOR_PROJECT,
  'editor/addTrack': STORE_KEYS.EDITOR_PROJECT,
  'editor/removeTrack': STORE_KEYS.EDITOR_PROJECT,
  'editor/renameTrack': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateTrack': STORE_KEYS.EDITOR_PROJECT,
  'editor/reorderTracks': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateTrackColor': STORE_KEYS.EDITOR_PROJECT,
  'editor/addClipToTrack': STORE_KEYS.EDITOR_PROJECT,
  'editor/removeClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/moveClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/duplicateClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/splitClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/addEffectToClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/removeEffectFromClip': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateEffectParam': STORE_KEYS.EDITOR_PROJECT,
  'editor/toggleEffect': STORE_KEYS.EDITOR_PROJECT,
  'editor/setClipFade': STORE_KEYS.EDITOR_PROJECT,
  'editor/saveEditorMarkers': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateClipWithPath': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateEditorProject': STORE_KEYS.EDITOR_PROJECT,
  'editor/updateClipDuration': STORE_KEYS.EDITOR_PROJECT,
}

// ─── FONCTIONS DE SAUVEGARDE ──────────────────────────────────────────────

export async function saveToStore(key, value) {
  try {
    await window.electronAPI.storeSet(key, value)
  } catch (e) {
    console.warn(`⚠️ Erreur sauvegarde ${key}:`, e)
  }
}

export async function loadFromStore(key) {
  try {
    return await window.electronAPI.storeGet(key)
  } catch (e) {
    console.warn(`⚠️ Erreur chargement ${key}:`, e)
    return null
  }
}

export function getStoreKeysForAction(actionType) {
  const keys = ACTION_TO_STORE_KEY[actionType]
  if (!keys) return null
  return Array.isArray(keys) ? keys : [keys]
}

export default {
  STORE_KEYS,
  ACTION_TO_STORE_KEY,
  saveToStore,
  loadFromStore,
  getStoreKeysForAction,
}