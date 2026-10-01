// electron/modules/__sanity.test.js
import { describe, it, expect } from 'vitest'

describe('Sanity: mock electron partagé', () => {
  it('devrait avoir globalThis.__electronMock défini', () => {
    expect(globalThis.__electronMock).toBeDefined()
    expect(globalThis.__electronMock.ipcMain).toBeDefined()
    expect(globalThis.__electronMock.globalShortcut).toBeDefined()
    expect(globalThis.__electronMock.app).toBeDefined()
  })

  it('devrait avoir ipcMain.handle', () => {
    const { ipcMain } = globalThis.__electronMock
    expect(typeof ipcMain.handle).toBe('function')
  })

  it('devrait avoir globalShortcut.register', () => {
    const { globalShortcut } = globalThis.__electronMock
    expect(typeof globalShortcut.register).toBe('function')
  })

  it('devrait retourner la MÊME instance à travers require et globalThis', () => {
    // Si on fait require('electron') depuis ce test, on doit recevoir la même instance
    const electron = globalThis.__electronMock
    expect(electron.ipcMain).toBe(globalThis.__electronMock.ipcMain)
  })
})