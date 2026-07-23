import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '../../../context/LanguageContext'

const MARKER_COLORS = [
  { id: 'red', color: '#f44336', labelKey: 'markerColorRed' },
  { id: 'pink', color: '#e91e63', labelKey: 'markerColorPink' },
  { id: 'purple', color: '#9c27b0', labelKey: 'markerColorPurple' },
  { id: 'blue', color: '#3f51b5', labelKey: 'markerColorBlue' },
  { id: 'cyan', color: '#00bcd4', labelKey: 'markerColorCyan' },
  { id: 'green', color: '#4caf50', labelKey: 'markerColorGreen' },
  { id: 'lime', color: '#8bc34a', labelKey: 'markerColorLime' },
  { id: 'yellow', color: '#ffeb3b', labelKey: 'markerColorYellow' },
  { id: 'orange', color: '#ff9800', labelKey: 'markerColorOrange' },
  { id: 'brown', color: '#795548', labelKey: 'markerColorBrown' },
]

export default function EditorMarkersPanel({
  markers,
  currentTime,
  onAddMarker,
  onRemoveMarker,
  onSeek,
  tr
}) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [newMarkerName, setNewMarkerName] = useState('')
  const [selectedColor, setSelectedColor] = useState(MARKER_COLORS[0].color)
  const [editingMarkerId, setEditingMarkerId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [selectedMarkerId, setSelectedMarkerId] = useState(null)
  const panelRef = useRef(null)
  const nameInputRef = useRef(null)
  const editInputRef = useRef(null)

  // Gestion du clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && isOpen) {
        setIsOpen(false)
        setEditingMarkerId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus sur l'input du nom quand la popup s'ouvre
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current.focus(), 100)
    }
  }, [isOpen])

  // Focus sur l'input d'édition
  useEffect(() => {
    if (editingMarkerId && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current.focus()
        editInputRef.current.select()
      }, 100)
    }
  }, [editingMarkerId])

  // Raccourci clavier Ctrl+M
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+M ou Cmd+M
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        handleAddMarkerAtCurrentTime()
      }
      
      // Flèches pour naviguer entre les marqueurs
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const nextMarker = markers.find(m => m.time > currentTime + 0.1)
        if (nextMarker) {
          onSeek?.(nextMarker.time)
          setSelectedMarkerId(nextMarker.id)
        }
      }
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const prevMarkers = markers.filter(m => m.time < currentTime - 0.1)
        if (prevMarkers.length > 0) {
          const closest = prevMarkers.reduce((a, b) => b.time > a.time ? b : a)
          onSeek?.(closest.time)
          setSelectedMarkerId(closest.id)
        }
      }
      
      // Supprimer le marqueur sélectionné avec Delete ou Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMarkerId) {
        const marker = markers.find(m => m.id === selectedMarkerId)
        if (marker && !e.target.closest('input')) {
          e.preventDefault()
          onRemoveMarker?.(selectedMarkerId)
          setSelectedMarkerId(null)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [markers, currentTime, onSeek, onRemoveMarker, selectedMarkerId])

  const handleAddMarkerAtCurrentTime = useCallback(() => {
    const name = `M${markers.length + 1}`
    const colorIndex = markers.length % MARKER_COLORS.length
    const newMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      time: currentTime,
      color: MARKER_COLORS[colorIndex].color
    }
    onAddMarker?.(newMarker)
    if (isOpen) {
      setNewMarkerName('')
    }
  }, [markers.length, currentTime, onAddMarker, isOpen])

  const handleAddMarkerWithName = () => {
    const name = newMarkerName.trim() || `M${markers.length + 1}`
    const newMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      time: currentTime,
      color: selectedColor
    }
    onAddMarker?.(newMarker)
    setNewMarkerName('')
    setSelectedColor(MARKER_COLORS[0].color)
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddMarkerWithName()
    if (e.key === 'Escape') {
      setIsOpen(false)
      setEditingMarkerId(null)
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      const marker = markers.find(m => m.id === editingMarkerId)
      if (marker && editingName.trim()) {
        const updatedMarker = { ...marker, name: editingName.trim() }
        onAddMarker?.(updatedMarker)
      }
      setEditingMarkerId(null)
      setEditingName('')
    }
    if (e.key === 'Escape') {
      setEditingMarkerId(null)
      setEditingName('')
    }
  }

  const startEditing = (marker, e) => {
    if (e) e.stopPropagation()
    setEditingMarkerId(marker.id)
    setEditingName(marker.name)
  }

  const goToMarker = (marker) => {
    onSeek?.(marker.time)
    setSelectedMarkerId(marker.id)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`
  }

  // Trier les marqueurs par temps
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time)

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      {/* Bouton toggle avec indicateur de raccourci */}
      <button
        className={`btn-${isOpen ? 'primary' : 'secondary'}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          pointerEvents: 'auto',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          background: isOpen ? 'var(--accent-light)' : 'var(--bg-secondary)',
          color: isOpen ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'all 0.2s ease'
        }}
      >
        <i className="ti ti-bookmark" />
        <span>{markers.length}</span>
        <span style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          background: 'var(--bg-tertiary)',
          padding: '1px 6px',
          borderRadius: 10
        }}>
          Ctrl+M
        </span>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 10 }} />
      </button>

      {/* Panneau étendu */}
      {isOpen && (
        <div
          style={{
            pointerEvents: 'auto',
            marginTop: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 400,
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* En-tête avec raccourci */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <i className="ti ti-bookmark" style={{ marginRight: 4 }} />
              {t('editorMarkers') || 'Marqueurs'}
            </span>
            <span style={{
              fontSize: 9,
              color: 'var(--text-tertiary)'
            }}>
              <kbd>Ctrl+M</kbd> {t('editorAdd') || 'Ajouter'}
            </span>
          </div>

          {/* Ajout de marqueur avec nom et couleur */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 12,
            padding: '8px 10px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={nameInputRef}
                type="text"
                value={newMarkerName}
                onChange={e => setNewMarkerName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('editorMarkerName') || 'Nom du marqueur...'}
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  minHeight: 28
                }}
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleAddMarkerWithName}
                disabled={!newMarkerName.trim() && markers.length === 0}
                style={{
                  padding: '2px 12px',
                  fontSize: 11,
                  minHeight: 28,
                  opacity: newMarkerName.trim() || markers.length === 0 ? 1 : 0.5
                }}
              >
                <i className="ti ti-plus" />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {MARKER_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.color)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `2px solid ${selectedColor === c.color ? 'var(--accent)' : 'transparent'}`,
                    background: c.color,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    transform: selectedColor === c.color ? 'scale(1.1)' : 'scale(1)',
                    flexShrink: 0
                  }}
                  title={t(c.labelKey)}
                  onMouseEnter={e => {
                    if (selectedColor !== c.color) {
                      e.currentTarget.style.transform = 'scale(1.1)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedColor !== c.color) {
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Liste des marqueurs */}
          {sortedMarkers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '16px',
              color: 'var(--text-tertiary)',
              fontSize: 11
            }}>
              <i className="ti ti-bookmark" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />
              {t('editorNoMarkers') || 'Aucun marqueur'}
              <br />
              <span style={{ fontSize: 10 }}>
                {t('editorClickToAddMarker') || 'Ctrl+M pour ajouter un marqueur'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sortedMarkers.map((marker, index) => {
                const isSelected = selectedMarkerId === marker.id
                const isNear = Math.abs(marker.time - currentTime) < 0.3
                const isEditing = editingMarkerId === marker.id

                return (
                  <div
                    key={marker.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      border: `1px solid ${isSelected || isNear ? 'var(--accent)' : 'transparent'}`,
                      background: isSelected ? 'var(--accent-light)' : isNear ? 'rgba(124,111,247,0.08)' : 'transparent',
                      position: 'relative'
                    }}
                    onClick={() => goToMarker(marker)}
                    onMouseEnter={e => {
                      if (!isSelected && !isNear) {
                        e.currentTarget.style.background = 'var(--bg-hover)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !isNear) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    {/* Cercle de couleur */}
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: marker.color || '#f44336',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }} />

                    {/* Nom du marqueur (éditable) */}
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={() => {
                          const marker = markers.find(m => m.id === editingMarkerId)
                          if (marker && editingName.trim() && editingName.trim() !== marker.name) {
                            const updatedMarker = { ...marker, name: editingName.trim() }
                            onAddMarker?.(updatedMarker)
                          }
                          setEditingMarkerId(null)
                          setEditingName('')
                        }}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: 500,
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--accent)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1px 6px',
                          color: 'var(--text-primary)',
                          minHeight: 22,
                          width: 80
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: isSelected || isNear ? 600 : 400,
                          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                        onDoubleClick={(e) => startEditing(marker, e)}
                      >
                        {marker.name}
                      </span>
                    )}

                    {/* Temps */}
                    <span style={{
                      fontSize: 10,
                      color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)',
                      fontFamily: 'monospace',
                      minWidth: 40,
                      textAlign: 'right'
                    }}>
                      {formatTime(marker.time)}
                    </span>

                    {/* Numéro du marqueur */}
                    <span style={{
                      fontSize: 8,
                      color: 'var(--text-tertiary)',
                      opacity: 0.4,
                      minWidth: 16
                    }}>
                      #{index + 1}
                    </span>

                    {/* Boutons d'action */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(marker, e)
                        }}
                        style={{
                          padding: '1px 4px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          borderRadius: 4,
                          fontSize: 11,
                          opacity: 0.4,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = 1
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = 0.4
                          e.currentTarget.style.color = 'var(--text-tertiary)'
                        }}
                        title={t('editorRenameMarker') || 'Renommer (double-clic)'}
                      >
                        <i className="ti ti-pencil" style={{ fontSize: 10 }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveMarker?.(marker.id)
                          if (selectedMarkerId === marker.id) {
                            setSelectedMarkerId(null)
                          }
                        }}
                        style={{
                          padding: '1px 4px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          borderRadius: 4,
                          fontSize: 11,
                          opacity: 0.4,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = 1
                          e.currentTarget.style.color = 'var(--danger)'
                          e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = 0.4
                          e.currentTarget.style.color = 'var(--text-tertiary)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                        title={t('editorRemoveMarker') || 'Supprimer (Suppr)'}
                      >
                        <i className="ti ti-x" style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Navigation et raccourcis */}
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            color: 'var(--text-tertiary)'
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  const prevMarkers = sortedMarkers.filter(m => m.time < currentTime - 0.1)
                  if (prevMarkers.length > 0) {
                    const closest = prevMarkers.reduce((a, b) => b.time > a.time ? b : a)
                    goToMarker(closest)
                  }
                }}
                disabled={sortedMarkers.filter(m => m.time < currentTime - 0.1).length === 0}
                style={{
                  padding: '2px 6px',
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  opacity: sortedMarkers.filter(m => m.time < currentTime - 0.1).length === 0 ? 0.3 : 1
                }}
                title={t('editorPreviousMarker') || 'Marqueur précédent'}
              >
                <i className="ti ti-arrow-left" /> {t('editorPrevious') || 'Précédent'}
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  const nextMarkers = sortedMarkers.filter(m => m.time > currentTime + 0.1)
                  if (nextMarkers.length > 0) {
                    const closest = nextMarkers.reduce((a, b) => b.time < a.time ? b : a)
                    goToMarker(closest)
                  }
                }}
                disabled={sortedMarkers.filter(m => m.time > currentTime + 0.1).length === 0}
                style={{
                  padding: '2px 6px',
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  opacity: sortedMarkers.filter(m => m.time > currentTime + 0.1).length === 0 ? 0.3 : 1
                }}
                title={t('editorNextMarker') || 'Marqueur suivant'}
              >
                {t('editorNext') || 'Suivant'} <i className="ti ti-arrow-right" />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span><kbd>←</kbd> <kbd>→</kbd> {t('editorNavigate') || 'Naviguer'}</span>
              <span><kbd>Suppr</kbd> {t('editorDelete') || 'Supprimer'}</span>
              <span><kbd>Double-clic</kbd> {t('editorRename') || 'Renommer'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}