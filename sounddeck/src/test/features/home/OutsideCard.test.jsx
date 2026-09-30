import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OutsideCard from '@features/home/OutsideCard'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        addToProfile: 'Ajouter',
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

// ─── Mock buildFileUrl ──────────────────────────────────────────────────
vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://file/${p}` : null)),
}))

describe('OutsideCard', () => {
  const defaultSound = {
    id: 'sound-1',
    name: 'Mon Son',
    emoji: '🎵',
    image: null,
  }

  const defaultProps = {
    sound: defaultSound,
    onAdd: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderCard = (props = {}) => {
    return render(<OutsideCard {...defaultProps} {...props} />)
  }

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait afficher le nom du son', () => {
    renderCard()
    expect(screen.getByText('Mon Son')).toBeInTheDocument()
  })

  it('devrait afficher l\'emoji si pas d\'image', () => {
    renderCard()
    expect(screen.getByText('🎵')).toBeInTheDocument()
  })

  it('ne devrait PAS rendre d\'image si sound.image est null', () => {
    renderCard()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  // ─── IMAGE ────────────────────────────────────────────────────────────

  it('devrait afficher l\'image si sound.image existe', () => {
    renderCard({
      sound: { ...defaultSound, image: 'C:/path/img.png' },
    })
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('sounddeck-local://')
    // L'emoji ne doit PAS être affiché
    expect(screen.queryByText('🎵')).not.toBeInTheDocument()
  })

  // ─── BOUTON AJOUTER ───────────────────────────────────────────────────

  it('devrait afficher un bouton "Ajouter"', () => {
    renderCard()
    expect(screen.getByText('Ajouter')).toBeInTheDocument()
  })

  it('devrait avoir le data-testid correct', () => {
    renderCard()
    expect(screen.getByTestId('add-other-sound-sound-1')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône ti-circle-plus dans le bouton', () => {
    renderCard()
    const button = screen.getByTestId('add-other-sound-sound-1')
    expect(button.querySelector('.ti-circle-plus')).toBeInTheDocument()
  })

  it('devrait appeler onAdd au clic sur le bouton', () => {
    const onAdd = vi.fn()
    renderCard({ onAdd })

    fireEvent.click(screen.getByTestId('add-other-sound-sound-1'))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('devrait avoir la classe btn-primary', () => {
    renderCard()
    const button = screen.getByTestId('add-other-sound-sound-1')
    expect(button.className).toContain('btn-primary')
  })

  it('devrait avoir la classe btn-sm', () => {
    renderCard()
    const button = screen.getByTestId('add-other-sound-sound-1')
    expect(button.className).toContain('btn-sm')
  })

  // ─── STYLE ────────────────────────────────────────────────────────────

  it('devrait avoir l\'opacité 0.75 sur la card', () => {
    const { container } = renderCard()
    const card = container.firstChild
    expect(card.style.opacity).toBe('0.75')
  })

  it('devrait avoir une bordure dashed', () => {
    const { container } = renderCard()
    const card = container.firstChild
    expect(card.style.border).toContain('dashed')
  })

  // ─── CAS LIMITES ──────────────────────────────────────────────────────

  it('devrait rendre sans emoji ni image', () => {
    renderCard({
      sound: { id: 'x', name: 'Sans emoji', emoji: null, image: null },
    })
    // Le nom est bien là
    expect(screen.getByText('Sans emoji')).toBeInTheDocument()
    // Aucune image
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('devrait gérer un id contenant des tirets', () => {
    renderCard({
      sound: { ...defaultSound, id: 'sound-abc-123-xyz' },
    })
    expect(screen.getByTestId('add-other-sound-sound-abc-123-xyz')).toBeInTheDocument()
  })
})