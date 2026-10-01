// src/plugins/myinstants/CategoryBar.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryBar from './CategoryBar'

const t = (k) => k
const categories = [
  { id: 'trending', labelKey: 'cat_trending', emoji: '🔥', color: '#f00' },
  { id: 'best', labelKey: 'cat_best', emoji: '🏆', color: '#0f0' },
]

const baseProps = {
  activeCategory: 'trending',
  cacheInfo: {},
  showAllCategories: false,
  onSelectCategory: () => {},
  onToggleShowAll: () => {},
  onOpenEditor: () => {},
  t,
}

describe('CategoryBar', () => {
  it('devrait afficher "myinstantsNoCategories" si liste vide', () => {
    render(<CategoryBar {...baseProps} categories={[]} />)
    expect(screen.getByText('myinstantsNoCategories')).toBeInTheDocument()
  })

  it('devrait afficher les catégories', () => {
    render(<CategoryBar {...baseProps} categories={categories} />)
    expect(screen.getByText('cat_trending')).toBeInTheDocument()
    expect(screen.getByText('cat_best')).toBeInTheDocument()
  })

  it('devrait afficher le nombre de catégories dans l\'en-tête', () => {
    render(<CategoryBar {...baseProps} categories={categories} />)
    expect(screen.getByText(/myinstantsCategories \(2\)/)).toBeInTheDocument()
  })

  it('devrait appeler onSelectCategory au click', () => {
    const onSelectCategory = vi.fn()
    render(
      <CategoryBar {...baseProps} categories={categories} onSelectCategory={onSelectCategory} />
    )
    fireEvent.click(screen.getByText('cat_best'))
    expect(onSelectCategory).toHaveBeenCalledWith('best')
  })

  it('devrait afficher le checkmark sur la catégorie active', () => {
    const { container } = render(<CategoryBar {...baseProps} categories={categories} />)
    expect(container.querySelector('.ti-check')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher "showMore" si <= 8 catégories', () => {
    render(<CategoryBar {...baseProps} categories={categories} />)
    expect(screen.queryByText('myinstantsShowMore')).not.toBeInTheDocument()
  })

  it('devrait afficher "showMore" si > 8 catégories', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      labelKey: `l${i}`,
      emoji: '🔊',
      color: '#000',
    }))
    render(<CategoryBar {...baseProps} categories={many} activeCategory="c0" />)
    expect(screen.getByText('myinstantsShowMore')).toBeInTheDocument()
  })

  it('devrait afficher "showLess" si showAllCategories=true', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      labelKey: `l${i}`,
      emoji: '🔊',
      color: '#000',
    }))
    render(
      <CategoryBar {...baseProps} categories={many} activeCategory="c0" showAllCategories={true} />
    )
    expect(screen.getByText('myinstantsShowLess')).toBeInTheDocument()
  })

  it('devrait appeler onToggleShowAll', () => {
    const onToggleShowAll = vi.fn()
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      labelKey: `l${i}`,
      emoji: '🔊',
      color: '#000',
    }))
    render(
      <CategoryBar
        {...baseProps}
        categories={many}
        activeCategory="c0"
        onToggleShowAll={onToggleShowAll}
      />
    )
    fireEvent.click(screen.getByText('myinstantsShowMore'))
    expect(onToggleShowAll).toHaveBeenCalled()
  })

  it('devrait afficher 💾 pour les catégories en cache', () => {
    const { container } = render(
      <CategoryBar
        {...baseProps}
        categories={categories}
        cacheInfo={{ best: { count: 5 } }}
      />
    )
    expect(container.textContent).toContain('💾')
  })

  it('ne devrait PAS afficher 💾 sur la catégorie active', () => {
    const { container } = render(
      <CategoryBar
        {...baseProps}
        categories={categories}
        cacheInfo={{ trending: { count: 5 } }}
      />
    )
    expect(container.textContent).not.toContain('💾')
  })

  it('devrait appeler onOpenEditor au click sur l\'éditeur', () => {
    const onOpenEditor = vi.fn()
    render(
      <CategoryBar {...baseProps} categories={categories} onOpenEditor={onOpenEditor} />
    )
    fireEvent.click(screen.getByTestId('discover-category-editor-button'))
    expect(onOpenEditor).toHaveBeenCalled()
  })

  it('devrait exposer le testid discover-categories', () => {
    render(<CategoryBar {...baseProps} categories={categories} />)
    expect(screen.getByTestId('discover-categories')).toBeInTheDocument()
  })

  it('slice à 8 si showAllCategories=false', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      labelKey: `l${i}`,
      emoji: '🔊',
      color: '#000',
    }))
    render(<CategoryBar {...baseProps} categories={many} activeCategory="c0" />)
    expect(screen.queryByText('l8')).not.toBeInTheDocument()
    expect(screen.queryByText('l9')).not.toBeInTheDocument()
  })
})