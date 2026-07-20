import { useState, useEffect, useCallback, useRef } from 'react'
import EditorClip from './EditorClip'

export default function EditorTrack({
  track,
  trackIndex,
  totalDuration,
  pixelsPerSecond,
  selectedClipId,
  selectedTrackId,
  onClipSelect,
  onClipMove,
  onClipUpdate,
  onClipRemove,
  onClipDuplicate,
  onClipFade,
  onClipCopy,
  onClipCut,
  onDragCheckpoint,
  onTrackRemove,
  waveformData,
  onWaveformUpdate,
  isPlaying,
  currentTime,
  clipDurations,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  autoPlayOnClick = false,
  autoCrossfade = false,
  lang,
  tr
}) {
  const [isMuted, setIsMuted] = useState(track.muted || false)
  const [isSolo, setIsSolo] = useState(track.solo || false)
  const [volume, setVolume] = useState(track.volume != null ? Math.round(track.volume * 100) : 100)
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOverTrack, setIsDragOverTrack] = useState(false)
  const [isDraggingClip, setIsDraggingClip] = useState(false)
  
  // ✅ REFS POUR ÉVITER LES BOUCLES
  const isCrossfadingRef = useRef(false)
  const lastOverlapsRef = useRef('')
  const updateTimeoutRef = useRef(null)

  const trackHeight = 80
  const trackColor = `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 40%)`

  useEffect(() => {
    setIsMuted(track.muted || false)
  }, [track.muted])

  useEffect(() => {
    setIsSolo(track.solo || false)
  }, [track.solo])

  useEffect(() => {
    setVolume(track.volume != null ? Math.round(track.volume * 100) : 100)
  }, [track.volume])

  // ─── CROSSFADE AUTOMATIQUE ──────────────────────────────────────────────
  const checkOverlaps = useCallback(() => {
    if (!autoCrossfade || isCrossfadingRef.current) return
    if (isDraggingClip || isDragging) return

    const sortedClips = [...track.clips].sort((a, b) => a.start - b.start)
    
    let hasOverlap = false
    let overlapData = []
    
    for (let i = 0; i < sortedClips.length - 1; i++) {
      const current = sortedClips[i]
      const next = sortedClips[i + 1]
      const currentEnd = current.start + (clipDurations[current.id] || current.duration || 3)
      
      if (currentEnd > next.start) {
        const overlap = Math.min(currentEnd - next.start, 0.1)
        if (overlap > 0.01) {
          hasOverlap = true
          overlapData.push({ current: current.id, next: next.id, overlap })
        }
      }
    }

    if (!hasOverlap) return

    const overlapsKey = overlapData.map(d => `${d.current}-${d.next}-${d.overlap.toFixed(3)}`).join('|')
    if (lastOverlapsRef.current === overlapsKey) return
    lastOverlapsRef.current = overlapsKey

    isCrossfadingRef.current = true

    try {
      for (const data of overlapData) {
        const currentClip = track.clips.find(c => c.id === data.current)
        const nextClip = track.clips.find(c => c.id === data.next)
        
        if (!currentClip || !nextClip) continue

        const hasFadeOut = currentClip.effects?.some(e => e.type === 'fadeOut' && e.enabled)
        const hasFadeIn = nextClip.effects?.some(e => e.type === 'fadeIn' && e.enabled)

        if (!hasFadeOut && onClipFade) {
          onClipFade(track.id, currentClip.id, 'out', data.overlap)
        }
        if (!hasFadeIn && onClipFade) {
          onClipFade(track.id, nextClip.id, 'in', data.overlap)
        }
      }
    } catch (e) {
      console.warn('Erreur crossfade:', e)
    } finally {
      setTimeout(() => {
        isCrossfadingRef.current = false
      }, 100)
    }
  }, [track.clips, track.id, clipDurations, autoCrossfade, onClipFade, isDraggingClip, isDragging])

  const debouncedCheckOverlaps = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    updateTimeoutRef.current = setTimeout(() => {
      checkOverlaps()
      updateTimeoutRef.current = null
    }, 50)
  }, [checkOverlaps])

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleClipUpdate = useCallback((clipId, updates) => {
    if (onClipUpdate) {
      onClipUpdate(track.id, clipId, updates)
    }
    if (!isDraggingClip) {
      debouncedCheckOverlaps()
    }
  }, [onClipUpdate, track.id, isDraggingClip, debouncedCheckOverlaps])

  const handleClipMove = useCallback((clipId, newStart) => {
    if (onClipMove) {
      onClipMove(track.id, clipId, newStart)
    }
    if (!isDraggingClip) {
      debouncedCheckOverlaps()
    }
  }, [onClipMove, track.id, isDraggingClip, debouncedCheckOverlaps])
  
  const handleTrackClick = (e) => {
    e.stopPropagation()
  }

  // ✅ MUTE - Couper le son de la piste
  const handleMuteToggle = (e) => {
    e.stopPropagation()
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (onTrackMute) {
      onTrackMute(track.id, newMuted)
    }
  }

  // ✅ SOLO - Isoler la piste
  const handleSoloToggle = (e) => {
    e.stopPropagation()
    const newSolo = !isSolo
    setIsSolo(newSolo)
    if (onTrackSolo) {
      onTrackSolo(track.id, newSolo)
    }
  }

  // ✅ VOLUME - CORRIGÉ (0 à 100)
  const handleVolumeChange = (e) => {
    e.stopPropagation()
    const displayValue = parseFloat(e.target.value) // 0-100
    const normalizedValue = displayValue / 100 // 0-1
    
    setVolume(displayValue)
    if (onTrackVolume) {
      onTrackVolume(track.id, normalizedValue)
    }
  }

  // ─── DRAG & DROP ──────────────────────────────────────────────────────────
  
  const handleTrackDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-sounddeck-track-index', String(trackIndex))
  }

  const handleTrackDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-sounddeck-track-index')) {
      e.preventDefault()
      setIsDragOverTrack(true)
    }
  }

  const handleTrackDragLeave = () => {
    setIsDragOverTrack(false)
  }

  const handleTrackDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-sounddeck-track-index')
    setIsDragOverTrack(false)
    if (raw === '') return
    const fromIndex = parseInt(raw, 10)
    if (!isNaN(fromIndex) && fromIndex !== trackIndex && onTrackReorder) {
      e.stopPropagation()
      onTrackReorder(fromIndex, trackIndex)
    }
  }

  const handleClipDragStart = (e, clipId) => {
    setIsDraggingClip(true)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({
      clipId,
      trackId: track.id,
      startX: e.clientX
    }))
  }

  const handleDrop = (e) => {
    setIsDraggingClip(false)
    setIsDragging(false)
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const newStart = Math.max(0, x / pixelsPerSecond)

      if (data.clipId && data.trackId) {
        const clip = track.clips.find(c => c.id === data.clipId)
        if (clip) {
          handleClipMove(data.clipId, newStart)
          setTimeout(() => {
            checkOverlaps()
          }, 100)
        }
      }
    } catch (err) {
      console.warn('Drop error:', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const sortedClips = [...track.clips].sort((a, b) => a.start - b.start)

  return (
    <div
      style={{
        position: 'relative',
        height: trackHeight + 8,
        marginBottom: 4,
        borderBottom: '1px solid var(--border)',
        background: selectedTrackId === track.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        transition: 'background 0.15s',
        opacity: isMuted ? 0.4 : 1
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleTrackClick}
    >
      {/* En-tête de piste */}
      <div
        style={{
          position: 'absolute',
          left: -190,
          top: 0,
          width: 180,
          height: '100%',
          padding: '4px 6px',
          display: 'flex',
          gap: 6,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          outline: isDragOverTrack ? '2px solid var(--accent)' : 'none',
          outlineOffset: -2,
          zIndex: 2,
          pointerEvents: 'auto'
        }}
        onDragOver={handleTrackDragOver}
        onDragLeave={handleTrackDragLeave}
        onDrop={handleTrackDrop}
      >
        {/* Poignée de drag */}
        <div
          draggable
          onDragStart={handleTrackDragStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            flexShrink: 0,
            padding: '0 2px',
            writingMode: 'vertical-lr',
            userSelect: 'none'
          }}
          title={tr('editorReorderTrack')}
        >
          <i className="ti ti-grip-vertical" style={{ fontSize: 14 }} />
        </div>

        {/* Barre de couleur */}
        <div style={{
          width: 3,
          height: '100%',
          background: trackColor,
          borderRadius: 2,
          flexShrink: 0,
          marginRight: 4
        }} />

        {/* Volume slider - CORRIGÉ (0 à 100) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          minWidth: 50
        }}>
          <i className="ti ti-volume" style={{ fontSize: 11, color: 'var(--text-tertiary)' }} />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            title={tr('editorTrackVolume')}
            style={{
              flex: 1,
              accentColor: 'var(--text-tertiary)',
              height: 4,
              minWidth: 30,
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace', minWidth: 24 }}>
            {volume}%
          </span>
        </div>

        {/* Boutons d'action */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flexShrink: 0,
          alignItems: 'center'
        }}>
          {/* ✅ Bouton Mute (Couper le son) */}
          <button
            className={`btn-sm ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleMuteToggle}
            style={{
              padding: '1px 4px',
              fontSize: 8,
              minHeight: 16,
              borderRadius: 'var(--radius-sm)',
              border: isMuted ? '1px solid var(--danger)' : '1px solid var(--border)',
              background: isMuted ? 'rgba(224,82,82,0.2)' : 'var(--bg-tertiary)',
              color: isMuted ? 'var(--danger)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isMuted ? tr('editorUnmute') || 'Réactiver le son' : tr('editorMute') || 'Couper le son'}
          >
            <i className={`ti ${isMuted ? 'ti-volume-off' : 'ti-volume'}`} style={{ fontSize: 10 }} />
          </button>

          {/* ✅ Bouton Solo (Isoler la piste) */}
          <button
            className={`btn-sm ${isSolo ? 'btn-success' : 'btn-secondary'}`}
            onClick={handleSoloToggle}
            style={{
              padding: '1px 4px',
              fontSize: 8,
              minHeight: 16,
              borderRadius: 'var(--radius-sm)',
              border: isSolo ? '1px solid var(--success)' : '1px solid var(--border)',
              background: isSolo ? 'rgba(29,158,117,0.2)' : 'var(--bg-tertiary)',
              color: isSolo ? 'var(--success)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSolo ? tr('editorUnsolo') || 'Désactiver solo' : tr('editorSolo') || 'Solo (isoler la piste)'}
          >
            <i className="ti ti-headphones" style={{ fontSize: 10 }} />
          </button>

          {/* ✅ Bouton Supprimer la piste (icône poubelle) */}
          <button
            className="btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              onTrackRemove(track.id)
            }}
            style={{
              padding: '1px 4px',
              fontSize: 8,
              color: 'var(--text-tertiary)',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.15s',
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)'
              e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.background = 'transparent'
            }}
            title={tr('editorRemoveTrack') || 'Supprimer la piste'}
          >
            <i className="ti ti-trash" style={{ fontSize: 10 }} />
          </button>

          {/* Nom de la piste */}
          <span style={{
            fontSize: 6,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 40,
            marginTop: 1
          }}>
            {track.name}
          </span>
        </div>
      </div>

      {/* Clips */}
      <div 
        style={{ 
          position: 'relative', 
          height: '100%', 
          padding: '4px 0',
          pointerEvents: 'auto'
        }}
        className="editor-track-clips"
      >
        {sortedClips.map((clip, index) => {
          const clipDuration = clipDurations?.[clip.id] || clip.duration || 3
          return (
            <div
              key={clip.id}
              className="editor-clip-wrapper"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              <EditorClip
                clip={clip}
                index={index}
                totalDuration={totalDuration}
                pixelsPerSecond={pixelsPerSecond}
                trackHeight={trackHeight - 8}
                isSelected={selectedClipId === clip.id}
                isPlaying={isPlaying && selectedClipId === clip.id}
                waveformData={waveformData[clip.id] || null}
                onWaveformUpdate={onWaveformUpdate}
                clipDuration={clipDuration}
                onSelect={() => onClipSelect(clip.id, track.id)}
                onMove={(newStart) => handleClipMove(clip.id, newStart)}
                onUpdate={(updates) => handleClipUpdate(clip.id, updates)}
                onRemove={() => onClipRemove(track.id, clip.id)}
                onDuplicate={() => onClipDuplicate(track.id, clip.id)}
                onCopy={() => onClipCopy?.(clip.id, track.id)}
                onCut={() => onClipCut?.(clip.id, track.id)}
                onDragStart={(e) => handleClipDragStart(e, clip.id)}
                onFadeInChange={(duration) => onClipFade?.(track.id, clip.id, 'in', duration)}
                onFadeOutChange={(duration) => onClipFade?.(track.id, clip.id, 'out', duration)}
                onDragCheckpoint={onDragCheckpoint}
                autoPlayOnClick={autoPlayOnClick}
                tr={tr}
              />
            </div>
          )
        })}
      </div>

      {/* Indicateur de nombre de clips */}
      {track.clips.length > 0 && (
        <div style={{
          position: 'absolute',
          right: 4,
          bottom: 2,
          fontSize: 8,
          color: 'var(--text-tertiary)',
          opacity: 0.4,
          pointerEvents: 'none'
        }}>
          {track.clips.length} clip{track.clips.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}