import { useState, useRef, useEffect } from 'react'
import EditorTrack from './EditorTrack'
import EditorMarkers from './EditorMarkers'
import EditorMetronome from './EditorMetronome'
import { snapTime, getSnapStep } from './EditorSnap'

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
  onClipPaste,
  onDragCheckpoint,
  onTrackRemove,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  onMarkersChange,
  waveformData,
  onWaveformUpdate,
  currentTime,
  isPlaying,
  clipDurations,
  onSeek,
  snapEnabled,
  loopRegion,
  onSetLoopRegion,
  markers = [],
  onAddMarker,
  onRemoveMarker,
  metronomeEnabled = false,
  metronomeBpm = 120,
  onMetronomeToggle,
  onMetronomeBpmChange,
  autoPlayOnClick = false,
  lang,
  tr
}) {
  const containerRef = useRef(null)
  const rulerRef = useRef(null)
  const timelineRef = useRef(null)

  const [zoomLevel, setZoomLevel] = useState(1)
  const [globalZoom, setGlobalZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [loopDrag, setLoopDrag] = useState(null)
  const [dropTargetTrackId, setDropTargetTrackId] = useState(null)
  const [snapFeedback, setSnapFeedback] = useState(null)

  const TRACK_HEAD_WIDTH = 190
  const BASE_PIXELS_PER_SECOND = 80
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  const clientXToTime = (clientX) => {
    const timeline = timelineRef.current
    if (!timeline) return 0
    const timelineRect = timeline.getBoundingClientRect()
    const clickInTimeline = (clientX - timelineRect.left) - TRACK_HEAD_WIDTH
    const maxPixels = totalDuration * pixelsPerSecond
    const clampedX = Math.max(0, Math.min(maxPixels, clickInTimeline))
    return clampedX / pixelsPerSecond
  }

  const snapTimeForClip = (time, trackId, clipId) => {
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
    const snapped = snapTimeForClip(Math.max(0, newStart), trackId, clipId)
    onClipMove(trackId, clipId, snapped, newTrackId)
  }

  // Zoom avec la molette
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        setZoomLevel(newZoom)
        setGlobalZoom(newZoom)
        
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const centerX = rect.width / 2
          const currentScroll = containerRef.current.scrollLeft
          const newScroll = currentScroll + (centerX * delta * 0.5)
          containerRef.current.scrollLeft = Math.max(0, newScroll)
        }
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [zoomLevel])

  // Pan
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

  // Timeline click
  const handleTimelineClick = (e) => {
    if (isPanning) return
    if (e.target.closest('.editor-clip-wrapper')) return
    if (e.target.closest('button')) return
    if (e.target.closest('.loop-strip')) return
    if (e.target.closest('.marker-area')) return

    const seekTime = clientXToTime(e.clientX)
    if (onSeek) {
      onSeek(seekTime)
    }
  }

  // Loop
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
      onSetLoopRegion?.(Math.min(loopDrag.anchor, time), Math.max(loopDrag.anchor, time))
    }
    const handleUp = () => setLoopDrag(null)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [loopDrag])

  // Raccourcis zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        setZoomLevel(prev => Math.min(10, prev + 0.1))
        setGlobalZoom(prev => Math.min(10, prev + 0.1))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoomLevel(prev => Math.max(0.05, prev - 0.1))
        setGlobalZoom(prev => Math.max(0.05, prev - 0.1))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoomLevel(1)
        setGlobalZoom(1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Drag & drop inter-pistes
  const handleTrackDragOver = (e, trackId) => {
    e.preventDefault()
    setDropTargetTrackId(trackId)
  }

  const handleTrackDragLeave = () => {
    setDropTargetTrackId(null)
  }

  const handleTrackDrop = (e, trackId) => {
    e.preventDefault()
    setDropTargetTrackId(null)
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.clipId && data.trackId && data.trackId !== trackId) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const newStart = Math.max(0, x / pixelsPerSecond)
        handleClipMoveWithSnap(data.trackId, data.clipId, newStart, trackId)
        onClipSelect(data.clipId, trackId)
      }
    } catch (err) {
      console.warn('Drop error:', err)
    }
  }

  // Rendu de la règle
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

  // Curseur de lecture
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

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

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
        {/* Marqueurs */}
        <div style={{ position: 'relative', height: 40, marginLeft: TRACK_HEAD_WIDTH }} className="marker-area">
          <EditorMarkers
            markers={markers}
            currentTime={currentTime}
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            onAddMarker={onAddMarker}
            onRemoveMarker={onRemoveMarker}
            onSeek={onSeek}
            onMarkersChange={onMarkersChange}
            tr={tr}
            lang={lang}
          />
        </div>

        {/* Règle */}
        <div 
          ref={rulerRef} 
          style={{
            position: 'sticky',
            top: 40,
            height: 36,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            zIndex: 5,
            marginLeft: TRACK_HEAD_WIDTH,
            cursor: 'pointer'
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
            top: 76,
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
                top: 86,
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
                top: 86,
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
            <div
              key={track.id}
              onDragOver={(e) => handleTrackDragOver(e, track.id)}
              onDragLeave={handleTrackDragLeave}
              onDrop={(e) => handleTrackDrop(e, track.id)}
              style={{
                opacity: dropTargetTrackId === track.id ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              <EditorTrack
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
                autoPlayOnClick={autoPlayOnClick}
                lang={lang}
                tr={tr}
              />
            </div>
          ))}
        </div>

        {/* Barre de contrôle du zoom avec bouton Ajuster */}
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
            onClick={() => {
              const newZoom = Math.max(0.05, globalZoom - 0.1)
              setGlobalZoom(newZoom)
              setZoomLevel(newZoom)
            }}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title="Zoom arrière (Ctrl+-)"
          >
            <i className="ti ti-zoom-out" />
          </button>
          
          <span style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            minWidth: 50,
            textAlign: 'center'
          }}>
            {Math.round(globalZoom * 100)}%
          </span>
          
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              const newZoom = Math.min(10, globalZoom + 0.1)
              setGlobalZoom(newZoom)
              setZoomLevel(newZoom)
            }}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title="Zoom avant (Ctrl+=)"
          >
            <i className="ti ti-zoom-in" />
          </button>
          
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              setGlobalZoom(1)
              setZoomLevel(1)
            }}
            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
            title="Réinitialiser le zoom (Ctrl+0)"
          >
            <i className="ti ti-refresh" /> 100%
          </button>

          {/* ✅ Zoom automatique pour tout voir */}
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              const containerWidth = containerRef.current?.clientWidth - TRACK_HEAD_WIDTH || 800
              const neededZoom = Math.max(0.05, Math.min(5, containerWidth / (totalDuration * BASE_PIXELS_PER_SECOND + 100)))
              setGlobalZoom(neededZoom)
              setZoomLevel(neededZoom)
            }}
            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
            title="Ajuster pour tout voir"
          >
            <i className="ti ti-fit" /> Ajuster
          </button>

          <span style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginLeft: 4,
            borderLeft: '1px solid var(--border)',
            paddingLeft: 8,
            minWidth: 60
          }}>
            {formatTime(totalDuration)}
          </span>
        </div>

        {/* Métronome */}
        <div style={{
          position: 'sticky',
          bottom: 50,
          right: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 15,
          pointerEvents: 'none'
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <EditorMetronome
              bpm={metronomeBpm}
              onBpmChange={onMetronomeBpmChange}
              isPlaying={isPlaying}
              currentTime={currentTime}
              totalDuration={totalDuration}
              enabled={metronomeEnabled}
              onToggle={onMetronomeToggle}
              tr={tr}
            />
          </div>
        </div>

        {/* Feedback visuel du snap */}
        {snapFeedback?.visible && (
          <div style={{
            position: 'absolute',
            top: 86,
            left: TRACK_HEAD_WIDTH + snapFeedback.time * pixelsPerSecond,
            width: 2,
            height: 'calc(100% - 86px)',
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