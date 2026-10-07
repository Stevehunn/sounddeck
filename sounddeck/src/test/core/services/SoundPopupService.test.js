// src/test/core/services/SoundPopupService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  POPUP_POSITIONS,
  initSoundPopup,
  isPopupEnabled,
  setPopupEnabled,
  getPopupPosition,
  setPopupPosition,
  getPopupSize,
  setPopupSize,
  setPopupTheme,
  showSoundPopup,
  hideSoundPopup,
  previewSoundPopup,
  onSoundPopupAction,
} from '@core/services/SoundPopupService'

// ─── MOCK API ──────────────────────────────────────────────────────────
const createMockAPI = () => ({
  show: vi.fn(),
  hide: vi.fn(),
  setEnabled: vi.fn(),
  setPosition: vi.fn(),
  setSize: vi.fn(),
  preview: vi.fn(),
  onAction: vi.fn(() => vi.fn()),
})

let api

beforeEach(() => {
  api = createMockAPI()
  global.window.electronAPI = { soundPopup: api }

  // Reset l'état module-level du service
  initSoundPopup({
    enabled: true,
    position: 'top-right',
    size: 'medium',
    theme: 'dark',
  })

  api.setEnabled.mockClear()
  api.setPosition.mockClear()
  api.setSize.mockClear()
})

// ═══════════════════════════════════════════════════════════════════════
// POPUP_POSITIONS
// ═══════════════════════════════════════════════════════════════════════
describe('POPUP_POSITIONS', () => {
  it('contient 8 positions', () => {
    expect(POPUP_POSITIONS).toHaveLength(8)
  })

  it('contient les 4 coins', () => {
    expect(POPUP_POSITIONS).toContain('top-left')
    expect(POPUP_POSITIONS).toContain('top-right')
    expect(POPUP_POSITIONS).toContain('bottom-left')
    expect(POPUP_POSITIONS).toContain('bottom-right')
  })

  it('contient les 4 bords centraux', () => {
    expect(POPUP_POSITIONS).toContain('top-center')
    expect(POPUP_POSITIONS).toContain('center-left')
    expect(POPUP_POSITIONS).toContain('center-right')
    expect(POPUP_POSITIONS).toContain('bottom-center')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// initSoundPopup
// ═══════════════════════════════════════════════════════════════════════
describe('initSoundPopup', () => {
  it('synchronise enabled/position/size avec l\'API', () => {
    api.setEnabled.mockClear()
    api.setPosition.mockClear()
    api.setSize.mockClear()

    initSoundPopup({
      enabled: false,
      position: 'bottom-left',
      size: 'large',
      theme: 'light',
    })

    expect(api.setEnabled).toHaveBeenCalledWith(false)
    expect(api.setPosition).toHaveBeenCalledWith('bottom-left')
    expect(api.setSize).toHaveBeenCalledWith('large')
  })

  it('met à jour l\'état interne', () => {
    initSoundPopup({
      enabled: false,
      position: 'bottom-left',
      size: 'large',
    })

    expect(isPopupEnabled()).toBe(false)
    expect(getPopupPosition()).toBe('bottom-left')
    expect(getPopupSize()).toBe('large')
  })

  it('utilise les defaults si rien n\'est passé', () => {
    initSoundPopup()
    expect(isPopupEnabled()).toBe(true)
    expect(getPopupPosition()).toBe('top-right')
    expect(getPopupSize()).toBe('medium')
  })

  it('ignore une position invalide', () => {
    initSoundPopup({ position: 'nope' })
    expect(getPopupPosition()).toBe('top-right')
  })

  it('ignore une taille invalide', () => {
    initSoundPopup({ size: 'huge' })
    expect(getPopupSize()).toBe('medium')
  })

  it('ne crash pas si l\'API est absente', () => {
    global.window.electronAPI = undefined
    expect(() => initSoundPopup()).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Enabled / Position / Size
// ═══════════════════════════════════════════════════════════════════════
describe('setPopupEnabled', () => {
  it('met à jour l\'état et sync l\'API', () => {
    setPopupEnabled(false)
    expect(isPopupEnabled()).toBe(false)
    expect(api.setEnabled).toHaveBeenCalledWith(false)

    setPopupEnabled(true)
    expect(isPopupEnabled()).toBe(true)
    expect(api.setEnabled).toHaveBeenCalledWith(true)
  })

  it('coerce en booléen', () => {
    setPopupEnabled(0)
    expect(isPopupEnabled()).toBe(false)
  })
})

describe('setPopupPosition', () => {
  it('met à jour et sync l\'API', () => {
    setPopupPosition('bottom-left')
    expect(getPopupPosition()).toBe('bottom-left')
    expect(api.setPosition).toHaveBeenCalledWith('bottom-left')
  })

  it('ignore une position invalide', () => {
    setPopupPosition('nope')
    expect(getPopupPosition()).toBe('top-right')
    expect(api.setPosition).not.toHaveBeenCalled()
  })
})

describe('setPopupSize', () => {
  it('met à jour et sync l\'API', () => {
    setPopupSize('large')
    expect(getPopupSize()).toBe('large')
    expect(api.setSize).toHaveBeenCalledWith('large')
  })

  it('ignore une taille invalide', () => {
    setPopupSize('huge')
    expect(getPopupSize()).toBe('medium')
  })
})

describe('setPopupTheme', () => {
  it('mémorise le thème et le customTheme', () => {
    // Pas d'API à appeler, c'est juste du state interne
    setPopupTheme('light', { accent: '#FF0000' })

    // On vérifie via showSoundPopup que le thème est bien passé
    showSoundPopup({ name: 'X' })
    expect(api.show).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'light',
        customTheme: { accent: '#FF0000' },
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// showSoundPopup
// ═══════════════════════════════════════════════════════════════════════
describe('showSoundPopup', () => {
  it('appelle api.show avec les infos', () => {
    showSoundPopup({
      name: 'Mon son',
      emoji: '🎵',
      image: '/path/img.png',
      duration: 12.5,
      index: 2,
      total: 10,
    })

    expect(api.show).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mon son',
        emoji: '🎵',
        image: '/path/img.png',
        duration: 12.5,
        index: 2,
        total: 10,
        hideDelay: 3500,
        cardSize: 'medium',
        theme: 'dark',
      })
    )
  })

  it('no-op si disabled', () => {
    setPopupEnabled(false)
    showSoundPopup({ name: 'X' })
    expect(api.show).not.toHaveBeenCalled()
  })

  it('utilise cardSize override et sync la taille', () => {
    api.setSize.mockClear()
    showSoundPopup({ name: 'X', cardSize: 'large' })

    expect(api.setSize).toHaveBeenCalledWith('large')
    expect(api.show).toHaveBeenCalledWith(
      expect.objectContaining({ cardSize: 'large' })
    )
  })

  it('ignore un cardSize invalide', () => {
    showSoundPopup({ name: 'X', cardSize: 'huge' })
    expect(api.show).toHaveBeenCalledWith(
      expect.objectContaining({ cardSize: 'medium' })
    )
  })

  it('ne crash pas si api.show absent', () => {
    global.window.electronAPI = { soundPopup: { setEnabled: vi.fn() } }
    expect(() => showSoundPopup({ name: 'X' })).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// hideSoundPopup
// ═══════════════════════════════════════════════════════════════════════
describe('hideSoundPopup', () => {
  it('appelle api.hide', () => {
    hideSoundPopup()
    expect(api.hide).toHaveBeenCalled()
  })

  it('ne crash pas sans API', () => {
    global.window.electronAPI = undefined
    expect(() => hideSoundPopup()).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// previewSoundPopup
// ═══════════════════════════════════════════════════════════════════════
describe('previewSoundPopup', () => {
  it('appelle api.preview avec des defaults', () => {
    previewSoundPopup()
    expect(api.preview).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Exemple de son',
        emoji: '🔊',
        duration: 12.4,
        index: 2,
        total: 5,
        // ✅ FIX : le service utilise désormais 6000 (aligné avec SoundPopupWindow AUTO_HIDE_DELAY)
        hideDelay: 6000,
        cardSize: 'medium',
        theme: 'dark',
      })
    )
  })

  it('transmet la position sélectionnée', () => {
    previewSoundPopup({ position: 'top-left' })
    expect(api.preview).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-left' })
    )
  })

  it('utilise la position courante si non fournie', () => {
    setPopupPosition('bottom-right')
    previewSoundPopup({})
    expect(api.preview).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'bottom-right' })
    )
  })

  it('transmet cardSize et theme custom', () => {
    previewSoundPopup({ cardSize: 'large', theme: 'custom', customTheme: { accent: '#0F0' } })
    expect(api.preview).toHaveBeenCalledWith(
      expect.objectContaining({
        cardSize: 'large',
        theme: 'custom',
        customTheme: { accent: '#0F0' },
      })
    )
  })

  it('ne crash pas sans API', () => {
    global.window.electronAPI = undefined
    expect(() => previewSoundPopup({})).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// onSoundPopupAction
// ═══════════════════════════════════════════════════════════════════════
describe('onSoundPopupAction', () => {
  it('délègue à api.onAction', () => {
    const cb = vi.fn()
    onSoundPopupAction(cb)
    expect(api.onAction).toHaveBeenCalledWith(cb)
  })

  it('retourne une fonction no-op si API absente', () => {
    global.window.electronAPI = undefined
    const cleanup = onSoundPopupAction(vi.fn())
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })
})