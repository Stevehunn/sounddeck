// src/test/utils/logger.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let consoleErrorSpy
let consoleWarnSpy
let consoleLogSpy

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
  consoleWarnSpy.mockRestore()
  consoleLogSpy.mockRestore()
})

describe('logger', () => {
  it('expose logError, logWarn, logInfo', async () => {
    const mod = await import('@shared/utils/logger')
    expect(typeof mod.logError).toBe('function')
    expect(typeof mod.logWarn).toBe('function')
    expect(typeof mod.logInfo).toBe('function')
  })

  it('logError log avec context + message', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('TestCtx', new Error('boom'))
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('logError accepte une string', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('TestCtx', 'oops')
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('logError gère error=null', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('TestCtx', null)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('logError avec meta log le meta', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('TestCtx', new Error('x'), { userId: 1 })
    const call = consoleErrorSpy.mock.calls[0]
    // Format : `❌ [TestCtx] x`, meta, error
    expect(call[1]).toEqual({ userId: 1 })
  })

  it('logError sans meta ne log pas de 2e arg', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('TestCtx', new Error('x'))
    const call = consoleErrorSpy.mock.calls[0]
    expect(call[1]).not.toEqual(expect.objectContaining({ userId: expect.anything() }))
  })

  it('logWarn log avec context + message', async () => {
    const { logWarn } = await import('@shared/utils/logger')
    logWarn('TestCtx', 'warning!')
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  it('logWarn avec meta', async () => {
    const { logWarn } = await import('@shared/utils/logger')
    logWarn('TestCtx', 'warn', { detail: 'x' })
    const call = consoleWarnSpy.mock.calls[0]
    expect(call[1]).toEqual({ detail: 'x' })
  })

  it('logInfo log avec context + message', async () => {
    const { logInfo } = await import('@shared/utils/logger')
    logInfo('TestCtx', 'info!')
    expect(consoleLogSpy).toHaveBeenCalled()
  })

  it('logInfo avec meta', async () => {
    const { logInfo } = await import('@shared/utils/logger')
    logInfo('TestCtx', 'hello', { n: 42 })
    const call = consoleLogSpy.mock.calls[0]
    expect(call[1]).toEqual({ n: 42 })
  })

  it('getErrorMessage : extrait .message d\'une Error', async () => {
    const { logError } = await import('@shared/utils/logger')
    const err = new Error('custom message')
    logError('Ctx', err)
    const call = consoleErrorSpy.mock.calls[0]
    expect(call[0]).toContain('custom message')
  })

  it('getErrorMessage : gère les objets sans message', async () => {
    const { logError } = await import('@shared/utils/logger')
    logError('Ctx', { foo: 'bar' })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})