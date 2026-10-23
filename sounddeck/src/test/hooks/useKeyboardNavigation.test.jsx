// src/test/hooks/useKeyboardNavigation.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKeyboardNavigation } from '@shared/hooks/useKeyboardNavigation'

describe('useKeyboardNavigation', () => {
  const items = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
    { id: 'c', name: 'Charlie' },
  ]

  // Builds a minimal keyboard event object matching what the hook expects
  const createKeyEvent = (key) => ({
    key,
    preventDefault: vi.fn(),
    target: { tagName: 'DIV' },
  })

  // ─── INITIAL VALUES ──────────────────────────────────────────────────

  it('devrait démarrer avec focusedIndex = -1', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items })
    )

    expect(result.current.focusedIndex).toBe(-1)
  })

  it('devrait exposer navigate, setFocus, handleKeyDown, itemRefs', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    expect(typeof result.current.navigate).toBe('function')
    expect(typeof result.current.setFocus).toBe('function')
    expect(typeof result.current.handleKeyDown).toBe('function')
    expect(result.current.itemRefs).toBeDefined()
  })

  // ─── NAVIGATE ────────────────────────────────────────────────────────

  it('navigate(1) depuis -1 devrait focus index 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => {
      result.current.navigate(1)
    })

    expect(result.current.focusedIndex).toBe(0)
  })

  it('navigate(-1) depuis -1 devrait focus le dernier index', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => {
      result.current.navigate(-1)
    })

    expect(result.current.focusedIndex).toBe(2)
  })

  it('navigate(1) devrait avancer d\'un cran', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.navigate(1))
    act(() => result.current.navigate(1))

    expect(result.current.focusedIndex).toBe(1)
  })

  it('devrait boucler de la fin vers le début (loop=true)', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, loop: true })
    )

    act(() => result.current.setFocus(2))
    act(() => result.current.navigate(1))

    expect(result.current.focusedIndex).toBe(0)
  })

  it('devrait boucler du début vers la fin en arrière (loop=true)', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, loop: true })
    )

    act(() => result.current.setFocus(0))
    act(() => result.current.navigate(-1))

    expect(result.current.focusedIndex).toBe(2)
  })

  it('ne devrait pas boucler si loop=false', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, loop: false })
    )

    act(() => result.current.setFocus(2))
    act(() => result.current.navigate(1))

    expect(result.current.focusedIndex).toBe(2) // stays
  })

  it('ne devrait rien faire si items est vide', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items: [] }))

    act(() => result.current.navigate(1))
    expect(result.current.focusedIndex).toBe(-1)
  })

  // ─── setFocus ────────────────────────────────────────────────────────

  it('setFocus devrait ignorer les index hors limites', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.setFocus(-1))
    expect(result.current.focusedIndex).toBe(-1)

    act(() => result.current.setFocus(99))
    expect(result.current.focusedIndex).toBe(-1)
  })

  it('setFocus devrait accepter un index valide', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.setFocus(1))
    expect(result.current.focusedIndex).toBe(1)
  })

  // ─── HANDLEKEYDOWN ───────────────────────────────────────────────────

  it('ArrowDown devrait naviguer vers le bas', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => {
      result.current.handleKeyDown(createKeyEvent('ArrowDown'))
    })

    expect(result.current.focusedIndex).toBe(0)
  })

  it('ArrowUp devrait naviguer vers le haut', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => {
      result.current.handleKeyDown(createKeyEvent('ArrowUp'))
    })

    expect(result.current.focusedIndex).toBe(2)
  })

  it('ne devrait rien faire sur un INPUT', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    const event = {
      ...createKeyEvent('ArrowDown'),
      target: { tagName: 'INPUT' },
    }

    act(() => {
      result.current.handleKeyDown(event)
    })

    expect(result.current.focusedIndex).toBe(-1)
  })

  it('ne devrait rien faire sur un TEXTAREA', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    const event = {
      ...createKeyEvent('ArrowDown'),
      target: { tagName: 'TEXTAREA' },
    }

    act(() => result.current.handleKeyDown(event))
    expect(result.current.focusedIndex).toBe(-1)
  })

  // ─── ENTER / SPACE ───────────────────────────────────────────────────

  it('Enter devrait appeler onEnter avec l\'item focus', () => {
    const onEnter = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onEnter })
    )

    act(() => result.current.setFocus(1))
    act(() => result.current.handleKeyDown(createKeyEvent('Enter')))

    expect(onEnter).toHaveBeenCalledWith(items[1])
  })

  it('Space devrait appeler onEnter', () => {
    const onEnter = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onEnter })
    )

    act(() => result.current.setFocus(0))
    act(() => result.current.handleKeyDown(createKeyEvent('Space')))

    expect(onEnter).toHaveBeenCalledWith(items[0])
  })

  it('Enter ne devrait rien faire si rien n\'est focus', () => {
    const onEnter = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onEnter })
    )

    act(() => result.current.handleKeyDown(createKeyEvent('Enter')))
    expect(onEnter).not.toHaveBeenCalled()
  })

  // ─── ESCAPE ──────────────────────────────────────────────────────────

  it('Escape devrait appeler onEscape et reset l\'index', () => {
    const onEscape = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onEscape })
    )

    act(() => result.current.setFocus(1))
    act(() => result.current.handleKeyDown(createKeyEvent('Escape')))

    expect(onEscape).toHaveBeenCalled()
    expect(result.current.focusedIndex).toBe(-1)
  })

  // ─── DELETE / BACKSPACE ──────────────────────────────────────────────

  it('Delete devrait appeler onDelete', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onDelete })
    )

    act(() => result.current.setFocus(0))
    act(() => result.current.handleKeyDown(createKeyEvent('Delete')))

    expect(onDelete).toHaveBeenCalledWith(items[0])
  })

  it('Backspace devrait appeler onDelete', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onDelete })
    )

    act(() => result.current.setFocus(2))
    act(() => result.current.handleKeyDown(createKeyEvent('Backspace')))

    expect(onDelete).toHaveBeenCalledWith(items[2])
  })

  // ─── HOME / END ──────────────────────────────────────────────────────

  it('Home devrait focus index 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.setFocus(2))
    act(() => result.current.handleKeyDown(createKeyEvent('Home')))

    expect(result.current.focusedIndex).toBe(0)
  })

  it('End devrait focus le dernier index', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.handleKeyDown(createKeyEvent('End')))
    expect(result.current.focusedIndex).toBe(2)
  })

  // ─── TYPE-AHEAD SEARCH ───────────────────────────────────────────────

  it('devrait focus un item par sa première lettre', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.handleKeyDown(createKeyEvent('b')))
    expect(result.current.focusedIndex).toBe(1) // Beta
  })

  it('devrait être insensible à la casse', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.handleKeyDown(createKeyEvent('C')))
    expect(result.current.focusedIndex).toBe(2) // Charlie
  })

  it('ne devrait rien faire si aucune lettre ne matche', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items }))

    act(() => result.current.handleKeyDown(createKeyEvent('z')))
    expect(result.current.focusedIndex).toBe(-1)
  })

  // ─── ARROWS LEFT / RIGHT (via onSelect) ──────────────────────────────

  it('ArrowRight devrait appeler onSelect avec "right"', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onSelect })
    )

    act(() => result.current.setFocus(0))
    act(() => result.current.handleKeyDown(createKeyEvent('ArrowRight')))

    expect(onSelect).toHaveBeenCalledWith(items[0], 'right')
  })

  it('ArrowLeft devrait appeler onSelect avec "left"', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, onSelect })
    )

    act(() => result.current.setFocus(1))
    act(() => result.current.handleKeyDown(createKeyEvent('ArrowLeft')))

    expect(onSelect).toHaveBeenCalledWith(items[1], 'left')
  })

  // ─── RESET WHEN ITEMS CHANGE ─────────────────────────────────────────

  it('devrait reset focusedIndex quand items change', async () => {
    const { result, rerender } = renderHook(
      ({ items: its }) => useKeyboardNavigation({ items: its }),
      { initialProps: { items } }
    )

    act(() => result.current.setFocus(1))
    expect(result.current.focusedIndex).toBe(1)

    // Reset is deferred via setTimeout(0) (React 19 fix) → wait for the
    // next tick before asserting.
    rerender({ items: [{ id: 'x', name: 'X' }] })
    await waitFor(() => {
      expect(result.current.focusedIndex).toBe(-1)
    })
  })

  // ─── AUTOFOCUS ───────────────────────────────────────────────────────

  it('devrait auto-focus le 1er item si autoFocus=true', async () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, autoFocus: true })
    )

    // Auto-focus goes through useEffect → wait for the commit
    await waitFor(() => {
      expect(result.current.focusedIndex).toBe(0)
    })
  })

  it('ne devrait PAS auto-focus si autoFocus=false', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({ items, autoFocus: false })
    )

    expect(result.current.focusedIndex).toBe(-1)
  })
})