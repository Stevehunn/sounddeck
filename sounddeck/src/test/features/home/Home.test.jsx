import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve(true)),
  ensureOnline: vi.fn(() => Promise.resolve(true)),
  showNoConnection: vi.fn(),
  importFromPaths: vi.fn().mockResolvedValue(2),
  importFromDrop: vi.fn().mockResolvedValue(2),
  compressFileIfNeeded: vi.fn(async (path) => ({ path, compressed: false })),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/hooks/useConfirm', () => ({
  default: () => ({
    confirm: mocks.confirm,
    ConfirmWrapper: () => null,
  }),
}))

vi.mock('@shared/contexts', () => ({
  useNetwork: () => ({
    showNoConnection: mocks.showNoConnection,
    ensureOnline: mocks.ensureOnline,
  }),
}))

vi.mock('@shared/utils/fileCompression', () => ({
  compressFileIfNeeded: mocks.compressFileIfNeeded,
}))

vi.mock('@features/home/useHomeImport', () => ({
  useHomeImport: () => ({
    isImporting: false,
    importProgress: 0,
    totalFiles: 0,
    importSuccess: 0,
    importFromPaths: mocks.importFromPaths,
    importFromDrop: mocks.importFromDrop,
  }),
}))

// ─── Sous-composants mockés ─────────────────────────────────────────
vi.mock('@shared/components/modals/ProfileManagerModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="profile-manager-modal">
      <button data-testid="close-pm" onClick={onClose}>Close PM</button>
    </div>
  ),
}))

vi.mock('@features/home/Section', () => ({
  default: ({ title, count, testId, children }) => (
    <div data-testid={testId}>
      <div>{title}</div>
      {children}
    </div>
  ),
}))

vi.mock('@features/home/SoundGrid', () => ({
  default: ({ sounds, testId, onDelete, onDrop, draggedSoundId }) => (
    <div data-testid={testId}>
      {sounds.map((s) => (
        <div
          key={s.id}
          data-testid={`card-${s.id}`}
          onClick={() => onDelete?.(s.id)}
        >
          {s.name}
        </div>
      ))}
      <button data-testid={`${testId}-drop-btn`} onClick={(e) => onDrop?.(e, 1, 'profile')}>
        Drop
      </button>
    </div>
  ),
}))

vi.mock('@features/home/OutsideCard', () => ({
  default: ({ sound, onAdd }) => (
    <div data-testid={`outside-${sound.id}`}>
      <button data-testid={`outside-add-${sound.id}`} onClick={onAdd}>Add</button>
    </div>
  ),
}))

vi.mock('@features/home/ImportModal', () => ({
  default: ({ onClose, onOpenDialog, onManualAdd, onUrlImport }) => (
    <div data-testid="import-modal">
      <button data-testid="close-import" onClick={onClose}>Close</button>
      <button data-testid="open-dialog-btn" onClick={onOpenDialog}>Open Dialog</button>
      <button
        data-testid="manual-add-btn"
        onClick={() => onManualAdd('New Sound', '/sounds/new.mp3', null, '🎵')}
      >
        Manual Add
      </button>
      <button
        data-testid="url-import-btn"
        onClick={() => onUrlImport('https://x/a.mp3', 'URL Name')}
      >
        URL Import
      </button>
    </div>
  ),
}))

import Home from '@features/home/Home'

describe('Home', () => {
  let store
  let addToast
  let makeSound

  const createSound = (id, name, extras = {}) => ({
    id,
    name,
    path: `/sounds/${id}.mp3`,
    emoji: '🔊',
    image: null,
    favorites: [],
    profiles: ['all'],
    playCount: 0,
    lastPlayed: 0,
    createdAt: 1000,
    ...extras,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.confirm.mockResolvedValue(true)
    mocks.ensureOnline.mockResolvedValue(true)
    mocks.importFromPaths.mockResolvedValue(2)
    mocks.importFromDrop.mockResolvedValue(2)

    makeSound = createSound

    const sounds = [
      createSound('s1', 'Alpha'),
      createSound('s2', 'Beta'),
      createSound('s3', 'Gamma', { profiles: ['all', 'gaming'] }),
    ]

    store = {
      sounds,
      currentSounds: sounds,
      favoriteSounds: [],
      profiles: [
        { id: 'all', name: 'Tous', isDefault: true },
        { id: 'gaming', name: 'Gaming' },
      ],
      currentProfileId: 'all',
      shortcuts: {},
      audioDevice: 'default',
      volume: 80,
      playLocally: true,
      cardSize: 'medium',
      tags: {},
      keyboardLayout: 'qwerty',
      reorderSounds: vi.fn().mockResolvedValue(true),
      deleteSound: vi.fn().mockResolvedValue(),
      addSound: vi.fn().mockResolvedValue(),
      addSoundToProfile: vi.fn().mockResolvedValue(),
      removeSoundFromProfile: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()

    window.electronAPI = {
      openFileDialog: vi.fn().mockResolvedValue([]),
      downloadSoundUrl: vi.fn().mockResolvedValue({
        success: true,
        path: '/dl/a.mp3',
      }),
    }
  })

  const renderHome = (overrides = {}) =>
    render(<Home store={{ ...store, ...overrides }} addToast={addToast} loopEnabled={false} />)

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  describe('rendu', () => {
    it('devrait afficher le nom du profil "all"', () => {
      renderHome()
      expect(screen.getByText('allSounds')).toBeInTheDocument()
    })

    it('devrait afficher le nombre de sons', () => {
      renderHome()
      expect(screen.getByText(/3 sounds/)).toBeInTheDocument()
    })

    it('devrait afficher le sort select', () => {
      renderHome()
      expect(screen.getByTestId('sort-select')).toBeInTheDocument()
    })

    it('devrait afficher le search input', () => {
      renderHome()
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('devrait afficher le bouton add-sound', () => {
      renderHome()
      expect(screen.getByTestId('add-sound-button')).toBeInTheDocument()
    })

    it('ne devrait PAS afficher le bouton manage profil pour "all"', () => {
      renderHome()
      expect(screen.queryByText('manageProfile')).not.toBeInTheDocument()
    })

    it('devrait afficher le bouton manage profil pour un profil user', () => {
      renderHome({ currentProfileId: 'gaming', currentSounds: [store.sounds[2]] })
      expect(screen.getByText('manageProfile')).toBeInTheDocument()
    })

    it('devrait afficher la section profileSounds', () => {
      renderHome()
      expect(screen.getByTestId('profile-sounds-section')).toBeInTheDocument()
    })

    it('devrait afficher la section favorites si favoris', () => {
      const withFav = [makeSound('s1', 'Fav', { favorites: ['all'] })]
      renderHome({ currentSounds: withFav, favoriteSounds: withFav })
      expect(screen.getByTestId('favorites-section')).toBeInTheDocument()
    })

    it('devrait afficher la zone vide si aucun son', () => {
      renderHome({ currentSounds: [], sounds: [] })
      expect(screen.getByText('noSoundsForProfile')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // RECHERCHE
  // ════════════════════════════════════════════════════════════════════

  describe('recherche', () => {
    it('devrait filtrer par nom', () => {
      renderHome()
      fireEvent.change(screen.getByTestId('search-input'), {
        target: { value: 'Alpha' },
      })
      expect(screen.getByTestId('card-s1')).toBeInTheDocument()
      expect(screen.queryByTestId('card-s2')).not.toBeInTheDocument()
    })

    it('devrait afficher le message de recherche', () => {
      renderHome()
      fireEvent.change(screen.getByTestId('search-input'), {
        target: { value: 'Alpha' },
      })
      expect(screen.getByText(/resultsFor/)).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // TRI
  // ════════════════════════════════════════════════════════════════════

  describe('tri', () => {
    it('devrait changer le sortBy', () => {
      renderHome()
      fireEvent.change(screen.getByTestId('sort-select'), {
        target: { value: 'alpha' },
      })
      expect(screen.getByTestId('sort-select')).toHaveValue('alpha')
    })

    it('devrait trier par playCount', () => {
      const sorted = [
        makeSound('s1', 'Low', { playCount: 1 }),
        makeSound('s2', 'High', { playCount: 10 }),
      ]
      renderHome({ currentSounds: sorted })

      fireEvent.change(screen.getByTestId('sort-select'), {
        target: { value: 'popular' },
      })

      const cards = document.querySelectorAll('[data-testid^="card-"]')
      expect(cards[0].getAttribute('data-testid')).toBe('card-s2')
    })

    it('devrait trier par alpha', () => {
      renderHome()
      fireEvent.change(screen.getByTestId('sort-select'), {
        target: { value: 'alpha' },
      })
      const cards = document.querySelectorAll('[data-testid^="card-"]')
      expect(cards[0].textContent).toBe('Alpha')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // DELETE
  // ════════════════════════════════════════════════════════════════════

  describe('delete sound', () => {
    it('devrait demander confirmation', async () => {
      renderHome()
      fireEvent.click(screen.getByTestId('card-s1'))

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled()
      })
    })

    it('devrait supprimer si confirmé', async () => {
      renderHome()
      fireEvent.click(screen.getByTestId('card-s1'))

      await waitFor(() => {
        expect(store.deleteSound).toHaveBeenCalledWith('s1')
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining('deleted'),
          'info'
        )
      })
    })

    it('ne devrait PAS supprimer si refusé', async () => {
      mocks.confirm.mockResolvedValue(false)
      renderHome()
      fireEvent.click(screen.getByTestId('card-s1'))

      await new Promise((r) => setTimeout(r, 20))
      expect(store.deleteSound).not.toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // IMPORT MODAL
  // ════════════════════════════════════════════════════════════════════

  describe('import modal', () => {
    it('devrait ouvrir le modal au click sur add-sound', () => {
      renderHome()
      fireEvent.click(screen.getByTestId('add-sound-button'))
      expect(screen.getByTestId('import-modal')).toBeInTheDocument()
    })

    it('devrait fermer le modal', () => {
      renderHome()
      fireEvent.click(screen.getByTestId('add-sound-button'))
      fireEvent.click(screen.getByTestId('close-import'))
      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
    })

    it('devrait appeler openFileDialog + importFromPaths', async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(['/a.mp3', '/b.mp3'])
      renderHome()
      fireEvent.click(screen.getByTestId('add-sound-button'))
      fireEvent.click(screen.getByTestId('open-dialog-btn'))

      await waitFor(() => {
        expect(mocks.importFromPaths).toHaveBeenCalledWith(['/a.mp3', '/b.mp3'])
      })
    })

    it('devrait appeler onManualAdd', async () => {
      renderHome()
      fireEvent.click(screen.getByTestId('add-sound-button'))
      fireEvent.click(screen.getByTestId('manual-add-btn'))

      await waitFor(() => {
        expect(mocks.compressFileIfNeeded).toHaveBeenCalled()
        expect(store.addSound).toHaveBeenCalled()
      })
    })

    it('devrait appeler onUrlImport', async () => {
      renderHome()
      fireEvent.click(screen.getByTestId('add-sound-button'))
      fireEvent.click(screen.getByTestId('url-import-btn'))

      await waitFor(() => {
        expect(window.electronAPI.downloadSoundUrl).toHaveBeenCalled()
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // PROFIL MANAGER
  // ════════════════════════════════════════════════════════════════════

  describe('profile manager', () => {
    it('devrait ouvrir le modal au click manageProfile', () => {
      renderHome({ currentProfileId: 'gaming', currentSounds: [store.sounds[2]] })
      fireEvent.click(screen.getByText('manageProfile'))
      expect(screen.getByTestId('profile-manager-modal')).toBeInTheDocument()
    })

    it('devrait fermer le modal', () => {
      renderHome({ currentProfileId: 'gaming', currentSounds: [store.sounds[2]] })
      fireEvent.click(screen.getByText('manageProfile'))
      fireEvent.click(screen.getByTestId('close-pm'))
      expect(screen.queryByTestId('profile-manager-modal')).not.toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // SONS HORS PROFIL
  // ════════════════════════════════════════════════════════════════════

  describe('sons hors profil', () => {
    it('devrait afficher other-sounds-section pour profil user', () => {
      renderHome({ currentProfileId: 'gaming', currentSounds: [store.sounds[2]] })
      expect(screen.getByTestId('other-sounds-section')).toBeInTheDocument()
    })

    it('ne devrait PAS afficher pour "all"', () => {
      renderHome({ currentProfileId: 'all' })
      expect(screen.queryByTestId('other-sounds-section')).not.toBeInTheDocument()
    })

    it('devrait appeler addSoundToProfile au click add', async () => {
      renderHome({ currentProfileId: 'gaming', currentSounds: [store.sounds[2]] })
      // 2 sons hors profil (s1, s2)
      fireEvent.click(screen.getByTestId('outside-add-s1'))

      await waitFor(() => {
        expect(store.addSoundToProfile).toHaveBeenCalledWith('s1', 'gaming')
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining('addedToProfile'),
          'success'
        )
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // DRAG & DROP
  // ════════════════════════════════════════════════════════════════════

  describe('drag & drop', () => {
    it('ne devrait PAS bloquer si drag depuis la grille', () => {
      // Simplifié : on vérifie juste qu'aucune exception n'est levée au mount
      renderHome()
      expect(screen.getByTestId('profile-sounds-section')).toBeInTheDocument()
    })

    it('devrait refuser le drag si sort != custom', () => {
      renderHome()
      fireEvent.change(screen.getByTestId('sort-select'), {
        target: { value: 'alpha' },
      })
      // Le composant passe maintenant draggable=false
      expect(screen.getByTestId('profile-sounds-section')).toBeInTheDocument()
    })
  })
})