// src/core/i18n/locales/fr/editorToasts.js
// Messages de toast du contexte Editor (hooks useEditor*)
export default {
  // ─── SONS / CLIPS ─────────────────────────────────────────────────────
  editorToastSoundNotFound: 'Son non trouvé',
  editorToastClipNotFound: 'Clip non trouvé',
  editorToastNoProject: 'Aucun projet',
  editorToastNoFileSelected: 'Aucun fichier sélectionné',
  editorToastStoreNotAvailable: 'Store non disponible',
  editorToastClipAdded: '"{name}" ajouté',
  editorToastClipRemoved: 'Clip supprimé',
  editorToastClipDuplicated: 'Clip dupliqué',
  editorToastClipSplitAt: 'Clip "{name}" coupé à {time}s',
  editorToastClipSplitTooClose: 'Position de coupe trop proche du bord',
  editorToastClipSplitInvalid: 'Position invalide pour couper le clip',
  editorToastClipAddError: 'Erreur lors de l\'ajout du clip : {error}',
  editorToastFileImported: '"{name}" importé',
  editorToastFileImportError: 'Erreur lors de l\'import du fichier',

  // ─── PISTES ───────────────────────────────────────────────────────────
  editorToastTrackNotFound: 'Piste non trouvée',
  editorToastTrackAdded: '"{name}" ajoutée',
  editorToastTrackRemoved: 'Piste "{name}" supprimée',
  editorToastTrackAddError: 'Erreur lors de l\'ajout de la piste : {error}',
  editorToastLastTrack: 'Impossible de supprimer la dernière piste',
  editorToastDeleteTrackWithClips: 'La piste "{name}" contient {count} clip(s). Voulez-vous vraiment la supprimer ?',

  // ─── BOUCLES ──────────────────────────────────────────────────────────
  editorToastLoopDisabledOn: 'Boucle désactivée sur "{name}"',
  editorToastLoopEnabledOn: 'Boucle activée sur "{name}"',
  editorToastLoopUntilEndOfTrack: ' (jusqu\'à la fin de la piste)',
  editorToastLoopWithCycles: ' ({count} cycles)',
  editorToastLoopWithDuration: ' ({duration}s)',
  editorToastLoopWithClick: ' (clic sur la timeline)',
  editorToastLoopDefinedUntil: '🔄 Boucle définie jusqu\'à {duration}s',
  editorToastLoopStartDefined: '🖱️ Début défini à {time}s (2/3)',
  editorToastLoopEndDefined: '🖱️ Fin définie à {time}s (3/3)',
  editorToastLoopEndMustBeAfterStart: '⚠️ La fin doit être après le début',
  editorToastLoopDefined: '✅ Boucle définie : {start}s → {end}s',
  editorToastLoopDurationTooShort: '⚠️ La durée doit être d\'au moins 0.1s',

  // ─── MODE CLIC ────────────────────────────────────────────────────────
  editorToastClickModeActivated: '🖱️ Mode clic activé',
  editorToastClickModeStep1: '🖱️ Mode clic activé - Étape 1/3',
  editorToastSplitClickModeActivated: '✂️ Mode clic activé',

  // ─── MARQUEURS ────────────────────────────────────────────────────────
  editorToastMarkerAdded: 'Marqueur "{name}" ajouté',
  editorToastMarkerRemoved: 'Marqueur "{name}" supprimé',
}