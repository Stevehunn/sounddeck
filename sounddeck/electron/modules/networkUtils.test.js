// electron/modules/networkUtils.test.js
import { describe, it, expect } from 'vitest'
import {
  normalizeNetworkError,
  isNetworkError,
  NETWORK_ERROR_PATTERNS,
} from './networkUtils'

describe('networkUtils', () => {
  // ═══════════════════════════════════════════════════════════════════
  // NETWORK_ERROR_PATTERNS
  // ═══════════════════════════════════════════════════════════════════

  describe('NETWORK_ERROR_PATTERNS', () => {
    it('devrait être un tableau', () => {
      expect(Array.isArray(NETWORK_ERROR_PATTERNS)).toBe(true)
    })

    it('devrait contenir les codes errno principaux', () => {
      expect(NETWORK_ERROR_PATTERNS).toContain('ENOTFOUND')
      expect(NETWORK_ERROR_PATTERNS).toContain('ETIMEDOUT')
      expect(NETWORK_ERROR_PATTERNS).toContain('ECONNREFUSED')
      expect(NETWORK_ERROR_PATTERNS).toContain('ECONNRESET')
      expect(NETWORK_ERROR_PATTERNS).toContain('EAI_AGAIN')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // normalizeNetworkError — null cases
  // ═══════════════════════════════════════════════════════════════════

  describe('normalizeNetworkError — cas non-réseau', () => {
    it('devrait retourner null pour null', () => {
      expect(normalizeNetworkError(null)).toBeNull()
    })

    it('devrait retourner null pour undefined', () => {
      expect(normalizeNetworkError(undefined)).toBeNull()
    })

    it('devrait retourner null pour une string vide', () => {
      expect(normalizeNetworkError('')).toBeNull()
    })

    it('devrait retourner null pour une erreur sans message', () => {
      expect(normalizeNetworkError({})).toBeNull()
    })

    it('devrait retourner null pour "boom"', () => {
      expect(normalizeNetworkError(new Error('boom'))).toBeNull()
    })

    it('devrait retourner null pour "file not found"', () => {
      expect(normalizeNetworkError('file not found')).toBeNull()
    })

    it('devrait retourner null pour "permission denied"', () => {
      expect(normalizeNetworkError('permission denied')).toBeNull()
    })

    it('devrait retourner null pour "invalid JSON"', () => {
      expect(normalizeNetworkError('invalid JSON')).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // normalizeNetworkError — NETWORK_ERROR (codes errno)
  // ═══════════════════════════════════════════════════════════════════

  describe('normalizeNetworkError — codes errno', () => {
    it('devrait détecter ENOTFOUND', () => {
      expect(normalizeNetworkError(new Error('getaddrinfo ENOTFOUND'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter ETIMEDOUT (pas NETWORK_TIMEOUT)', () => {
      const result = normalizeNetworkError(new Error('connect ETIMEDOUT'))
      expect(result).toBe('NETWORK_ERROR')
    })

    it('devrait détecter ECONNREFUSED', () => {
      expect(normalizeNetworkError(new Error('connect ECONNREFUSED'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter ECONNRESET', () => {
      expect(normalizeNetworkError(new Error('socket ECONNRESET'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter EAI_AGAIN', () => {
      expect(normalizeNetworkError(new Error('getaddrinfo EAI_AGAIN'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter ENETUNREACH', () => {
      expect(normalizeNetworkError(new Error('connect ENETUNREACH'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter EHOSTUNREACH', () => {
      expect(normalizeNetworkError(new Error('EHOSTUNREACH'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait détecter ENETDOWN', () => {
      expect(normalizeNetworkError(new Error('ENETDOWN'))).toBe('NETWORK_ERROR')
    })

    it('devrait détecter ERR_SOCKET_CONNECTION_TIMEOUT', () => {
      expect(
        normalizeNetworkError(new Error('ERR_SOCKET_CONNECTION_TIMEOUT'))
      ).toBe('NETWORK_ERROR')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // normalizeNetworkError — messages anglais
  // ═══════════════════════════════════════════════════════════════════

  describe('normalizeNetworkError — messages texte', () => {
    it('devrait détecter "getaddrinfo"', () => {
      expect(normalizeNetworkError('getaddrinfo failed')).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "Failed to resolve"', () => {
      expect(
        normalizeNetworkError(new Error('Failed to resolve host'))
      ).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "network is unreachable"', () => {
      expect(
        normalizeNetworkError('network is unreachable')
      ).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "no such host"', () => {
      expect(normalizeNetworkError('no such host')).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "Temporary failure in name resolution"', () => {
      expect(
        normalizeNetworkError('Temporary failure in name resolution')
      ).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "Name or service not known"', () => {
      expect(
        normalizeNetworkError('Name or service not known')
      ).toBe('NETWORK_ERROR')
    })

    it('devrait détecter "Could not resolve host"', () => {
      expect(normalizeNetworkError('Could not resolve host')).toBe(
        'NETWORK_ERROR'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // normalizeNetworkError — NETWORK_TIMEOUT
  // ═══════════════════════════════════════════════════════════════════

  describe('normalizeNetworkError — timeout', () => {
    it('devrait détecter "timeout"', () => {
      expect(normalizeNetworkError('timeout')).toBe('NETWORK_TIMEOUT')
    })

    it('devrait détecter "Connection timeout"', () => {
      expect(normalizeNetworkError('Connection timeout')).toBe(
        'NETWORK_TIMEOUT'
      )
    })

    it('devrait détecter "TIMEOUT" en uppercase', () => {
      expect(normalizeNetworkError('REQUEST TIMEOUT')).toBe('NETWORK_TIMEOUT')
    })

    it('devrait détecter "Timed out"', () => {
      expect(normalizeNetworkError('Timed out')).toBe('NETWORK_TIMEOUT')
    })

    it('devrait détecter NETWORK_TIMEOUT (déjà normalisé)', () => {
      expect(normalizeNetworkError('NETWORK_TIMEOUT')).toBe('NETWORK_TIMEOUT')
    })

    it('devrait prioriser NETWORK_ERROR sur timeout pour ETIMEDOUT', () => {
      // ETIMEDOUT contient "timeout" mais doit matcher EN PREMIER dans la liste
      expect(normalizeNetworkError('ETIMEDOUT')).toBe('NETWORK_ERROR')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // normalizeNetworkError — types d'entrée
  // ═══════════════════════════════════════════════════════════════════

  describe('normalizeNetworkError — types d\'entrée', () => {
    it('devrait accepter une string', () => {
      expect(normalizeNetworkError('ENOTFOUND')).toBe('NETWORK_ERROR')
    })

    it('devrait accepter une Error', () => {
      expect(normalizeNetworkError(new Error('ENOTFOUND'))).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait accepter un objet avec .message', () => {
      expect(normalizeNetworkError({ message: 'ENOTFOUND' })).toBe(
        'NETWORK_ERROR'
      )
    })

    it('devrait accepter un objet sans .message (fallback String)', () => {
      expect(normalizeNetworkError({ code: 'ENOTFOUND' })).toBeNull()
    })

    it('devrait gérer un objet avec .message non-string', () => {
      expect(normalizeNetworkError({ message: 42 })).toBeNull()
    })

    it('devrait être insensible à la casse', () => {
      expect(normalizeNetworkError('enotfound')).toBe('NETWORK_ERROR')
      expect(normalizeNetworkError('EnOtFoUnD')).toBe('NETWORK_ERROR')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // isNetworkError
  // ═══════════════════════════════════════════════════════════════════

  describe('isNetworkError', () => {
    it('devrait retourner true pour une erreur réseau', () => {
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true)
      expect(isNetworkError('timeout')).toBe(true)
    })

    it('devrait retourner false pour une erreur non-réseau', () => {
      expect(isNetworkError(new Error('boom'))).toBe(false)
      expect(isNetworkError('file not found')).toBe(false)
    })

    it('devrait retourner false pour null', () => {
      expect(isNetworkError(null)).toBe(false)
    })

    it('devrait retourner false pour undefined', () => {
      expect(isNetworkError(undefined)).toBe(false)
    })
  })
})