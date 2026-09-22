// src/core/store/utils/volumeUtils.js

/**
 * Convertit un ancien volume (0-100) vers la nouvelle échelle dB (-24..+24).
 * Tolère les valeurs déjà en dB.
 *
 * @param {number|undefined|null} oldVolume
 * @returns {number} Valeur en dB
 */
export function convertOldVolumeToDb(oldVolume) {
  if (oldVolume === undefined || oldVolume === null) return 0
  // Déjà en dB ?
  if (oldVolume >= -24 && oldVolume <= 24) return oldVolume
  // Ancienne échelle 0..100 → dB centré sur 50
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