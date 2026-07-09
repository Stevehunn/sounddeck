import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SoundCard from './SoundCard'

// Mock des fonctions audio
vi.mock('../utils/audio', () => ({
  playSound: vi.fn(),
  stopSound: vi.fn(),
  isPlaying: vi.fn(() => false),
  getSoundProgress: vi.fn(() => null)
}))

describe('SoundCard', () => {
  const mockSound = {
    id: 'test-1',
    name: 'Test Sound',
    path: '/fake/path/sound.mp3',
    emoji: '🔊',
    favorites: [],
    volume: 0,
    playCount: 0
  }

  const defaultProps = {
    sound: mockSound,
    shortcut: null,
    audioDevice: 'default',
    volume: 80,
    loopEnabled: false,
    playLocally: true,
    onToggleFavorite: vi.fn(),
    onSetShortcut: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onVolumeChange: vi.fn(),
    onPlay: vi.fn(),
    currentProfileId: 'all',
    lang: 'fr',
    draggable: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.fileExists = vi.fn().mockResolvedValue(true)
  })

  it('devrait afficher le nom du son', () => {
    render(<SoundCard {...defaultProps} />)
    expect(screen.getByText('Test Sound')).toBeInTheDocument()
  })

  it('devrait afficher l\'emoji du son', () => {
    render(<SoundCard {...defaultProps} />)
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  it('devrait afficher le raccourci si présent', () => {
    render(<SoundCard {...defaultProps} shortcut="Ctrl+Shift+1" />)
    expect(screen.getByText('Ctrl+Shift+1')).toBeInTheDocument()
  })

  it('devrait appeler onToggleFavorite quand on clique sur l\'étoile', async () => {
    const onToggleFavorite = vi.fn()
    render(<SoundCard {...defaultProps} onToggleFavorite={onToggleFavorite} />)
    
    // Utiliser getAllByRole et prendre le premier bouton (l'étoile)
    const buttons = screen.getAllByRole('button')
    const starButton = buttons[0] // Le premier bouton est l'étoile
    await userEvent.click(starButton)
    
    expect(onToggleFavorite).toHaveBeenCalledWith('test-1')
  })

  it('devrait ouvrir le menu contextuel sur le bouton dots', async () => {
    render(<SoundCard {...defaultProps} />)
    
    const buttons = screen.getAllByRole('button')
    const dotsButton = buttons[1] // Le deuxième bouton est le menu
    await userEvent.click(dotsButton)
    
    // Vérifier que le menu s'ouvre (les textes sont dans le menu)
    expect(screen.getByText(/Renommer/i)).toBeInTheDocument()
    expect(screen.getByText(/Régler le volume/i)).toBeInTheDocument()
    expect(screen.getByText(/Supprimer définitivement/i)).toBeInTheDocument()
  })

  it('devrait afficher le compteur de lecture', () => {
    const soundWithCount = { ...mockSound, playCount: 5 }
    render(<SoundCard {...defaultProps} sound={soundWithCount} />)
    expect(screen.getByText('5 fois')).toBeInTheDocument()
  })
})