// electron/modules/trayManager.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  createTray,
  updateTrayMenu,
  destroyTray,
  getTray,
  TRAY_LABELS,
  getCurrentTrayLanguage,
} from './trayManager'

describe('trayManager', () => {
  let electronMock
  let store
  let Tray
  let Menu
  let nativeImage

  beforeEach(() => {
    // ✅ Reset l'état module-level (trayInstance persiste entre les tests)
    destroyTray()
    vi.clearAllMocks()

    electronMock = globalThis.__electronMock
    store = globalThis.__storeMock
    Tray = electronMock.Tray
    Menu = electronMock.Menu
    nativeImage = electronMock.nativeImage

    // Reset store : langue FR par défaut, tous les flags à off
    store._data.clear()
    store._data.set('lang', 'fr')

    // Par défaut l'icône existe
    globalThis.__fsMock.existsSync.mockReturnValue(true)
  })

  // ═══════════════════════════════════════════════════════════════════
  // Constantes & queries
  // ═══════════════════════════════════════════════════════════════════

  describe('TRAY_LABELS', () => {
    it('devrait contenir fr, en, es', () => {
      expect(TRAY_LABELS).toHaveProperty('fr')
      expect(TRAY_LABELS).toHaveProperty('en')
      expect(TRAY_LABELS).toHaveProperty('es')
    })

    it('devrait avoir toutes les clés attendues en fr', () => {
      expect(TRAY_LABELS.fr).toMatchObject({
        open: expect.any(String),
        shortcuts: expect.any(String),
        shortcutsOn: expect.any(String),
        shortcutsOff: expect.any(String),
        launchAtStartup: expect.any(String),
        startMinimized: expect.any(String),
        quit: expect.any(String),
      })
    })
  })

  describe('getCurrentTrayLanguage', () => {
    it('devrait retourner "fr" par défaut', () => {
      expect(getCurrentTrayLanguage()).toBe('fr')
    })

    it('devrait retourner la langue du store', () => {
      store._data.set('lang', 'en')
      expect(getCurrentTrayLanguage()).toBe('en')
    })
  })

  describe('getTray', () => {
    it('devrait retourner null sans instance', () => {
      expect(getTray()).toBeNull()
    })

    it('devrait retourner l\'instance après createTray', () => {
      createTray('fr', {})
      expect(getTray()).not.toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // createTray
  // ═══════════════════════════════════════════════════════════════════

  describe('createTray', () => {
    it('devrait créer une instance Tray', () => {
      createTray('fr', {})
      expect(Tray).toHaveBeenCalledTimes(1)
    })

    it('ne devrait PAS créer une seconde instance si elle existe déjà', () => {
      createTray('fr', {})
      createTray('fr', {})
      expect(Tray).toHaveBeenCalledTimes(1)
    })

    it('devrait définir le tooltip', () => {
      createTray('fr', {})
      expect(getTray().setToolTip).toHaveBeenCalledWith('SoundDeck - Soundboard')
    })

    it('devrait définir le menu contextuel', () => {
      createTray('fr', {})
      expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
      expect(getTray().setContextMenu).toHaveBeenCalled()
    })

    it('devrait enregistrer le listener double-click', () => {
      createTray('fr', {})
      const onCalls = getTray().on.mock.calls
      expect(onCalls.some((c) => c[0] === 'double-click')).toBe(true)
    })

    it('devrait utiliser createFromPath si l\'icône existe', () => {
      globalThis.__fsMock.existsSync.mockReturnValue(true)
      createTray('fr', {})
      expect(nativeImage.createFromPath).toHaveBeenCalled()
      expect(nativeImage.createEmpty).not.toHaveBeenCalled()
    })

    it('devrait utiliser createEmpty si l\'icône n\'existe pas', () => {
      globalThis.__fsMock.existsSync.mockReturnValue(false)
      createTray('fr', {})
      expect(nativeImage.createEmpty).toHaveBeenCalled()
      expect(nativeImage.createFromPath).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // buildTrayMenu (testé indirectement via Menu.buildFromTemplate)
  // ═══════════════════════════════════════════════════════════════════

  describe('buildTrayMenu — labels', () => {
    const getTemplate = () => Menu.buildFromTemplate.mock.calls[0][0]

    it('devrait utiliser les labels FR', () => {
      createTray('fr', {})
      const t = getTemplate()
      expect(t[0].label).toBe(TRAY_LABELS.fr.open)
      expect(t[1].label).toBe(TRAY_LABELS.fr.shortcuts)
      expect(t[6].label).toBe(TRAY_LABELS.fr.quit)
    })

    it('devrait utiliser les labels EN', () => {
      createTray('en', {})
      const t = getTemplate()
      expect(t[0].label).toBe(TRAY_LABELS.en.open)
      expect(t[1].label).toBe(TRAY_LABELS.en.shortcuts)
      expect(t[6].label).toBe(TRAY_LABELS.en.quit)
    })

    it('devrait utiliser les labels ES', () => {
      createTray('es', {})
      const t = getTemplate()
      expect(t[0].label).toBe(TRAY_LABELS.es.open)
    })

    it('devrait fallback sur FR pour langue inconnue', () => {
      createTray('de', {})
      const t = getTemplate()
      expect(t[0].label).toBe(TRAY_LABELS.fr.open)
    })

    it('devrait afficher "shortcutsOn" si raccourcis activés', () => {
      store._data.set('globalShortcutsEnabled', true)
      createTray('fr', {})
      const t = getTemplate()
      expect(t[1].submenu[0].label).toBe(TRAY_LABELS.fr.shortcutsOn)
    })

    it('devrait afficher "shortcutsOff" si raccourcis désactivés', () => {
      store._data.set('globalShortcutsEnabled', false)
      createTray('fr', {})
      const t = getTemplate()
      expect(t[1].submenu[0].label).toBe(TRAY_LABELS.fr.shortcutsOff)
    })

    it('devrait marquer "launchAtStartup" coché si store=true', () => {
      store._data.set('launchAtStartup', true)
      createTray('fr', {})
      const t = getTemplate()
      expect(t[3].checked).toBe(true)
    })

    it('devrait marquer "startMinimized" coché si store=true', () => {
      store._data.set('startMinimized', true)
      createTray('fr', {})
      const t = getTemplate()
      expect(t[4].checked).toBe(true)
    })
  })

  describe('buildTrayMenu — callbacks', () => {
    const getTemplate = () => Menu.buildFromTemplate.mock.calls[0][0]

    it('devrait déclencher onOpen au click sur "Ouvrir"', () => {
      const onOpen = vi.fn()
      createTray('fr', { onOpen })
      getTemplate()[0].click()
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('devrait déclencher onToggleShortcuts', () => {
      const onToggleShortcuts = vi.fn()
      createTray('fr', { onToggleShortcuts })
      getTemplate()[1].submenu[0].click()
      expect(onToggleShortcuts).toHaveBeenCalledTimes(1)
    })

    it('devrait déclencher onLaunchAtStartup avec checked', () => {
      const onLaunchAtStartup = vi.fn()
      createTray('fr', { onLaunchAtStartup })
      getTemplate()[3].click({ checked: true })
      expect(onLaunchAtStartup).toHaveBeenCalledWith(true)
    })

    it('devrait déclencher onStartMinimized avec checked', () => {
      const onStartMinimized = vi.fn()
      createTray('fr', { onStartMinimized })
      getTemplate()[4].click({ checked: false })
      expect(onStartMinimized).toHaveBeenCalledWith(false)
    })

    it('devrait déclencher onQuit', () => {
      const onQuit = vi.fn()
      createTray('fr', { onQuit })
      getTemplate()[6].click()
      expect(onQuit).toHaveBeenCalledTimes(1)
    })

    it('devrait déclencher onDoubleClick', () => {
      const onDoubleClick = vi.fn()
      createTray('fr', { onDoubleClick })
      const call = getTray().on.mock.calls.find((c) => c[0] === 'double-click')
      call[1]()
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })

    it('ne devrait pas crasher si callbacks absents', () => {
      expect(() => {
        createTray('fr', {})
        const t = getTemplate()
        t[0].click()
        t[1].submenu[0].click()
        t[3].click({ checked: true })
        t[4].click({ checked: false })
        t[6].click()
        const call = getTray().on.mock.calls.find((c) => c[0] === 'double-click')
        call[1]()
      }).not.toThrow()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // updateTrayMenu
  // ═══════════════════════════════════════════════════════════════════

  describe('updateTrayMenu', () => {
    it('ne devrait rien faire si pas de tray', () => {
      updateTrayMenu('fr', {})
      expect(Menu.buildFromTemplate).not.toHaveBeenCalled()
    })

    it('devrait rebuild le menu si tray existe', () => {
      createTray('fr', {})
      Menu.buildFromTemplate.mockClear()

      updateTrayMenu('en', {})

      expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
      const t = Menu.buildFromTemplate.mock.calls[0][0]
      expect(t[0].label).toBe(TRAY_LABELS.en.open)
    })

    it('devrait appeler setContextMenu sur l\'instance existante', () => {
      createTray('fr', {})
      getTray().setContextMenu.mockClear()

      updateTrayMenu('en', {})
      expect(getTray().setContextMenu).toHaveBeenCalledTimes(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // destroyTray
  // ═══════════════════════════════════════════════════════════════════

  describe('destroyTray', () => {
    it('ne devrait rien faire si pas de tray', () => {
      expect(() => destroyTray()).not.toThrow()
    })

    it('devrait appeler destroy() et reset l\'état', () => {
      createTray('fr', {})
      const trayInstance = getTray()

      destroyTray()

      expect(trayInstance.destroy).toHaveBeenCalledTimes(1)
      expect(getTray()).toBeNull()
    })

    it('devrait permettre de recréer un tray après destroy', () => {
      createTray('fr', {})
      destroyTray()
      Tray.mockClear()

      createTray('fr', {})
      expect(Tray).toHaveBeenCalledTimes(1)
    })

    it('devrait gérer une erreur de destroy sans crash', () => {
      createTray('fr', {})
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getTray().destroy.mockImplementationOnce(() => {
        throw new Error('boom')
      })

      expect(() => destroyTray()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()

      // Cleanup (sinon state reste bloqué pour les tests suivants)
      getTray().destroy.mockReset()
      destroyTray()
    })
  })
})