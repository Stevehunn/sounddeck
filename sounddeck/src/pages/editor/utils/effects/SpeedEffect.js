// src/pages/editor/utils/effects/SpeedEffect.js

/**
 * Effet Vitesse - Utilise playbackRate sur la source
 * ⚠️ MODIFIE AUSSI LA HAUTEUR (effet vinyle)
 */
export class SpeedEffect {
  constructor() {
    this.source = null
    this.clipId = null
    this.value = 1
  }

  /**
   * Applique la vitesse à la source
   * @param {AudioBufferSourceNode} source - Source audio
   * @param {string} clipId - ID du clip
   * @param {number} value - Valeur de vitesse (0.1 à 4)
   */
  apply(source, clipId, value) {
    this.source = source
    this.clipId = clipId
    this.value = Math.max(0.1, Math.min(4, value))
    this.source.playbackRate.value = this.value
    console.log(`  🏃 SPEED appliqué: ${this.value.toFixed(2)}x sur ${clipId}`)
    console.log(`  📊 Source playbackRate:`, this.source.playbackRate.value)
  }

  /**
   * Met à jour la vitesse
   * @param {number} value - Nouvelle valeur de vitesse
   */
  update(value) {
    this.value = Math.max(0.1, Math.min(4, value))
    if (this.source) {
      this.source.playbackRate.value = this.value
      console.log(`  🏃 SPEED mis à jour: ${this.value.toFixed(2)}x`)
    }
  }

  /**
   * Nettoie
   */
  dispose() {
    this.source = null
    this.clipId = null
    this.value = 1
  }
}