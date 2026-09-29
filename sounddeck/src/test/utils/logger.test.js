import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logError, logWarn, logInfo } from '@shared/utils/logger'

describe('logger', () => {
  let errorSpy
  let warnSpy
  let logSpy

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
    warnSpy.mockRestore()
    logSpy.mockRestore()
  })

  // ─── logError ───────────────────────────────────────────────────────

  it('logError devrait appeler console.error avec le contexte et le message', () => {
    logError('AudioService', new Error('Boom'))
    expect(errorSpy).toHaveBeenCalled()
    const firstArg = errorSpy.mock.calls[0][0]
    expect(firstArg).toContain('AudioService')
    expect(firstArg).toContain('Boom')
  })

  it('logError devrait accepter une chaîne en fallback', () => {
    logError('PluginManager', 'erreur textuelle')
    expect(errorSpy).toHaveBeenCalled()
    const firstArg = errorSpy.mock.calls[0][0]
    expect(firstArg).toContain('erreur textuelle')
  })

  // ─── logWarn ────────────────────────────────────────────────────────

  it('logWarn devrait appeler console.warn', () => {
    logWarn('Test', 'attention')
    expect(warnSpy).toHaveBeenCalled()
    const firstArg = warnSpy.mock.calls[0][0]
    expect(firstArg).toContain('attention')
  })

  // ─── logInfo ────────────────────────────────────────────────────────

  it('logInfo devrait appeler console.log', () => {
    logInfo('Test', 'info message')
    expect(logSpy).toHaveBeenCalled()
    const firstArg = logSpy.mock.calls[0][0]
    expect(firstArg).toContain('info message')
  })

  // ─── META ───────────────────────────────────────────────────────────

  it('devrait passer les meta en second argument à console.error', () => {
    const meta = { userId: 42 }
    logError('Test', new Error('x'), meta)
    // Le 2e arg de console.error est `meta`
    const args = errorSpy.mock.calls[0]
    expect(args[1]).toEqual(meta)
  })
})