// src/test/core/plugins/PluginContext.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

const pluginManagerMock = vi.hoisted(() => ({
  _initialized: false,
  initialize: vi.fn().mockImplementation(async () => {
    pluginManagerMock._initialized = true
  }),
  getLoadedPlugins: vi.fn(() => [
    { id: 'emoji', name: 'Emoji', version: '1.0.0' },
  ]),
  invalidatePagesCache: vi.fn(),
  getAllPages: vi.fn(() => [
    { id: 'home', label: 'Accueil', isCore: true },
    { id: 'emoji-discover', label: 'Découvrir Emoji', isPlugin: true },
  ]),
  getPage: vi.fn((id) => ({ id, label: `Page ${id}` })),
  isPluginPage: vi.fn((id) => id === 'emoji-discover'),
  getPluginComponent: vi.fn().mockResolvedValue(null),
  getPlugin: vi.fn(),
  loadPlugin: vi.fn().mockResolvedValue(true),
  unloadPlugin: vi.fn().mockResolvedValue(true),
  isPluginLoaded: vi.fn(() => true),
}))

vi.mock('@core/plugins/PluginManager/index.js', () => ({
  pluginManager: pluginManagerMock,
}))

import { PluginProvider, usePlugins } from '@core/plugins/PluginContext'

// ─── HELPERS ───────────────────────────────────────────────────────────
const TestConsumer = () => {
  const ctx = usePlugins()
  return (
    <div data-testid="consumer">
      <div data-testid="loaded">{String(ctx.loaded)}</div>
      <div data-testid="plugins-count">{ctx.plugins.length}</div>
      <div data-testid="pages-count">{ctx.pages.length}</div>
      <div data-testid="error">{ctx.error || 'none'}</div>
      <div data-testid="is-plugin">{String(ctx.isPluginPage('emoji-discover'))}</div>
    </div>
  )
}

const store = {
  sounds: [],
  profiles: [{ id: 'all', name: 'All' }],
  currentProfileId: 'all',
}

beforeEach(() => {
  pluginManagerMock._initialized = false
  pluginManagerMock.initialize.mockClear().mockImplementation(async () => {
    pluginManagerMock._initialized = true
  })
  pluginManagerMock.getLoadedPlugins.mockClear().mockReturnValue([
    { id: 'emoji', name: 'Emoji', version: '1.0.0' },
  ])
  pluginManagerMock.invalidatePagesCache.mockClear()
  pluginManagerMock.getAllPages.mockClear().mockReturnValue([
    { id: 'home', label: 'Accueil', isCore: true },
    { id: 'emoji-discover', label: 'Découvrir Emoji', isPlugin: true },
  ])
  pluginManagerMock.getPage.mockClear().mockImplementation((id) => ({ id, label: `Page ${id}` }))
  pluginManagerMock.isPluginPage.mockClear().mockImplementation((id) => id === 'emoji-discover')
  pluginManagerMock.getPluginComponent.mockClear()
  pluginManagerMock.loadPlugin.mockClear().mockResolvedValue(true)
  pluginManagerMock.unloadPlugin.mockClear().mockResolvedValue(true)
})

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('PluginProvider', () => {
  it('initialise pluginManager au mount', async () => {
    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(pluginManagerMock.initialize).toHaveBeenCalledWith(store)
    })
  })

  it('marque loaded=true après init', async () => {
    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loaded').textContent).toBe('true')
    })
  })

  it('expose les plugins chargés', async () => {
    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('plugins-count').textContent).toBe('1')
    })
  })

  it('expose les pages', async () => {
    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('pages-count').textContent).toBe('2')
    })
  })

  it('isPluginPage("emoji-discover") → true', async () => {
    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-plugin').textContent).toBe('true')
    })
  })

  it('gère une erreur d\'init sans crash', async () => {
    pluginManagerMock.initialize.mockRejectedValueOnce(new Error('boom'))
    // Reset le mock pour forcer un throw
    pluginManagerMock._initialized = false

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PluginProvider store={store}>
        <TestConsumer />
      </PluginProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loaded').textContent).toBe('true')
    })
    expect(screen.getByTestId('error').textContent).toBe('boom')

    errorSpy.mockRestore()
  })

  it('usePlugins hors Provider → throw', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(/usePlugins must be used within/)
    errorSpy.mockRestore()
  })
})