import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import TutorialOverlay from "@shared/components/ui/TutorialOverlay";

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        tutorialSkip: "Passer",
        tutorialNext: "Suivant",
        tutorialFinish: "Terminer",
        tutorialPreparing: "Préparation...",
      };
      return translations[key] || key;
    },
    currentLang: "fr",
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}));

vi.mock("@shared/utils/appStorage", () => ({
  setItem: vi.fn().mockResolvedValue(),
}));

vi.mock("@shared/utils/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));

// ─── Helper : clique "trusted" via les props React ──────────────────────
// ⚠️ jsdom ne permet pas d'override `isTrusted` (getter read-only).
// On accède aux props React directement stockées sur le DOM node
// pour contourner le garde-fou anti-clic-programmatique du composant.
function trustedClick(element) {
  if (!element) return;
  const propsKey = Object.keys(element).find((k) =>
    k.startsWith("__reactProps$"),
  );
  if (!propsKey) return;
  const props = element[propsKey];
  if (props?.onClick) {
    act(() => {
      props.onClick({ isTrusted: true });
    });
  }
}

describe("TutorialOverlay", () => {
  // Steps SANS target → bulle centrée instantanément (pas de calcul DOM)
  const simpleSteps = [
    {
      id: "s1",
      title: "Étape 1",
      description: "Description 1",
      icon: "📖",
      hint: "Hint 1",
    },
    { id: "s2", title: "Étape 2", description: "Description 2", icon: "⭐" },
  ];

  const defaultProps = {
    steps: simpleSteps,
    currentStep: 0,
    onNext: vi.fn(),
    onSkip: vi.fn(),
    onComplete: vi.fn(),
    isOpen: true,
    pageId: "test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderOverlay = async (props = {}) => {
    const merged = { ...defaultProps, ...props };
    const result = render(<TutorialOverlay {...merged} />);

    // ✅ Le composant retombe à steps[0] si currentStep hors limites
    const stepIndex =
      merged.currentStep >= 0 && merged.currentStep < simpleSteps.length
        ? merged.currentStep
        : 0;

    const expectedTitle = simpleSteps[stepIndex].title;

    await waitFor(
      () => {
        expect(document.body.textContent).toContain(expectedTitle);
      },
      { timeout: 2000 },
    );
    return result;
  };

  // ─── RENDU CONDITIONNEL ───────────────────────────────────────────────

  it("ne devrait rien rendre si isOpen=false", () => {
    const { container } = render(
      <TutorialOverlay {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("devrait rendre même si steps est vide (retourne null)", () => {
    const { container } = render(
      <TutorialOverlay {...defaultProps} steps={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // ─── CONTENU DE L'ÉTAPE ───────────────────────────────────────────────

  it("devrait afficher le titre de l'étape", async () => {
    await renderOverlay();
    expect(screen.getByText("Étape 1")).toBeInTheDocument();
  });

  it("devrait afficher la description", async () => {
    await renderOverlay();
    expect(screen.getByText("Description 1")).toBeInTheDocument();
  });

  it("devrait afficher le hint si présent", async () => {
    await renderOverlay();
    expect(screen.getByText("Hint 1")).toBeInTheDocument();
  });

  it("devrait afficher l'icône de l'étape", async () => {
    await renderOverlay();
    expect(screen.getByText("📖")).toBeInTheDocument();
  });

  // ─── BOUTONS ──────────────────────────────────────────────────────────

  it('devrait afficher le bouton "Passer"', async () => {
    await renderOverlay();
    expect(screen.getByText("Passer")).toBeInTheDocument();
  });

  it('devrait afficher "Suivant" pour les étapes intermédiaires', async () => {
    await renderOverlay();
    expect(screen.getByText("Suivant")).toBeInTheDocument();
  });

  it('devrait afficher "Terminer" à la dernière étape', async () => {
    await renderOverlay({ currentStep: 1 });
    expect(screen.getByText("Terminer")).toBeInTheDocument();
  });

  // ─── NAVIGATION ───────────────────────────────────────────────────────

  it('devrait appeler onNext au clic sur "Suivant"', async () => {
    const onNext = vi.fn();
    await renderOverlay({ onNext });

    trustedClick(screen.getByText("Suivant"));

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  it('devrait appeler onSkip au clic sur "Passer"', async () => {
    const onSkip = vi.fn();
    await renderOverlay({ onSkip });

    trustedClick(screen.getByText("Passer"));

    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  // ─── CONTENU DYNAMIQUE ────────────────────────────────────────────────

  it("devrait mettre à jour le contenu si currentStep change", async () => {
    const { rerender } = await renderOverlay();

    expect(screen.getByText("Étape 1")).toBeInTheDocument();

    await act(async () => {
      rerender(<TutorialOverlay {...defaultProps} currentStep={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Étape 2")).toBeInTheDocument();
    });
  });

  // ─── CAS LIMITE ───────────────────────────────────────────────────────

  it("devrait basculer vers steps[0] si currentStep hors limites", async () => {
    // steps a 2 éléments, currentStep=99 → fallback à steps[0]
    await renderOverlay({ currentStep: 99 });
    expect(screen.getByText("Étape 1")).toBeInTheDocument();
  });
});
