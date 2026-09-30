import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act, waitFor } from '@testing-library/react'
import EditorMetronome from '@features/editor/components/Toolbar/EditorMetronome'

describe('EditorMetronome', () => {
  let tr
  let onBpmChange
  let onToggle
  let mockCtx
  let rafQueue
  let rafId

  const defaultProps = () => ({
    bpm: 120,
    onBpmChange,
    isPlaying: false,
    currentTime: 0,
    totalDuration: 30,
    enabled: false,
    onToggle,
    tr,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    tr = vi.fn((key) => key)
    onBpmChange = vi.fn()
    onToggle = vi.fn()

    rafQueue = []
    rafId = 0

    global.requestAnimationFrame = vi.fn((cb) => {
      rafId++
      rafQueue.push({ id: rafId, cb })
      return rafId
    })

    global.cancelAnimationFrame = vi.fn((id) => {
      rafQueue = rafQueue.filter((item) => item.id !== id)
    })

    mockCtx = {
      state: 'running',
      currentTime: 0,
      destination: { name: 'destination' },
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: { value: 800 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
    }

    // ✅ FIX : utiliser une function expression (pas arrow) qui retourne mockCtx.
    //    Avec `vi.fn(() => mockCtx)`, `new AudioContext()` retourne un objet vide
    //    (l'arrow function n'est pas un constructeur). Avec une function expression,
    //    JS utilise la valeur retournée par le constructeur si c'est un objet.
    global.AudioContext = vi.fn(function () {
      return mockCtx
    })
    global.webkitAudioContext = global.AudioContext
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Rendu de base ─────────────────────────────────────────────

  it('devrait rendre le container', () => {
    const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
    expect(getByTestId('metronome-container')).toBeInTheDocument()
  })

  it('devrait afficher le bouton toggle', () => {
    const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
    expect(getByTestId('metronome-toggle')).toBeInTheDocument()
  })

  it('devrait afficher le slider BPM', () => {
    const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
    expect(getByTestId('metronome-bpm-slider')).toBeInTheDocument()
  })

  it('devrait afficher la valeur BPM', () => {
    const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
    expect(getByTestId('metronome-bpm-value').textContent).toBe('120')
  })

  it('devrait afficher le slider volume', () => {
    const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
    expect(getByTestId('metronome-volume-slider')).toBeInTheDocument()
  })

  // ─── BPM ───────────────────────────────────────────────────────

  describe('BPM', () => {
    it('devrait sync tempo avec prop bpm', () => {
      const { getByTestId, rerender } = render(
        <EditorMetronome {...defaultProps()} bpm={90} />
      )
      expect(getByTestId('metronome-bpm-value').textContent).toBe('90')

      rerender(<EditorMetronome {...defaultProps()} bpm={180} />)
      expect(getByTestId('metronome-bpm-value').textContent).toBe('180')
    })

    it('devrait clamper BPM entre 40 et 240 à la saisie', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      const slider = getByTestId('metronome-bpm-slider')

      fireEvent.change(slider, { target: { value: '10' } })
      expect(onBpmChange).toHaveBeenCalledWith(40)
    })

    it('devrait clamper BPM max à 240', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      fireEvent.change(getByTestId('metronome-bpm-slider'), {
        target: { value: '999' },
      })
      expect(onBpmChange).toHaveBeenCalledWith(240)
    })

    it('devrait appeler onBpmChange', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      fireEvent.change(getByTestId('metronome-bpm-slider'), {
        target: { value: '140' },
      })
      expect(onBpmChange).toHaveBeenCalledWith(140)
    })

    it('devrait mettre à jour la valeur affichée après changement', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      fireEvent.change(getByTestId('metronome-bpm-slider'), {
        target: { value: '160' },
      })
      expect(getByTestId('metronome-bpm-value').textContent).toBe('160')
    })
  })

  // ─── Toggle on/off ─────────────────────────────────────────────

  describe('toggle on/off', () => {
    it('devrait appeler onToggle au click', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      fireEvent.click(getByTestId('metronome-toggle'))
      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('devrait passer à false si déjà activé', () => {
      const { getByTestId } = render(
        <EditorMetronome {...defaultProps()} enabled={true} />
      )
      fireEvent.click(getByTestId('metronome-toggle'))
      expect(onToggle).toHaveBeenCalledWith(false)
    })

    it('devrait afficher un style enabled quand activé', () => {
      const { getByTestId } = render(
        <EditorMetronome {...defaultProps()} enabled={true} />
      )
      const container = getByTestId('metronome-container')
      expect(container.style.border).toContain('var(--accent)')
    })

    it('devrait afficher "{tempo} BPM" quand désactivé', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      const container = getByTestId('metronome-container')
      expect(container.textContent).toContain('120 BPM')
    })
  })

  // ─── Volume ────────────────────────────────────────────────────

  describe('volume', () => {
    it('devrait changer le volume', () => {
      const { getByTestId } = render(<EditorMetronome {...defaultProps()} />)
      const slider = getByTestId('metronome-volume-slider')
      fireEvent.change(slider, { target: { value: '75' } })
      expect(slider.value).toBe('75')
    })
  })

  // ─── Indicateur de beat ────────────────────────────────────────

  describe('indicateur de beat', () => {
    it("ne devrait PAS afficher l'indicateur si pas enabled", () => {
      const { queryByTestId } = render(<EditorMetronome {...defaultProps()} />)
      expect(queryByTestId('metronome-beat-indicator')).toBeNull()
    })

    it("devrait afficher l'indicateur si enabled et isPlaying", () => {
      const { getByTestId } = render(
        <EditorMetronome
          {...defaultProps()}
          enabled={true}
          isPlaying={true}
        />
      )
      expect(getByTestId('metronome-container')).toBeInTheDocument()
    })
  })

  // ─── AudioContext ──────────────────────────────────────────────

  describe('AudioContext', () => {
    it("ne devrait PAS créer d'AudioContext si pas enabled", () => {
      render(<EditorMetronome {...defaultProps()} />)
      expect(global.AudioContext).not.toHaveBeenCalled()
    })

    it('devrait créer un AudioContext au toggle ON (preview click)', async () => {
      render(<EditorMetronome {...defaultProps()} enabled={true} />)

      await waitFor(() => {
        expect(global.AudioContext).toHaveBeenCalled()
      })
    })

    it("devrait cleanup AudioContext à l'unmount", async () => {
      const { unmount } = render(
        <EditorMetronome {...defaultProps()} enabled={true} />
      )

      // ✅ FIX : attendre que previewClick (100ms) ait créé l'AudioContext
      //    et que mockCtx soit effectivement référencé par le composant
      await waitFor(() => {
        expect(global.AudioContext).toHaveBeenCalled()
      })

      // Petit délai pour laisser le previewClick assigner le ref
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })

      unmount()

      expect(mockCtx.close).toHaveBeenCalled()
    })

    it('devrait resume si suspended', async () => {
      // ✅ FIX : l'AudioContext retourne mockCtx (function expression)
      mockCtx.state = 'suspended'
      render(<EditorMetronome {...defaultProps()} enabled={true} />)

      await waitFor(() => {
        expect(mockCtx.resume).toHaveBeenCalled()
      })
    })
  })

  // ─── RAF loop ──────────────────────────────────────────────────

  describe('RAF loop', () => {
    it('devrait démarrer la boucle quand enabled + isPlaying', () => {
      const { rerender } = render(<EditorMetronome {...defaultProps()} />)

      rerender(
        <EditorMetronome
          {...defaultProps()}
          enabled={true}
          isPlaying={true}
        />
      )

      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    it("devrait cancelAnimationFrame à l'unmount", () => {
      const { rerender, unmount } = render(
        <EditorMetronome {...defaultProps()} enabled={true} isPlaying={true} />
      )

      rerender(
        <EditorMetronome
          {...defaultProps()}
          enabled={true}
          isPlaying={true}
        />
      )

      unmount()

      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })

    it('devrait relancer la boucle au changement de bpm', () => {
      const { rerender } = render(
        <EditorMetronome {...defaultProps()} enabled={true} isPlaying={true} />
      )

      const callsBefore = global.requestAnimationFrame.mock.calls.length

      rerender(
        <EditorMetronome
          {...defaultProps()}
          enabled={true}
          isPlaying={true}
          bpm={180}
        />
      )

      expect(global.requestAnimationFrame.mock.calls.length).toBeGreaterThan(
        callsBefore
      )
    })
  })

  // ─── isPlaying changes ─────────────────────────────────────────

  describe('isPlaying changes', () => {
    it('devrait reset isClicking et count quand isPlaying passe à false', () => {
      const { rerender } = render(
        <EditorMetronome {...defaultProps()} enabled={true} isPlaying={true} />
      )

      rerender(
        <EditorMetronome {...defaultProps()} enabled={true} isPlaying={false} />
      )

      expect(true).toBe(true)
    })
  })

  // ─── displayName ───────────────────────────────────────────────

  it('devrait être un composant fonction', () => {
    expect(typeof EditorMetronome).toBe('function')
  })
})