import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DropIndicator from '@shared/components/ui/DropIndicator'

describe('DropIndicator', () => {
  it('ne devrait rien rendre si position est null', () => {
    const { container } = render(<DropIndicator position={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('ne devrait rien rendre si position est undefined', () => {
    const { container } = render(<DropIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un div avec la classe drop-indicator', () => {
    const { container } = render(<DropIndicator position={{}} />)
    const div = container.querySelector('.drop-indicator')
    expect(div).toBeInTheDocument()
  })

  it('devrait appliquer les positions top/left/right/bottom', () => {
    const { container } = render(
      <DropIndicator
        position={{ top: 10, left: 20, right: 30, bottom: 40 }}
      />
    )
    const div = container.querySelector('.drop-indicator')
    expect(div.style.top).toBe('10px')
    expect(div.style.left).toBe('20px')
    expect(div.style.right).toBe('30px')
    expect(div.style.bottom).toBe('40px')
  })

  it('devrait appliquer 0 par défaut pour les positions manquantes', () => {
    const { container } = render(<DropIndicator position={{ top: 5 }} />)
    const div = container.querySelector('.drop-indicator')
    expect(div.style.top).toBe('5px')
    expect(div.style.left).toBe('0px')
    expect(div.style.right).toBe('0px')
    expect(div.style.bottom).toBe('0px')
  })

  it('devrait fusionner le style passé en props', () => {
    const { container } = render(
      <DropIndicator
        position={{ top: 0 }}
        style={{ opacity: 0.5, background: 'red' }}
      />
    )
    const div = container.querySelector('.drop-indicator')
    expect(div.style.opacity).toBe('0.5')
    expect(div.style.background).toBe('red')
  })
})