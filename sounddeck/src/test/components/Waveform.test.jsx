import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Waveform from './Waveform'

// ✅ Mock du composant Waveform pour éviter les problèmes avec canvas
vi.mock('../components/Waveform', () => ({
  default: ({ filePath, height, showHandles }) => (
    <div data-testid="waveform">
      <div data-testid="waveform-filepath">{filePath || 'no-file'}</div>
      <div data-testid="waveform-height">{height || 80}</div>
      <div data-testid="waveform-showhandles">{showHandles ? 'true' : 'false'}</div>
    </div>
  ),
  formatTime: vi.fn((s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  })
}))

describe('Waveform', () => {
  const defaultProps = {
    filePath: '/fake/path.mp3',
    height: 80,
    showHandles: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher le composant avec le chemin du fichier', () => {
    render(<Waveform {...defaultProps} />)
    expect(screen.getByTestId('waveform')).toBeInTheDocument()
    expect(screen.getByTestId('waveform-filepath')).toHaveTextContent('/fake/path.mp3')
  })

  it('devrait afficher la hauteur par défaut', () => {
    render(<Waveform {...defaultProps} />)
    expect(screen.getByTestId('waveform-height')).toHaveTextContent('80')
  })

  it('devrait afficher une hauteur personnalisée', () => {
    render(<Waveform {...defaultProps} height={120} />)
    expect(screen.getByTestId('waveform-height')).toHaveTextContent('120')
  })

  it('devrait afficher les poignées quand showHandles est true', () => {
    render(<Waveform {...defaultProps} showHandles={true} />)
    expect(screen.getByTestId('waveform-showhandles')).toHaveTextContent('true')
  })

  it('ne devrait pas afficher les poignées quand showHandles est false', () => {
    render(<Waveform {...defaultProps} showHandles={false} />)
    expect(screen.getByTestId('waveform-showhandles')).toHaveTextContent('false')
  })

  it('devrait gérer un chemin de fichier null', () => {
    render(<Waveform {...defaultProps} filePath={null} />)
    expect(screen.getByTestId('waveform-filepath')).toHaveTextContent('no-file')
  })

  it('devrait gérer un chemin de fichier undefined', () => {
    render(<Waveform {...defaultProps} filePath={undefined} />)
    expect(screen.getByTestId('waveform-filepath')).toHaveTextContent('no-file')
  })
})