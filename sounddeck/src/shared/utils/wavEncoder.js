/**
 * @file WAV encoder (16-bit PCM).
 *
 * Converts a Web Audio `AudioBuffer` to a standard `.wav` file (RIFF/WAVE,
 * PCM 16-bit little-endian). Used by:
 * - **`mixdown.js`** — exports the final mix.
 * - **`normalizeUtils.js`** — writes the normalized file.
 *
 * The output respects the Web Audio spec:
 * - `fmt ` chunk with `AudioFormat = 1` (PCM).
 * - `data` chunk with interleaved 16-bit samples.
 * - Handles mono, stereo, and multichannel buffers.
 *
 * @see https://ccrma.stanford.edu/courses/422-winter-2014/notes/WaveFileFormat.pdf
 * @see @shared/utils/mixdown.js
 * @see @shared/utils/normalizeUtils.js
 */

/**
 * Converts an `AudioBuffer` to a WAV `ArrayBuffer` (16-bit PCM).
 *
 * @param {AudioBuffer} buffer
 * @returns {ArrayBuffer} WAV file (44-byte header + PCM data).
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

/**
 * Writes an ASCII string into a `DataView` (used for RIFF chunk IDs).
 *
 * @param {DataView} view
 * @param {number} offset
 * @param {string} string
 * @returns {void}
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

export default { audioBufferToWav }