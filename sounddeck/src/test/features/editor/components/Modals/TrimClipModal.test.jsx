import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    currentLang: 'fr',
  }),
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: (p) => `sounddeck-local://file/${p}`,
}))

// Mock Waveform pour éviter les fetch/RAF internes
vi.mock('@shared/components/audio/Waveform', () => ({
  default: ({ start, end, onStartChange, onEndChange, onSeek }) => (
    <div data-testid="mock-waveform">
      <span data-testid="waveform-start">{start}</span>
      <span data-testid="waveform-end">{end}</span>
      <button
        data-testid="waveform-change-start"
        onClick={() => onStartChange?.(1.5)}
      >
        start
      </button>
      <button
        data-testid="waveform-change-end"
        onClick={() => onEndChange?.(2.5)}
      >
        end
      </button>
      <button data-testid="waveform-seek" onClick={() => onSeek?.(1.0)}>
        seek
      </button>
    </div>
  ),
  formatTime: (s) => `${s}s`,
}))

import TrimClipModal from '@features/editor/components/Modals/TrimClipModal'

describe('TrimClipModal', () => {
  let onClose
  let onTrim
  let tr
  let addToast
  let clip
  let mockCtx

  const defaultProps = () => ({
    isOpen: true,
    clip,
    trackId: 't1',
    clipDuration: 5,
    onClose,
    onTrim,
    tr,
    addToast,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onTrim = vi.fn()
    tr = vi.fn((key) => key)
    addToast = vi.fn()
    clip = {
      id: 'c1',
      name: 'Mon Clip',
      path: '/a.mp3',
    }

    // Mock AudioContext
    mockCtx = {
      state: 'running',
      currentTime: 0,
      destination: { name: 'destination' },
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue({
        duration: 5,
        sampleRate: 44100,
        length: 220500,
      }),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      })),
      createGain: vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn(),
      })),
    }

    global.AudioContext = vi.fn(() => mockCtx)
    global.webkitAudioContext = global.AudioContext

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    })

    // Mock electronAPI
    window.electronAPI = {
      trimSoundFile: vi.fn().mockResolvedValue({
        success: true,
        path: '/trimmed.mp3',
      }),
    }
  })

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <TrimClipModal {...defaultProps()} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait retourner null si clip absent', () => {
    const { container } = render(
      <TrimClipModal {...defaultProps()} clip={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal-overlay', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  it('devrait afficher le titre', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    const title = container.querySelector('.modal-title')
    expect(title?.textContent).toContain('editorTrim')
  })

  it('devrait afficher le nom du clip', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    expect(container.textContent).toContain('Mon Clip')
  })

  it('devrait rendre le Waveform mocké', () => {
    const { getByTestId } = render(<TrimClipModal {...defaultProps()} />)
    expect(getByTestId('mock-waveform')).toBeInTheDocument()
  })

  it('devrait initialiser start=0 et end=clipDuration', () => {
    const { getByTestId } = render(<TrimClipModal {...defaultProps()} />)
    expect(getByTestId('waveform-start').textContent).toBe('0')
    expect(getByTestId('waveform-end').textContent).toBe('5')
  })

  it('devrait mettre à jour start via Waveform', () => {
    const { getByTestId } = render(<TrimClipModal {...defaultProps()} />)
    fireEvent.click(getByTestId('waveform-change-start'))
    expect(getByTestId('waveform-start').textContent).toBe('1.5')
  })

  it('devrait mettre à jour end via Waveform', () => {
    const { getByTestId } = render(<TrimClipModal {...defaultProps()} />)
    fireEvent.click(getByTestId('waveform-change-end'))
    expect(getByTestId('waveform-end').textContent).toBe('2.5')
  })

  it('devrait avoir 2 sliders start/end', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    const ranges = container.querySelectorAll('input[type="range"]')
    expect(ranges.length).toBe(2)
  })

  it('devrait appeler electronAPI.trimSoundFile au click Rogner', async () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    // ✅ Flush loadAudio initial
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(window.electronAPI.trimSoundFile).toHaveBeenCalledWith(
      '/a.mp3',
      0,
      5
    )
  })

  it('devrait appeler onTrim au succès', async () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(onTrim).toHaveBeenCalledWith('t1', 'c1', '/trimmed.mp3', 5)
  })

  it('devrait appeler onClose au succès', async () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('devrait toaster en cas de warning', async () => {
    window.electronAPI.trimSoundFile.mockResolvedValue({
      success: true,
      path: '/trimmed.mp3',
      warning: 'ffmpeg approximatif',
    })
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(addToast).toHaveBeenCalledWith('ffmpeg approximatif', 'warning')
  })

  // ✅ FIX : vérifier addToast (immuable) au lieu du DOM (loadAudio peut écraser error)
  it('devrait appeler addToast en cas de success=false', async () => {
    window.electronAPI.trimSoundFile.mockResolvedValue({
      success: false,
      error: 'ffmpeg missing',
    })
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    // ✅ Flush le loadAudio initial (fetch + decodeAudioData)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('ffmpeg missing'),
      'error'
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(onTrim).not.toHaveBeenCalled()
  })

  // ✅ FIX : vérifier addToast
  it('devrait appeler addToast en cas de throw', async () => {
    window.electronAPI.trimSoundFile.mockRejectedValue(new Error('crash'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    // ✅ Flush le loadAudio initial
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('crash'),
      'error'
    )
    expect(onClose).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  // ✅ FIX : vérifier l'absence d'appels onTrim/onClose plutôt que le message DOM
  it('devrait ne rien faire si trimSoundFile absent', async () => {
    delete window.electronAPI.trimSoundFile
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    // ✅ Flush le loadAudio initial
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )

    await act(async () => {
      fireEvent.click(trimBtn)
    })

    expect(onTrim).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // Le bouton reste enabled après le finally
    expect(trimBtn?.disabled).toBe(false)
  })

  it('devrait appeler onClose au click overlay', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler onClose au click Annuler', () => {
    const { getByText } = render(<TrimClipModal {...defaultProps()} />)
    fireEvent.click(getByText('cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait avoir un bouton Écouter', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    const listenBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('listenSelection')
    )
    expect(listenBtn).not.toBeNull()
  })

  it('devrait avoir un bouton Select All', () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    const selectAllBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('selectAll')
    )
    expect(selectAllBtn).not.toBeNull()
  })

  it('devrait désactiver le trim si durée < 0.05', () => {
    const { container } = render(
      <TrimClipModal {...defaultProps()} clipDuration={0.03} />
    )
    const trimBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('editorTrim')
    )
    expect(trimBtn?.disabled).toBe(true)
  })

  it('devrait togglePlay sans crash si audio pas chargé', async () => {
    const { container } = render(<TrimClipModal {...defaultProps()} />)
    const playBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('listenSelection')
    )

    await act(async () => {
      fireEvent.click(playBtn)
    })

    expect(container).not.toBeNull()
  })
})