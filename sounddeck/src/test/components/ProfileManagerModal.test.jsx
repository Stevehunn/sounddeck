import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileManagerModal from '@shared/components/modals/ProfileManagerModal'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key, params) => {
      const translations = {
        profileManagerTitle: 'Gérer le profil',
        profileManagerSelectAll: 'Tout sélectionner',
        profileManagerDeselectAll: 'Tout désélectionner',
        profileManagerRemoveSelected: 'Retirer sélection',
        profileManagerDeleteProfile: 'Supprimer le profil',
        profileManagerConfirmRemove: 'Confirmer la suppression',
        profileManagerConfirmMessage:
          'Vous êtes sur le point de retirer {count} son(s) du profil "{name}".',
        profileManagerConfirmSub:
          'Ces sons resteront dans votre bibliothèque et pourront être réajoutés plus tard.',
        profileManagerNoSounds: 'Ce profil ne contient aucun son.',
        profileManagerFavorite: 'Favori',
        profileManagerProfileDeleted: 'Profil supprimé',
        profileManagerSoundsRemoved: 'son(s) retirés de',
        profileManagerDeleteConfirm: 'Confirmer la suppression du profil',
        profileManagerDeleteMessage:
          'Voulez-vous vraiment supprimer le profil "{name}" avec ses {count} sons ?',
        close: 'Fermer',
        allSounds: 'Tous les sons',
        sounds: 'son(s)',
        cancel: 'Annuler',
        remove: 'Retirer',
        delete: 'Supprimer',
        confirm: 'Confirmer',
      }
      let result = translations[key] || key
      if (params && typeof params === 'object') {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return result
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
  // ✅ Mock du useConfirm pour éviter les modales internes
  ConfirmWrapper: () => null,
}))

// ✅ Mock useConfirm → simule le comportement "confirmer = true"
vi.mock('@shared/hooks/useConfirm', () => ({
  default: vi.fn(() => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmWrapper: () => null,
  })),
}))

describe('ProfileManagerModal', () => {
  const mockSounds = [
    { id: 'sound-1', name: 'Sound 1', emoji: '🔊', profiles: ['profile-1'] },
    { id: 'sound-2', name: 'Sound 2', emoji: '🎵', profiles: ['profile-1'] },
  ]

  const mockStore = {
    removeSoundFromProfile: vi.fn(),
    deleteProfile: vi.fn(),
  }

  const defaultProps = {
    profileId: 'profile-1',
    profileName: 'Test Profile',
    sounds: mockSounds,
    store: mockStore,
    onClose: vi.fn(),
    addToast: vi.fn(),
    lang: 'fr',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher le titre avec le nom du profil', () => {
    render(<ProfileManagerModal {...defaultProps} />)
    expect(screen.getByText(/Gérer le profil/)).toBeInTheDocument()
    expect(screen.getByText('Test Profile')).toBeInTheDocument()
  })

  it('devrait afficher le nombre de sons', () => {
    render(<ProfileManagerModal {...defaultProps} />)
    // "2 son(s)" peut apparaître plusieurs fois (header + compteur) → getAllByText
    expect(screen.getAllByText(/2 son\(s\)/i).length).toBeGreaterThan(0)
  })

  it('devrait afficher les sons du profil', () => {
    render(<ProfileManagerModal {...defaultProps} />)
    expect(screen.getByText('Sound 1')).toBeInTheDocument()
    expect(screen.getByText('Sound 2')).toBeInTheDocument()
  })

  it('devrait afficher "Aucun son" quand la liste est vide', () => {
    render(<ProfileManagerModal {...defaultProps} sounds={[]} />)
    expect(screen.getByText('Ce profil ne contient aucun son.')).toBeInTheDocument()
  })

  it('devrait sélectionner/désélectionner les sons', async () => {
    render(<ProfileManagerModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(2)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    await userEvent.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()

    await userEvent.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
  })

  it('devrait tout sélectionner/désélectionner', async () => {
    render(<ProfileManagerModal {...defaultProps} />)

    const selectAllButton = screen.getByText('Tout sélectionner')
    await userEvent.click(selectAllButton)

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((cb) => expect(cb).toBeChecked())

    const deselectAllButton = screen.getByText('Tout désélectionner')
    await userEvent.click(deselectAllButton)

    checkboxes.forEach((cb) => expect(cb).not.toBeChecked())
  })

  it('devrait retirer les sons sélectionnés du profil', async () => {
    render(<ProfileManagerModal {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])

    const removeButton = screen.getByText(/Retirer sélection/i)
    await userEvent.click(removeButton)

    await waitFor(() => {
      expect(mockStore.removeSoundFromProfile).toHaveBeenCalledWith(
        'sound-1',
        'profile-1'
      )
      expect(defaultProps.addToast).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('devrait supprimer le profil', async () => {
    render(<ProfileManagerModal {...defaultProps} />)

    const deleteButton = screen.getByText('Supprimer le profil')
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockStore.deleteProfile).toHaveBeenCalledWith('profile-1')
      expect(defaultProps.addToast).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('devrait fermer le modal sur le bouton Fermer', async () => {
    render(<ProfileManagerModal {...defaultProps} />)

    const closeButton = screen.getByText('Fermer')
    await userEvent.click(closeButton)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})