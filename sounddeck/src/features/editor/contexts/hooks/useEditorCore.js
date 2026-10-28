/**
 * @file Root state hook for the editor.
 *
 * Owns every piece of state that defines an editor session, plus the
 * undo/redo history and the project persistence plumbing.
 *
 * ## Responsibilities
 *
 * - **State** — `project`, `clipDurations`, `loopState`, `totalDuration`,
 *   selection (`selectedClipId` / `selectedTrackId`), playback
 *   (`currentTime` / `isPlaying` / `isPaused` / `stopAtTime` /
 *   `soloPlayClipId`), view (`zoomLevel` / `snapEnabled` /
 *   `autoCrossfade` / `loopRegion` / `masterGain`), overlay
 *   (`actionOverlay`), and undo/redo flags.
 * - **Refs** — mirror every state above so async callbacks and the
 *   `requestAnimationFrame` playback loop can read the latest values
 *   without depending on `useEffect` timing.
 * - **History** — 50-step undo/redo stack with checkpointing.
 * - **Project lifecycle** — `loadProject`, `commitProject`,
 *   `persistProject` (via `electronAPI.saveEditorProject`).
 * - **Init** — reads `currentEditorProjectId` from the store, loads the
 *   corresponding project, or creates a fresh one. Migrates the legacy
 *   `editorProject` key from older builds.
 *
 * ## Ref sync pattern
 *
 * Every state has a matching `xxxRef` kept in sync via a dedicated
 * `useEffect`. That's ~20 effects but each is a one-liner — they're the
 * standard way to make state readable from callbacks without triggering
 * renders. This pattern is explicitly allowed by React 19.
 *
 * @see ./useEditorAudioPlayback.js
 * @see ./useEditorTracks.js
 * @see ./useEditorClips.js
 * @see ./useEditorEffects.js
 * @see ./useEditorLoops.js
 * @see ./useEditorOverlay.js
 * @see ./useEditorMarkers.js
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { getAudioFileDuration } from '@shared/utils/audioContext'
import { uuid } from '@shared/utils/uuid'
import { logWarn, logError } from '@shared/utils/logger'

const __DEBUG__ = typeof import.meta !== 'undefined' && import.meta.env?.DEV
const log = __DEBUG__ ? console.log.bind(console) : () => {}

/** Maximum number of undo steps retained. */
const HISTORY_LIMIT = 50

/** Loop start mode tags (informational). */
const LOOP_START_MODES = {
  TIMELINE_START: 'timelineStart',
  PLAYHEAD: 'playhead',
  MANUAL_CLICK: 'manualClick',
}

/** Loop end mode tags (informational). */
const LOOP_END_MODES = {
  END_OF_TRACK: 'endOfTrack',
  CYCLES: 'cycles',
  MANUAL: 'manual',
  MANUAL_CLICK: 'manualClick',
  PLAYHEAD: 'playhead',
}

/** Initial "no action" overlay state. */
const INITIAL_OVERLAY_STATE = {
  type: null,
  clipId: null,
  trackId: null,
  options: null,
  step: 0,
  totalSteps: 1,
  clipName: null,
  data: {},
}

/** Default timeline loop config. */
const DEFAULT_TIMELINE_LOOP = {
  enabled: false,
  start: 0,
  end: 10,
  color: '#7C6FF7',
  startMode: LOOP_START_MODES.TIMELINE_START,
  endMode: LOOP_END_MODES.END_OF_TRACK,
  cycleCount: 3,
  manualDuration: 10,
  startManualTime: 0,
  endManualTime: 10,
}

/**
 * Builds a fresh empty project object.
 *
 * @returns {Object} A new project, ready to be passed to `loadProject`.
 */
function createEmptyProject() {
  return {
    id: uuid('project'),
    name: 'Nouveau projet',
    tracks: [],
    markers: [],
    loops: {
      clips: {},
      tracks: {},
      timeline: { ...DEFAULT_TIMELINE_LOOP },
    },
    duration: 60,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Root state hook for the editor.
 *
 * @param {Object} options
 * @param {Object} options.store - App store (sounds, profiles, settings).
 * @param {(msg: string, type?: string) => void} options.addToast
 * @param {(key: string, params?: Object) => string} options.t - i18n translator.
 * @param {(options: Object) => Promise<boolean>} options.confirm - `useConfirm` handler.
 * @returns {Object} Everything the editor needs: state, refs, helpers,
 *   history, and project lifecycle functions.
 */
export function useEditorCore({ store, addToast, t, confirm }) {
  // ─── STATE ──────────────────────────────────────────────────────────
  const [project, setProject] = useState(null)
  const [clipDurations, setClipDurations] = useState({})
  const [loopState, setLoopState] = useState({
    clips: {},
    tracks: {},
    timeline: { ...DEFAULT_TIMELINE_LOOP },
  })
  const [totalDuration, setTotalDuration] = useState(10)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isDurationsLoaded, setIsDurationsLoaded] = useState(false)
  const [waveformData, setWaveformData] = useState({})

  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [stopAtTime, setStopAtTime] = useState(null)
  const [soloPlayClipId, setSoloPlayClipId] = useState(null)

  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [autoCrossfade, setAutoCrossfade] = useState(true)
  const [loopRegion, setLoopRegionState] = useState({
    enabled: false,
    start: 0,
    end: 10,
  })
  const [masterGain, setMasterGain] = useState(1)
  const [actionOverlay, setActionOverlay] = useState(INITIAL_OVERLAY_STATE)

  const [canUndoEditor, setCanUndoEditor] = useState(false)
  const [canRedoEditor, setCanRedoEditor] = useState(false)

  // ─── REFS (mirror state for async callbacks) ────────────────────────
  const projectRef = useRef(null)
  const storeRef = useRef(store)
  const clipDurationsRef = useRef({})
  const loopStateRef = useRef(loopState)
  const totalDurationRef = useRef(10)
  const autoCrossfadeRef = useRef(true)
  const actionOverlayRef = useRef(INITIAL_OVERLAY_STATE)
  const addToastRef = useRef(addToast)
  const tRef = useRef(t)

  const currentTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const selectedClipIdRef = useRef(null)
  const stopAtTimeRef = useRef(null)
  const soloPlayClipIdRef = useRef(null)
  const masterGainRef = useRef(1)

  const undoStackRef = useRef([])
  const redoStackRef = useRef([])
  const isUndoingRef = useRef(false)
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  // ─── REF SYNC ───────────────────────────────────────────────────────
  // Every state is mirrored to a ref so that async callbacks (rAF loop,
  // setTimeout, event handlers) always read the latest value. This is the
  // canonical React 19 pattern for "state readable from callbacks without
  // triggering renders".
  useEffect(() => {
    projectRef.current = project
  }, [project])
  useEffect(() => {
    storeRef.current = store
  }, [store])
  useEffect(() => {
    clipDurationsRef.current = clipDurations
  }, [clipDurations])
  useEffect(() => {
    loopStateRef.current = loopState
  }, [loopState])
  useEffect(() => {
    totalDurationRef.current = totalDuration
  }, [totalDuration])
  useEffect(() => {
    autoCrossfadeRef.current = autoCrossfade
  }, [autoCrossfade])
  useEffect(() => {
    actionOverlayRef.current = actionOverlay
  }, [actionOverlay])
  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])
  useEffect(() => {
    tRef.current = t
  }, [t])
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])
  useEffect(() => {
    selectedClipIdRef.current = selectedClipId
  }, [selectedClipId])
  useEffect(() => {
    stopAtTimeRef.current = stopAtTime
  }, [stopAtTime])
  useEffect(() => {
    soloPlayClipIdRef.current = soloPlayClipId
  }, [soloPlayClipId])
  useEffect(() => {
    masterGainRef.current = masterGain
  }, [masterGain])

  // ─── HELPERS ────────────────────────────────────────────────────────

  /**
   * Returns a unique ID with the given prefix (`"clip-<uuid>"`).
   *
   * @param {string} prefix
   * @returns {string}
   */
  const generateUniqueId = useCallback((prefix) => uuid(prefix), [])

  /**
   * Finds the closest previous clip in the same track.
   *
   * @param {{id: string, start: number}} clip
   * @param {{clips: Array<{id: string, start: number}>}|null} track
   * @returns {Object|null} The previous clip, or `null`.
   */
  const findPreviousClip = useCallback((clip, track) => {
    if (!track || !track.clips) return null
    return (
      track.clips
        .filter((c) => c.id !== clip.id && c.start < clip.start)
        .sort((a, b) => b.start - a.start)[0] || null
    )
  }, [])

  /**
   * Returns the overlap (in seconds) between `clipA`'s end and `clipB`'s
   * start, using the freshest duration for `clipA`.
   *
   * @param {{id: string, start: number, duration?: number}} clipA
   * @param {{start: number}} clipB
   * @returns {number} Overlap in seconds (0 if none).
   */
  const calculateOverlap = useCallback((clipA, clipB) => {
    const durations = clipDurationsRef.current
    const endA = clipA.start + (durations[clipA.id] || clipA.duration || 3)
    return Math.max(0, endA - clipB.start)
  }, [])

  /**
   * Returns the duration of an audio file (via shared audio utils).
   *
   * @param {string} filePath
   * @returns {Promise<number>} Seconds (fallback: 3).
   */
  const getAudioDuration = useCallback(async (filePath) => {
    return await getAudioFileDuration(filePath, 3)
  }, [])

  /**
   * Recomputes the total duration of a project from its clips.
   *
   * Uses `clipDurationsRef` first (freshest), then `clip.duration`, then
   * a 3s fallback. Returns `max(end) + 2s`, floored at 10s.
   *
   * @param {{tracks?: Array<{clips?: Array<Object>}>}} proj
   * @returns {number} Total duration in seconds (>= 10).
   */
  const recalculateTotalDuration = useCallback((proj) => {
    if (!proj?.tracks) return 10
    let max = 0
    for (const track of proj.tracks) {
      for (const clip of track.clips || []) {
        const dur = clipDurationsRef.current[clip.id] || clip.duration || 3
        const end = (clip.start || 0) + dur
        if (end > max) max = end
      }
    }
    return Math.max(max + 2, 10)
  }, [])

  // ─── PERSISTENCE ────────────────────────────────────────────────────

  /**
   * Persists a project to disk (fire-and-forget, no toast).
   *
   * Silently ignores errors — the write is best-effort. If it fails, the
   * in-memory state remains the source of truth and the user can still
   * save manually via the toolbar.
   *
   * @param {Object|null} projectData
   * @returns {void}
   */
  const persistProject = useCallback((projectData) => {
    if (!projectData?.id) return
    try {
      window.electronAPI?.saveEditorProject?.(projectData).catch(() => {})
    } catch {
      // Ignore — persistence is best-effort.
    }
  }, [])

  // ─── COMMIT ─────────────────────────────────────────────────────────

  /**
   * Replaces the current project, optionally pushing the previous state
   * onto the undo stack, persisting to disk, and recalculating the total
   * duration.
   *
   * @param {Object|null} newProject
   * @param {Object} [options]
   * @param {boolean} [options.skipHistory=false] - Skip the undo push
   *   (used for transient changes like live slider drags).
   * @returns {void}
   */
  const commitProject = useCallback(
    (newProject, options = {}) => {
      if (!newProject) return
      const { skipHistory = false } = options
      const currentProject = projectRef.current

      if (!skipHistory && currentProject && !isUndoingRef.current) {
        undoStackRef.current.push(currentProject)
        if (undoStackRef.current.length > HISTORY_LIMIT) {
          undoStackRef.current.shift()
        }
        redoStackRef.current = []
        setCanUndoEditor(true)
        setCanRedoEditor(false)
      }

      setProject(newProject)
      projectRef.current = newProject
      persistProject(newProject)

      // Auto-recalculate the total duration.
      const newTotal = recalculateTotalDuration(newProject)
      if (newTotal !== totalDurationRef.current) {
        setTotalDuration(newTotal)
        totalDurationRef.current = newTotal
      }
    },
    [persistProject, recalculateTotalDuration]
  )

  /**
   * Pushes the current project onto the undo stack **without** modifying
   * it — used at the start of interactive operations (drag, resize) so
   * a single undo step reverts the whole operation.
   *
   * @returns {void}
   */
  const pushEditorHistoryCheckpoint = useCallback(() => {
    const currentProject = projectRef.current
    if (!currentProject) return
    undoStackRef.current.push(currentProject)
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift()
    }
    redoStackRef.current = []
    setCanUndoEditor(true)
    setCanRedoEditor(false)
  }, [])

  /**
   * Reverts to the previous state in the undo stack.
   *
   * @returns {boolean} `true` if an undo was performed.
   */
  const undoEditor = useCallback(() => {
    if (undoStackRef.current.length === 0) return false
    const previous = undoStackRef.current.pop()
    const current = projectRef.current
    if (!previous) return false

    isUndoingRef.current = true
    if (current) redoStackRef.current.push(current)

    setProject(previous)
    projectRef.current = previous
    persistProject(previous)

    const newTotal = recalculateTotalDuration(previous)
    if (newTotal !== totalDurationRef.current) {
      setTotalDuration(newTotal)
      totalDurationRef.current = newTotal
    }

    setCanUndoEditor(undoStackRef.current.length > 0)
    setCanRedoEditor(true)
    setTimeout(() => {
      isUndoingRef.current = false
    }, 0)
    return true
  }, [persistProject, recalculateTotalDuration])

  /**
   * Re-applies the most recently undone state.
   *
   * @returns {boolean} `true` if a redo was performed.
   */
  const redoEditor = useCallback(() => {
    if (redoStackRef.current.length === 0) return false
    const next = redoStackRef.current.pop()
    const current = projectRef.current
    if (!next) return false

    isUndoingRef.current = true
    if (current) undoStackRef.current.push(current)

    setProject(next)
    projectRef.current = next
    persistProject(next)

    const newTotal = recalculateTotalDuration(next)
    if (newTotal !== totalDurationRef.current) {
      setTotalDuration(newTotal)
      totalDurationRef.current = newTotal
    }

    setCanUndoEditor(true)
    setCanRedoEditor(redoStackRef.current.length > 0)
    setTimeout(() => {
      isUndoingRef.current = false
    }, 0)
    return true
  }, [persistProject, recalculateTotalDuration])

  // ─── RENAME ─────────────────────────────────────────────────────────

  /**
   * Renames the current project.
   *
   * Returns `true` (no-op) when the new name equals the current one, so
   * callers can safely use the return value to decide whether to persist
   * a rename externally.
   *
   * @param {string} newName
   * @returns {boolean} `true` on success (or no-op), `false` if invalid.
   */
  const updateEditorProjectName = useCallback(
    (newName) => {
      const currentProject = projectRef.current
      if (!currentProject) return false
      if (!newName || !newName.trim()) return false

      const trimmed = newName.trim()
      if (trimmed === currentProject.name) return true

      commitProject({
        ...currentProject,
        name: trimmed,
        updatedAt: Date.now(),
      })
      setIsDirty(true)
      return true
    },
    [commitProject]
  )

  // ─── REORDER TRACKS ─────────────────────────────────────────────────

  /**
   * Moves a track from `startIndex` to `endIndex`.
   *
   * @param {number} startIndex
   * @param {number} endIndex
   * @returns {boolean} `true` if the move was applied.
   */
  const reorderTracks = useCallback(
    (startIndex, endIndex) => {
      const currentProject = projectRef.current
      if (!currentProject) return false

      const tracks = [...currentProject.tracks]
      if (startIndex < 0 || startIndex >= tracks.length) return false
      if (endIndex < 0 || endIndex >= tracks.length) return false
      if (startIndex === endIndex) return false

      const [moved] = tracks.splice(startIndex, 1)
      tracks.splice(endIndex, 0, moved)

      commitProject({
        ...currentProject,
        tracks,
        updatedAt: Date.now(),
      })
      setIsDirty(true)
      return true
    },
    [commitProject]
  )

  // ─── LOAD PROJECT ───────────────────────────────────────────────────

  /**
   * Loads a project into the editor state.
   *
   * Resets the undo/redo history, recomputes `totalDuration` from the
   * project's clips, and populates `clipDurations` from `clip.duration`.
   *
   * @param {Object|null} projectData - `null` just marks init as done.
   * @returns {Promise<void>}
   */
  const loadProject = useCallback(
    async (projectData) => {
      if (!projectData) {
        setIsInitialized(true)
        return
      }

      // Same project re-loaded → skip the full reset, just sync.
      const currentProject = projectRef.current
      if (
        currentProject?.id === projectData.id &&
        initialLoadDoneRef.current
      ) {
        projectRef.current = projectData
        setProject(projectData)
        setIsInitialized(true)
        return
      }

      if (!projectData.name) projectData.name = 'Nouveau projet'

      setProject(projectData)
      projectRef.current = projectData
      undoStackRef.current = []
      redoStackRef.current = []
      setCanUndoEditor(false)
      setCanRedoEditor(false)

      setSelectedClipId(null)
      setSelectedTrackId(null)
      setCurrentTime(0)
      setIsPlaying(false)
      setIsPaused(false)
      setIsDurationsLoaded(false)
      setIsInitialized(true)
      setSoloPlayClipId(null)

      try {
        await window.electronAPI.storeSet?.(
          'currentEditorProjectId',
          projectData.id
        )
        persistProject(projectData)
      } catch (e) {
        logWarn('EditorCore', 'Store currentEditorProjectId error', e)
      }

      if (projectData.loops) {
        setLoopState(projectData.loops)
        loopStateRef.current = projectData.loops
      }

      let maxDuration = 10
      if (projectData.tracks) {
        for (const track of projectData.tracks) {
          for (const clip of track.clips) {
            const duration = clip.duration || 3
            const end = (clip.start || 0) + duration
            if (end > maxDuration) maxDuration = end
          }
        }
        const td = Math.max(maxDuration + 2, 10)
        setTotalDuration(td)
        totalDurationRef.current = td
      }

      if (projectData.tracks) {
        const durations = {}
        for (const track of projectData.tracks) {
          for (const clip of track.clips) {
            if (clip.id) durations[clip.id] = clip.duration || 3
          }
        }
        setClipDurations(durations)
        clipDurationsRef.current = durations
        setIsDurationsLoaded(true)
      }
    },
    [persistProject]
  )

  // ─── INIT ───────────────────────────────────────────────────────────

  /**
   * One-shot bootstrap:
   * - Reads `currentEditorProjectId` from the store.
   * - Loads the corresponding project if it exists.
   * - Falls back to migrating the legacy `editorProject` key.
   * - Creates a fresh empty project if nothing is found.
   */
  useEffect(() => {
    if (initialLoadDoneRef.current || isLoadingRef.current) return
    isLoadingRef.current = true

    const init = async () => {
      try {
        let currentProjectId = null
        try {
          currentProjectId = await window.electronAPI.storeGet?.(
            'currentEditorProjectId'
          )
        } catch {
          // Ignore — missing key is normal on first launch.
        }

        let editorProject = null

        if (currentProjectId) {
          try {
            const result =
              await window.electronAPI.loadEditorProject?.(currentProjectId)
            if (result?.success) editorProject = result.project
          } catch {
            // Ignore — corrupted project file, we'll fall back.
          }
        }

        // Migration from the legacy singular-format key.
        if (!editorProject) {
          try {
            const oldFormat =
              await window.electronAPI.storeGet?.('editorProject')
            if (oldFormat?.id) {
              editorProject = oldFormat
              await window.electronAPI.saveEditorProject?.(oldFormat)
              log(
                '📂 [EditorCore] Migrated from legacy format:',
                oldFormat.name
              )
            }
          } catch {
            // Ignore — migration is best-effort.
          }
        }

        if (editorProject) {
          await loadProject(editorProject)
        } else {
          await loadProject(createEmptyProject())
        }
      } catch (e) {
        logError('EditorCore', 'Initialization error', e)
        const fallbackProject = createEmptyProject()
        setProject(fallbackProject)
        projectRef.current = fallbackProject
        setTotalDuration(10)
        setIsInitialized(true)
      } finally {
        isLoadingRef.current = false
        initialLoadDoneRef.current = true
      }
    }

    init()
    // Intentional: this effect only runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── PUBLIC API ─────────────────────────────────────────────────────

  return {
    // States
    project,
    setProject,
    clipDurations,
    setClipDurations,
    loopState,
    setLoopState,
    totalDuration,
    setTotalDuration,
    isInitialized,
    setIsInitialized,
    isDirty,
    setIsDirty,
    isLoading,
    setIsLoading,
    isAutoSaving,
    setIsAutoSaving,
    isDurationsLoaded,
    setIsDurationsLoaded,
    waveformData,
    setWaveformData,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isPaused,
    setIsPaused,
    stopAtTime,
    setStopAtTime,
    soloPlayClipId,
    setSoloPlayClipId,
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    zoomLevel,
    setZoomLevel,
    snapEnabled,
    setSnapEnabled,
    autoCrossfade,
    setAutoCrossfade,
    loopRegion,
    setLoopRegionState,
    masterGain,
    setMasterGain,
    actionOverlay,
    setActionOverlay,
    canUndoEditor,
    canRedoEditor,

    // Refs
    projectRef,
    storeRef,
    clipDurationsRef,
    loopStateRef,
    totalDurationRef,
    autoCrossfadeRef,
    actionOverlayRef,
    addToastRef,
    tRef,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    selectedClipIdRef,
    stopAtTimeRef,
    soloPlayClipIdRef,
    masterGainRef,

    // Helpers
    generateUniqueId,
    findPreviousClip,
    calculateOverlap,
    getAudioDuration,
    recalculateTotalDuration,

    // Confirm exposed to hooks that need it
    confirm,

    // Persistence
    persistProject,
    commitProject,
    pushEditorHistoryCheckpoint,
    undoEditor,
    redoEditor,
    updateEditorProjectName,
    reorderTracks,
    loadProject,

    // Constants
    INITIAL_OVERLAY_STATE,
    DEFAULT_TIMELINE_LOOP,
  }
}