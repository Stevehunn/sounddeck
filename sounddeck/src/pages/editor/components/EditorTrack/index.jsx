// src/pages/editor/components/EditorTrack/index.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import EditorClip from '../EditorClip'

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
  onClipContextMenu,
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
  autoCrossfade,
  tr,
  onRenameTrack,
  onUpdateClipDuration // ✅ Nouvelle prop
}) {
  const [isMuted, setIsMuted] = useState(track.muted || false)
  const [isSolo, setIsSolo] = useState(track.solo || false)
  const [volume, setVolume] = useState(track.volume != null ? Math.round(track.volume * 100) : 100)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(track.name || '')
  const renameInputRef = useRef(null)

  const trackHeight = 80
  const trackColor = track.color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 40%)`

  useEffect(() => {
    setIsMuted(track.muted || false)
  }, [track.muted])

  useEffect(() => {
    setIsSolo(track.solo || false)
  }, [track.solo])

  useEffect(() => {
    setVolume(track.volume != null ? Math.round(track.volume * 100) : 100)
  }, [track.volume])

  // ─── RENOMMAGE ──────────────────────────────────────────────────────────────
  const handleRenameStart = (e) => {
    e.stopPropagation()
    setRenameValue(track.name || '')
    setIsRenaming(true)
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus()
        renameInputRef.current.select()
      }
    }, 50)
  }

  const handleRenameConfirm = () => {
    if (renameValue.trim() && renameValue.trim() !== track.name) {
      onRenameTrack?.(track.id, renameValue.trim())
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameConfirm()
    if (e.key === 'Escape') {
      setIsRenaming(false)
      setRenameValue(track.name || '')
    }
  }

  // ─── HANDLERS ──────────────────────────────────────────────────────────────
  const handleMuteToggle = (e) => {
    e.stopPropagation()
    const newMuted = !isMuted
    setIsMuted(newMuted)
    onTrackMute?.(track.id, newMuted)
  }

  const handleSoloToggle = (e) => {
    e.stopPropagation()
    const newSolo = !isSolo
    setIsSolo(newSolo)
    onTrackSolo?.(track.id, newSolo)
  }

  const handleVolumeChange = (e) => {
    e.stopPropagation()
    const displayValue = parseFloat(e.target.value)
    const normalizedValue = displayValue / 100
    setVolume(displayValue)
    onTrackVolume?.(track.id, normalizedValue)
  }

  // ─── DRAG & DROP ──────────────────────────────────────────────────────────
  const handleTrackDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-sounddeck-track-index', String(trackIndex))
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
          zIndex: 2,
          pointerEvents: 'auto'
        }}
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
          width: 4,
          height: '100%',
          background: trackColor,
          borderRadius: 2,
          flexShrink: 0,
          marginRight: 4
        }} />

        {/* Nom de la piste */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          justifyContent: 'center'
        }}>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={handleRenameKeyDown}
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                color: 'var(--text-primary)',
                width: '100%',
                minHeight: 24
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
            onDoubleClick={handleRenameStart}
            >
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {track.name}
              </span>
              <button
                onClick={handleRenameStart}
                style={{
                  padding: '1px 4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 12,
                  opacity: 0.6,
                  transition: 'all 0.15s'
                }}
                title={tr('editorRenameTrack') || 'Renommer la piste'}
              >
                <i className="ti ti-pencil" style={{ fontSize: 11 }} />
              </button>
            </div>
          )}
          <div style={{
            fontSize: 8,
            color: 'var(--text-tertiary)',
            opacity: 0.6
          }}>
            {track.clips.length} {tr('editorClips') || 'clips'}
          </div>
        </div>

        {/* Boutons d'action */}
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
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isMuted ? tr('editorUnmute') || 'Réactiver le son' : tr('editorMute') || 'Couper le son'}
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
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSolo ? tr('editorUnsolo') || 'Désactiver solo' : tr('editorSolo') || 'Solo (isoler la piste)'}
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
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={tr('editorRemoveTrack') || 'Supprimer la piste'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)'
              e.currentTarget.style.borderColor = 'var(--danger)'
              e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 10 }} />
          </button>
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
        {sortedClips.map((clip) => {
          const clipDuration = clipDurations?.[clip.id] || clip.duration || 3
          return (
            <EditorClip
              key={clip.id}
              clip={clip}
              totalDuration={totalDuration}
              pixelsPerSecond={pixelsPerSecond}
              trackHeight={trackHeight - 8}
              isSelected={selectedClipId === clip.id}
              isPlaying={isPlaying && selectedClipId === clip.id}
              waveformData={waveformData[clip.id] || null}
              onWaveformUpdate={onWaveformUpdate}
              clipDuration={clipDuration}
              onSelect={() => onClipSelect(clip.id, track.id)}
              onMove={(newStart) => onClipMove(track.id, clip.id, newStart)}
              onUpdate={(updates) => onClipUpdate(track.id, clip.id, updates)}
              onRemove={() => onClipRemove(track.id, clip.id)}
              onDuplicate={() => onClipDuplicate(track.id, clip.id)}
              onCopy={() => onClipCopy?.(clip.id, track.id)}
              onCut={() => onClipCut?.(clip.id, track.id)}
              onContextMenu={(clipId, _, e) => onClipContextMenu?.(clipId, track.id, e)}
              onFadeInChange={(duration) => onClipFade?.(track.id, clip.id, 'in', duration)}
              onFadeOutChange={(duration) => onClipFade?.(track.id, clip.id, 'out', duration)}
              onDragCheckpoint={onDragCheckpoint}
              onDurationUpdate={onUpdateClipDuration} // ✅ Transmettre la prop
              tr={tr}
            />
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