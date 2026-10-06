// src/test/components/settings/OBSControl.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  connectOBS: vi.fn(),
  disconnectOBS: vi.fn(),
  getOBSStatus: vi.fn(() => ({ connected: false })),
  startOBSRecording: vi.fn(),
  stopOBSRecording: vi.fn(),
  startOBSStreaming: vi.fn(),
  stopOBSStreaming: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('@shared/utils/obsIntegration', () => ({
  connectOBS: mocks.connectOBS,
  disconnectOBS: mocks.disconnectOBS,
  getOBSStatus: mocks.getOBSStatus,
  startOBSRecording: mocks.startOBSRecording,
  stopOBSRecording: mocks.stopOBSRecording,
  startOBSStreaming: mocks.startOBSStreaming,
  stopOBSStreaming: mocks.stopOBSStreaming,
}))

import OBSControl from '@shared/components/settings/OBSControl'

beforeEach(() => {
  mocks.connectOBS.mockReset().mockResolvedValue({ success: true })
  mocks.disconnectOBS.mockReset()
  mocks.getOBSStatus.mockReset().mockReturnValue({ connected: false })
  mocks.startOBSRecording.mockReset().mockResolvedValue({ success: true })
  mocks.stopOBSRecording.mockReset().mockResolvedValue({ success: true })
  mocks.startOBSStreaming.mockReset().mockResolvedValue({ success: true })
  mocks.stopOBSStreaming.mockReset().mockResolvedValue({ success: true })
})

const renderControl = (props = {}) => render(<OBSControl {...props} />)

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > Rendu', () => {
  it('affiche "OBS Studio"', () => {
    renderControl()
    expect(screen.getByText('OBS Studio')).toBeInTheDocument()
  })

  it('affiche disconnected par défaut', () => {
    renderControl()
    expect(screen.getByText('disconnected')).toBeInTheDocument()
  })

  it('affiche connected si getOBSStatus retourne connected: true', async () => {
    mocks.getOBSStatus.mockReturnValue({ connected: true })
    renderControl()
    await waitFor(() => {
      expect(screen.getByText('connected')).toBeInTheDocument()
    })
  })

  it('affiche le bouton "Se connecter à OBS"', () => {
    renderControl()
    expect(screen.getByText('obsConnect')).toBeInTheDocument()
  })

  it('cache les contrôles recording/streaming si non connecté', () => {
    renderControl()
    expect(screen.queryByText('obsStartRecording')).not.toBeInTheDocument()
    expect(screen.queryByText('obsStartStreaming')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// CONFIG (collapse)
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > Config collapse', () => {
  it('clic chevron ouvre la config', () => {
    renderControl()
    const configBtn = document.querySelector('.ti-chevron-down').closest('button')
    fireEvent.click(configBtn)
    expect(screen.getByPlaceholderText('obsHost')).toBeInTheDocument()
  })

  it('affiche host/port/password par défaut', () => {
    renderControl()
    fireEvent.click(document.querySelector('.ti-chevron-down').closest('button'))

    const hostInput = screen.getByPlaceholderText('obsHost')
    const portInput = screen.getByPlaceholderText('obsPort')
    const passInput = screen.getByPlaceholderText('obsPassword')

    expect(hostInput.value).toBe('localhost')
    expect(portInput.value).toBe('4455')
    expect(passInput.value).toBe('')
  })

  it('modifie le host', () => {
    renderControl()
    fireEvent.click(document.querySelector('.ti-chevron-down').closest('button'))

    const hostInput = screen.getByPlaceholderText('obsHost')
    fireEvent.change(hostInput, { target: { value: '192.168.1.10' } })
    expect(hostInput.value).toBe('192.168.1.10')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// CONNECT
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > handleConnect', () => {
  it('appelle connectOBS avec la config', async () => {
    renderControl()
    fireEvent.click(screen.getByText('obsConnect'))

    await waitFor(() => {
      expect(mocks.connectOBS).toHaveBeenCalledWith({
        host: 'localhost',
        port: 4455,
        password: '',
      })
    })
  })

  it('affiche connected si succès', async () => {
    mocks.connectOBS.mockResolvedValue({ success: true })
    renderControl()
    fireEvent.click(screen.getByText('obsConnect'))

    await waitFor(() => {
      expect(screen.getByText('obsConnected')).toBeInTheDocument()
    })
  })

  it('affiche erreur si échec', async () => {
    mocks.connectOBS.mockResolvedValue({ success: false, error: 'refused' })
    renderControl()
    fireEvent.click(screen.getByText('obsConnect'))

    await waitFor(() => {
      expect(screen.getByText(/obsConnectionError: refused/)).toBeInTheDocument()
    })
  })

  it('gère exception connectOBS', async () => {
    mocks.connectOBS.mockRejectedValue(new Error('network'))
    renderControl()
    fireEvent.click(screen.getByText('obsConnect'))

    await waitFor(() => {
      expect(screen.getByText(/obsConnectionError: network/)).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// DISCONNECT
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > handleDisconnect', () => {
  it('appelle disconnectOBS', async () => {
    mocks.getOBSStatus.mockReturnValue({ connected: true })
    renderControl()
    await waitFor(() => screen.getByText('disconnect'))

    fireEvent.click(screen.getByText('disconnect'))

    expect(mocks.disconnectOBS).toHaveBeenCalled()
  })

  it('affiche disconnected après', async () => {
    mocks.getOBSStatus.mockReturnValue({ connected: true })
    renderControl()
    await waitFor(() => screen.getByText('disconnect'))

    fireEvent.click(screen.getByText('disconnect'))

    await waitFor(() => {
      expect(screen.getByText('disconnected')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// RECORDING
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > Recording', () => {
  beforeEach(() => {
    mocks.getOBSStatus.mockReturnValue({ connected: true })
  })

  it('start recording → startOBSRecording', async () => {
    renderControl()
    await waitFor(() => screen.getByText('obsStartRecording'))

    fireEvent.click(screen.getByText('obsStartRecording'))

    await waitFor(() => {
      expect(mocks.startOBSRecording).toHaveBeenCalled()
      expect(screen.getByText('obsRecordingStarted')).toBeInTheDocument()
    })
  })

  it('stop recording après start', async () => {
    renderControl()
    await waitFor(() => screen.getByText('obsStartRecording'))

    fireEvent.click(screen.getByText('obsStartRecording'))

    await waitFor(() => screen.getByText('obsStopRecording'))
    fireEvent.click(screen.getByText('obsStopRecording'))

    await waitFor(() => {
      expect(mocks.stopOBSRecording).toHaveBeenCalled()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// STREAMING
// ═══════════════════════════════════════════════════════════════════════
describe('OBSControl > Streaming', () => {
  beforeEach(() => {
    mocks.getOBSStatus.mockReturnValue({ connected: true })
  })

  it('start streaming → startOBSStreaming', async () => {
    renderControl()
    await waitFor(() => screen.getByText('obsStartStreaming'))

    fireEvent.click(screen.getByText('obsStartStreaming'))

    await waitFor(() => {
      expect(mocks.startOBSStreaming).toHaveBeenCalled()
    })
  })

  it('stop streaming après start', async () => {
    renderControl()
    await waitFor(() => screen.getByText('obsStartStreaming'))

    fireEvent.click(screen.getByText('obsStartStreaming'))

    await waitFor(() => screen.getByText('obsStopStreaming'))
    fireEvent.click(screen.getByText('obsStopStreaming'))

    await waitFor(() => {
      expect(mocks.stopOBSStreaming).toHaveBeenCalled()
    })
  })
})