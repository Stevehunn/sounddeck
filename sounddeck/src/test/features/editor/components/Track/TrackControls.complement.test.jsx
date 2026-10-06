// src/test/features/editor/components/Track/TrackControls.complement.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TrackControls from '@features/editor/components/Track/TrackControls'

const tr = (k) => k

const makeTrack = (overrides = {}) => ({
  id: 't1',
  muted: false,
  solo: false,
  volume: 1,
  ...overrides,
})

const renderControls = (props = {}) => {
  const { container } = render(
    <TrackControls
      track={makeTrack()}
      trackColor="#7c6ff7"
      onTrackMute={vi.fn()}
      onTrackSolo={vi.fn()}
      onTrackVolume={vi.fn()}
      tr={tr}
      {...props}
    />
  )
  const buttons = container.querySelectorAll('button')
  return { container, muteBtn: buttons[0], soloBtn: buttons[1] }
}

// ═══════════════════════════════════════════════════════════════════════
// HOVER STATES (lignes 38-46 et 73-81)
// ═══════════════════════════════════════════════════════════════════════
describe('TrackControls > Hover mute', () => {
  it('mouseenter sur mute non-muted change la couleur', () => {
    const { muteBtn } = renderControls()
    const initialColor = muteBtn.style.color

    fireEvent.mouseEnter(muteBtn)
    expect(muteBtn.style.color).toBe('var(--text-secondary)')
    expect(muteBtn.style.background).toBe('var(--bg-hover)')

    fireEvent.mouseLeave(muteBtn)
    expect(muteBtn.style.color).toBe('var(--text-tertiary)')
    expect(muteBtn.style.background).toBe('transparent')
  })

  it('mouseenter sur mute muted → ne change PAS la couleur', () => {
    const { muteBtn } = renderControls({ track: makeTrack({ muted: true }) })
    const initialColor = muteBtn.style.color

    fireEvent.mouseEnter(muteBtn)
    expect(muteBtn.style.color).toBe(initialColor)
    expect(muteBtn.style.background).toContain('rgba(224, 82, 82, 0.1)')

    fireEvent.mouseLeave(muteBtn)
    expect(muteBtn.style.color).toBe(initialColor)
    expect(muteBtn.style.background).toContain('rgba(224, 82, 82, 0.1)')
  })
})

describe('TrackControls > Hover solo', () => {
  it('mouseenter sur solo non-solo change la couleur', () => {
    const { soloBtn } = renderControls()

    fireEvent.mouseEnter(soloBtn)
    expect(soloBtn.style.color).toBe('var(--text-secondary)')
    expect(soloBtn.style.background).toBe('var(--bg-hover)')

    fireEvent.mouseLeave(soloBtn)
    expect(soloBtn.style.color).toBe('var(--text-tertiary)')
    expect(soloBtn.style.background).toBe('transparent')
  })

  it('mouseenter sur solo active → ne change PAS la couleur', () => {
    const { soloBtn } = renderControls({ track: makeTrack({ solo: true }) })
    const initialColor = soloBtn.style.color

    fireEvent.mouseEnter(soloBtn)
    expect(soloBtn.style.color).toBe(initialColor)

    fireEvent.mouseLeave(soloBtn)
    expect(soloBtn.style.color).toBe(initialColor)
  })
})