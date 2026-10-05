// src/test/features/editor/hooks/useKeyboardShortcuts.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '@features/editor/hooks/useKeyboardShortcuts'

const makeHandlers = (overrides = {}) => ({
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onStop: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onAddTrack: vi.fn(),
  onAddMarker: vi.fn(),
  onDelete: vi.fn(),
  onSplit: vi.fn(),
  onToggleSnap: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomReset: vi.fn(),
  onCopy: vi.fn(),
  onCut: vi.fn(),
  onPaste: vi.fn(),
  onToggleClipLoop: vi.fn(),
  onToggleMetronome: vi.fn(),
  isPlaying: false,
  canUndo: false,
  canRedo: false,
  isEnabled: true,
  ...overrides,
})

const fireKey = (key, opts = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })
  Object.defineProperty(e, 'target', { value: document.body, configurable: true })
  document.dispatchEvent(e)
  return e
}

describe('useKeyboardShortcuts', () => {
  let handlers

  beforeEach(() => {
    handlers = makeHandlers()
  })

  const setup = () => {
    const hook = renderHook(() => useKeyboardShortcuts(handlers))
    return hook
  }

  describe('Espace - Play/Pause', () => {
    it('Space sans playing → onPlay', () => {
      setup()
      act(() => fireKey(' '))
      expect(handlers.onPlay).toHaveBeenCalled()
    })

    it('Space + playing → onPause', () => {
      handlers = makeHandlers({ isPlaying: true })
      setup()
      act(() => fireKey(' '))
      expect(handlers.onPause).toHaveBeenCalled()
    })
  })

  describe('Escape', () => {
    it('Escape → onStop', () => {
      setup()
      act(() => fireKey('Escape'))
      expect(handlers.onStop).toHaveBeenCalled()
    })
  })

  describe('Ctrl+Z / Ctrl+Y', () => {
    it('Ctrl+Z → onUndo', () => {
      setup()
      act(() => fireKey('z', { ctrlKey: true }))
      expect(handlers.onUndo).toHaveBeenCalled()
    })

    it('Ctrl+Shift+Z → onRedo', () => {
      setup()
      act(() => fireKey('z', { ctrlKey: true, shiftKey: true }))
      expect(handlers.onRedo).toHaveBeenCalled()
    })

    it('Ctrl+Y → onRedo', () => {
      setup()
      act(() => fireKey('y', { ctrlKey: true }))
      expect(handlers.onRedo).toHaveBeenCalled()
    })
  })

  describe('Ctrl+T / Ctrl+M', () => {
    it('Ctrl+T → onAddTrack', () => {
      setup()
      act(() => fireKey('t', { ctrlKey: true }))
      expect(handlers.onAddTrack).toHaveBeenCalled()
    })

    it('Ctrl+M → onAddMarker', () => {
      setup()
      act(() => fireKey('m', { ctrlKey: true }))
      expect(handlers.onAddMarker).toHaveBeenCalled()
    })
  })

  describe('Clipboard', () => {
    it('Ctrl+C → onCopy', () => {
      setup()
      act(() => fireKey('c', { ctrlKey: true }))
      expect(handlers.onCopy).toHaveBeenCalled()
    })

    it('Ctrl+X → onCut', () => {
      setup()
      act(() => fireKey('x', { ctrlKey: true }))
      expect(handlers.onCut).toHaveBeenCalled()
    })

    it('Ctrl+V → onPaste', () => {
      setup()
      act(() => fireKey('v', { ctrlKey: true }))
      expect(handlers.onPaste).toHaveBeenCalled()
    })
  })

  describe('Delete / Backspace', () => {
    it('Delete → onDelete', () => {
      setup()
      act(() => fireKey('Delete'))
      expect(handlers.onDelete).toHaveBeenCalled()
    })

    it('Backspace → onDelete', () => {
      setup()
      act(() => fireKey('Backspace'))
      expect(handlers.onDelete).toHaveBeenCalled()
    })
  })

  describe('Ctrl+Shift+S', () => {
    it('Ctrl+Shift+S → onToggleSnap', () => {
      setup()
      act(() => fireKey('s', { ctrlKey: true, shiftKey: true }))
      expect(handlers.onToggleSnap).toHaveBeenCalled()
    })
  })

  describe('Zoom', () => {
    it('Ctrl+= → onZoomIn', () => {
      setup()
      act(() => fireKey('=', { ctrlKey: true }))
      expect(handlers.onZoomIn).toHaveBeenCalled()
    })

    it('Ctrl++ → onZoomIn', () => {
      setup()
      act(() => fireKey('+', { ctrlKey: true }))
      expect(handlers.onZoomIn).toHaveBeenCalled()
    })

    it('Ctrl+- → onZoomOut', () => {
      setup()
      act(() => fireKey('-', { ctrlKey: true }))
      expect(handlers.onZoomOut).toHaveBeenCalled()
    })

    it('Ctrl+0 → onZoomReset', () => {
      setup()
      act(() => fireKey('0', { ctrlKey: true }))
      expect(handlers.onZoomReset).toHaveBeenCalled()
    })
  })

  describe('Touches simples', () => {
    it('S → onSplit', () => {
      setup()
      act(() => fireKey('s'))
      expect(handlers.onSplit).toHaveBeenCalled()
    })

    it('L → onToggleClipLoop', () => {
      setup()
      act(() => fireKey('l'))
      expect(handlers.onToggleClipLoop).toHaveBeenCalled()
    })

    it('Ctrl+L → onToggleClipLoop', () => {
      setup()
      act(() => fireKey('l', { ctrlKey: true }))
      expect(handlers.onToggleClipLoop).toHaveBeenCalled()
    })

    it('M → onToggleMetronome', () => {
      setup()
      act(() => fireKey('m'))
      expect(handlers.onToggleMetronome).toHaveBeenCalled()
    })

    it('Ctrl+Shift+M → onToggleMetronome', () => {
      setup()
      act(() => fireKey('m', { ctrlKey: true, shiftKey: true }))
      expect(handlers.onToggleMetronome).toHaveBeenCalled()
    })
  })

  describe('isEnabled', () => {
    it('aucun raccourci actif si isEnabled=false', () => {
      handlers = makeHandlers({ isEnabled: false })
      setup()
      act(() => fireKey(' '))
      act(() => fireKey('Escape'))
      act(() => fireKey('z', { ctrlKey: true }))
      expect(handlers.onPlay).not.toHaveBeenCalled()
      expect(handlers.onStop).not.toHaveBeenCalled()
      expect(handlers.onUndo).not.toHaveBeenCalled()
    })
  })

  describe('Input focus', () => {
    it('ignore les raccourcis si target est INPUT', () => {
      setup()
      const input = document.createElement('input')
      const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      Object.defineProperty(e, 'target', { value: input, configurable: true })
      document.dispatchEvent(e)
      expect(handlers.onPlay).not.toHaveBeenCalled()
    })

    it('ignore si target est TEXTAREA', () => {
      setup()
      const textarea = document.createElement('textarea')
      const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      Object.defineProperty(e, 'target', { value: textarea, configurable: true })
      document.dispatchEvent(e)
      expect(handlers.onPlay).not.toHaveBeenCalled()
    })

    it('ignore si target est SELECT', () => {
      setup()
      const select = document.createElement('select')
      const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      Object.defineProperty(e, 'target', { value: select, configurable: true })
      document.dispatchEvent(e)
      expect(handlers.onPlay).not.toHaveBeenCalled()
    })
  })

  describe('Retour shortcuts', () => {
    it('expose un objet shortcuts (info)', () => {
      const { result } = setup()
      expect(result.current.shortcuts).toBeDefined()
      expect(result.current.shortcuts['Space']).toBe('Play/Pause')
    })
  })

  describe('Cleanup', () => {
    it('retire le listener au unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const { unmount } = setup()
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      removeSpy.mockRestore()
    })
  })
})