import { describe, it, expect, vi, beforeEach } from 'vitest'

// ✅ Mock constants.js (contient import.meta.glob → casse en test)
vi.mock('@core/plugins/PluginManager/constants', () => ({
  INTEGRATED_PLUGIN_IDS: new Set(['youtube', 'myinstants', 'emoji']),
  INTEGRATED_PLUGINS: new Map(),
  STORE_KEY_DISABLED: 'disabledPlugins',
  STORE_KEY_DISABLED_META: 'disabledPluginsMeta',
  CORE_PAGES: [],
}))

// ✅ Mock logger pour éviter le bruit console
vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

// ✅ Mock semver (on teste checkCompatibility dans son propre fichier)
vi.mock('@core/plugins/PluginManager/semver', () => ({
  checkCompatibility: vi.fn(() => true),
  semverSatisfies: vi.fn(() => true),
}))

import {
  importPluginModule,
  validatePluginModule,
  registerPluginPages,
  isIntegrated,
} from '@core/plugins/PluginManager/pluginLoader'

import { logError } from '@shared/utils/logger'
import { checkCompatibility } from '@core/plugins/PluginManager/semver'

// ─── HELPERS ────────────────────────────────────────────────────────────

// Crée un plugin valide minimal
const createValidPlugin = (overrides = {}) => ({
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  pages: [],
  ...overrides,
})

describe('pluginLoader - importPluginModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.electronAPI
  })

  // ─── CAS 1 : AVEC _loader ────────────────────────────────────────────

  it('devrait utiliser _loader si fourni', async () => {
    const module = { default: createValidPlugin() }
    const loader = vi.fn().mockResolvedValue(module)

    const result = await importPluginModule({
      id: 'test',
      _loader: loader,
    })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(result).toBe(module)
  })

  it('devrait retourner null si _loader throw', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('loader error'))

    const result = await importPluginModule({
      id: 'test',
      _loader: loader,
    })

    expect(result).toBeNull()
    expect(logError).toHaveBeenCalled()
  })

  // ─── CAS 2 : SANS _loader ET SANS API ────────────────────────────────

  it('devrait retourner null si aucun loader + pas d\'electronAPI', async () => {
    const result = await importPluginModule({ id: 'unknown-plugin' })

    expect(result).toBeNull()
    expect(logError).toHaveBeenCalled()
  })

  it('devrait logError avec l\'id du plugin en échec', async () => {
    await importPluginModule({ id: 'my-failing-plugin' })

    const errorMsg = logError.mock.calls[0][1]
    expect(errorMsg).toContain('my-failing-plugin')
  })

  // ─── CAS 3 : SANS _loader AVEC electronAPI ──────────────────────────

  it('devrait essayer electronAPI.getPluginPath si import statique échoue', async () => {
    const getPluginPath = vi.fn().mockResolvedValue(null)
    window.electronAPI = { getPluginPath }

    const result = await importPluginModule({ id: 'test-plugin' })

    expect(getPluginPath).toHaveBeenCalledWith('test-plugin')
    expect(result).toBeNull()
  })

  it('devrait gérer une erreur de getPluginPath sans planter', async () => {
    const getPluginPath = vi.fn().mockRejectedValue(new Error('api error'))
    window.electronAPI = { getPluginPath }

    await expect(
      importPluginModule({ id: 'test-plugin' })
    ).resolves.toBeNull()
  })

  it('devrait gérer window.electronAPI.getPluginPath absent', async () => {
    window.electronAPI = {} // pas de getPluginPath

    await expect(
      importPluginModule({ id: 'test-plugin' })
    ).resolves.toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────────────

describe('pluginLoader - validatePluginModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkCompatibility.mockReturnValue(true)
  })

  it('devrait retourner null si checkCompatibility échoue', () => {
    checkCompatibility.mockReturnValue(false)
    const result = validatePluginModule(
      { id: 'p1' },
      { default: createValidPlugin() }
    )

    expect(result).toBeNull()
    expect(checkCompatibility).toHaveBeenCalledWith({ id: 'p1' })
  })

  it('devrait utiliser pluginModule.default si présent', () => {
    const plugin = createValidPlugin()
    const result = validatePluginModule({ id: 'p1' }, { default: plugin })

    expect(result).toBe(plugin)
  })

  it('devrait utiliser pluginModule directement si pas de .default', () => {
    const plugin = createValidPlugin()
    const result = validatePluginModule({ id: 'p1' }, plugin)

    expect(result).toBe(plugin)
  })

  it('devrait retourner null si plugin.id manquant', () => {
    const result = validatePluginModule(
      { id: 'p1' },
      { default: { name: 'No ID' } }
    )

    expect(result).toBeNull()
    expect(logError).toHaveBeenCalled()
  })

  it('devrait retourner null si pluginModule est null/undefined', () => {
    const result1 = validatePluginModule({ id: 'p1' }, null)
    const result2 = validatePluginModule({ id: 'p1' }, undefined)

    expect(result1).toBeNull()
    expect(result2).toBeNull()
  })

  it('devrait retourner le plugin si tout est valide', () => {
    const plugin = createValidPlugin({ id: 'valid' })
    const result = validatePluginModule({ id: 'p1' }, { default: plugin })

    expect(result.id).toBe('valid')
  })
})

// ────────────────────────────────────────────────────────────────────────

describe('pluginLoader - registerPluginPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createManager = () => ({
    pages: new Map(),
    components: new Map(),
  })

  it('ne devrait rien faire si plugin.pages absent', () => {
    const manager = createManager()
    registerPluginPages(manager, { id: 'p1' })

    expect(manager.pages.size).toBe(0)
    expect(manager.components.size).toBe(0)
  })

  it('devrait enregistrer chaque page dans manager.pages', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [
        { id: 'home', label: 'Home' },
        { id: 'settings', label: 'Settings' },
      ],
    }

    registerPluginPages(manager, plugin)

    expect(manager.pages.size).toBe(2)
    expect(manager.pages.has('home')).toBe(true)
    expect(manager.pages.has('settings')).toBe(true)
  })

  it('devrait ajouter pluginId à chaque page', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', label: 'Home' }],
    }

    registerPluginPages(manager, plugin)

    const home = manager.pages.get('home')
    expect(home.pluginId).toBe('my-plugin')
  })

  it('devrait générer componentPath par défaut (plugin.id/page.id)', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', label: 'Home' }],
    }

    registerPluginPages(manager, plugin)

    const home = manager.pages.get('home')
    expect(home.componentPath).toBe('my-plugin/home')
  })

  it('devrait utiliser componentPath explicite si fourni', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', componentPath: 'custom/path.jsx' }],
    }

    registerPluginPages(manager, plugin)

    const home = manager.pages.get('home')
    expect(home.componentPath).toBe('custom/path.jsx')
  })

  it('devrait utiliser page.component comme componentPath si c\'est une string', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', component: './Home.jsx' }],
    }

    registerPluginPages(manager, plugin)

    expect(manager.pages.get('home').componentPath).toBe('./Home.jsx')
  })

  it('devrait stocker le composant React dans manager.components', () => {
    const MockComponent = () => null
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', component: MockComponent }],
    }

    registerPluginPages(manager, plugin)

    expect(manager.components.has('home')).toBe(true)
    expect(manager.components.get('home')).toBe(MockComponent)
  })

  it('ne devrait PAS stocker de composant si page.component est une string', () => {
    const manager = createManager()
    const plugin = {
      id: 'my-plugin',
      pages: [{ id: 'home', component: './Home.jsx' }],
    }

    registerPluginPages(manager, plugin)

    expect(manager.components.has('home')).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────────────

describe('pluginLoader - isIntegrated', () => {
  it('devrait retourner true pour un plugin intégré', () => {
    expect(isIntegrated('youtube')).toBe(true)
    expect(isIntegrated('myinstants')).toBe(true)
    expect(isIntegrated('emoji')).toBe(true)
  })

  it('devrait retourner false pour un plugin non intégré', () => {
    expect(isIntegrated('custom-plugin')).toBe(false)
    expect(isIntegrated('unknown')).toBe(false)
  })

  it('devrait retourner false pour une chaîne vide', () => {
    expect(isIntegrated('')).toBe(false)
  })
})