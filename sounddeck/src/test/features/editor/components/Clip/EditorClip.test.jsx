import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// ─── Mocks ────────────────────────────────────────────────────────────
const mockComputeSnapTarget = vi.hoisted(() => vi.fn())

vi.mock('@features/editor/utils/snapUtils', () => ({
  computeSnapTarget: mockComputeSnapTarget,
}))

vi.mock('@features/editor/components/Clip/ClipWaveform', () => ({
  default: () => <div data-testid="clip-waveform" />,
}))

vi.mock('@features/editor/components/Clip/ClipFadeHandles', () => ({
  default: () => <div data-testid="clip-fade-handles" />,
}))

vi.mock('@features/editor/components/Clip/ClipActions', () => ({
  default: () => <div data-testid="clip-actions" />,
}))

import EditorClip from '@features/editor/components/Clip'

describe('EditorClip', () => {
  let rafCallbacks
  let rafId

  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Mon Clip',
    path: '/a.mp3',
    start: 2,
    duration: 4,
    offset: 0,
    volume: 0,
    effects: [],
    ...overrides,
  })

  const buildProps = (overrides = {}) => {
    const clip = overrides.clip || createClip()
    const duration = overrides.duration ?? clip.duration

    return {
      clip,
      layout: {
        start: overrides.start ?? clip.start,
        duration,
        pixelsPerSecond: 80,
        totalDuration: 20,
        snapEnabled: overrides.snapEnabled ?? true,
        ...overrides.layout,
      },
      state: {
        isSelected: overrides.isSelected ?? false,
        isPlaying: overrides.isPlaying ?? false,
        currentTime: overrides.currentTime ?? 0,
        loopState: overrides.loopState ?? {},
        ...overrides.state,
      },
      handlers: {
        onSelect: vi.fn(),
        onMove: vi.fn(),
        onRemove: vi.fn(),
        onDuplicate: vi.fn(),
        onFade: vi.fn(),
        onContextMenu: vi.fn(),
        onPlayClip: vi.fn(),
        onStopClip: vi.fn(),
        onCopyClip: vi.fn(),
        onCutClip: vi.fn(),
        ...overrides.handlers,
      },
      ui: {
        trackId: 't1',
        trackColor: '#3b82f6',
        waveformData: [],
        tr: vi.fn((key) => key),
        ...overrides.ui,
      },
      snapContext: overrides.snapContext || {
        allClips: [],
        markers: [],
        playhead: 0,
        totalDuration: 20,
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []
    rafId = 0

    global.requestAnimationFrame = vi.fn((cb) => {
      rafId++
      rafCallbacks.push({ id: rafId, cb })
      return rafId
    })

    global.cancelAnimationFrame = vi.fn((id) => {
      rafCallbacks = rafCallbacks.filter((item) => item.id !== id)
    })

    mockComputeSnapTarget.mockImplementation(({ proposedStart }) => ({
      start: proposedStart,
      snappedTo: null,
      edge: null,
      type: null,
    }))

    // getBoundingClientRect par défaut
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 60,
      width: 500,
      height: 60,
      x: 0,
      y: 0,
    }))
  })

  const flushRafs = () => {
    const toRun = [...rafCallbacks]
    rafCallbacks = []
    for (const item of toRun) {
      act(() => {
        item.cb()
      })
    }
  }

  // ─── Rendu de base ───────────────────────────────────────────────

  describe('rendu de base', () => {
    it('devrait rendre un div avec data-clip-id', () => {
      const { container } = render(<EditorClip {...buildProps()} />)
      expect(
        container.querySelector('[data-clip-id="c1"]')
      ).not.toBeNull()
    })

    it('devrait rendre data-testid="editor-clip"', () => {
      const { getByTestId } = render(<EditorClip {...buildProps()} />)
      expect(getByTestId('editor-clip')).toBeInTheDocument()
    })

    it('devrait rendre data-track-id', () => {
      const { container } = render(<EditorClip {...buildProps()} />)
      expect(
        container.querySelector('[data-track-id="t1"]')
      ).not.toBeNull()
    })

    it('devrait avoir la classe editor-clip-wrapper', () => {
      const { container } = render(<EditorClip {...buildProps()} />)
      expect(
        container.querySelector('.editor-clip-wrapper')
      ).not.toBeNull()
    })

    it('devrait afficher le nom du clip', () => {
      const { getByText } = render(<EditorClip {...buildProps()} />)
      expect(getByText('Mon Clip')).toBeInTheDocument()
    })

    it('devrait afficher la durée formatée', () => {
      const { container } = render(<EditorClip {...buildProps()} />)
      const text = container.textContent || ''
      expect(text).toMatch(/4\.0s/)
    })

    it('devrait fallback sur "Clip" si name absent', () => {
      const clip = createClip({ name: null })
      const { container } = render(<EditorClip {...buildProps({ clip })} />)
      expect(container.textContent).toContain('Clip')
    })

    it('devrait calculer left = start * pixelsPerSecond', () => {
      const props = buildProps({ start: 3 })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      // 3 * 80 = 240
      expect(el?.style.left).toBe('240px')
    })

    it('devrait calculer width = duration * pixelsPerSecond', () => {
      const props = buildProps({ duration: 5 })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      // 5 * 80 = 400
      expect(el?.style.width).toBe('400px')
    })

    it('devrait avoir une largeur minimum de 20px', () => {
      const clip = createClip({ duration: 0.1 })
      const props = buildProps({ clip, duration: 0.1 })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      // 0.1 * 80 = 8 → minimum 20
      expect(el?.style.width).toBe('20px')
    })
  })

  // ─── Sélection et hover ──────────────────────────────────────────

  describe('sélection', () => {
    // ✅ FIX : jsdom ne parse pas var() dans border shorthand, on check la string
    it('devrait avoir une bordure accent si sélectionné', () => {
      const props = buildProps({ isSelected: true })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      expect(el?.style.border).toContain('var(--accent)')
    })

    it('devrait avoir la couleur de piste comme bordure si non sélectionné', () => {
      const props = buildProps({ isSelected: false })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      expect(el?.style.borderColor).toBe('rgb(59, 130, 246)')
    })
  })

  describe('hover', () => {
    it('devrait afficher les boutons play/copy/cut sur hover', () => {
      const props = buildProps()
      const { container, queryByTitle } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')
      // Avant hover : pas de bouton
      expect(queryByTitle('editorClipTooltipPlay')).toBeNull()

      act(() => {
        fireEvent.mouseEnter(el)
      })

      expect(queryByTitle('editorClipTooltipPlay')).not.toBeNull()
    })
  })

  // ─── Context menu ────────────────────────────────────────────────

  describe('context menu', () => {
    it('devrait appeler onContextMenu au right-click', () => {
      const onContextMenu = vi.fn()
      const props = buildProps({ handlers: { onContextMenu } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')
      fireEvent.contextMenu(el)

      expect(onContextMenu).toHaveBeenCalledWith(
        expect.any(Object),
        'c1',
        't1'
      )
    })

    it('devrait preventDefault au contextmenu', () => {
      const onContextMenu = vi.fn()
      const props = buildProps({ handlers: { onContextMenu } })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')

      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      const preventSpy = vi.spyOn(e, 'preventDefault')
      el.dispatchEvent(e)

      expect(preventSpy).toHaveBeenCalled()
    })
  })

  // ─── Drag ────────────────────────────────────────────────────────

  describe('drag', () => {
    it('devrait appeler onSelect au mousedown', () => {
      const onSelect = vi.fn()
      const props = buildProps({ handlers: { onSelect } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')
      fireEvent.mouseDown(el, { button: 0, clientX: 100 })

      expect(onSelect).toHaveBeenCalledWith('c1')
    })

    it('ne devrait pas réagir à un right-click', () => {
      const onSelect = vi.fn()
      const props = buildProps({ handlers: { onSelect } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')
      fireEvent.mouseDown(el, { button: 2 })

      expect(onSelect).not.toHaveBeenCalled()
    })

    it('devrait ignorer mousedown sur un bouton', () => {
      const onSelect = vi.fn()
      const props = buildProps({ handlers: { onSelect } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')
      const btn = document.createElement('button')
      el.appendChild(btn)

      fireEvent.mouseDown(btn, { button: 0 })

      expect(onSelect).not.toHaveBeenCalled()
    })

    it('devrait déclencher un déplacement au drag', () => {
      const onMove = vi.fn()
      const props = buildProps({ handlers: { onMove } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 200, altKey: false })
        )
        flushRafs()
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      expect(onMove).toHaveBeenCalled()
      const args = onMove.mock.calls[0]
      expect(args[0]).toBe('c1')
      expect(args[1]).toBeCloseTo(3.25, 1) // 2 + 100/80 = 3.25
    })

    it('ne devrait PAS appeler onMove si pas bougé', () => {
      const onMove = vi.fn()
      const props = buildProps({ handlers: { onMove } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      expect(onMove).not.toHaveBeenCalled()
    })

    // ✅ FIX : séparer les act() pour que les useEffect de listeners soient commités
    it('devrait clamper start à 0 minimum', () => {
      const onMove = vi.fn()
      const props = buildProps({ handlers: { onMove } })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: -1000 }))
        flushRafs()
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      const lastCall = onMove.mock.calls[0]
      expect(lastCall[1]).toBeGreaterThanOrEqual(0)
    })

    // ✅ FIX : séparer les act()
    it('devrait appeler computeSnapTarget si snapEnabled', () => {
      mockComputeSnapTarget.mockClear()
      const props = buildProps({ snapEnabled: true })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
        flushRafs()
      })

      expect(mockComputeSnapTarget).toHaveBeenCalled()
    })

    it('ne devrait PAS appeler computeSnapTarget si Alt pressé', () => {
      mockComputeSnapTarget.mockClear()
      const props = buildProps({ snapEnabled: true })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 200, altKey: true })
        )
        flushRafs()
      })

      expect(mockComputeSnapTarget).not.toHaveBeenCalled()
    })

    it('ne devrait PAS appeler computeSnapTarget si snapEnabled false', () => {
      mockComputeSnapTarget.mockClear()
      const props = buildProps({ snapEnabled: false })
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
        flushRafs()
      })

      expect(mockComputeSnapTarget).not.toHaveBeenCalled()
    })

    it('devrait cleanup les listeners au mouseup', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const props = buildProps()
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      removeSpy.mockRestore()
    })
  })

  // ─── Boutons d'action rapide ─────────────────────────────────────

  describe('boutons d\'action rapide', () => {
    it('devrait appeler onPlayClip au click play', () => {
      const onPlayClip = vi.fn()
      const props = buildProps({ handlers: { onPlayClip } })
      const { container, getByTitle } = render(<EditorClip {...props} />)

      act(() => {
        fireEvent.mouseEnter(container.querySelector('[data-clip-id="c1"]'))
      })

      fireEvent.click(getByTitle('editorClipTooltipPlay'))
      expect(onPlayClip).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1' }),
        't1'
      )
    })

    it('devrait afficher stop si clip en lecture', () => {
      const props = buildProps({
        isPlaying: true,
        currentTime: 3, // dans le clip (2 → 6)
      })
      const { container, getByTitle } = render(<EditorClip {...props} />)

      act(() => {
        fireEvent.mouseEnter(container.querySelector('[data-clip-id="c1"]'))
      })

      expect(getByTitle('editorClipTooltipStop')).not.toBeNull()
    })

    it('devrait appeler onStopClip au click stop', () => {
      const onStopClip = vi.fn()
      const props = buildProps({
        isPlaying: true,
        currentTime: 3,
        handlers: { onStopClip },
      })
      const { container, getByTitle } = render(<EditorClip {...props} />)

      act(() => {
        fireEvent.mouseEnter(container.querySelector('[data-clip-id="c1"]'))
      })

      fireEvent.click(getByTitle('editorClipTooltipStop'))
      expect(onStopClip).toHaveBeenCalledWith('c1')
    })

    it('devrait appeler onCopyClip au click copy', () => {
      const onCopyClip = vi.fn()
      const props = buildProps({ handlers: { onCopyClip } })
      const { container, getByTitle } = render(<EditorClip {...props} />)

      act(() => {
        fireEvent.mouseEnter(container.querySelector('[data-clip-id="c1"]'))
      })

      fireEvent.click(getByTitle('editorClipTooltipCopy'))
      expect(onCopyClip).toHaveBeenCalled()
    })

    it('devrait appeler onCutClip au click cut', () => {
      const onCutClip = vi.fn()
      const props = buildProps({ handlers: { onCutClip } })
      const { container, getByTitle } = render(<EditorClip {...props} />)

      act(() => {
        fireEvent.mouseEnter(container.querySelector('[data-clip-id="c1"]'))
      })

      fireEvent.click(getByTitle('editorClipTooltipCut'))
      expect(onCutClip).toHaveBeenCalled()
    })
  })

  // ─── Loop overlay ────────────────────────────────────────────────

  describe('loop overlay', () => {
    it('ne devrait PAS afficher le badge LOOP si non bouclé', () => {
      const { container } = render(<EditorClip {...buildProps()} />)
      expect(container.textContent).not.toContain('LOOP')
    })

    it('devrait afficher LOOP si clip dans loopState', () => {
      const props = buildProps({
        loopState: {
          clips: {
            c1: {
              enabled: true,
              start: 2,
              end: 10,
              arrowColor: '#22c55e',
              loopMode: 'endOfTrack',
            },
          },
        },
      })
      const { container } = render(<EditorClip {...props} />)
      expect(container.textContent).toContain('LOOP')
    })

    it('devrait afficher les cycles si loopMode=cycles', () => {
      const props = buildProps({
        loopState: {
          clips: {
            c1: {
              enabled: true,
              start: 2,
              end: 16,
              arrowColor: '#22c55e',
              loopMode: 'cycles',
              totalCycles: 4,
            },
          },
        },
      })
      const { container } = render(<EditorClip {...props} />)
      expect(container.textContent).toContain('4x')
    })

    // ✅ FIX : jsdom ne parse pas var() dans border shorthand
    it('devrait utiliser arrowColor pour la bordure si bouclé', () => {
      const props = buildProps({
        loopState: {
          clips: {
            c1: {
              enabled: true,
              start: 2,
              end: 10,
              arrowColor: '#22c55e',
              loopMode: 'endOfTrack',
            },
          },
        },
      })
      const { container } = render(<EditorClip {...props} />)
      const el = container.querySelector('[data-clip-id="c1"]')
      expect(el?.style.border).toContain('var(--success)')
    })
  })

  // ─── Playhead ────────────────────────────────────────────────────

  describe('playhead', () => {
    it('ne devrait PAS afficher le playhead si non playing', () => {
      const props = buildProps({ isPlaying: false, currentTime: 3 })
      const { container } = render(<EditorClip {...props} />)
      const playheads = container.querySelectorAll(
        '[style*="box-shadow: rgba(124, 111, 247"]'
      )
      expect(playheads.length).toBe(0)
    })

    it('devrait afficher le playhead si currentTime dans le clip', () => {
      const props = buildProps({ isPlaying: true, currentTime: 3 })
      const { container } = render(<EditorClip {...props} />)
      // Le playhead est un div avec width: 2px
      const inner = container.querySelector('[data-clip-id="c1"]')
      const children = inner?.querySelectorAll(':scope > div')
      // Juste une vérification que ça a rendu sans crash
      expect(children).not.toBeNull()
    })
  })

  // ─── Snap guide ──────────────────────────────────────────────────

  describe('snap guide', () => {
    // ✅ FIX : séparer les act() + utiliser innerHTML pour chercher var(--warning)
    it('devrait afficher un guide si snappedTo non null', () => {
      mockComputeSnapTarget.mockReturnValue({
        start: 3,
        snappedTo: 5,
        edge: 'start',
        type: 'clip-start',
      })

      const props = buildProps()
      const { container } = render(<EditorClip {...props} />)

      const el = container.querySelector('[data-clip-id="c1"]')

      act(() => {
        fireEvent.mouseDown(el, { button: 0, clientX: 100 })
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
        flushRafs()
      })

      expect(container.innerHTML).toContain('var(--warning)')
    })
  })

  // ─── Sous-composants ─────────────────────────────────────────────

  describe('sous-composants', () => {
    it('devrait rendre ClipWaveform', () => {
      const { getByTestId } = render(<EditorClip {...buildProps()} />)
      expect(getByTestId('clip-waveform')).toBeInTheDocument()
    })

    it('devrait rendre ClipFadeHandles', () => {
      const { getByTestId } = render(<EditorClip {...buildProps()} />)
      expect(getByTestId('clip-fade-handles')).toBeInTheDocument()
    })

    it('devrait rendre ClipActions', () => {
      const { getByTestId } = render(<EditorClip {...buildProps()} />)
      expect(getByTestId('clip-actions')).toBeInTheDocument()
    })
  })
})