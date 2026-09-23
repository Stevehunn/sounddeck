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
  onCopy,
  onCut,
  onPaste,
  onToggleClipLoop,
  onToggleMetronome,
  isPlaying,
  canUndo,
  canRedo,
  isEnabled = true
}) {
  const handleKeyDown = useCallback((e) => {
    if (!isEnabled) return

    const target = e.target
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }

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

    // Ctrl+C - Copier
    if (ctrl && e.key === 'c' && !shift) {
      e.preventDefault()
      onCopy?.()
      return
    }

    // Ctrl+X - Couper
    if (ctrl && e.key === 'x' && !shift) {
      e.preventDefault()
      onCut?.()
      return
    }

    // Ctrl+V - Coller
    if (ctrl && e.key === 'v' && !shift) {
      e.preventDefault()
      onPaste?.()
      return
    }

    // Delete / Backspace - Supprimer
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

    // S - Split (sans modificateur)
    if (e.key === 's' && !ctrl && !shift && !alt) {
      e.preventDefault()
      onSplit?.()
      return
    }

    // L - Toggle Loop (sans modificateur)
    if (e.key === 'l' && !ctrl && !shift && !alt) {
      e.preventDefault()
      onToggleClipLoop?.()
      return
    }

    // Ctrl+L - Toggle Loop (avec modificateur)
    if (ctrl && e.key === 'l' && !shift) {
      e.preventDefault()
      onToggleClipLoop?.()
      return
    }

    // M - Toggle Métronome (sans modificateur)
    if (e.key === 'm' && !ctrl && !shift && !alt) {
      e.preventDefault()
      onToggleMetronome?.()
      return
    }

    // Ctrl+Shift+M - Toggle Métronome (avec modificateur)
    if (ctrl && shift && e.key === 'm') {
      e.preventDefault()
      onToggleMetronome?.()
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
    onCopy,
    onCut,
    onPaste,
    onToggleClipLoop,
    onToggleMetronome,
    canUndo,
    canRedo
  ])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  const shortcuts = {
    'Space': 'Play/Pause',
    'Escape': 'Stop',
    'Ctrl+Z': 'Undo',
    'Ctrl+Y': 'Redo',
    'Ctrl+T': 'Add Track',
    'Ctrl+M': 'Add Marker',
    'Ctrl+C': 'Copier',
    'Ctrl+X': 'Couper',
    'Ctrl+V': 'Coller',
    'Delete': 'Supprimer',
    'Ctrl+Shift+S': 'Toggle Snap',
    'Ctrl+=/+': 'Zoom In',
    'Ctrl+-': 'Zoom Out',
    'Ctrl+0': 'Zoom Reset',
    'S': 'Split',
    'L / Ctrl+L': 'Toggle Loop',
    'M / Ctrl+Shift+M': 'Toggle Métronome'
  }

  return { shortcuts }
}

export default useKeyboardShortcuts