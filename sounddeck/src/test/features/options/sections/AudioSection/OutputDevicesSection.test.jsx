import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import OutputDevicesSection from '@features/options/sections/AudioSection/OutputDevicesSection'

describe('OutputDevicesSection', () => {
  let store
  let addToast

  const audioDevices = [
    { deviceId: 'dev1', label: 'Device 1' },
    { deviceId: 'dev2', label: 'Device 2' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    store = {
      audioDevice: 'default',
      localAudioDevice: 'default',
      playLocally: true,
      updateAudioDevice: vi.fn(),
      updateLocalAudioDevice: vi.fn(),
      updatePlayLocally: vi.fn(),
    }
    addToast = vi.fn()
  })

  const renderSection = (overrides = {}) =>
    render(
      <OutputDevicesSection
        store={store}
        addToast={addToast}
        audioDevices={audioDevices}
        {...overrides}
      />
    )

  it('devrait afficher les 3 OptionRow', () => {
    renderSection()
    expect(screen.getByText('outputDevice')).toBeInTheDocument()
    expect(screen.getByText('localOutputDevice')).toBeInTheDocument()
    expect(screen.getByText('playLocally')).toBeInTheDocument()
  })

  it('devrait afficher 2 selects', () => {
    renderSection()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('devrait appeler updateAudioDevice', () => {
    renderSection()
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'dev1' } })
    expect(store.updateAudioDevice).toHaveBeenCalledWith('dev1')
  })

  it('devrait appeler updateLocalAudioDevice + addToast', () => {
    renderSection()
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'dev2' } })
    expect(store.updateLocalAudioDevice).toHaveBeenCalledWith('dev2')
    // addToast appelé de manière asynchrone
    return Promise.resolve().then(() => {
      expect(addToast).toHaveBeenCalled()
    })
  })

  it('devrait afficher le toggle playLocally actif', () => {
    const { container } = renderSection()
    const toggles = container.querySelectorAll('.toggle')
    expect(toggles[toggles.length - 1].className).toContain('active')
  })

  it('devrait appeler updatePlayLocally au click toggle', () => {
    const { container } = renderSection()
    const toggle = container.querySelector('.toggle')
    fireEvent.click(toggle)
    expect(store.updatePlayLocally).toHaveBeenCalledWith(false)
  })
})