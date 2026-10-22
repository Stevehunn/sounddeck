/**
 * @file i18n context — provides translations + language switching.
 *
 * Merges core translations (from `./locales/<lang>/index.js`) with plugin
 * translations (auto-discovered via `import.meta.glob`). Core translations
 * take precedence — a plugin cannot override an existing core key.
 *
 * Exposes:
 * - **`t(key, ...args)`** — supports dot-notation keys (`'menu.volume'`),
 *   named placeholders (`{name}` with an object arg), and positional
 *   placeholders (`{0}`, `{1}` with spread args).
 * - **`changeLanguage(lang)`** — persists the choice and notifies listeners.
 * - **`subscribe(fn)`** — for external observers (e.g. tray icon updates).
 *
 * @see ./locales/{fr,en,es}/index.js
 * @see ./constants.js (`LANGUAGES`)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'

import { LANGUAGES } from './constants.js'
import frTranslations from './locales/fr/index.js'
import enTranslations from './locales/en/index.js'
import esTranslations from './locales/es/index.js'

const pluginI18nModules = import.meta.glob('../../plugins/*/i18n.js', {
  eager: true,
})

/**
 * Merges every plugin's `i18n.js` into a single `{ fr, en, es }` map.
 * @returns {{fr: Object, en: Object, es: Object}}
 */
const buildPluginTranslations = () => {
  const result = { fr: {}, en: {}, es: {} }

  for (const mod of Object.values(pluginI18nModules)) {
    const pluginI18n = mod?.default || mod
    if (!pluginI18n || typeof pluginI18n !== 'object') continue

    for (const lang of ['fr', 'en', 'es']) {
      const dict = pluginI18n[lang]
      if (dict && typeof dict === 'object') {
        Object.assign(result[lang], dict)
      }
    }
  }

  return result
}

const APP_TRANSLATIONS = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
}

const PLUGIN_TRANSLATIONS = buildPluginTranslations()

// Core translations take priority (plugins can't override them)
const MERGED_TRANSLATIONS = {}

for (const lang of Object.keys(APP_TRANSLATIONS)) {
  MERGED_TRANSLATIONS[lang] = {
    ...(PLUGIN_TRANSLATIONS[lang] || {}),
    ...APP_TRANSLATIONS[lang],
  }
}

for (const lang of Object.keys(PLUGIN_TRANSLATIONS)) {
  if (!MERGED_TRANSLATIONS[lang]) {
    MERGED_TRANSLATIONS[lang] = { ...PLUGIN_TRANSLATIONS[lang] }
  }
}

export const TRANSLATIONS = MERGED_TRANSLATIONS

export { LANGUAGES }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState('fr')
  const [isLoading, setIsLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const listenersRef = useRef([])

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await window.electronAPI?.storeGet?.('lang')
        if (saved && MERGED_TRANSLATIONS[saved]) {
          setCurrentLang(saved)
        } else {
          const systemLang = await window.electronAPI?.getSystemLanguage?.()
          if (systemLang && MERGED_TRANSLATIONS[systemLang]) {
            setCurrentLang(systemLang)
          }
        }
      } catch (e) {
        console.warn('Error loading language:', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadLang()
  }, [])

  /**
   * Changes the current language and persists the choice.
   *
   * @param {'fr'|'en'|'es'} lang
   * @returns {Promise<void>}
   */
  const changeLanguage = useCallback(
    async (lang) => {
      if (!MERGED_TRANSLATIONS[lang] || lang === currentLang) return

      setCurrentLang(lang)
      setVersion((prev) => prev + 1)

      try {
        await window.electronAPI?.storeSet?.('lang', lang)
        await window.electronAPI?.updateTrayLanguage?.(lang)
        listenersRef.current.forEach((fn) => fn(lang))
      } catch (e) {
        console.warn('Error saving language:', e)
      }
    },
    [currentLang]
  )

  /**
   * Translates a key.
   *
   * Supports:
   * - Dot-notation: `t('menu.volume')`
   * - Named placeholders: `t('hello', { name: 'Steve' })` → `"Hello Steve"`
   * - Positional placeholders: `t('hi', 'Steve', 42)` → `"Hi Steve, {1}"`
   *
   * @param {string} key
   * @param {...any} args
   * @returns {string}
   */
  const t = useCallback(
    (key, ...args) => {
      const keys = key.split('.')
      let value = MERGED_TRANSLATIONS[currentLang]
      for (const k of keys) {
        value = value?.[k]
        if (!value) break
      }

      if (typeof value === 'string' && args.length > 0) {
        if (
          args[0] !== null &&
          typeof args[0] === 'object' &&
          !Array.isArray(args[0])
        ) {
          const params = args[0]
          return value.replace(/\{(\w+)\}/g, (match, name) => {
            const v = params[name]
            return v !== undefined && v !== null ? String(v) : match
          })
        }

        return value.replace(/\{(\d+)\}/g, (_, index) => {
          const arg = args[parseInt(index, 10)]
          return arg !== undefined && arg !== null ? String(arg) : `{${index}}`
        })
      }

      return value || key
    },
    [currentLang]
  )

  /**
   * Subscribes to language change events.
   * @param {(lang: string) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  const subscribe = useCallback((listener) => {
    listenersRef.current.push(listener)
    return () => {
      listenersRef.current = listenersRef.current.filter(
        (fn) => fn !== listener
      )
    }
  }, [])

  const value = useMemo(
    () => ({
      currentLang,
      changeLanguage,
      t,
      isLoading,
      version,
      subscribe,
      languages: LANGUAGES,
      translations: MERGED_TRANSLATIONS[currentLang],
    }),
    [currentLang, changeLanguage, t, isLoading, version, subscribe]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * Reads the language context from the nearest `LanguageProvider`.
 *
 * `useLanguage` is a hook, not a component — Fast Refresh would fall back
 * to a full reload when editing this file, which is safe here (no state
 * to lose). The eslint-disable is intentional.
 *
 * @throws {Error} If called outside a `LanguageProvider`.
 * @returns {Object}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}