import { useState, useRef, useEffect } from 'react'

export default function EditorToolbar({
  isPlaying,
  isPaused,
  currentTime,
  totalDuration,
  onPlay,
  onStop,
  onExport,
  onAddTrack,
  onAddClip,
  tracks,
  sounds,
  lang,
  tr,
  isLoading,
  isExporting,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  onSplit,
  canSplit,
  loopEnabled,
  onToggleLoop
}) {
  const [showAddClip, setShowAddClip] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedSoundId, setSelectedSoundId] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddClip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleAddClipAction = () => {
    let trackId = selectedTrackId
    if (!trackId && tracks.length > 0) {
      trackId = tracks[0].id
      setSelectedTrackId(trackId)
    }

    if (!trackId) {
      alert(tr('editorNoTracks'))
      return
    }

    if (!selectedSoundId) {
      alert(tr('editorSelectSound'))
      return
    }

    onAddClip(trackId, selectedSoundId)
    setShowAddClip(false)
    setSelectedSoundId('')
  }

  const handleSoundSelect = (e) => {
    const soundId = e.target.value
    setSelectedSoundId(soundId)
    if (soundId && selectedTrackId) {
      onAddClip(selectedTrackId, soundId)
      setShowAddClip(false)
      setSelectedSoundId('')
    }
  }

  const getButtonState = () => {
    if (isPlaying) return { icon: 'ti-player-pause', label: tr('editorPause'), color: 'var(--warning)' }
    if (isPaused) return { icon: 'ti-player-play', label: tr('editorResume'), color: 'var(--accent)' }
    if (currentTime > 0) return { icon: 'ti-player-play', label: tr('editorPlayFromStart'), color: 'var(--accent)' }
    return { icon: 'ti-player-play', label: tr('editorPlay'), color: 'var(--accent)' }
  }

  const buttonState = getButtonState()

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      flexShrink: 0,
      position: 'relative'
    }}>
      {/* Contrôles de lecture */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Bouton Play/Pause */}
        <button
          className="btn-primary btn-sm"
          onClick={onPlay}
          disabled={isLoading}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: buttonState.color,
            borderColor: buttonState.color
          }}
          title={buttonState.label}
        >
          <i className={`ti ${buttonState.icon}`} />
        </button>

        {/* Bouton Stop */}
        <button
          className="btn-secondary btn-sm"
          onClick={onStop}
          disabled={isLoading || (!isPlaying && !isPaused && currentTime === 0)}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={tr('editorStop')}
        >
          <i className="ti ti-player-stop-filled" />
        </button>

        {/* Undo / Redo */}
        <button
          className="btn-secondary btn-sm"
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canUndo ? 1 : 0.4
          }}
          title={tr('editorUndo')}
        >
          <i className="ti ti-arrow-back-up" />
        </button>
        <button
          className="btn-secondary btn-sm"
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canRedo ? 1 : 0.4
          }}
          title={tr('editorRedo')}
        >
          <i className="ti ti-arrow-forward-up" />
        </button>

        {/* Aimant (snap) */}
        <button
          className={snapEnabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleSnap}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={tr('editorSnap')}
        >
          <i className="ti ti-magnet" />
        </button>

        {/* Couper au curseur */}
        <button
          className="btn-secondary btn-sm"
          onClick={onSplit}
          disabled={!canSplit}
          style={{ fontSize: 12, opacity: canSplit ? 1 : 0.4 }}
          title={tr('editorSplitHint')}
        >
          <i className="ti ti-cut" /> {tr('editorSplit')}
        </button>

        {/* Boucle */}
        <button
          className={loopEnabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleLoop}
          style={{ fontSize: 12 }}
          title={tr('editorLoopRegion')}
        >
          <i className="ti ti-repeat" /> {tr('editorLoop')}
        </button>

        {/* Temps */}
        <span style={{ 
          fontSize: 12, 
          fontFamily: 'monospace', 
          color: 'var(--text-secondary)',
          minWidth: 100,
          textAlign: 'center'
        }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {/* Indicateur d'état */}
        {isPlaying && (
          <span style={{
            fontSize: 10,
            color: 'var(--success)',
            background: 'rgba(29,158,117,0.15)',
            padding: '2px 8px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              background: 'var(--success)',
              animation: 'pulse 1s ease-in-out infinite'
            }} />
            {tr('editorPlaying')}
          </span>
        )}
        {isPaused && (
          <span style={{
            fontSize: 10,
            color: 'var(--warning)',
            background: 'rgba(239,159,39,0.15)',
            padding: '2px 8px',
            borderRadius: 10
          }}>
            {tr('editorPaused')}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          className="btn-secondary btn-sm"
          onClick={onAddTrack}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-plus" /> {tr('editorAddTrack')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAddClip(!showAddClip)}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-music-plus" /> {tr('editorAddClip')}
        </button>

        <button
          className="btn-primary btn-sm"
          onClick={onExport}
          style={{ fontSize: 12 }}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorExporting')}</>
          ) : (
            <><i className="ti ti-package-export" /> {tr('editorExport')}</>
          )}
        </button>
      </div>

      {/* Dropdown pour ajouter un clip */}
      {showAddClip && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 16,
            marginTop: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            zIndex: 20,
            minWidth: 260,
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {tr('editorAddClip')}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {tr('editorSelectTrack')}
            </label>
            <select
              value={selectedTrackId}
              onChange={e => setSelectedTrackId(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectTrack')}</option>
              {tracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name} ({track.clips.length} clips)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {tr('editorSelectSound')}
            </label>
            <select
              value={selectedSoundId}
              onChange={handleSoundSelect}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectSound')}</option>
              {sounds.map(sound => (
                <option key={sound.id} value={sound.id}>
                  {sound.emoji || '🔊'} {sound.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowAddClip(false)}
              style={{ fontSize: 12 }}
            >
              {tr('cancel')}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleAddClipAction}
              disabled={!selectedTrackId || !selectedSoundId}
              style={{ fontSize: 12, opacity: !selectedTrackId || !selectedSoundId ? 0.5 : 1 }}
            >
              <i className="ti ti-plus" /> {tr('add')}
            </button>
          </div>

          {tracks.length === 0 && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 8,
              textAlign: 'center',
              padding: 8,
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {tr('editorAddTrackHint')}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}