// src/core/services/AudioCache.js
class AudioCache {
  constructor() {
    this.buffers = new Map()
    this.gainCache = new Map()
    this.waveformCache = new Map()
    this.targetRMS = 0.2
  }

  getBuffer(key) {
    return this.buffers.get(key) || null
  }

  setBuffer(key, buffer) {
    this.buffers.set(key, buffer)
    if (this.buffers.size > 100) {
      const keys = Array.from(this.buffers.keys())
      for (let i = 0; i < keys.length - 50; i++) {
        this.buffers.delete(keys[i])
      }
    }
  }

  clearBuffer(key) {
    if (key) {
      this.buffers.delete(key)
    } else {
      this.buffers.clear()
    }
  }

  getGain(filePath) {
    return this.gainCache.get(filePath) || null
  }

  setGain(filePath, gainDb) {
    this.gainCache.set(filePath, gainDb)
  }

  clearGainCache() {
    this.gainCache.clear()
  }

  getWaveform(key) {
    return this.waveformCache.get(key) || null
  }

  setWaveform(key, data) {
    this.waveformCache.set(key, data)
    if (this.waveformCache.size > 200) {
      const keys = Array.from(this.waveformCache.keys())
      for (let i = 0; i < keys.length - 100; i++) {
        this.waveformCache.delete(keys[i])
      }
    }
  }

  clearWaveformCache(key) {
    if (key) {
      const keys = Array.from(this.waveformCache.keys()).filter(k => k.startsWith(key))
      keys.forEach(k => this.waveformCache.delete(k))
    } else {
      this.waveformCache.clear()
    }
  }

  getNormalizationTarget() {
    return this.targetRMS
  }

  setNormalizationTarget(target) {
    this.targetRMS = Math.max(0.02, Math.min(1, target))
  }

  clearAll() {
    this.buffers.clear()
    this.gainCache.clear()
    this.waveformCache.clear()
  }
}

export const audioCache = new AudioCache()
export default audioCache