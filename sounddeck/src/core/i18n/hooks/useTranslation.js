// src/core/i18n/hooks/useTranslation.js
import { useContext, useCallback } from 'react'
import { LanguageContext } from '../LanguageContext'

export function useTranslation() {
  const context = useContext(LanguageContext)
  
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }
  
  const { currentLang, translations, setLanguage } = context
  
  const t = useCallback((key, params = {}) => {
    if (!translations) return key
    
    const value = key.split('.').reduce((obj, k) => obj?.[k], translations)
    
    if (value === undefined) {
      console.warn(`⚠️ Traduction manquante: "${key}"`)
      return key
    }
    
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match
      })
    }
    
    return value
  }, [translations])
  
  return {
    t,
    lang: currentLang,
    setLanguage,
    translations,
  }
}

export default useTranslation
