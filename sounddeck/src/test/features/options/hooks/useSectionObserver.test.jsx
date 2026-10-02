import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSectionObserver } from "@features/options/hooks/useSectionObserver";

// ─── Mock SECTIONS (déjà défini dans constants.js mais on maîtrise l'ordre) ───
vi.mock("@features/options/constants", () => ({
  SECTIONS: [{ id: "appearance" }, { id: "audio" }, { id: "shortcuts" }],
}));

// ✅ Mock global en CLASSE (constructible avec new)
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    this.root = null;
    this.rootMargin = options?.rootMargin || "";
    this.thresholds = options?.threshold || [];
  }
}

// Remplace le mock par défaut dans beforeEach
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  global.IntersectionObserver = MockIntersectionObserver;
});

describe("useSectionObserver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devrait démarrer avec activeSection="appearance"', () => {
    const { result } = renderHook(() => useSectionObserver());
    expect(result.current.activeSection).toBe("appearance");
  });

  it("devrait exposer sectionRefs et scrollToSection", () => {
    const { result } = renderHook(() => useSectionObserver());
    expect(result.current.sectionRefs).toBeDefined();
    expect(result.current.sectionRefs.current).toEqual({});
    expect(typeof result.current.scrollToSection).toBe("function");
  });

  it("devrait créer un IntersectionObserver après le timer", async () => {
    const spy = vi.fn(MockIntersectionObserver);
    global.IntersectionObserver = spy;

    const { result } = renderHook(() => useSectionObserver());

    // ⚠️ Enregistre au moins un ref sinon le hook reboucle et n'appelle jamais l'observer
    result.current.sectionRefs.current.appearance =
      document.createElement("div");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(spy).toHaveBeenCalled();
  });

  it("ne devrait pas planter si aucun ref n'est enregistré", async () => {
    renderHook(() => useSectionObserver());

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Ne throw pas
    expect(true).toBe(true);
  });

  it("scrollToSection ne devrait rien faire pour un id inconnu", () => {
    const { result } = renderHook(() => useSectionObserver());

    expect(() => {
      act(() => {
        result.current.scrollToSection("unknown-section");
      });
    }).not.toThrow();
  });

  it("scrollToSection devrait appeler scrollIntoView sur le ref", () => {
    const { result } = renderHook(() => useSectionObserver());

    const scrollIntoView = vi.fn();
    result.current.sectionRefs.current.audio = { scrollIntoView };

    act(() => {
      result.current.scrollToSection("audio");
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("scrollToSection devrait mettre à jour activeSection", () => {
    const { result } = renderHook(() => useSectionObserver());

    result.current.sectionRefs.current.shortcuts = {
      scrollIntoView: vi.fn(),
    };

    act(() => {
      result.current.scrollToSection("shortcuts");
    });

    expect(result.current.activeSection).toBe("shortcuts");
  });

  it("devrait nettoyer l'observer au unmount", async () => {
    let lastInstance = null;
    class TrackedIO extends MockIntersectionObserver {
      constructor(...args) {
        super(...args);
        lastInstance = this;
      }
    }
    global.IntersectionObserver = TrackedIO;

    const { result, unmount } = renderHook(() => useSectionObserver());

    result.current.sectionRefs.current.appearance =
      document.createElement("div");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    unmount();
    expect(lastInstance.disconnect).toHaveBeenCalled();
  });
});
