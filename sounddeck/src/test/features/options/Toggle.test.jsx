import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import Toggle from '@features/options/Toggle'

describe('Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const getToggle = () => document.querySelector('.toggle')

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre un div avec la classe "toggle"', () => {
    render(<Toggle value={false} onChange={vi.fn()} />)
    expect(getToggle()).toBeInTheDocument()
  })

  it('ne devrait PAS avoir la classe "active" si value=false', () => {
    render(<Toggle value={false} onChange={vi.fn()} />)
    expect(getToggle().className).not.toContain('active')
  })

  it('devrait avoir la classe "active" si value=true', () => {
    render(<Toggle value={true} onChange={vi.fn()} />)
    expect(getToggle().className).toContain('active')
  })

  it('devrait afficher le knob', () => {
    render(<Toggle value={false} onChange={vi.fn()} />)
    expect(document.querySelector('.knob')).toBeInTheDocument()
  })

  // ─── INTERACTION ──────────────────────────────────────────────────────

  it('devrait appeler onChange(true) si value=false au clic', () => {
    const onChange = vi.fn()
    render(<Toggle value={false} onChange={onChange} />)

    fireEvent.click(getToggle())
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('devrait appeler onChange(false) si value=true au clic', () => {
    const onChange = vi.fn()
    render(<Toggle value={true} onChange={onChange} />)

    fireEvent.click(getToggle())
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('devrait inverser value à chaque clic', () => {
    const onChange = vi.fn()
    render(<Toggle value={false} onChange={onChange} />)

    fireEvent.click(getToggle())
    expect(onChange).toHaveBeenLastCalledWith(true)

    fireEvent.click(getToggle())
    expect(onChange).toHaveBeenLastCalledWith(true) // value n'a pas changé
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  // ─── VALEURS SPÉCIALES ────────────────────────────────────────────────

  it('devrait gérer value=undefined comme false', () => {
    const onChange = vi.fn()
    render(<Toggle value={undefined} onChange={onChange} />)

    expect(getToggle().className).not.toContain('active')

    fireEvent.click(getToggle())
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('devrait gérer value=null comme false', () => {
    render(<Toggle value={null} onChange={vi.fn()} />)
    expect(getToggle().className).not.toContain('active')
  })

  it('devrait gérer value=0 comme false', () => {
    render(<Toggle value={0} onChange={vi.fn()} />)
    expect(getToggle().className).not.toContain('active')
  })
})