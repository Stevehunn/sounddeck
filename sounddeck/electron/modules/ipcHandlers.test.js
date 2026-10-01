// electron/modules/ipcHandlers.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  registerSystemHandlers,
  registerConfirmHandlers,
  registerTrayUpdateHandler,
  __resetEmojiCache,
} from './ipcHandlers'
import { getIpcHandler, getRegisteredChannels } from './__test-helpers__'

describe('ipcHandlers', () => {
  let electronMock
  let shell
  let store
  let childProcess
  let wmMock

  beforeEach(() => {
    vi.clearAllMocks()
    electronMock = globalThis.__electronMock
    shell = electronMock.shell
    store = globalThis.__storeMock
    childProcess = globalThis.__childProcessMock
    wmMock = globalThis.__windowManagerMock

    // Vide le cache emoji module-level
    __resetEmojiCache()

    // Reset le callback tray
    delete globalThis.__updateTrayCallback

    // getMainWindow → null par défaut (via setup-electron)
    wmMock.getMainWindow.mockReturnValue(null)
  })

  afterEach(() => {
    delete globalThis.__updateTrayCallback
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerSystemHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe('registerSystemHandlers', () => {
    beforeEach(() => {
      registerSystemHandlers()
    })

    // ─── open-external ────────────────────────────────────────────────

    describe('open-external', () => {
      it('devrait enregistrer le handler', () => {
        expect(getRegisteredChannels()).toContain('open-external')
      })

      it('devrait appeler shell.openExternal', () => {
        const handler = getIpcHandler('open-external')
        handler({}, 'https://example.com')
        expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
      })
    })

    // ─── quit-app ─────────────────────────────────────────────────────

    describe('quit-app', () => {
      it('devrait appeler app.quit() et retourner true', () => {
        const handler = getIpcHandler('quit-app')
        const result = handler()
        expect(electronMock.app.quit).toHaveBeenCalledTimes(1)
        expect(result).toBe(true)
      })
    })

    // ─── hide-window ──────────────────────────────────────────────────

    describe('hide-window', () => {
      it('devrait hide la fenêtre si elle existe', () => {
        const mockWindow = { hide: vi.fn() }
        wmMock.getMainWindow.mockReturnValue(mockWindow)

        const handler = getIpcHandler('hide-window')
        const result = handler()

        expect(mockWindow.hide).toHaveBeenCalledTimes(1)
        expect(result).toBe(true)
      })

      it('ne devrait pas throw si aucune fenêtre', () => {
        wmMock.getMainWindow.mockReturnValue(null)
        const handler = getIpcHandler('hide-window')
        expect(() => handler()).not.toThrow()
      })
    })

    // ─── show-window ──────────────────────────────────────────────────

    describe('show-window', () => {
      it('devrait appeler showMainWindow()', () => {
        const handler = getIpcHandler('show-window')
        handler()
        expect(wmMock.showMainWindow).toHaveBeenCalledTimes(1)
      })

      it('devrait retourner true', () => {
        const handler = getIpcHandler('show-window')
        expect(handler()).toBe(true)
      })
    })

    // ─── update-tray-language ─────────────────────────────────────────

    describe('update-tray-language', () => {
      it('devrait appeler le callback global si défini', () => {
        const cb = vi.fn()
        globalThis.__updateTrayCallback = cb

        const handler = getIpcHandler('update-tray-language')
        handler({}, 'en')

        expect(cb).toHaveBeenCalledWith('en')
      })

      it('ne devrait pas throw si callback absent', () => {
        const handler = getIpcHandler('update-tray-language')
        expect(() => handler({}, 'fr')).not.toThrow()
      })

      it('devrait retourner true', () => {
        const handler = getIpcHandler('update-tray-language')
        expect(handler({}, 'fr')).toBe(true)
      })
    })

    // ─── get-system-language ──────────────────────────────────────────

    describe('get-system-language', () => {
      it('devrait retourner "fr" pour une locale fr-FR', () => {
        electronMock.app.getLocale.mockReturnValue('fr-FR')
        const handler = getIpcHandler('get-system-language')
        expect(handler()).toBe('fr')
      })

      it('devrait retourner "en" pour une locale en-US', () => {
        electronMock.app.getLocale.mockReturnValue('en-US')
        const handler = getIpcHandler('get-system-language')
        expect(handler()).toBe('en')
      })

      it('devrait retourner "es" pour une locale es-ES', () => {
        electronMock.app.getLocale.mockReturnValue('es-ES')
        const handler = getIpcHandler('get-system-language')
        expect(handler()).toBe('es')
      })

      it('devrait fallback sur "fr" pour une locale non supportée (de-DE)', () => {
        electronMock.app.getLocale.mockReturnValue('de-DE')
        const handler = getIpcHandler('get-system-language')
        expect(handler()).toBe('fr')
      })

      it('devrait fallback sur "fr" si getLocale throw', () => {
        electronMock.app.getLocale.mockImplementation(() => {
          throw new Error('locale error')
        })
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const handler = getIpcHandler('get-system-language')
        expect(handler()).toBe('fr')
        consoleSpy.mockRestore()
      })
    })

    // ─── get-system-keyboard-layout ───────────────────────────────────

    describe('get-system-keyboard-layout', () => {
      it('devrait retourner "qwerty" sur platform non-win32', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', {
          value: 'linux',
          configurable: true,
        })

        const handler = getIpcHandler('get-system-keyboard-layout')
        expect(handler()).toBe('qwerty')

        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        })
      })

      it('devrait détecter azerty via execSync sur win32', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', {
          value: 'win32',
          configurable: true,
        })

        childProcess.execSync.mockReturnValue('0000040c  AZERTY')
        electronMock.app.getLocale.mockReturnValue('en-US')

        const handler = getIpcHandler('get-system-keyboard-layout')
        expect(handler()).toBe('azerty')

        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        })
      })

      it('devrait fallback sur locale azerty sur win32', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', {
          value: 'win32',
          configurable: true,
        })

        childProcess.execSync.mockReturnValue('')
        electronMock.app.getLocale.mockReturnValue('fr-FR')

        const handler = getIpcHandler('get-system-keyboard-layout')
        expect(handler()).toBe('azerty')

        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        })
      })

      it('devrait retourner "qwerty" si aucune détection ne matche sur win32', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', {
          value: 'win32',
          configurable: true,
        })

        childProcess.execSync.mockReturnValue('')
        electronMock.app.getLocale.mockReturnValue('en-US')

        const handler = getIpcHandler('get-system-keyboard-layout')
        expect(handler()).toBe('qwerty')

        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        })
      })
    })

    // ─── fetch-myinstants ─────────────────────────────────────────────

    describe('fetch-myinstants', () => {
      const HTML_SIMPLE = `
        <html><body>
          <a href="/fr/instant/boom-sound/">Boom Sound</a>
          <button onclick="play('media/sounds/boom.mp3')"></button>
          <a href="/fr/instant/airhorn/">Airhorn</a>
          <button onclick="play('media/sounds/airhorn.mp3')"></button>
        </body></html>
      `

      it('devrait enregistrer le handler', () => {
        expect(getRegisteredChannels()).toContain('fetch-myinstants')
      })

      it('devrait parser des sons en mode search', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: HTML_SIMPLE,
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'boom', 'search', 'fr')

        expect(result.success).toBe(true)
        expect(result.sounds).toHaveLength(2)
        expect(result.sounds[0].name).toBe('Boom Sound')
        expect(result.sounds[0].url).toContain('boom.mp3')
      })

      it('devrait retourner une erreur réseau', async () => {
        const netErr = new Error('ENOTFOUND')
        globalThis.__setHttpsResponse(() => ({ error: netErr }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'boom', 'search', 'fr')

        expect(result.success).toBe(false)
        expect(result.isNetworkError).toBe(true)
      })

      it('devrait retourner "Aucun son trouvé" si HTML vide', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: '<html></html>',
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'zzz', 'search', 'fr')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Aucun son')
      })

      it('devrait construire la bonne URL pour mode search', async () => {
        let capturedUrl = null
        globalThis.__setHttpsResponse((url) => {
          capturedUrl = url
          return { statusCode: 200, headers: {}, body: HTML_SIMPLE }
        })

        const handler = getIpcHandler('fetch-myinstants')
        await handler({}, 'boom', 'search', 'fr')

        expect(capturedUrl).toContain('/fr/search/?name=boom')
      })

      it('devrait construire la bonne URL pour mode trending (fr)', async () => {
        let capturedUrl = null
        globalThis.__setHttpsResponse((url) => {
          capturedUrl = url
          return { statusCode: 200, headers: {}, body: HTML_SIMPLE }
        })

        const handler = getIpcHandler('fetch-myinstants')
        await handler({}, '', 'trending', 'fr')

        expect(capturedUrl).toContain('/fr/index/fr/')
      })

      it('devrait construire la bonne URL pour mode trending (en)', async () => {
        let capturedUrl = null
        globalThis.__setHttpsResponse((url) => {
          capturedUrl = url
          return { statusCode: 200, headers: {}, body: HTML_SIMPLE }
        })

        const handler = getIpcHandler('fetch-myinstants')
        await handler({}, '', 'trending', 'en')

        expect(capturedUrl).toContain('/fr/index/us/')
      })

      it('devrait construire la bonne URL pour mode category', async () => {
        let capturedUrl = null
        globalThis.__setHttpsResponse((url) => {
          capturedUrl = url
          return { statusCode: 200, headers: {}, body: HTML_SIMPLE }
        })

        const handler = getIpcHandler('fetch-myinstants')
        await handler({}, 'memes', 'category', 'fr')

        expect(capturedUrl).toContain('/fr/categories/memes/')
      })

      it('devrait utiliser "meme" par défaut si query vide en search', async () => {
        let capturedUrl = null
        globalThis.__setHttpsResponse((url) => {
          capturedUrl = url
          return { statusCode: 200, headers: {}, body: HTML_SIMPLE }
        })

        const handler = getIpcHandler('fetch-myinstants')
        await handler({}, '', 'search', 'fr')

        expect(capturedUrl).toContain('name=meme')
      })

      it('devrait gérer mode multi (déduplication)', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: HTML_SIMPLE,
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'boom,airhorn', 'multi', 'fr')

        expect(result.success).toBe(true)
        // Les 2 requêtes renvoient les mêmes 2 slugs → dédup → 2
        expect(result.sounds).toHaveLength(2)
      })

      it('devrait ignorer les slugs dans la liste noire', async () => {
        const htmlWithIgnored = `
          <a href="/fr/instant/boom/">Boom</a>
          <a href="/fr/instant/favorites/">Favorites</a>
          <a href="/fr/instant/trending/">Trending</a>
          <a href="/fr/instant/report/">Report</a>
        `
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: htmlWithIgnored,
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'x', 'search', 'fr')

        expect(result.success).toBe(true)
        const slugs = result.sounds.map((s) => s.slug)
        expect(slugs).not.toContain('favorites')
        expect(slugs).not.toContain('trending')
        expect(slugs).not.toContain('report')
      })

      it('devrait assigner un emoji en fonction du nom', async () => {
        const html = `
          <a href="/fr/instant/boom/">Boom</a>
          <button onclick="play('media/sounds/boom.mp3')"></button>
          <a href="/fr/instant/sad-trombone/">Sad Trombone</a>
          <button onclick="play('media/sounds/trombone.mp3')"></button>
        `
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: html,
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'x', 'search', 'fr')

        expect(result.sounds.find((s) => s.slug === 'boom').emoji).toBe('💥')
        expect(result.sounds.find((s) => s.slug === 'sad-trombone').emoji).toBe(
          '🎺'
        )
      })

      it('devrait retourner une erreur HTTP non-200', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 404,
          headers: {},
          body: '',
        }))

        const handler = getIpcHandler('fetch-myinstants')
        const result = await handler({}, 'x', 'search', 'fr')

        // Le parser retourne [] → "Aucun son trouvé"
        expect(result.success).toBe(false)
      })
    })

    // ─── fetch-emojis ─────────────────────────────────────────────────

    describe('fetch-emojis', () => {
      const HTML_EMOJI = `
        <html><body>
          <section>
            <h2><a>Smileys</a></h2>
            <div class="emoji emoji-button">😀</div>
            <div class="emoji emoji-button">😃</div>
            <div class="emoji emoji-button">😄</div>
          </section>
        </body></html>
      `

      it('devrait enregistrer le handler', () => {
        expect(getRegisteredChannels()).toContain('fetch-emojis')
      })

      it('devrait retourner une erreur si categoryId manquant', async () => {
        const handler = getIpcHandler('fetch-emojis')
        const result = await handler({}, null)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Catégorie manquante')
      })

      it('devrait retourner les emojis parsés', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: HTML_EMOJI,
        }))

        const handler = getIpcHandler('fetch-emojis')
        const result = await handler({}, 'smileys')

        expect(result.success).toBe(true)
        expect(result.emojis).toEqual(['😀', '😃', '😄'])
      })

      it('devrait retourner une erreur si aucun emoji trouvé', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: '<html></html>',
        }))

        const handler = getIpcHandler('fetch-emojis')
        const result = await handler({}, 'unknown-category')

        expect(result.success).toBe(false)
      })

      it('devrait utiliser le cache (2e appel sans fetch)', async () => {
        globalThis.__setHttpsResponse(() => ({
          statusCode: 200,
          headers: {},
          body: HTML_EMOJI,
        }))

        const handler = getIpcHandler('fetch-emojis')
        const r1 = await handler({}, 'smileys')
        expect(r1.fromCache).toBeUndefined()

        const r2 = await handler({}, 'smileys')
        expect(r2.fromCache).toBe(true)
        expect(r2.emojis).toEqual(['😀', '😃', '😄'])
      })

      it('devrait retourner une erreur réseau', async () => {
        globalThis.__setHttpsResponse(() => ({
          error: new Error('ENOTFOUND'),
        }))

        const handler = getIpcHandler('fetch-emojis')
        const result = await handler({}, 'smileys')

        expect(result.success).toBe(false)
        expect(result.isNetworkError).toBe(true)
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerConfirmHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe('registerConfirmHandlers', () => {
    let windowManagerMock

    beforeEach(() => {
      windowManagerMock = {
        setQuitting: vi.fn(),
        setPendingQuit: vi.fn(),
        getMainWindow: vi.fn(() => null),
      }
      registerConfirmHandlers(windowManagerMock)
    })

    describe('confirm-quit', () => {
      it('devrait enregistrer le handler', () => {
        expect(getRegisteredChannels()).toContain('confirm-quit')
      })

      it('action="quit" → setQuitting + setPendingQuit + app.quit', () => {
        const handler = getIpcHandler('confirm-quit')
        const result = handler({}, 'quit', false)

        expect(windowManagerMock.setQuitting).toHaveBeenCalledWith(true)
        expect(windowManagerMock.setPendingQuit).toHaveBeenCalledWith(true)
        expect(electronMock.app.quit).toHaveBeenCalled()
        expect(result).toBe('quit')
      })

      it('action="quit" avec remember → store.set closeToTray=false', () => {
        const handler = getIpcHandler('confirm-quit')
        handler({}, 'quit', true)

        expect(store._data.get('closeToTray')).toBe(false)
      })

      it('action="quit" sans remember → ne touche PAS au store', () => {
        const handler = getIpcHandler('confirm-quit')
        handler({}, 'quit', false)

        expect(store._data.has('closeToTray')).toBe(false)
      })

      it('action="minimize" → cache la fenêtre + envoie hide-quit-confirm', () => {
        const mockWindow = {
          webContents: { send: vi.fn() },
          hide: vi.fn(),
        }
        windowManagerMock.getMainWindow.mockReturnValue(mockWindow)

        const handler = getIpcHandler('confirm-quit')
        const result = handler({}, 'minimize', false)

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'hide-quit-confirm'
        )
        expect(result).toBe('minimize')
      })

      it('action="minimize" avec remember → store.set closeToTray=true', () => {
        windowManagerMock.getMainWindow.mockReturnValue(null)

        const handler = getIpcHandler('confirm-quit')
        handler({}, 'minimize', true)

        expect(store._data.get('closeToTray')).toBe(true)
      })

      it('action inconnue → retourne "cancel"', () => {
        const handler = getIpcHandler('confirm-quit')
        const result = handler({}, 'unknown', false)
        expect(result).toBe('cancel')
      })

      it('minimize sans fenêtre → ne throw pas', () => {
        windowManagerMock.getMainWindow.mockReturnValue(null)
        const handler = getIpcHandler('confirm-quit')
        expect(() => handler({}, 'minimize', false)).not.toThrow()
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerTrayUpdateHandler
  // ═══════════════════════════════════════════════════════════════════

  describe('registerTrayUpdateHandler', () => {
    it('devrait stocker le callback sur global', () => {
      const cb = vi.fn()
      registerTrayUpdateHandler(cb)

      expect(globalThis.__updateTrayCallback).toBe(cb)
    })

    it('devrait remplacer un callback existant', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()

      registerTrayUpdateHandler(cb1)
      registerTrayUpdateHandler(cb2)

      expect(globalThis.__updateTrayCallback).toBe(cb2)
    })
  })
})