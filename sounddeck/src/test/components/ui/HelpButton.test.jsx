import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HelpButton from '@shared/components/ui/HelpButton'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        helpButtonLabel: 'Aide',
        helpButtonTitle: 'Ouvrir le tutoriel',
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

describe('HelpButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rendre un bouton avec la classe help-button', () => {
    render(<HelpButton onClick={vi.fn()} />)
    const button = document.querySelector('.help-button')
    expect(button).toBeInTheDocument()
  })

  it('devrait avoir un aria-label traduit', () => {
    render(<HelpButton onClick={vi.fn()} />)
    expect(screen.getByLabelText('Aide')).toBeInTheDocument()
  })

  it('devrait avoir un title traduit', () => {
    render(<HelpButton onClick={vi.fn()} />)
    const button = screen.getByTitle('Ouvrir le tutoriel')
    expect(button).toBeInTheDocument()
  })

  it('devrait afficher l\'icône ti-help-circle', () => {
    render(<HelpButton onClick={vi.fn()} />)
    expect(document.querySelector('.ti-help-circle')).toBeInTheDocument()
  })

  it('devrait appeler onClick quand on clique', () => {
    const onClick = vi.fn()
    render(<HelpButton onClick={onClick} />)

    fireEvent.click(document.querySelector('.help-button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ne devrait pas planter si onClick est absent', () => {
    render(<HelpButton />)
    expect(() => {
      fireEvent.click(document.querySelector('.help-button'))
    }).not.toThrow()
  })
})