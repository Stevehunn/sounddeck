import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AudioTrimmer from '@shared/components/audio/AudioTrimmer'

// ✅ Mock i18n
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key, params) => {
      const translations = {
        trimmerTrimTitle: 'Rogner le son',
        trimmerRegionSelectedWithDuration: `Sélection: ${params?.start || ''} → ${params?.end || ''}`,
        trimmerStartLabel: `Début : ${params?.time || ''}`,
        trimmerEndLabel: `Fin : ${params?.time || ''}`,
        trimmerPause: 'Pause',
        trimmerPlaySelection: 'Écouter la sélection',
        trimmerProcessing: 'Rognage...',
        trimmerConfirm: 'Confirmer',
        trimmerError: 'Erreur',
        trimmerErrorWithDetail: `Erreur : ${params?.error || ''}`,
        trimmerInstallFfmpeg: 'Installez ffmpeg-static via npm pour un rognage précis.',
        back: 'Retour',
        cancel: 'Annuler',
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

// Mock API Electron
const mockElectronAPI = {
  trimSoundFile: vi.fn().mockResolvedValue({ success: true, path: '/fake/trimmed.mp3' }),
}
window.electronAPI = mockElectronAPI

// Mock Audio
class MockAudio {
  constructor() {
    this._listeners = {}
    this.addEventListener = vi.fn((event, callback) => {
      this._listeners[event] = this._listeners[event] || []
      this._listeners[event].push(callback)
    })
    this.removeEventListener = vi.fn()
    this.pause = vi.fn()
    this.play = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (this._listeners['timeupdate']) {
          this._listeners['timeupdate'].forEach((cb) => cb())
        }
      }, 50)
      return Promise.resolve()
    })
    this.currentTime = 0
    this.duration = 120
    this.src = ''
    this.load = vi.fn()
    setTimeout(() => {
      if (this._listeners['loadedmetadata']) {
        this._listeners['loadedmetadata'].forEach((cb) => cb())
      }
    }, 50)
  }
}

global.Audio = MockAudio

describe('AudioTrimmer', () => {
  const defaultProps = {
    filePath: '/fake/path/sound.mp3',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.trimSoundFile = vi.fn().mockResolvedValue({
      success: true,
      path: '/fake/trimmed.mp3',
    })
  })

  const renderAudioTrimmer = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<AudioTrimmer {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    return result
  }

  it('devrait afficher le composant', async () => {
    await renderAudioTrimmer()
    expect(screen.getByText(/Rogner le son/i)).toBeInTheDocument()
  })

  it('devrait afficher les contrôles de sélection', async () => {
    await renderAudioTrimmer()
    expect(screen.getByText(/Début :/i)).toBeInTheDocument()
    expect(screen.getByText(/Fin :/i)).toBeInTheDocument()
    expect(screen.getByText(/Écouter la sélection/i)).toBeInTheDocument()
  })

  it('devrait afficher les boutons Retour et Confirmer', async () => {
    await renderAudioTrimmer()
    expect(screen.getByText('Retour')).toBeInTheDocument()
    expect(screen.getByText('Confirmer')).toBeInTheDocument()
  })

  it("devrait afficher le message d'information sur ffmpeg", async () => {
    await renderAudioTrimmer()
    // ✅ getByText fait un match EXACT sur le nœud texte → regex pour partiel
    const ffmpegText = screen.getByText(/ffmpeg-static/i)
    expect(ffmpegText).toBeInTheDocument()
  })

  it('devrait pouvoir jouer/arrêter la lecture', async () => {
    await renderAudioTrimmer()

    const playButton = screen.getByText(/Écouter la sélection/i)
    await act(async () => {
      await userEvent.click(playButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument()
    }, { timeout: 3000 })

    await act(async () => {
      await userEvent.click(screen.getByText('Pause'))
    })

    expect(screen.getByText(/Écouter la sélection/i)).toBeInTheDocument()
  })

  it('devrait modifier les valeurs avec les sliders', async () => {
    await renderAudioTrimmer()

    const rangeInputs = document.querySelectorAll('input[type="range"]')
    expect(rangeInputs.length).toBeGreaterThanOrEqual(2)

    if (rangeInputs.length >= 2) {
      await act(async () => {
        fireEvent.change(rangeInputs[0], { target: { value: 10 } })
      })
      await act(async () => {
        fireEvent.change(rangeInputs[1], { target: { value: 50 } })
      })
    }
  })

  it('devrait appeler onConfirm avec le chemin du fichier rogné', async () => {
    const onConfirm = vi.fn()
    await renderAudioTrimmer({ onConfirm })

    await act(async () => {
      await userEvent.click(screen.getByText('Confirmer'))
    })

    await waitFor(() => {
      expect(window.electronAPI.trimSoundFile).toHaveBeenCalled()
      expect(onConfirm).toHaveBeenCalledWith('/fake/trimmed.mp3')
    }, { timeout: 3000 })
  })

  it('devrait appeler onCancel quand on clique sur Retour', async () => {
    const onCancel = vi.fn()
    await renderAudioTrimmer({ onCancel })

    await act(async () => {
      await userEvent.click(screen.getByText('Retour'))
    })

    expect(onCancel).toHaveBeenCalled()
  })

  it('devrait afficher une erreur si le rognage échoue', async () => {
    window.electronAPI.trimSoundFile = vi.fn().mockResolvedValue({
      success: false,
      error: 'Erreur de rognage',
    })

    await renderAudioTrimmer()

    await act(async () => {
      await userEvent.click(screen.getByText('Confirmer'))
    })

    await waitFor(() => {
      expect(screen.getByText(/Erreur : Erreur de rognage/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('devrait afficher un avertissement si le rognage a un warning', async () => {
    window.electronAPI.trimSoundFile = vi.fn().mockResolvedValue({
      success: true,
      path: '/fake/trimmed.mp3',
      warning: 'Le rognage n\'est pas précis sans ffmpeg',
    })

    await renderAudioTrimmer()

    await act(async () => {
      await userEvent.click(screen.getByText('Confirmer'))
    })

    await waitFor(() => {
      expect(screen.getByText(/Le rognage n'est pas précis sans ffmpeg/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})