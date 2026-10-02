import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@features/home/ImportModal/CompressionOptions', () => ({
  default: () => <div data-testid="compression-options" />,
}))

import UrlTab from '@features/home/ImportModal/UrlTab'

describe('UrlTab', () => {
  let props

  beforeEach(() => {
    vi.clearAllMocks()
    props = {
      onClose: vi.fn(),
      onUrlImport: vi.fn(),
      compressOnImport: false,
      setCompressOnImport: vi.fn(),
      compressionBitrate: 128,
      setCompressionBitrate: vi.fn(),
    }
  })

  const renderWith = (overrides = {}) =>
    render(<UrlTab {...props} {...overrides} />)

  it('devrait afficher 2 inputs', () => {
    renderWith()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })

  it('devrait afficher les labels', () => {
    renderWith()
    expect(screen.getByText('soundName')).toBeInTheDocument()
    expect(screen.getByText('urlLabel')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton download si vide', () => {
    renderWith()
    const downloadBtn = screen.getByText('download').closest('button')
    expect(downloadBtn).toBeDisabled()
  })

  it('devrait activer download si url + urlName', () => {
    renderWith()
    const inputs = screen.getAllByRole('textbox')

    fireEvent.change(inputs[0], { target: { value: 'Mon son' } })
    fireEvent.change(inputs[1], { target: { value: 'https://x.mp3' } })

    const downloadBtn = screen.getByText('download').closest('button')
    expect(downloadBtn).not.toBeDisabled()
  })

  it('devrait appeler onUrlImport si click download', () => {
    renderWith()
    const inputs = screen.getAllByRole('textbox')

    fireEvent.change(inputs[0], { target: { value: 'Name' } })
    fireEvent.change(inputs[1], { target: { value: 'https://x.mp3' } })

    fireEvent.click(screen.getByText('download').closest('button'))

    expect(props.onUrlImport).toHaveBeenCalledWith('https://x.mp3', 'Name')
  })

  it('ne devrait PAS appeler onUrlImport si vide', () => {
    renderWith()
    fireEvent.click(screen.getByText('download').closest('button'))
    expect(props.onUrlImport).not.toHaveBeenCalled()
  })

  it('devrait appeler onClose au click', () => {
    renderWith()
    fireEvent.click(screen.getByText('cancel'))
    expect(props.onClose).toHaveBeenCalled()
  })

  it('devrait afficher les infos (supportedLinks / urlInfo)', () => {
    renderWith()
    expect(screen.getByText('supportedLinks :')).toBeInTheDocument()
  })
})