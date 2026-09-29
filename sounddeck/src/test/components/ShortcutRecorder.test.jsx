import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShortcutRecorder from '@shared/components/settings/ShortcutRecorder'

// ✅ Mock de useLanguage
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {

      shortcutPlaceholder: '+ Raccourci',
      shortcutPressKey: '⌨️ Appuyez sur une touche...',
      shortcutPressCompact: 'Appuyez...',
      shortcutNeedMod: '⚠️ Ajoutez Ctrl/Alt/Shift',
      shortcutHintMod: 'Combinaison requise (ex: Ctrl+Shift+P)',
      shortcutHintAny: 'Une touche ou une combinaison (ex: F1, Ctrl+1)'
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

describe('ShortcutRecorder', () => {
  const defaultProps = {
    value: '',
    onSave: vi.fn(),
    onClear: vi.fn(),
    lang: 'fr',
    layout: 'qwerty',
    requireMod: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait afficher le placeholder quand aucune valeur n\'est définie', () => {
    render(<ShortcutRecorder {...defaultProps} />)
    expect(screen.getByText('+ Raccourci')).toBeInTheDocument()
  })

  it('devrait afficher la valeur du raccourci', () => {
    render(<ShortcutRecorder {...defaultProps} value="Ctrl+Shift+P" />)
    expect(screen.getByText('Ctrl+Shift+P')).toBeInTheDocument()
  })

  it('devrait afficher le bouton de suppression quand une valeur est définie', () => {
    render(<ShortcutRecorder {...defaultProps} value="Ctrl+Shift+P" />)
    const clearButton = screen.getByRole('button')
    expect(clearButton).toBeInTheDocument()
  })

  it('devrait appeler onClear quand on clique sur le bouton de suppression', async () => {
    const onClear = vi.fn()
    render(<ShortcutRecorder {...defaultProps} value="Ctrl+Shift+P" onClear={onClear} />)
    
    const clearButton = screen.getByRole('button')
    await userEvent.click(clearButton)
    
    expect(onClear).toHaveBeenCalled()
  })

  it('devrait passer en mode enregistrement au clic', async () => {
    render(<ShortcutRecorder {...defaultProps} />)
    
    const recorder = screen.getByText('+ Raccourci')
    await userEvent.click(recorder)
    
    expect(screen.getByText('⌨️ Appuyez sur une touche...')).toBeInTheDocument()
  })

  it('devrait enregistrer un raccourci avec modificateur', async () => {
    const onSave = vi.fn()
    render(<ShortcutRecorder {...defaultProps} onSave={onSave} />)
    
    const recorder = screen.getByText('+ Raccourci')
    await userEvent.click(recorder)
    
    const input = document.querySelector('input[readonly]')
    expect(input).toBeInTheDocument()
    
    act(() => {
      fireEvent.keyDown(input, { key: 'P', ctrlKey: true, shiftKey: true })
    })
    
    expect(onSave).toHaveBeenCalledWith('CommandOrControl+Shift+P')
  })

  it('devrait enregistrer un raccourci F1', async () => {
    const onSave = vi.fn()
    render(<ShortcutRecorder {...defaultProps} onSave={onSave} requireMod={false} />)
    
    const recorder = screen.getByText('+ Raccourci')
    await userEvent.click(recorder)
    
    const input = document.querySelector('input[readonly]')
    act(() => {
      fireEvent.keyDown(input, { key: 'F1' })
    })
    
    expect(onSave).toHaveBeenCalledWith('F1')
  })

  it('devrait annuler l\'enregistrement avec Echap', async () => {
    render(<ShortcutRecorder {...defaultProps} />)
    
    const recorder = screen.getByText('+ Raccourci')
    await userEvent.click(recorder)
    
    const input = document.querySelector('input[readonly]')
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })
    
    expect(screen.getByText('+ Raccourci')).toBeInTheDocument()
  })

  it('devrait afficher un message si un modificateur est requis mais manquant', async () => {
    render(<ShortcutRecorder {...defaultProps} requireMod={true} />)
    
    const recorder = screen.getByText('+ Raccourci')
    await userEvent.click(recorder)
    
    const input = document.querySelector('input[readonly]')
    act(() => {
      fireEvent.keyDown(input, { key: 'A' })
    })
    
    expect(screen.getByText('⚠️ Ajoutez Ctrl/Alt/Shift')).toBeInTheDocument()
  })

  it('devrait afficher la touche en AZERTY', () => {
    render(<ShortcutRecorder {...defaultProps} value="Ctrl+Shift+Q" layout="azerty" />)
    // En AZERTY, Q devient A
    expect(screen.getByText('Ctrl+Maj+A')).toBeInTheDocument()
  })

  it('devrait afficher la touche en QWERTY', () => {
    render(<ShortcutRecorder {...defaultProps} value="Ctrl+Shift+Q" layout="qwerty" />)
    expect(screen.getByText('Ctrl+Shift+Q')).toBeInTheDocument()
  })

  it('devrait afficher le mode compact', () => {
    render(<ShortcutRecorder {...defaultProps} compact={true} />)
    const recorder = screen.getByText('+ Raccourci')
    expect(recorder).toHaveStyle({ fontSize: '10px' })
  })
})