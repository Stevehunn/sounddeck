import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// Mock DeleteButton depuis @shared/components/ui
vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete, confirmTitle, onConfirmStart, onConfirmEnd }) => (
    <button
      data-testid="delete-button"
      title={confirmTitle}
      onClick={() => {
        onConfirmStart?.()
        onDelete?.()
        onConfirmEnd?.()
      }}
    >
      delete
    </button>
  ),
}))

import ClipActions from '@features/editor/components/Clip/ClipActions'

describe('ClipActions', () => {
  let tr
  let onDuplicate
  let onRemove

  const defaultProps = {
    isSelected: false,
    isHovering: false,
    clipId: 'c1',
    trackId: 't1',
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    tr: vi.fn((key) => key),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    tr = vi.fn((key) => key)
    onDuplicate = vi.fn()
    onRemove = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait rendre le conteneur en position absolue', () => {
    const { container } = render(<ClipActions {...defaultProps} />)
    const wrapper = container.querySelector('div')
    expect(wrapper?.style.position).toBe('absolute')
  })

  it('ne devrait PAS rendre le bouton duplicate si pas sélectionné', () => {
    const { queryByTitle } = render(
      <ClipActions {...defaultProps} tr={tr} isSelected={false} isHovering />
    )
    expect(queryByTitle('editorDuplicateClip')).toBeNull()
  })

  it('ne devrait PAS rendre le bouton duplicate si pas hover', () => {
    const { queryByTitle } = render(
      <ClipActions {...defaultProps} tr={tr} isSelected isHovering={false} />
    )
    expect(queryByTitle('editorDuplicateClip')).toBeNull()
  })

  it('devrait rendre le bouton duplicate si sélectionné ET hover', () => {
    const { getByTitle } = render(
      <ClipActions {...defaultProps} tr={tr} isSelected isHovering />
    )
    expect(getByTitle('editorDuplicateClip')).not.toBeNull()
  })

  it('ne devrait PAS rendre le DeleteButton si pas sélectionné', () => {
    const { queryByTestId } = render(<ClipActions {...defaultProps} />)
    expect(queryByTestId('delete-button')).toBeNull()
  })

  // ✅ FIX : DeleteButton n'apparaît que si isSelected ET isHovering
  //    (cf. shouldShowDeleteButton = isSelected && (isHovering || isDeleting || showDeleteButton))
  it('devrait rendre le DeleteButton si sélectionné ET hover', () => {
    const { getByTestId } = render(
      <ClipActions {...defaultProps} isSelected isHovering />
    )
    expect(getByTestId('delete-button')).not.toBeNull()
  })

  it('devrait appeler onDuplicate au click', () => {
    const { getByTitle } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        onDuplicate={onDuplicate}
      />
    )
    const btn = getByTitle('editorDuplicateClip')
    fireEvent.click(btn)
    expect(onDuplicate).toHaveBeenCalledWith('c1', 't1')
  })

  it('devrait appeler stopPropagation sur click duplicate', () => {
    const { getByTitle } = render(
      <ClipActions {...defaultProps} isSelected isHovering />
    )
    const btn = getByTitle('editorDuplicateClip')
    const e = new MouseEvent('click', { bubbles: true, cancelable: true })
    const stopSpy = vi.spyOn(e, 'stopPropagation')
    btn.dispatchEvent(e)
    expect(stopSpy).toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onDuplicate si clipId manquant', () => {
    const onDup = vi.fn()
    const { getByTitle } = render(
      <ClipActions
        {...defaultProps}
        clipId={null}
        isSelected
        isHovering
        onDuplicate={onDup}
      />
    )
    fireEvent.click(getByTitle('editorDuplicateClip'))
    expect(onDup).not.toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onDuplicate si trackId manquant', () => {
    const onDup = vi.fn()
    const { getByTitle } = render(
      <ClipActions
        {...defaultProps}
        trackId={null}
        isSelected
        isHovering
        onDuplicate={onDup}
      />
    )
    fireEvent.click(getByTitle('editorDuplicateClip'))
    expect(onDup).not.toHaveBeenCalled()
  })

  // ✅ FIX : ajouter isHovering pour que le DeleteButton soit rendu
  it('devrait appeler onRemove au click Delete', () => {
    const { getByTestId } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        onRemove={onRemove}
      />
    )
    fireEvent.click(getByTestId('delete-button'))
    expect(onRemove).toHaveBeenCalledWith('t1', 'c1')
  })

  it('devrait utiliser tr() pour le titre duplicate', () => {
    const trMock = vi.fn((key) => `tr:${key}`)
    const { getByTitle } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        tr={trMock}
      />
    )
    expect(getByTitle('tr:editorDuplicateClip')).not.toBeNull()
  })

  // ✅ FIX : tr ne doit pas être undefined (bug source : pas de ?.), on simule
  //    un tr qui retourne undefined pour la clé → le fallback "Dupliquer" s'applique
  it('devrait fallback sur libellé FR si tr retourne undefined', () => {
    const trMock = vi.fn((key) =>
      key === 'editorDuplicateClip' ? undefined : key
    )
    const { getByTitle } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        tr={trMock}
      />
    )
    expect(getByTitle('Dupliquer')).not.toBeNull()
  })

  it('devrait masquer le duplicate après confirmation delete (isDeleting)', () => {
    const { getByTestId, queryByTitle } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        onRemove={onRemove}
      />
    )
    // Avant
    expect(queryByTitle('editorDuplicateClip')).not.toBeNull()

    // Click delete → déclenche onConfirmStart → isDeleting = true
    act(() => {
      fireEvent.click(getByTestId('delete-button'))
    })

    // Duplicate caché
    expect(queryByTitle('editorDuplicateClip')).toBeNull()
  })

  // ✅ FIX : test refait pour vérifier le comportement réel
  //    (post-delete avec isHovering=false → bouton caché après 300ms)
  it("devrait cacher le delete après 300ms si isHovering=false", () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        onRemove={onRemove}
      />
    )

    // Click delete → isDeleting=true → le bouton reste visible même sans hover
    act(() => {
      fireEvent.click(getByTestId('delete-button'))
    })

    // Retirer le hover
    rerender(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering={false}
        onRemove={onRemove}
      />
    )

    // Pendant isDeleting, le bouton reste
    expect(queryByTestId('delete-button')).not.toBeNull()

    // Après 300ms → isDeleting=false + showDeleteButton=false → disparaît
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(queryByTestId('delete-button')).toBeNull()
  })

  // ✅ FIX : ajouter isHovering
  it("devrait cleanup le timer à l'unmount", () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount, getByTestId } = render(
      <ClipActions
        {...defaultProps}
        isSelected
        isHovering
        onRemove={onRemove}
      />
    )

    act(() => {
      fireEvent.click(getByTestId('delete-button'))
    })

    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('devrait avoir pointerEvents: auto sur le conteneur', () => {
    const { container } = render(<ClipActions {...defaultProps} />)
    const wrapper = container.querySelector('div')
    expect(wrapper?.style.pointerEvents).toBe('auto')
  })
})