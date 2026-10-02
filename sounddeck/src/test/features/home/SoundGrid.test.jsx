import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// Mock SoundCard
vi.mock('@shared/components/audio/SoundCard', () => ({
  default: ({ sound, draggable }) => (
    <div data-testid={`sound-card-${sound.id}`} data-draggable={draggable}>
      {sound.name}
    </div>
  ),
}))

import SoundGrid from '@features/home/SoundGrid'

describe('SoundGrid', () => {
  const baseProps = {
    shortcuts: {},
    audioDevice: 'default',
    volume: 80,
    loopEnabled: false,
    playLocally: true,
    store: {
      cardSize: 'medium',
      currentProfileId: 'all',
      tags: {},
      keyboardLayout: 'qwerty',
      toggleFavorite: vi.fn(),
      setShortcut: vi.fn(),
      updateSoundVolume: vi.fn(),
      incrementPlayCount: vi.fn(),
      removeSoundFromProfile: vi.fn(),
      updateSound: vi.fn(),
      updateSoundImage: vi.fn(),
      updateSoundEmoji: vi.fn(),
      addTagToSound: vi.fn(),
      removeTagFromSound: vi.fn(),
    },
    addToast: vi.fn(),
    gridRef: { current: null },
    draggable: true,
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    draggedSoundId: null,
    dragOverIndex: null,
    dropTarget: 'profile',
    onDelete: vi.fn(),
  }

  const sounds = [
    { id: 's1', name: 'A' },
    { id: 's2', name: 'B' },
  ]

  const renderGrid = (overrides = {}) =>
    render(<SoundGrid {...baseProps} sounds={sounds} {...overrides} />)

  it('devrait rendre autant de cards que de sons', () => {
    renderGrid()
    expect(screen.getByTestId('sound-card-s1')).toBeInTheDocument()
    expect(screen.getByTestId('sound-card-s2')).toBeInTheDocument()
  })

  it('devrait rendre 0 card si sounds vide', () => {
    const { container } = renderGrid({ sounds: [] })
    expect(container.querySelectorAll('[data-testid^="sound-card-"]')).toHaveLength(0)
  })

  it('devrait exposer le grid avec testid par défaut', () => {
    renderGrid()
    expect(screen.getByTestId('sound-grid')).toBeInTheDocument()
  })

  it('devrait utiliser le testId personnalisé', () => {
    renderGrid({ testId: 'my-grid' })
    expect(screen.getByTestId('my-grid')).toBeInTheDocument()
  })

  it('devrait passer draggable aux wrappers', () => {
    const { container } = renderGrid()
    const wrappers = container.querySelectorAll('[draggable="true"]')
    expect(wrappers.length).toBeGreaterThanOrEqual(2)
  })

  it('devrait déclencher onDragStart', () => {
    const { container } = renderGrid()
    const wrapper = container.querySelector('[data-testid="sound-card-s1"]').parentElement
    fireEvent.dragStart(wrapper)
    expect(baseProps.onDragStart).toHaveBeenCalledWith(
      expect.anything(),
      's1',
      0,
      'profile'
    )
  })

  it('devrait appliquer opacity réduite si draggedSoundId matche', () => {
    const { container } = renderGrid({ draggedSoundId: 's1' })
    const wrapper = container.querySelector('[data-testid="sound-card-s1"]').parentElement
    expect(wrapper.style.opacity).toBe('0.3')
  })

  it('devrait afficher l\'indicateur visuel si dragOverIndex matche', () => {
    const { container } = renderGrid({ dragOverIndex: 1 })
    const wrapper = container.querySelector('[data-testid="sound-card-s2"]').parentElement
    expect(wrapper.style.transform).toContain('scale(1.03)')
  })

  it('devrait utiliser store.cardSize pour le gridTemplate', () => {
    const { container } = renderGrid({ store: { ...baseProps.store, cardSize: 'large' } })
    const grid = container.querySelector('[data-testid="sound-grid"]')
    expect(grid.style.gridTemplateColumns).toContain('140px')
  })
})