// src/test/core/i18n/locales/es/index.test.js
import { testLocaleStructure } from '../../../../utils/i18nLocaleTestFactory'

// ─── Import de tous les fichiers de traduction ─────────────────────────
import common from '@core/i18n/locales/es/common'
import discover from '@core/i18n/locales/es/discover'
import editor from '@core/i18n/locales/es/editor'
import editorToasts from '@core/i18n/locales/es/editorToasts'
import editorUI from '@core/i18n/locales/es/editorUI'
import emoji from '@core/i18n/locales/es/emoji'
import guide from '@core/i18n/locales/es/guide'
import home from '@core/i18n/locales/es/home'
import options from '@core/i18n/locales/es/options'
import presentation from '@core/i18n/locales/es/presentation'
import sequencer from '@core/i18n/locales/es/sequencer'
import stats from '@core/i18n/locales/es/stats'
import trimmer from '@core/i18n/locales/es/trimmer'
import tutorial from '@core/i18n/locales/es/tutorial'
import welcome from '@core/i18n/locales/es/welcome'
import index from '@core/i18n/locales/es/index'
import auth from '@core/i18n/locales/es/auth'

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

testLocaleStructure('es', FILES, index, {
  // Boutons communs
  add: 'Agregar',
  cancel: 'Cancelar',
  save: 'Guardar',
  // Profils
  allSounds: 'Todos los sonidos',
  // Titres de pages
  editorTitle: 'Editor de sonidos',
  optionsTitle: 'Opciones',
  trimmerTitle: 'Recortador',
  statsTitle: 'Estadísticas',
  sequencerTitle: 'Secuenciador',
  presentationTitle: 'Modo Presentación',
  guideTitle: 'Guía Discord',
  emojiPickerTitle: 'Elegir un emoji',
  discoverTitle: 'Descubrir sonidos',
  // Welcome / Tutorial
  welcomeContinue: 'Continuar',
  tutorialNext: 'Siguiente',
})