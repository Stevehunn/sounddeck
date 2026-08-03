// src/core/i18n/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { TRANSLATIONS, LANGUAGES } from './locales'

// État initial
let MERGED_TRANSLATIONS = { ...TRANSLATIONS }
let translationsLoaded = false

// Fonction pour charger les traductions des plugins
async function loadPluginTranslations() {
  if (translationsLoaded) return
  
  try {
    // Charger les traductions MyInstants
    try {
      const myinstantsModule = await import('../../plugins/myinstants/i18n.js')
      const myinstantsTranslations = myinstantsModule.default || {}
      for (const [lang, translations] of Object.entries(myinstantsTranslations)) {
        if (!MERGED_TRANSLATIONS[lang]) MERGED_TRANSLATIONS[lang] = {}
        Object.assign(MERGED_TRANSLATIONS[lang], translations)
      }
    } catch (e) {
      // Silencieux
    }

    // Charger les traductions YouTube
    try {
      const youtubeModule = await import('../../plugins/youtube/i18n.js')
      const youtubeTranslations = youtubeModule.default || {}
      for (const [lang, translations] of Object.entries(youtubeTranslations)) {
        if (!MERGED_TRANSLATIONS[lang]) MERGED_TRANSLATIONS[lang] = {}
        Object.assign(MERGED_TRANSLATIONS[lang], translations)
      }
    } catch (e) {
      // Silencieux
    }

    translationsLoaded = true
  } catch (e) {
    console.warn('⚠️ Erreur chargement traductions des plugins:', e)
  }
}

// Démarrer le chargement immédiatement
loadPluginTranslations()

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