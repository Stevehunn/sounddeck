import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, act, fireEvent } from '@testing-library/react'
import { useConfirm } from '@shared/hooks/useConfirm'

// ─── Mock ConfirmModal ──────────────────────────────────────────────────
vi.mock('@shared/components/modals/ConfirmModal', () => ({
  default: ({ title, message, onConfirm, onCancel, type, confirmText, cancelText }) => (
    <div data-testid="mock-confirm-modal" data-type={type}>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-message">{message}</div>
      <div data-testid="modal-confirm-text">{confirmText || ''}</div>
      <div data-testid="modal-cancel-text">{cancelText || ''}</div>
      <button data-testid="modal-confirm-btn" onClick={onConfirm}>OK</button>
      <button data-testid="modal-cancel-btn" onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

describe('useConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Nettoie les portails résiduels entre tests
    document.body.innerHTML = ''
  })

  // ─── API ─────────────────────────────────────────────────────────────

  it('devrait retourner confirm et ConfirmWrapper', () => {
    const { result } = renderHook(() => useConfirm())
    expect(typeof result.current.confirm).toBe('function')
    expect(typeof result.current.ConfirmWrapper).toBe('function')
  })

  it('confirm devrait retourner une Promise', () => {
    const { result } = renderHook(() => useConfirm())

    let promise
    act(() => {
      promise = result.current.confirm({ title: 'T', message: 'M' })
    })

    expect(promise).toBeInstanceOf(Promise)
  })
})

// ─── Tests d'intégration (via render direct) ────────────────────────────
describe('useConfirm - intégration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('devrait afficher le modal au confirm et résoudre true sur OK', async () => {
    let confirmedValue = null

    const TestComponent = () => {
      const { confirm, ConfirmWrapper } = useConfirm({ lang: 'fr' })

      const handleClick = async () => {
        const ok = await confirm({
          title: 'Ma question',
          message: 'Voulez-vous continuer ?',
          confirmText: 'Oui',
          cancelText: 'Non',
        })
        confirmedValue = ok
      }

      return (
        <div>
          <button data-testid="trigger" onClick={handleClick}>Trigger</button>
          <ConfirmWrapper />
        </div>
      )
    }

    render(<TestComponent />)

    expect(document.body.querySelector('[data-testid="mock-confirm-modal"]')).toBeNull()

    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="trigger"]'))
    })

    expect(document.body.querySelector('[data-testid="mock-confirm-modal"]')).toBeInTheDocument()
    expect(document.body.querySelector('[data-testid="modal-title"]').textContent).toBe('Ma question')

    await act(async () => {
      fireEvent.click(document.body.querySelector('[data-testid="modal-confirm-btn"]'))
    })

    expect(confirmedValue).toBe(true)
    expect(document.body.querySelector('[data-testid="mock-confirm-modal"]')).toBeNull()
  })

  it('devrait résoudre false sur Cancel', async () => {
    let confirmedValue = null

    const TestComponent = () => {
      const { confirm, ConfirmWrapper } = useConfirm()
      const handleClick = async () => {
        confirmedValue = await confirm({ title: 'T', message: 'M' })
      }
      return (
        <div>
          <button data-testid="trigger" onClick={handleClick}>Trigger</button>
          <ConfirmWrapper />
        </div>
      )
    }

    render(<TestComponent />)

    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="trigger"]'))
    })
    await act(async () => {
      fireEvent.click(document.body.querySelector('[data-testid="modal-cancel-btn"]'))
    })

    expect(confirmedValue).toBe(false)
    expect(document.body.querySelector('[data-testid="mock-confirm-modal"]')).toBeNull()
  })

  it('devrait propager confirmText / cancelText au modal', async () => {
    const TestComponent = () => {
      const { confirm, ConfirmWrapper } = useConfirm()
      return (
        <div>
          <button
            data-testid="trigger"
            onClick={() => confirm({
              title: 'T',
              message: 'M',
              confirmText: 'Valider',
              cancelText: 'Refuser',
            })}
          >T</button>
          <ConfirmWrapper />
        </div>
      )
    }

    render(<TestComponent />)
    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="trigger"]'))
    })

    expect(document.body.querySelector('[data-testid="modal-confirm-text"]').textContent).toBe('Valider')
    expect(document.body.querySelector('[data-testid="modal-cancel-text"]').textContent).toBe('Refuser')
  })

  it('devrait utiliser "danger" comme type par défaut', async () => {
    const TestComponent = () => {
      const { confirm, ConfirmWrapper } = useConfirm()
      return (
        <div>
          <button data-testid="trigger" onClick={() => confirm({ title: 'T', message: 'M' })}>T</button>
          <ConfirmWrapper />
        </div>
      )
    }

    render(<TestComponent />)
    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="trigger"]'))
    })

    const modal = document.body.querySelector('[data-testid="mock-confirm-modal"]')
    expect(modal.getAttribute('data-type')).toBe('danger')
  })
})