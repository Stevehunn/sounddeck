/**
 * @file Keyboard navigation hooks for list-like UIs.
 *
 * **`useKeyboardNavigation`** — arrow-key + Enter/Space/Escape/Delete/Home/
 * End navigation on a list of items. Supports looping, optional `autoFocus`,
 * and single-letter type-ahead search (e.g. typing "a" jumps to the first
 * item starting with "a").
 *
 * **`useTabNavigation`** — collects the focusable descendants of a
 * container (buttons, inputs, links, `[tabindex]`) so the caller can
 * manage focus manually.
 *
 * Both hooks are layout-agnostic: they only care about `items` (with a
 * `name` field for type-ahead) and refs, not about the DOM structure.
 *
 * @see @shared/hooks/index.js (re-exports)
 */

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * List keyboard navigation hook.
 *
 * @param {Object} options
 * @param {Array<{name?: string}>} options.items - Items to navigate.
 * @param {((item: Object, direction: 'left'|'right') => void)|null} [options.onSelect]
 *   Called on Left/Right arrow (for horizontal child navigation).
 * @param {((item: Object) => void)|null} [options.onEnter] - Called on Enter/Space.
 * @param {(() => void)|null} [options.onEscape] - Called on Escape.
 * @param {((item: Object) => void)|null} [options.onDelete] - Called on Delete/Backspace.
 * @param {{current: HTMLElement|null}} [options.containerRef] - Ref to the
 *   container (defaults to `document`).
 * @param {boolean} [options.autoFocus=false] - Focus the first item on mount.
 * @param {boolean} [options.loop=true] - Wrap around at the ends.
 *
 * @returns {{
 *   focusedIndex: number,
 *   setFocus: (index: number) => void,
 *   navigate: (direction: number) => void,
 *   itemRefs: {current: Record<number, HTMLElement>},
 *   handleKeyDown: (e: KeyboardEvent) => void,
 * }}
 */
export function useKeyboardNavigation({
  items,
  onSelect,
  onEnter,
  onEscape,
  onDelete,
  containerRef,
  autoFocus = false,
  loop = true,
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const itemRefs = useRef({})
  const [isReady, setIsReady] = useState(false)

  // Delay listener attachment by one tick so the container ref is set
  // (and so we don't run before React has committed the DOM).
  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(t)
  }, [])

  /**
   * Focuses the item at `index` (and scrolls it into view).
   * @param {number} index
   * @returns {void}
   */
  const setFocus = useCallback(
    (index) => {
      if (index < 0 || index >= items.length) return
      setFocusedIndex(index)
      const ref = itemRefs.current[index]
      if (ref) {
        ref.focus()
        ref.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    },
    [items.length]
  )

  /**
   * Moves the focus by `direction` items (respecting `loop`).
   * @param {number} direction - `+1` to go down, `-1` to go up.
   * @returns {void}
   */
  const navigate = useCallback(
    (direction) => {
      if (items.length === 0) return

      let newIndex
      if (focusedIndex === -1) {
        newIndex = direction > 0 ? 0 : items.length - 1
      } else {
        newIndex = focusedIndex + direction
      }

      if (loop) {
        if (newIndex < 0) newIndex = items.length - 1
        if (newIndex >= items.length) newIndex = 0
      } else {
        if (newIndex < 0 || newIndex >= items.length) return
      }

      setFocus(newIndex)
    },
    [focusedIndex, items.length, loop, setFocus]
  )

  /**
   * Keydown handler — dispatches to `navigate` / `onSelect` / `onEnter` /
   * `onEscape` / `onDelete`, or to type-ahead search.
   *
   * Ignores events originating from form fields (INPUT / TEXTAREA / SELECT)
   * so the user can type freely.
   *
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  const handleKeyDown = useCallback(
    (e) => {
      const target = e.target
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          navigate(1)
          break

        case 'ArrowUp':
          e.preventDefault()
          navigate(-1)
          break

        case 'ArrowRight':
          e.preventDefault()
          if (onSelect && focusedIndex !== -1) {
            onSelect(items[focusedIndex], 'right')
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
          if (onSelect && focusedIndex !== -1) {
            onSelect(items[focusedIndex], 'left')
          }
          break

        case 'Enter':
        case 'Space':
          e.preventDefault()
          if (onEnter && focusedIndex !== -1) {
            onEnter(items[focusedIndex])
          }
          break

        case 'Escape':
          e.preventDefault()
          if (onEscape) onEscape()
          setFocusedIndex(-1)
          break

        case 'Delete':
        case 'Backspace':
          if (onDelete && focusedIndex !== -1) {
            onDelete(items[focusedIndex])
          }
          break

        case 'Home':
          e.preventDefault()
          if (items.length > 0) setFocus(0)
          break

        case 'End':
          e.preventDefault()
          if (items.length > 0) setFocus(items.length - 1)
          break

        default:
          // Type-ahead search on letter/digit keys
          if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
            const searchTerm = e.key.toLowerCase()
            const foundIndex = items.findIndex((item) =>
              item.name?.toLowerCase().startsWith(searchTerm)
            )
            if (foundIndex !== -1) {
              setFocus(foundIndex)
            }
          }
          break
      }
    },
    [
      focusedIndex,
      items,
      navigate,
      onSelect,
      onEnter,
      onEscape,
      onDelete,
      setFocus,
    ]
  )

  // Attach the keydown listener once ready
  useEffect(() => {
    if (!isReady) return

    const element = containerRef?.current || document
    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, handleKeyDown, isReady])

  // Reset the focused index when `items` changes (but NOT on mount, to
  // avoid clobbering the auto-focus below).
  //
  // Deferred via setTimeout(0) so `setFocusedIndex` doesn't run
  // synchronously within the effect body (React 19 rule).
  const prevItemsRef = useRef(items)

  useEffect(() => {
    if (prevItemsRef.current !== items) {
      prevItemsRef.current = items
      const timer = setTimeout(() => setFocusedIndex(-1), 0)
      return () => clearTimeout(timer)
    }
  }, [items])

  // Auto-focus the first item on mount (if `autoFocus` and there are items).
  //
  // Deferred via setTimeout(0) so `setFocus` (which calls setState) doesn't
  // run synchronously within the effect body (React 19 rule).
  useEffect(() => {
    if (autoFocus && items.length > 0) {
      const timer = setTimeout(() => setFocus(0), 0)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, items.length, setFocus])

  return {
    focusedIndex,
    setFocus,
    navigate,
    itemRefs,
    handleKeyDown,
  }
}

/**
 * Collects the focusable descendants of a container.
 *
 * Returns the list in DOM order — useful for manual focus management
 * (e.g. trapping focus in a modal, or custom Tab handling).
 *
 * @param {{current: HTMLElement|null}} containerRef
 * @returns {HTMLElement[]}
 */
export function useTabNavigation(containerRef) {
  const [tabOrder, setTabOrder] = useState([])

  useEffect(() => {
    if (!containerRef?.current) return

    // Deferred via setTimeout(0) so `setTabOrder` doesn't run synchronously
    // within the effect body (React 19 rule).
    const timer = setTimeout(() => {
      if (!containerRef.current) return
      const elements = containerRef.current.querySelectorAll(
        'button, [role="button"], a, input, select, textarea, [tabindex="0"]'
      )
      setTabOrder(Array.from(elements))
    }, 0)

    return () => clearTimeout(timer)
  }, [containerRef])

  return tabOrder
}

export default {
  useKeyboardNavigation,
  useTabNavigation,
}