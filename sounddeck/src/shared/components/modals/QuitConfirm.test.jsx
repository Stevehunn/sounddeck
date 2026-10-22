import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QuitConfirm from './QuitConfirm'

describe('QuitConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('quit')
  })

  it('devrait afficher le titre', () => {
    render(<QuitConfirm onClose={() => {}} />)
    expect(document.body.textContent).toMatch(/quitConfirmTitle|Quitter|Quit/i)
  })

  it('devrait afficher 3 boutons (quit / minimize / cancel)', () => {
    render(<QuitConfirm onClose={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('devrait appeler confirmQuit("quit", false) par défaut', async () => {
    const onClose = vi.fn()
    render(<QuitConfirm onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    await waitFor(() => {
      expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('quit', false)
    })
  })

  it('devrait appeler onClose pour action minimize', async () => {
    window.electronAPI.confirmQuit.mockResolvedValue('minimize')
    const onClose = vi.fn()
    render(<QuitConfirm onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler confirmQuit("cancel") et onClose', async () => {
    window.electronAPI.confirmQuit.mockResolvedValue('cancel')
    const onClose = vi.fn()
    render(<QuitConfirm onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('devrait passer remember=true si la checkbox est cochée', async () => {
    const onClose = vi.fn()
    render(<QuitConfirm onClose={onClose} />)
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    await waitFor(() => {
      expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('quit', true)
    })
  })

  it('devrait gérer les erreurs de confirmQuit sans crash', async () => {
    window.electronAPI.confirmQuit.mockRejectedValue(new Error('boom'))
    const onClose = vi.fn()
    render(<QuitConfirm onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('devrait fermer au click sur overlay (action=cancel)', async () => {
    window.electronAPI.confirmQuit.mockResolvedValue('cancel')
    const onClose = vi.fn()
    const { container } = render(<QuitConfirm onClose={onClose} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('ne devrait PAS fermer au click sur modal', async () => {
    const onClose = vi.fn()
    const { container } = render(<QuitConfirm onClose={onClose} />)
    fireEvent.click(container.querySelector('.modal'))
    // onClose ne doit être appelé QUE via les handlers de boutons
    expect(onClose).not.toHaveBeenCalled()
  })
})