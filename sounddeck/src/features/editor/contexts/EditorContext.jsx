// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

import { useEditorCore } from './hooks/useEditorCore'
import { useEditorAudioPlayback } from './hooks/useEditorAudioPlayback'
import { useEditorTracks } from './hooks/useEditorTracks'
import { useEditorClips } from './hooks/useEditorClips'
import { useEditorEffects } from './hooks/useEditorEffects'
import { useEditorLoops } from './hooks/useEditorLoops'
import { useEditorOverlay } from './hooks/useEditorOverlay'
import { useEditorMarkers } from './hooks/useEditorMarkers'

const EditorContext = createContext(null)

export function EditorProvider({ children, store, addToast, confirm }) {
  const { t } = useLanguage()

  const core = useEditorCore({ store, addToast, t, confirm })
  const audioPlayback = useEditorAudioPlayback(core)
  const tracks = useEditorTracks(core, audioPlayback)
  const clips = useEditorClips(core)
  const effects = useEditorEffects(core)
  const loops = useEditorLoops(core)
  const overlay = useEditorOverlay(core, loops, clips)
  const markers = useEditorMarkers(core, audioPlayback)

  const handleZoomChange = (newZoom) => {
    core.setZoomLevel(Math.max(0.05, Math.min(10, newZoom)))
  }

  const value = {
    // ─── ÉTAT ──────────────────────────────────────────────────────────
    project: core.project,
    setProject: core.setProject,
    tracks: core.project?.tracks || [],

    // ─── SÉLECTION ─────────────────────────────────────────────────────
    selectedClipId: core.selectedClipId,
    setSelectedClipId: core.setSelectedClipId,
    selectedTrackId: core.selectedTrackId,
    setSelectedTrackId: core.setSelectedTrackId,

    // ─── PLAYBACK ──────────────────────────────────────────────────────
    currentTime: core.currentTime,
    setCurrentTime: core.setCurrentTime,
    isPlaying: core.isPlaying,
    setIsPlaying: core.setIsPlaying,
    isPaused: core.isPaused,
    setIsPaused: core.setIsPaused,
    isPlayingRef: core.isPlayingRef,
    isPausedRef: core.isPausedRef,
    currentTimeRef: core.currentTimeRef,
    stopAtTime: core.stopAtTime,
    setStopAtTime: core.setStopAtTime,
    soloPlayClipId: core.soloPlayClipId,
    setSoloPlayClipId: core.setSoloPlayClipId,
    masterGain: core.masterGain,
    setMasterGain: core.setMasterGain,

    // ─── AUDIO ─────────────────────────────────────────────────────────
    play: audioPlayback.play,
    pause: audioPlayback.pause,
    resume: audioPlayback.resume,
    stop: audioPlayback.stop,
    seek: audioPlayback.seek,
    togglePlay: audioPlayback.togglePlay,
    playClipOnly: audioPlayback.playClipOnly,
    audioSourcesRef: audioPlayback.audioSourcesRef,
    audioContextRef: audioPlayback.audioContextRef,

    // ─── ZOOM / SNAP / CROSSFADE ───────────────────────────────────────
    zoomLevel: core.zoomLevel,
    setZoomLevel: core.setZoomLevel,
    handleZoomChange,
    snapEnabled: core.snapEnabled,
    setSnapEnabled: core.setSnapEnabled,
    autoCrossfade: core.autoCrossfade,
    setAutoCrossfade: core.setAutoCrossfade,

    // ─── DURÉES / WAVEFORMS ────────────────────────────────────────────
    clipDurations: core.clipDurations,
    setClipDurations: core.setClipDurations,
    waveformData: core.waveformData,
    setWaveformData: core.setWaveformData,
    isDurationsLoaded: core.isDurationsLoaded,
    totalDuration: core.totalDuration,

    // ─── ÉTAT SYSTÈME ──────────────────────────────────────────────────
    isInitialized: core.isInitialized,
    isLoading: core.isLoading,
    isDirty: core.isDirty,
    isAutoSaving: core.isAutoSaving,

    // ─── UNDO / REDO ───────────────────────────────────────────────────
    canUndoEditor: core.canUndoEditor,
    canRedoEditor: core.canRedoEditor,
    undoEditor: core.undoEditor,
    redoEditor: core.redoEditor,
    pushEditorHistoryCheckpoint: core.pushEditorHistoryCheckpoint,

    // ─── PROJET ────────────────────────────────────────────────────────
    updateEditorProjectName: core.updateEditorProjectName,
    reorderTracks: core.reorderTracks,
    loadProject: core.loadProject,
    commitProject: core.commitProject,

    confirm,

    // ─── TRACKS ────────────────────────────────────────────────────────
    addTrack: tracks.addTrack,
    removeTrack: tracks.removeTrack,
    renameTrack: tracks.renameTrack,
    muteTrack: tracks.muteTrack,
    soloTrack: tracks.soloTrack,
    setTrackVolume: tracks.setTrackVolume,

    // ─── CLIPS ─────────────────────────────────────────────────────────
    addClip: clips.addClip,
    addClipFromFile: clips.addClipFromFile,
    removeClip: clips.removeClip,
    updateClip: clips.updateClip,
    duplicateClip: clips.duplicateClip,
    moveClip: clips.moveClip,
    splitClip: clips.splitClip,
    selectClip: clips.selectClip,
    deselectClip: clips.deselectClip,

    // ─── EFFETS ────────────────────────────────────────────────────────
    addEffectToClip: effects.addEffectToClip,
    removeEffectFromClip: effects.removeEffectFromClip,
    updateEffectParam: effects.updateEffectParam,
    toggleEffect: effects.toggleEffect,
    setClipFade: effects.setClipFade,

    // ─── BOUCLES ───────────────────────────────────────────────────────
    loopState: core.loopState,
    setLoopState: core.setLoopState,
    toggleClipLoop: loops.toggleClipLoop,
    updateClipLoopOptions: loops.updateClipLoopOptions,
    setTimelineLoop: loops.setTimelineLoop,
    toggleTimelineLoop: loops.toggleTimelineLoop,
    loopRegion: core.loopRegion,
    setLoopRegion: loops.setLoopRegion,
    toggleLoop: loops.toggleLoop,
    clearLoop: loops.clearLoop,

    // ─── OVERLAY (mode clic) ───────────────────────────────────────────
    actionOverlay: core.actionOverlay,
    isActionOverlayActive: core.actionOverlay.type !== null,
    cancelActionOverlay: overlay.cancelActionOverlay,
    executeActionOverlay: overlay.executeActionOverlay,
    activateLoopManualClick: overlay.activateLoopManualClick,
    activateTimelineLoopManualClick: overlay.activateTimelineLoopManualClick,
    activateSplitManualClick: overlay.activateSplitManualClick,
    isPendingAction: core.actionOverlay.type !== null,
    pendingAction: core.actionOverlay,

    // ─── MARKERS ───────────────────────────────────────────────────────
    markers: core.project?.markers || [],
    addMarker: markers.addMarker,
    removeMarker: markers.removeMarker,
    updateMarker: markers.updateMarker,
    navigateToMarker: markers.navigateToMarker,

    // ─── DIVERS ────────────────────────────────────────────────────────
    store: core.storeRef.current,
    addToast,
    t,
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

export default EditorContext