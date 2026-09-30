import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSectionObserver } from '@features/options/hooks/useSectionObserver'

// ─── Mock SECTIONS (3 sections simples) ─────────────────────────────────
vi.mock('@features/options/constants', () => ({
  SECTIONS: [
    { id: 'appearance', icon: 'ti-palette', labelKey: 'optionsAppearance' },
    { id: 'audio', icon: 'ti-volume', labelKey: 'optionsAudio' },
    { id: 'backup', icon: 'ti-cloud', labelKey: 'optionsBackup' },
  ],
}))

// ─── Mock IntersectionObserver constructible ────────────────────────────
let observerInstances = []

class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.observed = []
    this.disconnect = vi.fn()
    this.observe = vi.fn((el) => this.observed.push(el))
    this.unobserve = vi.fn()
    observerInstances.push(this)
  }
}

// ✅ Helper : crée un fake DOM element avec scrollIntoView
const createFakeRef = (sectionId) => ({
  dataset: { section: sectionId },
  scrollIntoView: vi.fn(),
})

describe('useSectionObserver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    observerInstances = []
    window.IntersectionObserver = MockIntersectionObserver
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // Helper : peuple les refs + avance les timers pour créer l'observer
  const setupObserver = async (result) => {
    // Peupler les refs AVANT que le timer 200ms ne tire
    result.current.sectionRefs.current = {
      appearance: createFakeRef('appearance'),
      audio: createFakeRef('audio'),
      backup: createFakeRef('backup'),
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
  }

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  it('devrait retourner activeSection="appearance" par défaut', () => {
    const { result } = renderHook(() => useSectionObserver())
    expect(result.current.activeSection).toBe('appearance')
  })

  it('devrait exposer sectionRefs et scrollToSection', () => {
    const { result } = renderHook(() => useSectionObserver())
    expect(result.current.sectionRefs).toBeDefined()
    expect(typeof result.current.scrollToSection).toBe('function')
  })

  it('sectionRefs.current devrait être un objet vide au démarrage', () => {
    const { result } = renderHook(() => useSectionObserver())
    expect(result.current.sectionRefs.current).toEqual({})
  })

  // ─── SCROLL TO SECTION ───────────────────────────────────────────────

  it('scrollToSection devrait mettre à jour activeSection', () => {
    const { result } = renderHook(() => useSectionObserver())

    result.current.sectionRefs.current = {
      appearance: createFakeRef('appearance'),
      audio: createFakeRef('audio'),
      backup: createFakeRef('backup'),
    }

    act(() => {
      result.current.scrollToSection('audio')
    })

    expect(result.current.activeSection).toBe('audio')
  })

  it('scrollToSection devrait appeler scrollIntoView sur la ref', () => {
    const { result } = renderHook(() => useSectionObserver())

    const fakeRef = createFakeRef('audio')
    result.current.sectionRefs.current = { audio: fakeRef }

    act(() => {
      result.current.scrollToSection('audio')
    })

    expect(fakeRef.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('scrollToSection ne devrait rien faire si la section n\'existe pas', () => {
    const { result } = renderHook(() => useSectionObserver())

    act(() => {
      result.current.scrollToSection('unknown-section')
    })

    expect(result.current.activeSection).toBe('appearance')
  })

  it('scrollToSection devrait bloquer le reset de activeSection pendant 800ms', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    // Déclenche un scroll (les refs sont peuplées avec scrollIntoView)
    act(() => {
      result.current.scrollToSection('audio')
    })
    expect(result.current.activeSection).toBe('audio')

    // Un callback IO pendant le scroll ne doit PAS changer activeSection
    const observer = observerInstances[0]
    act(() => {
      observer.callback([
        {
          intersectionRatio: 0.9,
          target: { dataset: { section: 'backup' } },
        },
      ])
    })
    expect(result.current.activeSection).toBe('audio')

    // Après 800ms → déblocage
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    // Maintenant un callback IO PEUT changer activeSection
    act(() => {
      observer.callback([
        {
          intersectionRatio: 0.9,
          target: { dataset: { section: 'backup' } },
        },
      ])
    })
    expect(result.current.activeSection).toBe('backup')
  })

  // ─── INTERSECTION OBSERVER ───────────────────────────────────────────

  it('devrait créer un IntersectionObserver après setup', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    expect(observerInstances.length).toBeGreaterThanOrEqual(1)
  })

  it('l\'observer devrait avoir les thresholds corrects', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    const observer = observerInstances[0]
    expect(observer.options.threshold).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
    expect(observer.options.rootMargin).toBe('-60px 0px -40% 0px')
  })

  it('le callback IO devrait changer activeSection sur ratio > 0.2', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    const observer = observerInstances[0]
    act(() => {
      observer.callback([
        {
          intersectionRatio: 0.5,
          target: { dataset: { section: 'audio' } },
        },
      ])
    })

    expect(result.current.activeSection).toBe('audio')
  })

  it('le callback IO ne devrait PAS changer si ratio <= 0.2', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    const observer = observerInstances[0]
    act(() => {
      observer.callback([
        {
          intersectionRatio: 0.1,
          target: { dataset: { section: 'audio' } },
        },
      ])
    })

    expect(result.current.activeSection).toBe('appearance')
  })

  it('le callback IO devrait prendre le ratio MAX parmi les entries', async () => {
    const { result } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    const observer = observerInstances[0]
    act(() => {
      observer.callback([
        { intersectionRatio: 0.3, target: { dataset: { section: 'audio' } } },
        { intersectionRatio: 0.7, target: { dataset: { section: 'backup' } } },
        { intersectionRatio: 0.5, target: { dataset: { section: 'appearance' } } },
      ])
    })

    expect(result.current.activeSection).toBe('backup')
  })

  // ─── CLEANUP ─────────────────────────────────────────────────────────

  it('devrait déconnecter l\'observer au unmount', async () => {
    const { result, unmount } = renderHook(() => useSectionObserver())
    await setupObserver(result)

    const observer = observerInstances[0]
    unmount()

    expect(observer.disconnect).toHaveBeenCalled()
  })
})