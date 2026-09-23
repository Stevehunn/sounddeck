// src/core/i18n/locales/es/editorToasts.js
export default {
  // ─── SONIDOS / CLIPS ──────────────────────────────────────────────────
  editorToastSoundNotFound: 'Sonido no encontrado',
  editorToastClipNotFound: 'Clip no encontrado',
  editorToastNoProject: 'Sin proyecto',
  editorToastNoFileSelected: 'Ningún archivo seleccionado',
  editorToastStoreNotAvailable: 'Store no disponible',
  editorToastClipAdded: '"{name}" añadido',
  editorToastClipRemoved: 'Clip eliminado',
  editorToastClipDuplicated: 'Clip duplicado',
  editorToastClipSplitAt: 'Clip "{name}" dividido en {time}s',
  editorToastClipSplitTooClose: 'Posición de corte demasiado cerca del borde',
  editorToastClipSplitInvalid: 'Posición de corte inválida',
  editorToastClipAddError: 'Error al añadir el clip: {error}',
  editorToastFileImported: '"{name}" importado',
  editorToastFileImportError: 'Error al importar el archivo',

  // ─── PISTAS ───────────────────────────────────────────────────────────
  editorToastTrackNotFound: 'Pista no encontrada',
  editorToastTrackAdded: '"{name}" añadida',
  editorToastTrackRemoved: 'Pista "{name}" eliminada',
  editorToastTrackAddError: 'Error al añadir la pista: {error}',
  editorToastLastTrack: 'No se puede eliminar la última pista',
  editorToastDeleteTrackWithClips: 'La pista "{name}" contiene {count} clip(s). ¿Eliminar de todos modos?',

  // ─── BUCLES ───────────────────────────────────────────────────────────
  editorToastLoopDisabledOn: 'Bucle desactivado en "{name}"',
  editorToastLoopEnabledOn: 'Bucle activado en "{name}"',
  editorToastLoopUntilEndOfTrack: ' (hasta el final de la pista)',
  editorToastLoopWithCycles: ' ({count} ciclos)',
  editorToastLoopWithDuration: ' ({duration}s)',
  editorToastLoopWithClick: ' (clic en la línea de tiempo)',
  editorToastLoopDefinedUntil: '🔄 Bucle definido hasta {duration}s',
  editorToastLoopStartDefined: '🖱️ Inicio definido en {time}s (2/3)',
  editorToastLoopEndDefined: '🖱️ Fin definido en {time}s (3/3)',
  editorToastLoopEndMustBeAfterStart: '⚠️ El fin debe ser después del inicio',
  editorToastLoopDefined: '✅ Bucle definido: {start}s → {end}s',
  editorToastLoopDurationTooShort: '⚠️ La duración debe ser al menos 0.1s',

  // ─── MODO CLIC ────────────────────────────────────────────────────────
  editorToastClickModeActivated: '🖱️ Modo clic activado',
  editorToastClickModeStep1: '🖱️ Modo clic activado - Paso 1/3',
  editorToastSplitClickModeActivated: '✂️ Modo clic activado',

  // ─── MARCADORES ───────────────────────────────────────────────────────
  editorToastMarkerAdded: 'Marcador "{name}" añadido',
  editorToastMarkerRemoved: 'Marcador "{name}" eliminado',
}