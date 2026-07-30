// src/pages/editor/utils/effects/VolumeEffect.js

/**
 * Effet Volume - Utilise un GainNode
 * La valeur est linéaire (0 à 5)
 */
export class VolumeEffect {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.gainNode = null
    this.clipId = null
    this.value = 1
  }

  /**
   * Crée et configure le nœud de gain
   * @param {string} clipId - ID du clip
   * @param {number} value - Valeur linéaire (0 à 5)
   * @param {AudioNode} inputNode - Nœud d'entrée (optionnel)
   * @returns {GainNode} Le nœud de gain
   */
  createNode(clipId, value, inputNode = null) {
    this.clipId = clipId
    this.gainNode = this.audioContext.createGain()
    this.update(value)
    
    // Si un nœud d'entrée est fourni, connecter
    if (inputNode) {
      inputNode.connect(this.gainNode)
    }
    
    return this.gainNode
  }

  /**
   * Met à jour la valeur du volume
   * @param {number} value - Valeur linéaire (0 à 5)
   */
  update(value) {
    this.value = value
    if (this.gainNode) {
      const clampedValue = Math.max(0, Math.min(5, value))
      this.gainNode.gain.value = clampedValue
    }
  }

  /**
   * Applique le volume sur un gainNode existant
   * @param {GainNode} gainNode - Nœud de gain existant
   * @param {number} value - Valeur linéaire (0 à 5)
   */
  applyToGainNode(gainNode, value) {
    this.gainNode = gainNode
    this.update(value)
  }

  /**
   * Nettoie le nœud
   */
  dispose() {
    if (this.gainNode) {
      try {
        this.gainNode.disconnect()
      } catch (e) {
        // Ignorer les erreurs de déconnexion
      }
      this.gainNode = null
    }
    this.clipId = null
    this.value = 1
  }

  /**
   * Récupère la valeur actuelle
   */
  getValue() {
    return this.value
  }
}

export default VolumeEffect