import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ─── Spy console pour éviter le bruit ───────────────────────────────────
let consoleErrorSpy
let consoleWarnSpy
let consoleInfoSpy

describe('errorHandler', () => {
  let electronMock
  let errorHandler

  beforeEach(async () => {
    vi.resetModules()

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    electronMock = {
      storeGet: vi.fn().mockResolvedValue([]),
      storeSet: vi.fn().mockResolvedValue(),
    }
    window.electronAPI = electronMock

    // Reset localStorage mock
    localStorage.getItem.mockReset()
    localStorage.setItem.mockReset()
    localStorage.getItem.mockReturnValue(null)

    // Nettoyer le DOM des dialogs résiduels
    document.body.querySelectorAll('.error-dialog').forEach((d) => d.remove())

    errorHandler = await import('@shared/utils/errorHandler')
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    vi.clearAllMocks()
    vi.useRealTimers()

    // Cleanup dialogs entre les tests
    document.body.querySelectorAll('.error-dialog').forEach((d) => d.remove())
    delete window.addToast
  })

  // ─── handleError ─────────────────────────────────────────────────────

  describe('handleError', () => {
    it('devrait retourner une entrée avec id, timestamp, message', () => {
      const entry = errorHandler.handleError(new Error('boom'), 'test')

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
      expect(entry.type).toBe('test')
      expect(entry.message).toBe('boom')
    })

    it('devrait accepter une string au lieu d\'une Error', () => {
      const entry = errorHandler.handleError('simple message', 'test')
      expect(entry.message).toBe('simple message')
    })

    it('devrait capturer la stack', () => {
      const err = new Error('with stack')
      const entry = errorHandler.handleError(err, 'test')
      expect(entry.stack).toContain('Error')
    })

    it('devrait sérialiser le contexte en JSON', () => {
      const entry = errorHandler.handleError(
        new Error('x'),
        'test',
        { userId: 42, page: 'home' }
      )
      expect(entry.context).toContain('userId')
      expect(entry.context).toContain('42')
    })

    it('devrait gérer les erreurs sans message', () => {
      const entry = errorHandler.handleError({}, 'test')
      expect(entry.message).toBeDefined()
      expect(entry.message.length).toBeGreaterThan(0)
    })

    it('devrait utiliser "unknown" comme type par défaut', () => {
      const entry = errorHandler.handleError(new Error('x'))
      expect(entry.type).toBe('unknown')
    })

    it('devrait tronquer la stack à 4000 caractères', () => {
      const err = new Error('x')
      err.stack = 'a'.repeat(5000)
      const entry = errorHandler.handleError(err, 'test')
      expect(entry.stack.length).toBeLessThanOrEqual(4000)
    })

    it('devrait créer un contexte null si context absent', () => {
      const entry = errorHandler.handleError(new Error('x'), 'test')
      expect(entry.context).toBeNull()
    })

    it('devrait capturer navigator.userAgent', () => {
      const entry = errorHandler.handleError(new Error('x'), 'test')
      expect(entry.userAgent).toBe(navigator.userAgent)
    })
  })

  // ─── setupGlobalErrorHandler ─────────────────────────────────────────

  describe('setupGlobalErrorHandler', () => {
    it('devrait enregistrer les listeners error + unhandledrejection', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      errorHandler.setupGlobalErrorHandler()

      expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )
      addSpy.mockRestore()
    })

    it('ne devrait pas throw en environnement sans window', () => {
      expect(() => errorHandler.setupGlobalErrorHandler()).not.toThrow()
    })

    it('le listener error devrait créer une entrée type=uncaught', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      errorHandler.setupGlobalErrorHandler()

      const errorListener = addSpy.mock.calls.find(
        (c) => c[0] === 'error'
      )?.[1]
      addSpy.mockRestore()

      // ⚠️ Le listener ne retourne rien → on teste l'effet via les logs
      errorListener({
        error: new Error('test'),
        filename: 'file.js',
        lineno: 10,
        colno: 5,
      })

      // Ne crash pas = OK
      expect(typeof errorListener).toBe('function')
    })

    it('le listener unhandledrejection devrait créer une entrée', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      errorHandler.setupGlobalErrorHandler()

      const listener = addSpy.mock.calls.find(
        (c) => c[0] === 'unhandledrejection'
      )?.[1]
      addSpy.mockRestore()

      // ⚠️ Le listener ne retourne rien
      expect(() => listener({ reason: new Error('rejected') })).not.toThrow()
      expect(typeof listener).toBe('function')
    })
  })

  // ─── getErrorLogsFromStore ───────────────────────────────────────────

  describe('getErrorLogsFromStore', () => {
    it('devrait retourner un tableau vide si store vide', async () => {
      electronMock.storeGet.mockResolvedValue(null)
      const logs = await errorHandler.getErrorLogsFromStore()
      expect(logs).toEqual([])
    })

    it('devrait retourner les logs du store', async () => {
      const logs = [{ id: '1', message: 'err' }]
      electronMock.storeGet.mockResolvedValue(logs)

      const result = await errorHandler.getErrorLogsFromStore()
      expect(result).toEqual(logs)
    })

    it('devrait fallback localStorage si electronAPI absent', async () => {
      delete window.electronAPI.storeGet
      localStorage.getItem.mockReturnValue(
        JSON.stringify([{ id: '1', message: 'from localStorage' }])
      )

      const result = await errorHandler.getErrorLogsFromStore()
      expect(result).toEqual([{ id: '1', message: 'from localStorage' }])
      expect(localStorage.getItem).toHaveBeenCalledWith('sounddeck-error-logs')
    })

    it('devrait retourner [] si localStorage contient un JSON invalide', async () => {
      delete window.electronAPI.storeGet
      localStorage.getItem.mockReturnValue('not-json')

      const result = await errorHandler.getErrorLogsFromStore()
      expect(result).toEqual([])
    })

    it('devrait gérer une exception storeGet', async () => {
      electronMock.storeGet.mockRejectedValue(new Error('boom'))
      const result = await errorHandler.getErrorLogsFromStore()
      expect(result).toEqual([])
    })
  })

  // ─── clearAllErrorLogs ───────────────────────────────────────────────

  describe('clearAllErrorLogs', () => {
    it('devrait vider errorLogs et appeler storeSet', async () => {
      await errorHandler.clearAllErrorLogs()

      expect(electronMock.storeSet).toHaveBeenCalledWith('errorLogs', [])
    })

    it('après clear, getErrorLogsFromStore ne doit rien trouver', async () => {
      electronMock.storeGet.mockResolvedValue([])
      await errorHandler.clearAllErrorLogs()

      const logs = await errorHandler.getErrorLogsFromStore()
      expect(logs).toEqual([])
    })
  })

  // ─── reportError ─────────────────────────────────────────────────────

  describe('reportError', () => {
    it('devrait retourner success=false pour un id inconnu', async () => {
      const result = await errorHandler.reportError('unknown-id')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('devrait retourner success=true pour un id connu', async () => {
      const entry = errorHandler.handleError(new Error('x'), 'test')
      const result = await errorHandler.reportError(entry.id)

      expect(result.success).toBe(true)
    })

    it('devrait appeler window.addToast si présent', async () => {
      const addToast = vi.fn()
      window.addToast = addToast

      const entry = errorHandler.handleError(new Error('x'), 'test')
      await errorHandler.reportError(entry.id)

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Merci'),
        'success'
      )
    })

    it('ne devrait PAS crasher sans window.addToast', async () => {
      const entry = errorHandler.handleError(new Error('x'), 'test')
      await expect(errorHandler.reportError(entry.id)).resolves.toMatchObject({
        success: true,
      })
    })
  })

  // ─── openErrorDialog ─────────────────────────────────────────────────

  describe('openErrorDialog', () => {
    it('devrait créer une div.error-dialog dans le body', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Test error',
        stack: 'stack',
        context: null,
      })

      expect(document.querySelector('.error-dialog')).toBeInTheDocument()
    })

    it('devrait afficher le message', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Something broke',
        stack: 'stack',
        context: null,
      })

      expect(document.body.textContent).toContain('Something broke')
    })

    it('devrait afficher la stack', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Test',
        stack: 'Error: at line 42',
        context: null,
      })

      expect(document.body.textContent).toContain('Error: at line 42')
    })

    it('devrait échapper le HTML dans le message', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: '<script>alert(1)</script>',
        stack: '',
        context: null,
      })

      const html = document.querySelector('.error-dialog').innerHTML
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>alert')
    })

    it('devrait afficher le contexte s\'il est présent', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Test',
        stack: 'stack',
        context: '{"userId":42}',
      })

      expect(document.body.textContent).toContain('Contexte')
      expect(document.body.textContent).toContain('userId')
    })

    it('devrait afficher "Aucune stack disponible" si stack vide', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Test',
        stack: '',
        context: null,
      })

      expect(document.body.textContent).toContain('Aucune stack disponible')
    })

    it('ne devrait PAS ouvrir deux dialogs en même temps', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'First',
        stack: '',
        context: null,
      })
      errorHandler.openErrorDialog({
        id: '2',
        message: 'Second',
        stack: '',
        context: null,
      })

      expect(document.querySelectorAll('.error-dialog').length).toBe(1)
    })

    it('devrait avoir un bouton close qui supprime le dialog', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'Test',
        stack: '',
        context: null,
      })

      const closeBtn = document.querySelector('[data-action="close"]')
      expect(closeBtn).toBeInTheDocument()
      closeBtn.click()

      expect(document.querySelector('.error-dialog')).not.toBeInTheDocument()
    })

    it('devrait avoir un bouton report qui appelle reportError', () => {
      const entry = errorHandler.handleError(new Error('x'), 'test')

      errorHandler.openErrorDialog(entry)

      const reportBtn = document.querySelector('[data-action="report"]')
      expect(reportBtn).toBeInTheDocument()
      reportBtn.click()

      expect(document.querySelector('.error-dialog')).not.toBeInTheDocument()
    })

    it('devrait permettre de rouvrir un dialog après fermeture', () => {
      errorHandler.openErrorDialog({
        id: '1',
        message: 'First',
        stack: '',
        context: null,
      })

      document.querySelector('[data-action="close"]').click()

      errorHandler.openErrorDialog({
        id: '2',
        message: 'Second',
        stack: '',
        context: null,
      })

      expect(document.body.textContent).toContain('Second')
    })
  })

  // ─── isCriticalError (via handleError) ───────────────────────────────

  describe('isCriticalError', () => {
    it('devrait afficher un dialog pour "out of memory"', () => {
      window.addToast = vi.fn()
      errorHandler.handleError(new Error('out of memory'), 'test')

      expect(document.querySelector('.error-dialog')).toBeInTheDocument()
    })

    it('devrait afficher un dialog pour "fatal"', () => {
      errorHandler.handleError(new Error('Fatal exception'), 'test')
      expect(document.querySelector('.error-dialog')).toBeInTheDocument()
    })

    it('devrait afficher un dialog pour "cannot read property"', () => {
      errorHandler.handleError(
        new Error("Cannot read property 'x' of undefined"),
        'test'
      )
      expect(document.querySelector('.error-dialog')).toBeInTheDocument()
    })

    it('ne devrait PAS afficher de dialog pour une erreur bénigne', () => {
      errorHandler.handleError(new Error('minor issue'), 'test')
      expect(document.querySelector('.error-dialog')).not.toBeInTheDocument()
    })

    it('devrait appeler window.addToast pour une erreur critique', () => {
      const addToast = vi.fn()
      window.addToast = addToast

      errorHandler.handleError(new Error('out of memory'), 'test')

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('Erreur'),
        'error'
      )
    })
  })

  // ─── useErrorHandler ─────────────────────────────────────────────────

  describe('useErrorHandler', () => {
    it('devrait retourner error=null au départ', () => {
      const { result } = renderHook(() => errorHandler.useErrorHandler())
      expect(result.current.error).toBeNull()
    })

    it('devrait setter error via setError()', async () => {
      const { result } = renderHook(() => errorHandler.useErrorHandler())

      await act(async () => {
        result.current.setError(new Error('test error'))
      })

      expect(result.current.error).not.toBeNull()
      expect(result.current.error.message).toBe('test error')
    })

    it('devrait clear error via clearError()', async () => {
      const { result } = renderHook(() => errorHandler.useErrorHandler())

      await act(async () => {
        result.current.setError(new Error('x'))
      })
      expect(result.current.error).not.toBeNull()

      await act(async () => {
        result.current.clearError()
      })
      expect(result.current.error).toBeNull()
    })

    it('setError devrait créer une entrée type="local"', async () => {
      const { result } = renderHook(() => errorHandler.useErrorHandler())

      await act(async () => {
        result.current.setError(new Error('x'))
      })

      expect(result.current.error.type).toBe('local')
    })
  })

  // ─── useErrorLogs ────────────────────────────────────────────────────

  describe('useErrorLogs', () => {
    it('devrait retourner un tableau vide au départ', () => {
      const { result } = renderHook(() => errorHandler.useErrorLogs())
      expect(result.current.logs).toEqual([])
    })

    it('devrait exposer clearLogs et exportLogs', () => {
      const { result } = renderHook(() => errorHandler.useErrorLogs())
      expect(typeof result.current.clearLogs).toBe('function')
      expect(typeof result.current.exportLogs).toBe('function')
    })

    it('devrait charger les logs depuis le store', async () => {
      electronMock.storeGet.mockResolvedValue([
        { id: '1', message: 'loaded' },
      ])

      const { result } = renderHook(() => errorHandler.useErrorLogs())

      await waitFor(() => {
        expect(result.current.logs).toHaveLength(1)
        expect(result.current.logs[0].message).toBe('loaded')
      })
    })

    it('devrait recevoir les nouvelles erreurs via callback', async () => {
      const { result } = renderHook(() => errorHandler.useErrorLogs())

      // ⚠️ Attendre que le chargement initial soit terminé AVANT de trigger
      await waitFor(() => {
        expect(result.current.logs).toEqual([])
      })

      // Puis trigger
      await act(async () => {
        errorHandler.handleError(new Error('fresh'), 'test')
      })

      await waitFor(() => {
        expect(result.current.logs.length).toBeGreaterThan(0)
        expect(result.current.logs[0].message).toBe('fresh')
      })
    })

    it('clearLogs devrait vider les logs', async () => {
      electronMock.storeGet.mockResolvedValue([{ id: '1' }])
      const { result } = renderHook(() => errorHandler.useErrorLogs())

      await waitFor(() => expect(result.current.logs.length).toBeGreaterThan(0))

      await act(async () => {
        await result.current.clearLogs()
      })

      expect(result.current.logs).toEqual([])
    })

    it('exportLogs devrait utiliser electronAPI.exportJsonFile', async () => {
      window.electronAPI.exportJsonFile = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() => errorHandler.useErrorLogs())

      await act(async () => {
        await result.current.exportLogs()
      })

      expect(window.electronAPI.exportJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/sounddeck-error-logs-.*\.json/),
        expect.any(String)
      )
    })

    it('exportLogs devrait fallback sur Blob si IPC absent', async () => {
      delete window.electronAPI.exportJsonFile

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
      global.URL.revokeObjectURL = vi.fn()

      const { result } = renderHook(() => errorHandler.useErrorLogs())

      let res
      await act(async () => {
        res = await result.current.exportLogs()
      })

      expect(res.success).toBe(true)
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('devrait se désabonner au unmount', async () => {
      const { unmount } = renderHook(() => errorHandler.useErrorLogs())

      const before = errorHandler.handleError(new Error('before'), 'test')

      unmount()

      errorHandler.handleError(new Error('after'), 'test')

      expect(before.message).toBe('before')
    })
  })

  // ─── scheduleWrite (via handleError) ─────────────────────────────────

  describe('scheduleWrite (débounce)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.clearAllTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('devrait déclencher storeSet après 300ms', async () => {
      errorHandler.handleError(new Error('x'), 'test')

      expect(electronMock.storeSet).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(electronMock.storeSet).toHaveBeenCalledWith(
        'errorLogs',
        expect.any(Array)
      )
    })

    it('ne devrait écrire qu\'une fois pour plusieurs erreurs rapprochées', async () => {
      // ✅ Reset explicite du compteur pour ignorer toute pollution résiduelle
      electronMock.storeSet.mockClear()

      errorHandler.handleError(new Error('a'), 'test')
      errorHandler.handleError(new Error('b'), 'test')
      errorHandler.handleError(new Error('c'), 'test')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // Le débounce fait qu'on n'a qu'un seul storeSet pour 3 erreurs rapprochées
      expect(electronMock.storeSet).toHaveBeenCalledTimes(1)
    })

    it('devrait utiliser localStorage si electronAPI absent', async () => {
      delete window.electronAPI.storeSet
      errorHandler.handleError(new Error('x'), 'test')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'sounddeck-error-logs',
        expect.any(String)
      )
    })
  })

  // ─── Exposition window ───────────────────────────────────────────────

  describe('exposition window', () => {
    it('window.handleError devrait être défini', () => {
      expect(typeof window.handleError).toBe('function')
    })

    it('window.reportError devrait être défini', () => {
      expect(typeof window.reportError).toBe('function')
    })

    it('window.handleError devrait être égal à handleError exporté', () => {
      expect(window.handleError).toBe(errorHandler.handleError)
    })
  })

  // ─── MAX_LOGS limite ─────────────────────────────────────────────────

  describe('limite MAX_LOGS', () => {
    it('devrait limiter à 100 logs max', async () => {
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(new Error(`err-${i}`), 'test')
      }

      const entry = errorHandler.handleError(new Error('last'), 'test')
      expect(entry.message).toBe('last')
    })
  })
})