import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Editor from '@features/editor/Editor'

// ✅ Mock de useLanguage
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {

      editorTitle: 'Éditeur de sons',
      editorSearch: 'Rechercher...',
      editorNoSound: 'Aucun son trouvé',
      selectSound: 'Sélectionnez un son à éditer',
      selectSoundDesc: 'Choisissez un son dans la liste de gauche pour le rogner, le renommer et personnaliser son apparence.',
      editingOf: 'Édition de :',
      originalKept: 'L\'original sera conservé — un nouveau son sera créé',
      trimSound: 'Rogner le son',
      start: 'Début',
      end: 'Fin',
      duration: 'Durée',
      listenSelection: 'Écouter la sélection',
      selectAll: 'Tout sélectionner',
      createSound: 'Créer le son',
      creating: 'Création...',
      editorPreview: 'Aperçu',
      editorNameLabel: 'Nom *',
      editorImageLabel: 'Image (optionnel)',
      editorImageChange: 'Changer',
      editorImageChoose: 'Choisir',
      editorEmojiLabel: 'Emoji',
      editorProfilesLabel: 'Ajouter au(x) profil(s)',
      editorNamePlaceholder: 'Nom du nouveau son',
      editorNameRequired: 'Le nom est requis',
      editorProfileRequired: 'Sélectionnez au moins un profil',
      editorCreated: 'créé avec succès !',
      editorTrimNote: 'Le rognage précis nécessite @ffmpeg-installer/ffmpeg.',
      cancel: 'Annuler',
      allSounds: 'Tous les sons'
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

describe('Editor', () => {
  const mockSounds = [
    { id: 'sound-1', name: 'Test Sound 1', path: '/fake/path1.mp3', emoji: '🔊', profiles: ['all'] },
    { id: 'sound-2', name: 'Test Sound 2', path: '/fake/path2.mp3', emoji: '🎵', profiles: ['all'] }
  ]

  const mockStore = {
    sounds: mockSounds,
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
    window.electronAPI.openImageDialog = vi.fn().mockResolvedValue('/fake/image.png')
    window.electronAPI.importImageFile = vi.fn().mockResolvedValue({ success: true, path: '/fake/imported.png' })
    window.electronAPI.trimSoundFile = vi.fn().mockResolvedValue({ success: true, path: '/fake/trimmed.mp3' })
    window.electronAPI.fileExists = vi.fn().mockResolvedValue(true)
  })

  const renderEditor = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Editor {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  it('devrait afficher le titre "Éditeur de sons"', async () => {
    await renderEditor()
    expect(screen.getByText('Éditeur de sons')).toBeInTheDocument()
  })

  it('devrait afficher la liste des sons', async () => {
    await renderEditor()
    expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    expect(screen.getByText('Test Sound 2')).toBeInTheDocument()
  })

  it('devrait filtrer les sons avec la recherche', async () => {
    await renderEditor()
    
    const searchInput = screen.getByPlaceholderText('Rechercher...')
    await act(async () => {
      await userEvent.type(searchInput, 'Sound 1')
    })
    
    expect(screen.getByText('Test Sound 1')).toBeInTheDocument()
    expect(screen.queryByText('Test Sound 2')).not.toBeInTheDocument()
  })

  it('devrait afficher "Aucun son trouvé" quand la recherche ne donne rien', async () => {
    await renderEditor()
    
    const searchInput = screen.getByPlaceholderText('Rechercher...')
    await act(async () => {
      await userEvent.type(searchInput, 'inexistant')
    })
    
    expect(screen.getByText('Aucun son trouvé')).toBeInTheDocument()
  })

  it('devrait sélectionner un son au clic', async () => {
    await renderEditor()
    
    // ✅ Trouver et cliquer sur le son
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    // ✅ Attendre que l'éditeur s'affiche
    await waitFor(() => {
      // Vérifier que le nom du son apparaît dans l'éditeur
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('devrait afficher le message "Sélectionnez un son à éditer" quand aucun son n\'est sélectionné', async () => {
    await renderEditor()
    expect(screen.getByText('Sélectionnez un son à éditer')).toBeInTheDocument()
  })

  it('devrait permettre de modifier le nom du son', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const nameInput = screen.getByPlaceholderText('Nom du nouveau son')
    await act(async () => {
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Nouveau Nom')
    })
    
    expect(nameInput).toHaveValue('Nouveau Nom')
  })

  it('devrait permettre de choisir une image', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const chooseImageButton = screen.getByText('Choisir')
    await act(async () => {
      await userEvent.click(chooseImageButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.openImageDialog).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait créer un nouveau son', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const nameInput = screen.getByPlaceholderText('Nom du nouveau son')
    await act(async () => {
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Nouveau Son')
    })
    
    const createButton = screen.getByText('Créer le son')
    await act(async () => {
      await userEvent.click(createButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.trimSoundFile).toHaveBeenCalled()
      expect(mockStore.addSound).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher une erreur si le nom est vide', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const nameInput = screen.getByPlaceholderText('Nom du nouveau son')
    await act(async () => {
      await userEvent.clear(nameInput)
    })
    
    const createButton = screen.getByText('Créer le son')
    await act(async () => {
      await userEvent.click(createButton)
    })
    
    expect(defaultProps.addToast).toHaveBeenCalledWith('Le nom est requis', 'error')
  })

  it('devrait permettre de sélectionner des profils pour le nouveau son', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    expect(screen.getByText('Tous les sons')).toBeInTheDocument()
    expect(screen.getByText('Test Profile')).toBeInTheDocument()
    
    const profileCheckbox = screen.getByLabelText('Test Profile')
    await act(async () => {
      await userEvent.click(profileCheckbox)
    })
  })

  it('devrait afficher l\'aperçu du son sélectionné', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    expect(screen.getByText('Aperçu')).toBeInTheDocument()
  })

  it('devrait permettre d\'annuler l\'édition', async () => {
    await renderEditor()
    
    const soundItem = screen.getByText('Test Sound 1')
    await act(async () => {
      await userEvent.click(soundItem)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Édition de :/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    const cancelButton = screen.getByText('Annuler')
    await act(async () => {
      await userEvent.click(cancelButton)
    })
    
    expect(screen.getByText('Sélectionnez un son à éditer')).toBeInTheDocument()
  })
})