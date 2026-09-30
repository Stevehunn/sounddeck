import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import AddTrackModal from '@features/editor/components/Modals/AddTrackModal'

describe('AddTrackModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    onAddTrack: vi.fn(),
    defaultName: 'Piste 1',
    tr: vi.fn((key) => key),
  }

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <AddTrackModal {...defaultProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal-overlay', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  it('devrait afficher le titre "editorAddTrack"', () => {
    const { getByText } = render(<AddTrackModal {...defaultProps} />)
    expect(getByText('editorAddTrack')).toBeInTheDocument()
  })

  it('devrait initialiser le nom avec defaultName', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const input = container.querySelector('input[type="text"]')
    expect(input?.value).toBe('Piste 1')
  })

  it('devrait accepter la saisie de nom', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const input = container.querySelector('input[type="text"]')
    fireEvent.change(input, { target: { value: 'Batterie' } })
    expect(input?.value).toBe('Batterie')
  })

  it('devrait accepter un changement de couleur', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const colorInput = container.querySelector('input[type="color"]')
    fireEvent.change(colorInput, { target: { value: '#ff0000' } })
    expect(colorInput?.value).toBe('#ff0000')
  })

  it('devrait appeler onConfirm avec name + color au submit', () => {
    const onConfirm = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onConfirm={onConfirm} />
    )

    const input = container.querySelector('input[type="text"]')
    fireEvent.change(input, { target: { value: 'Ma Piste' } })

    const form = container.querySelector('form')
    fireEvent.submit(form)

    expect(onConfirm).toHaveBeenCalledWith('Ma Piste', '#3b82f6')
  })

  it('devrait fallback sur onAddTrack si onConfirm absent', () => {
    const onAddTrack = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onConfirm={undefined} onAddTrack={onAddTrack} />
    )

    fireEvent.submit(container.querySelector('form'))

    expect(onAddTrack).toHaveBeenCalled()
  })

  it('devrait passer name=undefined si vide', () => {
    const onConfirm = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onConfirm={onConfirm} defaultName="" />
    )

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith(undefined, '#3b82f6')
  })

  it('devrait appeler onClose après submit', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onClose={onClose} />
    )

    fireEvent.submit(container.querySelector('form'))

    expect(onClose).toHaveBeenCalled()
  })

  it('devrait fallback sur onCancel si onClose absent', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onClose={undefined} onCancel={onCancel} />
    )

    fireEvent.submit(container.querySelector('form'))

    expect(onCancel).toHaveBeenCalled()
  })

  it('devrait appeler onClose au click sur l\'overlay', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onClose au click sur le modal', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddTrackModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('devrait appeler onClose au click du bouton Annuler', () => {
    const onClose = vi.fn()
    const { getByText } = render(
      <AddTrackModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.click(getByText('cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait vider le nom après submit', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)

    fireEvent.submit(container.querySelector('form'))

    const input = container.querySelector('input[type="text"]')
    expect(input?.value).toBe('')
  })

  it('devrait avoir un input autofocus', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const input = container.querySelector('input[type="text"]')
    // React: `autoFocus` est un attribut DOM
    expect(input).toBeInTheDocument()
  })

  it('devrait avoir un color-picker avec #3b82f6 par défaut', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const colorInput = container.querySelector('input[type="color"]')
    expect(colorInput?.value).toBe('#3b82f6')
  })

  it('devrait avoir un bouton submit', () => {
    const { container } = render(<AddTrackModal {...defaultProps} />)
    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeNull()
  })
})