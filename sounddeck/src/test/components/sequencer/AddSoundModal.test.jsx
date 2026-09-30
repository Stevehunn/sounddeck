import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddSoundModal from '@features/sequencer/components/AddSoundModal'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        addSounds: 'Ajouter des sons',
        search: 'Rechercher...',
        cancel: 'Annuler',
        add: 'Ajouter',
        alreadyAdded: 'Déjà ajouté',
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

describe('AddSoundModal', () => {
  const sounds = [
    { id: 's1', name: 'Alpha', emoji: '🔊', image: null },
    { id: 's2', name: 'Beta', emoji: '🎵', image: null },
    { id: 's3', name: 'Gamma', emoji: '💥', image: null },
  ]

  const defaultProps = {
    sounds,
    existingIds: ['s2'],
    onAdd: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderModal = (props = {}) => {
    return render(<AddSoundModal {...defaultProps} {...props} />)
  }

  // Helper pour cibler le bouton Ajouter (pas le titre "Ajouter des sons")
  const getAddButton = () => document.querySelector('.modal-actions .btn-primary')

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait afficher le titre "Ajouter des sons"', () => {
    renderModal()
    expect(screen.getByText('Ajouter des sons')).toBeInTheDocument()
  })

  it('devrait afficher tous les sons au départ', () => {
    renderModal()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('devrait afficher un checkbox par son', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(3)
  })

  it('devrait afficher l\'input de recherche', () => {
    renderModal()
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument()
  })

  // ─── BADGE "DÉJÀ AJOUTÉ" ─────────────────────────────────────────────

  it('devrait afficher "Déjà ajouté" pour les sons existants', () => {
    renderModal()
    expect(screen.getByText('Déjà ajouté')).toBeInTheDocument()
  })

  it('ne devrait afficher qu\'un seul badge si un seul existant', () => {
    renderModal()
    const badges = screen.getAllByText('Déjà ajouté')
    expect(badges.length).toBe(1)
  })

  // ─── RECHERCHE ────────────────────────────────────────────────────────

  it('devrait filtrer les sons par recherche', () => {
    renderModal()
    const searchInput = screen.getByPlaceholderText('Rechercher...')

    fireEvent.change(searchInput, { target: { value: 'bet' } })

    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
  })

  it('devrait être insensible à la casse', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), {
      target: { value: 'ALPHA' },
    })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('devrait afficher "aucun" si aucun match', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), {
      target: { value: 'zzz' },
    })
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    // Pas d'état "aucun résultat" explicite → la zone est juste vide
  })

  // ─── SÉLECTION ────────────────────────────────────────────────────────

  it('devrait cocher un son au clic sur son checkbox', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    // s1 → index 0
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()
  })

  it('devrait décocher un son au 2e clic', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
  })

  it('devrait permettre la multi-sélection', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[2])

    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[2]).toBeChecked()
  })

  // ─── BOUTON AJOUTER ──────────────────────────────────────────────────

  it('devrait désactiver le bouton Ajouter si rien n\'est sélectionné', () => {
    renderModal()
    expect(getAddButton()).toBeDisabled()
  })

  it('devrait activer le bouton Ajouter après sélection', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(getAddButton()).not.toBeDisabled()
  })

  it('devrait afficher le compteur de sélection', () => {
    renderModal()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    expect(getAddButton().textContent).toContain('(2)')
  })

  it('devrait appeler onAdd avec les IDs sélectionnés', () => {
    const onAdd = vi.fn()
    renderModal({ onAdd })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // s1
    fireEvent.click(checkboxes[2]) // s3

    fireEvent.click(getAddButton())

    expect(onAdd).toHaveBeenCalledWith(['s1', 's3'])
  })

  it('ne devrait PAS appeler onAdd sans sélection', () => {
    const onAdd = vi.fn()
    renderModal({ onAdd })

    fireEvent.click(getAddButton())

    expect(onAdd).not.toHaveBeenCalled()
  })

  // ─── BOUTON ANNULER ──────────────────────────────────────────────────

  it('devrait appeler onClose au clic sur Annuler', () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    fireEvent.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ─── OVERLAY ─────────────────────────────────────────────────────────

  it('devrait appeler onClose au clic sur l\'overlay', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })

    const overlay = container.querySelector('.modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ne devrait PAS appeler onClose au clic dans la modal', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })

    const modal = container.querySelector('.modal')
    fireEvent.click(modal)
    expect(onClose).not.toHaveBeenCalled()
  })

  // ─── IMAGES ───────────────────────────────────────────────────────────

  it('devrait afficher l\'image si le son en a une', () => {
    renderModal({
      sounds: [
        { id: 's1', name: 'Avec image', emoji: '🔊', image: 'C:/img.png' },
      ],
    })
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('sounddeck-local://')
  })

  it('devrait afficher l\'emoji si pas d\'image', () => {
    renderModal({
      sounds: [{ id: 's1', name: 'Sans image', emoji: '🎸', image: null }],
    })
    expect(screen.getByText('🎸')).toBeInTheDocument()
  })
})