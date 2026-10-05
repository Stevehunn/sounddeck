// src/test/components/KeyboardVisualizer.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KeyboardVisualizer from '@shared/components/settings/KeyboardVisualizer'

// ─── HELPERS ───────────────────────────────────────────────────────────
const renderViz = (props = {}) => {
  return render(
    <KeyboardVisualizer
      shortcuts={{}}
      layout="qwerty"
      lang="fr"
      {...props}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════
// RENDU DE BASE
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > Rendu', () => {
  it('affiche le titre', () => {
    renderViz()
    expect(
      screen.getByText(/Raccourcis clavier|keyboardVisualizerTitle/)
    ).toBeInTheDocument()
  })

  it('affiche le label QWERTY par défaut (header + légende)', () => {
    renderViz()
    // QWERTY apparaît 2 fois (header + légende)
    expect(screen.getAllByText('QWERTY').length).toBeGreaterThanOrEqual(1)
  })

  it('affiche AZERTY si layout=azerty', () => {
    renderViz({ layout: 'azerty' })
    expect(screen.getAllByText('AZERTY').length).toBeGreaterThanOrEqual(1)
  })

  it('affiche les 3 boutons de filtre (Ctrl, Alt, Shift)', () => {
    renderViz()
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('Alt')).toBeInTheDocument()
    expect(screen.getByText('Shift')).toBeInTheDocument()
  })

  it('affiche "Maj" au lieu de "Shift" en AZERTY', () => {
    renderViz({ layout: 'azerty' })
    expect(screen.getByText('Maj')).toBeInTheDocument()
    expect(screen.queryByText('Shift')).not.toBeInTheDocument()
  })

  it('rend les touches du clavier QWERTY (Q visible)', () => {
    renderViz()
    expect(screen.getAllByText('Q').length).toBeGreaterThan(0)
  })

  it('rend la touche A en QWERTY (home row)', () => {
    renderViz()
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
  })

  it('rend le numpad (NumLock visible)', () => {
    renderViz()
    expect(screen.getByText('NumLock')).toBeInTheDocument()
  })

  it('affiche le badge "noShortcutsDefined" si 0 shortcut', () => {
    renderViz({ shortcuts: {} })
    expect(
      screen.getByText(/Aucun raccourci défini|noShortcutsDefined/)
    ).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// FILTRES
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > Filtres', () => {
  it('clic sur Ctrl active le filtre', () => {
    renderViz({ shortcuts: { s1: 'CommandOrControl+Q' } })
    const ctrlBtn = screen.getByText('Ctrl').closest('button')
    fireEvent.click(ctrlBtn)
    expect(screen.getByText(/Réinitialiser|reset/)).toBeInTheDocument()
  })

  it('le filtre est togglé (2e clic le retire)', () => {
    renderViz({ shortcuts: { s1: 'CommandOrControl+Q' } })
    const ctrlBtn = screen.getByText('Ctrl').closest('button')
    fireEvent.click(ctrlBtn)
    fireEvent.click(ctrlBtn)
    expect(screen.queryByText(/Réinitialiser|reset/)).not.toBeInTheDocument()
  })

  it('clic sur Alt active le filtre alt', () => {
    renderViz({ shortcuts: { s1: 'Alt+X' } })
    const altBtn = screen.getByText('Alt').closest('button')
    fireEvent.click(altBtn)
    // Après clic, Alt apparaît dans le bouton ET dans le badge de status
    expect(screen.getAllByText(/Alt/).length).toBeGreaterThanOrEqual(2)
  })

  it('clic sur Shift active le filtre shift', () => {
    renderViz({ shortcuts: { s1: 'Shift+A' } })
    const shiftBtn = screen.getByText('Shift').closest('button')
    fireEvent.click(shiftBtn)
    expect(screen.getByText(/Réinitialiser|reset/)).toBeInTheDocument()
  })

  it('le bouton reset enlève tous les filtres', () => {
    renderViz({ shortcuts: { s1: 'CommandOrControl+Alt+Q' } })
    fireEvent.click(screen.getByText('Ctrl').closest('button'))
    fireEvent.click(screen.getByText('Alt').closest('button'))

    const resetBtn = screen.getByText(/Réinitialiser|reset/).closest('button')
    fireEvent.click(resetBtn)

    expect(screen.queryByText(/Réinitialiser|reset/)).not.toBeInTheDocument()
  })

  it('badge count apparaît sur le filtre si shortcuts existent', () => {
    renderViz({
      shortcuts: {
        s1: 'CommandOrControl+Q',
        s2: 'CommandOrControl+W',
      },
    })
    const ctrlBtn = screen.getByText('Ctrl').closest('button')
    expect(ctrlBtn.textContent).toContain('2')
  })

  it('badge count absent si 0 shortcut pour ce mod', () => {
    renderViz({ shortcuts: { s1: 'Alt+X' } })
    const ctrlBtn = screen.getByText('Ctrl').closest('button')
    expect(ctrlBtn.textContent).toMatch(/Ctrl$/)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// STATS / HEADER
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > Stats', () => {
  it('affiche "X soloKeys / Y shortcuts" par défaut', () => {
    renderViz({ shortcuts: { s1: 'Q', s2: 'CommandOrControl+W' } })
    expect(screen.getByText(/1.*2/)).toBeInTheDocument()
  })

  it('affiche "X / Y withFilter Z" quand filtre actif', () => {
    renderViz({
      shortcuts: {
        s1: 'CommandOrControl+Q',
        s2: 'CommandOrControl+W',
        s3: 'Alt+X',
      },
    })
    fireEvent.click(screen.getByText('Ctrl').closest('button'))
    expect(screen.getByText(/2.*3/)).toBeInTheDocument()
  })

  it('badge "noSoloKeys" si raccourcis mais aucun solo', () => {
    renderViz({ shortcuts: { s1: 'CommandOrControl+Q' } })
    expect(
      screen.getByText(/Aucune touche seule|noSoloKeys/)
    ).toBeInTheDocument()
  })

  it('badge "noSoloKeys" absent si solo existe', () => {
    renderViz({ shortcuts: { s1: 'Q' } })
    expect(
      screen.queryByText(/Aucune touche seule|noSoloKeys/)
    ).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// TOUCHES ACTIVES
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > Touches actives', () => {
  it('sans filtre : touche Q active si raccourci solo Q', () => {
    const { container } = renderViz({ shortcuts: { s1: 'Q' } })
    const keys = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === 'Q'
    )
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.some((k) => k.title !== '')).toBe(true)
  })

  it('sans filtre : touche Q pas active si seulement Ctrl+Q', () => {
    const { container } = renderViz({ shortcuts: { s1: 'CommandOrControl+Q' } })
    const keys = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === 'Q'
    )
    expect(keys.every((k) => !k.title || k.title === '')).toBe(true)
  })

  it('avec filtre Ctrl : touche Q active pour Ctrl+Q', () => {
    const { container } = renderViz({ shortcuts: { s1: 'CommandOrControl+Q' } })
    fireEvent.click(screen.getByText('Ctrl').closest('button'))
    const keys = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === 'Q'
    )
    expect(keys.some((k) => k.title && k.title.length > 0)).toBe(true)
  })

  it('numpad : touche 7 active si Num7 ou raccourci sur 7', () => {
    const { container } = renderViz({ shortcuts: { s1: '7' } })
    const numpadDivs = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === '7'
    )
    expect(numpadDivs.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// LAYOUT AZERTY
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > AZERTY', () => {
  it('rend le clavier AZERTY (touche A en première rangée)', () => {
    const { container } = renderViz({ layout: 'azerty' })
    const keys = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === 'A'
    )
    expect(keys.length).toBeGreaterThan(0)
  })

  it('touche physique Q active sur la touche A en AZERTY', () => {
    const { container } = renderViz({
      shortcuts: { s1: 'Q' },
      layout: 'azerty',
    })
    const keys = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === 'A'
    )
    expect(keys.some((k) => k.title && k.title.length > 0)).toBe(true)
  })

  it('layout inconnu → fallback QWERTY', () => {
    renderViz({ layout: 'dvorak' })
    expect(screen.getAllByText('QWERTY').length).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SHORTCUTS AVEC SYMBOLES
// ═══════════════════════════════════════════════════════════════════════
describe('KeyboardVisualizer > Symboles', () => {
  it('symbole "!" active la touche "1"', () => {
    const { container } = renderViz({ shortcuts: { s1: '!' } })
    const key1 = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === '1'
    )
    expect(key1.some((k) => k.title && k.title.length > 0)).toBe(true)
  })

  it('chiffre "5" active la touche "5"', () => {
    const { container } = renderViz({ shortcuts: { s1: '5' } })
    const key5 = Array.from(container.querySelectorAll('div')).filter(
      (d) => d.style.width === '36px' && d.textContent === '5'
    )
    expect(key5.some((k) => k.title && k.title.length > 0)).toBe(true)
  })
})