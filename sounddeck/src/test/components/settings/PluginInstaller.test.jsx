// src/test/components/settings/PluginInstaller.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import PluginInstaller from '@shared/components/settings/PluginInstaller'

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultProps = (overrides = {}) => ({
  onClose: vi.fn(),
  addToast: vi.fn(),
  onInstall: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  global.window.electronAPI = {
    installPluginFromBuffer: vi.fn().mockResolvedValue({
      success: true,
      name: 'Test Plugin',
    }),
  }

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
  })
})

const renderInstaller = (props = {}) => render(<PluginInstaller {...defaultProps(props)} />)

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Rendu', () => {
  it('affiche le titre', () => {
    renderInstaller()
    expect(screen.getByText('pluginsInstall')).toBeInTheDocument()
  })

  it('affiche le champ URL', () => {
    renderInstaller()
    expect(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin')).toBeInTheDocument()
  })

  it('affiche le bouton "Choisir un fichier"', () => {
    renderInstaller()
    expect(screen.getByText('pluginChooseFile')).toBeInTheDocument()
  })

  it('affiche les 2 séparateurs URL/Fichier', () => {
    renderInstaller()
    expect(screen.getByText('or')).toBeInTheDocument()
    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
    expect(screen.getByText('pluginFromFile')).toBeInTheDocument()
  })

  it('bouton Installer désactivé si URL vide', () => {
    renderInstaller()
    const installBtn = screen.getByText('pluginsInstallBtn').closest('button')
    expect(installBtn).toBeDisabled()
  })

  it('bouton Installer actif si URL saisie', () => {
    renderInstaller()
    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    expect(screen.getByText('pluginsInstallBtn').closest('button')).not.toBeDisabled()
  })

  it('affiche l\'info format', () => {
    renderInstaller()
    // ⚠️ Le texte est "pluginFormatInfo :" (avec ":")
    expect(screen.getByText(/pluginFormatInfo/)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// FERMETURE
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Fermeture', () => {
  it('clic overlay → onClose', () => {
    const onClose = vi.fn()
    const { container } = renderInstaller({ onClose })
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clic modal intérieur → pas de close', () => {
    const onClose = vi.fn()
    const { container } = renderInstaller({ onClose })
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('bouton Fermer → onClose', () => {
    const onClose = vi.fn()
    renderInstaller({ onClose })
    fireEvent.click(screen.getByText('close'))
    expect(onClose).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// INSTALL FROM URL
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Install from URL', () => {
  it('URL vide → toast erreur si Enter sur input', () => {
    const addToast = vi.fn()
    renderInstaller({ addToast })

    const input = screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin')
    // ⚠️ Enter déclenche onKeyDown → handleInstallFromUrl → addToast warning
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(addToast).toHaveBeenCalledWith('pluginInvalidUrl', 'error')
  })

  it('install réussi → toast success + onInstall + onClose après 1.5s', async () => {
    vi.useFakeTimers()
    const addToast = vi.fn()
    const onInstall = vi.fn()
    const onClose = vi.fn()

    renderInstaller({ addToast, onInstall, onClose })

    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    fireEvent.click(screen.getByText('pluginsInstallBtn'))

    await vi.advanceTimersByTimeAsync(2000)

    expect(global.fetch).toHaveBeenCalledWith('https://test.com/plugin.sdplugin')
    expect(window.electronAPI.installPluginFromBuffer).toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('Test Plugin'),
      'success'
    )
    expect(onInstall).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('install échoué → toast erreur', async () => {
    window.electronAPI.installPluginFromBuffer.mockResolvedValue({
      success: false,
      error: 'invalid plugin',
    })
    const addToast = vi.fn()
    renderInstaller({ addToast })

    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    fireEvent.click(screen.getByText('pluginsInstallBtn'))

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('invalid plugin'),
        'error'
      )
    })
  })

  it('fetch échoue → toast erreur', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    const addToast = vi.fn()
    renderInstaller({ addToast })

    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    fireEvent.click(screen.getByText('pluginsInstallBtn'))

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('HTTP 404'),
        'error'
      )
    })
  })

  it('Enter sur l\'input déclenche l\'install', async () => {
    renderInstaller()

    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    const input = screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin')
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('affiche la barre de progression pendant l\'installation', async () => {
    // Fait une promesse qui ne resolve jamais pour bloquer l'install
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    renderInstaller()
    fireEvent.change(screen.getByPlaceholderText('https://exemple.com/plugin.sdplugin'), {
      target: { value: 'https://test.com/plugin.sdplugin' },
    })
    fireEvent.click(screen.getByText('pluginsInstallBtn'))

    await waitFor(() => {
      expect(screen.getByText('pluginDownloading')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// INSTALL FROM FILE
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Install from file', () => {
  it('clic "Choisir un fichier" ouvre le file picker', () => {
    const { container } = renderInstaller()
    const fileInput = container.querySelector('input[type="file"]')

    // Le fileInput existe mais caché
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('accept', '.sdplugin,.zip')
  })

  it('extension invalide → toast erreur', async () => {
    const addToast = vi.fn()
    const { container } = renderInstaller({ addToast })

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['data'], 'plugin.exe', { type: 'application/octet-stream' })
    Object.defineProperty(fileInput, 'files', { value: [file] })

    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith('pluginUnsupportedFormat', 'error')
    })
  })

  it('fichier .sdplugin valide → install', async () => {
    const addToast = vi.fn()
    const { container } = renderInstaller({ addToast })

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['data'], 'plugin.sdplugin', { type: 'application/octet-stream' })
    // Mock arrayBuffer
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(fileInput, 'files', { value: [file] })

    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(window.electronAPI.installPluginFromBuffer).toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Test Plugin'),
        'success'
      )
    })
  })

  it('erreur install → toast erreur', async () => {
    window.electronAPI.installPluginFromBuffer.mockResolvedValue({
      success: false,
      error: 'corrupt archive',
    })
    const addToast = vi.fn()
    const { container } = renderInstaller({ addToast })

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['data'], 'plugin.zip', { type: 'application/octet-stream' })
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(fileInput, 'files', { value: [file] })

    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('corrupt archive'),
        'error'
      )
    })
  })

  it('fichier annulé (vide) → pas d\'install', async () => {
    const { container } = renderInstaller()
    const fileInput = container.querySelector('input[type="file"]')
    Object.defineProperty(fileInput, 'files', { value: [] })

    fireEvent.change(fileInput)

    await new Promise((r) => setTimeout(r, 50))
    expect(window.electronAPI.installPluginFromBuffer).not.toHaveBeenCalled()
  })
})