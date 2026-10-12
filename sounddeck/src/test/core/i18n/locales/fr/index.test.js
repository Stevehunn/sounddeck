// src/test/core/i18n/locales/fr/index.test.js
import { testLocaleStructure } from '../../../../utils/i18nLocaleTestFactory'

// ─── Import de tous les fichiers de traduction ─────────────────────────
import common from '@core/i18n/locales/fr/common'
import discover from '@core/i18n/locales/fr/discover'
import editor from '@core/i18n/locales/fr/editor'
import editorToasts from '@core/i18n/locales/fr/editorToasts'
import editorUI from '@core/i18n/locales/fr/editorUI'
import emoji from '@core/i18n/locales/fr/emoji'
import guide from '@core/i18n/locales/fr/guide'
import home from '@core/i18n/locales/fr/home'
import options from '@core/i18n/locales/fr/options'
import presentation from '@core/i18n/locales/fr/presentation'
import sequencer from '@core/i18n/locales/fr/sequencer'
import stats from '@core/i18n/locales/fr/stats'
import trimmer from '@core/i18n/locales/fr/trimmer'
import tutorial from '@core/i18n/locales/fr/tutorial'
import welcome from '@core/i18n/locales/fr/welcome'
import index from '@core/i18n/locales/fr/index'
import auth from '@core/i18n/locales/fr/auth'

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

testLocaleStructure('fr', FILES, index, {
  // Boutons communs
  add: 'Ajouter',
  cancel: 'Annuler',
  save: 'Sauvegarder',
  // Profils
  allSounds: 'Tous les sons',
  // Titres de pages
  editorTitle: 'Éditeur de sons',
  optionsTitle: 'Options',
  trimmerTitle: 'Rogneur',
  statsTitle: 'Statistiques',
  sequencerTitle: 'Séquenceur',
  presentationTitle: 'Mode Présentation',
  guideTitle: 'Guide Discord',
  emojiPickerTitle: 'Choisir un emoji',
  discoverTitle: 'Découvrir des sons',
  // Welcome / Tutorial
  welcomeContinue: 'Continuer',
  tutorialNext: 'Suivant',
})