import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import EditorMasterVolume from '@features/editor/components/MasterVolume'

describe('EditorMasterVolume', () => {
  let tr
  let onVolumeChange
  let onMuteToggle
  let onReset

  const defaultProps = () => ({
    volume: 100,
    onVolumeChange,
    isMuted: false,
    onMuteToggle,
    onReset,
    peakMeter: 0,
    tr,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    tr = vi.fn((key) => key)
    onVolumeChange = vi.fn()
    onMuteToggle = vi.fn()
    onReset = vi.fn()
  })

  // ─── Rendu de base ─────────────────────────────────────────────

  it('devrait rendre data-testid="editor-master-volume"', () => {
    const { getByTestId } = render(<EditorMasterVolume {...defaultProps()} />)
    expect(getByTestId('editor-master-volume')).toBeInTheDocument()
  })

  it('devrait afficher le pourcentage de volume', () => {
    const { container } = render(
      <EditorMasterVolume {...defaultProps()} volume={75} />
    )
    expect(container.textContent).toContain('75%')
  })

  it('devrait afficher 100% par défaut', () => {
    const { container } = render(<EditorMasterVolume {...defaultProps()} />)
    expect(container.textContent).toContain('100%')
  })

  it('devrait afficher "OFF" si muted', () => {
    const { container } = render(
      <EditorMasterVolume {...defaultProps()} isMuted={true} />
    )
    expect(container.textContent).toContain('OFF')
  })

  // ─── Slider ────────────────────────────────────────────────────

  describe('slider volume', () => {
    it('devrait avoir un range 0-200', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const slider = container.querySelector('input[type="range"]')
      expect(slider?.min).toBe('0')
      expect(slider?.max).toBe('200')
    })

    it('devrait appeler onVolumeChange au change', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const slider = container.querySelector('input[type="range"]')
      fireEvent.change(slider, { target: { value: '80' } })
      expect(onVolumeChange).toHaveBeenCalledWith(80)
    })

    it('devrait afficher 0 si muted (même si volume=100)', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} volume={100} isMuted={true} />
      )
      const slider = container.querySelector('input[type="range"]')
      expect(slider?.value).toBe('0')
    })
  })

  // ─── Mute ──────────────────────────────────────────────────────

  describe('mute', () => {
    it('devrait afficher l\'icône volume si non muted', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      expect(container.querySelector('.ti-volume')).not.toBeNull()
    })

    it('devrait afficher l\'icône volume-off si muted', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} isMuted={true} />
      )
      expect(container.querySelector('.ti-volume-off')).not.toBeNull()
    })

    it('devrait appeler onMuteToggle au click', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const muteBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-volume') || b.querySelector('.ti-volume-off')
      )
      if (muteBtn) {
        fireEvent.click(muteBtn)
        expect(onMuteToggle).toHaveBeenCalled()
      }
    })

    it('devrait avoir un title "editorMute" si non muted', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const muteBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.title === 'editorMute'
      )
      expect(muteBtn).not.toBeUndefined()
    })

    it('devrait avoir un title "editorUnmute" si muted', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} isMuted={true} />
      )
      const muteBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.title === 'editorUnmute'
      )
      expect(muteBtn).not.toBeUndefined()
    })
  })

  // ─── Reset ─────────────────────────────────────────────────────

  describe('reset', () => {
    it('devrait avoir un bouton reset', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const resetBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-refresh')
      )
      expect(resetBtn).not.toBeUndefined()
    })

    it('devrait appeler onReset au click', () => {
      const { container } = render(<EditorMasterVolume {...defaultProps()} />)
      const resetBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-refresh')
      )
      fireEvent.click(resetBtn)
      expect(onReset).toHaveBeenCalled()
    })
  })

  // ─── Couleur selon peakMeter ───────────────────────────────────

  describe('couleur selon peakMeter', () => {
    it('devrait être success si peak < 0.7', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} peakMeter={0.5} />
      )
      const slider = container.querySelector('input[type="range"]')
      // jsdom convertit var() en chaîne vide, on vérifie le style
      expect(slider?.style.accentColor).toBe('var(--success)')
    })

    it('devrait être warning si peak > 0.7', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} peakMeter={0.8} />
      )
      const slider = container.querySelector('input[type="range"]')
      expect(slider?.style.accentColor).toBe('var(--warning)')
    })

    it('devrait être danger si peak > 0.9', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} peakMeter={0.95} />
      )
      const slider = container.querySelector('input[type="range"]')
      expect(slider?.style.accentColor).toBe('var(--danger)')
    })
  })

  // ─── Peak meter visuel ─────────────────────────────────────────

  describe('peak meter visuel', () => {
    it('ne devrait PAS afficher la barre si peakMeter=0', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} peakMeter={0} />
      )
      // La barre a une background linear-gradient
      const peakBar = container.querySelector(
        'div[style*="linear-gradient"]'
      )
      expect(peakBar).toBeNull()
    })

    it('devrait afficher la barre si peakMeter > 0', () => {
      const { container } = render(
        <EditorMasterVolume {...defaultProps()} peakMeter={0.5} />
      )
      const peakBar = container.querySelector('div[style*="linear-gradient"]')
      expect(peakBar).not.toBeNull()
    })

    it('ne devrait PAS afficher la barre si muted', () => {
      const { container } = render(
        <EditorMasterVolume
          {...defaultProps()}
          peakMeter={0.5}
          isMuted={true}
        />
      )
      const peakBar = container.querySelector('div[style*="linear-gradient"]')
      expect(peakBar).toBeNull()
    })
  })

  // ─── Props par défaut ──────────────────────────────────────────

  it('devrait utiliser volume=100 par défaut', () => {
    const { container } = render(
      <EditorMasterVolume tr={tr} onVolumeChange={vi.fn()} />
    )
    expect(container.textContent).toContain('100%')
  })

  it('devrait utiliser isMuted=false par défaut', () => {
    const { container } = render(
      <EditorMasterVolume tr={tr} onVolumeChange={vi.fn()} />
    )
    expect(container.textContent).not.toContain('OFF')
  })
})