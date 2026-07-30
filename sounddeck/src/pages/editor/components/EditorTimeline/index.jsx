// src/pages/editor/components/EditorTimeline/index.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../contexts/EditorContext'
import EditorTrack from '../EditorTrack'

const TRACK_HEAD_WIDTH = 190
const BASE_PIXELS_PER_SECOND = 80

function getSnapStep(zoomLevel) {
  if (zoomLevel < 0.08) return 60
  if (zoomLevel < 0.15) return 30
  if (zoomLevel < 0.3) return 10
  if (zoomLevel < 0.6) return 5
  if (zoomLevel < 1.5) return 1
  if (zoomLevel < 3) return 0.5
  return 0.1
}

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
  onClipSelect,
  onClipMove,
  onClipUpdate,
  onClipRemove,
  onClipDuplicate,
  onClipFade,
  onClipCopy,
  onClipCut,
  onClipContextMenu,
  onDragCheckpoint,
  onTrackRemove,
  onSeek,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  waveformData,
  onWaveformUpdate,
  currentTime,
  isPlaying,
  clipDurations,
  snapEnabled,
  loopRegion,
  onSetLoopRegion,
  autoCrossfade,
  addToast,
  tr,
  onRenameTrack,
  zoomLevel = 1,
  onZoomChange,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  onToggleLoop,
  onSplitClip,
  onTrimClip,
  onSetFade,
  onUpdateClipDuration
}) {
  const containerRef = useRef(null)
  const rulerRef = useRef(null)
  const timelineRef = useRef(null)

  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [loopDrag, setLoopDrag] = useState(null)
  const [dropTargetTrackId, setDropTargetTrackId] = useState(null)
  const [snapFeedback, setSnapFeedback] = useState(null)
  const [isDraggingTrack, setIsDraggingTrack] = useState(false)

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  // ✅ Le crossfade est maintenant géré par Web Audio API directement
  // Les fades sont appliqués via les GainNode dans useAudioEngine
  // Cette fonction est conservée pour compatibilité mais ne fait rien
  const applyCrossfades = useCallback(() => {
    // Le crossfade est géré par Web Audio API via les fades
    // Les clips qui se chevauchent auront leurs fades appliqués automatiquement
  }, [])

  // ✅ Appliquer le crossfade quand les clips changent
  useEffect(() => {
    if (autoCrossfade) {
      applyCrossfades()
    }
  }, [tracks, clipDurations, autoCrossfade, applyCrossfades])

  const clientXToTime = (clientX) => {
    const timeline = timelineRef.current
    if (!timeline) return 0
    const timelineRect = timeline.getBoundingClientRect()
    const clickInTimeline = (clientX - timelineRect.left) - TRACK_HEAD_WIDTH
    const maxPixels = totalDuration * pixelsPerSecond
    const clampedX = Math.max(0, Math.min(maxPixels, clickInTimeline))
    return clampedX / pixelsPerSecond
  }

  const snapTime = (time, trackId, clipId) => {
    if (!snapEnabled) return time

    const step = getSnapStep(zoomLevel)
    let best = Math.round(time / step) * step
    let bestDist = Math.abs(time - best)

    const thresholdSeconds = 8 / pixelsPerSecond
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      track.clips.forEach(c => {
        if (c.id === clipId) return
        const cDuration = clipDurations?.[c.id] || c.duration || 3
        ;[c.start, c.start + cDuration].forEach(edge => {
          const dist = Math.abs(time - edge)
          if (dist < bestDist) {
            best = edge
            bestDist = dist
          }
        })
      })
    }

    if (bestDist <= thresholdSeconds && bestDist > 0.01) {
      setSnapFeedback({ time: best, visible: true })
      setTimeout(() => setSnapFeedback(null), 300)
    }

    return bestDist <= thresholdSeconds ? best : time
  }

  const handleClipMoveWithSnap = (trackId, clipId, newStart, newTrackId = null) => {
    setIsDraggingTrack(true)
    const snapped = snapTime(Math.max(0, newStart), trackId, clipId)
    onClipMove(trackId, clipId, snapped, newTrackId)
    setTimeout(() => setIsDraggingTrack(false), 100)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        onZoomChange?.(newZoom)
        
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const currentScroll = container.scrollLeft
        const newScroll = currentScroll + (centerX * delta * 0.5)
        container.scrollLeft = Math.max(0, newScroll)
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [zoomLevel, onZoomChange])

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.target === rulerRef.current)) {
      setIsPanning(true)
      setPanStartX(e.clientX)
      setScrollLeft(containerRef.current?.scrollLeft || 0)
      containerRef.current?.style.setProperty('cursor', 'grabbing')
    }
  }

  const handleMouseMove = (e) => {
    if (isPanning) {
      const deltaX = e.clientX - panStartX
      const newScroll = scrollLeft - deltaX
      if (containerRef.current) {
        containerRef.current.scrollLeft = Math.max(0, newScroll)
      }
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    containerRef.current?.style.setProperty('cursor', 'default')
  }

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning])

  const handleTimelineClick = (e) => {
    if (isPanning) return
    if (e.target.closest('.editor-clip-wrapper')) return
    if (e.target.closest('button')) return
    if (e.target.closest('.loop-strip')) return

    const seekTime = clientXToTime(e.clientX)
    onSeek?.(seekTime)
  }

  const handleLoopStripMouseDown = (e) => {
    e.stopPropagation()
    const time = clientXToTime(e.clientX)
    setLoopDrag({ mode: 'create', anchor: time })
    onSetLoopRegion?.(time, time + 0.1)
  }

  const handleLoopHandleMouseDown = (mode) => (e) => {
    e.stopPropagation()
    const anchor = mode === 'start' ? loopRegion.end : loopRegion.start
    setLoopDrag({ mode, anchor })
  }

  useEffect(() => {
    if (!loopDrag) return

    const handleMove = (e) => {
      const time = clientXToTime(e.clientX)
      onSetLoopRegion?.(
        Math.min(loopDrag.anchor, time),
        Math.max(loopDrag.anchor, time)
      )
    }
    const handleUp = () => setLoopDrag(null)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [loopDrag, onSetLoopRegion])

  // ─── RENDU ────────────────────────────────────────────────────────────────

  const renderRuler = () => {
    const marks = []
    let step = 1
    if (zoomLevel < 0.08) step = 60
    else if (zoomLevel < 0.15) step = 30
    else if (zoomLevel < 0.3) step = 10
    else if (zoomLevel < 0.6) step = 5
    else if (zoomLevel < 1.5) step = 1
    else if (zoomLevel < 3) step = 0.5
    else step = 0.1

    for (let i = 0; i <= Math.ceil(totalDuration) + 1; i += step) {
      const position = i * pixelsPerSecond
      const isMain = i % 5 === 0 || step >= 5
      
      marks.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: position,
            top: 0,
            height: isMain ? 16 : 8,
            width: 1,
            background: isMain ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            transform: 'translateX(-0.5px)'
          }}
        >
          {isMain && (
            <span style={{
              position: 'absolute',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: Math.max(7, 10 * Math.min(zoomLevel, 2) / 1.5),
              color: 'var(--text-tertiary)',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {i}s
            </span>
          )}
        </div>
      )
    }
    return marks
  }

  const renderPlayhead = () => {
    const position = Math.min(currentTime * pixelsPerSecond, totalWidth)
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: position,
        width: 2,
        background: 'var(--accent)',
        zIndex: 10,
        pointerEvents: 'none',
        transform: 'translateX(-1px)',
        boxShadow: '0 0 10px rgba(124,111,247,0.5)',
        transition: isPlaying ? 'none' : 'left 0.1s ease'
      }}>
        <div style={{
          position: 'absolute',
          top: -4,
          left: -4,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--accent)',
          border: '2px solid var(--bg-primary)'
        }} />
        <div style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9,
          fontFamily: 'monospace',
          color: 'var(--accent)',
          background: 'var(--bg-secondary)',
          padding: '1px 4px',
          borderRadius: 3,
          border: '1px solid var(--accent)',
          whiteSpace: 'nowrap',
          opacity: 0.8
        }}>
          {formatTime(currentTime)}
        </div>
      </div>
    )
  }

  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        background: 'var(--bg-primary)',
        cursor: isPanning ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        ref={timelineRef}
        style={{
          minWidth: totalWidth + 40,
          minHeight: '100%',
          position: 'relative'
        }}
        onClick={handleTimelineClick}
      >
        {/* Règle avec marqueurs */}
        <div 
          ref={rulerRef} 
          style={{
            position: 'sticky',
            top: 0,
            height: 36,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            zIndex: 5,
            marginLeft: TRACK_HEAD_WIDTH,
            cursor: 'pointer'
          }}
          onDoubleClick={(e) => {
            const time = clientXToTime(e.clientX)
          }}
        >
          {renderRuler()}
          {renderPlayhead()}
        </div>

        {/* Bande de boucle */}
        <div
          className="loop-strip"
          onMouseDown={handleLoopStripMouseDown}
          style={{
            position: 'sticky',
            top: 36,
            height: 10,
            marginLeft: TRACK_HEAD_WIDTH,
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border)',
            zIndex: 5,
            cursor: 'text'
          }}
        >
          {loopRegion && (loopRegion.enabled || loopRegion.end > loopRegion.start) && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: loopRegion.start * pixelsPerSecond,
              width: (loopRegion.end - loopRegion.start) * pixelsPerSecond,
              background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
              opacity: 0.7
            }} />
          )}
        </div>

        {/* Bornes de boucle */}
        {loopRegion && loopRegion.end > loopRegion.start && (
          <>
            <div
              onMouseDown={handleLoopHandleMouseDown('start')}
              style={{
                position: 'absolute',
                top: 46,
                bottom: 0,
                left: TRACK_HEAD_WIDTH + loopRegion.start * pixelsPerSecond - 4,
                width: 8,
                cursor: 'ew-resize',
                zIndex: 4,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div style={{
                width: 2,
                height: '100%',
                background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                opacity: loopRegion.enabled ? 0.9 : 0.4
              }} />
            </div>
            <div
              onMouseDown={handleLoopHandleMouseDown('end')}
              style={{
                position: 'absolute',
                top: 46,
                bottom: 0,
                left: TRACK_HEAD_WIDTH + loopRegion.end * pixelsPerSecond - 4,
                width: 8,
                cursor: 'ew-resize',
                zIndex: 4,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div style={{
                width: 2,
                height: '100%',
                background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                opacity: loopRegion.enabled ? 0.9 : 0.4
              }} />
            </div>
          </>
        )}

        {/* Zone des pistes */}
        <div style={{ marginLeft: TRACK_HEAD_WIDTH }}>
          {tracks.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'var(--text-tertiary)',
              gap: 12
            }}>
              <i className="ti ti-playlist" style={{ fontSize: 40 }} />
              <span>{tr('editorNoTracks')}</span>
              <span style={{ fontSize: 12 }}>{tr('editorAddTrackHint')}</span>
            </div>
          )}

          {tracks.map((track, index) => (
            <EditorTrack
              key={track.id}
              track={track}
              trackIndex={index}
              totalDuration={totalDuration}
              pixelsPerSecond={pixelsPerSecond}
              selectedClipId={selectedClipId}
              selectedTrackId={selectedTrackId}
              onClipSelect={onClipSelect}
              onClipMove={handleClipMoveWithSnap}
              onClipUpdate={onClipUpdate}
              onClipRemove={onClipRemove}
              onClipDuplicate={onClipDuplicate}
              onClipFade={onClipFade}
              onClipCopy={onClipCopy}
              onClipCut={onClipCut}
              onClipContextMenu={onClipContextMenu}
              onDragCheckpoint={onDragCheckpoint}
              onTrackRemove={onTrackRemove}
              waveformData={waveformData}
              onWaveformUpdate={onWaveformUpdate}
              isPlaying={isPlaying}
              currentTime={currentTime}
              clipDurations={clipDurations}
              onTrackMute={onTrackMute}
              onTrackSolo={onTrackSolo}
              onTrackVolume={onTrackVolume}
              onTrackReorder={onTrackReorder}
              autoCrossfade={autoCrossfade}
              tr={tr}
              onRenameTrack={onRenameTrack}
              onUpdateClipDuration={onUpdateClipDuration}
            />
          ))}
        </div>

        {/* Contrôles de zoom */}
        <div style={{
          position: 'sticky',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          zIndex: 20,
          marginTop: 8,
          width: 'fit-content'
        }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => onZoomChange?.(Math.max(0.05, zoomLevel - 0.1))}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title={tr('editorZoomOut') || 'Zoom arrière (Ctrl+-)'}
          >
            <i className="ti ti-zoom-out" />
          </button>
          
          <span style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            minWidth: 50,
            textAlign: 'center'
          }}>
            {tr('editorZoomPercent')?.replace('{percent}', Math.round(zoomLevel * 100)) || `${Math.round(zoomLevel * 100)}%`}
          </span>
          
          <button
            className="btn-ghost btn-sm"
            onClick={() => onZoomChange?.(Math.min(10, zoomLevel + 0.1))}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title={tr('editorZoomIn') || 'Zoom avant (Ctrl+=)'}
          >
            <i className="ti ti-zoom-in" />
          </button>
          
          <button
            className="btn-ghost btn-sm"
            onClick={() => onZoomChange?.(1)}
            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
            title={tr('editorZoomReset') || 'Réinitialiser le zoom (Ctrl+0)'}
          >
            <i className="ti ti-refresh" /> 100%
          </button>

          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              const containerWidth = containerRef.current?.clientWidth - TRACK_HEAD_WIDTH || 800
              const neededZoom = Math.max(0.05, Math.min(5, containerWidth / (totalDuration * BASE_PIXELS_PER_SECOND + 100)))
              onZoomChange?.(neededZoom)
            }}
            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
            title={tr('editorZoomFit') || 'Ajuster pour tout voir'}
          >
            <i className="ti ti-fit" /> {tr('editorZoomFit') || 'Ajuster'}
          </button>

          <span style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginLeft: 4,
            borderLeft: '1px solid var(--border)',
            paddingLeft: 8,
            minWidth: 60
          }}>
            {tr('editorDuration') || 'Durée'}: {formatTime(totalDuration)}
          </span>
        </div>

        {/* Feedback visuel du snap */}
        {snapFeedback?.visible && (
          <div style={{
            position: 'absolute',
            top: 46,
            left: TRACK_HEAD_WIDTH + snapFeedback.time * pixelsPerSecond,
            width: 2,
            height: 'calc(100% - 46px)',
            background: 'var(--accent)',
            opacity: 0.3,
            pointerEvents: 'none',
            zIndex: 3,
            transition: 'opacity 0.3s ease'
          }} />
        )}
      </div>
    </div>
  )
}