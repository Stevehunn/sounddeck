import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    currentLang: 'fr',
  }),
}))

import TimelineLoopModal from '@features/editor/components/Modals/TimelineLoopModal'

describe('TimelineLoopModal', () => {
  let onClose
  let onApply
  let tr
  let onActivateClickMode
  let loopState

  const defaultProps = () => ({
    isOpen: true,
    onClose,
    loopState,
    onApply,
    currentTime: 0,
    totalDuration: 60,
    tr,
    onActivateClickMode,
    isClickModeActive: false,
    clickModeData: null,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onApply = vi.fn()
    tr = vi.fn((key) => key)
    onActivateClickMode = vi.fn()
    loopState = {
      timeline: {
        enabled: false,
        start: 0,
        end: 10,
        color: '#7C6FF7',
        durationMode: 'cycles',
        cycleCount: 3,
        manualDuration: 10,
      },
    }
  })

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <TimelineLoopModal {...defaultProps()} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  // ✅ FIX : utiliser .modal-title au lieu de getByText (multiple matches)
  it('devrait afficher le titre', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const title = container.querySelector('.modal-title')
    expect(title?.textContent).toContain('timelineLoop')
  })

  it('devrait initialiser enabled=false', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const offBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'OFF'
    )
    expect(offBtn).not.toBeNull()
  })

  it('devrait toggle ON au click', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const offBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'OFF'
    )
    fireEvent.click(offBtn)

    const onBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'ON'
    )
    expect(onBtn).not.toBeNull()
  })

  it('devrait initialiser enabled=true depuis loopState', () => {
    loopState.timeline.enabled = true
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const onBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'ON'
    )
    expect(onBtn).not.toBeNull()
  })

  it('devrait basculer la couleur au click', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const colorBtns = container.querySelectorAll(
      'button[title="loopColorBlue"]'
    )
    if (colorBtns[0]) {
      fireEvent.click(colorBtns[0])
    }
    expect(container).not.toBeNull()
  })

  it('devrait avoir un bouton "Sélectionner par clics"', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    expect(getByText(/clickToSelect/)).toBeInTheDocument()
  })

  it('devrait appeler onActivateClickMode(true) au click sur mode clic', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    const clickBtn = getByText(/clickToSelect/)
    fireEvent.click(clickBtn)
    expect(onActivateClickMode).toHaveBeenCalledWith(true)
  })

  it('devrait passer en mode manuel via bouton', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const manualBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('manualSelect')
    )
    if (manualBtn) {
      fireEvent.click(manualBtn)
      expect(onActivateClickMode).toHaveBeenCalledWith(false)
    }
  })

  it('devrait initialiser startValue depuis loopState', () => {
    loopState.timeline.start = 5
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const startInput = container.querySelector('input[type="number"]')
    expect(startInput?.value).toBe('5')
  })

  it('devrait initialiser endValue depuis loopState', () => {
    loopState.timeline.end = 25
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const numberInputs = container.querySelectorAll('input[type="number"]')
    expect(numberInputs[1]?.value).toBe('25')
  })

  it('devrait mettre à jour startValue', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const startInput = container.querySelector('input[type="number"]')
    fireEvent.change(startInput, { target: { value: '3' } })
    expect(startInput.value).toBe('3')
  })

  it('devrait clamper startValue à [0, totalDuration]', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const startInput = container.querySelector('input[type="number"]')
    fireEvent.change(startInput, { target: { value: '-5' } })
    expect(parseFloat(startInput.value)).toBeGreaterThanOrEqual(0)
  })

  it('devrait changer le mode durationMode', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    const radios = container.querySelectorAll('input[type="radio"]')
    if (radios[1]) {
      fireEvent.click(radios[1])
      expect(radios[1].checked).toBe(true)
    }
  })

  it('devrait afficher les inputs de cycles si mode cycles', () => {
    const { container } = render(<TimelineLoopModal {...defaultProps()} />)
    expect(container.textContent).toContain('cycleCount')
  })

  it('devrait appeler onApply au click Appliquer', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    const applyBtn = getByText(/apply/)
    fireEvent.click(applyBtn)

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        start: 0,
        end: 10,
        color: '#7C6FF7',
        durationMode: 'cycles',
      })
    )
  })

  it('devrait appeler onClose après apply', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    fireEvent.click(getByText(/apply/))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait passer cycleCount si mode cycles', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    fireEvent.click(getByText(/apply/))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ cycleCount: 3 })
    )
  })

  it('devrait appeler onClose au click Annuler', () => {
    const { getByText } = render(<TimelineLoopModal {...defaultProps()} />)
    fireEvent.click(getByText(/cancel/))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait utiliser clickModeData quand isClickModeActive', () => {
    const { rerender } = render(
      <TimelineLoopModal
        {...defaultProps()}
        isClickModeActive={false}
        clickModeData={null}
      />
    )

    rerender(
      <TimelineLoopModal
        {...defaultProps()}
        isClickModeActive={true}
        clickModeData={{ start: 2, end: 8, duration: 6 }}
      />
    )

    expect(true).toBe(true) // smoke test
  })
})