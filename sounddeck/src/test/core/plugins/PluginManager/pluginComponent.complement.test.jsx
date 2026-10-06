// src/test/core/plugins/PluginManager/pluginComponent.complement.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import { loadPluginComponent } from '@core/plugins/PluginManager/pluginComponent'

const DummyComponent = () => null

const makePluginManager = (overrides = {}) => ({
  components: new Map(),
  pages: new Map([
    ['page-1', { id: 'page-1', pluginId: 'myplugin', componentPath: 'Component.jsx' }],
  ]),
  plugins: new Map([['myplugin', { id: 'myplugin' }]]),
  ...overrides,
})

beforeEach(() => {
  vi.resetModules()
  // Mock import.meta.env.DEV via global
  vi.stubGlobal('import', {
    meta: { env: { DEV: true } },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pluginComponent', () => {
  it('retourne le composant en cache si présent', async () => {
    const pm = makePluginManager()
    pm.components.set('page-1', DummyComponent)

    const result = await loadPluginComponent(pm, 'page-1')
    expect(result).toBe(DummyComponent)
  })

  it('retourne null si page inconnue', async () => {
    const pm = makePluginManager()
    const result = await loadPluginComponent(pm, 'unknown-page')
    expect(result).toBeNull()
  })

  it('retourne null si plugin introuvable (DEV)', async () => {
    const pm = makePluginManager()
    pm.plugins.delete('myplugin')

    const result = await loadPluginComponent(pm, 'page-1')
    expect(result).toBeNull()
  })

  it('ne crash pas si import échoue (DEV)', async () => {
    const pm = makePluginManager()
    // En DEV, les paths Vite seront essayés — ils vont tous échouer
    // → doit retourner null sans crash
    const result = await loadPluginComponent(pm, 'page-1')
    expect(result).toBeNull()
  })
})