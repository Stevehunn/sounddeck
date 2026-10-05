// src/test/components/TutorialOverlay.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
const { mockSetItem, mockLogError } = vi.hoisted(() => ({
  mockSetItem: vi.fn().mockResolvedValue(undefined),
  mockLogError: vi.fn(),
}))

vi.mock('@shared/utils/appStorage', () => ({
  setItem: mockSetItem,
}))

vi.mock('@shared/utils/logger', () => ({
  logError: mockLogError,
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

import TutorialOverlay from '@shared/components/ui/TutorialOverlay'

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeSteps = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: `step${i}`,
    icon: '🎯',
    title: `Étape ${i + 1}`,
    description: `Description de l'étape ${i + 1}`,
    hint: `Astuce ${i + 1}`,
    target: null,
    fallbackTarget: null,
  }))

const defaultProps = (overrides = {}) => ({
  steps: makeSteps(3),
  currentStep: 0,
  onNext: vi.fn(),
  onSkip: vi.fn(),
  onComplete: vi.fn(),
  isOpen: true,
  pageId: 'test',
  ...overrides,
})

beforeEach(() => {
  mockSetItem.mockReset().mockResolvedValue(undefined)
  mockLogError.mockReset()

  global.requestAnimationFrame = vi.fn((cb) => {
    cb()
    return 1
  })
  global.cancelAnimationFrame = vi.fn()

  Element.prototype.getBoundingClientRect = function () {
    return {
      top: 100, left: 100, width: 200, height: 50,
      right: 300, bottom: 150,
      x: 100, y: 100,
    }
  }
})

afterEach(() => {
  vi.useRealTimers()
})

const renderOverlay = (props = {}) => render(<TutorialOverlay {...defaultProps(props)} />)

// ═══════════════════════════════════════════════════════════════════════
// RENDU CONDITIONNEL
// ═══════════════════════════════════════════════════════════════════════
describe('TutorialOverlay > Rendu conditionnel', () => {
  it('retourne null si isOpen=false', () => {
    const { container } = renderOverlay({ isOpen: false })
    expect(container.firstChild).toBeNull()
  })

  it('retourne null si steps vide', () => {
    const { container } = renderOverlay({ steps: [] })
    expect(container.firstChild).toBeNull()
  })

  it('rend le portail dans document.body si isOpen + steps', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(document.querySelector('body > div')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// BULLE + CONTENU
// ═══════════════════════════════════════════════════════════════════════
describe('TutorialOverlay > Bulle', () => {
  it('affiche le titre de l\'étape', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText('Étape 1')).toBeInTheDocument()
    })
  })

  it('affiche la description', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText("Description de l'étape 1")).toBeInTheDocument()
    })
  })

  it('affiche l\'astuce (hint)', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText('Astuce 1')).toBeInTheDocument()
    })
  })

  it('affiche l\'icône de l\'étape', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText('🎯')).toBeInTheDocument()
    })
  })

  it('bouton "Suivant" pour étape non-dernière', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText(/Suivant|tutorialNext/)).toBeInTheDocument()
    })
  })

  it('bouton "Terminer" pour dernière étape', async () => {
    renderOverlay({ currentStep: 2 })
    await waitFor(() => {
      expect(screen.getByText(/Terminer|tutorialFinish/)).toBeInTheDocument()
    })
  })

  it('bouton "Passer" toujours présent', async () => {
    renderOverlay()
    await waitFor(() => {
      expect(screen.getByText(/Passer|tutorialSkip/)).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ACTIONS — Anti-spam isTrusted
// ═══════════════════════════════════════════════════════════════════════
describe('TutorialOverlay > Actions (anti-spam isTrusted)', () => {
  // ⚠️ Le composant fait `if (!e.isTrusted) return` pour bloquer les clics
  //    synthétiques (anti-spam, anti-double-click).
  //
  //    Conséquence en test : `fireEvent.click()` génère TOUJOURS un événement
  //    avec isTrusted=false → le clic est BLOQUÉ.
  //
  //    On ne PEUT PAS forcer isTrusted=true en jsdom : la propriété est
  //    non-configurable sur MouseEvent, `Object.defineProperty` échoue.
  //
  //    → On teste donc uniquement le comportement BLOQUANT (qui est le
  //      comportement voulu du composant).

  it('clic "Suivant" non-trusted → BLOQUÉ', async () => {
    const onNext = vi.fn()
    renderOverlay({ onNext })
    await waitFor(() => {
      expect(screen.getByText(/Suivant|tutorialNext/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/Suivant|tutorialNext/).closest('button'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('clic "Passer" non-trusted → BLOQUÉ', async () => {
    const onSkip = vi.fn()
    const onComplete = vi.fn()
    renderOverlay({ onSkip, onComplete })
    await waitFor(() => {
      expect(screen.getByText(/Passer|tutorialSkip/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/Passer|tutorialSkip/).closest('button'))
    expect(onSkip).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
    expect(mockSetItem).not.toHaveBeenCalled()
  })

  it('plusieurs clics consécutifs → toujours BLOQUÉS', async () => {
    const onNext = vi.fn()
    renderOverlay({ onNext })
    await waitFor(() => {
      expect(screen.getByText(/Suivant|tutorialNext/)).toBeInTheDocument()
    })
    const btn = screen.getByText(/Suivant|tutorialNext/).closest('button')
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onNext).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// DOTS DE PROGRESSION
// ═══════════════════════════════════════════════════════════════════════
describe('TutorialOverlay > Progression', () => {
  it('affiche N dots pour N étapes', async () => {
    renderOverlay({ steps: makeSteps(5) })
    // Les dots sont rendus dans document.body via createPortal
    await waitFor(() => {
      const dots = Array.from(document.body.querySelectorAll('div')).filter(
        (d) => d.style.width === '6px' && d.style.height === '6px'
      )
      expect(dots.length).toBeGreaterThanOrEqual(5)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// onShow callback
// ═══════════════════════════════════════════════════════════════════════
describe('TutorialOverlay > onShow', () => {
  it('appelle step.onShow quand la bulle apparaît', async () => {
    const onShow = vi.fn()
    const steps = makeSteps(3)
    steps[0].onShow = onShow

    renderOverlay({ steps })
    await waitFor(() => {
      expect(onShow).toHaveBeenCalled()
    })
  })

  it('erreur dans onShow est loggée sans crash', async () => {
    const steps = makeSteps(3)
    steps[0].onShow = () => { throw new Error('boom') }

    renderOverlay({ steps })
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled()
    })
  })
})