// electron/store.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

describe('store.js (electron)', () => {
  beforeEach(() => {
    // Rien : on ne veut PAS reset entre tests (on teste la persistance)
  })

  it('devrait exporter une instance avec get/set/delete/has', () => {
    const store = require('./store')
    expect(store).toBeDefined()
    expect(typeof store.get).toBe('function')
    expect(typeof store.set).toBe('function')
    expect(typeof store.delete).toBe('function')
    expect(typeof store.has).toBe('function')
  })

  it('devrait être la MÊME instance que __storeMock (partagée)', () => {
    const store = require('./store')
    expect(store).toBe(globalThis.__storeMock)
  })

  it('devrait persister les valeurs entre deux require()', () => {
    const store1 = require('./store')
    const store2 = require('./store')
    expect(store1).toBe(store2)
  })

  it('devrait permettre get/set/delete', () => {
    const store = require('./store')
    store.set('smoke-key', 'smoke-value')
    expect(store.get('smoke-key')).toBe('smoke-value')
    store.delete('smoke-key')
    expect(store.get('smoke-key')).toBeUndefined()
  })

  it('devrait retourner la valeur par défaut si clé absente', () => {
    const store = require('./store')
    expect(store.get('missing-key-xyz', 'fallback')).toBe('fallback')
  })

  it('has devrait retourner true/false selon présence', () => {
    const store = require('./store')
    store.set('has-key', 1)
    expect(store.has('has-key')).toBe(true)
    store.delete('has-key')
    expect(store.has('has-key')).toBe(false)
  })
})