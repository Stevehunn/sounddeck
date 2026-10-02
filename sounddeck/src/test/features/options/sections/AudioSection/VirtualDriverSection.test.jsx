import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import VirtualDriverSection from '@features/options/sections/AudioSection/VirtualDriverSection'

describe('VirtualDriverSection', () => {
  let props

  beforeEach(() => {
    vi.clearAllMocks()
    props = {
      store: { virtualDriverInstalled: false },
      isInstallingDriver: false,
      isDetecting: false,
      onInstallDriver: vi.fn(),
      onDetectDevices: vi.fn(),
    }
  })

  const renderSection = (overrides = {}) =>
    render(<VirtualDriverSection {...props} {...overrides} />)

  it('devrait afficher le label virtualDriver', () => {
    renderSection()
    expect(screen.getByText('virtualDriver')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher installVirtualDriver si installé', () => {
    renderSection({ store: { virtualDriverInstalled: true } })
    expect(screen.queryByText('installVirtualDriver')).not.toBeInTheDocument()
  })

  it('devrait afficher le message de détection si installé', () => {
    renderSection({ store: { virtualDriverInstalled: true } })
    expect(screen.getByText(/virtualDriverDetected/)).toBeInTheDocument()
  })

  it('devrait afficher le bouton installer si non installé', () => {
    renderSection()
    expect(screen.getByText('installVirtualDriver')).toBeInTheDocument()
  })

  it('devrait appeler onInstallDriver', () => {
    renderSection()
    fireEvent.click(screen.getByText('installVirtualDriver'))
    expect(props.onInstallDriver).toHaveBeenCalled()
  })

  it('devrait afficher installing si isInstallingDriver', () => {
    renderSection({ isInstallingDriver: true })
    expect(screen.getByText('installing')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton install si isInstallingDriver', () => {
    renderSection({ isInstallingDriver: true })
    const btn = screen.getByText('installing').closest('button')
    expect(btn).toBeDisabled()
  })

  it('devrait afficher le bouton detect', () => {
    renderSection()
    expect(screen.getByText('detect')).toBeInTheDocument()
  })

  it('devrait appeler onDetectDevices', () => {
    renderSection()
    fireEvent.click(screen.getByText('detect'))
    expect(props.onDetectDevices).toHaveBeenCalled()
  })

  it('devrait afficher "..." si isDetecting', () => {
    renderSection({ isDetecting: true })
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton detect si isDetecting', () => {
    renderSection({ isDetecting: true })
    const btn = screen.getByText('...').closest('button')
    expect(btn).toBeDisabled()
  })
})