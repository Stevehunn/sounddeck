// src/shared/utils/wavEncoder.js

/**
 * Convertit un AudioBuffer en fichier WAV (ArrayBuffer, 16-bit PCM)
 * Utilisé par mixdown et normalizeUtils.
 */
export function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const samples = buffer.length
  const dataSize = samples * numChannels * bytesPerSample
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const wav = new ArrayBuffer(totalSize)
  const view = new DataView(wav)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)

  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const offset = 44
  const dataView = new DataView(wav, offset)

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    let idx = channel * bytesPerSample

    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      dataView.setInt16(idx + i * blockAlign, int16, true)
    }
  }

  return wav
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

export default { audioBufferToWav }