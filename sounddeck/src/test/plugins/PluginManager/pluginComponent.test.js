// src/test/plugins/PluginManager/pluginComponent.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { loadPluginComponent } from '@core/plugins/PluginManager/pluginComponent'
import { logWarn, logError } from '@shared/utils/logger'

describe('loadPluginComponent', () => {
  let pluginManager

  beforeEach(() => {
    vi.clearAllMocks()
    pluginManager = {
      components: new Map(),
      pages: new Map(),
      plugins: new Map(),
    }
  })

  // ─── CACHE ────────────────────────────────────────────────────────────

  it('devrait retourner le composant déjà en cache', async () => {
    const CachedComp = () => null
    pluginManager.components.set('page-1', CachedComp)

    const result = await loadPluginComponent(pluginManager, 'page-1')
    expect(result).toBe(CachedComp)
  })

  it('ne devrait PAS appeler logWarn si le cache hit', async () => {
    pluginManager.components.set('page-1', () => null)
    await loadPluginComponent(pluginManager, 'page-1')
    expect(logWarn).not.toHaveBeenCalled()
  })

  // ─── PAGE INTROUVABLE ─────────────────────────────────────────────────

  it('devrait retourner null si la page est introuvable', async () => {
    const result = await loadPluginComponent(pluginManager, 'unknown')
    expect(result).toBeNull()
  })

  it('ne devrait PAS logger si la page est introuvable (pas d\'erreur)', async () => {
    await loadPluginComponent(pluginManager, 'unknown')
    expect(logWarn).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
  })

  // ─── MODE DEV (par défaut dans Vitest) ────────────────────────────────

  describe('mode DEV', () => {
    it('devrait retourner null si le plugin parent est introuvable', async () => {
      pluginManager.pages.set('page-1', {
        id: 'page-1',
        pluginId: 'missing-plugin',
      })

      const result = await loadPluginComponent(pluginManager, 'page-1')
      expect(result).toBeNull()
    })

    it('devrait logger un warn si aucun chemin ne fonctionne', async () => {
      pluginManager.pages.set('page-1', {
        id: 'page-1',
        pluginId: 'my-plugin',
        componentPath: 'Component.jsx',
      })
      pluginManager.plugins.set('my-plugin', { id: 'my-plugin' })

      const result = await loadPluginComponent(pluginManager, 'page-1')

      expect(result).toBeNull()
      // Le warn est loggé une fois après avoir essayé tous les chemins
      expect(logWarn).toHaveBeenCalledWith(
        'PluginManager',
        expect.stringContaining('page-1'),
        expect.objectContaining({ paths: expect.any(Array) })
      )
    })

    it('devrait essayer plusieurs chemins d\'import', async () => {
      pluginManager.pages.set('page-1', {
        id: 'page-1',
        pluginId: 'my-plugin',
        componentPath: 'Component.jsx',
      })
      pluginManager.plugins.set('my-plugin', { id: 'my-plugin' })

      await loadPluginComponent(pluginManager, 'page-1')

      const warnCall = logWarn.mock.calls[0]
      const paths = warnCall[2].paths
      // 4 chemins essayés
      expect(paths).toHaveLength(4)
      expect(paths[0]).toContain('my-plugin')
      expect(paths[0]).toContain('Component.jsx')
      expect(paths[1]).toContain('pages/page-1')
      expect(paths[2]).toContain('my-plugin/page-1')
      expect(paths[3]).toContain('components/page-1')
    })

    it('devrait retourner null si aucun chemin n\'aboutit', async () => {
      pluginManager.pages.set('p', {
        id: 'p',
        pluginId: 'nonexistent',
      })
      pluginManager.plugins.set('nonexistent', {})

      const result = await loadPluginComponent(pluginManager, 'p')
      expect(result).toBeNull()
    })

    it('ne devrait PAS mettre en cache si le composant est introuvable', async () => {
      pluginManager.pages.set('p', {
        id: 'p',
        pluginId: 'nonexistent',
      })
      pluginManager.plugins.set('nonexistent', {})

      await loadPluginComponent(pluginManager, 'p')
      expect(pluginManager.components.size).toBe(0)
    })
  })

  // ─── CACHE HIT NE RELANCE PAS LE CHARGEMENT ──────────────────────────

  it('devrait éviter tout log si le composant est en cache', async () => {
    const Comp = () => null
    pluginManager.components.set('page-1', Comp)

    await loadPluginComponent(pluginManager, 'page-1')

    expect(logWarn).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
  })
})