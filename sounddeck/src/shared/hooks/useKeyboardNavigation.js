// src/shared/hooks/useKeyboardNavigation.js
import { useEffect, useRef, useState, useCallback } from 'react'

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

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(t)
  }, [])

  const setFocus = useCallback((index) => {
    if (index < 0 || index >= items.length) return
    setFocusedIndex(index)
    const ref = itemRefs.current[index]
    if (ref) {
      ref.focus()
      ref.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [items.length])

  const navigate = useCallback((direction) => {
    if (items.length === 0) return

    let newIndex
    if (focusedIndex === -1) {
      newIndex = direction === 'down' ? 0 : items.length - 1
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
  }, [focusedIndex, items.length, loop, setFocus])

  const handleKeyDown = useCallback((e) => {
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
        // Recherche rapide par lettre
        if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
          const searchTerm = e.key.toLowerCase()
          const foundIndex = items.findIndex(item =>
            item.name?.toLowerCase().startsWith(searchTerm)
          )
          if (foundIndex !== -1) {
            setFocus(foundIndex)
          }
        }
        break
    }
  }, [focusedIndex, items, navigate, onSelect, onEnter, onEscape, onDelete, setFocus])

  useEffect(() => {
    if (!isReady) return

    const element = containerRef?.current || document
    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, handleKeyDown, isReady])

  // Auto-focus
  useEffect(() => {
    if (autoFocus && items.length > 0) {
      setFocus(0)
    }
  }, [autoFocus, items.length, setFocus])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [items])

  return {
    focusedIndex,
    setFocus,
    navigate,
    itemRefs,
    handleKeyDown,
  }
}

export function useTabNavigation(containerRef) {
  const [tabOrder, setTabOrder] = useState([])

  useEffect(() => {
    if (!containerRef?.current) return

    const elements = containerRef.current.querySelectorAll(
      'button, [role="button"], a, input, select, textarea, [tabindex="0"]'
    )
    setTabOrder(Array.from(elements))
  }, [containerRef])

  return tabOrder
}

export default {
  useKeyboardNavigation,
  useTabNavigation,
}