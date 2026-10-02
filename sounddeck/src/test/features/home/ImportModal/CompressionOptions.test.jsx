import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import CompressionOptions from '@features/home/ImportModal/CompressionOptions'

describe('CompressionOptions', () => {
  let setCompressOnImport
  let setCompressionBitrate

  beforeEach(() => {
    vi.clearAllMocks()
    setCompressOnImport = vi.fn()
    setCompressionBitrate = vi.fn()
  })

  const renderWith = (overrides = {}) =>
    render(
      <CompressionOptions
        compressOnImport={false}
        setCompressOnImport={setCompressOnImport}
        compressionBitrate={128}
        setCompressionBitrate={setCompressionBitrate}
        {...overrides}
      />
    )

  it('devrait afficher le label compressOnImport', () => {
    renderWith()
    expect(screen.getByText('compressOnImport')).toBeInTheDocument()
  })

  it('devrait refléter la valeur compressOnImport', () => {
    renderWith({ compressOnImport: true })
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox.checked).toBe(true)
  })

  it('devrait appeler setCompressOnImport au toggle', () => {
    renderWith({ compressOnImport: false })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(setCompressOnImport).toHaveBeenCalledWith(true)
  })

  it('ne devrait PAS afficher le select si compressOnImport=false', () => {
    renderWith({ compressOnImport: false })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('devrait afficher le select si compressOnImport=true', () => {
    renderWith({ compressOnImport: true })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('devrait afficher les 5 options de bitrate', () => {
    renderWith({ compressOnImport: true })
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)
  })

  it('devrait afficher 128 kbps par défaut', () => {
    renderWith({ compressOnImport: true, compressionBitrate: 128 })
    expect(screen.getByRole('combobox')).toHaveValue('128')
  })

  it('devrait appeler setCompressionBitrate au change', () => {
    renderWith({ compressOnImport: true })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '256' } })
    expect(setCompressionBitrate).toHaveBeenCalledWith(256)
  })

  it('setCompressionBitrate devrait recevoir un number (Number())', () => {
    renderWith({ compressOnImport: true })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '64' } })
    expect(setCompressionBitrate).toHaveBeenCalledWith(64)
    expect(typeof setCompressionBitrate.mock.calls[0][0]).toBe('number')
  })
})