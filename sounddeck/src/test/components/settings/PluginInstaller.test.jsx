// src/test/components/settings/PluginInstaller.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const { mockUseLicense, mockInstallPlugin } = vi.hoisted(() => ({
  mockUseLicense: vi.fn(),
  mockInstallPlugin: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@core/store/hooks/useLicense', () => ({
  useLicense: mockUseLicense,
}))

// ═══════════════════════════════════════════════════════════════════════
// IMPORT APRÈS LES MOCKS
// ═══════════════════════════════════════════════════════════════════════
import PluginInstaller from '@shared/components/settings/PluginInstaller'

// ═══════════════════════════════════════════════════════════════════════
// SETUP / TEARDOWN
// ═══════════════════════════════════════════════════════════════════════
let onClose
let addToast
let onInstall

beforeEach(() => {
  vi.clearAllMocks()

  // Par défaut : utilisateur Pro (comportement identique à avant)
  mockUseLicense.mockReturnValue({
    isPro: true,
    loading: false,
    tier: 'pro',
  })

  mockInstallPlugin.mockReset().mockResolvedValue({
    success: true,
    name: 'My Plugin',
  })

  onClose = vi.fn()
  addToast = vi.fn()
  onInstall = vi.fn()

  window.electronAPI = {
    ...window.electronAPI,
    installPluginFromBuffer: mockInstallPlugin,
  }

  global.fetch = vi.fn()
})

const renderInstaller = (props = {}) =>
  render(
    <PluginInstaller
      onClose={onClose}
      addToast={addToast}
      onInstall={onInstall}
      {...props}
    />
  )

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Rendu', () => {
  it('affiche le titre', () => {
    renderInstaller()
    expect(screen.getByText('pluginsInstall')).toBeInTheDocument()
  })

  it('affiche la section URL', () => {
    renderInstaller()
    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
  })

  it('affiche la section fichier', () => {
    renderInstaller()
    expect(screen.getByText('pluginFromFile')).toBeInTheDocument()
  })

  // ✅ FIX : le texte est "pluginFormatInfo :" → on utilise un regex
  it('affiche l\'info format', () => {
    renderInstaller()
    expect(screen.getByText(/pluginFormatInfo/)).toBeInTheDocument()
    expect(screen.getByText(/pluginFormatDesc/)).toBeInTheDocument()
  })

  it('affiche le bouton "Choisir un fichier"', () => {
    renderInstaller()
    expect(screen.getByText('pluginChooseFile')).toBeInTheDocument()
  })

  it('affiche le séparateur "OU"', () => {
    renderInstaller()
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('affiche le placeholder URL', () => {
    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    expect(input).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// FERMETURE
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Fermeture', () => {
  it('appelle onClose au clic sur le bouton Fermer', () => {
    renderInstaller()
    fireEvent.click(screen.getByText('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('appelle onClose au clic sur l\'overlay', () => {
    const { container } = renderInstaller()
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ne ferme PAS au clic dans la modale', () => {
    const { container } = renderInstaller()
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// INSTALLATION DEPUIS URL
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Install depuis URL', () => {
  // ✅ FIX : le bouton est disabled si URL vide → le click n'atteint jamais
  // le handler. On teste donc que le bouton est disabled ET que fetch
  // n'est jamais appelé (le comportement fonctionnel attendu).
  it('bouton désactivé si URL vide → fetch jamais appelé', () => {
    renderInstaller()
    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    expect(btn).toBeDisabled()

    fireEvent.click(btn)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(addToast).not.toHaveBeenCalled()
  })

  it('active le bouton dès qu\'on tape une URL', () => {
    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/p.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    expect(btn).not.toBeDisabled()
  })

  it('install complet via URL avec succès', async () => {
    const fakeBuffer = new ArrayBuffer(8)
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBuffer),
    })

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/plugin.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://x.com/plugin.sdplugin')
      expect(mockInstallPlugin).toHaveBeenCalledWith(fakeBuffer, 'plugin.sdplugin')
      expect(addToast).toHaveBeenCalledWith('✅ My Plugin', 'success')
      expect(onInstall).toHaveBeenCalledWith({
        success: true,
        name: 'My Plugin',
      })
    })
  })

  it('affiche une erreur si HTTP non-ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/missing.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('HTTP 404'),
        'error'
      )
    })
  })

  it('affiche une erreur si fetch throw (réseau)', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/p.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error'
      )
    })
  })

  it('affiche une erreur si installPluginFromBuffer retourne success: false', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })
    mockInstallPlugin.mockResolvedValue({
      success: false,
      error: 'Invalid manifest',
    })

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/p.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Invalid manifest'),
        'error'
      )
    })
  })

  it('fallback "plugin.sdplugin" si le nom de fichier ne peut pas être extrait', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')
    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        'plugin.sdplugin'
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// INSTALLATION DEPUIS FICHIER
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Install depuis fichier', () => {
  const createFile = (name, content = 'fake-zip-content') => {
    const blob = new Blob([content])
    blob.name = name
    blob.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))
    return blob
  }

  // ✅ FIX : renderInstaller() était manquant
  it('affiche une erreur pour un format non supporté', async () => {
    renderInstaller()
    const file = createFile('plugin.txt')
    const fileInput = document.querySelector('input[type="file"]')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    expect(addToast).toHaveBeenCalledWith('pluginUnsupportedFormat', 'error')
  })

  it('accepte un fichier .sdplugin', async () => {
    renderInstaller()
    const file = createFile('my-plugin.sdplugin')
    const fileInput = document.querySelector('input[type="file"]')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        'my-plugin.sdplugin'
      )
    })
  })

  it('accepte un fichier .zip', async () => {
    renderInstaller()
    const file = createFile('my-plugin.zip')
    const fileInput = document.querySelector('input[type="file"]')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(mockInstallPlugin).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        'my-plugin.zip'
      )
    })
  })

  it('affiche un toast de succès après install', async () => {
    renderInstaller()
    const file = createFile('my-plugin.sdplugin')
    const fileInput = document.querySelector('input[type="file"]')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith('✅ My Plugin', 'success')
    })
  })

  it('affiche une erreur si l\'install échoue', async () => {
    mockInstallPlugin.mockResolvedValue({
      success: false,
      error: 'Bad manifest',
    })

    renderInstaller()
    const file = createFile('bad.sdplugin')
    const fileInput = document.querySelector('input[type="file"]')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Bad manifest'),
        'error'
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// LICENCE PRO
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Licence Pro', () => {
  it('affiche le formulaire d\'install si isPro=true', () => {
    mockUseLicense.mockReturnValue({ isPro: true, loading: false, tier: 'pro' })
    renderInstaller()
    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
  })

  it('affiche le message "licence requise" si isPro=false', () => {
    mockUseLicense.mockReturnValue({ isPro: false, loading: false, tier: 'free' })
    renderInstaller()

    expect(
      screen.getByText(/Les plugins externes nécessitent une licence Pro/)
    ).toBeInTheDocument()
    expect(screen.queryByText('pluginFromUrl')).not.toBeInTheDocument()
  })

  it('n\'affiche PAS le blocage pendant loading', () => {
    mockUseLicense.mockReturnValue({ isPro: false, loading: true, tier: 'free' })
    renderInstaller()

    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
    expect(
      screen.queryByText(/Les plugins externes nécessitent une licence Pro/)
    ).not.toBeInTheDocument()
  })

  it('le bouton Fermer fonctionne en mode bloqué', () => {
    mockUseLicense.mockReturnValue({ isPro: false, loading: false, tier: 'free' })
    renderInstaller()

    fireEvent.click(screen.getByText('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('le clic sur l\'overlay fonctionne en mode bloqué', () => {
    mockUseLicense.mockReturnValue({ isPro: false, loading: false, tier: 'free' })
    const { container } = renderInstaller()

    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('affiche le formulaire si isPro=true mais tier=dev', () => {
    mockUseLicense.mockReturnValue({ isPro: true, loading: false, tier: 'dev' })
    renderInstaller()
    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
  })

  it('ne bloque PAS un utilisateur Pro après activation', () => {
    mockUseLicense.mockReturnValue({ isPro: false, loading: true, tier: 'free' })
    const { rerender } = renderInstaller()

    mockUseLicense.mockReturnValue({ isPro: true, loading: false, tier: 'pro' })
    rerender(
      <PluginInstaller onClose={onClose} addToast={addToast} onInstall={onInstall} />
    )

    expect(screen.getByText('pluginFromUrl')).toBeInTheDocument()
    expect(
      screen.queryByText(/Les plugins externes nécessitent une licence Pro/)
    ).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// BARRE DE PROGRESSION
// ═══════════════════════════════════════════════════════════════════════
describe('PluginInstaller > Progression', () => {
  it('affiche une barre de progression pendant l\'install', async () => {
    let resolveFetch
    global.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    renderInstaller()
    const input = screen.getByPlaceholderText(/https:\/\/exemple\.com/)
    fireEvent.change(input, { target: { value: 'https://x.com/p.sdplugin' } })

    const btn = screen.getAllByText('pluginsInstallBtn')[0].closest('button')

    act(() => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(screen.getByText('pluginDownloading')).toBeInTheDocument()
    })

    await act(async () => {
      resolveFetch({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      })
    })
  })
})