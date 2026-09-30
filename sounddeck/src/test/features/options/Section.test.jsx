import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import Section from '@features/options/Section'

describe('Section (options)', () => {
  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre le titre', () => {
    render(<Section title="Ma section" icon="ti-star">Contenu</Section>)
    expect(screen.getByText('Ma section')).toBeInTheDocument()
  })

  it('devrait rendre les children', () => {
    render(<Section title="T" icon="ti-x">Mon contenu</Section>)
    expect(screen.getByText('Mon contenu')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône avec la classe ti', () => {
    render(<Section title="T" icon="ti-star">x</Section>)
    expect(document.querySelector('.ti-star')).toBeInTheDocument()
  })

  // ─── ATTRIBUTS DATA ───────────────────────────────────────────────────

  it('devrait avoir data-testid="section-{id}"', () => {
    render(<Section id="audio" title="T" icon="ti-x">x</Section>)
    expect(screen.getByTestId('section-audio')).toBeInTheDocument()
  })

  it('devrait avoir data-section={id}', () => {
    const { container } = render(
      <Section id="appearance" title="T" icon="ti-x">x</Section>
    )
    expect(container.querySelector('[data-section="appearance"]')).toBeInTheDocument()
  })

  // ─── REF FORWARDING ───────────────────────────────────────────────────

  it('devrait forwarder la ref au div racine', () => {
    const ref = createRef()
    render(<Section ref={ref} id="test" title="T" icon="ti-x">x</Section>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('devrait permettre l\'accès au data-section via la ref', () => {
    const ref = createRef()
    render(<Section ref={ref} id="backup" title="T" icon="ti-x">x</Section>)
    expect(ref.current.dataset.section).toBe('backup')
  })

  // ─── CAS SANS ID ──────────────────────────────────────────────────────

  it('devrait rendre sans id (data-testid="section-undefined")', () => {
    render(<Section title="T" icon="ti-x">x</Section>)
    // Sans id → data-testid="section-undefined"
    expect(screen.getByTestId('section-undefined')).toBeInTheDocument()
  })

  // ─── STYLE ────────────────────────────────────────────────────────────

  it('devrait avoir scrollMarginTop: 80px', () => {
    const { container } = render(
      <Section id="s" title="T" icon="ti-x">x</Section>
    )
    const el = container.querySelector('[data-section="s"]')
    expect(el.style.scrollMarginTop).toBe('80px')
  })

  it('devrait avoir une icône avec la classe "ti"', () => {
    render(<Section title="T" icon="ti-settings">x</Section>)
    const icon = document.querySelector('.ti-settings')
    expect(icon.className).toContain('ti')
  })

  // ─── DISPLAYNAME ──────────────────────────────────────────────────────

  it('devrait avoir un displayName="Section"', () => {
    expect(Section.displayName).toBe('Section')
  })
})