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

    // ✅ Espace - Play/Pause
    if (e.key === ' ' && !ctrl) {
      e.preventDefault()
      console.log('⌨️ Espace: Play/Pause')
      if (isPlaying) {
        onPause?.()
      } else {
        onPlay?.()
      }
      return
    }

    // ✅ Escape - Stop
    if (e.key === 'Escape') {
      e.preventDefault()
      console.log('⌨️ Escape: Stop')
      onStop?.()
      return
    }

    // ✅ Ctrl+Z - Undo
    if (ctrl && e.key === 'z' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+Z: Undo')
      onUndo?.()
      return
    }

    // ✅ Ctrl+Y ou Ctrl+Shift+Z - Redo
    if (ctrl && (e.key === 'y' || (e.key === 'z' && shift))) {
      e.preventDefault()
      console.log('⌨️ Ctrl+Y: Redo')
      onRedo?.()
      return
    }

    // ✅ Ctrl+T - Add Track
    if (ctrl && e.key === 't' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+T: Add Track')
      onAddTrack?.()
      return
    }

    // ✅ Ctrl+M - Add Marker
    if (ctrl && e.key === 'm') {
      e.preventDefault()
      console.log('⌨️ Ctrl+M: Add Marker')
      onAddMarker?.()
      return
    }

    // ✅ Ctrl+C - Copier
    if (ctrl && e.key === 'c' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+C: Copier')
      onCopy?.()
      return
    }

    // ✅ Ctrl+X - Couper
    if (ctrl && e.key === 'x' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+X: Couper')
      onCut?.()
      return
    }

    // ✅ Ctrl+V - Coller
    if (ctrl && e.key === 'v' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+V: Coller')
      onPaste?.()
      return
    }

    // ✅ Delete / Backspace - Supprimer
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      console.log('⌨️ Delete: Supprimer')
      onDelete?.()
      return
    }

    // ✅ Ctrl+Shift+S - Toggle Snap
    if (ctrl && shift && e.key === 's') {
      e.preventDefault()
      console.log('⌨️ Ctrl+Shift+S: Toggle Snap')
      onToggleSnap?.()
      return
    }

    // ✅ Ctrl+= / Ctrl++ - Zoom In
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      console.log('⌨️ Ctrl+=: Zoom In')
      onZoomIn?.()
      return
    }

    // ✅ Ctrl+- - Zoom Out
    if (ctrl && e.key === '-') {
      e.preventDefault()
      console.log('⌨️ Ctrl+-: Zoom Out')
      onZoomOut?.()
      return
    }

    // ✅ Ctrl+0 - Zoom Reset
    if (ctrl && e.key === '0') {
      e.preventDefault()
      console.log('⌨️ Ctrl+0: Zoom Reset')
      onZoomReset?.()
      return
    }

    // ✅ S - Split (sans modificateur)
    if (e.key === 's' && !ctrl && !shift && !alt) {
      e.preventDefault()
      console.log('⌨️ S: Split')
      onSplit?.()
      return
    }

    // ✅ L - Toggle Loop (sans modificateur)
    if (e.key === 'l' && !ctrl && !shift && !alt) {
      e.preventDefault()
      console.log('⌨️ L: Toggle Loop')
      onToggleClipLoop?.()
      return
    }

    // ✅ Ctrl+L - Toggle Loop (avec modificateur)
    if (ctrl && e.key === 'l' && !shift) {
      e.preventDefault()
      console.log('⌨️ Ctrl+L: Toggle Loop')
      onToggleClipLoop?.()
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
    'L / Ctrl+L': 'Toggle Loop'
  }

  return { shortcuts }
}

export default useKeyboardShortcuts