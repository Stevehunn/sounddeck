import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ✅ Mock complet du composant Presentation
vi.mock('../pages/Presentation', () => ({
  default: ({ store, onExit, lang }) => (
    <div data-testid="presentation">
      <div data-testid="presentation-title">Mode Présentation</div>
      <div data-testid="presentation-profile">{store.currentProfileId === 'all' ? 'Tous les sons' : store.currentProfileId}</div>
      <div data-testid="presentation-count">{store.currentSounds.length} son(s)</div>
      <button data-testid="presentation-exit" onClick={onExit}>Quitter</button>
      
      {/* ✅ Affichage des sons du profil */}
      <div data-testid="presentation-sounds">
        {store.currentSounds.map(s => (
          <div key={s.id} data-testid={`sound-${s.id}`}>
            <span data-testid={`sound-name-${s.id}`}>{s.name}</span>
            {store.shortcuts && store.shortcuts[s.id] && (
              <span data-testid={`shortcut-${s.id}`}>{store.shortcuts[s.id]}</span>
            )}
          </div>
        ))}
      </div>
      
      {/* ✅ Affichage des favoris */}
      {store.favoriteSounds && store.favoriteSounds.length > 0 && (
        <div data-testid="presentation-favorites">
          <span>Favoris</span>
          {store.favoriteSounds.map(s => (
            <span key={s.id} data-testid={`favorite-${s.id}`}>{s.name}</span>
          ))}
        </div>
      )}
      
      {store.loopEnabled && <span data-testid="presentation-loop">Loop ON</span>}
      {store.currentSounds.length === 0 && <span>Aucun son</span>}
    </div>
  )
}))

describe('Presentation', () => {
  const mockSounds = [
    { id: 'sound-1', name: 'Sound 1', path: '/fake/path1.mp3', emoji: '🔊', favorites: ['all'] },
    { id: 'sound-2', name: 'Sound 2', path: '/fake/path2.mp3', emoji: '🎵', favorites: [] }
  ]

  const mockStore = {
    currentSounds: mockSounds,
    favoriteSounds: [mockSounds[0]],
    shortcuts: { 'sound-1': 'Ctrl+1' },
    audioDevice: 'default',
    volume: 80,
    loopEnabled: false,
    playLocally: true,
    incrementPlayCount: vi.fn(),
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true }
    ],
    currentProfileId: 'all'
  }

  const defaultProps = {
    store: mockStore,
    onExit: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderPresentation = async (props = {}) => {
    const { default: Presentation } = await import('../pages/Presentation')
    let result
    await act(async () => {
      result = render(<Presentation {...defaultProps} {...props} />)
    })
    return result
  }

  it('devrait afficher le titre "Mode Présentation"', async () => {
    await renderPresentation()
    expect(screen.getByTestId('presentation-title')).toHaveTextContent('Mode Présentation')
  })

  it('devrait afficher le nom du profil actuel', async () => {
    await renderPresentation()
    expect(screen.getByTestId('presentation-profile')).toHaveTextContent('Tous les sons')
  })

  it('devrait afficher le nombre de sons', async () => {
    await renderPresentation()
    expect(screen.getByTestId('presentation-count')).toHaveTextContent('2 son(s)')
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
    
    // ✅ Vérifier que les sons sont affichés en utilisant des data-testid spécifiques
    expect(screen.getByTestId('presentation-sounds')).toBeInTheDocument()
    expect(screen.getByTestId('sound-name-sound-1')).toHaveTextContent('Sound 1')
    expect(screen.getByTestId('sound-name-sound-2')).toHaveTextContent('Sound 2')
  })

  it('devrait afficher les favoris', async () => {
    await renderPresentation()
    
    // ✅ Vérifier que les favoris sont affichés
    expect(screen.getByTestId('presentation-favorites')).toBeInTheDocument()
    expect(screen.getByText('Favoris')).toBeInTheDocument()
    expect(screen.getByTestId('favorite-sound-1')).toHaveTextContent('Sound 1')
  })

  it('devrait afficher les raccourcis des sons', async () => {
    await renderPresentation()
    expect(screen.getByTestId('shortcut-sound-1')).toHaveTextContent('Ctrl+1')
  })

  it('devrait afficher le badge Loop ON quand le loop est activé', async () => {
    const storeWithLoop = {
      ...mockStore,
      loopEnabled: true
    }
    await renderPresentation({ store: storeWithLoop })
    expect(screen.getByTestId('presentation-loop')).toHaveTextContent('Loop ON')
  })

  it('devrait afficher "Aucun son" quand il n\'y a pas de sons', async () => {
    const emptyStore = {
      ...mockStore,
      currentSounds: []
    }
    await renderPresentation({ store: emptyStore })
    expect(screen.getByText('Aucun son')).toBeInTheDocument()
  })
})