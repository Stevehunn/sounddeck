import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// CompressionOptions → composant inerte pour ce test
vi.mock('@features/home/ImportModal/CompressionOptions', () => ({
  default: () => <div data-testid="compression-options" />,
}))

import FileTab from '@features/home/ImportModal/FileTab'

describe('FileTab', () => {
  let props

  beforeEach(() => {
    vi.clearAllMocks()
    props = {
      dragOver: false,
      setDragOver: vi.fn(),
      onDrop: vi.fn(),
      onOpenDialog: vi.fn(),
      onClose: vi.fn(),
      compressOnImport: false,
      setCompressOnImport: vi.fn(),
      compressionBitrate: 128,
      setCompressionBitrate: vi.fn(),
    }
  })

  const renderWith = (overrides = {}) =>
    render(<FileTab {...props} {...overrides} />)

  it('devrait afficher le drop zone', () => {
    const { container } = renderWith()
    expect(container.querySelector('.drop-zone')).toBeInTheDocument()
  })

  it('devrait afficher le texte dropFiles par défaut', () => {
    renderWith()
    expect(screen.getByText('dropFiles')).toBeInTheDocument()
  })

  it('devrait afficher releaseToImport si dragOver', () => {
    renderWith({ dragOver: true })
    expect(screen.getByText('releaseToImport')).toBeInTheDocument()
  })

  it('devrait ajouter la classe drag-over si dragOver', () => {
    const { container } = renderWith({ dragOver: true })
    expect(container.querySelector('.drop-zone').className).toContain('drag-over')
  })

  it('devrait appeler setDragOver(true) au dragOver', () => {
    const { container } = renderWith()
    fireEvent.dragOver(container.querySelector('.drop-zone'))
    expect(props.setDragOver).toHaveBeenCalledWith(true)
  })

  it('devrait appeler onDrop', () => {
    const { container } = renderWith()
    fireEvent.drop(container.querySelector('.drop-zone'))
    expect(props.onDrop).toHaveBeenCalled()
  })

  it('devrait appeler onOpenDialog au click sur drop-zone', () => {
    const { container } = renderWith()
    fireEvent.click(container.querySelector('.drop-zone'))
    expect(props.onOpenDialog).toHaveBeenCalled()
  })

  it('devrait afficher les formats supportés', () => {
    renderWith()
    expect(screen.getByText(/MP3/)).toBeInTheDocument()
  })

  it('devrait afficher orBrowse', () => {
    renderWith()
    expect(screen.getByText('orBrowse')).toBeInTheDocument()
  })

  it('devrait afficher le CompressionOptions mocké', () => {
    renderWith()
    expect(screen.getByTestId('compression-options')).toBeInTheDocument()
  })

  it('devrait appeler onClose au click sur bouton close', () => {
    renderWith()
    fireEvent.click(screen.getByText('close'))
    expect(props.onClose).toHaveBeenCalled()
  })
})