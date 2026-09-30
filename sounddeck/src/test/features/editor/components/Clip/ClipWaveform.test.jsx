import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ClipWaveform from '@features/editor/components/Clip/ClipWaveform'

describe('ClipWaveform', () => {
  it('devrait retourner null si waveformData absent', () => {
    const { container } = render(
      <ClipWaveform trackColor="#abc" duration={3} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait retourner null si waveformData vide', () => {
    const { container } = render(
      <ClipWaveform waveformData={[]} trackColor="#abc" duration={3} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un conteneur si waveformData non vide', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    expect(container.firstChild).not.toBeNull()
  })

  it('devrait rendre autant de barres que de samples', () => {
    const data = [0.5, 0.8, 0.3, 0.9, 0.2]
    const { container } = render(
      <ClipWaveform waveformData={data} trackColor="#abc" duration={3} />
    )
    // Conteneur → barres
    const bars = container.querySelector('div')?.querySelectorAll(':scope > div')
    expect(bars).toHaveLength(5)
  })

  it('devrait limiter à 100 samples max', () => {
    const data = Array.from({ length: 250 }, (_, i) => i / 250)
    const { container } = render(
      <ClipWaveform waveformData={data} trackColor="#abc" duration={3} />
    )
    const bars = container.querySelector('div')?.querySelectorAll(':scope > div')
    expect(bars).toHaveLength(100)
  })

  it('devrait appliquer la trackColor à chaque barre', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="rgb(255,0,0)" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    expect(bar?.style.background).toBe('rgb(255, 0, 0)')
  })

  it('devrait avoir une hauteur minimale de 4%', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0]} trackColor="#abc" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    expect(bar?.style.height).toBe('4%')
  })

  it('devrait clamper la hauteur à 80% max', () => {
    const { container } = render(
      <ClipWaveform waveformData={[2.0]} trackColor="#abc" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    expect(bar?.style.height).toBe('80%')
  })

  it('devrait calculer la hauteur à partir de la valeur absolue', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    // 0.5 * 100 = 50%
    expect(bar?.style.height).toBe('50%')
  })

  it('devrait appliquer scaleY(-1) pour les valeurs négatives', () => {
    const { container } = render(
      <ClipWaveform waveformData={[-0.5]} trackColor="#abc" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    expect(bar?.style.transform).toContain('scaleY(-1)')
  })

  it('devrait appliquer scaleY(1) pour les valeurs positives', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    const bar = container.querySelector('div')?.querySelector(':scope > div')
    expect(bar?.style.transform).toContain('scaleY(1)')
  })

  it('devrait avoir pointerEvents: none sur le conteneur', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    const wrapper = container.querySelector('div')
    expect(wrapper?.style.pointerEvents).toBe('none')
  })

  it('devrait utiliser position absolute inset 0', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    const wrapper = container.querySelector('div')
    expect(wrapper?.style.position).toBe('absolute')
  })

  it('devrait avoir une opacité de 0.2', () => {
    const { container } = render(
      <ClipWaveform waveformData={[0.5]} trackColor="#abc" duration={3} />
    )
    const wrapper = container.querySelector('div')
    expect(wrapper?.style.opacity).toBe('0.2')
  })
})