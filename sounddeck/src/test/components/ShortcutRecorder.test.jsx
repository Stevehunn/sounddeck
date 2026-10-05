// src/test/components/ShortcutRecorder.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShortcutRecorder, {
  displayShortcut,
} from '@shared/components/settings/ShortcutRecorder'

vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-btn" onClick={onDelete}>
      del
    </button>
  ),
}))

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultProps = (overrides = {}) => ({
  value: '',
  onSave: vi.fn(),
  onClear: vi.fn(),
  placeholder: '+ Raccourci',
  compact: false,
  requireMod: false,
  lang: 'fr',
  layout: 'qwerty',
  deleteWithConfirm: false,
  ...overrides,
})

const renderRecorder = (props = {}) => {
  return render(<ShortcutRecorder {...defaultProps(props)} />)
}

// ═══════════════════════════════════════════════════════════════════════
// displayShortcut (export)
// ═══════════════════════════════════════════════════════════════════════
describe('displayShortcut (export)', () => {
  it('retourne "" si shortcut vide', () => {
    expect(displayShortcut('')).toBe('')
    expect(displayShortcut(null)).toBe('')
    expect(displayShortcut(undefined)).toBe('')
  })

  it('convertit CommandOrControl en Ctrl', () => {
    expect(displayShortcut('CommandOrControl+Q')).toBe('Ctrl+Q')
  })

  it('convertit Shift en Maj en AZERTY', () => {
    // ⚠️ L'accelerator est en POSITION PHYSIQUE QWERTY.
    //    Shift+A → touche physique A → s'affiche 'Q' en AZERTY.
    //    Shift+Q → touche physique Q → s'affiche 'A' en AZERTY.
    expect(displayShortcut('Shift+Q', 'azerty')).toBe('Maj+A')
    expect(displayShortcut('Shift+A', 'azerty')).toBe('Maj+Q')
  })

  it('convertit Shift en Shift en QWERTY', () => {
    expect(displayShortcut('Shift+A', 'qwerty')).toBe('Shift+A')
  })

  it('convertit les touches physiques en AZERTY', () => {
    expect(displayShortcut('Q', 'azerty')).toBe('A')
    expect(displayShortcut('A', 'azerty')).toBe('Q')
  })

  it('gère les touches NumXXX', () => {
    expect(displayShortcut('Num1')).toBe('1')
    expect(displayShortcut('NumDecimal')).toBe('.')
    expect(displayShortcut('NumEnter')).toBe('Enter')
  })

  it('gère Alt', () => {
    expect(displayShortcut('Alt+F4')).toBe('Alt+F4')
  })

  it('combinaison complexe', () => {
    expect(displayShortcut('CommandOrControl+Shift+A')).toBe('Ctrl+Shift+A')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('ShortcutRecorder > Rendu', () => {
  it('affiche le placeholder si pas de value', () => {
    renderRecorder()
    expect(
      screen.getByText(/Raccourci|shortcutPlaceholder/)
    ).toBeInTheDocument()
  })

  it('affiche la valeur formatée si value existe', () => {
    renderRecorder({ value: 'CommandOrControl+Q' })
    expect(screen.getByText('Ctrl+Q')).toBeInTheDocument()
  })

  it('affiche la valeur AZERTY', () => {
    renderRecorder({ value: 'Q', layout: 'azerty' })
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('compact : rendu OK', () => {
    renderRecorder({ compact: true })
    expect(
      screen.getByText(/Raccourci|shortcutPlaceholder/)
    ).toBeInTheDocument()
  })

  it('placeholder custom', () => {
    renderRecorder({ placeholder: 'Custom text' })
    expect(screen.getByText('Custom text')).toBeInTheDocument()
  })

  it('bouton X visible si value', () => {
    const { container } = renderRecorder({ value: 'Q' })
    expect(container.querySelector('.ti-x')).toBeInTheDocument()
  })

  it('bouton X absent si pas de value', () => {
    const { container } = renderRecorder()
    expect(container.querySelector('.ti-x')).not.toBeInTheDocument()
  })

  it('bouton X appelle onClear', () => {
    const onClear = vi.fn()
    const { container } = renderRecorder({ value: 'Q', onClear })
    fireEvent.click(container.querySelector('.ti-x').closest('button'))
    expect(onClear).toHaveBeenCalled()
  })

  it('deleteWithConfirm → DeleteButton', () => {
    renderRecorder({ value: 'Q', deleteWithConfirm: true })
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// RECORDING MODE
// ═══════════════════════════════════════════════════════════════════════
describe('ShortcutRecorder > Recording', () => {
  it('clic ouvre le mode recording (input focus)', () => {
    const { container } = renderRecorder()
    const display = container.querySelector('div[title]')
    fireEvent.click(display)
    expect(container.querySelector('input[readonly]')).toBeInTheDocument()
  })

  it('affiche le texte "Appuyez" en recording', () => {
    const { container } = renderRecorder()
    const display = container.querySelector('div[title]')
    fireEvent.click(display)
    const recordingDiv = container.querySelector('div[style*="accent"]')
    expect(recordingDiv?.textContent).toMatch(
      /Appuyez|shortcutPressKey|shortcutPressCompact/
    )
  })

  it('Escape annule le recording', () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
    expect(container.querySelector('input[readonly]')).not.toBeInTheDocument()
  })

  it('Backspace → onClear', () => {
    const onClear = vi.fn()
    const { container } = renderRecorder({ value: 'Q', onClear })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')

    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onClear).toHaveBeenCalled()
  })

  it('Delete → onClear', () => {
    const onClear = vi.fn()
    const { container } = renderRecorder({ value: 'Q', onClear })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')

    fireEvent.keyDown(input, { key: 'Delete' })
    expect(onClear).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SAUVEGARDE
// ═══════════════════════════════════════════════════════════════════════
describe('ShortcutRecorder > Sauvegarde', () => {
  const setupRecording = () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    return { container, onSave, input }
  }

  it('Ctrl+A → onSave("CommandOrControl+A")', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'a', ctrlKey: true })
    expect(onSave).toHaveBeenCalledWith('CommandOrControl+A')
  })

  it('Shift+A → onSave("Shift+A")', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'a', shiftKey: true })
    expect(onSave).toHaveBeenCalledWith('Shift+A')
  })

  it('Ctrl+Shift+A → onSave("CommandOrControl+Shift+A")', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'a', ctrlKey: true, shiftKey: true })
    expect(onSave).toHaveBeenCalledWith('CommandOrControl+Shift+A')
  })

  it('F5 → onSave("F5")', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'F5' })
    expect(onSave).toHaveBeenCalledWith('F5')
  })

  it('lettre seule EST sauvegardée (raccourci single-key)', () => {
    // ⚠️ Le code n'a pas d'early return sur key.length=1 → 'a' devient 'A'
    //    et est sauvegardé. Cohérent avec les "soloKeys" du KeyboardVisualizer.
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'a' })
    expect(onSave).toHaveBeenCalledWith('A')
  })

  it('requireMod=true + lettre seule → pas de save', () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave, requireMod: true })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'a' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('requireMod=true + Ctrl+A → save', () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave, requireMod: true })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'a', ctrlKey: true })
    expect(onSave).toHaveBeenCalledWith('CommandOrControl+A')
  })

  it('touche ignorée (Control) → pas de save', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'Control' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('touche ignorée (Tab) → pas de save', () => {
    const { onSave, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('retour au mode normal après save', () => {
    const { container, input } = setupRecording()
    fireEvent.keyDown(input, { key: 'a', ctrlKey: true })
    expect(container.querySelector('input[readonly]')).not.toBeInTheDocument()
  })

  it('layout azerty : touche A (majuscule) → accelerator Q', () => {
    // ⚠️ AZERTY_TO_PHYSICAL ne contient QUE les majuscules
    //    (AZERTY_TO_PHYSICAL['a'] === undefined).
    //    Un vrai event Shift+A envoie key='A' → conversion OK.
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave, layout: 'azerty' })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'A', ctrlKey: true })
    expect(onSave).toHaveBeenCalledWith('CommandOrControl+Q')
  })

  it('Enter → Return', () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('Return')
  })

  it('ArrowUp → Up', () => {
    const onSave = vi.fn()
    const { container } = renderRecorder({ onSave })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(onSave).toHaveBeenCalledWith('Up')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PREVIEW (filtres)
// ═══════════════════════════════════════════════════════════════════════
describe('ShortcutRecorder > Preview', () => {
  it('requireMod sans modifier → preview "Besoin d\'un modificateur"', () => {
    const { container } = renderRecorder({ requireMod: true })
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'a' })
    expect(container.textContent).toMatch(/Besoin|shortcutNeedMod/)
  })

  it('Control (touche ignorée) → preview "Appuyez sur une touche"', () => {
    // ⚠️ Les lettres seules SONT sauvegardées. Pour voir le preview,
    //    il faut une touche "ignorée" (Control, Meta, Tab, CapsLock...)
    const { container } = renderRecorder()
    fireEvent.click(container.querySelector('div[title]'))
    const input = container.querySelector('input[readonly]')
    fireEvent.keyDown(input, { key: 'Control' })
    expect(container.textContent).toMatch(/Appuyez|shortcutPressKey/)
  })
})