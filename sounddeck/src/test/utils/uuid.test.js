import { describe, it, expect } from 'vitest'
import { uuid } from '@shared/utils/uuid'

describe('uuid', () => {
  it('devrait retourner un UUID v4 valide sans préfixe', () => {
    const id = uuid()
    // Format UUID v4 : 8-4-4-4-12 caractères hexadécimaux
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('devrait préfixer l\'UUID avec le préfixe fourni', () => {
    const id = uuid('clip')
    expect(id).toMatch(/^clip-/)
    // La partie après le préfixe est un UUID valide
    const withoutPrefix = id.replace(/^clip-/, '')
    expect(withoutPrefix.length).toBeGreaterThan(20)
  })

  it('devrait générer des UUIDs uniques', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(uuid())
    }
    // 100 UUIDs doivent tous être différents
    expect(ids.size).toBe(100)
  })

  it('devrait générer des UUIDs préfixés uniques', () => {
    const a = uuid('effect')
    const b = uuid('effect')
    expect(a).not.toBe(b)
  })
})