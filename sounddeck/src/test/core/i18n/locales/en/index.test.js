// src/test/core/i18n/locales/en/index.test.js
import { testLocaleStructure } from '../../../../utils/i18nLocaleTestFactory'

// ─── Import de tous les fichiers de traduction ─────────────────────────
import common from '@core/i18n/locales/en/common'
import discover from '@core/i18n/locales/en/discover'
import editor from '@core/i18n/locales/en/editor'
import editorToasts from '@core/i18n/locales/en/editorToasts'
import editorUI from '@core/i18n/locales/en/editorUI'
import emoji from '@core/i18n/locales/en/emoji'
import guide from '@core/i18n/locales/en/guide'
import home from '@core/i18n/locales/en/home'
import options from '@core/i18n/locales/en/options'
import presentation from '@core/i18n/locales/en/presentation'
import sequencer from '@core/i18n/locales/en/sequencer'
import stats from '@core/i18n/locales/en/stats'
import trimmer from '@core/i18n/locales/en/trimmer'
import tutorial from '@core/i18n/locales/en/tutorial'
import welcome from '@core/i18n/locales/en/welcome'
import index from '@core/i18n/locales/en/index'
import auth from '@core/i18n/locales/en/auth'

const FILES = {
  common,
  discover,
  editor,
  editorToasts,
  editorUI,
  emoji,
  guide,
  home,
  options,
  presentation,
  sequencer,
  stats,
  trimmer,
  tutorial,
  welcome,
  auth,
}

testLocaleStructure('en', FILES, index, {
  // Boutons communs
  add: 'Add',
  cancel: 'Cancel',
  save: 'Save',
  // Profils
  allSounds: 'All sounds',
  // Titres de pages
  editorTitle: 'Sound editor',
  optionsTitle: 'Options',
  trimmerTitle: 'Trimmer',
  statsTitle: 'Statistics',
  sequencerTitle: 'Sequencer',
  presentationTitle: 'Presentation Mode',
  guideTitle: 'Discord Guide',
  emojiPickerTitle: 'Choose an emoji',
  discoverTitle: 'Discover sounds',
  // Welcome / Tutorial
  welcomeContinue: 'Continue',
  tutorialNext: 'Next',
})