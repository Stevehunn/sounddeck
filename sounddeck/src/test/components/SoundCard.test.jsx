import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SoundCard from '@shared/components/audio/SoundCard'

// ✅ Mock AudioService (nouveau chemin)
vi.mock('@core/services/AudioService', () => ({
  playSound: vi.fn(),
  stopSound: vi.fn(),
  isPlaying: vi.fn(() => false),
  getSoundProgress: vi.fn(() => null),
}))

// ✅ Mock i18n
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key, params) => {
      const translations = {
        menuFavoriteAdd: 'Ajouter aux favoris',
        menuFavoriteRemove: 'Retirer des favoris',
        menuRename: 'Renommer',
        menuVolume: 'Régler le volume',
        menuChangeImage: "Changer l'image",
        menuChangeEmoji: "Changer l'emoji",
        menuRemoveFromProfile: 'Retirer du profil',
        menuDelete: 'Supprimer définitivement',
        menuRemoveFromProfileConfirm: 'Retirer "{name}" du profil ?',
        loopActive: 'Boucle active',
        playCount: 'fois',
        confirmAction: 'Confirmer cette action ?',
        remove: 'Retirer',
        cancel: 'Annuler',
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

// ✅ Mock useConfirm
vi.mock('@shared/hooks/useConfirm', () => ({
  default: vi.fn(() => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmWrapper: () => null,
  })),
}))

// ✅ Mock EmojiPicker
vi.mock('@shared/components/ui/EmojiPicker', () => ({
  default: () => null,
}))

// ✅ Mock ShortcutRecorder
vi.mock('@shared/components/settings/ShortcutRecorder', () => ({
  default: ({ value }) => <div data-testid="shortcut-recorder">{value || 'no-shortcut'}</div>,
}))

// ✅ Mock VolumePanel & ContextMenuPortal
vi.mock('@shared/components/audio/SoundCard/VolumePanel', () => ({
  default: () => <div data-testid="volume-panel" />,
}))
vi.mock('@shared/components/audio/SoundCard/ContextMenuPortal', () => ({
  default: ({ onClose }) => (
    <div data-testid="context-menu">
      <button onClick={() => {}}>Renommer</button>
      <button onClick={() => {}}>Régler le volume</button>
      <button onClick={() => {}}>Supprimer définitivement</button>
    </div>
  ),
}))

describe('SoundCard', () => {
  const mockSound = {
    id: 'test-1',
    name: 'Test Sound',
    path: '/fake/path/sound.mp3',
    emoji: '🔊',
    favorites: [],
    volume: 0,
    playCount: 0,
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
    draggable: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.fileExists = vi.fn().mockResolvedValue(true)
  })

  it('devrait afficher le nom du son', () => {
    render(<SoundCard {...defaultProps} />)
    expect(screen.getByText('Test Sound')).toBeInTheDocument()
  })

  it("devrait afficher l'emoji du son", () => {
    render(<SoundCard {...defaultProps} />)
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  it('devrait afficher le raccourci si présent', () => {
    render(<SoundCard {...defaultProps} shortcut="Ctrl+Shift+1" />)
    expect(screen.getByTestId('shortcut-recorder')).toHaveTextContent('Ctrl+Shift+1')
  })

  it("devrait appeler onToggleFavorite quand on clique sur l'étoile", async () => {
    const onToggleFavorite = vi.fn()
    render(<SoundCard {...defaultProps} onToggleFavorite={onToggleFavorite} />)

    const starButton = screen.getByTestId('favorite-button')
    await userEvent.click(starButton)

    expect(onToggleFavorite).toHaveBeenCalledWith('test-1')
  })

  it('devrait ouvrir le menu contextuel sur le bouton dots', async () => {
    render(<SoundCard {...defaultProps} />)

    const dotsButton = screen.getByTestId('dots-button')
    await userEvent.click(dotsButton)

    await vi.waitFor(() => {
      expect(screen.getByTestId('context-menu')).toBeInTheDocument()
    })
    expect(screen.getByText(/Renommer/i)).toBeInTheDocument()
    expect(screen.getByText(/Régler le volume/i)).toBeInTheDocument()
    expect(screen.getByText(/Supprimer définitivement/i)).toBeInTheDocument()
  })

  it('devrait afficher le compteur de lecture', () => {
    const soundWithCount = { ...mockSound, playCount: 5 }
    render(<SoundCard {...defaultProps} sound={soundWithCount} />)
    expect(screen.getByText(/5.*fois/i)).toBeInTheDocument()
  })
})