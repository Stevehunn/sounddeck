/**
 * @file Supported languages for the Electron main process.
 *
 * This is a stripped-down, process-main-only copy of the language list.
 * The renderer has its own richer i18n module (`src/core/i18n/`) with
 * translations, but the main process only needs:
 *
 * - The list of language codes (`fr`, `en`, `es`) — for the tray menu
 *   and for validating the `lang` store value.
 * - The `country` code — used by `ipcHandlers.js` when building the
 *   MyInstants trending URL (`/fr/index/<country>/`).
 * - The `myinstantsIndex` code — kept for symmetry, currently unused
 *   (the IPC handler reads `country` instead).
 *
 * Keeping these two copies in sync is a manual process: when a new
 * language is added to `src/core/i18n/`, add it here too (see
 * `CONTRIBUTING.md` → "Adding a new language").
 *
 * @see ../../src/core/i18n/constants.js — renderer-side language list
 * @see ../modules/ipcHandlers.js — consumes `LANGUAGES` for MyInstants URLs
 * @see ../modules/trayManager.js — consumes `LANGUAGES` for tray labels
 */

/**
 * All languages supported by the app.
 *
 * Each entry has:
 * - `code` — ISO 639-1 code (also the store value: `'fr' | 'en' | 'es'`)
 * - `label` — display name in the language itself ("Français", "English", …)
 * - `flag` — emoji flag
 * - `country` — ISO 3166-1 alpha-2 country code (used by MyInstants to pick
 *   the correct trending page: `fr` → `/fr/index/fr/`, `en` → `/fr/index/us/`)
 * - `myinstantsIndex` — reserved (currently unused; kept for future use)
 *
 * @type {Array<{
 *   code: 'fr' | 'en' | 'es',
 *   label: string,
 *   flag: string,
 *   country: string,
 *   myinstantsIndex: string
 * }>}
 */
const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', country: 'fr', myinstantsIndex: 'fr' },
  { code: 'en', label: 'English',  flag: '🇺🇸', country: 'us', myinstantsIndex: 'us' },
  { code: 'es', label: 'Español',  flag: '🇪🇸', country: 'es', myinstantsIndex: 'es' },
]

module.exports = { LANGUAGES }