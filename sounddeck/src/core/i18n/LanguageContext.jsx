// src/core/i18n/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ✅ Importer les traductions de l'application (nouvelle architecture modulaire)
import frTranslations from './locales/fr/index.js'
import enTranslations from './locales/en/index.js'
import esTranslations from './locales/es/index.js'

// ✅ Importer les traductions des plugins (depuis leurs dossiers respectifs)
import myinstantsFr from '../../plugins/myinstants/i18n.js'
import myinstantsEn from '../../plugins/myinstants/i18n.js'
import myinstantsEs from '../../plugins/myinstants/i18n.js'
import youtubeFr from '../../plugins/youtube/i18n.js'
import youtubeEn from '../../plugins/youtube/i18n.js'
import youtubeEs from '../../plugins/youtube/i18n.js'

// ✅ Langues supportées
export const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

// ✅ Traductions de base (application)
const APP_TRANSLATIONS = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
}

// ✅ Traductions des plugins par langue
// Fonction utilitaire pour extraire les traductions d'un plugin
const getPluginTranslations = (pluginModule, lang) => {
  if (!pluginModule) return {}
  // Le module peut exporter default ou directement l'objet
  const translations = pluginModule.default || pluginModule
  return translations[lang] || {}
}

const PLUGIN_TRANSLATIONS = {
  fr: {
    ...getPluginTranslations(myinstantsFr, 'fr'),
    ...getPluginTranslations(youtubeFr, 'fr'),
  },
  en: {
    ...getPluginTranslations(myinstantsEn, 'en'),
    ...getPluginTranslations(youtubeEn, 'en'),
  },
  es: {
    ...getPluginTranslations(myinstantsEs, 'es'),
    ...getPluginTranslations(youtubeEs, 'es'),
  },
}

// ✅ Fusionner toutes les traductions
const MERGED_TRANSLATIONS = {}

for (const lang of Object.keys(APP_TRANSLATIONS)) {
  MERGED_TRANSLATIONS[lang] = {
    ...APP_TRANSLATIONS[lang],
    ...(PLUGIN_TRANSLATIONS[lang] || {}),
  }
}

// Pour les langues qui n'existent que dans les plugins
for (const lang of Object.keys(PLUGIN_TRANSLATIONS)) {
  if (!MERGED_TRANSLATIONS[lang]) {
    MERGED_TRANSLATIONS[lang] = { ...PLUGIN_TRANSLATIONS[lang] }
  }
}

// ✅ Garder TRANSLATIONS pour rétrocompatibilité
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

  const t = useCallback((key, ...args) => {
    const keys = key.split('.')
    let value = MERGED_TRANSLATIONS[currentLang]
    for (const k of keys) {
      value = value?.[k]
      if (!value) break
    }
    
    if (typeof value === 'string' && args.length > 0) {
      return value.replace(/\{(\d+)\}/g, (_, index) => {
        const arg = args[parseInt(index)]
        return arg !== undefined ? arg : `{${index}}`
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