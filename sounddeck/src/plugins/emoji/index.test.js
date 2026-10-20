/**
 * @file Tests for the Emoji Discovery plugin entry point.
 *
 * Verifies the plugin contract surface (metadata, page shape, lifecycle
 * hooks). The actual component behavior is tested separately in
 * `EmojiDiscover.test.jsx`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('./EmojiDiscover.jsx', () => ({
  default: () => null,
}))

import EmojiPlugin from './index'

describe('EmojiPlugin (index.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('metadata', () => {
    it('should expose the plugin metadata', () => {
      expect(EmojiPlugin.id).toBe('emoji')
      expect(EmojiPlugin.name).toBeTruthy()
      expect(EmojiPlugin.nameKey).toBe('pluginNameEmoji')
      expect(EmojiPlugin.version).toBe('1.0.0')
    })
  })

  describe('pages', () => {
    it('should have a single "emoji-discover" page', () => {
      expect(EmojiPlugin.pages).toHaveLength(1)
      const page = EmojiPlugin.pages[0]
      expect(page.id).toBe('emoji-discover')
      expect(page.icon).toBe('ti-mood-smile-beam')
      expect(page.sidebarVisible).toBe(false)
    })
  })

  describe('lifecycle', () => {
    it('init/destroy should not throw', () => {
      expect(() => EmojiPlugin.init({}, {})).not.toThrow()
      expect(() => EmojiPlugin.destroy()).not.toThrow()
    })
  })
})