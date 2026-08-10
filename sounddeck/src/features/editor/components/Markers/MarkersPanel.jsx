// src/features/editor/components/Markers/MarkersPanel.jsx
import React, { useState, useCallback, memo } from 'react'
import MarkerItem from './MarkerItem'
import MarkerAddForm from './MarkerAddForm'

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

const MarkersPanel = memo(({
  markers,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onNavigateToMarker,
  currentTime,
  totalDuration,
  tr
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedColor, setSelectedColor] = useState('blue')

  const handleAddMarker = (name) => {
    const color = MARKER_COLORS.find(c => c.id === selectedColor)
    onAddMarker?.({
      name: name || `Marker ${(markers?.length || 0) + 1}`,
      time: currentTime || 0,
      color: color?.color || '#3b82f6'
    })
    setIsAdding(false)
  }

  const handleAddAtCurrentTime = () => {
    setIsAdding(true)
  }

  const sortedMarkers = markers ? [...markers].sort((a, b) => a.time - b.time) : []

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 12,
      maxHeight: 300,
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <i className="ti ti-flag" style={{ color: 'var(--accent)' }} />
          {tr('editorMarkers') || 'Marqueurs'}
          <span style={{
            fontSize: 10,
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            marginLeft: 4
          }}>
            ({sortedMarkers.length})
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={handleAddAtCurrentTime}
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              padding: '2px 8px',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)'
            }}
            title={tr('editorAddMarker') || 'Ajouter un marqueur (Ctrl+M)'}
          >
            <i className="ti ti-plus" /> {tr('editorAdd') || 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Couleur sélectionnée */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 8,
        flexWrap: 'wrap'
      }}>
        {MARKER_COLORS.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedColor(c.id)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c.color,
              border: selectedColor === c.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              outline: 'none'
            }}
            title={tr(`markerColor${c.id.charAt(0).toUpperCase() + c.id.slice(1)}`) || c.id}
          />
        ))}
      </div>

      {/* Formulaire d'ajout */}
      {isAdding && (
        <MarkerAddForm
          onAdd={handleAddMarker}
          onCancel={() => setIsAdding(false)}
          defaultName={`Marker ${(markers?.length || 0) + 1}`}
          tr={tr}
        />
      )}

      {/* Liste des marqueurs */}
      {sortedMarkers.length === 0 && !isAdding && (
        <div style={{
          textAlign: 'center',
          padding: 20,
          color: 'var(--text-tertiary)',
          fontSize: 12
        }}>
          <i className="ti ti-flag" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
          {tr('markersEmpty') || 'Aucun marqueur'}
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
  )
})

MarkersPanel.displayName = 'MarkersPanel'

export default MarkersPanel