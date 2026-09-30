import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptionRow from '@features/options/OptionRow'

describe('OptionRow', () => {
  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre un div avec la classe "option-row"', () => {
    render(<OptionRow label="Mon label" />)
    expect(document.querySelector('.option-row')).toBeInTheDocument()
  })

  it('devrait afficher le label', () => {
    render(<OptionRow label="Mon label" />)
    expect(screen.getByText('Mon label')).toBeInTheDocument()
  })

  it('devrait afficher le label avec la classe "label"', () => {
    render(<OptionRow label="Mon label" />)
    const label = screen.getByText('Mon label')
    expect(label.className).toBe('label')
  })

  // ─── SUB ──────────────────────────────────────────────────────────────

  it('devrait afficher le sub s\'il est fourni', () => {
    render(<OptionRow label="Label" sub="Sous-titre" />)
    expect(screen.getByText('Sous-titre')).toBeInTheDocument()
  })

  it('devrait appliquer la classe "sub" au sub', () => {
    render(<OptionRow label="L" sub="S" />)
    const sub = screen.getByText('S')
    expect(sub.className).toBe('sub')
  })

  it('ne devrait PAS afficher de sub si absent', () => {
    const { container } = render(<OptionRow label="Label" />)
    expect(container.querySelector('.sub')).not.toBeInTheDocument()
  })

  it('ne devrait PAS afficher de sub si sub=""', () => {
    const { container } = render(<OptionRow label="Label" sub="" />)
    expect(container.querySelector('.sub')).not.toBeInTheDocument()
  })

  // ─── CHILDREN ─────────────────────────────────────────────────────────

  it('devrait rendre les children', () => {
    render(
      <OptionRow label="Label">
        <button>Action</button>
      </OptionRow>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('devrait rendre plusieurs children', () => {
    render(
      <OptionRow label="Label">
        <button>A</button>
        <button>B</button>
      </OptionRow>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('devrait accepter des children interactifs', () => {
    const onClick = vi.fn()
    render(
      <OptionRow label="L">
        <button onClick={onClick}>Clic</button>
      </OptionRow>
    )

    fireEvent.click(screen.getByText('Clic'))
    expect(onClick).toHaveBeenCalled()
  })

  // ─── CAS LIMITES ──────────────────────────────────────────────────────

  it('devrait rendre sans label ni sub', () => {
    const { container } = render(
      <OptionRow>
        <span>Child</span>
      </OptionRow>
    )
    expect(container.querySelector('.option-row')).toBeInTheDocument()
    expect(screen.getByText('Child')).toBeInTheDocument()
  })
})