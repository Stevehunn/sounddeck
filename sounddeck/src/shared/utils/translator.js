/**
 * @file Pure translator (no React, no imports besides FR locales).
 *
 * Used by non-React modules (`backupManager`, `errorHandler`, `mixdown`,
 * `normalizeUtils`, etc.) to translate user-facing strings without
 * pulling in React or creating an import cycle with `LanguageContext`.
 *
 * ## Bootstrapping
 *
 * - **Auto-init**: on first import, the module loads the FR dictionary
 *   (`@core/i18n/locales/fr/index.js`) and sets `_currentLang = 'fr'`.
 *   This guarantees that `translate()` works even in tests that override
 *   the `LanguageContext` mock (per-file `vi.mock` bypasses `setup.js`'s
 *   `configureTranslator` call).
 * - **Production**: `LanguageContext.jsx` calls `configureTranslator()`
 *   in a `useEffect` whenever `currentLang` changes, which overrides the
 *   FR default with the full merged dictionary (core + plugin
 *   translations) and the active language.
 * - **Tests**: `setup.js` also calls `configureTranslator()` inside the
 *   `@core/i18n/LanguageContext` mock factory — but if a test file
 *   overrides that mock, the auto-init keeps `translate()` working.
 *
 * ## Fallback behavior
 *
 * `translate(key)` returns the key itself when the key is missing from the
 * dictionary. This makes missing translations visible during development
 * (rather than silently swallowing them) without crashing the UI.
 *
 * @see @core/i18n/LanguageContext.jsx (calls `configureTranslator`)
 * @see src/test/setup.js (calls `configureTranslator` in the mock factory)
 */

import frTranslations from '@core/i18n/locales/fr/index.js'

let _translations = { fr: frTranslations }
let _currentLang = 'fr'

/**
 * Configures the translator with a `{ lang: { key: value } }` dictionary
 * and the active language.
 *
 * Safe to call multiple times (e.g. on language change). Replaces the
 * auto-init FR dictionary with the provided one.
 *
 * @param {Record<string, Record<string, string>>} translations - Full dictionary.
 * @param {string} [lang='fr'] - Active language code.
 * @returns {void}
 */
export function configureTranslator(translations, lang = 'fr') {
  _translations = translations || {}
  _currentLang = lang
}

/**
 * Changes the active language without re-passing the dictionary.
 *
 * @param {string} lang
 * @returns {void}
 */
export function setCurrentLang(lang) {
  _currentLang = lang
}

/**
 * Returns the active language code.
 * @returns {string}
 */
export function getCurrentLang() {
  return _currentLang
}

/**
 * Translates a key using the configured dictionary.
 *
 * Supports named placeholders (`{name}`, `{count}`, …) when `params` is
 * provided. Falls back to the key itself if the key is missing.
 *
 * @param {string} key
 * @param {Record<string, any>|null} [params=null]
 * @returns {string}
 */
export function translate(key, params = null) {
  const dict = _translations[_currentLang] || _translations.fr || {}
  let value = dict[key]
  if (typeof value !== 'string') value = key

  if (params && typeof params === 'object') {
    value = value.replace(/\{(\w+)\}/g, (match, name) => {
      const v = params[name]
      return v !== undefined && v !== null ? String(v) : match
    })
  }

  return value
}

export default { configureTranslator, setCurrentLang, getCurrentLang, translate }