import { useState, useEffect } from 'react'
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
  onTrackRemove,
  waveformData,
  isPlaying,
  currentTime,
  clipDurations,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  lang,
  tr
}) {
  const [isMuted, setIsMuted] = useState(track.muted || false)
  const [isSolo, setIsSolo] = useState(track.solo || false)
  const [volume, setVolume] = useState(track.volume != null ? Math.round(track.volume * 100) : 100)
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOverTrack, setIsDragOverTrack] = useState(false)

  const trackHeight = 80
  const trackColor = `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 40%)`

  // Synchroniser l'état interne avec le track
  useEffect(() => {
    setIsMuted(track.muted || false)
  }, [track.muted])

  useEffect(() => {
    setIsSolo(track.solo || false)
  }, [track.solo])

  useEffect(() => {
    setVolume(track.volume != null ? Math.round(track.volume * 100) : 100)
  }, [track.volume])

  const handleTrackClick = (e) => {
    e.stopPropagation()
  }

  // ✅ Gestion du mute - CORRIGÉE
  const handleMuteToggle = (e) => {
    e.stopPropagation()
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (onTrackMute) {
      onTrackMute(track.id, newMuted)
    }
  }

  // ✅ Gestion du solo - CORRIGÉE (ne mute plus une propriété locale sans effet)
  const handleSoloToggle = (e) => {
    e.stopPropagation()
    const newSolo = !isSolo
    setIsSolo(newSolo)
    if (onTrackSolo) {
      onTrackSolo(track.id, newSolo)
    }
  }

  // ✅ Fader de volume vertical
  const handleVolumeChange = (e) => {
    e.stopPropagation()
    const newVolume = parseInt(e.target.value, 10)
    setVolume(newVolume)
    if (onTrackVolume) {
      onTrackVolume(track.id, newVolume / 100)
    }
  }

  // ✅ Réorganisation des pistes par glisser-déposer (poignée dédiée)
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
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({
      clipId,
      trackId: track.id,
      startX: e.clientX
    }))
  }

  const handleDrop = (e) => {
    setIsDragging(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const newStart = Math.max(0, x / pixelsPerSecond)

      if (data.clipId && data.trackId) {
        const clip = track.clips.find(c => c.id === data.clipId)
        if (clip) {
          onClipMove(data.trackId, data.clipId, newStart)
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
        draggable
        onDragStart={handleTrackDragStart}
        onDragOver={handleTrackDragOver}
        onDragLeave={handleTrackDragLeave}
        onDrop={handleTrackDrop}
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
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-tertiary)',
          cursor: 'grab',
          flexShrink: 0
        }} title={tr('editorReorderTrack')}>
          <i className="ti ti-grip-vertical" style={{ fontSize: 14 }} />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          flexShrink: 0
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
            {volume}
          </span>
          <input
            type="range"
            min={0}
            max={150}
            value={volume}
            onChange={handleVolumeChange}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            title={tr('editorTrackVolume')}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              width: 4,
              height: 42,
              accentColor: 'var(--text-tertiary)'
            }}
          />
          <i className="ti ti-volume" style={{ fontSize: 11, color: 'var(--text-tertiary)' }} />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 4,
              height: 16,
              borderRadius: 2,
              background: trackColor,
              flexShrink: 0
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {track.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn-sm ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
              onClick={handleMuteToggle}
              style={{
                padding: '2px 6px',
                fontSize: 10,
                minHeight: 20,
                borderRadius: 'var(--radius-sm)',
                border: isMuted ? '1px solid var(--danger)' : '1px solid var(--border)',
                background: isMuted ? 'rgba(224,82,82,0.2)' : 'var(--bg-tertiary)',
                color: isMuted ? 'var(--danger)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title={isMuted ? tr('editorUnmute') : tr('editorMute')}
            >
              <i className={`ti ${isMuted ? 'ti-volume-off' : 'ti-volume'}`} />
            </button>

            <button
              className={`btn-sm ${isSolo ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleSoloToggle}
              style={{
                padding: '2px 6px',
                fontSize: 10,
                minHeight: 20,
                borderRadius: 'var(--radius-sm)',
                border: isSolo ? '1px solid var(--success)' : '1px solid var(--border)',
                background: isSolo ? 'rgba(29,158,117,0.2)' : 'var(--bg-tertiary)',
                color: isSolo ? 'var(--success)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title={isSolo ? tr('editorUnsolo') : tr('editorSolo')}
            >
              <i className="ti ti-headphones" />
            </button>

            <button
              className="btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                onTrackRemove(track.id)
              }}
              style={{
                padding: '2px 4px',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.background = 'transparent'
            }}
              title={tr('editorRemoveTrack')}
            >
              <i className="ti ti-x" />
            </button>
          </div>
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
                clipDuration={clipDuration}
                onSelect={() => onClipSelect(clip.id, track.id)}
                onMove={(newStart) => onClipMove(track.id, clip.id, newStart)}
                onUpdate={(updates) => onClipUpdate(track.id, clip.id, updates)}
                onRemove={() => onClipRemove(track.id, clip.id)}
                onDuplicate={() => onClipDuplicate(track.id, clip.id)}
                onDragStart={(e) => handleClipDragStart(e, clip.id)}
                onFadeInChange={(duration) => onClipFade?.(track.id, clip.id, 'in', duration)}
                onFadeOutChange={(duration) => onClipFade?.(track.id, clip.id, 'out', duration)}
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