import { useState, useRef, useEffect } from 'react'
import EditorTrack from './EditorTrack'

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
  onTrackRemove,
  waveformData,
  currentTime,
  isPlaying,
  clipDurations,
  onSeek,
  onTrackMute,
  lang,
  tr
}) {
  const containerRef = useRef(null)
  const rulerRef = useRef(null)
  const timelineRef = useRef(null)

  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const BASE_PIXELS_PER_SECOND = 80
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  // Gestion du zoom avec la molette
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        setZoomLevel(newZoom)
        
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

  // Gestion du pan
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

  // ✅ Cliquer sur la timeline pour chercher (seek) - CORRIGÉ avec clientX
  const handleTimelineClick = (e) => {
    if (isPanning) return
    if (e.target.closest('.editor-clip-wrapper')) return
    if (e.target.closest('button')) return

    const container = containerRef.current
    const timeline = timelineRef.current
    if (!container || !timeline) return

    // ✅ Utiliser clientX pour avoir la position absolue
    const clientX = e.clientX
    
    // ✅ Récupérer la position de la timeline
    const timelineRect = timeline.getBoundingClientRect()
    
    // ✅ Position du clic par rapport à la timeline (en pixels)
    const clickX = clientX - timelineRect.left
    
    // ✅ Scroll actuel
    const currentScroll = container.scrollLeft
    
    // ✅ La zone des pistes commence à 150px (marge de gauche)
    const offsetX = 150
    
    // ✅ Position du clic dans la zone de la timeline (après la marge)
    const clickInTimeline = clickX - offsetX
    
    // ✅ Position absolue dans la timeline (en pixels) = clic + scroll
    const absoluteX = clickInTimeline + currentScroll
    
    // ✅ Convertir en secondes
    const maxPixels = totalDuration * pixelsPerSecond
    const clampedX = Math.max(0, Math.min(maxPixels, absoluteX))
    const seekTime = clampedX / pixelsPerSecond

    console.log('📍 Seek avec clientX:', {
      clientX,
      timelineRectLeft: timelineRect.left,
      clickX,
      currentScroll,
      offsetX,
      clickInTimeline,
      absoluteX: clampedX,
      maxPixels,
      pixelsPerSecond,
      seekTime,
      totalDuration,
      zoomLevel
    })

    if (onSeek) {
      onSeek(seekTime)
    }
  }

  // Raccourcis clavier pour le zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        setZoomLevel(prev => Math.min(10, prev + 0.1))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoomLevel(prev => Math.max(0.05, prev - 0.1))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoomLevel(1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Nettoyer les événements de pan
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
    const position = Math.min((currentTime / totalDuration) * totalWidth, totalWidth)
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
        {/* Règle */}
        <div 
          ref={rulerRef} 
          style={{
            position: 'sticky',
            top: 0,
            height: 40,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            zIndex: 5,
            marginLeft: 150,
            cursor: 'pointer'
          }}
        >
          {renderRuler()}
          {renderPlayhead()}
        </div>

        {/* Zone des pistes */}
        <div style={{ marginLeft: 150 }}>
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
              onClipMove={onClipMove}
              onClipUpdate={onClipUpdate}
              onClipRemove={onClipRemove}
              onClipDuplicate={onClipDuplicate}
              onTrackRemove={onTrackRemove}
              waveformData={waveformData}
              isPlaying={isPlaying}
              currentTime={currentTime}
              clipDurations={clipDurations}
              onTrackMute={onTrackMute}
              lang={lang}
              tr={tr}
            />
          ))}
        </div>

        {/* Barre de contrôle du zoom */}
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
            onClick={() => setZoomLevel(prev => Math.max(0.05, prev - 0.1))}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title="Zoom arrière (Ctrl+-)"
          >
            <i className="ti ti-minus" />
          </button>
          <span style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            minWidth: 50,
            textAlign: 'center'
          }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.1))}
            style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
            title="Zoom avant (Ctrl+=)"
          >
            <i className="ti ti-plus" />
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setZoomLevel(1)}
            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
            title="Réinitialiser le zoom (Ctrl+0)"
          >
            <i className="ti ti-refresh" />
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

        {/* Info zoom avec raccourcis */}
        <div style={{
          position: 'sticky',
          bottom: 8,
          left: 8,
          fontSize: 9,
          color: 'var(--text-tertiary)',
          opacity: 0.4,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap'
        }}>
          <span><i className="ti ti-zoom-in" style={{ marginRight: 4, fontSize: 10 }} />Ctrl+Molette</span>
          <span><kbd style={{ fontSize: 8, padding: '0 4px', background: 'var(--bg-tertiary)' }}>Ctrl+=</kbd> Zoom</span>
          <span><kbd style={{ fontSize: 8, padding: '0 4px', background: 'var(--bg-tertiary)' }}>Ctrl+-</kbd> Dézoom</span>
          <span><kbd style={{ fontSize: 8, padding: '0 4px', background: 'var(--bg-tertiary)' }}>Ctrl+0</kbd> Réinitialiser</span>
        </div>
      </div>
    </div>
  )
}