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
  onClipCopy,
  onClipCut,
  onDragCheckpoint,
  onTrackRemove,
  waveformData,
  isPlaying,
  currentTime,
  clipDurations,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  autoPlayOnClick = false,
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

  const handleMuteToggle = (e) => {
    e.stopPropagation()
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (onTrackMute) {
      onTrackMute(track.id, newMuted)
    }
  }

  const handleSoloToggle = (e) => {
    e.stopPropagation()
    const newSolo = !isSolo
    setIsSolo(newSolo)
    if (onTrackSolo) {
      onTrackSolo(track.id, newSolo)
    }
  }

  const handleVolumeChange = (e) => {
    e.stopPropagation()
    const newVolume = parseInt(e.target.value, 10)
    setVolume(newVolume)
    if (onTrackVolume) {
      onTrackVolume(track.id, newVolume / 100)
    }
  }

  // ✅ Drag & drop UNIQUEMENT vertical - la poignée est séparée
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
      {/* En-tête de piste - Version refactorisée */}
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
        {/* ✅ Poignée de drag UNIQUEMENT verticale */}
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

        {/* ✅ Barre de couleur verticale */}
        <div style={{
          width: 3,
          height: '100%',
          background: trackColor,
          borderRadius: 2,
          flexShrink: 0,
          marginRight: 4
        }} />

        {/* ✅ Volume horizontal - beaucoup plus facile à utiliser */}
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
            max={150}
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
            {volume}
          </span>
        </div>

        {/* Boutons Mute/Solo/Supprimer + Nom */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flexShrink: 0,
          alignItems: 'center'
        }}>
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
            title={isMuted ? tr('editorUnmute') : tr('editorMute')}
          >
            <i className={`ti ${isMuted ? 'ti-volume-off' : 'ti-volume'}`} style={{ fontSize: 10 }} />
          </button>

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
            title={isSolo ? tr('editorUnsolo') : tr('editorSolo')}
          >
            <i className="ti ti-headphones" style={{ fontSize: 10 }} />
          </button>

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
              justifyContent: 'center'
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
            <i className="ti ti-x" style={{ fontSize: 10 }} />
          </button>

          {/* Nom de la piste en bas */}
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
                clipDuration={clipDuration}
                onSelect={() => onClipSelect(clip.id, track.id)}
                onMove={(newStart) => onClipMove(track.id, clip.id, newStart)}
                onUpdate={(updates) => onClipUpdate(track.id, clip.id, updates)}
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