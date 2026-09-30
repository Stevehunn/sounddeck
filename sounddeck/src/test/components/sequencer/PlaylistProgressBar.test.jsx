import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PlaylistProgressBar from "@features/sequencer/components/PlaylistProgressBar";

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        unknownSound: "Son inconnu",
        playing: "En cours de lecture...",
        remaining: "son(s) restant(s)",
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

// ─── Mock formatTime ────────────────────────────────────────────────────
vi.mock("@shared/utils/format", () => ({
  formatTime: vi.fn((s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }),
}));

describe("PlaylistProgressBar", () => {
  const sounds = [
    { id: "s1", name: "Sound 1" },
    { id: "s2", name: "Sound 2" },
    { id: "s3", name: "Sound 3" },
  ];

  const items = [
    { id: "i1", soundId: "s1", delay: 0 },
    { id: "i2", soundId: "s2", delay: 0 },
    { id: "i3", soundId: "s3", delay: 0 },
  ];

  const defaultProps = {
    playing: true,
    currentProgress: { current: 2, duration: 5, ratio: 0.4 },
    currentIdx: 1,
    items,
    sounds,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderBar = (props = {}) => {
    return render(<PlaylistProgressBar {...defaultProps} {...props} />);
  };

  // ─── RENDU CONDITIONNEL ──────────────────────────────────────────────

  it("ne devrait rien rendre si !playing", () => {
    const { container } = renderBar({ playing: false });
    expect(container.firstChild).toBeNull();
  });

  it("ne devrait rien rendre si !currentProgress", () => {
    const { container } = renderBar({ currentProgress: null });
    expect(container.firstChild).toBeNull();
  });

  it("devrait rendre la barre si playing + currentProgress", () => {
    renderBar();
    expect(document.querySelector(".sequencer-progress")).toBeInTheDocument();
  });

  // ─── NOM DU SON ──────────────────────────────────────────────────────

  it("devrait afficher le nom du son courant", () => {
    renderBar();
    // currentIdx=1 → Sound 2
    expect(screen.getByText("Sound 2")).toBeInTheDocument();
  });

  it('devrait afficher "unknownSound" si le son n\'existe pas', () => {
    renderBar({
      currentIdx: 0,
      items: [{ id: "i1", soundId: "unknown", delay: 0 }],
    });
    expect(screen.getByText("Son inconnu")).toBeInTheDocument();
  });

  it('devrait afficher "unknownSound" si currentItem est null', () => {
    renderBar({ currentIdx: 99 });
    expect(screen.getByText("Son inconnu")).toBeInTheDocument();
  });

  // ─── TIME FORMAT ─────────────────────────────────────────────────────

  it("devrait afficher le time formaté (current / duration)", () => {
    renderBar({
      currentProgress: { current: 65, duration: 120, ratio: 0.54 },
    });
    // 65s = 1:05, 120s = 2:00
    expect(screen.getByText(/1:05 \/ 2:00/)).toBeInTheDocument();
  });

  // ─── PROGRESS BAR ────────────────────────────────────────────────────

  it("devrait avoir la largeur de fill selon ratio", () => {
    renderBar({
      currentProgress: { current: 3, duration: 6, ratio: 0.5 },
    });
    const fill = document.querySelector(".progress-bar .fill");
    expect(fill.style.width).toBe("50%");
  });

  it('devrait avoir la classe "accent" sur le fill', () => {
    renderBar();
    const fill = document.querySelector(".progress-bar .fill");
    expect(fill.className).toContain("accent");
  });

  // ─── COMPTEURS ────────────────────────────────────────────────────────

  it('devrait afficher "playing X / Y"', () => {
    renderBar({ currentIdx: 1 });
    // "En cours de lecture... 2 / 3"
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it("devrait afficher le nombre de sons restants", () => {
    renderBar({ currentIdx: 0 });
    // currentIdx=0, items 3 → 2 restants
    expect(screen.getByText(/2 son\(s\) restant\(s\)/)).toBeInTheDocument();
  });

  it("devrait afficher 0 restants si dernier item", () => {
    renderBar({ currentIdx: 2 });
    expect(screen.getByText(/0 son\(s\) restant\(s\)/)).toBeInTheDocument();
  });

  it("ne devrait PAS afficher les compteurs si items.length === 0", () => {
    renderBar({ items: [], currentIdx: -1 });
    // Le compteur utilise le label "En cours de lecture..." → pas le time format
    expect(
      screen.queryByText(/En cours de lecture\.\.\./),
    ).not.toBeInTheDocument();
  });

  // ─── ICÔNE ────────────────────────────────────────────────────────────

  it("devrait afficher l'icône music", () => {
    renderBar();
    expect(document.querySelector(".ti-music")).toBeInTheDocument();
  });

  it("devrait afficher l'icône avec color accent", () => {
    renderBar();
    const icon = document.querySelector(".ti-music");
    expect(icon.style.color).toBe("var(--accent)");
  });
});
