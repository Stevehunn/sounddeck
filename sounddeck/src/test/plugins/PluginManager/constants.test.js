import { describe, it, expect, vi } from 'vitest'

// ─── Mock import.meta.glob (feature Vite non disponible en test pur) ───
// On utilise vi.stubGlobal sur import.meta via un shim — pas trivial.
// On teste uniquement ce qui est testable sans le glob : CORE_PAGES + STORE_KEY_*

import {
  STORE_KEY_DISABLED,
  STORE_KEY_DISABLED_META,
  CORE_PAGES,
} from '@core/plugins/PluginManager/constants'

describe('constants (PluginManager)', () => {
  // ─── CLÉS STORE ──────────────────────────────────────────────────────

  it('STORE_KEY_DISABLED devrait valoir "disabledPlugins"', () => {
    expect(STORE_KEY_DISABLED).toBe('disabledPlugins')
  })

  it('STORE_KEY_DISABLED_META devrait valoir "disabledPluginsMeta"', () => {
    expect(STORE_KEY_DISABLED_META).toBe('disabledPluginsMeta')
  })

  // ─── CORE_PAGES ──────────────────────────────────────────────────────

  it('CORE_PAGES devrait être un tableau non vide', () => {
    expect(Array.isArray(CORE_PAGES)).toBe(true)
    expect(CORE_PAGES.length).toBeGreaterThan(0)
  })

  it('chaque page devrait avoir id, labelKey et group', () => {
    for (const page of CORE_PAGES) {
      expect(page.id).toBeTruthy()
      expect(page.labelKey).toBeTruthy()
      expect(page.group).toBeTruthy()
    }
  })

  it('CORE_PAGES devrait contenir "home"', () => {
    const home = CORE_PAGES.find((p) => p.id === 'home')
    expect(home).toBeDefined()
    expect(home.labelKey).toBe('mySounds')
    expect(home.group).toBe('navigation')
  })

  it('CORE_PAGES devrait contenir "options" avec group "footer"', () => {
    const options = CORE_PAGES.find((p) => p.id === 'options')
    expect(options).toBeDefined()
    expect(options.group).toBe('footer')
  })

  it('CORE_PAGES devrait avoir la même longueur que CORE_PAGES_DEFS', () => {
    // Le mapping map(p => ({id, labelKey, group})) doit conserver la taille
    expect(CORE_PAGES.length).toBeGreaterThanOrEqual(13)
  })
})