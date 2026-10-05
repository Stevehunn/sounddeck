// src/test/features/editor/components/Track/TrackControls.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TrackControls from '@features/editor/components/Track/TrackControls'

const makeTrack = (overrides = {}) => ({
  id: 't1',
  name: 'Piste 1',
  muted: false,
  solo: false,
  volume: 1,
  ...overrides,
})

const tr = (k) => {
  const FR = {
    editorMute: 'Couper la piste',
    editorSolo: 'Solo',
    editorTrackVolume: 'Volume de la piste',
  }
  return FR[k] || k
}

const defaultProps = (overrides = {}) => ({
  track: makeTrack(),
  trackColor: '#7c6ff7',
  onTrackMute: vi.fn(),
  onTrackSolo: vi.fn(),
  onTrackVolume: vi.fn(),
  tr,
  ...overrides,
})

const renderControls = (props = {}) => {
  const { container } = render(<TrackControls {...defaultProps(props)} />)
  const buttons = container.querySelectorAll('button')
  return { container, muteBtn: buttons[0], soloBtn: buttons[1] }
}

describe('TrackControls', () => {
  describe('Mute', () => {
    it('affiche l\'icône volume quand non muted', () => {
      const { muteBtn } = renderControls()
      expect(muteBtn.querySelector('.ti-volume')).toBeInTheDocument()
      expect(muteBtn.querySelector('.ti-volume-3')).not.toBeInTheDocument()
    })

    it('affiche l\'icône volume-3 quand muted', () => {
      const { muteBtn } = renderControls({ track: makeTrack({ muted: true }) })
      expect(muteBtn.querySelector('.ti-volume-3')).toBeInTheDocument()
    })

    it('clic mute appelle onTrackMute avec (id, !muted)', () => {
      const onTrackMute = vi.fn()
      const { muteBtn } = renderControls({ onTrackMute })
      fireEvent.click(muteBtn)
      expect(onTrackMute).toHaveBeenCalledWith('t1', true)
    })

    it('clic mute sur track déjà muted → !true = false', () => {
      const onTrackMute = vi.fn()
      const { muteBtn } = renderControls({
        track: makeTrack({ muted: true }),
        onTrackMute,
      })
      fireEvent.click(muteBtn)
      expect(onTrackMute).toHaveBeenCalledWith('t1', false)
    })

    it('affiche le title traduit', () => {
      const { muteBtn } = renderControls()
      expect(muteBtn.getAttribute('title')).toBe('Couper la piste')
    })
  })

  describe('Solo', () => {
    it('icône headphones toujours présente', () => {
      const { soloBtn } = renderControls()
      expect(soloBtn.querySelector('.ti-headphones')).toBeInTheDocument()
    })

    it('clic solo appelle onTrackSolo avec (id, !solo)', () => {
      const onTrackSolo = vi.fn()
      const { soloBtn } = renderControls({ onTrackSolo })
      fireEvent.click(soloBtn)
      expect(onTrackSolo).toHaveBeenCalledWith('t1', true)
    })

    it('clic solo sur track déjà solo → false', () => {
      const onTrackSolo = vi.fn()
      const { soloBtn } = renderControls({
        track: makeTrack({ solo: true }),
        onTrackSolo,
      })
      fireEvent.click(soloBtn)
      expect(onTrackSolo).toHaveBeenCalledWith('t1', false)
    })

    it('couleur success si solo', () => {
      const { soloBtn } = renderControls({ track: makeTrack({ solo: true }) })
      expect(soloBtn.style.color).toContain('var(--success)')
    })
  })

  describe('Volume', () => {
    it('slider avec min=0 max=200', () => {
      const { container } = renderControls()
      const slider = container.querySelector('input[type="range"]')
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '200')
    })

    it('valeur = track.volume * 100', () => {
      const { container } = renderControls({
        track: makeTrack({ volume: 0.5 }),
      })
      const slider = container.querySelector('input[type="range"]')
      expect(slider.value).toBe('50')
    })

    it('valeur par défaut 100 si volume undefined', () => {
      const { container } = renderControls({
        track: makeTrack({ volume: undefined }),
      })
      const slider = container.querySelector('input[type="range"]')
      expect(slider.value).toBe('100')
    })

    it('onChange appelle onTrackVolume avec (id, value/100)', () => {
      const onTrackVolume = vi.fn()
      const { container } = renderControls({ onTrackVolume })
      const slider = container.querySelector('input[type="range"]')
      fireEvent.change(slider, { target: { value: '75' } })
      expect(onTrackVolume).toHaveBeenCalledWith('t1', 0.75)
    })

    it('accentColor = trackColor', () => {
      const { container } = renderControls({ trackColor: '#ff0000' })
      const slider = container.querySelector('input[type="range"]')
      expect(slider.style.accentColor).toBe('rgb(255, 0, 0)')
    })
  })
})