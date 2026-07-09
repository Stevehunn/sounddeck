import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import KeyboardVisualizer from './KeyboardVisualizer'

// ✅ Mock de useTranslation
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      keyboardVisualizerTitle: 'Visualisation du clavier',
      keyboardVisualizerUsed: 'raccourci utilisé',
      keyboardVisualizerUsedPlural: 'raccourcis utilisés',
      soloKeys: 'touche(s) seule(s)',
      shortcutsTotal: 'raccourcis',
      noSoloKeys: 'Aucune touche seule',
      noShortcutsDefined: 'Aucun raccourci défini',
      noFilter: 'Aucun filtre (touches seules)',
      withFilter: 'avec',
      reset: 'Réinitialiser',
      shortcutUsedWith: 'Raccourci utilisé avec',
      keyActive: 'Touche active',
      keyInactive: 'Touche inactive',
      keysWithoutModifier: 'Touches sans modificateur',
      showAll: 'Tout afficher',
      numpad: 'Pavé num.',
      activeCombinations: 'Combinaisons actives'
    }
    return translations[key] || key
  })
}))

describe('KeyboardVisualizer', () => {
  const defaultProps = {
    shortcuts: {},
    layout: 'qwerty',
    lang: 'fr'
  }

  it('devrait afficher le titre', () => {
    render(<KeyboardVisualizer {...defaultProps} />)
    expect(screen.getByText('Visualisation du clavier')).toBeInTheDocument()
  })

  it('devrait afficher les touches du clavier QWERTY par défaut', () => {
    render(<KeyboardVisualizer {...defaultProps} />)
    
    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
  })

  it('devrait afficher les touches du clavier AZERTY', () => {
    render(<KeyboardVisualizer {...defaultProps} layout="azerty" />)
    
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Z')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
  })

  it('devrait afficher les touches actives quand des raccourcis sont définis', () => {
    const shortcuts = {
      'sound-1': 'Ctrl+Shift+Q',
      'sound-2': 'Alt+W'
    }
    render(<KeyboardVisualizer {...defaultProps} shortcuts={shortcuts} />)
    
    const qKey = screen.getByText('Q').closest('div')
    expect(qKey).toBeInTheDocument()
  })

  it('devrait afficher les filtres de modificateurs', () => {
    render(<KeyboardVisualizer {...defaultProps} />)
    
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('Alt')).toBeInTheDocument()
    expect(screen.getByText('Shift')).toBeInTheDocument()
  })

  it('devrait afficher le pavé numérique', () => {
    render(<KeyboardVisualizer {...defaultProps} />)
    
    expect(screen.getByText('NumLock')).toBeInTheDocument()
    // Utiliser getAllByText pour les caractères qui apparaissent plusieurs fois
    expect(screen.getAllByText('/').length).toBeGreaterThan(0)
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('devrait afficher le nombre de raccourcis utilisés', () => {
    const shortcuts = {
      'sound-1': 'Ctrl+Shift+Q',
      'sound-2': 'Alt+W',
      'sound-3': 'F1'
    }
    render(<KeyboardVisualizer {...defaultProps} shortcuts={shortcuts} />)
    
    // Le texte affiché est "0 touche(s) seule(s) / 3 raccourcis" ou similaire
    // On cherche le texte "3 raccourcis"
    expect(screen.getByText(/3 raccourcis/)).toBeInTheDocument()
  })

  it('devrait afficher "Aucune touche seule" quand il n\'y a pas de raccourcis sans modificateur', () => {
    const shortcuts = {
      'sound-1': 'Ctrl+Shift+Q',
      'sound-2': 'Alt+W'
    }
    render(<KeyboardVisualizer {...defaultProps} shortcuts={shortcuts} />)
    
    // Le texte est "⚠️ Aucune touche seule" avec l'emoji
    expect(screen.getByText(/Aucune touche seule/)).toBeInTheDocument()
  })

  it('devrait afficher les touches seules quand il y a des raccourcis sans modificateur', () => {
    const shortcuts = {
      'sound-1': 'F1',
      'sound-2': 'F2'
    }
    render(<KeyboardVisualizer {...defaultProps} shortcuts={shortcuts} />)
    
    // Le message "Aucune touche seule" ne devrait pas être présent
    expect(screen.queryByText(/Aucune touche seule/)).not.toBeInTheDocument()
    // On devrait voir "2 touche(s) seule(s)"
    expect(screen.getByText(/2 touche\(s\) seule\(s\)/)).toBeInTheDocument()
  })
})