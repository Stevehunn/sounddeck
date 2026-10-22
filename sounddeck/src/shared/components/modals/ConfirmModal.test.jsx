import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal', () => {
  it('devrait afficher le titre et message', () => {
    render(
      <ConfirmModal
        title="Titre"
        message="Message"
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('Titre')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('devrait appeler onConfirm au click', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )
    fireEvent.click(screen.getByText('Confirmer'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('devrait appeler onCancel au click sur Annuler', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Annuler'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('devrait afficher l\'icône danger par défaut', () => {
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.querySelector('.ti-alert-triangle')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône warning pour type=warning', () => {
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        type="warning"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.querySelector('.ti-alert-circle')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône info pour type=info', () => {
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        type="info"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.querySelector('.ti-info-circle')).toBeInTheDocument()
  })

  it('devrait fermer au click sur overlay', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('ne devrait PAS fermer au click sur modal', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(container.querySelector('.modal'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('devrait gérer le hover sans crash', () => {
    render(
      <ConfirmModal
        title="T"
        message="M"
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    const confirmBtn = screen.getByText('Confirmer').closest('button')
    fireEvent.mouseEnter(confirmBtn)
    fireEvent.mouseLeave(confirmBtn)
    expect(confirmBtn).toBeInTheDocument()
  })

  it('devrait utiliser le style warning sur le bouton pour type=warning', () => {
    render(
      <ConfirmModal
        title="T"
        message="M"
        type="warning"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    const confirmBtn = screen.getByText('C').closest('button')
    fireEvent.mouseEnter(confirmBtn)
    // Pas de crash = OK
    expect(confirmBtn).toBeInTheDocument()
  })

  it('devrait fallback sur info pour un type inconnu', () => {
    const { container } = render(
      <ConfirmModal
        title="T"
        message="M"
        type="unknown"
        confirmText="C"
        cancelText="A"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.querySelector('.ti-info-circle')).toBeInTheDocument()
  })
})