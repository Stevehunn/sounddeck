// src/test/utils/wavEncoder.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { audioBufferToWav } from '@shared/utils/wavEncoder'

// ─── MOCK AudioBuffer ──────────────────────────────────────────────────
class MockAudioBuffer {
  constructor(channels, length, sampleRate, fill = 0.5) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this._channels = Array.from({ length: channels }, () => {
      const arr = new Float32Array(length)
      arr.fill(fill)
      return arr
    })
  }
  getChannelData(ch) {
    return this._channels[ch]
  }
}

const makeBuffer = (opts = {}) =>
  new MockAudioBuffer(
    opts.channels ?? 1,
    opts.length ?? 100,
    opts.sampleRate ?? 44100,
    opts.fill ?? 0.5
  )

describe('audioBufferToWav', () => {
  it('retourne un ArrayBuffer', () => {
    const result = audioBufferToWav(makeBuffer())
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('écrit l\'en-tête RIFF/WAVE', () => {
    const wav = audioBufferToWav(makeBuffer({ length: 100 }))
    const view = new DataView(wav)
    // "RIFF"
    expect(String.fromCharCode(view.getUint8(0))).toBe('R')
    expect(String.fromCharCode(view.getUint8(1))).toBe('I')
    expect(String.fromCharCode(view.getUint8(2))).toBe('F')
    expect(String.fromCharCode(view.getUint8(3))).toBe('F')
    // "WAVE" à offset 8
    expect(String.fromCharCode(view.getUint8(8))).toBe('W')
    expect(String.fromCharCode(view.getUint8(9))).toBe('A')
    expect(String.fromCharCode(view.getUint8(10))).toBe('V')
    expect(String.fromCharCode(view.getUint8(11))).toBe('E')
  })

  it('écrit "fmt " à offset 12', () => {
    const wav = audioBufferToWav(makeBuffer())
    const view = new DataView(wav)
    expect(String.fromCharCode(view.getUint8(12))).toBe('f')
    expect(String.fromCharCode(view.getUint8(13))).toBe('m')
    expect(String.fromCharCode(view.getUint8(14))).toBe('t')
    expect(String.fromCharCode(view.getUint8(15))).toBe(' ')
  })

  it('écrit "data" à offset 36', () => {
    const wav = audioBufferToWav(makeBuffer())
    const view = new DataView(wav)
    expect(String.fromCharCode(view.getUint8(36))).toBe('d')
    expect(String.fromCharCode(view.getUint8(37))).toBe('a')
    expect(String.fromCharCode(view.getUint8(38))).toBe('t')
    expect(String.fromCharCode(view.getUint8(39))).toBe('a')
  })

  it('taille totale = header (44) + samples × channels × 2 bytes', () => {
    const buffer = makeBuffer({ length: 100, channels: 2 })
    const wav = audioBufferToWav(buffer)
    const expectedSize = 44 + 100 * 2 * 2 // 44 + 400
    expect(wav.byteLength).toBe(expectedSize)
  })

  it('écrit le bon sampleRate dans le header', () => {
    const wav = audioBufferToWav(makeBuffer({ sampleRate: 48000 }))
    const view = new DataView(wav)
    // Offset 24 pour sampleRate
    expect(view.getUint32(24, true)).toBe(48000)
  })

  it('écrit numberOfChannels à offset 22', () => {
    const wav = audioBufferToWav(makeBuffer({ channels: 2 }))
    const view = new DataView(wav)
    expect(view.getUint16(22, true)).toBe(2)
  })

  it('bitDepth = 16 à offset 34', () => {
    const wav = audioBufferToWav(makeBuffer())
    const view = new DataView(wav)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it('format = 1 (PCM) à offset 20', () => {
    const wav = audioBufferToWav(makeBuffer())
    const view = new DataView(wav)
    expect(view.getUint16(20, true)).toBe(1)
  })

  it('clippe les samples à [-1, 1]', () => {
    const buffer = new MockAudioBuffer(1, 10, 44100)
    // Force des valeurs extrêmes
    buffer._channels[0][0] = 2.0   // > 1
    buffer._channels[0][1] = -2.0  // < -1
    buffer._channels[0][2] = 0.5
    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)
    // Sample 0 : clampé à 1 → int16 = 0x7fff
    expect(view.getInt16(44 + 0, true)).toBe(0x7fff)
    // Sample 1 : clampé à -1 → int16 = -0x8000
    expect(view.getInt16(44 + 2, true)).toBe(-0x8000)
  })

  it('encode les samples multi-canaux en alternance', () => {
    const buffer = new MockAudioBuffer(2, 4, 44100)
    buffer._channels[0].fill(0.5)
    buffer._channels[1].fill(-0.5)
    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)
    // Sample L0 = 0.5 → ~0x4000
    expect(view.getInt16(44, true)).toBeGreaterThan(0)
    // Sample R0 = -0.5 → ~-0x4000
    expect(view.getInt16(46, true)).toBeLessThan(0)
  })

  it('taille data à offset 40 = totalSize - 44', () => {
    const wav = audioBufferToWav(makeBuffer({ length: 100 }))
    const view = new DataView(wav)
    const dataSize = view.getUint32(40, true)
    expect(dataSize).toBe(wav.byteLength - 44)
  })

  it('RIFF size à offset 4 = totalSize - 8', () => {
    const wav = audioBufferToWav(makeBuffer({ length: 100 }))
    const view = new DataView(wav)
    const riffSize = view.getUint32(4, true)
    expect(riffSize).toBe(wav.byteLength - 8)
  })
})