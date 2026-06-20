// AudioWorklet pour la réduction de bruit avancée
class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    
    // Paramètres de réduction de bruit
    this.noiseFloor = 0.01
    this.smoothing = 0.9
    this.noiseProfile = new Float32Array(128).fill(0.01)
    this.frameCount = 0
    
    // Enveloppe de gain (pour éviter les clics)
    this.attackMs = 50
    this.releaseMs = 200
    this.attackCoeff = Math.exp(-1 / (this.attackMs * 0.001 * 128))
    this.releaseCoeff = Math.exp(-1 / (this.releaseMs * 0.001 * 128))
    this.gain = 0.1
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    
    if (!input || !input[0]) return true
    
    const channel = input[0]
    const outChannel = output[0]
    
    for (let i = 0; i < channel.length; i++) {
      const sample = channel[i]
      const absSample = Math.abs(sample)
      
      // Mise à jour du profil de bruit (période de silence)
      if (absSample < 0.02 && this.frameCount % 100 === 0) {
        const idx = i % this.noiseProfile.length
        this.noiseProfile[idx] = this.noiseProfile[idx] * 0.95 + absSample * 0.05
      }
      
      // Seuil adaptatif
      const threshold = this.noiseProfile[i % this.noiseProfile.length] * 2.5
      
      // Calcul du gain avec enveloppe
      let targetGain
      if (absSample < threshold) {
        targetGain = 0.005 // Forte atténuation du bruit
      } else {
        // Réduction progressive
        const ratio = (absSample - threshold) / (absSample + 0.001)
        targetGain = Math.min(1, Math.max(0.1, ratio))
      }
      
      // Lissage du gain (évite les clics)
      if (targetGain > this.gain) {
        this.gain = this.gain * this.attackCoeff + targetGain * (1 - this.attackCoeff)
      } else {
        this.gain = this.gain * this.releaseCoeff + targetGain * (1 - this.releaseCoeff)
      }
      
      outChannel[i] = sample * this.gain
      this.frameCount++
    }
    
    return true
  }
}

registerProcessor('noise-suppression', NoiseSuppressionProcessor)