// src/features/editor/contexts/hooks/useEditorCore.js
import { useState, useCallback, useRef, useEffect } from "react";
import { getAudioFileDuration } from "@shared/utils/audioContext";
import { uuid } from "@shared/utils/uuid";
import { logWarn, logError } from "@shared/utils/logger";

const __DEBUG__ = typeof import.meta !== "undefined" && import.meta.env?.DEV;
const log = __DEBUG__ ? console.log.bind(console) : () => {};

const HISTORY_LIMIT = 50;

const LOOP_START_MODES = {
  TIMELINE_START: "timelineStart",
  PLAYHEAD: "playhead",
  MANUAL_CLICK: "manualClick",
};

const LOOP_END_MODES = {
  END_OF_TRACK: "endOfTrack",
  CYCLES: "cycles",
  MANUAL: "manual",
  MANUAL_CLICK: "manualClick",
  PLAYHEAD: "playhead",
};

const INITIAL_OVERLAY_STATE = {
  type: null,
  clipId: null,
  trackId: null,
  options: null,
  step: 0,
  totalSteps: 1,
  clipName: null,
  data: {},
};

const DEFAULT_TIMELINE_LOOP = {
  enabled: false,
  start: 0,
  end: 10,
  color: "#7C6FF7",
  startMode: LOOP_START_MODES.TIMELINE_START,
  endMode: LOOP_END_MODES.END_OF_TRACK,
  cycleCount: 3,
  manualDuration: 10,
  startManualTime: 0,
  endManualTime: 10,
};

export function useEditorCore({ store, addToast, t, confirm }) {
  // ─── STATES ─────────────────────────────────────────────────────────────
  const [project, setProject] = useState(null);
  const [clipDurations, setClipDurations] = useState({});
  const [loopState, setLoopState] = useState({
    clips: {},
    tracks: {},
    timeline: { ...DEFAULT_TIMELINE_LOOP },
  });
  const [totalDuration, setTotalDuration] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDurationsLoaded, setIsDurationsLoaded] = useState(false);
  const [waveformData, setWaveformData] = useState({});

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stopAtTime, setStopAtTime] = useState(null);
  const [soloPlayClipId, setSoloPlayClipId] = useState(null);

  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [autoCrossfade, setAutoCrossfade] = useState(true);
  const [loopRegion, setLoopRegionState] = useState({
    enabled: false,
    start: 0,
    end: 10,
  });
  const [masterGain, setMasterGain] = useState(1);
  const [actionOverlay, setActionOverlay] = useState(INITIAL_OVERLAY_STATE);

  const [canUndoEditor, setCanUndoEditor] = useState(false);
  const [canRedoEditor, setCanRedoEditor] = useState(false);

  // ─── REFS ───────────────────────────────────────────────────────────────
  const projectRef = useRef(null);
  const storeRef = useRef(store);
  const clipDurationsRef = useRef({});
  const loopStateRef = useRef(loopState);
  const totalDurationRef = useRef(10);
  const autoCrossfadeRef = useRef(true);
  const actionOverlayRef = useRef(INITIAL_OVERLAY_STATE);
  const addToastRef = useRef(addToast);
  const tRef = useRef(t);

  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const selectedClipIdRef = useRef(null);
  const stopAtTimeRef = useRef(null);
  const soloPlayClipIdRef = useRef(null);
  const masterGainRef = useRef(1);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isUndoingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  // ─── SYNC REFS ──────────────────────────────────────────────────────────
  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);
  useEffect(() => {
    clipDurationsRef.current = clipDurations;
  }, [clipDurations]);
  useEffect(() => {
    loopStateRef.current = loopState;
  }, [loopState]);
  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);
  useEffect(() => {
    autoCrossfadeRef.current = autoCrossfade;
  }, [autoCrossfade]);
  useEffect(() => {
    actionOverlayRef.current = actionOverlay;
  }, [actionOverlay]);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    selectedClipIdRef.current = selectedClipId;
  }, [selectedClipId]);
  useEffect(() => {
    stopAtTimeRef.current = stopAtTime;
  }, [stopAtTime]);
  useEffect(() => {
    soloPlayClipIdRef.current = soloPlayClipId;
  }, [soloPlayClipId]);
  useEffect(() => {
    masterGainRef.current = masterGain;
  }, [masterGain]);

  // ─── HELPERS ────────────────────────────────────────────────────────────
  const generateUniqueId = useCallback((prefix) => uuid(prefix), []);

  const findPreviousClip = useCallback((clip, track) => {
    if (!track || !track.clips) return null;
    return (
      track.clips
        .filter((c) => c.id !== clip.id && c.start < clip.start)
        .sort((a, b) => b.start - a.start)[0] || null
    );
  }, []);

  const calculateOverlap = useCallback((clipA, clipB) => {
    const durations = clipDurationsRef.current;
    const endA = clipA.start + (durations[clipA.id] || clipA.duration || 3);
    return Math.max(0, endA - clipB.start);
  }, []);

  const getAudioDuration = useCallback(async (filePath) => {
    return await getAudioFileDuration(filePath, 3);
  }, []);

  /**
   * Recalcule la durée totale du projet à partir des clips.
   * Utilise clip.duration en priorité, puis clipDurationsRef en fallback.
   * Garantit un minimum de 10s + 2s de marge.
   */
  const recalculateTotalDuration = useCallback((proj) => {
    if (!proj?.tracks) return 10;
    let max = 0;
    for (const track of proj.tracks) {
      for (const clip of track.clips || []) {
        const dur = clipDurationsRef.current[clip.id] || clip.duration || 3;
        const end = (clip.start || 0) + dur;
        if (end > max) max = end;
      }
    }
    return Math.max(max + 2, 10);
  }, []);

  // ─── PERSISTANCE ────────────────────────────────────────────────────────
  const persistProject = useCallback((projectData) => {
    if (!projectData?.id) return;
    try {
      window.electronAPI?.saveEditorProject?.(projectData).catch(() => {});
    } catch (e) {}
  }, []);

  // ─── COMMIT ─────────────────────────────────────────────────────────────
  const commitProject = useCallback(
    (newProject, options = {}) => {
      if (!newProject) return;
      const { skipHistory = false } = options;
      const currentProject = projectRef.current;

      if (!skipHistory && currentProject && !isUndoingRef.current) {
        undoStackRef.current.push(currentProject);
        if (undoStackRef.current.length > HISTORY_LIMIT) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
        setCanUndoEditor(true);
        setCanRedoEditor(false);
      }

      setProject(newProject);
      projectRef.current = newProject;
      persistProject(newProject);

      // recalcul auto de la durée totale
      const newTotal = recalculateTotalDuration(newProject);
      if (newTotal !== totalDurationRef.current) {
        setTotalDuration(newTotal);
        totalDurationRef.current = newTotal;
      }
    },
    [persistProject, recalculateTotalDuration],
  );

  const pushEditorHistoryCheckpoint = useCallback(() => {
    const currentProject = projectRef.current;
    if (!currentProject) return;
    undoStackRef.current.push(currentProject);
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndoEditor(true);
    setCanRedoEditor(false);
  }, []);

  const undoEditor = useCallback(() => {
    if (undoStackRef.current.length === 0) return false;
    const previous = undoStackRef.current.pop();
    const current = projectRef.current;
    if (!previous) return false;

    isUndoingRef.current = true;
    if (current) redoStackRef.current.push(current);

    setProject(previous);
    projectRef.current = previous;
    persistProject(previous);

    // recalcul auto de la durée totale
    const newTotal = recalculateTotalDuration(previous);
    if (newTotal !== totalDurationRef.current) {
      setTotalDuration(newTotal);
      totalDurationRef.current = newTotal;
    }

    setCanUndoEditor(undoStackRef.current.length > 0);
    setCanRedoEditor(true);
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    return true;
  }, [persistProject, recalculateTotalDuration]);

  const redoEditor = useCallback(() => {
    if (redoStackRef.current.length === 0) return false;
    const next = redoStackRef.current.pop();
    const current = projectRef.current;
    if (!next) return false;

    isUndoingRef.current = true;
    if (current) undoStackRef.current.push(current);

    setProject(next);
    projectRef.current = next;
    persistProject(next);

    // recalcul auto de la durée totale
    const newTotal = recalculateTotalDuration(next);
    if (newTotal !== totalDurationRef.current) {
      setTotalDuration(newTotal);
      totalDurationRef.current = newTotal;
    }

    setCanUndoEditor(true);
    setCanRedoEditor(redoStackRef.current.length > 0);
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    return true;
  }, [persistProject, recalculateTotalDuration]);

  // ─── RENAME ─────────────────────────────────────────────────────────────
  const updateEditorProjectName = useCallback(
    (newName) => {
      const currentProject = projectRef.current;
      if (!currentProject) return false;
      if (!newName || !newName.trim()) return false;

      const trimmed = newName.trim();
      if (trimmed === currentProject.name) return true;

      commitProject({
        ...currentProject,
        name: trimmed,
        updatedAt: Date.now(),
      });
      setIsDirty(true);
      return true;
    },
    [commitProject],
  );

  // ─── REORDER TRACKS ─────────────────────────────────────────────────────
  const reorderTracks = useCallback(
    (startIndex, endIndex) => {
      const currentProject = projectRef.current;
      if (!currentProject) return false;

      const tracks = [...currentProject.tracks];
      if (startIndex < 0 || startIndex >= tracks.length) return false;
      if (endIndex < 0 || endIndex >= tracks.length) return false;
      if (startIndex === endIndex) return false;

      const [moved] = tracks.splice(startIndex, 1);
      tracks.splice(endIndex, 0, moved);

      commitProject({
        ...currentProject,
        tracks,
        updatedAt: Date.now(),
      });
      setIsDirty(true);
      return true;
    },
    [commitProject],
  );

  // ─── LOAD PROJECT ───────────────────────────────────────────────────────
  const loadProject = useCallback(
    async (projectData) => {
      if (!projectData) {
        setIsInitialized(true);
        return;
      }

      const currentProject = projectRef.current;
      if (currentProject?.id === projectData.id && initialLoadDoneRef.current) {
        projectRef.current = projectData;
        setProject(projectData);
        setIsInitialized(true);
        return;
      }

      if (!projectData.name) projectData.name = "Nouveau projet";

      setProject(projectData);
      projectRef.current = projectData;
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndoEditor(false);
      setCanRedoEditor(false);

      setSelectedClipId(null);
      setSelectedTrackId(null);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsPaused(false);
      setIsDurationsLoaded(false);
      setIsInitialized(true);
      setSoloPlayClipId(null);

      try {
        await window.electronAPI.storeSet?.(
          "currentEditorProjectId",
          projectData.id,
        );
        persistProject(projectData);
      } catch (e) {
        logWarn("EditorCore", "Erreur sauvegarde", e);
      }

      if (projectData.loops) {
        setLoopState(projectData.loops);
        loopStateRef.current = projectData.loops;
      }

      let maxDuration = 10;
      if (projectData.tracks) {
        for (const track of projectData.tracks) {
          for (const clip of track.clips) {
            const duration = clip.duration || 3;
            const end = (clip.start || 0) + duration;
            if (end > maxDuration) maxDuration = end;
          }
        }
        const td = Math.max(maxDuration + 2, 10);
        setTotalDuration(td);
        totalDurationRef.current = td;
      }

      if (projectData.tracks) {
        const durations = {};
        for (const track of projectData.tracks) {
          for (const clip of track.clips) {
            if (clip.id) durations[clip.id] = clip.duration || 3;
          }
        }
        setClipDurations(durations);
        clipDurationsRef.current = durations;
        setIsDurationsLoaded(true);
      }
    },
    [persistProject],
  );

  // ─── INIT ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialLoadDoneRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;

    const init = async () => {
      try {
        let currentProjectId = null;
        try {
          currentProjectId = await window.electronAPI.storeGet?.(
            "currentEditorProjectId",
          );
        } catch (e) {}

        let editorProject = null;

        if (currentProjectId) {
          try {
            const result =
              await window.electronAPI.loadEditorProject?.(currentProjectId);
            if (result?.success) editorProject = result.project;
          } catch (e) {}
        }

        // Migration depuis l'ancien format singulier
        if (!editorProject) {
          try {
            const oldFormat =
              await window.electronAPI.storeGet?.("editorProject");
            if (oldFormat?.id) {
              editorProject = oldFormat;
              await window.electronAPI.saveEditorProject?.(oldFormat);
              log(
                "📂 [EditorCore] Migré depuis ancien format:",
                oldFormat.name,
              );
            }
          } catch (e) {}
        }

        if (editorProject) {
          await loadProject(editorProject);
        } else {
          const newProject = {
            id: uuid("project"),
            name: "Nouveau projet",
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
          };
          await loadProject(newProject);
        }
      } catch (e) {
        logError("EditorCore", "Erreur initialisation", e);
        const fallbackProject = {
          id: uuid("project"),
          name: "Nouveau projet",
          tracks: [],
          markers: [],
          duration: 60,
          loops: {
            clips: {},
            tracks: {},
            timeline: { ...DEFAULT_TIMELINE_LOOP },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setProject(fallbackProject);
        projectRef.current = fallbackProject;
        setTotalDuration(10);
        setIsInitialized(true);
      } finally {
        isLoadingRef.current = false;
        initialLoadDoneRef.current = true;
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Confirm expose for hooks
    confirm,

    // Persistance
    persistProject,
    commitProject,
    pushEditorHistoryCheckpoint,
    undoEditor,
    redoEditor,
    updateEditorProjectName,
    reorderTracks,
    loadProject,

    // Constantes
    INITIAL_OVERLAY_STATE,
    DEFAULT_TIMELINE_LOOP,
  };
}
