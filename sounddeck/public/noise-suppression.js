// public/noise-suppression.js
/**
 * AudioWorklet pour la réduction de bruit en temps réel
 * Utilisé par le mixeur audio de SoundDeck
 */
class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.noiseFloor = 0.01
    this.smoothing = 0.8
    this.attack = 0.01
    this.release = 0.1
    this.envelope = 0
    this.gain = 1
    this.sampleRate = 48000
    
    // Paramètres configurables
    this.threshold = -50 // dB
    this.ratio = 4
    this.knee = 10
    
    this.port.onmessage = (event) => {
      if (event.data.threshold !== undefined) {
        this.threshold = event.data.threshold
      }
      if (event.data.ratio !== undefined) {
        this.ratio = event.data.ratio
      }
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    
    if (!input || !input[0]) return true
    
    const channelData = input[0]
    const outputData = output[0]
    
    // Calcul du niveau RMS
    let rms = 0
    for (let i = 0; i < channelData.length; i++) {
      rms += channelData[i] * channelData[i]
    }
    rms = Math.sqrt(rms / channelData.length)
    
    // Seuil en dB
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10))
    
    // Calcul du gain
    let gain = 1
    if (rmsDb > this.threshold) {
      const excess = rmsDb - this.threshold
      const gainDb = -excess * (1 - 1/this.ratio)
      gain = Math.pow(10, gainDb / 20)
    }
    
    // Lissage (attack/release)
    const attackCoef = Math.exp(-1 / (this.attack * this.sampleRate))
    const releaseCoef = Math.exp(-1 / (this.release * this.sampleRate))
    const coef = this.gain > gain ? attackCoef : releaseCoef
    this.gain = this.gain * coef + gain * (1 - coef)
    
    // Application
    for (let i = 0; i < channelData.length; i++) {
      outputData[i] = channelData[i] * this.gain
    }
    
    return true
  }
}

registerProcessor('noise-suppression', NoiseSuppressionProcessor)