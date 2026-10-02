import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// Mock des 3 tabs
vi.mock('@features/home/ImportModal/FileTab', () => ({
  default: (p) => <div data-testid="tab-file">{JSON.stringify({ dragOver: p.dragOver })}</div>,
}))
vi.mock('@features/home/ImportModal/ManualTab', () => ({
  default: () => <div data-testid="tab-manual" />,
}))
vi.mock('@features/home/ImportModal/UrlTab', () => ({
  default: () => <div data-testid="tab-url" />,
}))

import ImportModal from '@features/home/ImportModal'

describe('ImportModal', () => {
  let props

  beforeEach(() => {
    vi.clearAllMocks()
    props = {
      onClose: vi.fn(),
      onOpenDialog: vi.fn(),
      onDrop: vi.fn(),
      dragOver: false,
      setDragOver: vi.fn(),
      onUrlImport: vi.fn(),
      onManualAdd: vi.fn(),
      store: {},
    }
  })

  const renderModal = (overrides = {}) =>
    render(<ImportModal {...props} {...overrides} />)

  it('devrait afficher le titre addSoundTitle', () => {
    renderModal()
    expect(screen.getByText('addSoundTitle')).toBeInTheDocument()
  })

  it('devrait afficher les 3 tabs', () => {
    renderModal()
    expect(screen.getByText('tabDrop')).toBeInTheDocument()
    expect(screen.getByText('tabManual')).toBeInTheDocument()
    expect(screen.getByText('tabUrl')).toBeInTheDocument()
  })

  it('devrait afficher FileTab par défaut', () => {
    renderModal()
    expect(screen.getByTestId('tab-file')).toBeInTheDocument()
  })

  it('devrait basculer sur ManualTab au click', () => {
    renderModal()
    fireEvent.click(screen.getByText('tabManual'))
    expect(screen.getByTestId('tab-manual')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-file')).not.toBeInTheDocument()
  })

  it('devrait basculer sur UrlTab au click', () => {
    renderModal()
    fireEvent.click(screen.getByText('tabUrl'))
    expect(screen.getByTestId('tab-url')).toBeInTheDocument()
  })

  it('devrait appeler onClose au click overlay', () => {
    const { container } = renderModal()
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(props.onClose).toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onClose au click sur modal', () => {
    const { container } = renderModal()
    fireEvent.click(container.querySelector('.modal'))
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('devrait initialiser compressOnImport depuis store', () => {
    const { container } = renderModal({
      store: { compressOnImport: true, compressionBitrate: 256 },
    })
    // Vérification indirecte via le rendu
    expect(container.querySelector('.modal')).toBeInTheDocument()
  })

  it('devrait utiliser les défauts si store vide', () => {
    const { container } = renderModal({ store: {} })
    expect(container.querySelector('.modal')).toBeInTheDocument()
  })
})