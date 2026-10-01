// src/plugins/youtube/components/PageHeader.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PageHeader from './PageHeader'

describe('PageHeader (youtube)', () => {
  it('devrait afficher le titre', () => {
    render(<PageHeader title="Mon titre" />)
    expect(screen.getByText('Mon titre')).toBeInTheDocument()
  })

  it('devrait afficher le sous-titre si fourni', () => {
    render(<PageHeader title="T" sub="Mon sub" />)
    expect(screen.getByText('Mon sub')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher de sous-titre si absent', () => {
    const { container } = render(<PageHeader title="T" />)
    // Le sub est le seul élément conditionnel — on vérifie par absence de style
    const divs = container.querySelectorAll('div[style*="font-size: 11px"]')
    expect(divs.length).toBe(0)
  })

  it('devrait afficher le bouton retour si onBack fourni', () => {
    const { container } = render(<PageHeader title="T" onBack={() => {}} />)
    expect(container.querySelector('.ti-arrow-left')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher de bouton retour sans onBack', () => {
    const { container } = render(<PageHeader title="T" />)
    expect(container.querySelector('.ti-arrow-left')).not.toBeInTheDocument()
  })

  it('devrait appeler onBack au click', () => {
    const onBack = vi.fn()
    render(<PageHeader title="T" onBack={onBack} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})