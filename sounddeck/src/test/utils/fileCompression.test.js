// src/test/utils/fileCompression.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import { compressFileIfNeeded } from '@shared/utils/fileCompression'

beforeEach(() => {
  global.window.electronAPI = {
    convertAudio: vi.fn(),
    deleteSoundFile: vi.fn().mockResolvedValue(undefined),
  }
})

describe('compressFileIfNeeded', () => {
  it('retourne le path original si disabled', async () => {
    const result = await compressFileIfNeeded('/a.mp3', { enabled: false })
    expect(result.success).toBe(true)
    expect(result.path).toBe('/a.mp3')
    expect(result.compressed).toBe(false)
    expect(window.electronAPI.convertAudio).not.toHaveBeenCalled()
  })

  it('retourne le path original si filePath manquant', async () => {
    const result = await compressFileIfNeeded(null, { enabled: true })
    expect(result.success).toBe(true)
    expect(result.path).toBe(null)
  })

  it('appelle onWarning si convertAudio absent', async () => {
    delete window.electronAPI.convertAudio
    const onWarning = vi.fn()
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true, onWarning })
    expect(onWarning).toHaveBeenCalledWith('convertAudio non disponible')
    expect(result.success).toBe(true)
    expect(result.compressed).toBe(false)
  })

  it('appelle onWarning si convertAudio absent + pas de onWarning', async () => {
    delete window.electronAPI.convertAudio
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true })
    expect(result.success).toBe(true)
    expect(result.compressed).toBe(false)
  })

  it('compresse un mp3', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({
      success: true,
      size: 500,
      originalSize: 1000,
    })

    const result = await compressFileIfNeeded('/a.mp3', { enabled: true, bitrate: 128 })

    expect(result.success).toBe(true)
    expect(result.compressed).toBe(true)
    expect(result.path).toBe('/a_compressed.mp3')
    expect(result.compressedSize).toBe(500)
    expect(result.compressionRatio).toBe(0.5)
    expect(window.electronAPI.convertAudio).toHaveBeenCalledWith(
      '/a.mp3',
      '/a_compressed.mp3',
      'mp3',
      128
    )
  })

  it('convertit en aac pour non-mp3', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({
      success: true,
      size: 500,
      originalSize: 1000,
    })

    await compressFileIfNeeded('/a.wav', { enabled: true })
    const [, , format] = window.electronAPI.convertAudio.mock.calls[0]
    expect(format).toBe('aac')
  })

  it('supprime l\'original si deleteOriginal=true', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({ success: true, size: 500 })
    await compressFileIfNeeded('/a.mp3', { enabled: true, deleteOriginal: true })
    expect(window.electronAPI.deleteSoundFile).toHaveBeenCalledWith('/a.mp3')
  })

  it('ne supprime PAS l\'original si deleteOriginal=false', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({ success: true, size: 500 })
    await compressFileIfNeeded('/a.mp3', { enabled: true, deleteOriginal: false })
    expect(window.electronAPI.deleteSoundFile).not.toHaveBeenCalled()
  })

  it('retourne original si conversion échoue', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({
      success: false,
      error: 'codec error',
    })
    const onWarning = vi.fn()
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true, onWarning })
    expect(result.success).toBe(true)
    expect(result.path).toBe('/a.mp3')
    expect(result.compressed).toBe(false)
    expect(onWarning).toHaveBeenCalledWith('codec error')
  })

  it('retourne original si conversion throw', async () => {
    window.electronAPI.convertAudio.mockRejectedValue(new Error('crash'))
    const onWarning = vi.fn()
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true, onWarning })
    expect(result.success).toBe(true)
    expect(result.compressed).toBe(false)
    expect(onWarning).toHaveBeenCalledWith('crash')
  })

  it('ratio=1 si originalSize non fourni', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({ success: true, size: 500 })
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true })
    expect(result.compressionRatio).toBe(1)
  })

  it('bitrate par défaut = 128', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({ success: true, size: 500 })
    await compressFileIfNeeded('/a.mp3', { enabled: true })
    const [, , , bitrate] = window.electronAPI.convertAudio.mock.calls[0]
    expect(bitrate).toBe(128)
  })

  it('appelle onWarning si suppression original throw', async () => {
    window.electronAPI.convertAudio.mockResolvedValue({ success: true, size: 500 })
    window.electronAPI.deleteSoundFile.mockRejectedValue(new Error('locked'))
    const result = await compressFileIfNeeded('/a.mp3', { enabled: true })
    // Le throw est silencieux → compression réussie
    expect(result.success).toBe(true)
    expect(result.compressed).toBe(true)
  })
})