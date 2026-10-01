import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('./YouTube.jsx', () => ({
  default: () => null,
}))

import YouTubePlugin from './index'
import { logInfo } from '@shared/utils/logger'

describe('YouTubePlugin (index.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait exposer les métadonnées du plugin', () => {
    expect(YouTubePlugin.id).toBe('youtube')
    expect(YouTubePlugin.name).toBe('YouTube Import')
    expect(YouTubePlugin.nameKey).toBe('pluginNameYoutube')
    expect(YouTubePlugin.version).toBe('1.0.0')
    expect(YouTubePlugin.author).toBeTruthy()
  })

  it('devrait avoir une page "youtube"', () => {
    expect(YouTubePlugin.pages).toHaveLength(1)
    const page = YouTubePlugin.pages[0]
    expect(page.id).toBe('youtube')
    expect(page.labelKey).toBe('youtubeTitle')
    expect(page.icon).toBe('ti-brand-youtube')
    expect(page.component).toBeDefined()
    expect(page.group).toBe('navigation')
    expect(page.visible).toBe(true)
  })

  it('init devrait appeler logInfo', () => {
    const fakeStore = {}
    const fakeManager = {}
    YouTubePlugin.init(fakeStore, fakeManager)
    expect(logInfo).toHaveBeenCalledWith('YouTubePlugin', expect.any(String))
  })

  it('destroy devrait appeler logInfo', () => {
    YouTubePlugin.destroy()
    expect(logInfo).toHaveBeenCalledWith('YouTubePlugin', expect.any(String))
  })
})