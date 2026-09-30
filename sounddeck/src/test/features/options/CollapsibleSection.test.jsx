import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CollapsibleSection from '@features/options/CollapsibleSection'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        collapseHide: 'Masquer',
        collapseShow: 'Afficher',
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

describe('CollapsibleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const getHeaderButton = () => document.querySelector('button')
  const getIndicator = () => {
    // Le caractère ▼ ou ▶
    const spans = document.querySelectorAll('span')
    for (const s of spans) {
      if (s.textContent === '▼' || s.textContent === '▶') return s
    }
    return null
  }

  const renderSection = (props = {}) => {
    return render(
      <CollapsibleSection title="Titre" icon="ti-settings" {...props}>
        <div>Contenu caché</div>
      </CollapsibleSection>
    )
  }

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait afficher le titre', () => {
    renderSection()
    expect(screen.getByText('Titre')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône', () => {
    renderSection()
    expect(document.querySelector('.ti-settings')).toBeInTheDocument()
  })

  // ─── ÉTAT INITIAL (FERMÉ) ─────────────────────────────────────────────

  it('devrait être fermé par défaut (defaultOpen=false)', () => {
    renderSection()
    expect(screen.queryByText('Contenu caché')).not.toBeInTheDocument()
  })

  it('devrait afficher l\'indicateur "▶" quand fermé', () => {
    renderSection()
    expect(getIndicator()?.textContent).toBe('▶')
  })

  it('devrait afficher "Afficher" quand fermé', () => {
    renderSection()
    expect(screen.getByText('Afficher')).toBeInTheDocument()
  })

  // ─── ÉTAT INITIAL (OUVERT) ────────────────────────────────────────────

  it('devrait être ouvert si defaultOpen=true', () => {
    renderSection({ defaultOpen: true })
    expect(screen.getByText('Contenu caché')).toBeInTheDocument()
  })

  it('devrait afficher l\'indicateur "▼" quand ouvert', () => {
    renderSection({ defaultOpen: true })
    expect(getIndicator()?.textContent).toBe('▼')
  })

  it('devrait afficher "Masquer" quand ouvert', () => {
    renderSection({ defaultOpen: true })
    expect(screen.getByText('Masquer')).toBeInTheDocument()
  })

  // ─── INTERACTION ──────────────────────────────────────────────────────

  it('devrait ouvrir au clic sur le header (si fermé)', () => {
    renderSection()
    fireEvent.click(getHeaderButton())
    expect(screen.getByText('Contenu caché')).toBeInTheDocument()
  })

  it('devrait fermer au clic sur le header (si ouvert)', () => {
    renderSection({ defaultOpen: true })
    fireEvent.click(getHeaderButton())
    expect(screen.queryByText('Contenu caché')).not.toBeInTheDocument()
  })

  it('devrait basculer open/close à chaque clic', () => {
    renderSection()
    const button = getHeaderButton()

    // Fermé → ouvert
    fireEvent.click(button)
    expect(screen.getByText('Contenu caché')).toBeInTheDocument()

    // Ouvert → fermé
    fireEvent.click(button)
    expect(screen.queryByText('Contenu caché')).not.toBeInTheDocument()

    // Fermé → ouvert
    fireEvent.click(button)
    expect(screen.getByText('Contenu caché')).toBeInTheDocument()
  })

  it('devrait mettre à jour l\'indicateur ▼/▶ au toggle', () => {
    renderSection()
    expect(getIndicator()?.textContent).toBe('▶')

    fireEvent.click(getHeaderButton())
    expect(getIndicator()?.textContent).toBe('▼')
  })

  it('devrait mettre à jour le texte "Afficher"/"Masquer"', () => {
    renderSection()
    expect(screen.getByText('Afficher')).toBeInTheDocument()

    fireEvent.click(getHeaderButton())
    expect(screen.getByText('Masquer')).toBeInTheDocument()
  })

  // ─── CHILDREN ─────────────────────────────────────────────────────────

  it('devrait rendre plusieurs children quand ouvert', () => {
    render(
      <CollapsibleSection title="T" icon="ti-x" defaultOpen={true}>
        <div>A</div>
        <div>B</div>
      </CollapsibleSection>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('ne devrait PAS rendre les children quand fermé', () => {
    render(
      <CollapsibleSection title="T" icon="ti-x">
        <div>A</div>
        <div>B</div>
      </CollapsibleSection>
    )
    expect(screen.queryByText('A')).not.toBeInTheDocument()
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  // ─── ROBUSTESSE ───────────────────────────────────────────────────────

  it('devrait rendre sans children', () => {
    render(<CollapsibleSection title="T" icon="ti-x" />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('devrait rendre sans icon', () => {
    render(
      <CollapsibleSection title="T">
        <div>C</div>
      </CollapsibleSection>
    )
    expect(screen.getByText('T')).toBeInTheDocument()
  })
})