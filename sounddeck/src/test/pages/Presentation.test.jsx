// src/test/pages/Presentation.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Presentation from '@features/presentation/Presentation'

// ─── Mock i18n ──────────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key, params) => {
      const translations = {
        presentationTitle: 'Mode Présentation',
        presentationExit: 'Quitter la présentation',
        presentationFavorites: 'Favoris',
        presentationAllSounds: 'Tous les sons',
        presentationSearch: 'Rechercher...',
        presentationPlaying: 'Lecture en cours...',
        presentationLoopOn: 'Loop ON',
        presentationNoSounds: 'Aucun son en favoris',
        presentationAddFavorites: 'Ajoutez des sons en favoris pour les utiliser ici',
        allSounds: 'Tous les sons',
        mySounds: 'Mes sons',
        sounds: 'son(s)',
        favorites: 'Favoris',
        noSounds: 'Aucun son',
        exitTip: 'Appuyez sur Échap pour quitter',
        helpButtonLabel: 'Aide',
        helpButtonTitle: 'Ouvrir le tutoriel',
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
}))

// ─── Mock AudioService ──────────────────────────────────────────────────────
vi.mock('@core/services/AudioService', () => ({
  playSound: vi.fn(),
  stopSound: vi.fn(),
  isPlaying: vi.fn(() => false),
  getSoundProgress: vi.fn(() => null),
}))

// ─── Mock fileUrl ───────────────────────────────────────────────────────────
vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://file/${p}` : null)),
}))

// ─── Mock HelpButton ────────────────────────────────────────────────────────
vi.mock('@shared/components/ui/HelpButton', () => ({
  default: ({ onClick }) => (
    <button data-testid="help-button" onClick={onClick}>
      Help
    </button>
  ),
}))

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('Presentation', () => {
  const mockSounds = [
    {
      id: 'sound-1',
      name: 'Sound 1',
      path: '/fake/path1.mp3',
      emoji: '🔊',
      favorites: ['all'],
    },
    {
      id: 'sound-2',
      name: 'Sound 2',
      path: '/fake/path2.mp3',
      emoji: '🎵',
      favorites: [],
    },
  ]

  const mockStore = {
    currentSounds: mockSounds,
    favoriteSounds: [mockSounds[0]],
    sounds: mockSounds,
    shortcuts: { 'sound-1': 'Ctrl+1' },
    audioDevice: 'default',
    volume: 80,
    loopEnabled: false,
    playLocally: true,
    incrementPlayCount: vi.fn(),
    profiles: [{ id: 'all', name: 'Tous les sons', isDefault: true }],
    currentProfileId: 'all',
    cardSize: 'medium',
  }

  const defaultProps = {
    store: mockStore,
    onExit: vi.fn(),
    lang: 'fr',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = window.electronAPI || {}
    window.electronAPI.fileExists = vi.fn().mockResolvedValue(true)
  })

  const renderPresentation = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Presentation {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    return result
  }

  it('devrait afficher le titre "Mode Présentation"', async () => {
    await renderPresentation()
    expect(screen.getByText(/Mode Présentation/i)).toBeInTheDocument()
  })

  it('devrait afficher le nom du profil actuel', async () => {
    await renderPresentation()
    expect(screen.getByText(/Tous les sons/i)).toBeInTheDocument()
  })

  it('devrait afficher le nombre de sons', async () => {
    await renderPresentation()
    expect(screen.getByText(/2 son\(s\)/i)).toBeInTheDocument()
  })

  it('devrait afficher le bouton Quitter', async () => {
    await renderPresentation()
    expect(screen.getByTestId('presentation-exit')).toBeInTheDocument()
  })

  it('devrait appeler onExit en cliquant sur Quitter', async () => {
    const onExit = vi.fn()
    await renderPresentation({ onExit })

    const exitButton = screen.getByTestId('presentation-exit')
    await act(async () => {
      await userEvent.click(exitButton)
    })

    expect(onExit).toHaveBeenCalled()
  })

  it('devrait afficher les sons du profil', async () => {
    await renderPresentation()

    const grid = screen.getByTestId('presentation-grid')
    // ✅ within() cible uniquement la grille — évite le doublon avec la section favoris
    expect(within(grid).getByText('Sound 1')).toBeInTheDocument()
    expect(within(grid).getByText('Sound 2')).toBeInTheDocument()
  })

  it('devrait afficher la section favoris quand il y a des favoris', async () => {
    await renderPresentation()
    expect(screen.getByTestId('presentation-favorites')).toBeInTheDocument()
  })

  it("devrait afficher les raccourcis des sons (dans les cards)", async () => {
    await renderPresentation()

    const ctrlKey = screen.queryAllByText(/Ctrl/)
    expect(ctrlKey.length).toBeGreaterThan(0)
  })

  it('devrait afficher le badge Loop ON quand le loop est activé', async () => {
    const storeWithLoop = { ...mockStore, loopEnabled: true }
    await renderPresentation({ store: storeWithLoop })

    expect(screen.getByText(/Loop ON/i)).toBeInTheDocument()
  })

  it('devrait afficher "Aucun son" quand il n\'y a pas de sons', async () => {
    const emptyStore = { ...mockStore, currentSounds: [], sounds: [] }
    await renderPresentation({ store: emptyStore })

    expect(screen.getByText(/Aucun son/i)).toBeInTheDocument()
  })

  it('devrait filtrer les sons avec la recherche', async () => {
    await renderPresentation()

    const searchInput = screen.getByTestId('presentation-search')
    await act(async () => {
      await userEvent.type(searchInput, 'Sound 1')
    })

    expect(screen.getByText('Sound 1')).toBeInTheDocument()
    expect(screen.queryByText('Sound 2')).not.toBeInTheDocument()
  })

  it('devrait permettre d\'écouter un son', async () => {
    const { playSound } = await import('@core/services/AudioService')
    await renderPresentation()

    const card = screen.getAllByTestId('presentation-card')[0]
    await act(async () => {
      await userEvent.click(card)
    })

    expect(playSound).toHaveBeenCalled()
  })
})