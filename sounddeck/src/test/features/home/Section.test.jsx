import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Section from '@features/home/Section'

describe('Section (home)', () => {
  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre un élément <section>', () => {
    const { container } = render(
      <Section title="Titre" icon="ti-star">Contenu</Section>
    )
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  it('devrait afficher le titre', () => {
    render(<Section title="Mes favoris" icon="ti-star">x</Section>)
    expect(screen.getByText('Mes favoris')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône avec les classes ti + icon', () => {
    render(<Section title="T" icon="ti-star-filled">x</Section>)
    expect(document.querySelector('.ti-star-filled')).toBeInTheDocument()
  })

  it('devrait afficher les children', () => {
    render(
      <Section title="T" icon="ti-x">
        <div>Mon contenu enfant</div>
      </Section>
    )
    expect(screen.getByText('Mon contenu enfant')).toBeInTheDocument()
  })

  // ─── DATA-TESTID ──────────────────────────────────────────────────────

  it('devrait utiliser data-testid="section" par défaut', () => {
    render(<Section title="T" icon="ti-x">x</Section>)
    expect(screen.getByTestId('section')).toBeInTheDocument()
  })

  it('devrait utiliser le testId fourni', () => {
    render(
      <Section title="T" icon="ti-x" testId="favorites-section">
        x
      </Section>
    )
    expect(screen.getByTestId('favorites-section')).toBeInTheDocument()
  })

  // ─── COUNT ────────────────────────────────────────────────────────────

  it('devrait afficher le count entre parenthèses', () => {
    render(<Section title="Favoris" icon="ti-x" count={5}>x</Section>)
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('devrait afficher "(0)" si count=0', () => {
    render(<Section title="T" icon="ti-x" count={0}>x</Section>)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher de count si absent', () => {
    render(<Section title="Titre" icon="ti-x">x</Section>)
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })

  it('ne devrait PAS afficher de count si null', () => {
    render(<Section title="T" icon="ti-x" count={null}>x</Section>)
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })

  it('ne devrait PAS afficher de count si undefined', () => {
    render(<Section title="T" icon="ti-x">x</Section>)
    // Regex qui pourrait matcher "(5)" ou similaire dans le titre
    expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument()
  })

  // ─── MUTED ────────────────────────────────────────────────────────────

  it('devrait appliquer text-tertiary si muted=true', () => {
    const { container } = render(
      <Section title="Titre" icon="ti-x" muted>Contenu</Section>
    )
    const header = container.querySelector('section > div')
    expect(header.style.color).toBe('var(--text-tertiary)')
  })

  it('devrait appliquer text-secondary si muted=false', () => {
    const { container } = render(
      <Section title="Titre" icon="ti-x">Contenu</Section>
    )
    const header = container.querySelector('section > div')
    expect(header.style.color).toBe('var(--text-secondary)')
  })

  // ─── ICON COLOR ───────────────────────────────────────────────────────

  it('devrait appliquer iconColor si fourni', () => {
    render(
      <Section title="T" icon="ti-star" iconColor="var(--warning)">x</Section>
    )
    const icon = document.querySelector('.ti-star')
    expect(icon.style.color).toBe('var(--warning)')
  })

  it('devrait utiliser "inherit" si iconColor absent', () => {
    render(<Section title="T" icon="ti-star">x</Section>)
    const icon = document.querySelector('.ti-star')
    expect(icon.style.color).toBe('inherit')
  })
})