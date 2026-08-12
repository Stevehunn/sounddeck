// src/features/editor/components/Timeline/index.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../contexts/EditorContext'
import { useLanguage } from '@core/i18n/LanguageContext'
import EditorTrack from '../Track'
import TrackHeader from '../Track/TrackHeader'
import TrackControls from '../Track/TrackControls'
import TimelineRuler from './TimelineRuler'
import TimelinePlayhead from './TimelinePlayhead'
import TimelineLoop from './TimelineLoop'
import TimelineZoomControls from './TimelineZoomControls'
import MarkersPanel from '../Markers/MarkersPanel'

const TRACK_HEAD_WIDTH = 200
const BASE_PIXELS_PER_SECOND = 80

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  return `${s.toFixed(1)}s`
}

export default function EditorTimeline({
  tracks,
  selectedClipId,
  selectedTrackId,
  totalDuration,
  currentTime,
  isPlaying,
  clipDurations,
  waveformData,
  zoomLevel,
  snapEnabled,
  loopRegion,
  autoCrossfade,
  onClipSelect,
  onClipMove,
  onClipUpdate,
  onClipRemove,
  onClipDuplicate,
  onClipFade,
  onClipContextMenu,
  onDragCheckpoint,
  onTrackRemove,
  onSeek,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  onRenameTrack,
  onSetLoopRegion,
  onClearLoop,
  onToggleLoop,
  onUpdateClipDuration,
  onZoomChange,
  addToast,
  store,
  setClipDurations,
  removeTrack,
  tr,
  onPlayClip,
  onStopClip,
  onCopyClip,
  onCutClip,
  onPasteClip,
  markers = [],
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onNavigateToMarker,
}) {
  console.log('🔍 [Timeline] Contexte:', {
    hasTracks: !!tracks,
    trackCount: tracks?.length || 0,
    hasOnPlayClip: !!onPlayClip,
    markersCount: markers?.length || 0,
  })

  const containerRef = useRef(null)
  const clipsContainerRef = useRef(null)
  const rulerRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [showMarkersPanel, setShowMarkersPanel] = useState(true)

  const pixelsPerSecond = 80 * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  const getTrackColor = (index) => {
    const colors = [
      'hsl(220, 70%, 55%)',
      'hsl(340, 70%, 55%)',
      'hsl(40, 70%, 55%)',
      'hsl(160, 70%, 55%)',
      'hsl(280, 70%, 55%)',
      'hsl(10, 70%, 55%)',
      'hsl(190, 70%, 55%)',
      'hsl(70, 70%, 55%)'
    ]
    return colors[index % colors.length]
  }

  // ✅ Fonction pour convertir une position X en temps
  const clientXToTime = useCallback((clientX, containerElement) => {
    const container = containerElement || clipsContainerRef.current
    if (!container) return 0
    const rect = container.getBoundingClientRect()
    const scrollLeft = container.scrollLeft
    const clickInTimeline = (clientX - rect.left) + scrollLeft
    const clampedX = Math.max(0, Math.min(totalWidth, clickInTimeline))
    return clampedX / pixelsPerSecond
  }, [totalWidth, pixelsPerSecond])

  // ✅ Handler pour le clic sur la timeline (ruler ou zone des pistes)
  const handleTimelineClick = useCallback((e) => {
    // Ne pas traiter si on a cliqué sur un clip ou un bouton
    const target = e.target
    if (target.closest?.('.editor-clip-wrapper') || target.closest?.('button')) {
      return
    }
    
    const time = clientXToTime(e.clientX)
    if (time >= 0 && time <= totalDuration) {
      console.log('🎯 [Timeline] Clic à', time.toFixed(2), 's')
      onSeek?.(time)
    }
  }, [clientXToTime, totalDuration, onSeek])

  // ✅ Handler pour le clic sur la règle
  const handleRulerClick = useCallback((e) => {
    // Si c'est un double-clic, on laisse le double-clic gérer le zoom
    if (e.detail === 2) {
      const time = clientXToTime(e.clientX, rulerRef.current)
      onSeek?.(time)
      return
    }
    
    const time = clientXToTime(e.clientX, rulerRef.current)
    if (time >= 0 && time <= totalDuration) {
      console.log('🎯 [Timeline] Clic sur règle à', time.toFixed(2), 's')
      onSeek?.(time)
    }
  }, [clientXToTime, totalDuration, onSeek])

  // ✅ Handler pour le double-clic sur la règle
  const handleRulerDoubleClick = useCallback((e) => {
    // Le double-clic est géré par handleRulerClick via e.detail === 2
  }, [])

  // ✅ Rendre les repères des marqueurs sur la règle
  const renderMarkerMarkers = () => {
    if (!markers || markers.length === 0) return null
    
    return markers.map((marker) => {
      const position = marker.time * pixelsPerSecond
      if (position > totalWidth) return null
      
      return (
        <div
          key={`marker-${marker.id}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: position,
            width: 2,
            background: marker.color || '#3b82f6',
            zIndex: 4,
            pointerEvents: 'none',
            opacity: 0.8
          }}
          title={`${marker.name} (${formatTime(marker.time)})`}
        >
          {/* Petite pointe en haut */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `6px solid ${marker.color || '#3b82f6'}`
          }} />
          
          {/* Étiquette du marqueur sur la règle */}
          <div style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 7,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-secondary)',
            padding: '1px 4px',
            borderRadius: 2,
            border: `1px solid ${marker.color || '#3b82f6'}`,
            whiteSpace: 'nowrap',
            opacity: 0.7,
            pointerEvents: 'none',
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {marker.name.length > 8 ? marker.name.slice(0, 8) + '…' : marker.name}
          </div>
          
          {/* Ligne verticale sur toute la hauteur des pistes */}
          <div style={{
            position: 'absolute',
            top: 20,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1,
            background: marker.color || '#3b82f6',
            opacity: 0.3,
            pointerEvents: 'none'
          }} />
        </div>
      )
    })
  }

  // Effet pour la molette de zoom
  useEffect(() => {
    const clipsContainer = clipsContainerRef.current
    if (!clipsContainer) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        onZoomChange?.(newZoom)
      } else {
        clipsContainer.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    clipsContainer.addEventListener('wheel', onWheel, { passive: false })
    return () => clipsContainer.removeEventListener('wheel', onWheel)
  }, [zoomLevel, onZoomChange])

  // Générer une clé pour chaque piste
  const getTrackKey = (track) => {
    const clipPositions = track.clips.map(c => `${c.id}:${c.start.toFixed(3)}`).join('|')
    return `${track.id}-${clipPositions}`
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Ruler - avec clic pour seek */}
      <div style={{
        display: 'flex',
        height: 36,
        minHeight: 36,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        zIndex: 5,
        position: 'relative'
      }}>
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)'
        }} />
        <div
          ref={rulerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
          onClick={handleRulerClick}
          onDoubleClick={handleRulerDoubleClick}
        >
          <TimelineRuler
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
            isPlaying={isPlaying}
            zoomLevel={zoomLevel}
            formatTime={formatTime}
          />
          <TimelinePlayhead
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            isPlaying={isPlaying}
            formatTime={formatTime}
          />
          
          {/* ✅ Repères des marqueurs sur la règle */}
          {renderMarkerMarkers()}
        </div>
      </div>

      {/* Loop */}
      <div style={{
        display: 'flex',
        height: 10,
        minHeight: 10,
        flexShrink: 0,
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)',
        position: 'relative'
      }}>
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
          borderRight: '1px solid var(--border)'
        }} />
        <div style={{ flex: 1, position: 'relative' }}>
          <TimelineLoop
            loopRegion={loopRegion}
            pixelsPerSecond={pixelsPerSecond}
            onSetLoopRegion={onSetLoopRegion}
            onClearLoop={onClearLoop}
            onToggleLoop={onToggleLoop}
            tr={tr}
            totalDuration={totalDuration}
          />
        </div>
      </div>

      {/* Tracks + Markers Panel */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Track Headers */}
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          height: '100%',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          zIndex: 2,
          overflow: 'hidden'
        }}>
          {tracks.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              gap: 8,
              padding: 16,
              fontSize: 12
            }}>
              <i className="ti ti-playlist" style={{ fontSize: 24 }} />
              <span>{tr('editorNoTracks')}</span>
              <span style={{ fontSize: 10 }}>{tr('editorAddTrackHint')}</span>
            </div>
          )}
          
          {tracks.map((track, index) => {
            const trackColor = track.color || getTrackColor(index)
            return (
              <div
                key={`header-${track.id}`}
                style={{
                  height: 80,
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border)',
                  background: selectedTrackId === track.id ? 'rgba(124,111,247,0.05)' : 'transparent',
                  gap: 4
                }}
              >
                <TrackHeader
                  track={track}
                  trackIndex={index}
                  trackColor={trackColor}
                  isHovering={true}
                  selectedTrackId={selectedTrackId}
                  onTrackRemove={onTrackRemove}
                  onRenameTrack={onRenameTrack}
                  tr={tr}
                />
                <TrackControls
                  track={track}
                  trackColor={trackColor}
                  onTrackMute={onTrackMute}
                  onTrackSolo={onTrackSolo}
                  onTrackVolume={onTrackVolume}
                  tr={tr}
                />
              </div>
            )
          })}
        </div>

        {/* Clips - avec repères des marqueurs */}
        <div
          ref={clipsContainerRef}
          style={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            position: 'relative',
            background: 'var(--bg-primary)',
            cursor: 'pointer'
          }}
          onClick={handleTimelineClick}
        >
          <div style={{
            position: 'relative',
            width: Math.max(totalWidth, 600),
            height: '100%'
          }}>
            {/* ✅ Lignes verticales des marqueurs sur les pistes */}
            {markers && markers.length > 0 && markers.map((marker) => {
              const position = marker.time * pixelsPerSecond
              if (position > totalWidth) return null
              
              return (
                <div
                  key={`marker-line-${marker.id}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: position,
                    width: 1,
                    background: marker.color || '#3b82f6',
                    opacity: 0.15,
                    zIndex: 1,
                    pointerEvents: 'none'
                  }}
                />
              )
            })}
            
            {tracks.map((track, index) => {
              const trackColor = track.color || getTrackColor(index)
              const trackKey = getTrackKey(track)
              
              return (
                <EditorTrack
                  key={trackKey}
                  track={track}
                  trackIndex={index}
                  totalDuration={totalDuration}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipId={selectedClipId}
                  selectedTrackId={selectedTrackId}
                  onClipSelect={onClipSelect}
                  onClipMove={onClipMove}
                  onClipUpdate={onClipUpdate}
                  onClipRemove={onClipRemove}
                  onClipDuplicate={onClipDuplicate}
                  onClipFade={onClipFade}
                  onClipContextMenu={onClipContextMenu}
                  onDragCheckpoint={onDragCheckpoint}
                  waveformData={waveformData}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  clipDurations={clipDurations}
                  onUpdateClipDuration={onUpdateClipDuration}
                  trackColor={trackColor}
                  snapEnabled={snapEnabled}
                  tr={tr}
                  onPlayClip={onPlayClip}
                  onStopClip={onStopClip}
                  onCopyClip={onCopyClip}
                  onCutClip={onCutClip}
                  onPasteClip={onPasteClip}
                />
              )
            })}
          </div>
        </div>

        {/* ✅ PANEL DES MARQUEURS - côté droit */}
        {showMarkersPanel && onAddMarker && (
          <div style={{
            width: 280,
            minWidth: 280,
            height: '100%',
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            zIndex: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* En-tête du panneau avec bouton de fermeture */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              background: 'var(--bg-tertiary)'
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <i className="ti ti-flag" style={{ color: 'var(--accent)' }} />
                {tr?.('editorMarkers') || 'Marqueurs'}
                <span style={{
                  fontSize: 9,
                  fontWeight: 400,
                  color: 'var(--text-tertiary)',
                  marginLeft: 2
                }}>
                  ({markers?.length || 0})
                </span>
              </span>
              <button
                className="btn-ghost btn-sm btn-icon"
                onClick={() => setShowMarkersPanel(false)}
                style={{
                  padding: '2px 4px',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  minWidth: 20,
                  minHeight: 20,
                  borderRadius: 'var(--radius-sm)'
                }}
                title="Fermer le panneau des marqueurs"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Contenu du panneau */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: 8
            }}>
              <MarkersPanel
                markers={markers}
                onAddMarker={onAddMarker}
                onRemoveMarker={onRemoveMarker}
                onUpdateMarker={onUpdateMarker}
                onNavigateToMarker={onNavigateToMarker}
                currentTime={currentTime}
                totalDuration={totalDuration}
                tr={tr}
              />
            </div>
          </div>
        )}

        {/* ✅ Bouton pour ouvrir le panneau des marqueurs s'il est caché */}
        {!showMarkersPanel && onAddMarker && (
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowMarkersPanel(true)}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 10,
              padding: '4px 8px',
              fontSize: 11,
              color: 'var(--accent)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              background: 'var(--bg-secondary)'
            }}
            title={tr?.('editorMarkers') || 'Afficher les marqueurs'}
          >
            <i className="ti ti-flag" />
            {tr?.('editorMarkers') || 'Marqueurs'}
            <span style={{
              fontSize: 9,
              color: 'var(--text-tertiary)'
            }}>
              ({markers?.length || 0})
            </span>
          </button>
        )}
      </div>

      {/* Zoom Controls */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '4px 0',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border)',
        zIndex: 20,
        flexShrink: 0
      }}>
        <TimelineZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
          totalDuration={totalDuration}
          containerRef={containerRef}
          tr={tr}
        />
      </div>
    </div>
  )
}