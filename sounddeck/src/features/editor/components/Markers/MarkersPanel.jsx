/**
 * @file Markers side panel — list, add form (name / position / color), and
 * "auto-open" footer toggle.
 *
 * The add form toggles via the header button. Fields:
 * - **Name** — free text, defaults to `Marker N` when empty.
 * - **Position** — radio between "current time" and a custom seconds input.
 * - **Color** — 10 presets + a custom `<input type="color">` picker.
 *
 * Markers are sorted by `time` ascending before rendering. The panel is
 * stateless w.r.t. the marker list (parent owns state); it only owns the
 * `isAdding` / form fields and the `autoOpen` preference (persisted in
 * `appStorage` under `sounddeck_markers_auto_open`).
 *
 * @see ./MarkerItem.jsx
 * @see ../Timeline/TimelineMarkersPanel.jsx
 * @see @shared/utils/appStorage
 */

import { useState, useCallback, memo, useEffect } from 'react'
import { getBoolean, setItem } from '@shared/utils/appStorage'
import MarkerItem from './MarkerItem'

/** Default marker color (blue). */
const DEFAULT_MARKER_COLOR = '#3b82f6'

/** Preset marker colors. */
const MARKER_COLORS = [
  { id: 'red', color: '#ef4444' },
  { id: 'pink', color: '#ec4899' },
  { id: 'purple', color: '#8b5cf6' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'green', color: '#22c55e' },
  { id: 'lime', color: '#84cc16' },
  { id: 'yellow', color: '#eab308' },
  { id: 'orange', color: '#f97316' },
  { id: 'brown', color: '#92400e' },
]

/** Storage key for the auto-open preference. */
const STORAGE_KEY_AUTO_OPEN = 'sounddeck_markers_auto_open'

/**
 * Markers panel (see file header).
 *
 * @param {Object} props
 * @param {Array<{id: string, name: string, time: number, color?: string}>} [props.markers]
 * @param {(marker: {name: string, time: number, color: string}) => void} [props.onAddMarker]
 * @param {(markerId: string) => void} [props.onRemoveMarker]
 * @param {(markerId: string, updates: Object) => void} [props.onUpdateMarker]
 * @param {(time: number) => void} [props.onNavigateToMarker]
 * @param {number} [props.currentTime=0]
 * @param {number} [props.totalDuration=60]
 * @param {(key: string, params?: Object) => string} [props.tr]
 * @param {(autoOpen: boolean) => void} [props.onAutoOpenChange]
 * @returns {JSX.Element}
 */
const MarkersPanel = memo(function MarkersPanel({
  markers = [],
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onNavigateToMarker,
  currentTime = 0,
  totalDuration = 60,
  tr,
  onAutoOpenChange,
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedColor, setSelectedColor] = useState(DEFAULT_MARKER_COLOR)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [markerName, setMarkerName] = useState('')
  const [markerTime, setMarkerTime] = useState(currentTime)
  const [useCurrentTime, setUseCurrentTime] = useState(true)
  const [autoOpen, setAutoOpen] = useState(false)

  // Load the auto-open preference once on mount.
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const value = await getBoolean(STORAGE_KEY_AUTO_OPEN, false)
      if (mounted) setAutoOpen(value)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleAutoOpenToggle = useCallback(async () => {
    const newValue = !autoOpen
    setAutoOpen(newValue)

    try {
      await setItem(STORAGE_KEY_AUTO_OPEN, newValue)
    } catch (e) {
      console.warn('[MarkersPanel] Failed to save autoOpen:', e)
    }

    onAutoOpenChange?.(newValue)
  }, [autoOpen, onAutoOpenChange])

  const handleAddMarker = useCallback(() => {
    if (onAddMarker) {
      const fallbackName =
        tr?.('markerFallbackName', { n: (markers?.length || 0) + 1 }) ||
        `Marker ${(markers?.length || 0) + 1}`
      const name = markerName.trim() || fallbackName
      const time = useCurrentTime ? currentTime : markerTime
      onAddMarker({
        name,
        time: Math.max(0, Math.min(time, totalDuration)),
        color: selectedColor,
      })
      setMarkerName('')
      setIsAdding(false)
      setUseCurrentTime(true)
    }
  }, [
    onAddMarker,
    selectedColor,
    currentTime,
    markers?.length,
    markerName,
    useCurrentTime,
    markerTime,
    totalDuration,
    tr,
  ])

  const handleCancel = useCallback(() => {
    setIsAdding(false)
    setMarkerName('')
    setUseCurrentTime(true)
  }, [])

  const handleAddAtCurrentTime = useCallback(() => {
    setIsAdding(true)
    setMarkerName(
      tr?.('markerFallbackName', { n: (markers?.length || 0) + 1 }) ||
        `Marker ${(markers?.length || 0) + 1}`
    )
    setMarkerTime(currentTime)
    setUseCurrentTime(true)
  }, [markers?.length, currentTime, tr])

  const sortedMarkers = markers ? [...markers].sort((a, b) => a.time - b.time) : []

  if (!onAddMarker) {
    return (
      <div
        style={{
          padding: 12,
          color: 'var(--text-tertiary)',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        {tr?.('editorMarkersNotAvailable') || 'Markers not available'}
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
        maxHeight: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-flag" style={{ color: 'var(--accent)' }} />
          {tr?.('editorMarkers') || 'Markers'}
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              marginLeft: 4,
            }}
          >
            ({sortedMarkers.length})
          </span>
        </div>

        <button
          data-testid="editor-markers-add-button"
          className="btn-ghost btn-sm"
          onClick={handleAddAtCurrentTime}
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            padding: '4px 10px',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          title={tr?.('editorAddMarker') || 'Add marker (Ctrl+M)'}
        >
          <i className="ti ti-plus" style={{ fontSize: 12 }} />
          {tr?.('editorAdd') || 'Add'}
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            padding: 10,
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr?.('markerName') || 'Marker name'}
            </label>
            <input
              ref={(input) => input?.focus()}
              data-testid="editor-marker-name-input"
              type="text"
              value={markerName}
              onChange={(e) => setMarkerName(e.target.value)}
              placeholder={tr?.('markerNamePlaceholder') || 'Enter a name…'}
              className="input-sm"
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMarker()
                if (e.key === 'Escape') handleCancel()
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr?.('markerPosition') || 'Position'}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  checked={useCurrentTime}
                  onChange={() => {
                    setUseCurrentTime(true)
                    setMarkerTime(currentTime)
                  }}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                {tr?.('markerCurrentTime') || 'Current position'} (
                {currentTime.toFixed(1)}s)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  checked={!useCurrentTime}
                  onChange={() => setUseCurrentTime(false)}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                {tr?.('markerCustomTime') || 'Custom'}
              </label>
            </div>
            {!useCurrentTime && (
              <div style={{ marginTop: 4 }}>
                <input
                  type="number"
                  value={markerTime}
                  onChange={(e) =>
                    setMarkerTime(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  min={0}
                  max={totalDuration}
                  step={0.1}
                  className="input-sm"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--text-tertiary)',
                    marginTop: 2,
                  }}
                >
                  {tr?.('markerTimeRange', {
                    max: totalDuration.toFixed(1),
                  }) ||
                    `Time in seconds (0 – ${totalDuration.toFixed(1)}s)`}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr?.('markerColor') || 'Color'}
            </label>
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {MARKER_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: c.color,
                    border:
                      selectedColor === c.color
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    flexShrink: 0,
                  }}
                  title={c.id}
                />
              ))}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: selectedColor,
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                  title={tr?.('customColor') || 'Custom color'}
                >
                  +
                </button>
                {showColorPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: 4,
                      zIndex: 10,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value)
                        setShowColorPicker(false)
                      }}
                      style={{
                        width: 80,
                        height: 40,
                        padding: 2,
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'flex-end',
            }}
          >
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                minHeight: 28,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {tr?.('cancel') || 'Cancel'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddMarker}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                minHeight: 28,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: 'white',
              }}
            >
              <i className="ti ti-check" /> {tr?.('add') || 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Marker list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 50,
        }}
      >
        {sortedMarkers.length === 0 && !isAdding && (
          <div
            style={{
              textAlign: 'center',
              padding: 20,
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}
          >
            <i
              className="ti ti-flag"
              style={{ fontSize: 24, display: 'block', marginBottom: 8 }}
            />
            {tr?.('markersEmpty') || 'No markers'}
            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>
              {tr?.('editorAddMarkerHint') || 'Press Ctrl+M to add one'}
            </div>
          </div>
        )}

        {sortedMarkers.map((marker, index) => (
          <MarkerItem
            key={marker.id || index}
            marker={marker}
            onRemove={onRemoveMarker}
            onUpdate={onUpdateMarker}
            onNavigate={onNavigateToMarker}
            currentTime={currentTime}
            totalDuration={totalDuration}
            tr={tr}
          />
        ))}
      </div>

      {/* Footer: auto-open toggle */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 8,
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            transition: 'background 0.15s',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <input
            type="checkbox"
            checked={autoOpen}
            onChange={handleAutoOpenToggle}
            style={{
              width: 16,
              height: 16,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          />
          <span>
            <i
              className="ti ti-door-enter"
              style={{ fontSize: 12, marginRight: 4 }}
            />
            {tr?.('markersAutoOpen') || 'Open automatically on editor load'}
          </span>
        </label>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            opacity: 0.6,
          }}
        >
          {autoOpen ? '🟢 ON' : '🔴 OFF'}
        </span>
      </div>
    </div>
  )
})

MarkersPanel.displayName = 'MarkersPanel'

export default MarkersPanel