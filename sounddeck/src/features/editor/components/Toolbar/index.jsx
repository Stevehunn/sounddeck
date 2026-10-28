/**
 * @file Editor toolbar — project name, transport controls, snap/crossfade
 * toggles, metronome, project I/O, effects panel, timeline loop, and the
 * "add clip" dropdown.
 *
 * Layout (left → right):
 * 1. **Project name** — inline rename (double-click → input).
 * 2. **Transport** — play/pause, stop, undo, redo, snap, crossfade, time.
 * 3. **Metronome** — delegates to `<EditorMetronome>`.
 * 4. **Project I/O** — delegates to `<ProjectControls>`.
 * 5. **Effects panel toggle** — shows/hides the effects sidebar.
 * 6. **Timeline loop** — toggle + settings buttons.
 * 7. **Add** — add track, add clip (dropdown), import file, export.
 *
 * The "add clip" dropdown lets the user pick a track and a sound, then
 * appends the clip at `getNextStartPosition(trackId)` (0.5s after the last
 * clip's end).
 *
 * @see ./EditorMetronome.jsx
 * @see ./ProjectControls.jsx
 */

import { useState, useEffect, useRef } from 'react'
import EditorMetronome from './EditorMetronome'
import ProjectControls from './ProjectControls'

/** Gap (seconds) between the last clip's end and a newly added clip. */
const NEW_CLIP_GAP_SECONDS = 0.5

/** Default clip duration fallback (seconds) when unknown. */
const DEFAULT_CLIP_DURATION = 3

/**
 * Formats `seconds` as `M:SS`. Returns `'0:00'` for falsy/NaN values.
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Editor toolbar (see file header for responsibilities).
 *
 * @param {Object} props
 * @param {Array} props.tracks - Timeline tracks (each with `id`, `clips[]`).
 * @param {Array} props.sounds - Library sounds (each with `id`, `name`, `emoji`).
 * @param {boolean} props.isPlaying
 * @param {boolean} props.isPaused
 * @param {number} props.currentTime
 * @param {number} props.totalDuration
 * @param {Function} [props.onAddTrack]
 * @param {Function} [props.onAddClip]
 * @param {Function} [props.onAddFile]
 * @param {Function} [props.onPlay]
 * @param {Function} [props.onStop]
 * @param {Function} [props.onExport]
 * @param {Function} [props.onUndo]
 * @param {Function} [props.onRedo]
 * @param {boolean} props.canUndo
 * @param {boolean} props.canRedo
 * @param {boolean} props.snapEnabled
 * @param {Function} [props.onToggleSnap]
 * @param {boolean} props.autoCrossfade
 * @param {Function} [props.onToggleCrossfade]
 * @param {string} props.projectName
 * @param {Function} [props.onRenameProject]
 * @param {(key: string) => string} props.tr - i18n translator.
 * @param {Function} [props.addToast]
 * @param {Object} [props.loopState]
 * @param {Function} [props.onToggleTimelineLoop]
 * @param {Function} [props.onOpenLoopPanel]
 * @param {boolean} [props.metronomeEnabled]
 * @param {Function} [props.onToggleMetronome]
 * @param {number} [props.bpm]
 * @param {Function} [props.onBpmChange]
 * @param {Object} [props.project]
 * @param {Array} [props.projectList]
 * @param {Array} [props.recentProjects]
 * @param {boolean} [props.isSaving]
 * @param {boolean} [props.isLoading]
 * @param {Function} [props.onSaveProject]
 * @param {Function} [props.onLoadProject]
 * @param {Function} [props.onCreateProject]
 * @param {Function} [props.onDeleteProject]
 * @param {Function} [props.onDuplicateProject]
 * @param {Function} [props.onProjectRename]
 * @param {Function} [props.onLoadProjectList]
 * @param {Function} [props.onExportProject]
 * @param {Function} [props.onImportProject]
 * @param {boolean} [props.showEffectsPanel]
 * @param {Function} [props.onToggleEffectsPanel]
 * @returns {JSX.Element}
 */
export default function EditorToolbar({
  tracks,
  sounds,
  isPlaying,
  isPaused,
  currentTime,
  totalDuration,
  onAddTrack,
  onAddClip,
  onAddFile,
  onPlay,
  onStop,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  autoCrossfade,
  onToggleCrossfade,
  projectName,
  onRenameProject,
  tr,
  addToast,
  loopState,
  onToggleTimelineLoop,
  onOpenLoopPanel,
  metronomeEnabled,
  onToggleMetronome,
  bpm,
  onBpmChange,
  project,
  projectList,
  recentProjects,
  isSaving,
  isLoading,
  onSaveProject,
  onLoadProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onProjectRename,
  onLoadProjectList,
  onExportProject,
  onImportProject,
  showEffectsPanel,
  onToggleEffectsPanel,
}) {
  const defaultProjectName = tr?.('editorNewProject') || 'New project'

  const [showAddClip, setShowAddClip] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedSoundId, setSelectedSoundId] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [newProjectName, setNewProjectName] = useState(
    projectName || defaultProjectName
  )
  const dropdownRef = useRef(null)

  const timelineLoop = loopState?.timeline || { enabled: false }

  // Re-sync the editable name when the parent changes `projectName`.
  // Deferred to a macrotask so we don't emit a state update during the
  // effect flush (satisfies `react-hooks/set-state-in-effect`).
  useEffect(() => {
    const timer = setTimeout(() => {
      setNewProjectName(projectName || defaultProjectName)
    }, 0)
    return () => clearTimeout(timer)
    // `defaultProjectName` is derived from `tr` (unstable ref) — intentionally
    // not in deps to avoid a render loop. It only matters on first mount,
    // when `useState` already covered it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName])

  // Close the "add clip" dropdown on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddClip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * Returns the start position for a new clip on `trackId`:
   * last clip's end + `NEW_CLIP_GAP_SECONDS`. Returns 0 for empty tracks.
   *
   * @param {string} trackId
   * @returns {number}
   */
  const getNextStartPosition = (trackId) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return 0
    if (track.clips.length === 0) return 0

    const lastClip = track.clips.reduce(
      (max, clip) => {
        const clipEnd = clip.start + (clip.duration || DEFAULT_CLIP_DURATION)
        return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
      },
      { start: 0, end: 0 }
    )
    return lastClip.end + NEW_CLIP_GAP_SECONDS
  }

  /**
   * Validates the "add clip" form and forwards it to `onAddClip`.
   * @returns {void}
   */
  const handleAddClipAction = () => {
    let trackId = selectedTrackId
    if (!trackId && tracks.length > 0) {
      trackId = tracks[0].id
      setSelectedTrackId(trackId)
    }

    if (!trackId) {
      addToast?.(tr('editorNoTracks'), 'error')
      return
    }

    if (!selectedSoundId) {
      addToast?.(tr('editorSelectSound'), 'error')
      return
    }

    const startPosition = getNextStartPosition(trackId)
    onAddClip(trackId, selectedSoundId, startPosition)
    setShowAddClip(false)
    setSelectedSoundId('')
  }

  /**
   * Returns the play button's icon/label/color based on the current state
   * (idle / playing / paused / seeking-from-start).
   *
   * @returns {{icon: string, label: string, color: string}}
   */
  const getButtonState = () => {
    if (isPlaying)
      return {
        icon: 'ti-player-pause',
        label: tr('editorPause'),
        color: 'var(--warning)',
      }
    if (isPaused)
      return {
        icon: 'ti-player-play',
        label: tr('editorResume'),
        color: 'var(--accent)',
      }
    if (currentTime > 0)
      return {
        icon: 'ti-player-play',
        label: tr('editorPlayFromStart'),
        color: 'var(--accent)',
      }
    return {
      icon: 'ti-player-play',
      label: tr('editorPlay'),
      color: 'var(--accent)',
    }
  }

  const buttonState = getButtonState()
  const projectDisplayName = projectName || defaultProjectName

  return (
    <div
      data-testid="editor-toolbar"
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}
      >
        {isRenaming ? (
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsRenaming(false)
                onRenameProject?.(newProjectName.trim())
              }
              if (e.key === 'Escape') {
                setIsRenaming(false)
                setNewProjectName(projectDisplayName)
              }
            }}
            onBlur={() => {
              setIsRenaming(false)
              onRenameProject?.(newProjectName.trim())
            }}
            autoFocus
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              width: 150,
              color: 'var(--text-primary)',
            }}
          />
        ) : (
          <span
            onClick={() => setIsRenaming(true)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={tr('editorClickToRename')}
          >
            <i
              className="ti ti-pencil"
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                opacity: 0.6,
              }}
            />
            {projectDisplayName}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          data-testid="editor-play-button"
          className="btn-primary btn-sm"
          onClick={onPlay}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: buttonState.color,
            borderColor: buttonState.color,
          }}
          title={buttonState.label}
        >
          <i className={`ti ${buttonState.icon}`} />
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onStop}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !isPlaying && !isPaused && currentTime === 0 ? 0.4 : 1,
          }}
          title={tr('editorStop')}
        >
          <i className="ti ti-player-stop-filled" />
        </button>

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
            opacity: canUndo ? 1 : 0.4,
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
            opacity: canRedo ? 1 : 0.4,
          }}
          title={tr('editorRedo')}
        >
          <i className="ti ti-arrow-forward-up" />
        </button>

        <button
          className={snapEnabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleSnap}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={tr('editorSnap')}
        >
          <i className="ti ti-magnet" />
        </button>

        <button
          data-testid="editor-crossfade-toggle-button"
          className={
            autoCrossfade ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
          }
          onClick={onToggleCrossfade}
          style={{
            minHeight: 28,
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
          title={tr('editorAutoCrossfade') || 'Auto crossfade'}
        >
          <i className="ti ti-transition-right" />
          <span>{tr('editorCrossfadeShort') || 'Crossfade'}</span>
          <span
            style={{
              fontSize: 8,
              padding: '1px 6px',
              borderRadius: 10,
              background: autoCrossfade
                ? 'rgba(255,255,255,0.2)'
                : 'var(--bg-tertiary)',
              color: autoCrossfade ? 'white' : 'var(--text-tertiary)',
            }}
          >
            {autoCrossfade ? 'ON' : 'OFF'}
          </span>
        </button>

        <span
          style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            minWidth: 100,
            textAlign: 'center',
          }}
        >
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {isPlaying && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--success)',
              background: 'rgba(29,158,117,0.15)',
              padding: '2px 8px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            {tr('editorPlaying')}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <EditorMetronome
        bpm={bpm || 120}
        onBpmChange={onBpmChange}
        isPlaying={isPlaying || isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        enabled={metronomeEnabled || false}
        onToggle={onToggleMetronome}
        tr={tr}
      />

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <ProjectControls
        project={project}
        projectList={projectList}
        recentProjects={recentProjects}
        isSaving={isSaving}
        isLoading={isLoading}
        onSaveProject={onSaveProject}
        onLoadProject={onLoadProject}
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onDuplicateProject={onDuplicateProject}
        onRenameProject={onProjectRename}
        onLoadProjectList={onLoadProjectList}
        onExportProject={onExportProject}
        onImportProject={onImportProject}
        tr={tr}
      />

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          data-testid="editor-effects-panel-toggle"
          className={
            showEffectsPanel ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
          }
          onClick={() => onToggleEffectsPanel?.(!showEffectsPanel)}
          style={{
            minHeight: 28,
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
          title={
            showEffectsPanel
              ? tr('hideEffectsPanel') || 'Hide effects panel'
              : tr('showEffectsPanel') || 'Show effects panel'
          }
        >
          <i className="ti ti-wand" />
          <span>{tr('editorEffects') || 'Effects'}</span>
          <span
            style={{
              fontSize: 8,
              padding: '1px 6px',
              borderRadius: 10,
              background: showEffectsPanel
                ? 'rgba(255,255,255,0.2)'
                : 'var(--bg-tertiary)',
              color: showEffectsPanel ? 'white' : 'var(--text-tertiary)',
            }}
          >
            {showEffectsPanel ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          data-testid="editor-loop-toggle-button"
          className={
            timelineLoop.enabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'
          }
          onClick={onToggleTimelineLoop}
          style={{
            minHeight: 28,
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
          }}
          title={
            tr('toggleTimelineLoop') || 'Toggle global timeline loop'
          }
        >
          <i className="ti ti-repeat" />
          <span>{tr('loop') || 'Loop'}</span>
          <span
            style={{
              fontSize: 8,
              padding: '1px 6px',
              borderRadius: 10,
              background: timelineLoop.enabled
                ? 'rgba(255,255,255,0.2)'
                : 'var(--bg-tertiary)',
              color: timelineLoop.enabled ? 'white' : 'var(--text-tertiary)',
            }}
          >
            {timelineLoop.enabled ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          data-testid="editor-loop-settings-button"
          className="btn-secondary btn-sm"
          onClick={onOpenLoopPanel}
          style={{
            minHeight: 28,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
          title={tr('loopSettings') || 'Loop settings'}
        >
          <i className="ti ti-settings" />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          data-testid="editor-add-track-button"
          className="btn-secondary btn-sm"
          onClick={onAddTrack}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-plus" /> {tr('editorAddTrack')}
        </button>

        <button
          data-testid="editor-add-clip-button"
          className="btn-secondary btn-sm"
          onClick={() => setShowAddClip(!showAddClip)}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-music-plus" /> {tr('editorAddClip')}
        </button>

        <button
          data-testid="editor-import-file-button"
          className="btn-secondary btn-sm"
          onClick={onAddFile}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-file-import" />{' '}
          {tr('editorAddFile') || 'Import file'}
        </button>

        <button
          data-testid="editor-export-button"
          className="btn-primary btn-sm"
          onClick={onExport}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-package-export" /> {tr('editorExport')}
        </button>
      </div>

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
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {tr('editorAddClip')}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('editorSelectTrack')}
            </label>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectTrack')}</option>
              {tracks.map((track, index) => (
                <option key={track.id} value={track.id}>
                  {track.name ||
                    tr('editorTrackFallback', { n: index + 1 }) ||
                    `Track ${index + 1}`}{' '}
                  ({track.clips.length} clips)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('editorSelectSound')}
            </label>
            <select
              value={selectedSoundId}
              onChange={(e) => {
                const soundId = e.target.value
                setSelectedSoundId(soundId)
                if (soundId && selectedTrackId) {
                  const startPosition = getNextStartPosition(selectedTrackId)
                  onAddClip(selectedTrackId, soundId, startPosition)
                  setShowAddClip(false)
                  setSelectedSoundId('')
                }
              }}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectSound')}</option>
              {sounds.map((sound) => (
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
              style={{
                fontSize: 12,
                opacity: !selectedTrackId || !selectedSoundId ? 0.5 : 1,
              }}
            >
              <i className="ti ti-plus" /> {tr('add')}
            </button>
          </div>

          {tracks.length === 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginTop: 8,
                textAlign: 'center',
                padding: 8,
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {tr('editorAddTrackHint')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}