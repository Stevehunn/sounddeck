// src/core/i18n/locales/en/editorToasts.js
export default {
  // ─── SOUNDS / CLIPS ───────────────────────────────────────────────────
  editorToastSoundNotFound: 'Sound not found',
  editorToastClipNotFound: 'Clip not found',
  editorToastNoProject: 'No project',
  editorToastNoFileSelected: 'No file selected',
  editorToastStoreNotAvailable: 'Store unavailable',
  editorToastClipAdded: '"{name}" added',
  editorToastClipRemoved: 'Clip removed',
  editorToastClipDuplicated: 'Clip duplicated',
  editorToastClipSplitAt: 'Clip "{name}" split at {time}s',
  editorToastClipSplitTooClose: 'Split position too close to the edge',
  editorToastClipSplitInvalid: 'Invalid split position',
  editorToastClipAddError: 'Error adding clip: {error}',
  editorToastFileImported: '"{name}" imported',
  editorToastFileImportError: 'Error importing file',

  // ─── TRACKS ───────────────────────────────────────────────────────────
  editorToastTrackNotFound: 'Track not found',
  editorToastTrackAdded: '"{name}" added',
  editorToastTrackRemoved: 'Track "{name}" removed',
  editorToastTrackAddError: 'Error adding track: {error}',
  editorToastLastTrack: 'Cannot delete the last track',
  editorToastDeleteTrackWithClips: 'Track "{name}" contains {count} clip(s). Delete anyway?',

  // ─── LOOPS ────────────────────────────────────────────────────────────
  editorToastLoopDisabledOn: 'Loop disabled on "{name}"',
  editorToastLoopEnabledOn: 'Loop enabled on "{name}"',
  editorToastLoopUntilEndOfTrack: ' (until end of track)',
  editorToastLoopWithCycles: ' ({count} cycles)',
  editorToastLoopWithDuration: ' ({duration}s)',
  editorToastLoopWithClick: ' (click on timeline)',
  editorToastLoopDefinedUntil: '🔄 Loop set until {duration}s',
  editorToastLoopStartDefined: '🖱️ Start set at {time}s (2/3)',
  editorToastLoopEndDefined: '🖱️ End set at {time}s (3/3)',
  editorToastLoopEndMustBeAfterStart: '⚠️ End must be after start',
  editorToastLoopDefined: '✅ Loop set: {start}s → {end}s',
  editorToastLoopDurationTooShort: '⚠️ Duration must be at least 0.1s',

  // ─── CLICK MODE ───────────────────────────────────────────────────────
  editorToastClickModeActivated: '🖱️ Click mode enabled',
  editorToastClickModeStep1: '🖱️ Click mode enabled - Step 1/3',
  editorToastSplitClickModeActivated: '✂️ Click mode enabled',

  // ─── MARKERS ──────────────────────────────────────────────────────────
  editorToastMarkerAdded: 'Marker "{name}" added',
  editorToastMarkerRemoved: 'Marker "{name}" removed',
}