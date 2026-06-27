import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'

// Mock du store
const mockStore = {
  currentSounds: [],
  favoriteSounds: [],
  sounds: [],
  shortcuts: {},
  audioDevice: 'default',
  volume: 80,
  playLocally: true,
  currentProfileId: 'all',
  profiles: [{ id: 'all', name: 'Tous les sons', isDefault: true }],
  toggleFavorite: vi.fn(),
  setShortcut: vi.fn(),
  updateSoundVolume: vi.fn(),
  incrementPlayCount: vi.fn(),
  deleteSound: vi.fn(),
  updateSound: vi.fn(),
  updateSoundImage: vi.fn(),
  updateSoundEmoji: vi.fn(),
  removeSoundFromProfile: vi.fn(),
  addSoundToProfile: vi.fn(),
  reorderSounds: vi.fn(),
  addSound: vi.fn(),
  createProfile: vi.fn()
}

describe('Home', () => {
  const defaultProps = {
    store: mockStore,
    addToast: vi.fn(),
    loopEnabled: false,
    lang: 'fr',
    globalSearch: ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher le message "Aucun son pour ce profil" quand il n\'y a pas de sons', () => {
    render(<Home {...defaultProps} />)
    expect(screen.getByText(/Aucun son pour ce profil/i)).toBeInTheDocument()
  })

  it('devrait afficher les sons du profil', () => {
    const storeWithSounds = {
      ...mockStore,
      currentSounds: [
        { id: '1', name: 'Sound 1', path: '/fake/1.mp3', emoji: '🔊', favorites: [], profiles: ['all'] },
        { id: '2', name: 'Sound 2', path: '/fake/2.mp3', emoji: '🎵', favorites: [], profiles: ['all'] }
      ]
    }
    
    render(<Home {...defaultProps} store={storeWithSounds} />)
    expect(screen.getByText('Sound 1')).toBeInTheDocument()
    expect(screen.getByText('Sound 2')).toBeInTheDocument()
  })

  it('devrait ouvrir le modal d\'ajout quand on clique sur "Ajouter"', async () => {
    render(<Home {...defaultProps} />)
    
    // Utiliser getAllByText et prendre le bouton (pas le texte dans le drop-zone)
    const addButtons = screen.getAllByText(/Ajouter/i)
    const addButton = addButtons[0] // Le premier est le bouton
    await userEvent.click(addButton)
    
    // Le modal s'ouvre
    expect(screen.getByText(/Ajouter un son/i)).toBeInTheDocument()
  })

  it('devrait filtrer les sons avec la recherche', () => {
    const storeWithSounds = {
      ...mockStore,
      currentSounds: [
        { id: '1', name: 'Airhorn', path: '/fake/1.mp3', emoji: '🔊', favorites: [], profiles: ['all'] },
        { id: '2', name: 'Bruh', path: '/fake/2.mp3', emoji: '🎵', favorites: [], profiles: ['all'] }
      ]
    }
    
    render(<Home {...defaultProps} store={storeWithSounds} globalSearch="Air" />)
    
    expect(screen.getByText('Airhorn')).toBeInTheDocument()
    expect(screen.queryByText('Bruh')).not.toBeInTheDocument()
  })
})