// src/core/i18n/locales/index.js
import fr from './fr.js'
import en from './en.js'
import es from './es.js'

export const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', country: 'fr', myinstantsIndex: 'fr' },
  { code: 'en', label: 'English',  flag: '🇺🇸', country: 'us', myinstantsIndex: 'us' },
  { code: 'es', label: 'Español',  flag: '🇪🇸', country: 'es', myinstantsIndex: 'es' },
]

export const TRANSLATIONS = { fr, en, es }

export default { LANGUAGES, TRANSLATIONS }