import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// Mock i18n
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    currentLang: 'fr',
  }),
}))

import NormalizeModal from '@features/editor/components/Modals/NormalizeModal'

describe('NormalizeModal', () => {
  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Mon Clip',
    path: '/a.mp3',
    ...overrides,
  })

  let tr
  let onNormalize
  let onClose
  let clip

  const defaultProps = () => ({
    isOpen: true,
    clip,
    trackId: 't1',
    onClose,
    onNormalize,
    tr,
  })

  beforeEach(() => {
    tr = vi.fn((key) => key)
    onNormalize = vi.fn().mockResolvedValue(undefined)
    onClose = vi.fn()
    clip = createClip()
  })

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <NormalizeModal {...defaultProps()} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait retourner null si clip absent', () => {
    const { container } = render(
      <NormalizeModal {...defaultProps()} clip={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal-overlay', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  // ✅ FIX : utiliser .modal-title au lieu de getByText (multiple matches)
  it('devrait afficher le titre "editorNormalize"', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const title = container.querySelector('.modal-title')
    expect(title?.textContent).toContain('editorNormalize')
  })

  it('devrait afficher le nom du clip', () => {
    const { getByText } = render(<NormalizeModal {...defaultProps()} />)
    expect(getByText('Mon Clip')).toBeInTheDocument()
  })

  it('devrait avoir peak sélectionné par défaut', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const buttons = container.querySelectorAll('button')
    const peakBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes('Peak')
    )
    expect(peakBtn?.style.border).toContain('var(--accent)')
  })

  it('devrait basculer sur RMS au click', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const buttons = container.querySelectorAll('button')
    const rmsBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes('RMS')
    )
    fireEvent.click(rmsBtn)
    expect(rmsBtn?.style.border).toContain('var(--accent)')
  })

  it('devrait avoir un range pour la target avec 0.95 par défaut', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const targetRange = container.querySelector('input[type="range"]')
    expect(targetRange?.value).toBe('0.95')
  })

  it('devrait mettre à jour la cible au change', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const targetRange = container.querySelector('input[type="range"]')
    fireEvent.change(targetRange, { target: { value: '0.8' } })
    expect(targetRange.value).toBe('0.8')
  })

  it('devrait afficher la valeur estimée du gain', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const text = container.textContent || ''
    expect(text).toContain('1.00x')
  })

  // ✅ FIX : cibler le bouton via .btn-primary
  it('devrait appeler onNormalize au click Normaliser', async () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const normalizeBtn = container.querySelector('.btn-primary')

    await act(async () => {
      fireEvent.click(normalizeBtn)
    })

    expect(onNormalize).toHaveBeenCalledWith('c1', {
      method: 'peak',
      target: 0.95,
      maxGain: 10,
      outputFormat: 'wav',
    })
  })

  // ✅ FIX : cibler le bouton via .btn-primary
  it('devrait passer method=rms si basculé', async () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const rmsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('RMS')
    )
    fireEvent.click(rmsBtn)

    const normalizeBtn = container.querySelector('.btn-primary')
    await act(async () => {
      fireEvent.click(normalizeBtn)
    })

    expect(onNormalize).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ method: 'rms' })
    )
  })

  // ✅ FIX : cibler le bouton via .btn-primary
  it('devrait appeler onClose après succès', async () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const normalizeBtn = container.querySelector('.btn-primary')

    await act(async () => {
      fireEvent.click(normalizeBtn)
    })

    expect(onClose).toHaveBeenCalled()
  })

  // ✅ FIX : cibler le bouton via .btn-primary
  it('devrait ne PAS appeler onClose si onNormalize throw', async () => {
    onNormalize.mockRejectedValue(new Error('boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const normalizeBtn = container.querySelector('.btn-primary')

    await act(async () => {
      fireEvent.click(normalizeBtn)
    })

    expect(onClose).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('devrait appeler onClose au click overlay', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait avoir un bouton Annuler', () => {
    const { getByText } = render(<NormalizeModal {...defaultProps()} />)
    const cancelBtn = getByText('cancel')
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait avoir 2 sliders (target + maxGain)', () => {
    const { container } = render(<NormalizeModal {...defaultProps()} />)
    const ranges = container.querySelectorAll('input[type="range"]')
    expect(ranges.length).toBeGreaterThanOrEqual(2)
  })
})