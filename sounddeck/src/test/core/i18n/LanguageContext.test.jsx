// src/test/core/i18n/LanguageContext.test.jsx
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// ⚠️ Désactive le mock global pour tester la VRAIE implémentation
vi.unmock('@core/i18n/LanguageContext')

vi.mock('@core/i18n/constants.js', () => ({
  LANGUAGES: [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ],
}))

vi.mock('@core/i18n/locales/fr/index.js', () => ({
  default: { add: 'Ajouter', cancel: 'Annuler', greeting: 'Bonjour {name}', count: '{0} résultats' },
}))

vi.mock('@core/i18n/locales/en/index.js', () => ({
  default: { add: 'Add', cancel: 'Cancel', greeting: 'Hello {name}', count: '{0} results' },
}))

vi.mock('@core/i18n/locales/es/index.js', () => ({
  default: { add: 'Agregar', cancel: 'Cancelar', greeting: 'Hola {name}', count: '{0} resultados' },
}))

import {
  LanguageProvider,
  useLanguage,
  TRANSLATIONS,
  LANGUAGES,
} from '@core/i18n/LanguageContext'

// ─── HELPERS ───────────────────────────────────────────────────────────
const TestConsumer = () => {
  const { t, currentLang, changeLanguage, isLoading, languages, translations } = useLanguage()
  return (
    <div>
      <div data-testid="lang">{currentLang}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="t-add">{t('add')}</div>
      <div data-testid="t-greeting">{t('greeting', { name: 'Alice' })}</div>
      <div data-testid="t-count">{t('count', '5')}</div>
      <div data-testid="t-unknown">{t('unknownKey')}</div>
      <div data-testid="langs-count">{languages.length}</div>
      <div data-testid="has-translations">{typeof translations}</div>
      <button onClick={() => changeLanguage('en')}>EN</button>
      <button onClick={() => changeLanguage('es')}>ES</button>
      <button onClick={() => changeLanguage('xx')}>XX</button>
    </div>
  )
}

const renderWithProvider = () =>
  render(
    <LanguageProvider>
      <TestConsumer />
    </LanguageProvider>
  )

let consoleWarnSpy

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  global.window.electronAPI = {
    storeGet: vi.fn().mockResolvedValue(null),
    storeSet: vi.fn().mockResolvedValue(undefined),
    getSystemLanguage: vi.fn().mockResolvedValue('fr'),
    updateTrayLanguage: vi.fn(),
  }
})

afterEach(() => {
  consoleWarnSpy.mockRestore()
})

// ═══════════════════════════════════════════════════════════════════════
// TRANSLATIONS export
// ═══════════════════════════════════════════════════════════════════════
describe('TRANSLATIONS export', () => {
  it('expose les 3 langues', () => {
    expect(TRANSLATIONS).toHaveProperty('fr')
    expect(TRANSLATIONS).toHaveProperty('en')
    expect(TRANSLATIONS).toHaveProperty('es')
  })

  it('fusionne les traductions correctement', () => {
    expect(TRANSLATIONS.fr.add).toBe('Ajouter')
    expect(TRANSLATIONS.en.add).toBe('Add')
    expect(TRANSLATIONS.es.add).toBe('Agregar')
  })
})

describe('LANGUAGES export', () => {
  it('expose le tableau des langues', () => {
    expect(LANGUAGES).toHaveLength(3)
    expect(LANGUAGES[0].code).toBe('fr')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// LanguageProvider
// ═══════════════════════════════════════════════════════════════════════
describe('LanguageProvider', () => {
  it('initialise avec la langue du store', async () => {
    global.window.electronAPI.storeGet.mockResolvedValue('en')
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('lang').textContent).toBe('en')
    })
  })

  it('fallback sur getSystemLanguage si store vide', async () => {
    global.window.electronAPI.storeGet.mockResolvedValue(null)
    global.window.electronAPI.getSystemLanguage.mockResolvedValue('es')
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('lang').textContent).toBe('es')
    })
  })

  it('ignore une langue invalide du store', async () => {
    global.window.electronAPI.storeGet.mockResolvedValue('xx')
    global.window.electronAPI.getSystemLanguage.mockResolvedValue('en')
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('lang').textContent).toBe('en')
    })
  })

  it('reste sur fr par défaut si storeGet throw', async () => {
    global.window.electronAPI.storeGet.mockRejectedValue(new Error('boom'))
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('lang').textContent).toBe('fr')
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  // ⚠️ updateTrayLanguage est appelé dans App.jsx, PAS dans LanguageProvider
  // → test retiré
})

// ═══════════════════════════════════════════════════════════════════════
// Fonction t()
// ═══════════════════════════════════════════════════════════════════════
describe('t()', () => {
  it('traduit une clé simple', async () => {
    renderWithProvider()
    await waitFor(() => {
      expect(screen.getByTestId('t-add').textContent).toBe('Ajouter')
    })
  })

  it('retourne la clé si inconnue', async () => {
    renderWithProvider()
    await waitFor(() => {
      expect(screen.getByTestId('t-unknown').textContent).toBe('unknownKey')
    })
  })

  it('remplace les placeholders nommés', async () => {
    renderWithProvider()
    await waitFor(() => {
      expect(screen.getByTestId('t-greeting').textContent).toBe('Bonjour Alice')
    })
  })

  it('remplace les placeholders positionnels', async () => {
    renderWithProvider()
    await waitFor(() => {
      expect(screen.getByTestId('t-count').textContent).toBe('5 résultats')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// changeLanguage
// ═══════════════════════════════════════════════════════════════════════
describe('changeLanguage', () => {
  it('change la langue', async () => {
    renderWithProvider()
    await waitFor(() => screen.getByTestId('lang'))

    fireEvent.click(screen.getByText('EN'))

    await waitFor(() => {
      expect(screen.getByTestId('lang').textContent).toBe('en')
      expect(screen.getByTestId('t-add').textContent).toBe('Add')
    })
  })

  it('persiste dans le store', async () => {
    renderWithProvider()
    await waitFor(() => screen.getByTestId('lang'))

    fireEvent.click(screen.getByText('EN'))

    await waitFor(() => {
      expect(global.window.electronAPI.storeSet).toHaveBeenCalledWith('lang', 'en')
    })
  })

  it('appelle updateTrayLanguage', async () => {
    renderWithProvider()
    await waitFor(() => screen.getByTestId('lang'))

    fireEvent.click(screen.getByText('ES'))

    await waitFor(() => {
      expect(global.window.electronAPI.updateTrayLanguage).toHaveBeenCalledWith('es')
    })
  })

  it('ignore une langue invalide', async () => {
    renderWithProvider()
    await waitFor(() => screen.getByTestId('lang'))

    const initialLang = screen.getByTestId('lang').textContent
    fireEvent.click(screen.getByText('XX'))

    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByTestId('lang').textContent).toBe(initialLang)
  })

  it('ignore si même langue', async () => {
    global.window.electronAPI.storeGet.mockResolvedValue('en')
    renderWithProvider()
    await waitFor(() => screen.getByTestId('lang'))

    global.window.electronAPI.storeSet.mockClear()
    fireEvent.click(screen.getByText('EN'))

    await new Promise((r) => setTimeout(r, 20))
    expect(global.window.electronAPI.storeSet).not.toHaveBeenCalled()
  })

  it('notifie les listeners', async () => {
    const listener = vi.fn()
    const TestWithSubscribe = () => {
      const { subscribe, changeLanguage } = useLanguage()
      React.useEffect(() => subscribe(listener), [subscribe])
      return <button onClick={() => changeLanguage('en')}>EN</button>
    }

    render(
      <LanguageProvider>
        <TestWithSubscribe />
      </LanguageProvider>
    )

    await waitFor(() => screen.getByText('EN'))
    fireEvent.click(screen.getByText('EN'))

    await waitFor(() => {
      expect(listener).toHaveBeenCalledWith('en')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// subscribe / unsubscribe
// ═══════════════════════════════════════════════════════════════════════
describe('subscribe', () => {
  it('retourne une fonction unsubscribe', async () => {
    let unsubscribeFn = null

    const Test = () => {
      const { subscribe } = useLanguage()
      React.useEffect(() => {
        unsubscribeFn = subscribe(() => {})
        return () => unsubscribeFn?.()
      }, [subscribe])
      return <div>test</div>
    }

    render(
      <LanguageProvider>
        <Test />
      </LanguageProvider>
    )

    await waitFor(() => expect(unsubscribeFn).toBeTruthy())
    expect(typeof unsubscribeFn).toBe('function')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// useLanguage hors Provider
// ═══════════════════════════════════════════════════════════════════════
describe('useLanguage hors Provider', () => {
  it('throw une erreur', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow(
      /useLanguage must be used within LanguageProvider/
    )
    errorSpy.mockRestore()
  })
})