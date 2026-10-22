/**
 * @file Volume migration helpers (legacy 0-100 → new dB scale).
 *
 * Before v1.3, volumes were stored as a linear 0-100 value. Starting with
 * v1.3, the app uses a dB scale (-24 to +24) where 0 dB is "neutral"
 * (the sound's native loudness) — matching how Discord handles per-user
 * volume.
 *
 * `migrateSoundVolume(sound)` is called on every sound at hydration time
 * (see `store/index.js`): it's a **no-op** for sounds that already have
 * `volumeDb`, and a **one-shot migration** for legacy sounds.
 *
 * @see src/core/store/index.js (hydration)
 * @see @shared/utils/audioContext.js (uses `volumeDb` for playback)
 */

/**
 * Converts a legacy 0-100 volume to the new dB scale (-24..+24).
 *
 * The mapping is linear: 0 → -24 dB, 50 → 0 dB, 100 → +24 dB.
 *
 * ⚠️ NOTE: `0` is ambiguous — it could mean "0% of the old system" OR
 * "0 dB". The current implementation treats `0` as **already in dB**
 * (returned as-is). Consequence: a silent legacy sound (0%) becomes
 * 0 dB (neutral). Revisit if users report this edge case.
 *
 * @param {number|undefined|null} oldVolume
 * @returns {number} Volume in dB.
 */
export function convertOldVolumeToDb(oldVolume) {
  if (oldVolume === undefined || oldVolume === null) return 0
  if (oldVolume >= -24 && oldVolume <= 24) return oldVolume
  return Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
}

/**
 * Applies the volume migration to a sound object.
 *
 * Returns the sound unchanged if `volumeDb` is already defined (new
 * schema). Otherwise, computes `volumeDb` from the legacy `volume`
 * field and mirrors the result back to `volume` for compatibility.
 *
 * @param {Object} sound
 * @returns {Object} A new sound object (or the original if already migrated).
 */
export function migrateSoundVolume(sound) {
  if (!sound) return sound
  if (sound.volumeDb !== undefined) return sound
  const oldVolume = sound.volume ?? 100
  const newDb = convertOldVolumeToDb(oldVolume)
  return { ...sound, volume: newDb, volumeDb: newDb }
}

export default { convertOldVolumeToDb, migrateSoundVolume }