import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DisabledPluginsManager } from '@core/plugins/PluginManager/disabledPlugins'

// ─── Mock logger ────────────────────────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('DisabledPluginsManager', () => {
  let storeMock

  beforeEach(() => {
    vi.clearAllMocks()
    storeMock = {
      storeGet: vi.fn().mockResolvedValue(undefined),
      storeSet: vi.fn().mockResolvedValue(),
    }
    window.electronAPI = storeMock
  })

  // ─── CONSTRUCTEUR ────────────────────────────────────────────────────

  it('devrait démarrer vide et non chargé', () => {
    const m = new DisabledPluginsManager()
    expect(m.set.size).toBe(0)
    expect(m.meta).toEqual({})
    expect(m.loaded).toBe(false)
  })

  // ─── ensureLoaded ────────────────────────────────────────────────────

  it('ensureLoaded devrait charger la liste depuis le store', async () => {
    storeMock.storeGet.mockImplementation((key) => {
      if (key === 'disabledPlugins') return Promise.resolve(['p1', 'p2'])
      if (key === 'disabledPluginsMeta') {
        return Promise.resolve({
          p1: { id: 'p1', name: 'Plugin 1' },
          p2: { id: 'p2', name: 'Plugin 2' },
        })
      }
      return Promise.resolve(undefined)
    })

    const m = new DisabledPluginsManager()
    await m.ensureLoaded()

    expect(m.set.has('p1')).toBe(true)
    expect(m.set.has('p2')).toBe(true)
    expect(m.meta.p1.name).toBe('Plugin 1')
    expect(m.loaded).toBe(true)
  })

  it('ensureLoaded ne devrait charger qu\'une seule fois', async () => {
    const m = new DisabledPluginsManager()
    await m.ensureLoaded()
    await m.ensureLoaded()

    expect(storeMock.storeGet).toHaveBeenCalledTimes(2) // 1 fois par clé
  })

  it('ensureLoaded devrait gérer les valeurs non-tableau', async () => {
    storeMock.storeGet.mockResolvedValue('pas-un-tableau')

    const m = new DisabledPluginsManager()
    await m.ensureLoaded()

    expect(m.set.size).toBe(0)
  })

  it('ensureLoaded devrait gérer les erreurs de store', async () => {
    storeMock.storeGet.mockRejectedValue(new Error('boom'))

    const m = new DisabledPluginsManager()
    await expect(m.ensureLoaded()).resolves.not.toThrow()
    expect(m.set.size).toBe(0)
  })

  // ─── has ─────────────────────────────────────────────────────────────

  it('has devrait retourner false pour un plugin inconnu', () => {
    const m = new DisabledPluginsManager()
    expect(m.has('unknown')).toBe(false)
  })

  // ─── add ─────────────────────────────────────────────────────────────

  it('add devrait ajouter un plugin et persister', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'Plugin 1', version: '1.0.0', author: 'Toto' })

    expect(m.set.has('p1')).toBe(true)
    expect(m.meta.p1).toMatchObject({
      id: 'p1',
      name: 'Plugin 1',
      version: '1.0.0',
      author: 'Toto',
    })
    expect(m.meta.p1.disabledAt).toBeGreaterThan(0)
  })

  it('add devrait appeler storeSet 2x (liste + meta)', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'Plugin 1' })

    expect(storeMock.storeSet).toHaveBeenCalledWith(
      'disabledPlugins',
      ['p1']
    )
    expect(storeMock.storeSet).toHaveBeenCalledWith(
      'disabledPluginsMeta',
      expect.objectContaining({ p1: expect.any(Object) })
    )
  })

  it('add devrait utiliser des valeurs par défaut si le plugin est minimal', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', {})

    expect(m.meta.p1.name).toBe('p1')
    expect(m.meta.p1.version).toBe('1.0.0')
    expect(m.meta.p1.author).toBe('Inconnu')
    expect(m.meta.p1.isIntegrated).toBe(false)
  })

  it('add devrait marquer isIntegrated=true si fourni', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'P1', isIntegrated: true })
    expect(m.meta.p1.isIntegrated).toBe(true)
  })

  // ─── remove ──────────────────────────────────────────────────────────

  it('remove devrait retirer un plugin du set et du meta', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'P1' })
    await m.remove('p1')

    expect(m.set.has('p1')).toBe(false)
    expect(m.meta.p1).toBeUndefined()
  })

  it('remove devrait persister après suppression', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'P1' })
    vi.clearAllMocks()

    await m.remove('p1')
    expect(storeMock.storeSet).toHaveBeenCalledWith('disabledPlugins', [])
  })

  // ─── list ────────────────────────────────────────────────────────────

  it('list devrait retourner les valeurs du meta', async () => {
    const m = new DisabledPluginsManager()
    await m.add('p1', { name: 'P1' })
    await m.add('p2', { name: 'P2' })

    const list = m.list()
    expect(list.length).toBe(2)
    expect(list.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
  })

  it('list devrait retourner un tableau vide par défaut', () => {
    const m = new DisabledPluginsManager()
    expect(m.list()).toEqual([])
  })

  // ─── ROBUSTESSE ──────────────────────────────────────────────────────

  it('ne devrait pas planter si electronAPI absent', async () => {
    delete window.electronAPI
    const m = new DisabledPluginsManager()

    await expect(m.ensureLoaded()).resolves.not.toThrow()
    await expect(m.add('p1', { name: 'P1' })).resolves.not.toThrow()
    await expect(m.remove('p1')).resolves.not.toThrow()
  })
})