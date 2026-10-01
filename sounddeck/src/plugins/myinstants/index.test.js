import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('./Discover.jsx', () => ({
  default: () => null,
}))

import MyInstantsPlugin from './index'
import { logInfo } from '@shared/utils/logger'

describe('MyInstantsPlugin (index.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait exposer les métadonnées du plugin', () => {
    expect(MyInstantsPlugin.id).toBe('myinstants')
    expect(MyInstantsPlugin.name).toBeTruthy()
    expect(MyInstantsPlugin.nameKey).toBe('pluginNameMyInstants')
    expect(MyInstantsPlugin.version).toBe('1.0.0')
  })

  it('devrait avoir une page "discover"', () => {
    expect(MyInstantsPlugin.pages).toHaveLength(1)
    const page = MyInstantsPlugin.pages[0]
    expect(page.id).toBe('discover')
    expect(page.labelKey).toBe('myinstantsTitle')
    expect(page.icon).toBe('ti-compass')
    expect(page.group).toBe('navigation')
  })

  it('init devrait appeler logInfo', () => {
    MyInstantsPlugin.init({}, {})
    expect(logInfo).toHaveBeenCalled()
  })

  it('destroy devrait appeler logInfo', () => {
    MyInstantsPlugin.destroy()
    expect(logInfo).toHaveBeenCalled()
  })
})