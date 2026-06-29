import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YouTube from './YouTube'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      youtubeTitle: 'Import YouTube',
      youtubeSub: 'Extraire l\'audio depuis une vidéo YouTube',
      ytdlpRequired: 'yt-dlp requis',
      ytdlpDesc: 'L\'import YouTube nécessite yt-dlp.',
      installYtdlp: 'Installer yt-dlp automatiquement',
      installing: 'Installation...',
      ytdlpChecking: 'Vérification de yt-dlp...',
      ytdlpDownloading: 'Téléchargement de yt-dlp en cours...',
      ytdlpInstalled: 'yt-dlp installé avec succès !',
      ytdlpInstallError: 'Erreur installation :',
      pasteUrl: 'Collez le lien YouTube',
      ytUrlPlaceholder: 'https://www.youtube.com/watch?v=...',
      ytUrlNote: 'Fonctionne avec YouTube, YouTube Music.',
      load: 'Charger',
      loading2: 'Chargement...',
      selectPortion: 'Sélectionner la portion',
      ytTrimTitle: 'Portion à extraire',
      ytTrimDuration: 'Durée sélectionnée :',
      ytTrimSelectAll: 'Tout sélectionner',
      ytTrimTotalDuration: 'Durée totale :',
      ytPreciseStart: 'Début précis (secondes)',
      ytPreciseEnd: 'Fin précise (secondes)',
      ytBack: 'Retour',
      downloadAudio: 'Télécharger l\'audio',
      ytDownloading: 'Téléchargement...',
      ytAudioDownloading: 'Téléchargement audio en cours...',
      ytAudioReady: 'Audio téléchargé !',
      ytDownloadError: 'Erreur téléchargement :',
      configSound: 'Configurer le son',
      ytSaveSubtitle: 'Dernière étape',
      ytSuccessTitle: 'Audio téléchargé avec succès',
      ytSuccessSource: 'Source :',
      ytSoundNamePlaceholder: 'Nom du son',
      ytProfilesLabel: 'Ajouter au(x) profil(s)',
      addToLibrary: 'Ajouter à la bibliothèque',
      ytSoundAdded: 'ajouté à la bibliothèque !',
      ytFetchError: 'Erreur :',
      allSounds: 'Tous les sons',
      cancel: 'Annuler',
      editorNameLabel: 'Nom *',
      editorProfilesLabel: 'Ajouter au(x) profil(s)'
    }
    return translations[key] || key
  })
}))

describe('YouTube', () => {
  const mockStore = {
    sounds: [],
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true },
      { id: 'profile1', name: 'Test Profile', isDefault: false }
    ],
    addSound: vi.fn()
  }

  const defaultProps = {
    store: mockStore,
    addToast: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.checkYtdlp = vi.fn().mockResolvedValue({ available: true })
    window.electronAPI.downloadYtdlp = vi.fn().mockResolvedValue({ success: true })
    window.electronAPI.youtubeInfo = vi.fn().mockResolvedValue({
      success: true,
      title: 'Test Video',
      duration: 120,
      thumbnail: 'https://example.com/thumb.jpg',
      uploader: 'Test Uploader',
      url: 'https://youtube.com/watch?v=test'
    })
    window.electronAPI.youtubeDownload = vi.fn().mockResolvedValue({
      success: true,
      path: '/fake/youtube.mp3'
    })
  })

  const renderYouTube = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<YouTube {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  it('devrait afficher le titre "Import YouTube"', async () => {
    await renderYouTube()
    expect(screen.getByText('Import YouTube')).toBeInTheDocument()
  })

  it('devrait afficher le champ de saisie URL', async () => {
    await renderYouTube()
    expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toBeInTheDocument()
    expect(screen.getByText('Charger')).toBeInTheDocument()
  })

  it('devrait charger les infos de la vidéo', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.youtubeInfo).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher les informations de la vidéo chargée', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Sélectionner la portion')).toBeInTheDocument()
      expect(screen.getByText('Test Video')).toBeInTheDocument()
      expect(screen.getByText('Test Uploader')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait permettre de sélectionner une portion de la vidéo', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    // ✅ Attendre que la page de sélection s'affiche
    await waitFor(() => {
      expect(screen.getByText('Sélectionner la portion')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // ✅ Vérifier que les contrôles de sélection sont présents
    // Les sliders sont des input[type="range"]
    const rangeInputs = document.querySelectorAll('input[type="range"]')
    expect(rangeInputs.length).toBeGreaterThan(0)
  })

  it('devrait télécharger l\'audio', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Sélectionner la portion')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const downloadButton = screen.getByText('Télécharger l\'audio')
    await act(async () => {
      await userEvent.click(downloadButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.youtubeDownload).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('devrait afficher la page de configuration après le téléchargement', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Sélectionner la portion')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const downloadButton = screen.getByText('Télécharger l\'audio')
    await act(async () => {
      await userEvent.click(downloadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Configurer le son')).toBeInTheDocument()
      expect(screen.getByText('Audio téléchargé avec succès')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('devrait permettre d\'ajouter le son à la bibliothèque', async () => {
    await renderYouTube()
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await act(async () => {
      await userEvent.type(input, 'https://youtube.com/watch?v=test123')
    })
    
    const loadButton = screen.getByText('Charger')
    await act(async () => {
      await userEvent.click(loadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Sélectionner la portion')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const downloadButton = screen.getByText('Télécharger l\'audio')
    await act(async () => {
      await userEvent.click(downloadButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Configurer le son')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    const nameInput = screen.getByPlaceholderText('Nom du son')
    await act(async () => {
      await userEvent.type(nameInput, 'Mon Son YouTube')
    })
    
    const addButton = screen.getByText('Ajouter à la bibliothèque')
    await act(async () => {
      await userEvent.click(addButton)
    })
    
    expect(mockStore.addSound).toHaveBeenCalled()
    expect(defaultProps.addToast).toHaveBeenCalled()
  })

  it('devrait afficher une erreur si yt-dlp n\'est pas installé', async () => {
    window.electronAPI.checkYtdlp = vi.fn().mockResolvedValue({ available: false })
    
    await renderYouTube()
    
    await waitFor(() => {
      expect(screen.getByText('yt-dlp requis')).toBeInTheDocument()
      expect(screen.getByText('Installer yt-dlp automatiquement')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})