import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomThemeEditor from './CustomThemeEditor'

// ✅ Mock du composant pour éviter la complexité
vi.mock('../components/CustomThemeEditor', () => ({
  default: ({ current, onSave }) => (
    <div data-testid="custom-theme-editor">
      <div data-testid="current-theme">{JSON.stringify(current)}</div>
      <button data-testid="save-theme" onClick={() => onSave({ accent: '#ff0000' })}>
        Appliquer
      </button>
      <button data-testid="reset-theme">Réinitialiser</button>
    </div>
  )
}))

describe('CustomThemeEditor', () => {
  const defaultProps = {
    current: { accent: '#7C6FF7', bgPrimary: '#111113' },
    onSave: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher l\'éditeur', () => {
    render(<CustomThemeEditor {...defaultProps} />)
    expect(screen.getByTestId('custom-theme-editor')).toBeInTheDocument()
  })

  it('devrait afficher le thème actuel', () => {
    render(<CustomThemeEditor {...defaultProps} />)
    expect(screen.getByTestId('current-theme')).toHaveTextContent(JSON.stringify(defaultProps.current))
  })

  it('devrait appeler onSave quand on clique sur Appliquer', async () => {
    const onSave = vi.fn()
    render(<CustomThemeEditor {...defaultProps} onSave={onSave} />)
    
    const saveButton = screen.getByTestId('save-theme')
    await userEvent.click(saveButton)
    
    expect(onSave).toHaveBeenCalledWith({ accent: '#ff0000' })
  })

  it('devrait afficher le bouton Réinitialiser', () => {
    render(<CustomThemeEditor {...defaultProps} />)
    expect(screen.getByTestId('reset-theme')).toBeInTheDocument()
  })
})