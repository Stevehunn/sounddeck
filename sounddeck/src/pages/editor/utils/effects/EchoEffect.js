// src/pages/editor/utils/effects/EchoEffect.js

/**
 * Effet Écho (Delay) - Utilise DelayNode
 */
export class EchoEffect {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.delayNode = null
    this.feedbackNode = null
    this.dryGain = null
    this.wetGain = null
    this.outputGain = null
    this.clipId = null
    this.params = { delay: 0.3, decay: 0.5, mix: 0.3 }
  }

  /**
   * Crée et configure l'écho
   * @param {AudioNode} inputNode - Nœud d'entrée
   * @param {string} clipId - ID du clip
   * @param {Object} params - Paramètres
   */
  createNode(inputNode, clipId, params = {}) {
    this.clipId = clipId
    this.params = { ...this.params, ...params }
    const { delay, decay, mix } = this.params

    // Delay node
    this.delayNode = this.audioContext.createDelay()
    this.delayNode.delayTime.value = Math.max(0.05, Math.min(3, delay))

    // Feedback node
    this.feedbackNode = this.audioContext.createGain()
    this.feedbackNode.gain.value = Math.max(0, Math.min(1, decay))

    // Wet/Dry gains
    this.dryGain = this.audioContext.createGain()
    this.dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))

    this.wetGain = this.audioContext.createGain()
    this.wetGain.gain.value = Math.max(0, Math.min(1, mix))

    // Output node
    this.outputGain = this.audioContext.createGain()

    // Chaînage
    inputNode.connect(this.dryGain)
    inputNode.connect(this.delayNode)
    this.delayNode.connect(this.feedbackNode)
    this.feedbackNode.connect(this.delayNode)
    this.delayNode.connect(this.wetGain)

    this.dryGain.connect(this.outputGain)
    this.wetGain.connect(this.outputGain)

    console.log(`  🔄 Echo: delay=${delay.toFixed(2)}s, decay=${decay.toFixed(2)}, mix=${mix.toFixed(2)}`)

    return this.outputGain
  }

  /**
   * Met à jour les paramètres
   */
  update(params = {}) {
    this.params = { ...this.params, ...params }
    const { delay, decay, mix } = this.params

    if (delay !== undefined && this.delayNode) {
      this.delayNode.delayTime.value = Math.max(0.05, Math.min(3, delay))
    }
    if (decay !== undefined && this.feedbackNode) {
      this.feedbackNode.gain.value = Math.max(0, Math.min(1, decay))
    }
    if (mix !== undefined && this.dryGain && this.wetGain) {
      this.dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))
      this.wetGain.gain.value = Math.max(0, Math.min(1, mix))
    }
    console.log(`  🔄 Echo mis à jour: delay=${delay?.toFixed(2)}s, decay=${decay?.toFixed(2)}, mix=${mix?.toFixed(2)}`)
  }

  /**
   * Nettoie
   */
  dispose() {
    const nodes = [this.delayNode, this.feedbackNode, this.dryGain, this.wetGain, this.outputGain]
    for (const node of nodes) {
      if (node) {
        try {
          node.disconnect()
        } catch (e) {}
      }
    }
    this.delayNode = null
    this.feedbackNode = null
    this.dryGain = null
    this.wetGain = null
    this.outputGain = null
    this.clipId = null
  }
}