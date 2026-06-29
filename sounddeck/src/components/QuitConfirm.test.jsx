// sounddeck/src/components/QuitConfirm.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuitConfirm from './QuitConfirm'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      quitConfirmTitle: 'Quitter SoundDeck ?',
      quitConfirmMessage: 'Que voulez-vous faire ?',
      quitConfirmQuit: 'Quitter complètement',
      quitConfirmMinimize: 'Réduire dans la barre d\'état',
      quitConfirmCancel: 'Annuler',
      quitConfirmRemember: 'Ne plus me demander'
    }
    return translations[key] || key
  })
}))

describe('QuitConfirm', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('cancel')
  })

  const renderQuitConfirm = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<QuitConfirm onClose={onClose} lang="fr" {...props} />)
    })
    return result
  }

  it('devrait afficher le titre', async () => {
    await renderQuitConfirm()
    expect(screen.getByText('Quitter SoundDeck ?')).toBeInTheDocument()
  })

  it('devrait afficher le message', async () => {
    await renderQuitConfirm()
    expect(screen.getByText('Que voulez-vous faire ?')).toBeInTheDocument()
  })

  it('devrait afficher les trois boutons', async () => {
    await renderQuitConfirm()
    expect(screen.getByText('Quitter complètement')).toBeInTheDocument()
    expect(screen.getByText('Réduire dans la barre d\'état')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('devrait afficher la checkbox "Ne plus me demander"', async () => {
    await renderQuitConfirm()
    expect(screen.getByLabelText('Ne plus me demander')).toBeInTheDocument()
  })

  it('devrait appeler confirmQuit avec "quit" quand on clique sur "Quitter complètement"', async () => {
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('quit')
    
    await renderQuitConfirm()
    
    const quitButton = screen.getByText('Quitter complètement')
    await act(async () => {
      await userEvent.click(quitButton)
    })
    
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('quit', false)
  })

  it('devrait appeler confirmQuit avec "minimize" quand on clique sur "Réduire dans la barre d\'état"', async () => {
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('minimize')
    
    await renderQuitConfirm()
    
    const minimizeButton = screen.getByText('Réduire dans la barre d\'état')
    await act(async () => {
      await userEvent.click(minimizeButton)
    })
    
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('minimize', false)
  })

  it('devrait appeler confirmQuit avec "cancel" quand on clique sur "Annuler"', async () => {
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('cancel')
    
    await renderQuitConfirm()
    
    const cancelButton = screen.getByText('Annuler')
    await act(async () => {
      await userEvent.click(cancelButton)
    })
    
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('cancel', false)
    // ✅ onClose est appelé quand le résultat est 'cancel'
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait passer "remember" à true quand la checkbox est cochée', async () => {
    window.electronAPI.confirmQuit = vi.fn().mockResolvedValue('quit')
    
    await renderQuitConfirm()
    
    const checkbox = screen.getByLabelText('Ne plus me demander')
    await act(async () => {
      await userEvent.click(checkbox)
    })
    
    const quitButton = screen.getByText('Quitter complètement')
    await act(async () => {
      await userEvent.click(quitButton)
    })
    
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith('quit', true)
  })

  it('devrait désactiver les boutons pendant le traitement', async () => {
    window.electronAPI.confirmQuit = vi.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve('quit'), 100))
    })
    
    await renderQuitConfirm()
    
    const quitButton = screen.getByText('Quitter complètement')
    await act(async () => {
      await userEvent.click(quitButton)
    })
    
    // ✅ Le bouton devrait être désactivé pendant le traitement
    expect(quitButton).toBeDisabled()
  })
})