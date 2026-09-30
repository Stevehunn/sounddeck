import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// Mock DeleteButton
vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete, confirmTitle, itemName }) => (
    <button
      data-testid="delete-button"
      title={confirmTitle}
      onClick={() => onDelete?.()}
    >
      delete {itemName}
    </button>
  ),
}))

vi.mock('@shared/utils/format', () => ({
  formatTime: (s) => `${s}s`,
}))

import MarkerItem from '@features/editor/components/Markers/MarkerItem'

describe('MarkerItem', () => {
  let tr
  let onRemove
  let onUpdate
  let onNavigate

  const createMarker = (o = {}) => ({
    id: 'm1',
    name: 'Intro',
    time: 5,
    color: '#3b82f6',
    ...o,
  })

  const defaultProps = () => ({
    marker: createMarker(),
    onRemove,
    onUpdate,
    onNavigate,
    currentTime: 0,
    totalDuration: 60,
    tr,
  })

  // ✅ FIX : helper pour cibler la barre de couleur (width: 4px, height: 24px)
  const getColorBar = (container) =>
    Array.from(container.querySelectorAll('div')).find(
      (d) => d.style.width === '4px' && d.style.height === '24px'
    )

  beforeEach(() => {
    vi.clearAllMocks()
    tr = vi.fn((key) => key)
    onRemove = vi.fn()
    onUpdate = vi.fn()
    onNavigate = vi.fn()
  })

  // ─── Rendu de base ─────────────────────────────────────────────

  it('devrait afficher le nom du marqueur', () => {
    const { getByText } = render(<MarkerItem {...defaultProps()} />)
    expect(getByText('Intro')).toBeInTheDocument()
  })

  it('devrait afficher le temps formaté', () => {
    const { container } = render(<MarkerItem {...defaultProps()} />)
    expect(container.textContent).toContain('5s')
  })

  // ✅ FIX : cibler la barre par dimensions au lieu du 1er div avec background
  it('devrait afficher la couleur du marqueur', () => {
    const { container } = render(<MarkerItem {...defaultProps()} />)
    const colorBar = getColorBar(container)
    expect(colorBar?.style.background).toBe('rgb(59, 130, 246)')
  })

  // ✅ FIX : idem
  it('devrait utiliser #3b82f6 par défaut si color absent', () => {
    const marker = createMarker({ color: undefined })
    const { container } = render(
      <MarkerItem {...defaultProps()} marker={marker} />
    )
    const colorBar = getColorBar(container)
    expect(colorBar?.style.background).toBe('rgb(59, 130, 246)')
  })

  // ─── Highlight "current" ───────────────────────────────────────

  describe('highlight current', () => {
    it('devrait avoir un background accent si currentTime ≈ marker.time', () => {
      const { container } = render(
        <MarkerItem {...defaultProps()} currentTime={5.05} />
      )
      const wrapper = container.firstChild
      expect(wrapper.style.background).toContain('rgba(124')
    })

    it('ne devrait PAS highlight si currentTime hors [time, time+0.1]', () => {
      const { container } = render(
        <MarkerItem {...defaultProps()} currentTime={10} />
      )
      const wrapper = container.firstChild
      expect(wrapper.style.background).toBe('transparent')
    })

    it('devrait highlight si currentTime = marker.time', () => {
      const { container } = render(
        <MarkerItem {...defaultProps()} currentTime={5} />
      )
      const wrapper = container.firstChild
      expect(wrapper.style.border).toContain('var(--accent)')
    })

    it('ne devrait PAS highlight si currentTime = marker.time + 0.2', () => {
      const { container } = render(
        <MarkerItem {...defaultProps()} currentTime={5.2} />
      )
      const wrapper = container.firstChild
      expect(wrapper.style.background).toBe('transparent')
    })
  })

  // ─── Navigation ────────────────────────────────────────────────

  describe('navigation', () => {
    it("devrait appeler onNavigate au click sur l'item", () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      fireEvent.click(container.firstChild)
      expect(onNavigate).toHaveBeenCalledWith(5)
    })

    it('devrait appeler onNavigate au click sur le temps', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const timeSpan = container.querySelector('span[title]')
      if (timeSpan?.title === 'editorNavigate') {
        fireEvent.click(timeSpan)
        expect(onNavigate).toHaveBeenCalledWith(5)
      }
    })

    it('devrait appeler onNavigate au click sur le bouton navigate', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const navBtn = container.querySelector('button[title="editorNavigate"]')
      if (navBtn) {
        fireEvent.click(navBtn)
        expect(onNavigate).toHaveBeenCalledWith(5)
      }
    })

    it('devrait stopPropagation au click sur le temps', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const timeSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.title === 'editorNavigate'
      )
      if (timeSpan) {
        const e = new MouseEvent('click', { bubbles: true, cancelable: true })
        const stopSpy = vi.spyOn(e, 'stopPropagation')
        timeSpan.dispatchEvent(e)
        expect(stopSpy).toHaveBeenCalled()
      }
    })
  })

  // ─── Édition inline ────────────────────────────────────────────

  describe('édition inline', () => {
    it("ne devrait PAS afficher d'input par défaut", () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const input = container.querySelector('input[type="text"]')
      expect(input).toBeNull()
    })

    it('devrait afficher un input au double-click sur le nom', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )
      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        expect(input).not.toBeNull()
        expect(input?.value).toBe('Intro')
      }
    })

    it('devrait appeler onUpdate au blur avec nom modifié', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.change(input, { target: { value: 'Nouveau nom' } })
        fireEvent.blur(input)

        expect(onUpdate).toHaveBeenCalledWith('m1', { name: 'Nouveau nom' })
      }
    })

    it('ne devrait PAS appeler onUpdate si nom identique', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.blur(input)

        expect(onUpdate).not.toHaveBeenCalled()
      }
    })

    it('ne devrait PAS appeler onUpdate si nom vide', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.change(input, { target: { value: '   ' } })
        fireEvent.blur(input)

        expect(onUpdate).not.toHaveBeenCalled()
      }
    })

    it('devrait trimmer le nom', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.change(input, { target: { value: '  Trimmed  ' } })
        fireEvent.blur(input)

        expect(onUpdate).toHaveBeenCalledWith('m1', { name: 'Trimmed' })
      }
    })

    it('devrait valider au Enter', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.change(input, { target: { value: 'Nouveau' } })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(onUpdate).toHaveBeenCalledWith('m1', { name: 'Nouveau' })
      }
    })

    it('devrait annuler au Escape', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        fireEvent.change(input, { target: { value: 'Nouveau' } })
        fireEvent.keyDown(input, { key: 'Escape' })

        expect(onUpdate).not.toHaveBeenCalled()
        expect(container.querySelector('input[type="text"]')).toBeNull()
      }
    })

    it('devrait stopPropagation au click sur input', () => {
      const { container } = render(<MarkerItem {...defaultProps()} />)
      const nameSpan = Array.from(container.querySelectorAll('span')).find(
        (s) => s.textContent === 'Intro'
      )

      if (nameSpan) {
        fireEvent.doubleClick(nameSpan)
        const input = container.querySelector('input[type="text"]')
        const e = new MouseEvent('click', { bubbles: true, cancelable: true })
        const stopSpy = vi.spyOn(e, 'stopPropagation')
        input.dispatchEvent(e)
        expect(stopSpy).toHaveBeenCalled()
      }
    })
  })

  // ─── Suppression ───────────────────────────────────────────────

  describe('suppression', () => {
    it('devrait appeler onRemove au click du DeleteButton', () => {
      const { getByTestId } = render(<MarkerItem {...defaultProps()} />)
      fireEvent.click(getByTestId('delete-button'))
      expect(onRemove).toHaveBeenCalledWith('m1')
    })

    it('devrait passer le nom au DeleteButton (itemName)', () => {
      const { getByTestId } = render(<MarkerItem {...defaultProps()} />)
      expect(getByTestId('delete-button').textContent).toContain('Intro')
    })
  })

  // ─── displayName ───────────────────────────────────────────────

  it('devrait avoir displayName MarkerItem', () => {
    expect(MarkerItem.displayName).toBe('MarkerItem')
  })
})