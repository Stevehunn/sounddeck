import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  setLowLatencyMode: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  setLowLatencyMode: mocks.setLowLatencyMode,
}))

// Sous-sections mockées
vi.mock('@features/options/sections/AudioSection/OutputDevicesSection', () => ({
  default: () => <div data-testid="output-devices" />,
}))
vi.mock('@features/options/sections/AudioSection/VirtualDriverSection', () => ({
  default: () => <div data-testid="virtual-driver" />,
}))
vi.mock('@features/options/sections/AudioSection/MixerSection', () => ({
  default: () => <div data-testid="mixer-section" />,
}))
vi.mock('@features/options/sections/AudioSection/AdvancedAudioSection', () => ({
  default: () => <div data-testid="advanced-audio" />,
}))

import AudioSection from '@features/options/sections/AudioSection'

describe('AudioSection', () => {
  let store
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    store = {
      lowLatencyMode: false,
      updateLowLatencyMode: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()
  })

  const renderSection = (overrides = {}) =>
    render(
      <AudioSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
        audioDevices={[]}
        microphones={[]}
        isDetecting={false}
        isInstallingDriver={false}
        isMicrophoneTesting={false}
        onInstallDriver={vi.fn()}
        onDetectDevices={vi.fn()}
        onTestMicrophone={vi.fn()}
      />
    )

  it('devrait afficher le titre optionsAudio', () => {
    renderSection()
    expect(screen.getByText('optionsAudio')).toBeInTheDocument()
  })

  it('devrait afficher les 4 sous-sections', () => {
    renderSection()
    expect(screen.getByTestId('output-devices')).toBeInTheDocument()
    expect(screen.getByTestId('virtual-driver')).toBeInTheDocument()
    expect(screen.getByTestId('mixer-section')).toBeInTheDocument()
    expect(screen.getByTestId('advanced-audio')).toBeInTheDocument()
  })

  it('devrait afficher l\'OptionRow lowLatencyMode', () => {
    renderSection()
    expect(screen.getByText('lowLatencyMode')).toBeInTheDocument()
  })

  it('devrait appeler updateLowLatencyMode au click', async () => {
    const { container } = renderSection()
    const toggle = container.querySelector('.toggle')
    fireEvent.click(toggle)

    expect(store.updateLowLatencyMode).toHaveBeenCalledWith(true)
    await Promise.resolve()
    expect(mocks.setLowLatencyMode).toHaveBeenCalledWith(true)
  })

  it('devrait afficher un toast d\'activation lowLatency', async () => {
    const { container } = renderSection()
    fireEvent.click(container.querySelector('.toggle'))

    await Promise.resolve()
    expect(addToast).toHaveBeenCalledWith('lowLatencyActivated', 'info')
  })

  it('devrait afficher un toast de désactivation si déjà activé', async () => {
    const { container } = renderSection({ lowLatencyMode: true })
    fireEvent.click(container.querySelector('.toggle'))

    await Promise.resolve()
    expect(addToast).toHaveBeenCalledWith('lowLatencyDeactivated', 'info')
  })

  it('devrait exposer le testid de section', () => {
    renderSection()
    expect(screen.getByTestId('section-audio')).toBeInTheDocument()
  })
})