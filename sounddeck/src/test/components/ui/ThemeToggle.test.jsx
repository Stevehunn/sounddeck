import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ThemeToggle from "@shared/components/ui/ThemeToggle";

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        themeAutoOn: "Auto ON",
        themeAutoOff: "Auto OFF",
        themeNight: "Nuit",
        themeDay: "Jour",
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

// ─── Helper : flush les microtasks + timers sous fake timers ────────────
// ⚠️ NE PAS utiliser waitFor avec fake timers → boucle infinie
async function flushAll(ms = 100) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("ThemeToggle", () => {
  const defaultProps = {
    currentTheme: "dark",
    onThemeChange: vi.fn(),
    lang: "fr",
  };

  let storeMock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T14:00:00"));

    storeMock = {
      storeGet: vi.fn().mockResolvedValue(false),
      storeSet: vi.fn().mockResolvedValue(),
    };
    window.electronAPI = storeMock;

    // ✅ FIX : reset les mocks localStorage (ils persistent entre tests)
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
    localStorage.removeItem.mockReset();
    localStorage.clear.mockReset();

    // Par défaut, getItem retourne null
    localStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderToggle = async (props = {}) => {
    let result;
    await act(async () => {
      result = render(<ThemeToggle {...defaultProps} {...props} />);
    });
    // Flush le useEffect init (async storeGet → setState)
    await flushAll(10);
    return result;
  };

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre le bouton avec le label "Auto OFF" par défaut', async () => {
    await renderToggle();
    expect(screen.getByText("Auto OFF")).toBeInTheDocument();
  });

  it("devrait afficher l'emoji du jour (☀️) à 14h", async () => {
    await renderToggle();
    expect(screen.getByText("☀️")).toBeInTheDocument();
  });

  // ─── INITIALISATION ───────────────────────────────────────────────────

  it("devrait lire le store au montage", async () => {
    await renderToggle();
    expect(storeMock.storeGet).toHaveBeenCalledWith("autoTheme");
  });

  it("devrait activer autoTheme si le store retourne true", async () => {
    storeMock.storeGet.mockResolvedValue(true);
    await renderToggle();

    expect(screen.getByText("Auto ON")).toBeInTheDocument();
  });

  it("devrait migrer depuis localStorage si store vide", async () => {
    storeMock.storeGet.mockResolvedValue(null);

    // ✅ FIX : le mock localStorage du setup ne persiste pas.
    // On force getItem à retourner 'true' directement.
    localStorage.getItem.mockImplementation((key) => {
      if (key === "sounddeck-auto-theme") return "true";
      return null;
    });

    await renderToggle();

    expect(storeMock.storeSet).toHaveBeenCalledWith("autoTheme", true);
  });

  it("ne devrait PAS relire le store au 2e rendu (initializedRef)", async () => {
    const { rerender } = await renderToggle();
    const callsBefore = storeMock.storeGet.mock.calls.length;

    await act(async () => {
      rerender(<ThemeToggle {...defaultProps} />);
    });
    await flushAll(10);

    expect(storeMock.storeGet.mock.calls.length).toBe(callsBefore);
  });

  // ─── TOGGLE ───────────────────────────────────────────────────────────

  it("devrait activer autoTheme au clic", async () => {
    await renderToggle();
    const button = screen.getByText("Auto OFF").closest("button");

    await act(async () => {
      fireEvent.click(button);
    });
    await flushAll(10);

    expect(screen.getByText("Auto ON")).toBeInTheDocument();
  });

  it("devrait appeler storeSet au toggle", async () => {
    await renderToggle();
    const button = screen.getByText("Auto OFF").closest("button");

    await act(async () => {
      fireEvent.click(button);
    });
    await flushAll(10);

    expect(storeMock.storeSet).toHaveBeenCalledWith("autoTheme", true);
  });

  it('devrait appeler onThemeChange avec "light" si jour (14h) après activation', async () => {
    const onThemeChange = vi.fn();
    await renderToggle({ onThemeChange });

    const button = screen.getByText("Auto OFF").closest("button");

    await act(async () => {
      fireEvent.click(button);
    });
    await flushAll(10);

    expect(onThemeChange).toHaveBeenCalledWith("light");
  });

  it('devrait appeler onThemeChange avec "dark" si nuit (22h) après activation', async () => {
    vi.setSystemTime(new Date("2025-01-15T22:00:00"));
    const onThemeChange = vi.fn();
    await renderToggle({ onThemeChange });

    const button = screen.getByText("Auto OFF").closest("button");

    await act(async () => {
      fireEvent.click(button);
    });
    await flushAll(10);

    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("devrait repasser Auto OFF au 2e clic", async () => {
    await renderToggle();
    const button = screen.getByText("Auto OFF").closest("button");

    // Active
    await act(async () => {
      fireEvent.click(button);
    });
    await flushAll(10);
    expect(screen.getByText("Auto ON")).toBeInTheDocument();

    // Désactive
    await act(async () => {
      fireEvent.click(screen.getByText("Auto ON").closest("button"));
    });
    await flushAll(10);
    expect(screen.getByText("Auto OFF")).toBeInTheDocument();
  });

  // ─── BADGE NUIT/JOUR ──────────────────────────────────────────────────

  it('devrait afficher le badge "☀️ Jour" quand actif et jour', async () => {
    storeMock.storeGet.mockResolvedValue(true);
    await renderToggle();

    expect(screen.getByText(/Jour/)).toBeInTheDocument();
  });

  it('devrait afficher le badge "🌙 Nuit" quand actif et nuit', async () => {
    vi.setSystemTime(new Date("2025-01-15T22:00:00"));
    storeMock.storeGet.mockResolvedValue(true);
    await renderToggle();

    expect(screen.getByText(/Nuit/)).toBeInTheDocument();
  });

  it("ne devrait PAS afficher le badge si autoTheme désactivé", async () => {
    await renderToggle();
    expect(screen.queryByText(/Jour|Nuit/)).not.toBeInTheDocument();
  });

  // ─── ROBUSTESSE ───────────────────────────────────────────────────────

  it("devrait gérer l'absence de window.electronAPI", async () => {
    delete window.electronAPI;
    await renderToggle();
    expect(screen.getByText("Auto OFF")).toBeInTheDocument();
  });

  it("devrait gérer une erreur de storeGet sans planter", async () => {
    storeMock.storeGet.mockRejectedValue(new Error("store error"));
    await renderToggle();
    expect(screen.getByText("Auto OFF")).toBeInTheDocument();
  });
});
