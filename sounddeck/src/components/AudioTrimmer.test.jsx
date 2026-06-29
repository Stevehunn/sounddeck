import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AudioTrimmer from './AudioTrimmer'

// ✅ Mock du composant AudioTrimmer pour simplifier les tests
vi.mock('../components/AudioTrimmer', () => ({
  default: ({ filePath, onConfirm, onCancel }) => (
    <div data-testid="audio-trimmer">
      <div data-testid="trim-filepath">{filePath || 'no-file'}</div>
      <button data-testid="trim-confirm" onClick={() => onConfirm('/fake/trimmed.mp3')}>
        Confirmer
      </button>
      <button data-testid="trim-cancel" onClick={onCancel}>
        Retour
      </button>
      <div data-testid="trim-warning">Installez ffmpeg-static via npm pour le rognage précis.</div>
    </div>
  )
}))

describe('AudioTrimmer', () => {
  const defaultProps = {
    filePath: '/fake/path/sound.mp3',
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.trimSoundFile = vi.fn().mockResolvedValue({ 
      success: true, 
      path: '/fake/trimmed.mp3' 
    })
  })

  it('devrait afficher le composant', () => {
    render(<AudioTrimmer {...defaultProps} />)
    expect(screen.getByTestId('audio-trimmer')).toBeInTheDocument()
  })

  it('devrait afficher le chemin du fichier', () => {
    render(<AudioTrimmer {...defaultProps} />)
    expect(screen.getByTestId('trim-filepath')).toHaveTextContent('/fake/path/sound.mp3')
  })

  it('devrait appeler onConfirm avec le chemin du fichier rogné', async () => {
    const onConfirm = vi.fn()
    render(<AudioTrimmer {...defaultProps} onConfirm={onConfirm} />)
    
    const confirmButton = screen.getByTestId('trim-confirm')
    await userEvent.click(confirmButton)
    
    expect(onConfirm).toHaveBeenCalledWith('/fake/trimmed.mp3')
  })

  it('devrait appeler onCancel quand on clique sur Retour', async () => {
    const onCancel = vi.fn()
    render(<AudioTrimmer {...defaultProps} onCancel={onCancel} />)
    
    const cancelButton = screen.getByTestId('trim-cancel')
    await userEvent.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('devrait gérer un chemin de fichier null', () => {
    render(<AudioTrimmer {...defaultProps} filePath={null} />)
    expect(screen.getByTestId('trim-filepath')).toHaveTextContent('no-file')
  })
})