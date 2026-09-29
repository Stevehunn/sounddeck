import { describe, it, expect } from 'vitest'
import { buildFileUrl } from '@shared/utils/fileUrl'

describe('buildFileUrl', () => {
  // ─── CAS LIMITES ────────────────────────────────────────────────────

  it('devrait retourner null pour null', () => {
    expect(buildFileUrl(null)).toBeNull()
  })

  it('devrait retourner null pour undefined', () => {
    expect(buildFileUrl(undefined)).toBeNull()
  })

  it('devrait retourner null pour une chaîne vide', () => {
    expect(buildFileUrl('')).toBeNull()
  })

  // ─── URLS DISTANTES (inchangées) ────────────────────────────────────

  it('devrait laisser les URLs http:// inchangées', () => {
    expect(buildFileUrl('http://example.com/test.mp3')).toBe(
      'http://example.com/test.mp3'
    )
  })

  it('devrait laisser les URLs https:// inchangées', () => {
    expect(buildFileUrl('https://example.com/test.mp3')).toBe(
      'https://example.com/test.mp3'
    )
  })

  // ─── URLS DÉJÀ PROTOCOLÉES (inchangées) ─────────────────────────────

  it('devrait laisser les URLs sounddeck-local:// inchangées', () => {
    const url = 'sounddeck-local://file/test.mp3'
    expect(buildFileUrl(url)).toBe(url)
  })

  // ─── RECONVERSION file:// ───────────────────────────────────────────

  it('devrait reconvertir file:///C:/test.mp3 en sounddeck-local', () => {
    const result = buildFileUrl('file:///C:/Users/test.mp3')
    expect(result).toBe('sounddeck-local://file/C%3A/Users/test.mp3')
  })

  // ─── CHEMINS WINDOWS ────────────────────────────────────────────────

  it('devrait convertir un chemin Windows avec backslashes', () => {
    const result = buildFileUrl('C:\\Users\\name\\sound.mp3')
    expect(result).toBe('sounddeck-local://file/C%3A/Users/name/sound.mp3')
  })

  it('devrait convertir un chemin Windows avec forward slashes', () => {
    const result = buildFileUrl('C:/Users/name/sound.mp3')
    expect(result).toBe('sounddeck-local://file/C%3A/Users/name/sound.mp3')
  })

  // ─── ENCODAGE DES CARACTÈRES SPÉCIAUX ───────────────────────────────

  it('devrait encoder les espaces et caractères spéciaux', () => {
    const result = buildFileUrl('C:/Users/mon dossier/mon son.mp3')
    expect(result).toContain('mon%20dossier')
    expect(result).toContain('mon%20son.mp3')
  })
})