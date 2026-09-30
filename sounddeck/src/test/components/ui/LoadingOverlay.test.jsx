import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingOverlay from '@shared/components/ui/LoadingOverlay'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        loading: 'Chargement...',
        loadingSubtitle: 'Veuillez patienter, l\'opération peut prendre quelques secondes.',
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

describe('LoadingOverlay', () => {
  it('ne devrait rien rendre si visible=false', () => {
    const { container } = render(<LoadingOverlay visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre l\'overlay si visible=true', () => {
    render(<LoadingOverlay visible={true} />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('devrait afficher le message custom si fourni', () => {
    render(<LoadingOverlay visible={true} message="Traitement en cours" />)
    expect(screen.getByText('Traitement en cours')).toBeInTheDocument()
    // Le message par défaut "Chargement..." ne doit PAS apparaître
    expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
  })

  it('devrait afficher le sous-titre en toutes circonstances', () => {
    render(<LoadingOverlay visible={true} />)
    expect(
      screen.getByText(/Veuillez patienter, l'opération peut prendre quelques secondes/i)
    ).toBeInTheDocument()
  })

  it('devrait avoir un spinner ti-loader', () => {
    render(<LoadingOverlay visible={true} />)
    const spinner = document.querySelector('.ti-loader')
    expect(spinner).toBeInTheDocument()
  })

  it('devrait rendre dans un portal (attaché à body)', () => {
    render(<LoadingOverlay visible={true} />)
    // Le contenu est dans document.body via createPortal
    expect(document.body.querySelector('.ti-loader')).toBeInTheDocument()
  })
})