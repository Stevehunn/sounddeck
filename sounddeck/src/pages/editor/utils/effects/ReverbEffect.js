// src/pages/editor/utils/effects/ReverbEffect.js

import { generateImpulseResponse } from '../../hooks/audioUtils'

/**
 * Effet Réverbération - Utilise ConvolverNode
 */
export class ReverbEffect {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.convolver = null
    this.dryGain = null
    this.wetGain = null
    this.outputGain = null
    this.clipId = null
    this.params = { roomSize: 0.5, mix: 0.3 }
  }

  /**
   * Crée et configure la réverbération
   * @param {AudioNode} inputNode - Nœud d'entrée
   * @param {string} clipId - ID du clip
   * @param {Object} params - Paramètres
   */
  createNode(inputNode, clipId, params = {}) {
    this.clipId = clipId
    this.params = { ...this.params, ...params }
    const { roomSize, mix } = this.params

    // Convolver node
    this.convolver = this.audioContext.createConvolver()
    const impulseBuffer = generateImpulseResponse(this.audioContext, roomSize)
    this.convolver.buffer = impulseBuffer

    // Wet/Dry gains
    this.dryGain = this.audioContext.createGain()
    this.dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))

    this.wetGain = this.audioContext.createGain()
    this.wetGain.gain.value = Math.max(0, Math.min(1, mix))

    // Output node
    this.outputGain = this.audioContext.createGain()

    // Chaînage
    inputNode.connect(this.dryGain)
    inputNode.connect(this.convolver)
    this.convolver.connect(this.wetGain)

    this.dryGain.connect(this.outputGain)
    this.wetGain.connect(this.outputGain)

    console.log(`  🌊 Reverb: roomSize=${roomSize.toFixed(2)}, mix=${mix.toFixed(2)}`)

    return this.outputGain
  }

  /**
   * Met à jour les paramètres
   */
  update(params = {}) {
    this.params = { ...this.params, ...params }
    const { roomSize, mix } = this.params

    if (roomSize !== undefined && this.convolver) {
      const impulseBuffer = generateImpulseResponse(this.audioContext, roomSize)
      this.convolver.buffer = impulseBuffer
    }
    if (mix !== undefined && this.dryGain && this.wetGain) {
      this.dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))
      this.wetGain.gain.value = Math.max(0, Math.min(1, mix))
    }
    console.log(`  🌊 Reverb mis à jour: roomSize=${roomSize?.toFixed(2)}, mix=${mix?.toFixed(2)}`)
  }

  /**
   * Nettoie
   */
  dispose() {
    const nodes = [this.convolver, this.dryGain, this.wetGain, this.outputGain]
    for (const node of nodes) {
      if (node) {
        try {
          node.disconnect()
        } catch (e) {}
      }
    }
    this.convolver = null
    this.dryGain = null
    this.wetGain = null
    this.outputGain = null
    this.clipId = null
  }
}