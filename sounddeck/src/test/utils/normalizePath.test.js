// src/test/utils/normalizePath.test.js
import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  getFileNameFromPath,
  getFileExtension,
} from '@core/store/utils/normalizePath'

describe('normalizePath', () => {
  // ─── normalizePath ────────────────────────────────────────────────────
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

    it('devrait gérer un mélange backslash/forward slash', () => {
      expect(normalizePath('C:\\Users/name\\sound.mp3')).toBe(
        'C:/Users/name/sound.mp3'
      )
    })

    it('devrait retourner null pour null', () => {
      expect(normalizePath(null)).toBeNull()
    })

    it('devrait retourner undefined pour undefined', () => {
      expect(normalizePath(undefined)).toBeUndefined()
    })

    it('devrait retourner une chaîne vide telle quelle', () => {
      expect(normalizePath('')).toBe('')
    })
  })

  // ─── getFileNameFromPath ──────────────────────────────────────────────
  describe('getFileNameFromPath', () => {
    it('devrait extraire le nom d\'un chemin Windows', () => {
      expect(getFileNameFromPath('C:\\Users\\name\\sound.mp3')).toBe('sound.mp3')
    })

    it('devrait extraire le nom d\'un chemin POSIX', () => {
      expect(getFileNameFromPath('/home/user/sound.mp3')).toBe('sound.mp3')
    })

    it('devrait extraire le nom d\'un chemin mixte', () => {
      expect(getFileNameFromPath('C:/Users\\name/sound.mp3')).toBe('sound.mp3')
    })

    it('devrait retourner le chemin entier si aucun séparateur', () => {
      expect(getFileNameFromPath('sound.mp3')).toBe('sound.mp3')
    })

    it('devrait retourner une chaîne vide pour null', () => {
      expect(getFileNameFromPath(null)).toBe('')
    })

    it('devrait retourner une chaîne vide pour undefined', () => {
      expect(getFileNameFromPath(undefined)).toBe('')
    })

    it('devrait retourner une chaîne vide pour une chaîne vide', () => {
      expect(getFileNameFromPath('')).toBe('')
    })

    it('devrait gérer un chemin se terminant par un séparateur', () => {
      // split donne ['C:', 'Users', 'name', ''] → parts[3] = '' → return ''
      expect(getFileNameFromPath('C:/Users/name/')).toBe('')
    })
  })

  // ─── getFileExtension ─────────────────────────────────────────────────
  describe('getFileExtension', () => {
    it('devrait extraire l\'extension en minuscules', () => {
      expect(getFileExtension('sound.MP3')).toBe('mp3')
      expect(getFileExtension('/home/user/sound.WAV')).toBe('wav')
    })

    it('devrait extraire l\'extension d\'un chemin Windows', () => {
      expect(getFileExtension('C:\\Users\\sound.FLAC')).toBe('flac')
    })

    it('devrait extraire l\'extension d\'un nom simple', () => {
      expect(getFileExtension('song.ogg')).toBe('ogg')
    })

    it('devrait retourner une chaîne vide pour un fichier sans extension', () => {
      expect(getFileExtension('README')).toBe('')
    })

    it('devrait retourner une chaîne vide pour null', () => {
      expect(getFileExtension(null)).toBe('')
    })

    it('devrait retourner une chaîne vide pour undefined', () => {
      expect(getFileExtension(undefined)).toBe('')
    })

    it('devrait retourner la dernière extension pour un nom multi-points', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
      expect(getFileExtension('my.sound.v2.mp3')).toBe('mp3')
    })

    it('devrait gérer un point en début de nom', () => {
      // ".gitignore" → parts = ['', 'gitignore'] → 'gitignore'
      expect(getFileExtension('.gitignore')).toBe('gitignore')
    })
  })
})