import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { TRANSLATIONS, LANGUAGES } from '../i18n'
// ✅ Importer les traductions des plugins
import myinstantsTranslations from '../plugins/myinstants/i18n'
import youtubeTranslations from '../plugins/youtube/i18n'

// ✅ Fusionner les traductions
const MERGED_TRANSLATIONS = {}

for (const lang of Object.keys(TRANSLATIONS)) {
  MERGED_TRANSLATIONS[lang] = {
    ...TRANSLATIONS[lang],
    ...(myinstantsTranslations[lang] || {}),
    ...(youtubeTranslations[lang] || {})
  }
}

// Pour les langues qui n'existent pas dans TRANSLATIONS mais existent dans les plugins
for (const lang of Object.keys(myinstantsTranslations)) {
  if (!MERGED_TRANSLATIONS[lang]) {
    MERGED_TRANSLATIONS[lang] = { ...myinstantsTranslations[lang] }
  }
}

for (const lang of Object.keys(youtubeTranslations)) {
  if (!MERGED_TRANSLATIONS[lang]) {
    MERGED_TRANSLATIONS[lang] = { ...youtubeTranslations[lang] }
  }
}

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