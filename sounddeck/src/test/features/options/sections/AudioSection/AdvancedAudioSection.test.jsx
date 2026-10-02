import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  setNoiseSuppressionMode: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  setNoiseSuppressionMode: mocks.setNoiseSuppressionMode,
}))

// Rendre CollapsibleSection transparent pour exposer son contenu
vi.mock('@features/options/CollapsibleSection', () => ({
  default: ({ title, children }) => (
    <div data-testid="collapsible">
      <div>{title}</div>
      {children}
    </div>
  ),
}))

import AdvancedAudioSection from '@features/options/sections/AudioSection/AdvancedAudioSection'

describe('AdvancedAudioSection', () => {
  let store
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    store = {
      noiseSuppressionMode: 'auto',
      updateNoiseSuppressionMode: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()
    window.electronAPI = { openExternal: vi.fn() }
  })

  const renderSection = (overrides = {}) =>
    render(
      <AdvancedAudioSection
        store={{ ...store, ...overrides }}
        addToast={addToast}
      />
    )

  it('devrait afficher le titre advancedAudioOptions', () => {
    renderSection()
    expect(screen.getByText('advancedAudioOptions')).toBeInTheDocument()
  })

  it('devrait afficher le select avec 4 options', () => {
    renderSection()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
  })

  it('devrait refléter noiseSuppressionMode', () => {
    renderSection({ noiseSuppressionMode: 'worklet' })
    expect(screen.getByRole('combobox')).toHaveValue('worklet')
  })

  it('devrait appeler updateNoiseSuppressionMode au change', async () => {
    renderSection()
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'filter' },
    })

    expect(store.updateNoiseSuppressionMode).toHaveBeenCalledWith('filter')
    await Promise.resolve()
    expect(mocks.setNoiseSuppressionMode).toHaveBeenCalledWith('filter')
  })

  it('devrait appeler addToast avec le mode changé', async () => {
    renderSection()
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'off' },
    })

    await Promise.resolve()
    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('noiseSuppressionModeChanged'),
      'info'
    )
  })

  it('devrait afficher le texte advancedMode', () => {
    renderSection()
    expect(screen.getByText('advancedMode')).toBeInTheDocument()
  })

  it('devrait ouvrir VB-Cable au click', () => {
    renderSection()
    fireEvent.click(screen.getByText('downloadVBCable'))
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(
      'https://vb-audio.com/Cable/'
    )
  })

  it('devrait ouvrir VoiceMeeter au click', () => {
    renderSection()
    fireEvent.click(screen.getByText('downloadVoiceMeeter'))
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(
      'https://vb-audio.com/Voicemeeter/banana.htm'
    )
  })
})