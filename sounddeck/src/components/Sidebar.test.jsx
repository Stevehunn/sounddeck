import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from './Sidebar'

// Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      profiles: 'Profils',
      navigation: 'Navigation',
      mySounds: 'Mes sons',
      discover: 'Découverte',
      editor: 'Éditeur',
      sequencer: 'Séquenceur',
      youtube: 'YouTube',
      guide: 'Guide Discord',
      options: 'Options',
      newProfile: 'Nouveau profil',
      loop: 'Répétition',
      volume: 'Volume',
      stopAll: 'Stop tous les sons',
      presentation: 'Présentation',
      dragToReorder: 'Glisser pour réorganiser',
      allSounds: 'Tous les sons',
      shortcuts: 'Raccourcis'
    }
    return translations[key] || key
  })
}))

describe('Sidebar', () => {
  const defaultProps = {
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true },
      { id: 'profile1', name: 'Test Profile 1', isDefault: false },
      { id: 'profile2', name: 'Test Profile 2', isDefault: false }
    ],
    currentProfileId: 'all',
    currentPage: 'home',
    onSwitchProfile: vi.fn(),
    onChangePage: vi.fn(),
    onCreateProfile: vi.fn(),
    onToggleLoop: vi.fn(),
    loopEnabled: false,
    addToast: vi.fn(),
    volume: 80,
    onVolumeChange: vi.fn(),
    onStopAll: vi.fn(),
    onPresentation: vi.fn(),
    lang: 'fr',
    onReorderProfiles: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.getGlobalShortcutsState = vi.fn().mockResolvedValue(true)
    window.electronAPI.onShortcutsToggle = vi.fn()
    window.electronAPI.removeAllListeners = vi.fn()
    window.electronAPI.toggleGlobalShortcuts = vi.fn().mockResolvedValue(true)
  })

  it('devrait afficher le logo SoundDeck', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('SoundDeck')).toBeInTheDocument()
  })

  it('devrait afficher le titre "Profils"', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Profils')).toBeInTheDocument()
  })

  it('devrait afficher tous les profils', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Tous les sons')).toBeInTheDocument()
    expect(screen.getByText('Test Profile 1')).toBeInTheDocument()
    expect(screen.getByText('Test Profile 2')).toBeInTheDocument()
  })

  it('devrait afficher la navigation', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Mes sons')).toBeInTheDocument()
    expect(screen.getByText('Découverte')).toBeInTheDocument()
    expect(screen.getByText('Éditeur')).toBeInTheDocument()
    expect(screen.getByText('Séquenceur')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
  })

  it('devrait afficher le bouton "Nouveau profil"', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Nouveau profil')).toBeInTheDocument()
  })

  it('devrait ouvrir le champ de création de profil en cliquant sur "Nouveau profil"', async () => {
    render(<Sidebar {...defaultProps} />)
    
    const newProfileButton = screen.getByText('Nouveau profil')
    await userEvent.click(newProfileButton)
    
    // Vérifier que le champ de saisie apparaît
    expect(screen.getByPlaceholderText('Nouveau profil')).toBeInTheDocument()
  })

  it('devrait appeler onCreateProfile avec le nom saisi', async () => {
    const onCreateProfile = vi.fn()
    render(<Sidebar {...defaultProps} onCreateProfile={onCreateProfile} />)
    
    // Ouvrir le champ de création
    await userEvent.click(screen.getByText('Nouveau profil'))
    
    const input = screen.getByPlaceholderText('Nouveau profil')
    await userEvent.type(input, 'Mon Nouveau Profil{Enter}')
    
    expect(onCreateProfile).toHaveBeenCalledWith('Mon Nouveau Profil')
  })

  it('devrait appeler onSwitchProfile en cliquant sur un profil', async () => {
    const onSwitchProfile = vi.fn()
    render(<Sidebar {...defaultProps} onSwitchProfile={onSwitchProfile} />)
    
    await userEvent.click(screen.getByText('Test Profile 1'))
    expect(onSwitchProfile).toHaveBeenCalledWith('profile1')
  })

  it('devrait appeler onChangePage en cliquant sur un élément de navigation', async () => {
    const onChangePage = vi.fn()
    render(<Sidebar {...defaultProps} onChangePage={onChangePage} />)
    
    await userEvent.click(screen.getByText('Découverte'))
    expect(onChangePage).toHaveBeenCalledWith('discover')
  })

  it('devrait afficher le volume avec le pourcentage', () => {
    render(<Sidebar {...defaultProps} volume={65} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('devrait appeler onVolumeChange lors du changement de volume', async () => {
    const onVolumeChange = vi.fn()
    render(<Sidebar {...defaultProps} onVolumeChange={onVolumeChange} />)
    
    const rangeInput = document.querySelector('input[type="range"]')
    fireEvent.change(rangeInput, { target: { value: 50 } })
    
    expect(onVolumeChange).toHaveBeenCalledWith(50)
  })

  it('devrait appeler onStopAll en cliquant sur le bouton Stop', async () => {
    const onStopAll = vi.fn()
    render(<Sidebar {...defaultProps} onStopAll={onStopAll} />)
    
    await userEvent.click(screen.getByText('Stop tous les sons'))
    expect(onStopAll).toHaveBeenCalled()
  })

  it('devrait appeler onToggleLoop en cliquant sur le bouton Loop', async () => {
    const onToggleLoop = vi.fn()
    render(<Sidebar {...defaultProps} onToggleLoop={onToggleLoop} />)
    
    await userEvent.click(screen.getByText('Répétition'))
    expect(onToggleLoop).toHaveBeenCalled()
  })

    it('devrait afficher "ON" sur le bouton Loop quand activé', () => {
    render(<Sidebar {...defaultProps} loopEnabled={true} />)
    const onElements = screen.getAllByText('ON')
    expect(onElements.length).toBeGreaterThan(0)
    expect(onElements[0]).toBeInTheDocument()
  })

  it('devrait afficher "OFF" sur le bouton Loop quand désactivé', () => {
    render(<Sidebar {...defaultProps} loopEnabled={false} />)
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('devrait appeler onPresentation en cliquant sur Présentation', async () => {
    const onPresentation = vi.fn()
    render(<Sidebar {...defaultProps} onPresentation={onPresentation} />)
    
    await userEvent.click(screen.getByText('Présentation'))
    expect(onPresentation).toHaveBeenCalled()
  })

  it('devrait afficher "Glisser pour réorganiser"', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Glisser pour réorganiser')).toBeInTheDocument()
  })
})