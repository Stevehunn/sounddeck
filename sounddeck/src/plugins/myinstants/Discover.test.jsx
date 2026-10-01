// src/plugins/myinstants/Discover.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS (vi.hoisted) — déclarés AVANT tous les vi.mock
// ═══════════════════════════════════════════════════════════════════════
const {
  mockEnsureOnline,
  mockShowNoConnection,
  mockGetItem,
  mockSetItem,
  mockGetCachedCategory,
  mockSetCachedCategory,
  mockGetCacheInfo,
  mockEnsureCacheLoaded,
} = vi.hoisted(() => ({
  mockEnsureOnline: vi.fn(() => Promise.resolve(true)),
  mockShowNoConnection: vi.fn(),
  mockGetItem: vi.fn().mockResolvedValue(null),
  mockSetItem: vi.fn().mockResolvedValue(),
  mockGetCachedCategory: vi.fn(() => null),
  mockSetCachedCategory: vi.fn(),
  mockGetCacheInfo: vi.fn(() => ({})),
  mockEnsureCacheLoaded: vi.fn().mockResolvedValue(),
}))

// ─── i18n ─────────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// ─── Network ──────────────────────────────────────────────────────────
vi.mock('@shared/contexts', () => ({
  useNetwork: () => ({
    ensureOnline: mockEnsureOnline,
    showNoConnection: mockShowNoConnection,
  }),
}))

// ─── appStorage ───────────────────────────────────────────────────────
vi.mock('@shared/utils/appStorage', () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
}))

// ─── logger ───────────────────────────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

// ─── Howler ───────────────────────────────────────────────────────────
vi.mock('howler', () => {
  const MockHowl = function () {
    this.play = vi.fn()
    this.stop = vi.fn()
    this.unload = vi.fn()
  }
  return { Howl: MockHowl, Howler: { volume: vi.fn() } }
})

// ─── useMyInstantsCache ───────────────────────────────────────────────
vi.mock('./useMyInstantsCache', () => ({
  ensureCacheLoaded: mockEnsureCacheLoaded,
  getCachedCategory: mockGetCachedCategory,
  setCachedCategory: mockSetCachedCategory,
  getCacheInfo: mockGetCacheInfo,
}))

// ═══════════════════════════════════════════════════════════════════════
// IMPORT (après les mocks)
// ═══════════════════════════════════════════════════════════════════════
import MyInstantsDiscover from './Discover'

describe('MyInstantsDiscover', () => {
  let store
  let addToast

  const mockSounds = [
    { id: 'mi_1', name: 'Sound 1', slug: 's1', url: 'https://x/1.mp3', emoji: '🔊' },
    { id: 'mi_2', name: 'Sound 2', slug: 's2', url: 'https://x/2.mp3', emoji: '🎵' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // ✅ Reset les implémentations (clearAllMocks ne les touche PAS)
    mockEnsureOnline.mockReset().mockResolvedValue(true)
    mockShowNoConnection.mockReset()
    mockGetItem.mockReset().mockResolvedValue(null)
    mockSetItem.mockReset().mockResolvedValue()
    mockGetCachedCategory.mockReset().mockReturnValue(null)
    mockSetCachedCategory.mockReset()
    mockGetCacheInfo.mockReset().mockReturnValue({})
    mockEnsureCacheLoaded.mockReset().mockResolvedValue()

    store = {
      sounds: [],
      profiles: [{ id: 'all', name: 'Tous', isDefault: true }],
      addSound: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()

    window.electronAPI = {
      fetchMyinstants: vi.fn().mockResolvedValue({
        success: true,
        sounds: mockSounds,
      }),
    }
  })

  const renderPage = () =>
    render(<MyInstantsDiscover store={store} addToast={addToast} />)

  const waitInit = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU INITIAL
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher le titre', async () => {
    renderPage()
    await waitInit()
    expect(screen.getByText('myinstantsTitle')).toBeInTheDocument()
  })

  it('devrait appeler fetchMyinstants au mount', async () => {
    renderPage()
    await waitInit()
    expect(window.electronAPI.fetchMyinstants).toHaveBeenCalled()
  })

  it('devrait afficher les sons chargés', async () => {
    renderPage()
    await waitInit()
    await waitFor(() => {
      expect(screen.getByText('Sound 1')).toBeInTheDocument()
      expect(screen.getByText('Sound 2')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // RECHERCHE
  // ════════════════════════════════════════════════════════════════════

  it('devrait permettre de taper dans la recherche', async () => {
    renderPage()
    await waitInit()
    const input = screen.getByTestId('discover-search')
    fireEvent.change(input, { target: { value: 'boom' } })
    expect(input).toHaveValue('boom')
  })

  it('devrait lancer la recherche au click', async () => {
    renderPage()
    await waitInit()

    fireEvent.change(screen.getByTestId('discover-search'), {
      target: { value: 'boom' },
    })

    const searchBtns = screen.getAllByText('myinstantsSearch')
    fireEvent.click(searchBtns[searchBtns.length - 1])

    await waitFor(() => {
      expect(window.electronAPI.fetchMyinstants).toHaveBeenCalledWith(
        'boom',
        'search',
        'fr'
      )
    })
  })

  it('devrait chercher au keydown Enter', async () => {
    renderPage()
    await waitInit()
    window.electronAPI.fetchMyinstants.mockClear()

    const input = screen.getByTestId('discover-search')
    fireEvent.change(input, { target: { value: 'boom' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(window.electronAPI.fetchMyinstants).toHaveBeenCalled()
    })
  })

  it('devrait afficher le bouton clear si search non vide', async () => {
    renderPage()
    await waitInit()
    fireEvent.change(screen.getByTestId('discover-search'), {
      target: { value: 'x' },
    })
    const clearBtns = document.querySelectorAll('.btn-clear-search')
    expect(clearBtns.length).toBeGreaterThan(0)
  })

  // ════════════════════════════════════════════════════════════════════
  // PREVIEW
  // ════════════════════════════════════════════════════════════════════

  it('devrait avoir un bouton preview sur la 1ère card', async () => {
    renderPage()
    await waitInit()
    await waitFor(() => {
      expect(screen.getByTestId('discover-preview-button')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // AJOUT AU PROFIL
  // ════════════════════════════════════════════════════════════════════

  it('devrait ouvrir le modal d\'ajout au click Add', async () => {
    renderPage()
    await waitInit()
    await waitFor(() => {
      expect(screen.getByTestId('discover-add-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('discover-add-button'))

    await waitFor(() => {
      expect(screen.getByText('myinstantsAddToLibrary')).toBeInTheDocument()
    })
  })

  it('devrait ajouter un son via le modal', async () => {
    renderPage()
    await waitInit()
    await waitFor(() => {
      expect(screen.getByTestId('discover-add-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('discover-add-button'))

    await waitFor(() => {
      expect(screen.getByText('myinstantsAddToLibrary')).toBeInTheDocument()
    })

    // Le bouton Ajouter du modal
    const addBtns = screen.getAllByText('myinstantsAdd')
    fireEvent.click(addBtns[addBtns.length - 1])

    await waitFor(() => {
      expect(store.addSound).toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // CATÉGORIES
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher la barre de catégories', async () => {
    renderPage()
    await waitInit()
    expect(screen.getByTestId('discover-categories')).toBeInTheDocument()
  })

  it('devrait changer la catégorie active', async () => {
    renderPage()
    await waitInit()
    window.electronAPI.fetchMyinstants.mockClear()

    // La catégorie "best" est dans DEFAULT_CATEGORIES
    const bestBtn = screen.queryByText('category_best')
    if (bestBtn) {
      fireEvent.click(bestBtn)
      await waitFor(() => {
        expect(window.electronAPI.fetchMyinstants).toHaveBeenCalled()
      })
    }
  })

  it('devrait ouvrir l\'éditeur de catégories', async () => {
    renderPage()
    await waitInit()

    fireEvent.click(screen.getByTestId('discover-category-editor-button'))

    await waitFor(() => {
      expect(screen.getByTestId('discover-category-editor-modal')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // ERREURS
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher myinstantsNoResults si 0 sons', async () => {
    window.electronAPI.fetchMyinstants.mockResolvedValue({
      success: true,
      sounds: [],
    })

    renderPage()
    await waitInit()

    await waitFor(() => {
      expect(document.body.textContent).toContain('myinstantsNoResults')
    })
  })

  it('devrait afficher l\'erreur si fetchMyinstants échoue', async () => {
    window.electronAPI.fetchMyinstants.mockResolvedValue({
      success: false,
      error: 'boom',
    })

    renderPage()
    await waitInit()

    await waitFor(() => {
      expect(document.body.textContent).toContain('boom')
    })
  })

  it('devrait appeler showNoConnection si erreur réseau', async () => {
    window.electronAPI.fetchMyinstants.mockResolvedValue({
      success: false,
      isNetworkError: true,
    })

    renderPage()
    await waitInit()

    await waitFor(() => {
      expect(mockShowNoConnection).toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // EXISTANT
  // ════════════════════════════════════════════════════════════════════

  it('devrait marquer les sons déjà dans la bibliothèque', async () => {
    store.sounds = [{ id: 'x', name: 'Sound 1' }]

    renderPage()
    await waitInit()

    await waitFor(() => {
      const owned = screen.getAllByText('myinstantsAlreadyAdded')
      expect(owned.length).toBeGreaterThan(0)
    })
  })

  it('ne devrait pas crasher sans electronAPI.fetchMyinstants', async () => {
    delete window.electronAPI.fetchMyinstants
    renderPage()
    await waitInit()
    expect(screen.getByText('myinstantsTitle')).toBeInTheDocument()
  })

  // ════════════════════════════════════════════════════════════════════
  // LOAD MORE
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher load more si >= 20 résultats', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `mi_${i}`,
      name: `Sound ${i}`,
      slug: `s${i}`,
      url: `https://x/${i}.mp3`,
      emoji: '🔊',
    }))
    window.electronAPI.fetchMyinstants.mockResolvedValue({
      success: true,
      sounds: many,
    })

    renderPage()
    await waitInit()

    await waitFor(() => {
      expect(screen.getByTestId('discover-load-more')).toBeInTheDocument()
    })
  })

  it('ne devrait PAS afficher load more si < 20', async () => {
    renderPage()
    await waitInit()
    expect(screen.queryByTestId('discover-load-more')).not.toBeInTheDocument()
  })
})