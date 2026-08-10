// src/features/editor/hooks/useKeyboardShortcuts.js
import { useEffect, useCallback } from 'react'

export function useKeyboardShortcuts({
  onPlay,
  onPause,
  onStop,
  onUndo,
  onRedo,
  onAddTrack,
  onAddMarker,
  onDelete,
  onSplit,
  onToggleSnap,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isPlaying,
  canUndo,
  canRedo,
  isEnabled = true
}) {
  const handleKeyDown = useCallback((e) => {
    if (!isEnabled) return
    
    // Ne pas capturer si on est dans un input
    const target = e.target
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }

    // Ctrl / Cmd
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey
    const alt = e.altKey

    // Espace - Play/Pause
    if (e.key === ' ' && !ctrl) {
      e.preventDefault()
      if (isPlaying) {
        onPause?.()
      } else {
        onPlay?.()
      }
      return
    }

    // Escape - Stop
    if (e.key === 'Escape') {
      e.preventDefault()
      onStop?.()
      return
    }

    // Ctrl+Z - Undo
    if (ctrl && e.key === 'z' && !shift) {
      e.preventDefault()
      onUndo?.()
      return
    }

    // Ctrl+Y ou Ctrl+Shift+Z - Redo
    if (ctrl && (e.key === 'y' || (e.key === 'z' && shift))) {
      e.preventDefault()
      onRedo?.()
      return
    }

    // Ctrl+T - Add Track
    if (ctrl && e.key === 't' && !shift) {
      e.preventDefault()
      onAddTrack?.()
      return
    }

    // Ctrl+M - Add Marker
    if (ctrl && e.key === 'm') {
      e.preventDefault()
      onAddMarker?.()
      return
    }

    // Delete / Backspace - Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onDelete?.()
      return
    }

    // Ctrl+Shift+S - Toggle Snap
    if (ctrl && shift && e.key === 's') {
      e.preventDefault()
      onToggleSnap?.()
      return
    }

    // Ctrl+= / Ctrl++ - Zoom In
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      onZoomIn?.()
      return
    }

    // Ctrl+- - Zoom Out
    if (ctrl && e.key === '-') {
      e.preventDefault()
      onZoomOut?.()
      return
    }

    // Ctrl+0 - Zoom Reset
    if (ctrl && e.key === '0') {
      e.preventDefault()
      onZoomReset?.()
      return
    }

    // S - Split
    if (e.key === 's' && !ctrl && !shift) {
      e.preventDefault()
      onSplit?.()
      return
    }
  }, [
    isEnabled,
    isPlaying,
    onPlay,
    onPause,
    onStop,
    onUndo,
    onRedo,
    onAddTrack,
    onAddMarker,
    onDelete,
    onSplit,
    onToggleSnap,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    canUndo,
    canRedo
  ])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    shortcuts: {
      'Space': 'Play/Pause',
      'Escape': 'Stop',
      'Ctrl+Z': 'Undo',
      'Ctrl+Y': 'Redo',
      'Ctrl+T': 'Add Track',
      'Ctrl+M': 'Add Marker',
      'Delete': 'Delete',
      'Ctrl+Shift+S': 'Toggle Snap',
      'Ctrl+=/+': 'Zoom In',
      'Ctrl+-': 'Zoom Out',
      'Ctrl+0': 'Zoom Reset',
      'S': 'Split'
    }
  }
}

export default useKeyboardShortcuts