// sounddeck/src/pages/Discover.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Discover from './Discover'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      discoverTitle: 'Découverte',
      discoverSub: 'Sons depuis MyInstants',
      discoverResults: 'résultats',
      previewVolume: 'Volume aperçu',
      searchSound: 'Rechercher un son...',
      searchBtn: 'Chercher',
      catTrending: 'Tendances',
      catBest: 'Classiques',
      catDiscord: 'Discord',
      catAnime: 'Anime & Manga',
      catGames: 'Jeux vidéo',
      catMemes: 'Memes',
      catMovies: 'Films',
      catMusic: 'Musique',
      catPolitics: 'Politique',
      catPranks: 'Canulars',
      catReactions: 'Réactions',
      catSfx: 'Effets sonores',
      catSports: 'Sports',
      catTv: 'Télévision',
      catTiktok: 'TikTok Trends',
      catViral: 'Viral',
      catWhatsapp: 'Whatsapp',
      loading: 'Chargement depuis MyInstants...',
      resolvingLinks: 'Résolution des liens audio en cours',
      noResult: 'Aucun son trouvé pour cette recherche.',
      connectionError: 'Erreur de connexion à MyInstants.',
      retry: 'Réessayer',
      alreadyAdded: 'Ajouté',
      downloadBtn: 'Ajouter',
      downloading: 'En cours...',
      previewError: 'Impossible de prévisualiser ce son',
      previewBtn: 'Écouter',
      stopBtn: 'Arrêter',
      clickToListen: 'Cliquer pour écouter',
      addTo: 'Ajouter "{name}" à...',
      ofGlobal: 'du volume global',
      cancel: 'Annuler',
      add: 'Ajouter',
      allSounds: 'Tous les sons',
      addSound: 'Ajouter'
    }
    return translations[key] || key
  }),
  LANGUAGES: [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' }
  ]
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

describe('Discover', () => {
  const mockStore = {
    sounds: [],
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true },
      { id: 'profile1', name: 'Test Profile', isDefault: false }
    ],
    volume: 80,
    previewVolume: 50,
    addSound: vi.fn(),
    updatePreviewVolume: vi.fn()
  }

  const defaultProps = {
    store: mockStore,
    addToast: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.fetchMyinstants = vi.fn().mockResolvedValue({
      success: true,
      sounds: [
        { id: 'test-1', name: 'Test Sound 1', url: 'https://example.com/1.mp3', emoji: '🔊', slug: 'test-1' },
        { id: 'test-2', name: 'Test Sound 2', url: 'https://example.com/2.mp3', emoji: '🎵', slug: 'test-2' }
      ]
    })
    window.electronAPI.downloadSoundUrl = vi.fn().mockResolvedValue({ success: true, path: '/fake/sound.mp3' })
    window.electronAPI.fileExists = vi.fn().mockResolvedValue(true)
  })

  const renderDiscover = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Discover {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    return result
  }

  it('devrait afficher le titre "Découverte"', async () => {
    await renderDiscover()
    expect(screen.getByText('Découverte')).toBeInTheDocument()
  })

  it('devrait afficher les catégories', async () => {
    await renderDiscover()
    expect(screen.getByText('🔥 Tendances')).toBeInTheDocument()
    expect(screen.getByText('🏆 Classiques')).toBeInTheDocument()
    expect(screen.getByText('💬 Discord')).toBeInTheDocument()
  })

  it('devrait afficher la barre de recherche', async () => {
    await renderDiscover()
    expect(screen.getByPlaceholderText('Rechercher un son...')).toBeInTheDocument()
    expect(screen.getByText('Chercher')).toBeInTheDocument()
  })

  it('devrait charger les sons tendances au démarrage', async () => {
    await renderDiscover()
    await waitFor(() => {
      expect(window.electronAPI.fetchMyinstants).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher les sons chargés', async () => {
    await renderDiscover()
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
      expect(screen.getByText('Test Sound 2')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait changer de catégorie au clic', async () => {
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const classicsButton = screen.getByText('🏆 Classiques')
    await act(async () => {
      await userEvent.click(classicsButton)
    })
    
    await waitFor(() => {
      expect(classicsButton).toHaveClass('active')
    }, { timeout: 3000 })
  })

  it('devrait effectuer une recherche', async () => {
    await renderDiscover()
    
    const searchInput = screen.getByPlaceholderText('Rechercher un son...')
    await act(async () => {
      await userEvent.type(searchInput, 'boom')
    })
    
    const searchButton = screen.getByText('Chercher')
    await act(async () => {
      await userEvent.click(searchButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.fetchMyinstants).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher un message "Aucun son trouvé" quand il n\'y a pas de résultats', async () => {
    window.electronAPI.fetchMyinstants = vi.fn().mockResolvedValue({
      success: true,
      sounds: []
    })
    
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Aucun son trouvé pour cette recherche.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait afficher le contrôle de volume d\'aperçu', async () => {
    await renderDiscover()
    expect(screen.getByTitle('Diminuer (-5%)')).toBeInTheDocument()
    expect(screen.getByTitle('Augmenter (+5%)')).toBeInTheDocument()
  })

  it('devrait ouvrir le modal de sélection de profil lors du clic sur "Ajouter"', async () => {
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const addButtons = screen.getAllByText('Ajouter')
    await act(async () => {
      await userEvent.click(addButtons[0])
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Ajouter "Test Sound 1" à.../)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait télécharger et ajouter le son au profil sélectionné', async () => {
    window.electronAPI.downloadSoundUrl = vi.fn().mockResolvedValue({ 
      success: true, 
      path: '/fake/sound.mp3' 
    })
    
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // ✅ Cliquer sur le bouton "Ajouter" du premier son
    const addButtons = screen.getAllByText('Ajouter')
    await act(async () => {
      await userEvent.click(addButtons[0])
    })
    
    // ✅ Attendre que le modal s'ouvre
    await waitFor(() => {
      expect(screen.getByText(/Ajouter "Test Sound 1" à.../)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // ✅ Sélectionner "Tous les sons" dans le modal
    const allSoundsOption = screen.getByText('Tous les sons')
    await act(async () => {
      await userEvent.click(allSoundsOption)
    })
    
    // ✅ Trouver le bouton "Ajouter" DANS le modal
    // On utilise querySelector sur le modal pour trouver le bouton btn-primary
    const modalElement = document.querySelector('.modal')
    const modalAddButton = modalElement?.querySelector('button.btn-primary')
    
    if (modalAddButton) {
      await act(async () => {
        await userEvent.click(modalAddButton)
      })
    } else {
      // Fallback: chercher le dernier bouton dans les actions du modal
      const modalActions = document.querySelector('.modal-actions')
      const buttons = modalActions?.querySelectorAll('button') || []
      const lastButton = buttons[buttons.length - 1]
      await act(async () => {
        await userEvent.click(lastButton)
      })
    }
    
    await waitFor(() => {
      expect(window.electronAPI.downloadSoundUrl).toHaveBeenCalled()
      expect(mockStore.addSound).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('devrait afficher "Ajouté" pour les sons déjà dans la bibliothèque', async () => {
    const storeWithSounds = {
      ...mockStore,
      sounds: [
        { id: 'existing-1', name: 'Test Sound 1', path: '/fake/path.mp3' }
      ]
    }
    
    await renderDiscover({ store: storeWithSounds })
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
      const addedButton = screen.getByText('Ajouté')
      expect(addedButton).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait écouter la prévisualisation d\'un son', async () => {
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const listenButtons = screen.getAllByTitle('Écouter')
    await act(async () => {
      await userEvent.click(listenButtons[0])
    })
    
    await waitFor(() => {
      expect(screen.getByTitle('Arrêter')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait arrêter la prévisualisation en cliquant à nouveau sur "Arrêter"', async () => {
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const listenButtons = screen.getAllByTitle('Écouter')
    await act(async () => {
      await userEvent.click(listenButtons[0])
    })
    
    await waitFor(() => {
      expect(screen.getByTitle('Arrêter')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const stopButton = screen.getByTitle('Arrêter')
    await act(async () => {
      await userEvent.click(stopButton)
    })
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Écouter').length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('devrait afficher une erreur en cas d\'échec de chargement', async () => {
    window.electronAPI.fetchMyinstants = vi.fn().mockResolvedValue({
      success: false,
      error: 'Erreur de connexion'
    })
    
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Erreur de connexion')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait permettre de réessayer en cas d\'erreur', async () => {
    window.electronAPI.fetchMyinstants = vi.fn()
      .mockResolvedValueOnce({
        success: false,
        error: 'Erreur de connexion'
      })
      .mockResolvedValueOnce({
        success: true,
        sounds: [
          { id: 'retry-1', name: 'Retry Sound', url: 'https://example.com/retry.mp3', emoji: '🔊', slug: 'retry' }
        ]
      })
    
    await renderDiscover()
    
    await waitFor(() => {
      expect(screen.getByText('Erreur de connexion')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const retryButton = screen.getByText('Réessayer')
    await act(async () => {
      await userEvent.click(retryButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Retry Sound')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})