import fr from './fr.json'
import en from './en.json'
import es from './es.json'

export const languages = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
} as const

export const defaultLang = 'fr' as const

export type Lang = keyof typeof languages

const translations = { fr, en, es } as const

export function useTranslations(lang: Lang) {
  return translations[lang] ?? translations[defaultLang]
}

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split('/')
  if (first in languages) return first as Lang
  return defaultLang
}

export function useTranslatedPath(currentLang: Lang) {
  return function translatePath(path: string, targetLang: Lang = currentLang) {
    return targetLang === defaultLang ? path : `/${targetLang}${path}`
  }
}

/** Retourne l'URL équivalente dans une autre langue pour la page courante */
export function getLocalizedUrl(url: URL, targetLang: Lang): string {
  const segments = url.pathname.split('/').filter(Boolean)
  // Retire le préfixe de langue s'il existe
  if (segments[0] && segments[0] in languages) segments.shift()
  const basePath = segments.join('/')
  if (targetLang === defaultLang) {
    return basePath ? `/${basePath}` : '/'
  }
  return basePath ? `/${targetLang}/${basePath}` : `/${targetLang}/`
}

export { translations }