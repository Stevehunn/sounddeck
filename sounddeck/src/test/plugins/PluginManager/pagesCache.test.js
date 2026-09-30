import { describe, it, expect, vi } from 'vitest'

// ✅ Mock constants.js pour éviter import.meta.glob (Vite-only, casse en test)
vi.mock('@core/plugins/PluginManager/constants', () => ({
  STORE_KEY_DISABLED: 'disabledPlugins',
  STORE_KEY_DISABLED_META: 'disabledPluginsMeta',
  INTEGRATED_PLUGINS: new Map(),
  INTEGRATED_PLUGIN_IDS: new Set(),
  // 3 pages core suffisent pour tester buildAllPages
  CORE_PAGES: [
    { id: 'home',    labelKey: 'mySounds', group: 'navigation' },
    { id: 'editor',  labelKey: 'editor',   group: 'navigation' },
    { id: 'options', labelKey: 'options',  group: 'footer' },
  ],
}))

import { buildAllPages } from '@core/plugins/PluginManager/pagesCache'

describe('buildAllPages', () => {
  // ─── MOCK MANAGER ───────────────────────────────────────────────────

  const createManager = (overrides = {}) => ({
    pages: new Map(),
    store: null,
    ...overrides,
  })

  const t = (key) => `t(${key})`

  // ─── PAGES CORE ──────────────────────────────────────────────────────

  it('devrait retourner au minimum les pages core', () => {
    const pages = buildAllPages(createManager(), t)
    expect(pages.length).toBeGreaterThan(0)
    const home = pages.find((p) => p.id === 'home')
    expect(home).toBeDefined()
    expect(home.isCore).toBe(true)
  })

  it('les pages core devraient avoir label traduit via t()', () => {
    const pages = buildAllPages(createManager(), t)
    const home = pages.find((p) => p.id === 'home')
    // label = t(labelKey) → "t(mySounds)"
    expect(home.label).toBe('t(mySounds)')
  })

  it('les pages core devraient avoir isCore=true et isPlugin=undefined', () => {
    const pages = buildAllPages(createManager(), t)
    const home = pages.find((p) => p.id === 'home')
    expect(home.isCore).toBe(true)
    expect(home.isPlugin).toBeUndefined()
  })

  it('devrait inclure les icônes et groups via DEFAULT_ICONS/DEFAULT_GROUPS', () => {
    const pages = buildAllPages(createManager(), t)
    const home = pages.find((p) => p.id === 'home')
    expect(home.icon).toBe('ti-home')
    expect(home.group).toBe('navigation')
  })

  it('devrait retourner 3 pages core (avec le mock)', () => {
    const pages = buildAllPages(createManager(), t)
    const corePages = pages.filter((p) => p.isCore)
    expect(corePages.length).toBe(3)
  })

  // ─── PAGES PLUGINS ──────────────────────────────────────────────────

  it('devrait inclure les pages de plugins', () => {
    const manager = createManager({
      pages: new Map([
        [
          'youtube',
          {
            id: 'youtube',
            labelKey: 'youtubeTitle',
            icon: 'ti-brand-youtube',
            group: 'navigation',
          },
        ],
      ]),
    })

    const pages = buildAllPages(manager, t)
    const youtube = pages.find((p) => p.id === 'youtube')
    expect(youtube).toBeDefined()
    expect(youtube.isCore).toBe(false)
    expect(youtube.isPlugin).toBe(true)
    expect(youtube.label).toBe('t(youtubeTitle)')
  })

  it('les pages plugin sans labelKey devraient garder leur label brut', () => {
    const manager = createManager({
      pages: new Map([
        ['custom', { id: 'custom', label: 'Custom Label', icon: 'ti-star' }],
      ]),
    })

    const pages = buildAllPages(manager, t)
    const custom = pages.find((p) => p.id === 'custom')
    expect(custom.label).toBe('Custom Label')
  })

  // ─── PAGES PROFILS ──────────────────────────────────────────────────

  it('devrait inclure les profils du store comme pages', () => {
    const manager = createManager({
      store: {
        profiles: [
          { id: 'all', name: 'Tous les sons', isDefault: true },
          { id: 'p1', name: 'Gaming' },
        ],
      },
    })

    const pages = buildAllPages(manager, t)
    const profileAll = pages.find((p) => p.id === 'profile-all')
    const profileP1 = pages.find((p) => p.id === 'profile-p1')

    expect(profileAll).toBeDefined()
    expect(profileAll.isProfile).toBe(true)
    expect(profileAll.icon).toBe('ti-stack')
    expect(profileAll.group).toBe('profiles')

    expect(profileP1).toBeDefined()
    expect(profileP1.icon).toBe('ti-user')
  })

  it('devrait ignorer les profils si store absent', () => {
    const manager = createManager({ store: null })
    const pages = buildAllPages(manager, t)
    expect(pages.find((p) => p.isProfile)).toBeUndefined()
  })

  it('devrait ignorer les profils si store.profiles manquant', () => {
    const manager = createManager({ store: {} })
    const pages = buildAllPages(manager, t)
    expect(pages.find((p) => p.isProfile)).toBeUndefined()
  })

  // ─── TRADUCTION PAR DÉFAUT ──────────────────────────────────────────

  it('devrait utiliser une identité si translateFn absent', () => {
    const pages = buildAllPages(createManager())
    const home = pages.find((p) => p.id === 'home')
    // label = identity(labelKey) = "mySounds"
    expect(home.label).toBe('mySounds')
  })

  // ─── COMBINAISON ────────────────────────────────────────────────────

  it('devrait combiner core + plugins + profils dans cet ordre', () => {
    const manager = createManager({
      pages: new Map([['plugin-1', { id: 'plugin-1', label: 'Plugin 1' }]]),
      store: { profiles: [{ id: 'p1', name: 'Profile 1' }] },
    })

    const pages = buildAllPages(manager, t)
    const pluginIndex = pages.findIndex((p) => p.id === 'plugin-1')
    const profileIndex = pages.findIndex((p) => p.id === 'profile-p1')
    const homeIndex = pages.findIndex((p) => p.id === 'home')

    // Core en premier, puis plugins, puis profils
    expect(homeIndex).toBeLessThan(pluginIndex)
    expect(pluginIndex).toBeLessThan(profileIndex)
  })
})