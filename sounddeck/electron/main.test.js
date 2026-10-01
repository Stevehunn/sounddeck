// electron/main.test.js
import { describe, it, expect, beforeAll } from 'vitest'

describe('main.js (smoke)', () => {
  let importError = null
  let menuSetAppCalls = []
  let requestLockCalls = []

  beforeAll(async () => {
    const electron = globalThis.__electronMock
    electron.Menu.setApplicationMenu.mockClear()
    electron.app.requestSingleInstanceLock.mockClear()

    try {
      await import('./main')
    } catch (e) {
      importError = e
    }

    // Capture AVANT que le beforeEach global ne reset les mocks
    menuSetAppCalls = electron.Menu.setApplicationMenu.mock.calls.slice()
    requestLockCalls = electron.app.requestSingleInstanceLock.mock.calls.slice()
  })

  it('devrait se charger sans throw', () => {
    expect(importError).toBeNull()
  })

  it('devrait appeler Menu.setApplicationMenu(null)', () => {
    expect(menuSetAppCalls.length).toBeGreaterThan(0)
    expect(menuSetAppCalls[0][0]).toBe(null)
  })

  it('devrait appeler app.requestSingleInstanceLock()', () => {
    expect(requestLockCalls.length).toBeGreaterThan(0)
  })

  it('ne devrait PAS appeler app.quit() (lock obtenu)', () => {
    // requestSingleInstanceLock retourne true dans notre mock
    // donc app.quit() ne doit pas avoir été appelé
    const quitCalls = globalThis.__electronMock.app.quit.mock.calls
    expect(quitCalls.length).toBe(0)
  })
})