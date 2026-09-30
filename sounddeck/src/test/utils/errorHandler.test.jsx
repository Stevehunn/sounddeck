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

    errorHandler = await import('@shared/utils/errorHandler')
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    vi.clearAllMocks()
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
  })
})