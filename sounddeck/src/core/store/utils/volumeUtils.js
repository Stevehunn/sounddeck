// src/core/store/utils/volumeUtils.js

/**
 * Convertit un ancien volume (0-100) vers la nouvelle échelle dB (-24..+24).
 * Tolère les valeurs déjà en dB.
 *
 * @param {number|undefined|null} oldVolume
 * @returns {number} Valeur en dB
 */
// ⚠️ NOTE : `0` est ambigu — peut signifier 0% de l'ancien système OU 0 dB.
// Le choix actuel : 0 est traité comme "déjà en dB" (retourné tel quel).
// Conséquence : un ancien volume muet (0%) devient 0 dB (neutre).
// À revoir si des utilisateurs remontent ce cas.
export function convertOldVolumeToDb(oldVolume) {
  if (oldVolume === undefined || oldVolume === null) return 0
  if (oldVolume >= -24 && oldVolume <= 24) return oldVolume
  return Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
}

/**
 * Applique la migration à un objet sound.
 * Retourne l'objet inchangé si `volumeDb` est déjà défini.
 *
 * @param {Object} sound
 * @returns {Object}
 */
export function migrateSoundVolume(sound) {
  if (!sound) return sound
  if (sound.volumeDb !== undefined) return sound
  const oldVolume = sound.volume ?? 100
  const newDb = convertOldVolumeToDb(oldVolume)
  return { ...sound, volume: newDb, volumeDb: newDb }
}

export default { convertOldVolumeToDb, migrateSoundVolume }