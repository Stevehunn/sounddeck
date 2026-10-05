// src/test/features/sequencer/components/PlaylistEditor.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlaylistEditor from '@features/sequencer/components/PlaylistEditor'

// ─── MOCKS ─────────────────────────────────────────────────────────────
const { mockPlayer } = vi.hoisted(() => ({
  mockPlayer: {
    playing: false,
    currentIdx: -1,
    currentProgress: null,
    start: vi.fn(),
    stop: vi.fn(),
    goNext: vi.fn(),
    goPrev: vi.fn(),
  },
}))

vi.mock('@features/sequencer/hooks/useSequencePlayer', () => ({
  useSequencePlayer: () => mockPlayer,
}))

const { mockUuid } = vi.hoisted(() => ({
  mockUuid: vi.fn(),
}))

vi.mock('@shared/utils/uuid', () => ({
  uuid: () => mockUuid(),
}))

// Mock des sous-composants pour isoler
vi.mock('@features/sequencer/components/PlaylistHeader', () => ({
  default: ({ playlist, itemsCount, onStart, onStop, onToggleLoop, onAddSounds, playing, loopPlaylist }) => (
    <div data-testid="playlist-header">
      <span data-testid="header-name">{playlist.name}</span>
      <span data-testid="header-count">{itemsCount}</span>
      <span data-testid="header-playing">{playing ? 'playing' : 'stopped'}</span>
      <span data-testid="header-loop">{loopPlaylist ? 'loop-on' : 'loop-off'}</span>
      <button data-testid="btn-start" onClick={onStart}>Start</button>
      <button data-testid="btn-stop" onClick={onStop}>Stop</button>
      <button data-testid="btn-loop" onClick={onToggleLoop}>Loop</button>
      <button data-testid="btn-add-sounds" onClick={onAddSounds}>Add</button>
    </div>
  ),
}))

vi.mock('@features/sequencer/components/PlaylistProgressBar', () => ({
  default: ({ playing, currentProgress }) =>
    playing && currentProgress ? <div data-testid="progress-bar">Progress</div> : null,
}))

vi.mock('@features/sequencer/components/PlaylistItemsList', () => ({
  default: ({ items, onUpdateItem, onRemove, onAddSounds, onSaveItemsOnly }) => (
    <div data-testid="items-list">
      {items.map((it, i) => (
        <div key={it.id} data-testid={`item-${i}`}>
          <span>{it.soundId}</span>
          <button
            data-testid={`btn-update-${i}`}
            onClick={() => onUpdateItem(i, { delay: 1.5 })}
          >
            update
          </button>
          <button data-testid={`btn-remove-${i}`} onClick={() => onRemove(i)}>
            remove
          </button>
          <button
            data-testid={`btn-save-${i}`}
            onClick={() => onSaveItemsOnly([])}
          >
            save
          </button>
        </div>
      ))}
      <button data-testid="items-add" onClick={onAddSounds}>+</button>
    </div>
  ),
}))

vi.mock('@features/sequencer/components/AddSoundModal', () => ({
  default: ({ sounds, existingIds, onAdd, onClose }) => (
    <div data-testid="add-sound-modal">
      <span data-testid="modal-existing">{existingIds.join(',')}</span>
      <button
        data-testid="modal-add"
        onClick={() => onAdd(['s1', 's2'])}
      >
        Add 2
      </button>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultPlaylist = (overrides = {}) => ({
  id: 'p1',
  name: 'Ma Playlist',
  items: [],
  loop: false,
  ...overrides,
})

const defaultSounds = [
  { id: 's1', name: 'A' },
  { id: 's2', name: 'B' },
]

beforeEach(() => {
  mockPlayer.playing = false
  mockPlayer.currentIdx = -1
  mockPlayer.currentProgress = null
  mockPlayer.start.mockReset()
  mockPlayer.stop.mockReset()
  mockPlayer.goNext.mockReset()
  mockPlayer.goPrev.mockReset()

  let counter = 0
  mockUuid.mockReset().mockImplementation(() => `uuid-${++counter}`)
})

const renderEditor = (props = {}) => {
  const onSaveItems = vi.fn().mockResolvedValue(undefined)
  const addToast = vi.fn()
  const result = render(
    <PlaylistEditor
      playlist={defaultPlaylist()}
      sounds={defaultSounds}
      audioDevice="default"
      volume={80}
      onSaveItems={onSaveItems}
      addToast={addToast}
      {...props}
    />
  )
  return { ...result, onSaveItems, addToast }
}

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Rendu', () => {
  it('affiche le header avec le nom de la playlist', () => {
    renderEditor()
    expect(screen.getByTestId('header-name')).toHaveTextContent('Ma Playlist')
  })

  it('affiche le nombre d\'items', () => {
    const playlist = defaultPlaylist({
      items: [
        { id: 'i1', soundId: 's1', delay: 0 },
        { id: 'i2', soundId: 's2', delay: 0 },
      ],
    })
    renderEditor({ playlist })
    expect(screen.getByTestId('header-count')).toHaveTextContent('2')
  })

  it('passe playing=false au header si non playing', () => {
    renderEditor()
    expect(screen.getByTestId('header-playing')).toHaveTextContent('stopped')
  })

  it('n\'affiche pas la progress bar si non playing', () => {
    renderEditor()
    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
  })

  it('affiche la liste des items', () => {
    const playlist = defaultPlaylist({
      items: [{ id: 'i1', soundId: 's1', delay: 0 }],
    })
    renderEditor({ playlist })
    expect(screen.getByTestId('items-list')).toBeInTheDocument()
    expect(screen.getByTestId('item-0')).toHaveTextContent('s1')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Start', () => {
  it('appelle player.start si items > 0', () => {
    const playlist = defaultPlaylist({
      items: [{ id: 'i1', soundId: 's1', delay: 0 }],
    })
    renderEditor({ playlist })

    fireEvent.click(screen.getByTestId('btn-start'))
    expect(mockPlayer.start).toHaveBeenCalled()
  })

  it('affiche un toast error si items vide', () => {
    const { addToast } = renderEditor()
    fireEvent.click(screen.getByTestId('btn-start'))
    expect(addToast).toHaveBeenCalledWith(
      expect.stringMatching(/playlist/i),
      'error'
    )
    expect(mockPlayer.start).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Loop', () => {
  it('toggle le loop et persiste', async () => {
    const { onSaveItems } = renderEditor()

    fireEvent.click(screen.getByTestId('btn-loop'))

    expect(screen.getByTestId('header-loop')).toHaveTextContent('loop-on')
    await waitFor(() => {
      expect(onSaveItems).toHaveBeenCalledWith('p1', [], true)
    })
  })

  it('toggle dans l\'autre sens', async () => {
    const playlist = defaultPlaylist({ loop: true })
    const { onSaveItems } = renderEditor({ playlist })

    expect(screen.getByTestId('header-loop')).toHaveTextContent('loop-on')

    fireEvent.click(screen.getByTestId('btn-loop'))

    expect(screen.getByTestId('header-loop')).toHaveTextContent('loop-off')
    await waitFor(() => {
      expect(onSaveItems).toHaveBeenCalledWith('p1', [], false)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ADD SOUNDS
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Add sounds', () => {
  it('ouvre le modal au clic', () => {
    renderEditor()
    expect(screen.queryByTestId('add-sound-modal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('btn-add-sounds'))
    expect(screen.getByTestId('add-sound-modal')).toBeInTheDocument()
  })

  it('passe existingIds au modal', () => {
    const playlist = defaultPlaylist({
      items: [
        { id: 'i1', soundId: 's1', delay: 0 },
        { id: 'i2', soundId: 's2', delay: 0 },
      ],
    })
    renderEditor({ playlist })
    fireEvent.click(screen.getByTestId('btn-add-sounds'))

    expect(screen.getByTestId('modal-existing')).toHaveTextContent('s1,s2')
  })

  it('addSounds crée les items et persiste', async () => {
    const { onSaveItems } = renderEditor()
    fireEvent.click(screen.getByTestId('btn-add-sounds'))
    fireEvent.click(screen.getByTestId('modal-add'))

    await waitFor(() => {
      expect(onSaveItems).toHaveBeenCalled()
    })
    const [, items] = onSaveItems.mock.calls[0]
    expect(items).toHaveLength(2)
    expect(items[0].soundId).toBe('s1')
    expect(items[1].soundId).toBe('s2')
    expect(items[0].id).toBeTruthy()
  })

  it('ferme le modal après ajout', async () => {
    renderEditor()
    fireEvent.click(screen.getByTestId('btn-add-sounds'))
    fireEvent.click(screen.getByTestId('modal-add'))

    await waitFor(() => {
      expect(screen.queryByTestId('add-sound-modal')).not.toBeInTheDocument()
    })
  })

  it('bouton close ferme le modal', () => {
    renderEditor()
    fireEvent.click(screen.getByTestId('btn-add-sounds'))
    fireEvent.click(screen.getByTestId('modal-close'))

    expect(screen.queryByTestId('add-sound-modal')).not.toBeInTheDocument()
  })

  it('bouton + dans la liste ouvre aussi le modal', () => {
    renderEditor()
    fireEvent.click(screen.getByTestId('items-add'))
    expect(screen.getByTestId('add-sound-modal')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// UPDATE / REMOVE ITEM
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Update/Remove', () => {
  it('updateItem modifie le delay et persiste via saveItemsOnly', async () => {
    const playlist = defaultPlaylist({
      items: [{ id: 'i1', soundId: 's1', delay: 0 }],
    })
    const { onSaveItems } = renderEditor({ playlist })

    fireEvent.click(screen.getByTestId('btn-update-0'))

    await waitFor(() => {
      expect(onSaveItems).toHaveBeenCalled()
    })
    const [, items] = onSaveItems.mock.calls[0]
    expect(items[0].delay).toBe(1.5)
  })

  it('removeItem retire l\'item', async () => {
    const playlist = defaultPlaylist({
      items: [
        { id: 'i1', soundId: 's1', delay: 0 },
        { id: 'i2', soundId: 's2', delay: 0 },
      ],
    })
    const { onSaveItems } = renderEditor({ playlist })

    fireEvent.click(screen.getByTestId('btn-remove-0'))

    await waitFor(() => {
      expect(onSaveItems).toHaveBeenCalled()
    })
    const [, items] = onSaveItems.mock.calls[0]
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('i2')
  })

  it('saveItemsOnly ne passe pas le loop', async () => {
    const playlist = defaultPlaylist({
      items: [{ id: 'i1', soundId: 's1', delay: 0 }],
    })
    const { onSaveItems } = renderEditor({ playlist })

    // Le mock items-list appelle onSaveItemsOnly([]) via btn-save
    fireEvent.click(screen.getByTestId('btn-save-0'))

    await waitFor(() => expect(onSaveItems).toHaveBeenCalled())
    // saveItemsOnly appelle onSaveItems(id, items) sans 3e arg
    const call = onSaveItems.mock.calls[0]
    expect(call).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════
describe('PlaylistEditor > Progress bar', () => {
  it('affiche la progress bar si playing + currentProgress', () => {
    mockPlayer.playing = true
    mockPlayer.currentProgress = { current: 2, duration: 10, ratio: 0.2 }
    mockPlayer.currentIdx = 0

    const playlist = defaultPlaylist({
      items: [{ id: 'i1', soundId: 's1', delay: 0 }],
    })
    renderEditor({ playlist })

    expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
  })

  it('affiche les raccourcis clavier si playing', () => {
    mockPlayer.playing = true
    const { container } = renderEditor()

    expect(container.querySelector('.sequencer-shortcuts')).toBeInTheDocument()
  })

  it('n\'affiche pas les raccourcis si non playing', () => {
    const { container } = renderEditor()
    expect(container.querySelector('.sequencer-shortcuts')).not.toBeInTheDocument()
  })
})