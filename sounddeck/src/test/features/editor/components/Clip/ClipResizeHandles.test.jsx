import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ClipResizeHandles from '@features/editor/components/Clip/ClipResizeHandles'

describe('ClipResizeHandles', () => {
  const defaultProps = {
    isSelected: false,
    isHovering: false,
    duration: 3,
    pixelsPerSecond: 80,
    onResizeStart: vi.fn(),
    onResizeEnd: vi.fn(),
  }

  it('devrait retourner null si ni sélectionné ni hover', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre 2 handles si sélectionné', () => {
    const { container } = render(
      <ClipResizeHandles {...defaultProps} isSelected />
    )
    const handles = container.querySelectorAll('[data-resize]')
    expect(handles).toHaveLength(2)
  })

  it('devrait rendre 2 handles si hovering', () => {
    const { container } = render(
      <ClipResizeHandles {...defaultProps} isHovering />
    )
    const handles = container.querySelectorAll('[data-resize]')
    expect(handles).toHaveLength(2)
  })

  it('devrait avoir data-resize="start" et "end"', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} isSelected />)
    expect(container.querySelector('[data-resize="start"]')).not.toBeNull()
    expect(container.querySelector('[data-resize="end"]')).not.toBeNull()
  })

  it('devrait appeler onResizeStart sur mousedown de start', () => {
    const onResizeStart = vi.fn()
    const { container } = render(
      <ClipResizeHandles {...defaultProps} isSelected onResizeStart={onResizeStart} />
    )
    const startHandle = container.querySelector('[data-resize="start"]')
    fireEvent.mouseDown(startHandle)
    expect(onResizeStart).toHaveBeenCalledTimes(1)
  })

  it('devrait appeler onResizeEnd sur mousedown de end', () => {
    const onResizeEnd = vi.fn()
    const { container } = render(
      <ClipResizeHandles {...defaultProps} isSelected onResizeEnd={onResizeEnd} />
    )
    const endHandle = container.querySelector('[data-resize="end"]')
    fireEvent.mouseDown(endHandle)
    expect(onResizeEnd).toHaveBeenCalledTimes(1)
  })

  it('devrait avoir cursor ew-resize', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} isSelected />)
    const startHandle = container.querySelector('[data-resize="start"]')
    expect(startHandle?.style.cursor).toBe('ew-resize')
  })

  it('devrait positionner start à left: -4px', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} isSelected />)
    const startHandle = container.querySelector('[data-resize="start"]')
    expect(startHandle?.style.left).toBe('-4px')
  })

  it('devrait positionner end à right: -4px', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} isSelected />)
    const endHandle = container.querySelector('[data-resize="end"]')
    expect(endHandle?.style.right).toBe('-4px')
  })

  it('devrait avoir zIndex 6 sur les handles', () => {
    const { container } = render(<ClipResizeHandles {...defaultProps} isSelected />)
    const startHandle = container.querySelector('[data-resize="start"]')
    expect(startHandle?.style.zIndex).toBe('6')
  })
})