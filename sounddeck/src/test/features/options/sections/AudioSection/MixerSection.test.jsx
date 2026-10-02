import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  changeMicrophone: vi.fn(),
  setSoundVolume: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  changeMicrophone: mocks.changeMicrophone,
  setSoundVolume: mocks.setSoundVolume,
}))

import MixerSection from '@features/options/sections/AudioSection/MixerSection'

describe('MixerSection', () => {
  let store
  let addToast

  const microphones = [
    { deviceId: 'mic1', label: 'Micro 1' },
    { deviceId: 'mic2', label: 'Micro 2' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    store = {
      mixerEnabled: false,
      microphoneDevice: 'default',
      mixerSoundVolume: 100,
      monitoringEnabled: false,
      updateMixerEnabled: vi.fn().mockResolvedValue({ success: true, message: 'mixerActivated' }),
      updateMicrophoneDeviceId: vi.fn().mockResolvedValue(),
      updateMixerSoundVolume: vi.fn().mockResolvedValue(),
      toggleMonitoring: vi.fn().mockResolvedValue(true),
    }
    addToast = vi.fn()
  })

  const renderSection = (overrides = {}) =>
    render(
      <MixerSection
        store={{ ...store, ...overrides }}
        addToast={addToast}
        microphones={microphones}
        isMicrophoneTesting={false}
        onTestMicrophone={vi.fn()}
      />
    )

  it('devrait afficher le toggle mixerEnable', () => {
    renderSection()
    expect(screen.getByText('mixerEnable')).toBeInTheDocument()
  })

  it('devrait appeler updateMixerEnabled au click', async () => {
    const { container } = renderSection()
    fireEvent.click(container.querySelector('.toggle'))
    expect(store.updateMixerEnabled).toHaveBeenCalled()
  })

  it('devrait afficher un toast succès après activation', async () => {
    const { container } = renderSection()
    fireEvent.click(container.querySelector('.toggle'))
    await Promise.resolve()
    expect(addToast).toHaveBeenCalledWith('mixerActivated', 'success')
  })

  it('devrait afficher un toast erreur si échec', async () => {
    const { container } = renderSection({
      updateMixerEnabled: vi.fn().mockResolvedValue({
        success: false,
        message: 'mixerError',
        error: 'Permission denied',
      }),
    })
    fireEvent.click(container.querySelector('.toggle'))
    await Promise.resolve()
    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('Permission denied'),
      'error'
    )
  })

  // ─── Mode désactivé ────────────────────────────────────────────────

  it('ne devrait PAS afficher le select micro si mixerEnabled=false', () => {
    renderSection({ mixerEnabled: false })
    expect(screen.queryByText('microphone')).not.toBeInTheDocument()
  })

  // ─── Mode activé ───────────────────────────────────────────────────

  it('devrait afficher le select micro si mixerEnabled=true', () => {
    renderSection({ mixerEnabled: true })
    expect(screen.getByText('microphone')).toBeInTheDocument()
  })

  it('devrait afficher les 3 micros (default + 2)', () => {
    renderSection({ mixerEnabled: true })
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
  })

  it('devrait appeler updateMicrophoneDeviceId + changeMicrophone au change', async () => {
    renderSection({ mixerEnabled: true })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mic1' } })

    expect(store.updateMicrophoneDeviceId).toHaveBeenCalledWith('mic1')
    await Promise.resolve()
    expect(mocks.changeMicrophone).toHaveBeenCalledWith('mic1')
  })

  it('devrait afficher le slider mixerSoundVolume', () => {
    renderSection({ mixerEnabled: true })
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('devrait appeler setSoundVolume au change', async () => {
    renderSection({ mixerEnabled: true })
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })

    expect(store.updateMixerSoundVolume).toHaveBeenCalledWith(50)
    await Promise.resolve()
    expect(mocks.setSoundVolume).toHaveBeenCalledWith(0.5)
  })

  it('devrait afficher le toggle monitoring', () => {
    renderSection({ mixerEnabled: true })
    expect(screen.getByText('monitoring')).toBeInTheDocument()
  })

  it('devrait appeler toggleMonitoring au click', async () => {
    const { container } = renderSection({ mixerEnabled: true })
    const toggles = container.querySelectorAll('.toggle')
    // Le 2e toggle est le monitoring
    fireEvent.click(toggles[toggles.length - 1])
    expect(store.toggleMonitoring).toHaveBeenCalled()
  })

  it('devrait afficher le bouton tester micro', () => {
    renderSection({ mixerEnabled: true })
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('devrait afficher micTesting si isMicrophoneTesting', () => {
    render(
      <MixerSection
        store={{ ...store, mixerEnabled: true }}
        addToast={addToast}
        microphones={microphones}
        isMicrophoneTesting={true}
        onTestMicrophone={vi.fn()}
      />
    )
    expect(screen.getByText('micTesting')).toBeInTheDocument()
  })

  it('devrait appeler onTestMicrophone au click', () => {
    const onTest = vi.fn()
    render(
      <MixerSection
        store={{ ...store, mixerEnabled: true }}
        addToast={addToast}
        microphones={microphones}
        isMicrophoneTesting={false}
        onTestMicrophone={onTest}
      />
    )
    fireEvent.click(screen.getByText('test'))
    expect(onTest).toHaveBeenCalled()
  })

  it('devrait afficher le warning si monitoringEnabled=true', () => {
    renderSection({ mixerEnabled: true, monitoringEnabled: true })
    expect(screen.getByText(/monitoringWarning/)).toBeInTheDocument()
  })
})