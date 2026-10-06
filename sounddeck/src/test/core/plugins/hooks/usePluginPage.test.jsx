// src/test/core/plugins/hooks/usePluginPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getPluginComponent: vi.fn(),
  isPluginPage: vi.fn(() => true),
  getPage: vi.fn((id) => ({ id, label: `Page ${id}` })),
}))

vi.mock('@core/plugins/PluginContext', () => ({
  usePlugins: () => ({
    getPluginComponent: mocks.getPluginComponent,
    isPluginPage: mocks.isPluginPage,
    getPage: mocks.getPage,
    pluginManager: {},
  }),
}))

import { usePluginPage } from '@core/plugins/hooks/usePluginPage'

const DummyComponent = () => <div>Dummy</div>

beforeEach(() => {
  mocks.getPluginComponent.mockReset().mockResolvedValue(DummyComponent)
  mocks.isPluginPage.mockReset().mockReturnValue(true)
  mocks.getPage.mockReset().mockImplementation((id) => ({ id, label: `Page ${id}` }))
})

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe('usePluginPage', () => {
  it('retourne loading=true au mount', () => {
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    expect(result.current.loading).toBe(true)
  })

  it('charge le composant si c\'est une page plugin', async () => {
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.Component).toBe(DummyComponent)
    })
  })

  it('appelle getPluginComponent avec pageId', async () => {
    renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(mocks.getPluginComponent).toHaveBeenCalledWith('emoji-discover')
    })
  })

  it('retourne loading=false si pageId est null', async () => {
    const { result } = renderHook(() => usePluginPage(null))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.Component).toBeNull()
    })
  })

  it('retourne loading=false si pas une page plugin', async () => {
    mocks.isPluginPage.mockReturnValue(false)
    const { result } = renderHook(() => usePluginPage('home'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(mocks.getPluginComponent).not.toHaveBeenCalled()
    })
  })

  it('set error si composant non trouvé', async () => {
    mocks.getPluginComponent.mockResolvedValue(null)
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(result.current.error).toBe('Composant non trouvé')
    })
  })

  it('set error si getPluginComponent throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getPluginComponent.mockRejectedValue(new Error('load failed'))

    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(result.current.error).toBe('load failed')
    })

    errorSpy.mockRestore()
  })

  it('expose isPlugin=true pour une page plugin', async () => {
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(result.current.isPlugin).toBe(true)
    })
  })

  it('expose page (via getPage)', async () => {
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    await waitFor(() => {
      expect(result.current.page).toEqual({
        id: 'emoji-discover',
        label: 'Page emoji-discover',
      })
    })
  })

  it('expose une fonction reload', () => {
    const { result } = renderHook(() => usePluginPage('emoji-discover'))
    expect(typeof result.current.reload).toBe('function')
  })
})