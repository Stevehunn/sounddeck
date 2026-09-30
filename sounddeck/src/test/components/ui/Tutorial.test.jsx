import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import Tutorial from '@shared/components/ui/Tutorial'

// ✅ vi.hoisted : défini AVANT les vi.mock (hoisting-safe)
const { simpleSteps } = vi.hoisted(() => ({
  simpleSteps: () => [
    { id: 's1', title: 'Step 1', description: 'Desc 1' },
    { id: 's2', title: 'Step 2', description: 'Desc 2' },
  ],
}))

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        loading: 'Chargement...',
        close: 'Fermer',
        tutorialNotFound: 'Tutoriel non disponible pour cette page',
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

// ─── Mock setItem ───────────────────────────────────────────────────────
vi.mock('@shared/utils/appStorage', () => ({
  setItem: vi.fn().mockResolvedValue(),
}))

// ─── Mock TutorialOverlay (rendu simple pour isoler la logique) ─────────
vi.mock('@shared/components/ui/TutorialOverlay', () => ({
  default: ({ steps, currentStep, onNext, onSkip, pageId }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': 'mock-overlay' },
      React.createElement('div', { 'data-testid': 'overlay-pageId' }, pageId),
      React.createElement('div', { 'data-testid': 'overlay-step' }, currentStep),
      React.createElement('div', { 'data-testid': 'overlay-step-count' }, steps.length),
      React.createElement('button', { 'data-testid': 'overlay-next', onClick: onNext }, 'Next'),
      React.createElement('button', { 'data-testid': 'overlay-skip', onClick: onSkip }, 'Skip')
    )
  },
}))

// ─── Mock tous les tutorialSteps ────────────────────────────────────────
vi.mock('@features/home/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/editor/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/sequencer/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/trimmer/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/options/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/stats/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@features/presentation/tutorialSteps', () => ({
  TUTORIAL_STEPS: simpleSteps,
  cleanupTutorialFavorites: vi.fn(),
}))
vi.mock('@features/emoji/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))
vi.mock('@plugins/myinstants/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))

const mockStartYoutubeTutorial = vi.fn()
const mockCleanupYoutubeTutorial = vi.fn()
const mockFinishYoutubeTutorial = vi.fn()

vi.mock('@plugins/youtube/tutorialSteps', () => ({
  TUTORIAL_STEPS: simpleSteps,
  startYoutubeTutorial: (...args) => mockStartYoutubeTutorial(...args),
  cleanupYoutubeTutorial: (...args) => mockCleanupYoutubeTutorial(...args),
  finishYoutubeTutorial: (...args) => mockFinishYoutubeTutorial(...args),
}))

vi.mock('@plugins/emoji/tutorialSteps', () => ({ TUTORIAL_STEPS: simpleSteps }))

// ─── Helper : attend que le composant passe à isReady ───────────────────
const waitForReady = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
  })
}

describe('Tutorial', () => {
  const defaultProps = {
    pageId: 'home',
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── ÉTAT INITIAL (LOADING) ──────────────────────────────────────────

  it('devrait afficher un état "loading" avant isReady', () => {
    render(<Tutorial {...defaultProps} />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('devrait NE PAS afficher l\'overlay pendant le loading', () => {
    render(<Tutorial {...defaultProps} />)
    expect(screen.queryByTestId('mock-overlay')).not.toBeInTheDocument()
  })

  // ─── RENDU APRÈS LOADING ─────────────────────────────────────────────

  it('devrait afficher l\'overlay après le délai de 500ms', async () => {
    render(<Tutorial {...defaultProps} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('mock-overlay')).toBeInTheDocument()
    })
  })

  it('devrait passer pageId à TutorialOverlay', async () => {
    render(<Tutorial {...defaultProps} pageId="editor" />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-pageId').textContent).toBe('editor')
    })
  })

  it('devrait passer les steps résolus', async () => {
    render(<Tutorial {...defaultProps} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-step-count').textContent).toBe('2')
    })
  })

  // ─── PAGE SANS TUTORIEL ──────────────────────────────────────────────

  it('devrait afficher "tutoriel non disponible" pour la page guide', async () => {
    render(<Tutorial {...defaultProps} pageId="guide" />)
    await waitForReady()

    await waitFor(() => {
      expect(
        screen.getByText('Tutoriel non disponible pour cette page')
      ).toBeInTheDocument()
    })
  })

  it('devrait afficher le bouton Fermer pour une page sans tutoriel', async () => {
    render(<Tutorial {...defaultProps} pageId="guide" />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByText('Fermer')).toBeInTheDocument()
    })
  })

  it('devrait appeler onComplete au clic sur Fermer (page sans tutoriel)', async () => {
    const onComplete = vi.fn()
    render(<Tutorial {...defaultProps} pageId="guide" onComplete={onComplete} />)
    await waitForReady()

    await waitFor(() => {
      fireEvent.click(screen.getByText('Fermer'))
    })

    expect(onComplete).toHaveBeenCalled()
  })

  // ─── NAVIGATION ──────────────────────────────────────────────────────

  it('devrait incrémenter currentStep au clic sur Next', async () => {
    render(<Tutorial {...defaultProps} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-step').textContent).toBe('0')
    })

    fireEvent.click(screen.getByTestId('overlay-next'))

    expect(screen.getByTestId('overlay-step').textContent).toBe('1')
  })

  it('devrait appeler onComplete à la fin (dernière étape + Next)', async () => {
    const onComplete = vi.fn()
    render(<Tutorial {...defaultProps} onComplete={onComplete} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-step').textContent).toBe('0')
    })

    // Étape 1 → 2 (0 → 1)
    fireEvent.click(screen.getByTestId('overlay-next'))
    // Étape 2 → fin (1 → complete)
    await act(async () => {
      fireEvent.click(screen.getByTestId('overlay-next'))
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('devrait appeler onComplete au clic sur Skip', async () => {
    const onComplete = vi.fn()
    render(<Tutorial {...defaultProps} onComplete={onComplete} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-skip')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('overlay-skip'))
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  // ─── YOUTUBE SPÉCIAL ─────────────────────────────────────────────────

  it('devrait appeler startYoutubeTutorial pour pageId="youtube"', async () => {
    render(<Tutorial {...defaultProps} pageId="youtube" />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(mockStartYoutubeTutorial).toHaveBeenCalled()
  })

  it('devrait appeler finishYoutubeTutorial au Skip si pageId="youtube"', async () => {
    const onComplete = vi.fn()
    render(<Tutorial pageId="youtube" onComplete={onComplete} />)
    await waitForReady()

    await waitFor(() => {
      expect(screen.getByTestId('overlay-skip')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('overlay-skip'))
    })

    await waitFor(() => {
      expect(mockFinishYoutubeTutorial).toHaveBeenCalled()
    })
  })
})