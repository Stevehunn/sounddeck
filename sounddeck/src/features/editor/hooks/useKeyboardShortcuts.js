/**
 * @file Editor keyboard shortcuts hook.
 *
 * Registers a single global `keydown` listener and dispatches to the
 * caller's handlers based on the key + modifiers combination:
 *
 * | Shortcut | Action |
 * |---|---|
 * | `Space` | Play / Pause (context-sensitive) |
 * | `Escape` | Stop |
 * | `Ctrl+Z` | Undo |
 * | `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
 * | `Ctrl+T` | Add track |
 * | `Ctrl+M` | Add marker |
 * | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste |
 * | `Delete` / `Backspace` | Delete selection |
 * | `Ctrl+Shift+S` | Toggle snap |
 * | `Ctrl+= / Ctrl++ / Ctrl+- / Ctrl+0` | Zoom in / out / reset |
 * | `S` | Split |
 * | `L` / `Ctrl+L` | Toggle clip loop |
 * | `M` / `Ctrl+Shift+M` | Toggle metronome |
 *
 * Handlers can be `null`/`undefined` — the hook won't crash, it just
 * does nothing for that shortcut.
 *
 * The listener is **ignored** when the event target is an `INPUT`,
 * `TEXTAREA`, or `SELECT` (so users can type freely).
 *
 * @see @features/editor/Editor.jsx — the caller
 */

import { useEffect, useCallback } from 'react'

/**
 * Editor keyboard shortcuts hook.
 *
 * @param {Object} handlers
 * @param {(() => void)|null} [handlers.onPlay]
 * @param {(() => void)|null} [handlers.onPause]
 * @param {(() => void)|null} [handlers.onStop]
 * @param {(() => void)|null} [handlers.onUndo]
 * @param {(() => void)|null} [handlers.onRedo]
 * @param {(() => void)|null} [handlers.onAddTrack]
 * @param {(() => void)|null} [handlers.onAddMarker]
 * @param {(() => void)|null} [handlers.onDelete]
 * @param {(() => void)|null} [handlers.onSplit]
 * @param {(() => void)|null} [handlers.onToggleSnap]
 * @param {(() => void)|null} [handlers.onZoomIn]
 * @param {(() => void)|null} [handlers.onZoomOut]
 * @param {(() => void)|null} [handlers.onZoomReset]
 * @param {(() => void)|null} [handlers.onCopy]
 * @param {(() => void)|null} [handlers.onCut]
 * @param {(() => void)|null} [handlers.onPaste]
 * @param {(() => void)|null} [handlers.onToggleClipLoop]
 * @param {(() => void)|null} [handlers.onToggleMetronome]
 * @param {boolean} [handlers.isPlaying=false]
 * @param {boolean} [handlers.canUndo=false] - Reserved (currently unused).
 * @param {boolean} [handlers.canRedo=false] - Reserved (currently unused).
 * @param {boolean} [handlers.isEnabled=true]
 * @returns {{shortcuts: Record<string, string>}} Informational map.
 */
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
  // NOTE: canUndo / canRedo are exposed for external UIs (toolbar state),
  // not consumed by the dispatcher itself. Kept in the API for symmetry
  // with the toolbar props.
  canUndo: _canUndo,
  canRedo: _canRedo,
  isEnabled = true,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!isEnabled) return

      const target = e.target
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const alt = e.altKey

      // ─── Playback ──────────────────────────────────────────────────
      if (e.key === ' ' && !ctrl) {
        e.preventDefault()
        if (isPlaying) onPause?.()
        else onPlay?.()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        onStop?.()
        return
      }

      // ─── Undo / Redo ───────────────────────────────────────────────
      if (ctrl && e.key === 'z' && !shift) {
        e.preventDefault()
        onUndo?.()
        return
      }

      if (ctrl && (e.key === 'y' || (e.key === 'z' && shift))) {
        e.preventDefault()
        onRedo?.()
        return
      }

      // ─── Track / Marker ────────────────────────────────────────────
      if (ctrl && e.key === 't' && !shift) {
        e.preventDefault()
        onAddTrack?.()
        return
      }

      if (ctrl && e.key === 'm' && !shift) {
        e.preventDefault()
        onAddMarker?.()
        return
      }

      // ─── Clipboard ─────────────────────────────────────────────────
      if (ctrl && e.key === 'c' && !shift) {
        e.preventDefault()
        onCopy?.()
        return
      }

      if (ctrl && e.key === 'x' && !shift) {
        e.preventDefault()
        onCut?.()
        return
      }

      if (ctrl && e.key === 'v' && !shift) {
        e.preventDefault()
        onPaste?.()
        return
      }

      // ─── Delete ────────────────────────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete?.()
        return
      }

      // ─── Snap ──────────────────────────────────────────────────────
      if (ctrl && shift && e.key === 's') {
        e.preventDefault()
        onToggleSnap?.()
        return
      }

      // ─── Zoom ──────────────────────────────────────────────────────
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        onZoomIn?.()
        return
      }

      if (ctrl && e.key === '-') {
        e.preventDefault()
        onZoomOut?.()
        return
      }

      if (ctrl && e.key === '0') {
        e.preventDefault()
        onZoomReset?.()
        return
      }

      // ─── Letter shortcuts (no modifiers) ───────────────────────────
      if (e.key === 's' && !ctrl && !shift && !alt) {
        e.preventDefault()
        onSplit?.()
        return
      }

      if (e.key === 'l' && !ctrl && !shift && !alt) {
        e.preventDefault()
        onToggleClipLoop?.()
        return
      }

      if (ctrl && e.key === 'l' && !shift) {
        e.preventDefault()
        onToggleClipLoop?.()
        return
      }

      if (e.key === 'm' && !ctrl && !shift && !alt) {
        e.preventDefault()
        onToggleMetronome?.()
        return
      }

      if (ctrl && shift && e.key === 'm') {
        e.preventDefault()
        onToggleMetronome?.()
        return
      }
    },
    [
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
    ]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  /** Informational map — useful for tooltips / docs. */
  const shortcuts = {
    Space: 'Play/Pause',
    Escape: 'Stop',
    'Ctrl+Z': 'Undo',
    'Ctrl+Y': 'Redo',
    'Ctrl+T': 'Add Track',
    'Ctrl+M': 'Add Marker',
    'Ctrl+C': 'Copy',
    'Ctrl+X': 'Cut',
    'Ctrl+V': 'Paste',
    Delete: 'Delete',
    'Ctrl+Shift+S': 'Toggle Snap',
    'Ctrl+=/+': 'Zoom In',
    'Ctrl+-': 'Zoom Out',
    'Ctrl+0': 'Zoom Reset',
    S: 'Split',
    'L / Ctrl+L': 'Toggle Loop',
    'M / Ctrl+Shift+M': 'Toggle Metronome',
  }

  return { shortcuts }
}

export default useKeyboardShortcuts