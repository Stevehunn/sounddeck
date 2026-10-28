/**
 * @file Options page section definitions.
 *
 * Each entry maps a scroll target to an icon + i18n label. The order here
 * is the order of the tab bar (and of the sections in the scroll view).
 *
 * @see ./Options.jsx
 * @see ./hooks/useSectionObserver.js
 */

/**
 * @typedef {Object} OptionsSection
 * @property {string} id - DOM anchor (matches `data-section="{id}"`).
 * @property {string} icon - Tabler icon class.
 * @property {string} labelKey - i18n key for the tab label.
 */

/** @type {OptionsSection[]} */
export const SECTIONS = [
  { id: 'appearance', icon: 'ti-palette', labelKey: 'optionsAppearance' },
  { id: 'audio', icon: 'ti-volume', labelKey: 'optionsAudio' },
  { id: 'shortcuts', icon: 'ti-keyboard', labelKey: 'optionsShortcuts' },
  { id: 'soundManagement', icon: 'ti-music', labelKey: 'soundManagement' },
  { id: 'plugins', icon: 'ti-puzzle', labelKey: 'optionsPlugins' },
  { id: 'integrations', icon: 'ti-plug', labelKey: 'integrations' },
  { id: 'advanced', icon: 'ti-gauge', labelKey: 'advancedOptions' },
  { id: 'backup', icon: 'ti-cloud', labelKey: 'optionsBackup' },
  { id: 'profiles', icon: 'ti-users', labelKey: 'optionsProfiles' },
  { id: 'support', icon: 'ti-heart', labelKey: 'supportSectionTitle' },
  { id: 'about', icon: 'ti-info-circle', labelKey: 'aboutSectionTitle' },
]