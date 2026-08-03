// src/pages/editor/utils/effects/FadeEffect.js

/**
 * Effet Fade In/Out - Utilise le gain node
 */
export class FadeEffect {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.gainNode = null
    this.clipId = null
    this.fadeInDuration = 0
    this.fadeOutDuration = 0
    this.fadeOutClipId = null
    this.fadeOutDurationStored = 0
  }

  /**
   * Applique le fade in
   * @param {GainNode} gainNode - Nœud de gain
   * @param {string} clipId - ID du clip
   * @param {number} duration - Durée du fade en secondes
   */
  applyFadeIn(gainNode, clipId, duration) {
    this.gainNode = gainNode
    this.clipId = clipId
    this.fadeInDuration = duration

    if (duration > 0 && gainNode) {
      const now = this.audioContext.currentTime
      const targetGain = gainNode.gain.value
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(targetGain, now + duration)
      console.log(`  🌅 Fade In: ${duration.toFixed(2)}s`)
    }
  }

  /**
   * Stocke les paramètres du fade out
   */
  setFadeOutParams(clipId, duration) {
    this.fadeOutClipId = clipId
    this.fadeOutDurationStored = duration
  }

  /**
   * Applique le fade out
   * @param {GainNode} gainNode - Nœud de gain
   * @param {string} clipId - ID du clip
   * @param {number} currentTime - Temps actuel
   * @param {number} clipDuration - Durée du clip
   * @param {number} clipStart - Début du clip
   */
  applyFadeOut(gainNode, clipId, currentTime, clipDuration, clipStart) {
    if (clipId !== this.fadeOutClipId) return
    if (this.fadeOutDurationStored <= 0 || !gainNode) return

    const offset = currentTime - clipStart
    const timeFromEnd = clipDuration - offset

    if (timeFromEnd > 0 && timeFromEnd < this.fadeOutDurationStored) {
      const fadeProgress = timeFromEnd / this.fadeOutDurationStored
      const currentGain = gainNode.gain.value
      const targetGain = currentGain * fadeProgress
      gainNode.gain.value = Math.max(0, targetGain)
    }
  }

  /**
   * Nettoie
   */
  dispose() {
    this.gainNode = null
    this.clipId = null
    this.fadeInDuration = 0
    this.fadeOutDuration = 0
    this.fadeOutClipId = null
    this.fadeOutDurationStored = 0
  }
}