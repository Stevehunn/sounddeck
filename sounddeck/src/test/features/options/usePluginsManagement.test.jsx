import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePluginsManagement } from '@features/options/hooks/usePluginsManagement'

// ─── Mocks ──────────────────────────────────────────────────────────────
const { mockPluginManager, mockRefresh } = vi.hoisted(() => ({
  mockPluginManager: {
    getLoadedPlugins: vi.fn(),
    getDisabledPlugins: vi.fn(),
    unloadPlugin: vi.fn(),
    enablePlugin: vi.fn(),
  },
  mockRefresh: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const map = {
        pluginsUninstallSuccess: 'Plugin "{name}" désinstallé',
        pluginsUninstallError: 'Erreur désinstallation',
        pluginsEnableSuccess: 'Plugin "{name}" réactivé',
        pluginsEnableError: 'Erreur réactivation',
      }
      return map[key] || key
    },
    currentLang: 'fr',
  })),
}))

vi.mock('@core/plugins/PluginContext', () => ({
  usePlugins: () => ({
    pluginManager: mockPluginManager,
    refresh: mockRefresh,
  }),
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('usePluginsManagement', () => {
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    addToast = vi.fn()

    mockPluginManager.getLoadedPlugins.mockReturnValue([
      { id: 'youtube', name: 'YouTube', version: '1.0.0' },
    ])
    mockPluginManager.getDisabledPlugins.mockReturnValue([])
    mockPluginManager.unloadPlugin.mockResolvedValue(true)
    mockPluginManager.enablePlugin.mockResolvedValue(true)

    window.electronAPI = {
      uninstallPlugin: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  const render = () => renderHook(() => usePluginsManagement({ addToast }))

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  it('devrait charger les plugins au mount', async () => {
    const { result } = render()

    await waitFor(() => {
      expect(result.current.plugins.length).toBe(1)
    })
  })

  it('devrait charger les disabledPlugins au mount', async () => {
    mockPluginManager.getDisabledPlugins.mockReturnValue([
      { id: 'emoji', name: 'Emoji' },
    ])
    const { result } = render()

    await waitFor(() => {
      expect(result.current.disabledPlugins.length).toBe(1)
    })
  })

  it('devrait exposer loadPlugins', () => {
    const { result } = render()
    expect(typeof result.current.loadPlugins).toBe('function')
  })

  it('devrait exposer handlePluginUninstall et handlePluginEnable', () => {
    const { result } = render()
    expect(typeof result.current.handlePluginUninstall).toBe('function')
    expect(typeof result.current.handlePluginEnable).toBe('function')
  })

  // ─── loadPlugins ─────────────────────────────────────────────────────

  it('loadPlugins devrait recharger la liste', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.plugins.length).toBe(1))
    vi.clearAllMocks()

    mockPluginManager.getLoadedPlugins.mockReturnValue([
      { id: 'a' },
      { id: 'b' },
    ])

    await act(async () => {
      await result.current.loadPlugins()
    })

    expect(result.current.plugins.length).toBe(2)
  })

  it('loadPlugins devrait gérer une erreur sans planter', async () => {
    mockPluginManager.getLoadedPlugins.mockImplementation(() => {
      throw new Error('boom')
    })
    const { result } = render()

    // Ne doit pas planter
    expect(result.current.plugins).toEqual([])
  })

  // ─── handlePluginUninstall ──────────────────────────────────────────

  it('handlePluginUninstall devrait appeler unloadPlugin', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'youtube',
        name: 'YouTube',
      })
    })

    expect(mockPluginManager.unloadPlugin).toHaveBeenCalledWith('youtube', {
      permanent: true,
    })
  })

  it('handlePluginUninstall devrait appeler uninstallPlugin IPC si non intégré', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'custom-plugin',
        name: 'Custom',
        isIntegrated: false,
      })
    })

    expect(window.electronAPI.uninstallPlugin).toHaveBeenCalledWith('custom-plugin')
  })

  it('handlePluginUninstall ne devrait PAS appeler uninstallPlugin si intégré', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'youtube',
        name: 'YouTube',
        isIntegrated: true,
      })
    })

    expect(window.electronAPI.uninstallPlugin).not.toHaveBeenCalled()
  })

  it('handlePluginUninstall devrait appeler refresh', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'x',
        name: 'X',
        isIntegrated: false,
      })
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('handlePluginUninstall devrait toast succès', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'x',
        name: 'Test Plugin',
        isIntegrated: false,
      })
    })

    const successCalls = addToast.mock.calls.filter(([, type]) => type === 'info')
    expect(successCalls.length).toBeGreaterThan(0)
  })

  it('handlePluginUninstall devrait toast erreur si échec', async () => {
    mockPluginManager.unloadPlugin.mockRejectedValue(new Error('boom'))
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: 'x',
        name: 'X',
      })
    })

    const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
    expect(errorCalls.length).toBeGreaterThan(0)
  })

  // ─── handlePluginEnable ─────────────────────────────────────────────

  it('handlePluginEnable devrait appeler enablePlugin', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginEnable({ id: 'youtube', name: 'YouTube' })
    })

    expect(mockPluginManager.enablePlugin).toHaveBeenCalledWith('youtube')
  })

  it('handlePluginEnable devrait toast succès', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginEnable({ id: 'youtube', name: 'YouTube' })
    })

    const successCalls = addToast.mock.calls.filter(([, type]) => type === 'success')
    expect(successCalls.length).toBeGreaterThan(0)
  })

  it('handlePluginEnable devrait toast erreur si enable retourne false', async () => {
    mockPluginManager.enablePlugin.mockResolvedValue(false)
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginEnable({ id: 'x', name: 'X' })
    })

    const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
    expect(errorCalls.length).toBeGreaterThan(0)
  })

  it('handlePluginEnable devrait appeler refresh si succès', async () => {
    const { result } = render()

    await act(async () => {
      await result.current.handlePluginEnable({ id: 'x', name: 'X' })
    })

    expect(mockRefresh).toHaveBeenCalled()
  })
})