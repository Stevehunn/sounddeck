// src/plugins/myinstants/CategoryEditorModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryEditorModal from './CategoryEditorModal'

const t = (k) => k

const baseProps = {
  isOpen: true,
  tempSelectedCategories: [],
  onToggleCategory: () => {},
  onSelectAll: () => {},
  onDeselectAll: () => {},
  onReset: () => {},
  onCancel: () => {},
  onSave: () => {},
  t,
}

describe('CategoryEditorModal', () => {
  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <CategoryEditorModal {...baseProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait afficher le titre', () => {
    render(<CategoryEditorModal {...baseProps} />)
    expect(screen.getByText('myinstantsCategoryEditor')).toBeInTheDocument()
  })

  it('devrait afficher la description', () => {
    render(<CategoryEditorModal {...baseProps} />)
    expect(screen.getByText('myinstantsCategoryEditorDesc')).toBeInTheDocument()
  })

  it('devrait afficher le nombre sélectionné', () => {
    render(
      <CategoryEditorModal {...baseProps} tempSelectedCategories={['trending', 'best']} />
    )
    expect(screen.getByText(/2 myinstantsSelected/)).toBeInTheDocument()
  })

  it('devrait appeler onToggleCategory au change', () => {
    const onToggleCategory = vi.fn()
    const { container } = render(
      <CategoryEditorModal {...baseProps} onToggleCategory={onToggleCategory} />
    )
    const checkbox = container.querySelector('input[type="checkbox"]')
    fireEvent.click(checkbox)
    expect(onToggleCategory).toHaveBeenCalled()
  })

  it('devrait cocher les catégories sélectionnées', () => {
    const { container } = render(
      <CategoryEditorModal {...baseProps} tempSelectedCategories={['trending']} />
    )
    const checked = container.querySelectorAll('input[type="checkbox"]:checked')
    expect(checked.length).toBe(1)
  })

  it('devrait appeler onSelectAll', () => {
    const onSelectAll = vi.fn()
    render(<CategoryEditorModal {...baseProps} onSelectAll={onSelectAll} />)
    fireEvent.click(screen.getByText('myinstantsCategoryEditorSelectAll'))
    expect(onSelectAll).toHaveBeenCalled()
  })

  it('devrait appeler onDeselectAll', () => {
    const onDeselectAll = vi.fn()
    render(<CategoryEditorModal {...baseProps} onDeselectAll={onDeselectAll} />)
    fireEvent.click(screen.getByText('myinstantsCategoryEditorDeselectAll'))
    expect(onDeselectAll).toHaveBeenCalled()
  })

  it('devrait appeler onReset', () => {
    const onReset = vi.fn()
    render(<CategoryEditorModal {...baseProps} onReset={onReset} />)
    fireEvent.click(screen.getByText('myinstantsCategoryEditorReset'))
    expect(onReset).toHaveBeenCalled()
  })

  it('devrait appeler onCancel', () => {
    const onCancel = vi.fn()
    render(<CategoryEditorModal {...baseProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('myinstantsCategoryEditorCancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('devrait appeler onSave', () => {
    const onSave = vi.fn()
    render(<CategoryEditorModal {...baseProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('myinstantsCategoryEditorSave'))
    expect(onSave).toHaveBeenCalled()
  })

  it('devrait fermer au click sur overlay', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <CategoryEditorModal {...baseProps} onCancel={onCancel} />
    )
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('ne devrait PAS fermer au click sur modal', () => {
    const onCancel = vi.fn()
    render(<CategoryEditorModal {...baseProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('discover-category-editor-modal'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('devrait exposer le testid', () => {
    render(<CategoryEditorModal {...baseProps} />)
    expect(screen.getByTestId('discover-category-editor-modal')).toBeInTheDocument()
  })
})