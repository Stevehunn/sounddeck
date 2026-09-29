import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  getFileNameFromPath,
  getFileExtension,
} from '@core/store/utils/normalizePath'

describe('normalizePath', () => {
  it('devrait convertir les backslashes Windows en forward slashes', () => {
    expect(normalizePath('C:\\Users\\name\\sound.mp3')).toBe(
      'C:/Users/name/sound.mp3'
    )
  })

  it('devrait laisser un chemin déjà normalisé inchangé', () => {
    expect(normalizePath('C:/Users/name/sound.mp3')).toBe(
      'C:/Users/name/sound.mp3'
    )
  })

  it('devrait retourner null pour null', () => {
    expect(normalizePath(null)).toBeNull()
  })

  it('devrait retourner undefined pour undefined', () => {
    expect(normalizePath(undefined)).toBeUndefined()
  })
})

describe('getFileNameFromPath', () => {
  it('devrait extraire le nom d\'un chemin Windows', () => {
    expect(getFileNameFromPath('C:\\Users\\name\\sound.mp3')).toBe('sound.mp3')
  })

  it('devrait extraire le nom d\'un chemin POSIX', () => {
    expect(getFileNameFromPath('/home/user/sound.mp3')).toBe('sound.mp3')
  })

  it('devrait retourner une chaîne vide pour null', () => {
    expect(getFileNameFromPath(null)).toBe('')
  })
})

describe('getFileExtension', () => {
  it('devrait extraire l\'extension en minuscules', () => {
    expect(getFileExtension('sound.MP3')).toBe('mp3')
    expect(getFileExtension('/home/user/sound.WAV')).toBe('wav')
  })

  it('devrait retourner une chaîne vide pour un fichier sans extension', () => {
    expect(getFileExtension('README')).toBe('')
  })

  it('devrait retourner une chaîne vide pour null', () => {
    expect(getFileExtension(null)).toBe('')
  })
})