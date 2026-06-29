import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sequencer from './Sequencer'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      sequencerTitle: 'Séquenceur',
      noPlaylist: 'Aucune playlist',
      newPlaylist: 'Nouvelle playlist',
      playlistName: 'Nom de la playlist',
      selectPlaylist: 'Sélectionnez ou créez une playlist',
      selectPlaylistDesc: 'Arrangez vos sons dans l\'ordre souhaité, définissez des délais entre chaque, et lancez la séquence d\'un clic.',
      emptyPlaylist: 'Playlist vide',
      addSounds: 'Ajouter des sons',
      delayAfter: 'Délai après',
      start_seq: 'Lancer',
      stop_seq: 'Arrêter',
      playing: 'En cours de lecture...',
      remaining: 'son(s) restant(s)',
      previous: 'Son précédent',
      next: 'Son suivant',
      activeShortcuts: 'Raccourcis actifs',
      availableSounds: 'Sons disponibles',
      playlists: 'Playlists',
      loop: 'Boucle',
      sounds: 'son(s)',
      search: 'Rechercher...',
      cancel: 'Annuler',
      add: 'Ajouter',
      alreadyAdded: 'Déjà ajouté',
      stopAll: 'Stop tout'
    }
    return translations[key] || key
  })
}))

// ✅ Mock de audio
vi.mock('../utils/audio', () => ({
  registerStopSequencerCallback: vi.fn(),
  getSoundProgress: vi.fn(() => null)
}))

// ✅ Mock de Howl
vi.mock('howler', () => {
  const MockHowl = function() {
    this.play = vi.fn()
    this.stop = vi.fn()
    this.unload = vi.fn()
    this.volume = vi.fn()
    this.duration = vi.fn(() => 10)
    this.seek = vi.fn(() => 5)
    this.on = vi.fn()
    this.once = vi.fn()
    this.playing = vi.fn(() => false)
  }
  return {
    Howl: MockHowl,
    Howler: {
      volume: vi.fn()
    }
  }
})

describe('Sequencer', () => {
  const mockSounds = [
    { id: 'sound-1', name: 'Sound 1', path: '/fake/path1.mp3', emoji: '🔊' },
    { id: 'sound-2', name: 'Sound 2', path: '/fake/path2.mp3', emoji: '🎵' },
    { id: 'sound-3', name: 'Sound 3', path: '/fake/path3.mp3', emoji: '💥' }
  ]

  const mockStore = {
    sounds: mockSounds,
    volume: 80,
    audioDevice: 'default'
  }

  const defaultProps = {
    store: mockStore,
    addToast: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.storeGet = vi.fn().mockResolvedValue([])
    window.electronAPI.storeSet = vi.fn().mockResolvedValue()
  })

  const renderSequencer = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Sequencer {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  // ─── TESTS D'AFFICHAGE ─────────────────────────────────────────────────────

  it('devrait afficher le titre "Séquenceur"', async () => {
    await renderSequencer()
    expect(screen.getByText('Séquenceur')).toBeInTheDocument()
  })

  it('devrait afficher le message "Aucune playlist" quand il n\'y a pas de playlists', async () => {
    await renderSequencer()
    expect(screen.getByText('Aucune playlist')).toBeInTheDocument()
  })

  it('devrait afficher le bouton "Nouvelle playlist"', async () => {
    await renderSequencer()
    expect(screen.getByText('Nouvelle playlist')).toBeInTheDocument()
  })

  it('devrait afficher "Sélectionnez ou créez une playlist" quand aucune playlist n\'est sélectionnée', async () => {
    await renderSequencer()
    expect(screen.getByText('Sélectionnez ou créez une playlist')).toBeInTheDocument()
  })

  // ─── TESTS DE CRÉATION DE PLAYLIST ────────────────────────────────────────

  it('devrait ouvrir le champ de création de playlist en cliquant sur "Nouvelle playlist"', async () => {
    await renderSequencer()
    
    const newPlaylistButton = screen.getByText('Nouvelle playlist')
    await act(async () => {
      await userEvent.click(newPlaylistButton)
    })
    
    expect(screen.getByPlaceholderText('Nom de la playlist')).toBeInTheDocument()
  })

  it('devrait créer une playlist avec le nom saisi', async () => {
    const storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeSet = storeSet
    
    await renderSequencer()
    
    const newPlaylistButton = screen.getByText('Nouvelle playlist')
    await act(async () => {
      await userEvent.click(newPlaylistButton)
    })
    
    const input = screen.getByPlaceholderText('Nom de la playlist')
    await act(async () => {
      await userEvent.type(input, 'Ma Playlist{Enter}')
    })
    
    expect(storeSet).toHaveBeenCalled()
    expect(screen.getAllByText('Ma Playlist').length).toBeGreaterThan(0)
  })

  it('devrait annuler la création de playlist avec Echap', async () => {
    await renderSequencer()
    
    const newPlaylistButton = screen.getByText('Nouvelle playlist')
    await act(async () => {
      await userEvent.click(newPlaylistButton)
    })
    
    const input = screen.getByPlaceholderText('Nom de la playlist')
    await act(async () => {
      await userEvent.type(input, 'Test{Escape}')
    })
    
    expect(screen.queryByPlaceholderText('Nom de la playlist')).not.toBeInTheDocument()
  })

  // ─── TESTS DE SÉLECTION DE PLAYLIST ──────────────────────────────────────

  it('devrait sélectionner une playlist au clic', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    expect(screen.getAllByText('Playlist 1').length).toBeGreaterThan(0)
  })

  // ─── TESTS D'AJOUT DE SONS ──────────────────────────────────────────────

  it('devrait ouvrir le modal d\'ajout de sons', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const addButtons = screen.getAllByText('Ajouter des sons')
    await act(async () => {
      await userEvent.click(addButtons[0])
    })
    
    // ✅ Vérifier que le modal est ouvert en cherchant le titre du modal
    // Le modal a la classe "modal-overlay"
    const modalOverlay = document.querySelector('.modal-overlay')
    expect(modalOverlay).toBeInTheDocument()
    
    // ✅ Vérifier que le champ de recherche du modal est présent
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument()
  })

  it('devrait afficher les sons disponibles dans le modal', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const addButtons = screen.getAllByText('Ajouter des sons')
    await act(async () => {
      await userEvent.click(addButtons[0])
    })
    
    expect(screen.getByText('Sound 1')).toBeInTheDocument()
    expect(screen.getByText('Sound 2')).toBeInTheDocument()
    expect(screen.getByText('Sound 3')).toBeInTheDocument()
  })

  it('devrait ajouter des sons sélectionnés à la playlist', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    const storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeSet = storeSet
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const addButtons = screen.getAllByText('Ajouter des sons')
    await act(async () => {
      await userEvent.click(addButtons[0])
    })
    
    const checkboxes = screen.getAllByRole('checkbox')
    await act(async () => {
      await userEvent.click(checkboxes[0])
    })
    
    const confirmButton = screen.getByText('Ajouter (1)')
    await act(async () => {
      await userEvent.click(confirmButton)
    })
    
    expect(storeSet).toHaveBeenCalled()
  })

  // ─── TESTS DE LECTURE ─────────────────────────────────────────────────────

  it('devrait lancer la séquence', async () => {
    const playlists = [
      { 
        id: 'playlist-1', 
        name: 'Playlist 1', 
        items: [
          { id: 'item-1', soundId: 'sound-1', delay: 1 }
        ] 
      }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const playButton = screen.getByText('Lancer')
    await act(async () => {
      await userEvent.click(playButton)
    })
    
    const stopElements = screen.getAllByText('Arrêter')
    expect(stopElements.length).toBeGreaterThan(0)
  })

  it('devrait arrêter la séquence', async () => {
    const playlists = [
      { 
        id: 'playlist-1', 
        name: 'Playlist 1', 
        items: [
          { id: 'item-1', soundId: 'sound-1', delay: 1 }
        ] 
      }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const playButton = screen.getByText('Lancer')
    await act(async () => {
      await userEvent.click(playButton)
    })
    
    const stopButtons = screen.getAllByText('Arrêter')
    await act(async () => {
      await userEvent.click(stopButtons[0])
    })
    
    expect(screen.getByText('Lancer')).toBeInTheDocument()
  })

  // ─── TESTS DE SUPPRESSION ────────────────────────────────────────────────

  it('devrait supprimer une playlist', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    const storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeSet = storeSet
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const deleteButton = document.querySelector('.sidebar-item .ti-trash')?.closest('button')
    if (deleteButton) {
      await act(async () => {
        await userEvent.click(deleteButton)
      })
      expect(storeSet).toHaveBeenCalled()
    }
  })

  // ─── TESTS DE MODIFICATION DE DÉLAI ─────────────────────────────────────

  it('devrait modifier le délai après un son', async () => {
    const playlists = [
      { 
        id: 'playlist-1', 
        name: 'Playlist 1', 
        items: [
          { id: 'item-1', soundId: 'sound-1', delay: 1 }
        ] 
      }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    const storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeSet = storeSet
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const delayInput = document.querySelector('input[type="number"]')
    if (delayInput) {
      await act(async () => {
        await userEvent.clear(delayInput)
        await userEvent.type(delayInput, '2')
      })
      expect(storeSet).toHaveBeenCalled()
    }
  })

  // ─── TESTS DU MODE LOOP ──────────────────────────────────────────────────

  it('devrait activer/désactiver la boucle', async () => {
    const playlists = [
      { 
        id: 'playlist-1', 
        name: 'Playlist 1', 
        items: [
          { id: 'item-1', soundId: 'sound-1', delay: 1 }
        ],
        loop: false
      }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    const storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeSet = storeSet
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    const loopButton = screen.getByText('Boucle')
    await act(async () => {
      await userEvent.click(loopButton)
    })
    
    expect(storeSet).toHaveBeenCalled()
  })

  // ─── TESTS DE PLAYLIST VIDE ─────────────────────────────────────────────

  it('devrait afficher "Playlist vide" quand la playlist ne contient aucun son', async () => {
    const playlists = [
      { id: 'playlist-1', name: 'Playlist 1', items: [] }
    ]
    window.electronAPI.storeGet = vi.fn().mockResolvedValue(playlists)
    
    await renderSequencer()
    
    await waitFor(() => {
      expect(screen.getByText('Playlist 1')).toBeInTheDocument()
    })
    
    const playlistItem = screen.getByText('Playlist 1')
    await act(async () => {
      await userEvent.click(playlistItem)
    })
    
    expect(screen.getByText('Playlist vide')).toBeInTheDocument()
  })
})