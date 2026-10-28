/**
 * @file Editor page — timeline, tracks, clips, effects, export.
 *
 * Top-level component for the multi-track audio editor. Three layers:
 *
 * 1. **`Editor`** — wraps everything in `EditorProvider` + `ConfirmWrapper`.
 * 2. **`EditorContent`** — shows loading / "no project" states, otherwise
 *    delegates to `EditorTimelineContent`.
 * 3. **`EditorTimelineContent`** — the actual editor UI: toolbar, timeline,
 *    effects panel, master volume, modals (add track, trim, normalize,
 *    export, import, timeline loop), clip context menu.
 *
 * ## Playback
 *
 * Playback state is owned by `useEditor()` (see `contexts/EditorContext.jsx`).
 * This file only dispatches user intents (play, pause, stop, seek, …) and
 * renders the resulting state.
 *
 * ## Modals
 *
 * All modals are portals attached to `document.body` (see `createPortal`).
 * They're conditionally mounted so their internal state resets on close.
 *
 * ## i18n
 *
 * All user-facing strings go through `t()` (from `useLanguage()`). Dev
 * logs stay in English per the project convention.
 *
 * @see ./contexts/EditorContext.jsx
 * @see ./components/Timeline
 * @see ./components/Toolbar
 * @see ./components/Modals
 * @see ./hooks/useProjectManager.js
 * @see ./hooks/useKeyboardShortcuts.js
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@core/i18n/LanguageContext";
import { EditorProvider, useEditor } from "./contexts/EditorContext";
import EditorTimeline from "./components/Timeline";
import EditorToolbar from "./components/Toolbar";
import EditorEffectsPanel from "./components/EffectsPanel";
import EditorMasterVolume from "./components/MasterVolume";
import ClipActionsMenu from "./components/ClipActionsMenu";
import ActionOverlay from "./components/ActionOverlay";
import AddTrackModal from "./components/Modals/AddTrackModal";
import TrimClipModal from "./components/Modals/TrimClipModal";
import NormalizeModal from "./components/Modals/NormalizeModal";
import ExportModal from "./components/Modals/ExportModal";
import ImportFileModal from "./components/Modals/ImportFileModal";
import TimelineLoopModal from "./components/Modals/TimelineLoopModal";
import { getClipById, formatTime } from "./utils";
import { mixdownProject, exportMixdown } from "@shared/utils/mixdown";
import { normalizeClip } from "@shared/utils/normalizeUtils";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import useConfirm from "@shared/hooks/useConfirm";
import useProjectManager from "./hooks/useProjectManager";
import { buildFileUrl } from "@shared/utils/fileUrl";
import { getBoolean, getNumber, setItem } from "@shared/utils/appStorage";
import { uuid } from "@shared/utils/uuid";
import { logError } from "@shared/utils/logger";

// ─── CONSTANTS ────────────────────────────────────────────────────────

/** True when the editor runs in dev mode (enables extra console logs). */
const __DEBUG__ = typeof import.meta !== "undefined" && import.meta.env?.DEV;

/** Storage key for the metronome enable flag. */
const STORE_KEY_METRONOME_ENABLED = "sounddeck_metronome_enabled";

/** Storage key for the metronome BPM. */
const STORE_KEY_METRONOME_BPM = "sounddeck_metronome_bpm";

/** Storage key for the master volume. */
const STORE_KEY_MASTER_VOLUME = "sounddeck_master_volume";

/** Master volume clamp bounds (percent). */
const MASTER_VOLUME_MIN = 0;
const MASTER_VOLUME_MAX = 200;
const MASTER_VOLUME_DEFAULT = 100;

/** BPM clamp bounds. */
const BPM_DEFAULT = 120;

/** Clip duration used when nothing else is known (seconds). */
const DEFAULT_CLIP_DURATION = 3;

/** Clipboard TTL — pastes older than this are rejected (ms). */
const CLIPBOARD_TTL_MS = 300_000; // 5 minutes

/** Extra time after the clip end when starting a manual clip loop. */
const LOOP_MIN_DURATION = 0.1;

/** Master volume default used as fallback when restoring from mute. */
const MASTER_VOLUME_RESTORE_FALLBACK = 100;

/** Default duration of a fresh project (seconds). */
const DEFAULT_PROJECT_DURATION = 60;

/** Debounce for the delete-clip flow (prevents double-confirm dialogs). */
const DELETE_DEBOUNCE_MS = 400;

/** Max preview playback duration when testing effects (ms). */
const EFFECT_PREVIEW_MAX_MS = 5000;

/** Preview gain (relative to master) when testing effects. */
const EFFECT_PREVIEW_GAIN = 0.5;

/** @type {string} Default hex color when creating a marker. */
const DEFAULT_MARKER_COLOR = "#3b82f6";

// ─── HELPERS ──────────────────────────────────────────────────────────

/**
 * Returns a brand new empty project, ready to be loaded.
 *
 * @param {string} name - Display name (default: "Nouveau projet" — caller
 *   should pass a translated string).
 * @returns {Object} Project object compatible with `commitProject`.
 */
function createEmptyProject(name = "Nouveau projet") {
  return {
    id: uuid("project"),
    name,
    tracks: [],
    markers: [],
    loops: {
      clips: {},
      timeline: {
        enabled: false,
        start: 0,
        end: 10,
        color: "#7C6FF7",
        durationMode: "cycles",
        cycleCount: 3,
        manualDuration: 10,
      },
    },
    duration: DEFAULT_PROJECT_DURATION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── WRAPPER + STATES ─────────────────────────────────────────────────

/**
 * Editor page (top-level wrapper).
 *
 * Sets up the `EditorProvider` + `ConfirmWrapper`, then delegates to
 * `EditorContent`.
 *
 * @param {Object} props
 * @param {Object} props.store - App store.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
export default function Editor({ store, addToast }) {
  const { currentLang } = useLanguage();
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang });

  return (
    <>
      <EditorProvider store={store} addToast={addToast} confirm={confirm}>
        <EditorContent />
      </EditorProvider>
      <ConfirmWrapper />
    </>
  );
}

/**
 * Renders the loading state, the "no project" empty state, or the full
 * editor timeline.
 *
 * @returns {JSX.Element}
 */
function EditorContent() {
  const { t } = useLanguage();
  const context = useEditor();

  if (!context || !context.isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-tertiary)",
          gap: 12,
        }}
      >
        <i
          className="ti ti-loader"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span>{t("editorLoading")}</span>
      </div>
    );
  }

  if (!context.project || !context.project.id) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-tertiary)",
          gap: 12,
          padding: 20,
        }}
      >
        <i
          className="ti ti-folder-plus"
          style={{ fontSize: 32, color: "var(--accent)" }}
        />
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {t("editorNoProject")}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {t("editorNoProjectDesc")}
        </div>
        <NewProjectButton
          label={t("editorCreateProject")}
          onCreate={() => {
            const newProject = createEmptyProject(t("editorNewProject"));
            context.setProject(newProject);
            context.commitProject(newProject, { skipHistory: true });
          }}
        />
      </div>
    );
  }

  return <EditorTimelineContent />;
}

/**
 * Empty-state "create a project" button (used in `EditorContent`).
 *
 * Extracted to module level so React Compiler can optimize it
 * (`react-hooks/static-components` rule).
 *
 * @param {Object} props
 * @param {string} props.label - Already-translated button label.
 * @param {() => void} props.onCreate - Called when the user clicks.
 * @returns {JSX.Element}
 */
function NewProjectButton({ label, onCreate }) {
  return (
    <button
      className="btn-primary btn-sm"
      onClick={onCreate}
      style={{ marginTop: 8 }}
    >
      <i className="ti ti-plus" /> {label}
    </button>
  );
}

// ─── MAIN EDITOR ──────────────────────────────────────────────────────

/**
 * Full editor UI: toolbar, timeline, effects panel, master volume, modals.
 *
 * Pulls every state/handler from `useEditor()` (the provider is already
 * mounted by `Editor`). Maintains its own local UI state (which modal is
 * open, which clip is selected for the context menu, etc.).
 *
 * @returns {JSX.Element}
 */
function EditorTimelineContent() {
  const { t } = useLanguage();
  const context = useEditor();
  const { confirm } = context;

  const {
    project,
    setProject,
    tracks,
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    currentTime,
    setCurrentTime,
    isPlaying,
    isPaused,
    totalDuration,
    clipDurations,
    setClipDurations,
    waveformData,
    store,
    addToast,
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
    addClip,
    addClipFromFile,
    removeClip,
    updateClip,
    duplicateClip,
    splitClip,
    play,
    pause,
    resume,
    stop,
    seek,
    selectClip,
    loopRegion,
    setLoopRegion,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    zoomLevel,
    snapEnabled,
    setSnapEnabled,
    autoCrossfade,
    setAutoCrossfade,
    playClipOnly,
    loopState,
    toggleClipLoop,
    actionOverlay,
    isActionOverlayActive,
    cancelActionOverlay,
    executeActionOverlay,
    activateLoopManualClick,
    activateSplitManualClick,
    activateTimelineLoopManualClick,
    moveClip,
    setTimelineLoop,
    toggleTimelineLoop,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    setSoloPlayClipId,
    setMasterGain,
  } = context;

  // ─── LOCAL UI STATE ─────────────────────────────────────────────────
  const [clipMenu, setClipMenu] = useState(null);
  const [selectedClipForMenu, setSelectedClipForMenu] = useState(null);
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState(null);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [pendingTrackName, setPendingTrackName] = useState("");
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [trimClipId, setTrimClipId] = useState(null);
  const [showNormalizeModal, setShowNormalizeModal] = useState(false);
  const [normalizeClipId, setNormalizeClipId] = useState(null);
  const [masterVolume, setMasterVolume] = useState(MASTER_VOLUME_DEFAULT);
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportName, setExportName] = useState("");
  const [showEffectsPanel, setShowEffectsPanel] = useState(true);
  const [showEffectsAddMenu, setShowEffectsAddMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportTrackId, setSelectedImportTrackId] = useState("");
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [pendingImportFileName, setPendingImportFileName] = useState("");
  const [showTimelineLoopModal, setShowTimelineLoopModal] = useState(false);
  const [isTimelineClickModeActive, setIsTimelineClickModeActive] =
    useState(false);
  const [timelineClickData, setTimelineClickData] = useState({
    start: null,
    end: null,
    duration: null,
  });
  const [timelineClickStep, setTimelineClickStep] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [bpm, setBpm] = useState(BPM_DEFAULT);
  const [clipboard, setClipboard] = useState(null);
  const [isDeletingClip, setIsDeletingClip] = useState(false);

  const masterVolumeRef = useRef(MASTER_VOLUME_DEFAULT);

  const projectManager = useProjectManager(
    store,
    project,
    setProject,
    addToast,
  );

  // ─── PREFS LOAD (metronome + master volume) ────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedEnabled, savedBpm, savedVolume] = await Promise.all([
          getBoolean(STORE_KEY_METRONOME_ENABLED, false),
          getNumber(STORE_KEY_METRONOME_BPM, BPM_DEFAULT),
          getNumber(STORE_KEY_MASTER_VOLUME, MASTER_VOLUME_DEFAULT),
        ]);

        if (!mounted) return;

        setMetronomeEnabled(savedEnabled);
        setBpm(savedBpm);

        const clampedVolume = Math.max(
          MASTER_VOLUME_MIN,
          Math.min(MASTER_VOLUME_MAX, savedVolume),
        );
        setMasterVolume(clampedVolume);
        masterVolumeRef.current = clampedVolume;
        setMasterGain(clampedVolume / 100);
      } catch (e) {
        if (__DEBUG__) console.warn("[Editor] Failed to load preferences:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setMasterGain]);

  // ─── DERIVED VALUES ────────────────────────────────────────────────
  const selectedClipForPanel = useMemo(() => {
    if (!selectedClipId) return null;
    return getClipById(tracks, selectedClipId);
  }, [tracks, selectedClipId]);

  const totalClipCount = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.clips?.length || 0), 0),
    [tracks],
  );

  // ─── HANDLERS ──────────────────────────────────────────────────────

  /**
   * Opens the "add track" modal with a default name derived from the
   * current track count.
   * @returns {void}
   */
  const handleAddTrack = useCallback(() => {
    const trackIndex = tracks.length + 1;
    const defaultName = t("editorTrackDefault").replace("{index}", trackIndex);
    setPendingTrackName(defaultName);
    setShowAddTrackModal(true);
  }, [tracks.length, t]);

  /**
   * Confirms the "add track" modal — calls `addTrack` and shows a toast.
   *
   * @param {string} name
   * @param {string} color
   * @returns {Promise<Object|null>} The new track, or `null` on error.
   */
  const handleAddTrackConfirm = useCallback(
    async (name, color) => {
      if (typeof addTrack !== "function") {
        addToast?.(t("toastEditorAddTrackUnavailable"), "error");
        setShowAddTrackModal(false);
        return null;
      }

      try {
        const result = await addTrack(name, color);
        if (result) {
          addToast?.(
            t("toastEditorTrackAdded", { name: result.name }),
            "success",
          );
        } else {
          addToast?.(t("toastEditorTrackAddError"), "error");
        }
        setShowAddTrackModal(false);
        return result;
      } catch (e) {
        addToast?.(`${t("toastEditorTrackAddError")}: ${e.message}`, "error");
        setShowAddTrackModal(false);
        return null;
      }
    },
    [addTrack, addToast, t],
  );

  /**
   * Play/pause/resume toggle. Reads refs to avoid stale closures.
   * @returns {void}
   */
  const handlePlayToggle = useCallback(() => {
    const currentlyPlaying = isPlayingRef?.current ?? isPlaying;
    const currentlyPaused = isPausedRef?.current ?? isPaused;

    if (currentlyPlaying) {
      pause();
    } else if (currentlyPaused) {
      resume();
    } else {
      setCurrentTime(0);
      if (currentTimeRef) currentTimeRef.current = 0;
      setSoloPlayClipId(null);
      play();
    }
  }, [
    isPlaying,
    isPaused,
    pause,
    resume,
    play,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    setCurrentTime,
    setSoloPlayClipId,
  ]);

  /**
   * Removes a track (with confirmation if it contains clips).
   *
   * @param {string} trackId
   * @returns {Promise<void>}
   */
  const handleRemoveTrack = useCallback(
    async (trackId) => {
      try {
        const track = tracks.find((tk) => tk.id === trackId);
        if (!track) return;

        if (tracks.length <= 1) {
          addToast?.(t("toastEditorLastTrackCannotBeRemoved"), "warning");
          return;
        }

        if (track.clips.length > 0) {
          const confirmed = await confirm({
            title: t("confirmDeleteTrack"),
            message: t("confirmDeleteTrackMessage"),
            type: "danger",
            confirmText: t("delete"),
            cancelText: t("cancel"),
          });
          if (!confirmed) return;
        }

        await removeTrack(trackId);
        addToast?.(t("toastEditorTrackRemoved", { name: track.name }), "info");
      } catch (e) {
        logError("Editor", "Track removal failed", e);
        addToast?.(t("toastProjectDeleteError"), "error");
      }
    },
    [tracks, removeTrack, addToast, confirm, t],
  );

  /**
   * Adds a clip from a library sound.
   *
   * @param {string} trackId
   * @param {string} soundId
   * @param {number} startPosition
   * @returns {Promise<void>}
   */
  const handleAddClip = useCallback(
    async (trackId, soundId, startPosition) => {
      await addClip(trackId, soundId, startPosition);
    },
    [addClip],
  );

  /**
   * Opens the native file picker and stages the file for import.
   * @returns {Promise<void>}
   */
  const handleAddFileClick = useCallback(async () => {
    if (tracks.length === 0) {
      addToast?.(t("editorNoTracks"), "error");
      return;
    }

    try {
      const result = await window.electronAPI.openFileDialog?.();
      if (!result || result.length === 0) return;

      const filePath = result[0];
      const fileName =
        filePath.split(/[\\/]/).pop() || t("editorAudioFileFallback");

      setPendingImportFile(filePath);
      setPendingImportFileName(fileName);
      setSelectedImportTrackId(tracks[0].id);
      setShowImportModal(true);
    } catch (e) {
      logError("Editor", "File dialog opening failed", e);
      addToast?.(`${t("editorFileImportError")}: ${e.message}`, "error");
    }
  }, [tracks, addToast, t]);

  /**
   * Confirms the import modal — actually adds the clip from the file.
   *
   * @param {{filePath: string, fileName: string, trackId: string, startTime: number}} payload
   * @returns {Promise<void>}
   */
  const handleImportConfirm = useCallback(
    // NOTE: `_fileName` is accepted for API symmetry with the caller
    // (ImportFileModal passes `{filePath, fileName, trackId, startTime}`)
    // but it's not used — the clip keeps its own `name` from the sound.
    async ({ filePath, _fileName, trackId, startTime }) => {
      if (!filePath) {
        addToast?.(t("toastEditorNoTrackAvailable"), "error");
        return;
      }

      try {
        const result = await addClipFromFile(trackId, filePath, startTime);
        if (result) {
          addToast?.(t("editorFileImported"), "success");
        } else {
          addToast?.(t("editorFileImportError"), "error");
        }
      } catch (e) {
        logError("Editor", "File import failed", e);
        addToast?.(`${t("editorFileImportError")}: ${e.message}`, "error");
      }

      setShowImportModal(false);
      setPendingImportFile(null);
      setPendingImportFileName("");
    },
    [addClipFromFile, addToast, t],
  );

  /**
   * Removes a clip.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @returns {void}
   */
  const handleRemoveClip = useCallback(
    (trackId, clipId) => {
      removeClip(trackId, clipId);
    },
    [removeClip],
  );

  /**
   * Selects a clip.
   *
   * @param {string} clipId
   * @param {string} trackId
   * @returns {void}
   */
  const handleClipSelect = useCallback(
    (clipId, trackId) => {
      selectClip(clipId, trackId);
    },
    [selectClip],
  );

  /**
   * Opens the clip context menu at the cursor position.
   *
   * @param {MouseEvent} e
   * @param {string} clipId
   * @param {string} trackId
   * @returns {void}
   */
  const handleClipContextMenu = useCallback(
    (e, clipId, trackId) => {
      e.preventDefault();
      e.stopPropagation();

      const clip = getClipById(tracks, clipId);
      if (!clip) return;

      setSelectedClipForMenu(clip);
      setSelectedTrackForMenu(trackId);
      setClipMenu({ top: e.clientY, left: e.clientX });
    },
    [tracks],
  );

  /**
   * Persists a new clip duration (used by the resize handles).
   *
   * @param {string} clipId
   * @param {number} newDuration
   * @returns {void}
   */
  const handleUpdateClipDuration = useCallback(
    (clipId, newDuration) => {
      if (selectedTrackId) {
        updateClip(selectedTrackId, clipId, { duration: newDuration });
        setClipDurations((prev) => ({ ...prev, [clipId]: newDuration }));
      }
    },
    [selectedTrackId, updateClip, setClipDurations],
  );

  /**
   * Opens the export modal (or shows an info toast if the project is empty).
   * @returns {void}
   */
  const handleExportClick = useCallback(() => {
    if (
      !project ||
      project.tracks.length === 0 ||
      project.tracks.every((tk) => tk.clips.length === 0)
    ) {
      addToast?.(t("editorNothingToExport"), "info");
      return;
    }
    setExportName(project.name || t("editorDefaultMixName"));
    setShowExportModal(true);
  }, [project, addToast, t]);

  /**
   * Sets the master volume (clamped) and persists it.
   *
   * @param {number} value - Volume in percent (0-200).
   * @returns {void}
   */
  const handleMasterVolumeChange = useCallback(
    (value) => {
      const normalized = Math.max(
        MASTER_VOLUME_MIN,
        Math.min(MASTER_VOLUME_MAX, value),
      );
      setMasterVolume(normalized);
      masterVolumeRef.current = normalized;
      setMasterGain(normalized / 100);
      setItem(STORE_KEY_MASTER_VOLUME, normalized).catch(() => {});
    },
    [setMasterGain],
  );

  /**
   * Toggles master mute. When muting, stores the last volume so it can
   * be restored on unmute.
   * @returns {void}
   */
  const handleMasterMuteToggle = useCallback(() => {
    const newMuted = !isMasterMuted;
    setIsMasterMuted(newMuted);
    if (newMuted) {
      setMasterGain(0);
    } else {
      const restoredValue =
        masterVolumeRef.current || MASTER_VOLUME_RESTORE_FALLBACK;
      setMasterVolume(restoredValue);
      setMasterGain(restoredValue / 100);
    }
  }, [isMasterMuted, setMasterGain]);

  /**
   * Resets every volume (master + tracks) to 100%.
   * @returns {void}
   */
  const handleResetVolumes = useCallback(() => {
    setMasterVolume(MASTER_VOLUME_DEFAULT);
    masterVolumeRef.current = MASTER_VOLUME_DEFAULT;
    setMasterGain(1);
    setItem(STORE_KEY_MASTER_VOLUME, MASTER_VOLUME_DEFAULT).catch(() => {});

    if (project?.tracks) {
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        volume: 1,
      }));

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      };

      context.commitProject(updatedProject, { skipHistory: true });

      if (context.setTrackVolume) {
        for (const track of updatedTracks) {
          context.setTrackVolume(track.id, 1);
        }
      }

      context.setMasterGain(1);
      addToast?.(t("editorResetVolumesSuccess"), "success");
    }
  }, [project, context, addToast, t, setMasterGain]);

  /**
   * Enables/disables the metronome and persists the choice.
   *
   * @param {boolean} enabled
   * @returns {void}
   */
  const handleToggleMetronome = useCallback((enabled) => {
    setMetronomeEnabled(enabled);
    setItem(STORE_KEY_METRONOME_ENABLED, enabled).catch(() => {});
  }, []);

  /**
   * Updates the metronome BPM and persists it.
   *
   * @param {number} newBpm
   * @returns {void}
   */
  const handleBpmChange = useCallback((newBpm) => {
    setBpm(newBpm);
    setItem(STORE_KEY_METRONOME_BPM, newBpm).catch(() => {});
  }, []);

  /**
   * Selects a clip and opens the effects panel with the "add effect"
   * menu visible.
   *
   * @param {string} clipId
   * @param {string} trackId
   * @returns {void}
   */
  const handleAddEffectFromMenu = useCallback(
    (clipId, trackId) => {
      selectClip(clipId, trackId);
      setShowEffectsPanel(true);
      setShowEffectsAddMenu(true);

      const clipName =
        getClipById(tracks, clipId)?.name || t("editorClipFallback");
      addToast?.(t("toastEditorEffectPanelOpened", { name: clipName }), "info");
    },
    [selectClip, tracks, addToast, t],
  );

  /**
   * Normalizes a clip using the options from the normalize modal.
   *
   * @param {string} clipId
   * @param {{method: 'peak'|'rms', target: number, maxGain: number, outputFormat: 'wav'|'mp3'}} options
   * @returns {Promise<void>}
   */
  const handleNormalizeWithOptions = useCallback(
    async (clipId, options) => {
      const clip = getClipById(tracks, clipId);
      if (!clip) {
        addToast?.(t("toastEditorClipNotFound"), "error");
        return;
      }

      const { method, target, maxGain, outputFormat = "wav" } = options;
      addToast?.(t("toastEditorNormalizing", { name: clip.name }), "info");

      try {
        const result = await normalizeClip(clip, target, store, {
          outputFormat,
          preserveOriginal: false,
          maxGain: maxGain || 10,
          minGain: 0.1,
          useRMS: method === "rms",
          targetRMS: target * 0.3,
        });

        if (result?.normalized) {
          if (result.newPath) {
            const updatedTracks = tracks.map((track) => {
              if (track.id !== selectedTrackId) return track;
              return {
                ...track,
                clips: track.clips.map((c) =>
                  c.id === clipId
                    ? { ...c, path: result.newPath, duration: clip.duration }
                    : c,
                ),
              };
            });

            const updatedProject = {
              ...project,
              tracks: updatedTracks,
              updatedAt: Date.now(),
            };

            context.commitProject(updatedProject);
          }

          addToast?.(
            t("toastEditorNormalizeSuccess", {
              name: clip.name,
              gain: result.gain.toFixed(2),
            }),
            "success",
          );
        } else if (result === null) {
          addToast?.(
            t("toastEditorNormalizeError", { name: clip.name }),
            "error",
          );
        } else {
          addToast?.(
            t("toastEditorAlreadyOptimal", { name: clip.name }),
            "info",
          );
        }
      } catch (e) {
        addToast?.(`${t("error")}: ${e.message}`, "error");
      }
    },
    [tracks, selectedTrackId, project, store, context, addToast, t],
  );

  /**
   * Copies a clip to the internal clipboard (with a TTL).
   *
   * @param {Object} clip
   * @returns {void}
   */
  const handleCopyClip = useCallback(
    (clip) => {
      if (!clip) {
        addToast?.(t("toastEditorNoClipToCopy"), "warning");
        return;
      }

      setClipboard({
        clip: {
          ...clip,
          _sourceId: clip.id,
          _copiedAt: Date.now(),
        },
        trackId: selectedTrackId,
      });

      addToast?.(`"${clip.name}" ${t("editorCopied")}`, "success");
    },
    [selectedTrackId, addToast, t],
  );

  /**
   * Cuts a clip to the internal clipboard (removes it from the project).
   *
   * @param {Object} clip
   * @returns {void}
   */
  const handleCutClip = useCallback(
    (clip) => {
      if (!clip) {
        addToast?.(t("toastEditorNoClipToCut"), "warning");
        return;
      }

      setClipboard({
        clip: {
          ...clip,
          _sourceId: clip.id,
          _copiedAt: Date.now(),
        },
        trackId: selectedTrackId,
      });

      if (selectedTrackId && clip.id) {
        removeClip(selectedTrackId, clip.id);
        addToast?.(`"${clip.name}" ${t("editorCutAction")}`, "info");
      } else {
        addToast?.(t("toastEditorClipCannotBeCut"), "error");
      }
    },
    [selectedTrackId, removeClip, addToast, t],
  );

  /**
   * Pastes the clipboard content as a new clip (with new IDs).
   *
   * @returns {Promise<void>}
   */
  const handlePasteClip = useCallback(async () => {
    if (!clipboard) {
      addToast?.(t("editorClipboardEmpty"), "warning");
      return;
    }

    if (Date.now() - clipboard._copiedAt > CLIPBOARD_TTL_MS) {
      setClipboard(null);
      addToast?.(t("editorClipboardExpired"), "warning");
      return;
    }

    const { clip, trackId: sourceTrackId } = clipboard;
    if (!clip) {
      addToast?.(t("editorClipboardEmpty"), "warning");
      return;
    }

    const targetTrackId = selectedTrackId || sourceTrackId || tracks[0]?.id;
    if (!targetTrackId) {
      addToast?.(t("toastEditorNoTrackAvailable"), "error");
      return;
    }

    if (!project) {
      addToast?.(t("toastEditorClipCannotBeCut"), "error");
      return;
    }

    const clipId = uuid("clip");

    const newClip = {
      id: clipId,
      name: clip.name || t("editorClipFallback"),
      path: clip.path,
      start: (clip.start || 0) + 1,
      duration: clip.duration || DEFAULT_CLIP_DURATION,
      offset: clip.offset || 0,
      volume: clip.volume || 0,
      volumeDb: clip.volumeDb || 0,
      effects: (clip.effects || []).map((e) => ({ ...e, id: uuid("effect") })),
      fadeIn: clip.fadeIn || 0,
      fadeOut: clip.fadeOut || 0,
      pitch: clip.pitch || 0,
      speed: clip.speed || 1,
      isExternal: clip.isExternal || false,
    };

    const updatedTracks = project.tracks.map((track) => {
      if (track.id === targetTrackId) {
        const clips = [...track.clips, newClip];
        clips.sort((a, b) => a.start - b.start);
        return { ...track, clips };
      }
      return track;
    });

    const updatedProject = {
      ...project,
      tracks: updatedTracks,
      updatedAt: Date.now(),
    };

    context.commitProject(updatedProject);
    setClipDurations((prev) => ({
      ...prev,
      [newClip.id]: newClip.duration || DEFAULT_CLIP_DURATION,
    }));

    addToast?.(`"${newClip.name}" ${t("editorPasted")}`, "success");
    setSelectedClipId(newClip.id);
    setSelectedTrackId(targetTrackId);
  }, [
    clipboard,
    selectedTrackId,
    tracks,
    project,
    context,
    setClipDurations,
    setSelectedClipId,
    setSelectedTrackId,
    addToast,
    t,
  ]);

  /**
   * Deletes a clip with confirmation (debounced to avoid double-dialogs).
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {string} [clipName]
   * @returns {Promise<void>}
   */
  const handleDeleteWithConfirm = useCallback(
    async (trackId, clipId, clipName) => {
      if (isDeletingClip) return;
      setIsDeletingClip(true);

      try {
        let name = clipName;
        if (!name) {
          const clip = getClipById(tracks, clipId);
          name = clip?.name || t("editorThisClip");
        }

        const message = t("confirmDeleteClipMessage", { name });

        const confirmed = await confirm({
          title: t("confirmDeleteClip"),
          message,
          type: "danger",
          confirmText: t("editorDelete"),
          cancelText: t("cancel"),
        });

        if (confirmed) {
          removeClip(trackId, clipId);
          addToast?.(t("toastEditorClipRemoved", { name }), "info");
        }
      } catch (e) {
        logError("Editor", "Clip deletion failed", e);
      } finally {
        setTimeout(() => setIsDeletingClip(false), DELETE_DEBOUNCE_MS);
      }
    },
    [tracks, removeClip, addToast, confirm, t, isDeletingClip],
  );

  /**
   * Previews a clip with its effects applied (offline render + one-shot
   * playback).
   *
   * @param {Object} clip
   * @returns {Promise<void>}
   */
  const handlePreviewEffects = useCallback(
    async (clip) => {
      if (!clip || !clip.path) return;

      try {
        const { applyEffectsToBuffer } =
          await import("@shared/utils/realTimeEffects");

        const fileUrl = buildFileUrl(clip.path);

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const hasActiveEffects = clip.effects?.some((e) => e.enabled) || false;
        let processedBuffer = audioBuffer;

        if (hasActiveEffects) {
          processedBuffer = applyEffectsToBuffer(
            audioBuffer,
            clip.effects,
            audioContext.sampleRate,
            true,
          );
        }

        const source = audioContext.createBufferSource();
        source.buffer = processedBuffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = EFFECT_PREVIEW_GAIN;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start(0);

        source.onended = () => {
          audioContext.close().catch(() => {});
        };

        setTimeout(
          () => {
            try {
              source.stop();
              audioContext.close().catch(() => {});
            } catch {
              // Ignore — already stopped.
            }
          },
          Math.min(processedBuffer.duration * 1000, EFFECT_PREVIEW_MAX_MS),
        );
      } catch (e) {
        logError("Editor", "Effect preview failed", e);
        addToast?.(t("editorEffectPreviewError"), "error");
      }
    },
    [addToast, t],
  );

  /**
   * Adds a marker at the current playhead (or the given position).
   *
   * @param {Object} markerData
   * @returns {void}
   */
  const handleAddMarker = useCallback(
    (markerData) => {
      const { addMarker } = context;
      if (addMarker) addMarker(markerData);
      else addToast?.(t("toastEditorAddMarkerUnavailable"), "error");
    },
    [context, addToast, t],
  );

  /**
   * Removes a marker.
   *
   * @param {string} markerId
   * @returns {void}
   */
  const handleRemoveMarker = useCallback(
    (markerId) => {
      const { removeMarker } = context;
      if (removeMarker) removeMarker(markerId);
    },
    [context],
  );

  /**
   * Updates a marker.
   *
   * @param {string} markerId
   * @param {Object} updates
   * @returns {void}
   */
  const handleUpdateMarker = useCallback(
    (markerId, updates) => {
      const { updateMarker } = context;
      if (updateMarker) updateMarker(markerId, updates);
    },
    [context],
  );

  /**
   * Moves the playhead to a marker (or seeks directly if the context
   * method isn't available).
   *
   * @param {number} time
   * @returns {void}
   */
  const handleNavigateToMarker = useCallback(
    (time) => {
      const { navigateToMarker } = context;
      if (navigateToMarker) navigateToMarker(time);
      else seek(time);
    },
    [context, seek],
  );

  /**
   * Moves a clip to the previous track.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @returns {void}
   */
  const moveClipUp = useCallback(
    (trackId, clipId) => {
      const currentTrackIndex = tracks.findIndex((tk) => tk.id === trackId);
      if (currentTrackIndex <= 0) return;

      const clip = getClipById(tracks, clipId);
      if (!clip) return;

      const targetTrack = tracks[currentTrackIndex - 1];
      if (!targetTrack) return;

      moveClip(trackId, clipId, clip.start || 0, targetTrack.id);
      setSelectedTrackId(targetTrack.id);
      addToast?.(t("editorClipMovedUp"), "info");
    },
    [tracks, moveClip, setSelectedTrackId, addToast, t],
  );

  /**
   * Moves a clip to the next track.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @returns {void}
   */
  const moveClipDown = useCallback(
    (trackId, clipId) => {
      const currentTrackIndex = tracks.findIndex((tk) => tk.id === trackId);
      if (currentTrackIndex >= tracks.length - 1) return;

      const clip = getClipById(tracks, clipId);
      if (!clip) return;

      const targetTrack = tracks[currentTrackIndex + 1];
      if (!targetTrack) return;

      moveClip(trackId, clipId, clip.start || 0, targetTrack.id);
      setSelectedTrackId(targetTrack.id);
      addToast?.(t("editorClipMovedDown"), "info");
    },
    [tracks, moveClip, setSelectedTrackId, addToast, t],
  );

  /**
   * Returns `true` if the clip's track has a previous track.
   *
   * @param {string} trackId
   * @returns {boolean}
   */
  const getCanMoveUp = useCallback(
    (trackId) => {
      const currentTrackIndex = tracks.findIndex((tk) => tk.id === trackId);
      return currentTrackIndex > 0;
    },
    [tracks],
  );

  /**
   * Returns `true` if the clip's track has a next track.
   *
   * @param {string} trackId
   * @returns {boolean}
   */
  const getCanMoveDown = useCallback(
    (trackId) => {
      const currentTrackIndex = tracks.findIndex((tk) => tk.id === trackId);
      return currentTrackIndex < tracks.length - 1;
    },
    [tracks],
  );

  /**
   * Applies a new timeline loop config.
   *
   * @param {Object} options
   * @returns {void}
   */
  const handleSetTimelineLoop = useCallback(
    (options) => {
      setTimelineLoop?.(options);
    },
    [setTimelineLoop],
  );

  /**
   * Toggles the timeline loop on/off.
   * @returns {void}
   */
  const handleToggleTimelineLoop = useCallback(() => {
    toggleTimelineLoop?.();
  }, [toggleTimelineLoop]);

  /**
   * Opens the timeline loop configuration modal.
   * @returns {void}
   */
  const handleOpenLoopPanel = useCallback(() => {
    setShowTimelineLoopModal(true);
  }, []);

  /**
   * Activates / deactivates the "click mode" for the timeline loop.
   *
   * @param {boolean} [active=true]
   * @returns {void}
   */
  const handleActivateTimelineClickMode = useCallback(
    (active = true) => {
      setIsTimelineClickModeActive(active);
      if (active) {
        setTimelineClickStep(0);
        setTimelineClickData({ start: null, end: null, duration: null });
        activateTimelineLoopManualClick();
      } else {
        setTimelineClickStep(0);
        setTimelineClickData({ start: null, end: null, duration: null });
        cancelActionOverlay();
      }
    },
    [activateTimelineLoopManualClick, cancelActionOverlay],
  );

  /**
   * Handles a timeline click while the loop click-mode is active.
   *
   * @param {number} time
   * @returns {void}
   */
  const handleTimelineClickForLoop = useCallback(
    (time) => {
      if (!isTimelineClickModeActive) return;
      if (executeActionOverlay) executeActionOverlay(time);

      const clampedTime = Math.max(0, Math.min(time, totalDuration));

      if (timelineClickStep === 0) {
        setTimelineClickData((prev) => ({ ...prev, start: clampedTime }));
        setTimelineClickStep(1);
      } else if (timelineClickStep === 1) {
        if (clampedTime > timelineClickData.start) {
          setTimelineClickData((prev) => ({ ...prev, end: clampedTime }));
          setTimelineClickStep(2);
        }
      } else if (timelineClickStep === 2) {
        const duration = clampedTime - timelineClickData.start;
        if (duration > LOOP_MIN_DURATION) {
          setTimelineClickData((prev) => ({ ...prev, duration }));
          setShowTimelineLoopModal(false);
        }
      }
    },
    [
      isTimelineClickModeActive,
      executeActionOverlay,
      totalDuration,
      timelineClickStep,
      timelineClickData,
      setShowTimelineLoopModal,
    ],
  );

  const undoEditor = context.undoEditor;
  const redoEditor = context.redoEditor;
  const canUndo = context.canUndoEditor;
  const canRedo = context.canRedoEditor;

  /**
   * Shows/hides the effects panel (and closes the "add effect" menu when
   * hiding).
   *
   * @param {boolean} show
   * @returns {void}
   */
  const handleToggleEffectsPanel = useCallback((show) => {
    setShowEffectsPanel(show);
    if (!show) setShowEffectsAddMenu(false);
  }, []);

  // ─── WINDOW TEST HOOKS (for the tutorial) ──────────────────────────
  useEffect(() => {
    window.__editorHasClips = () =>
      tracks.some((tk) => tk.clips && tk.clips.length > 0);

    window.__editorGetFirstClipId = () => {
      for (const track of tracks) {
        if (track.clips && track.clips.length > 0) return track.clips[0].id;
      }
      return null;
    };

    window.__editorSelectClip = (clipId, openEffects = true) => {
      for (const track of tracks) {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) {
          selectClip(clipId, track.id);
          if (openEffects) setShowEffectsPanel(true);
          return true;
        }
      }
      return false;
    };

    window.__editorSelectFirstClip = (openEffects = true) => {
      const clipId = window.__editorGetFirstClipId?.();
      if (!clipId) return false;
      return window.__editorSelectClip?.(clipId, openEffects) || false;
    };

    window.__editorOpenClipMenu = (clipId = null) => {
      const targetId = clipId || window.__editorGetFirstClipId?.();
      if (!targetId) return false;

      window.__editorSelectClip?.(targetId, false);

      const clipEl =
        document.querySelector(`[data-clip-id="${targetId}"]`) ||
        document.querySelector('[data-testid="editor-clip"]') ||
        document.querySelector(".editor-clip-wrapper");

      if (!clipEl) return false;

      const rect = clipEl.getBoundingClientRect();

      const event = new MouseEvent("contextmenu", {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: rect.left + Math.min(rect.width / 2, 60),
        clientY: rect.top + Math.min(rect.height / 2, 20),
      });
      clipEl.dispatchEvent(event);
      return true;
    };

    window.__editorCloseClipMenu = () => {
      const evt = new MouseEvent("mousedown", {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      });
      document.body.dispatchEvent(evt);
    };

    window.__editorOpenMarkersPanel = () => {
      const btn = document.querySelector(
        '[data-testid="editor-add-marker-button"]',
      );
      if (btn) {
        btn.click();
        return true;
      }
      const panel = document.querySelector(
        '[data-testid="editor-markers-panel"]',
      );
      if (panel) return true;
      return false;
    };

    return () => {
      delete window.__editorHasClips;
      delete window.__editorGetFirstClipId;
      delete window.__editorSelectClip;
      delete window.__editorSelectFirstClip;
      delete window.__editorOpenClipMenu;
      delete window.__editorCloseClipMenu;
      delete window.__editorOpenMarkersPanel;
    };
  }, [tracks, selectClip]);

  // ─── KEYBOARD SHORTCUTS ────────────────────────────────────────────
  useKeyboardShortcuts({
    onPlay: handlePlayToggle,
    onPause: pause,
    onStop: stop,
    onUndo: undoEditor,
    onRedo: redoEditor,
    onAddTrack: handleAddTrack,
    onAddMarker: () => {
      const markers = project?.markers || [];
      context.addMarker({
        name: t("editorMarkerDefault", { index: markers.length + 1 }),
        time: currentTime,
        color: DEFAULT_MARKER_COLOR,
      });
    },
    onDelete: () => {
      if (selectedClipId && selectedTrackId) {
        const clip = getClipById(tracks, selectedClipId);
        handleDeleteWithConfirm(selectedTrackId, selectedClipId, clip?.name);
      } else {
        addToast?.(t("toastEditorNoClipSelected"), "info");
      }
    },
    onCopy: () => {
      const clip = getClipById(tracks, selectedClipId);
      if (clip) handleCopyClip(clip);
      else addToast?.(t("toastEditorNoClipSelected"), "warning");
    },
    onCut: () => {
      const clip = getClipById(tracks, selectedClipId);
      if (clip) handleCutClip(clip);
      else addToast?.(t("toastEditorNoClipSelected"), "warning");
    },
    onPaste: handlePasteClip,
    onSplit: () => {
      if (selectedClipId && selectedTrackId) {
        const clip = getClipById(tracks, selectedClipId);
        if (clip) {
          const duration =
            clipDurations[clip.id] || clip.duration || DEFAULT_CLIP_DURATION;
          const start = clip.start || 0;
          if (currentTime > start && currentTime < start + duration) {
            splitClip(selectedTrackId, selectedClipId, currentTime);
          } else {
            addToast?.(t("toastEditorPlayheadMustBeInside"), "warning");
          }
        }
      } else {
        addToast?.(t("toastEditorNoClipSelected"), "info");
      }
    },
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onZoomIn: () => handleZoomChange(zoomLevel + 0.1),
    onZoomOut: () => handleZoomChange(zoomLevel - 0.1),
    onZoomReset: () => handleZoomChange(1),
    onToggleMetronome: () => handleToggleMetronome(!metronomeEnabled),
    isPlaying: isPlaying || isPaused,
    canUndo,
    canRedo,
    isEnabled: true,
  });

  // ─── RENDER ─────────────────────────────────────────────────────────
  return (
    <div
      data-testid="editor-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      <EditorToolbar
        tracks={tracks}
        sounds={store?.sounds || []}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onAddTrack={handleAddTrack}
        onAddClip={handleAddClip}
        onAddFile={handleAddFileClick}
        onPlay={handlePlayToggle}
        onStop={stop}
        onExport={handleExportClick}
        onUndo={undoEditor}
        onRedo={redoEditor}
        canUndo={canUndo}
        canRedo={canRedo}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        autoCrossfade={autoCrossfade}
        onToggleCrossfade={() => setAutoCrossfade(!autoCrossfade)}
        projectName={project?.name || t("editorNewProject")}
        onRenameProject={async (newName) => {
          if (!newName || !newName.trim()) {
            addToast?.(t("toastProjectRenameError"), "warning");
            return;
          }
          const trimmed = newName.trim();
          const ok = context.updateEditorProjectName(trimmed);
          if (ok) {
            try {
              await projectManager.renameProject(project.id, trimmed);
            } catch (e) {
              logError("Editor", "Rename fallback failed", e);
            }
          }
        }}
        onRefreshDurations={() => {}}
        tr={t}
        addToast={addToast}
        loopState={loopState}
        onToggleTimelineLoop={handleToggleTimelineLoop}
        onOpenLoopPanel={handleOpenLoopPanel}
        metronomeEnabled={metronomeEnabled}
        onToggleMetronome={handleToggleMetronome}
        bpm={bpm}
        onBpmChange={handleBpmChange}
        project={project}
        projectList={projectManager.projectList}
        recentProjects={projectManager.recentProjects}
        isSaving={projectManager.isSaving}
        isLoading={projectManager.isLoading}
        onSaveProject={projectManager.saveProject}
        onLoadProject={projectManager.loadProject}
        onCreateProject={projectManager.createProject}
        onDeleteProject={projectManager.deleteProject}
        onDuplicateProject={projectManager.duplicateProject}
        onProjectRename={projectManager.renameProject}
        onLoadProjectList={projectManager.loadProjectList}
        onExportProject={projectManager.exportProject}
        onImportProject={projectManager.importProject}
        showEffectsPanel={showEffectsPanel}
        onToggleEffectsPanel={handleToggleEffectsPanel}
      />

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          minHeight: "320px",
        }}
      >
        {isActionOverlayActive && (
          <ActionOverlay
            isOpen={isActionOverlayActive}
            actionType={actionOverlay.type}
            clipName={actionOverlay.clipName}
            step={actionOverlay.step}
            totalSteps={actionOverlay.totalSteps}
            onCancel={cancelActionOverlay}
            tr={t}
          />
        )}

        <EditorTimeline
          tracks={tracks}
          selectedClipId={selectedClipId}
          selectedTrackId={selectedTrackId}
          totalDuration={totalDuration}
          currentTime={currentTime}
          isPlaying={isPlaying || isPaused}
          clipDurations={clipDurations}
          waveformData={waveformData}
          snapEnabled={snapEnabled}
          loopRegion={loopRegion}
          autoCrossfade={autoCrossfade}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          onClipSelect={handleClipSelect}
          onClipMove={context.moveClip}
          onClipUpdate={updateClip}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={duplicateClip}
          onClipFade={context.setClipFade || (() => {})}
          onClipContextMenu={handleClipContextMenu}
          onDragCheckpoint={context.pushEditorHistoryCheckpoint}
          onTrackRemove={handleRemoveTrack}
          onSeek={seek}
          onTrackMute={muteTrack}
          onTrackSolo={soloTrack}
          onTrackVolume={setTrackVolume}
          onTrackReorder={context.reorderTracks}
          onRenameTrack={renameTrack}
          onSetLoopRegion={setLoopRegion}
          onClearLoop={clearLoop}
          onToggleLoop={handleToggleTimelineLoop}
          onUpdateClipDuration={handleUpdateClipDuration}
          onSplitClip={(trackId, clipId, splitTime) => {
            return splitClip?.(trackId, clipId, splitTime);
          }}
          markers={context.markers}
          onAddMarker={handleAddMarker}
          onRemoveMarker={handleRemoveMarker}
          onUpdateMarker={handleUpdateMarker}
          onNavigateToMarker={handleNavigateToMarker}
          tr={t}
          addToast={addToast}
          onPlayClip={(clip, trackId) => {
            playClipOnly(clip, trackId);
          }}
          onStopClip={stop}
          onCopyClip={handleCopyClip}
          onCutClip={handleCutClip}
          onPasteClip={handlePasteClip}
          store={store}
          loopState={loopState}
          onToggleClipLoop={(clipId, options) => {
            toggleClipLoop(clipId, options);
          }}
          isPendingAction={isActionOverlayActive}
          pendingAction={actionOverlay}
          onExecutePendingAction={executeActionOverlay}
          onCancelPendingAction={cancelActionOverlay}
          onToggleTimelineLoop={handleToggleTimelineLoop}
          onSetTimelineLoop={handleSetTimelineLoop}
          onOpenLoopPanel={handleOpenLoopPanel}
          onActivateTimelineLoopManualClick={activateTimelineLoopManualClick}
          isTimelineClickModeActive={isTimelineClickModeActive}
          onTimelineClickForLoop={handleTimelineClickForLoop}
        />
      </div>

      <EffectsPanelSlot
        visible={showEffectsPanel}
        clip={selectedClipForPanel}
        trackId={selectedTrackId}
        context={context}
        updateClip={updateClip}
        tr={t}
        showAddMenu={showEffectsAddMenu}
        onShowAddMenuChange={setShowEffectsAddMenu}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <EditorMasterVolume
          volume={isMasterMuted ? 0 : masterVolume}
          onVolumeChange={handleMasterVolumeChange}
          isMuted={isMasterMuted}
          onMuteToggle={handleMasterMuteToggle}
          onReset={handleResetVolumes}
          tr={t}
        />
        <div
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            display: "flex",
            gap: 12,
          }}
        >
          <span>
            {t("editorClips")}: {totalClipCount}
          </span>
          <span>
            {t("editorTracks")}: {tracks.length}
          </span>
          <span>
            {t("editorDuration")}: {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {showAddTrackModal &&
        createPortal(
          <AddTrackModal
            isOpen={showAddTrackModal}
            onConfirm={handleAddTrackConfirm}
            onCancel={() => setShowAddTrackModal(false)}
            defaultName={pendingTrackName}
            tr={t}
          />,
          document.body,
        )}

      {showImportModal &&
        createPortal(
          <ImportFileModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setPendingImportFile(null);
              setPendingImportFileName("");
            }}
            onConfirm={handleImportConfirm}
            tracks={tracks}
            defaultTrackId={selectedImportTrackId}
            initialFilePath={pendingImportFile}
            fileName={pendingImportFileName}
            tr={t}
          />,
          document.body,
        )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={async (options) => {
            try {
              const buffer = await mixdownProject(
                project,
                clipDurations,
                44100,
              );

              if (!buffer) throw new Error("Mixdown error");

              const exportResults = [];

              if (
                options.exportLocation === "file" ||
                options.exportLocation === "both"
              ) {
                const saveResult = await window.electronAPI.saveFileDialog?.(
                  options.outputPath ||
                    `${options.name}.${
                      options.format === "wav" ? "wav" : options.format
                    }`,
                  null,
                );

                if (saveResult?.success && saveResult?.path) {
                  const result = await exportMixdown(
                    buffer,
                    options.format,
                    options.bitrate,
                    saveResult.path,
                  );
                  if (result.success) {
                    exportResults.push({ type: "file", path: saveResult.path });
                    addToast?.(
                      `${t("editorExportSuccess")}: ${saveResult.path}`,
                      "success",
                    );
                  } else {
                    throw new Error(result.error || "File export error");
                  }
                } else if (saveResult?.canceled) {
                  setShowExportModal(false);
                  return;
                } else {
                  const fallbackPath =
                    options.outputPath ||
                    `${options.name}.${
                      options.format === "wav" ? "wav" : options.format
                    }`;
                  const result = await exportMixdown(
                    buffer,
                    options.format,
                    options.bitrate,
                    fallbackPath,
                  );
                  if (result.success) {
                    exportResults.push({ type: "file", path: fallbackPath });
                    addToast?.(
                      `${t("editorExportSuccess")}: ${fallbackPath}`,
                      "success",
                    );
                  } else {
                    throw new Error(result.error || "File export error");
                  }
                }
              }

              if (
                options.exportLocation === "library" ||
                options.exportLocation === "both"
              ) {
                const tempPath = `temp_${Date.now()}.wav`;
                const tempResult = await exportMixdown(
                  buffer,
                  "wav",
                  44100,
                  tempPath,
                );

                if (tempResult.success) {
                  const profiles = options.profiles || ["all"];
                  await store.addSound({
                    name: options.name || t("editorDefaultMixName"),
                    path: tempResult.path,
                    emoji: "🎵",
                    profiles,
                  });
                  exportResults.push({ type: "library", name: options.name });
                  addToast?.(t("editorCreated"), "success");
                } else {
                  throw new Error("Library add error");
                }
              }

              setShowExportModal(false);
              return { success: true, results: exportResults };
            } catch (e) {
              logError("Editor", "Export failed", e);
              addToast?.(`${t("editorExportError")}: ${e.message}`, "error");
              return { success: false, error: e.message };
            }
          }}
          store={store}
          totalDuration={totalDuration}
          defaultName={exportName}
          tr={t}
        />
      )}

      {showTrimModal &&
        (() => {
          const clip = getClipById(tracks, trimClipId);
          if (!clip) return null;

          const duration =
            clipDurations[clip.id] || clip.duration || DEFAULT_CLIP_DURATION;

          return createPortal(
            <TrimClipModal
              isOpen={showTrimModal}
              clip={clip}
              trackId={selectedTrackId}
              clipDuration={duration}
              onClose={() => {
                setShowTrimModal(false);
                setTrimClipId(null);
              }}
              onTrim={() => {}}
              tr={t}
              addToast={addToast}
            />,
            document.body,
          );
        })()}

      {showNormalizeModal &&
        (() => {
          const clip = getClipById(tracks, normalizeClipId);
          if (!clip) return null;

          return createPortal(
            <NormalizeModal
              isOpen={showNormalizeModal}
              clip={clip}
              trackId={selectedTrackId}
              onClose={() => {
                setShowNormalizeModal(false);
                setNormalizeClipId(null);
              }}
              onNormalize={handleNormalizeWithOptions}
              tr={t}
            />,
            document.body,
          );
        })()}

      {showTimelineLoopModal &&
        createPortal(
          <TimelineLoopModal
            isOpen={showTimelineLoopModal}
            onClose={() => setShowTimelineLoopModal(false)}
            loopState={loopState}
            onApply={handleSetTimelineLoop}
            currentTime={currentTime}
            totalDuration={totalDuration}
            tr={t}
            onActivateClickMode={handleActivateTimelineClickMode}
            isClickModeActive={isTimelineClickModeActive}
            clickModeData={timelineClickData}
          />,
          document.body,
        )}

      {clipMenu && (
        <ClipActionsMenu
          clip={selectedClipForMenu}
          trackId={selectedTrackForMenu}
          position={clipMenu}
          onClose={() => {
            setClipMenu(null);
            setSelectedClipForMenu(null);
            setSelectedTrackForMenu(null);
          }}
          onSplit={(trackId, clipId) => {
            const clip = getClipById(tracks, clipId);
            if (clip) {
              const duration =
                clipDurations[clip.id] ||
                clip.duration ||
                DEFAULT_CLIP_DURATION;
              const start = clip.start || 0;
              const midPoint = start + duration / 2;
              splitClip(trackId, clipId, midPoint);
            }
            setClipMenu(null);
          }}
          onLoop={() => {
            const clip = selectedClipForMenu;
            if (clip) {
              const duration =
                clipDurations[clip.id] ||
                clip.duration ||
                DEFAULT_CLIP_DURATION;
              setLoopRegion(clip.start, clip.start + duration);
              toggleLoop();
              addToast?.(t("editorLoopSet"), "success");
            }
            setClipMenu(null);
          }}
          onTrim={(clipId) => {
            setTrimClipId(clipId);
            setShowTrimModal(true);
            setClipMenu(null);
          }}
          onNormalize={(clipId) => {
            setNormalizeClipId(clipId);
            setShowNormalizeModal(true);
            setClipMenu(null);
          }}
          onAddEffect={handleAddEffectFromMenu}
          onDuplicate={(trackId, clipId) => {
            duplicateClip(trackId, clipId);
            setClipMenu(null);
          }}
          onCopy={(clipId) => {
            const clip = getClipById(tracks, clipId);
            if (clip) handleCopyClip(clip);
            setClipMenu(null);
          }}
          onCut={(clipId) => {
            const clip = getClipById(tracks, clipId);
            if (clip) handleCutClip(clip);
            setClipMenu(null);
          }}
          onDelete={handleDeleteWithConfirm}
          onPreviewEffects={handlePreviewEffects}
          isPlaying={isPlaying}
          isLoopEnabled={loopRegion.enabled}
          tr={t}
          onToggleClipLoop={(clipId, options) => {
            toggleClipLoop(clipId, options);
          }}
          onActivateLoopManualClick={activateLoopManualClick}
          onActivateSplitManualClick={activateSplitManualClick}
          loopState={loopState}
          onMoveUp={moveClipUp}
          onMoveDown={moveClipDown}
          canMoveUp={getCanMoveUp(selectedTrackForMenu)}
          canMoveDown={getCanMoveDown(selectedTrackForMenu)}
        />
      )}
    </div>
  );
}

/**
 * Effects panel slot — renders `EditorEffectsPanel` only when a clip is
 * selected and the panel is visible.
 *
 * Extracted to module level so React Compiler can optimize it
 * (`react-hooks/static-components` rule).
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {Object|null} props.clip
 * @param {string|null} props.trackId
 * @param {Object} props.context - The `useEditor()` value.
 * @param {Function} props.updateClip
 * @param {(key: string) => string} props.tr - i18n translator.
 * @param {boolean} props.showAddMenu
 * @param {(v: boolean) => void} props.onShowAddMenuChange
 * @returns {JSX.Element|null}
 */
function EffectsPanelSlot({
  visible,
  clip,
  trackId,
  context,
  updateClip,
  tr,
  showAddMenu,
  onShowAddMenuChange,
}) {
  if (!visible || !clip) return null;

  const {
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
  } = context;

  return (
    <EditorEffectsPanel
      key={clip.id}
      clip={clip}
      trackId={trackId}
      onEffectAdd={addEffectToClip}
      onEffectRemove={removeEffectFromClip}
      onEffectUpdate={updateEffectParam}
      onEffectToggle={toggleEffect}
      onClipUpdate={updateClip}
      onFadeUpdate={setClipFade}
      tr={tr}
      showAddMenu={showAddMenu}
      onShowAddMenuChange={onShowAddMenuChange}
    />
  );
}
