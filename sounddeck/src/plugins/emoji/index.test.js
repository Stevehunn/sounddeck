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
import { logInfo } from '@shared/utils/logger'

describe('EmojiPlugin (index.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait exposer les métadonnées du plugin', () => {
    expect(EmojiPlugin.id).toBe('emoji')
    expect(EmojiPlugin.name).toBeTruthy()
    expect(EmojiPlugin.nameKey).toBe('pluginNameEmoji')
    expect(EmojiPlugin.version).toBe('1.0.0')
  })

  it('devrait avoir une page "emoji-discover"', () => {
    expect(EmojiPlugin.pages).toHaveLength(1)
    const page = EmojiPlugin.pages[0]
    expect(page.id).toBe('emoji-discover')
    expect(page.icon).toBe('ti-mood-smile-beam')
    expect(page.sidebarVisible).toBe(false)
  })

  it('init/destroy ne devraient pas throw', () => {
    expect(() => EmojiPlugin.init({}, {})).not.toThrow()
    expect(() => EmojiPlugin.destroy()).not.toThrow()
  })
})