// src/test/utils/mockI18n.js
import { vi } from 'vitest'

/**
 * Retourne un mock complet du LanguageContext.
 * Toutes les clés retournent leur propre nom (ou la valeur par défaut fournie).
 */
export function createLanguageMock(translations = {}) {
  return {
    useLanguage: vi.fn(() => ({
      t: (key, params) => {
        // Si une traduction custom est fournie, on l'utilise
        if (translations[key]) return translations[key]
        // Sinon on retourne la clé (permet les assertions sur les clés)
        if (typeof params === 'object' && params !== null) {
          let result = key
          for (const [k, v] of Object.entries(params)) {
            result = result.replace(`{${k}}`, String(v))
          }
          return result
        }
        return key
      },
      currentLang: 'fr',
      changeLanguage: vi.fn(),
      isLoading: false,
      version: 0,
      subscribe: vi.fn(() => () => {}),
      languages: [
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
      ],
      translations: {},
    })),
    LanguageProvider: ({ children }) => children,
    TRANSLATIONS: { fr: {}, en: {}, es: {} },
    LANGUAGES: [
      { code: 'fr', label: 'Français', flag: '🇫🇷' },
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'es', label: 'Español', flag: '🇪🇸' },
    ],
  }
}

/**
 * Version raccourcie prête à utiliser avec vi.mock.
 * Usage :
 *   vi.mock('@core/i18n/LanguageContext', () => createLanguageMock())
 */
export function mockLanguageModule(translations) {
  return createLanguageMock(translations)
}