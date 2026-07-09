import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileManagerModal from './ProfileManagerModal'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      profileManagerTitle: 'Gérer le profil',
      profileManagerSelectAll: 'Tout sélectionner',
      profileManagerDeselectAll: 'Tout désélectionner',
      profileManagerRemoveSelected: 'Retirer sélection',
      profileManagerDeleteProfile: 'Supprimer le profil',
      profileManagerConfirmRemove: 'Confirmer la suppression',
      profileManagerConfirmMessage: 'Vous êtes sur le point de retirer {count} son(s) du profil "{name}".',
      profileManagerConfirmSub: 'Ces sons resteront dans votre bibliothèque et pourront être réajoutés plus tard.',
      profileManagerNoSounds: 'Ce profil ne contient aucun son.',
      profileManagerFavorite: 'Favori',
      close: 'Fermer',
      allSounds: 'Tous les sons'
    }
    return translations[key] || key
  })
}))

describe('ProfileManagerModal', () => {
  const mockSounds = [
    { id: 'sound-1', name: 'Sound 1', emoji: '🔊', profiles: ['profile-1'] },
    { id: 'sound-2', name: 'Sound 2', emoji: '🎵', profiles: ['profile-1'] }
  ]

  const mockStore = {
    removeSoundFromProfile: vi.fn(),
    deleteProfile: vi.fn()
  }

  const defaultProps = {
    profileId: 'profile-1',
    profileName: 'Test Profile',
    sounds: mockSounds,
    store: mockStore,
    onClose: vi.fn(),
    addToast: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // ✅ Mock de confirm pour éviter les popups
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('devrait afficher le titre avec le nom du profil', () => {
    render(<ProfileManagerModal {...defaultProps} />)
    expect(screen.getByText(/Gérer le profil/)).toBeInTheDocument()
    expect(screen.getByText('Test Profile')).toBeInTheDocument()
  })

  it('devrait afficher le nombre de sons', () => {
    render(<ProfileManagerModal {...defaultProps} />)
    expect(screen.getByText('2 son(s)')).toBeInTheDocument()
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
    
    // ✅ Utiliser getAllByRole pour trouver les checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(2)
    
    // ✅ Vérifier que les checkboxes ne sont pas cochées
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    
    // ✅ Cocher la première
    await userEvent.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()
    
    // ✅ Décocher la première
    await userEvent.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
  })

  it('devrait tout sélectionner/désélectionner', async () => {
    render(<ProfileManagerModal {...defaultProps} />)
    
    const selectAllButton = screen.getByText('Tout sélectionner')
    await userEvent.click(selectAllButton)
    
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(cb => expect(cb).toBeChecked())
    
    const deselectAllButton = screen.getByText('Tout désélectionner')
    await userEvent.click(deselectAllButton)
    
    checkboxes.forEach(cb => expect(cb).not.toBeChecked())
  })

  it('devrait retirer les sons sélectionnés du profil', async () => {
    render(<ProfileManagerModal {...defaultProps} />)
    
    // ✅ Sélectionner le premier son
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    
    // ✅ Cliquer sur "Retirer sélection"
    const removeButton = screen.getByText('Retirer sélection (1)')
    await userEvent.click(removeButton)
    
    // ✅ Le modal de confirmation devrait apparaître
    await waitFor(() => {
      expect(screen.getByText('Confirmer la suppression')).toBeInTheDocument()
    })
    
    // ✅ Cliquer sur "Confirmer"
    const confirmButton = screen.getByText('Confirmer')
    await userEvent.click(confirmButton)
    
    expect(mockStore.removeSoundFromProfile).toHaveBeenCalledWith('sound-1', 'profile-1')
    expect(defaultProps.addToast).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('devrait supprimer le profil', async () => {
    render(<ProfileManagerModal {...defaultProps} />)
    
    const deleteButton = screen.getByText('Supprimer le profil')
    await userEvent.click(deleteButton)
    
    // ✅ Le mock de confirm a été configuré pour retourner true
    expect(window.confirm).toHaveBeenCalled()
    expect(mockStore.deleteProfile).toHaveBeenCalledWith('profile-1')
    expect(defaultProps.addToast).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('devrait fermer le modal sur le bouton Fermer', async () => {
    render(<ProfileManagerModal {...defaultProps} />)
    
    const closeButton = screen.getByText('Fermer')
    await userEvent.click(closeButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})