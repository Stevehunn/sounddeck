// src/core/i18n/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'

// Traductions de l'application (nouvelle architecture modulaire)
import frTranslations from './locales/fr/index.js'
import enTranslations from './locales/en/index.js'
import esTranslations from './locales/es/index.js'

// Traductions des plugins (fichiers uniques qui contiennent toutes les langues)
import myinstantsI18n from '../../plugins/myinstants/i18n.js'
import youtubeI18n from '../../plugins/youtube/i18n.js'
// ✅ NOUVEAU : plugin emoji
import emojiPluginI18n from '../../plugins/emoji/i18n.js'

// ✅ S5 : import depuis constants.js (plus de dépendance circulaire)
import { LANGUAGES } from './constants.js'

// Réexport pour compatibilité
export { LANGUAGES }

// Traductions de base (application)
const APP_TRANSLATIONS = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
}

const getPluginTranslations = (pluginModule, lang) => {
  if (!pluginModule) return {}
  const translations = pluginModule.default || pluginModule
  return translations[lang] || {}
}

const PLUGIN_TRANSLATIONS = {
  fr: {
    ...getPluginTranslations(myinstantsI18n, 'fr'),
    ...getPluginTranslations(youtubeI18n, 'fr'),
    // ✅ NOUVEAU : traductions du plugin emoji discover
    ...getPluginTranslations(emojiPluginI18n, 'fr'),
  },
  en: {
    ...getPluginTranslations(myinstantsI18n, 'en'),
    ...getPluginTranslations(youtubeI18n, 'en'),
    ...getPluginTranslations(emojiPluginI18n, 'en'),
  },
  es: {
    ...getPluginTranslations(myinstantsI18n, 'es'),
    ...getPluginTranslations(youtubeI18n, 'es'),
    ...getPluginTranslations(emojiPluginI18n, 'es'),
  },
}

// ✅ Les traductions core sont prioritaires (ne peuvent pas être écrasées par les plugins)
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
        console.warn('Erreur chargement langue:', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadLang()
  }, [])

  const changeLanguage = useCallback(async (lang) => {
    if (!MERGED_TRANSLATIONS[lang] || lang === currentLang) return

    setCurrentLang(lang)
    setVersion(prev => prev + 1)

    try {
      await window.electronAPI?.storeSet?.('lang', lang)
      await window.electronAPI?.updateTrayLanguage?.(lang)
      listenersRef.current.forEach(fn => fn(lang))
    } catch (e) {
      console.warn('Erreur sauvegarde langue:', e)
    }
  }, [currentLang])

  // ✅ t() gère les placeholders nommés ET positionnels
  const t = useCallback((key, ...args) => {
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
  }, [currentLang])

  const subscribe = useCallback((listener) => {
    listenersRef.current.push(listener)
    return () => {
      listenersRef.current = listenersRef.current.filter(fn => fn !== listener)
    }
  }, [])

  const value = useMemo(() => ({
    currentLang,
    changeLanguage,
    t,
    isLoading,
    version,
    subscribe,
    languages: LANGUAGES,
    translations: MERGED_TRANSLATIONS[currentLang]
  }), [currentLang, changeLanguage, t, isLoading, version, subscribe])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}