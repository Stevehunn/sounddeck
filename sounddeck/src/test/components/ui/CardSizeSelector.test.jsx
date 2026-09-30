import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CardSizeSelector from '@shared/components/ui/CardSizeSelector'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        cardSizeSmall: 'Petite',
        cardSizeMedium: 'Moyenne',
        cardSizeLarge: 'Grande',
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

describe('CardSizeSelector', () => {
  const defaultProps = {
    value: 'medium',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher les 3 tailles', () => {
    render(<CardSizeSelector {...defaultProps} />)
    expect(screen.getByText('Petite')).toBeInTheDocument()
    expect(screen.getByText('Moyenne')).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
  })

  it('devrait afficher un check sur la taille active (medium)', () => {
    render(<CardSizeSelector {...defaultProps} value="medium" />)
    // 3 icônes ti-layout-grid + 1 icône ti-check
    const checkIcons = document.querySelectorAll('.ti-check')
    expect(checkIcons.length).toBe(1)
  })

  it('devrait ne montrer aucun check si value ne matche aucune taille', () => {
    render(<CardSizeSelector {...defaultProps} value="unknown" />)
    const checkIcons = document.querySelectorAll('.ti-check')
    expect(checkIcons.length).toBe(0)
  })

  it('devrait appeler onChange avec "small" au clic', () => {
    const onChange = vi.fn()
    render(<CardSizeSelector {...defaultProps} onChange={onChange} />)

    fireEvent.click(screen.getByText('Petite'))
    expect(onChange).toHaveBeenCalledWith('small')
  })

  it('devrait appeler onChange avec "large" au clic', () => {
    const onChange = vi.fn()
    render(<CardSizeSelector {...defaultProps} onChange={onChange} />)

    fireEvent.click(screen.getByText('Grande'))
    expect(onChange).toHaveBeenCalledWith('large')
  })

  it('devrait appliquer un border accent sur la taille active', () => {
    render(<CardSizeSelector {...defaultProps} value="large" />)
    const largeButton = screen.getByText('Grande').closest('button')
    expect(largeButton.style.border).toContain('var(--accent)')
  })

  it('devrait déclencher le hover sans planter', () => {
    render(<CardSizeSelector {...defaultProps} />)
    const petite = screen.getByText('Petite').closest('button')
    fireEvent.mouseEnter(petite)
    fireEvent.mouseLeave(petite)
    expect(petite).toBeInTheDocument()
  })
})