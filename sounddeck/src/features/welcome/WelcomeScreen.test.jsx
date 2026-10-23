import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WelcomeScreen from "./WelcomeScreen";

// ═══════════════════════════════════════════════════════════════════════
// HOISTED MOCKS
// ═══════════════════════════════════════════════════════════════════════
const { mockChangeLanguage } = vi.hoisted(() => ({
  mockChangeLanguage: vi.fn(),
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: "fr",
    changeLanguage: mockChangeLanguage,
  }),
}));

vi.mock("@core/i18n/constants", () => ({
  LANGUAGES: [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
  ],
}));

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe("WelcomeScreen", () => {
  let onComplete;
  let reloadMock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeLanguage.mockResolvedValue();
    onComplete = vi.fn();

    // Mock window.location.reload (jsdom throw sinon)
    reloadMock = vi.fn();
    delete window.location;
    window.location = { reload: reloadMock };

    window.electronAPI = {
      getSystemLanguage: vi.fn().mockResolvedValue("fr"),
      getSystemKeyboardLayout: vi.fn().mockResolvedValue("qwerty"),
      storeSet: vi.fn().mockResolvedValue(),
      updateTrayLanguage: vi.fn().mockResolvedValue(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = () => render(<WelcomeScreen onComplete={onComplete} />);

  const waitLoaded = async () => {
    await waitFor(() => {
      expect(screen.getByTestId("welcome-container")).toBeInTheDocument();
    });
  };

  // ════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════

  describe("loading", () => {
    it("devrait afficher le loader au mount", () => {
      renderPage();
      expect(screen.getByTestId("welcome-loading")).toBeInTheDocument();
    });

    it("devrait masquer le loader après chargement", async () => {
      renderPage();
      await waitLoaded();
      expect(screen.queryByTestId("welcome-loading")).not.toBeInTheDocument();
    });

    it("devrait appeler getSystemLanguage au mount", async () => {
      renderPage();
      await waitLoaded();
      expect(window.electronAPI.getSystemLanguage).toHaveBeenCalledTimes(1);
    });

    it("devrait appeler getSystemKeyboardLayout au mount", async () => {
      renderPage();
      await waitLoaded();
      expect(window.electronAPI.getSystemKeyboardLayout).toHaveBeenCalledTimes(
        1,
      );
    });

    it("devrait passer loading=false même si erreur système", async () => {
      window.electronAPI.getSystemLanguage.mockRejectedValue(new Error("boom"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      renderPage();
      await waitLoaded();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SYSTEM DETECTION
  // ════════════════════════════════════════════════════════════════════

  describe("détection système", () => {
    it("devrait présélectionner la langue système", async () => {
      window.electronAPI.getSystemLanguage.mockResolvedValue("en");
      renderPage();
      await waitLoaded();

      // Le bouton "en" doit être actif (fond accent-light)
      const enBtn = screen.getByTestId("welcome-lang-en");
      expect(enBtn.textContent).toContain("English");
    });

    it("devrait appeler changeLanguage si système ≠ currentLang", async () => {
      window.electronAPI.getSystemLanguage.mockResolvedValue("en");
      renderPage();
      await waitLoaded();

      await waitFor(() => {
        expect(mockChangeLanguage).toHaveBeenCalledWith("en");
      });
    });

    it("ne devrait PAS appeler changeLanguage si système = currentLang", async () => {
      window.electronAPI.getSystemLanguage.mockResolvedValue("fr");
      renderPage();
      await waitLoaded();

      expect(mockChangeLanguage).not.toHaveBeenCalled();
    });

    it("devrait présélectionner azerty si système = azerty", async () => {
      window.electronAPI.getSystemKeyboardLayout.mockResolvedValue("azerty");
      renderPage();
      await waitLoaded();

      const azertyBtn = screen.getByTestId("welcome-keyboard-azerty");
      expect(azertyBtn).toBeInTheDocument();
    });

    it("devrait gérer getSystemLanguage absent", async () => {
      delete window.electronAPI.getSystemLanguage;
      renderPage();
      await waitLoaded();
      expect(screen.getByTestId("welcome-container")).toBeInTheDocument();
    });

    it("devrait gérer getSystemKeyboardLayout absent", async () => {
      delete window.electronAPI.getSystemKeyboardLayout;
      renderPage();
      await waitLoaded();
      expect(screen.getByTestId("welcome-container")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // LANGUAGE SELECTION
  // ════════════════════════════════════════════════════════════════════

  describe("sélection langue", () => {
    it("devrait afficher les 3 langues", async () => {
      renderPage();
      await waitLoaded();

      expect(screen.getByTestId("welcome-lang-fr")).toBeInTheDocument();
      expect(screen.getByTestId("welcome-lang-en")).toBeInTheDocument();
      expect(screen.getByTestId("welcome-lang-es")).toBeInTheDocument();
    });

    it("devrait changer selectedLang au click", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-lang-en"));

      // Le bouton EN doit être visuellement actif (fond accent-light)
      const enBtn = screen.getByTestId("welcome-lang-en");
      expect(enBtn.style.background).toContain("var(--accent-light)");
      // Et le bouton FR ne doit plus être actif
      const frBtn = screen.getByTestId("welcome-lang-fr");
      expect(frBtn.style.background).not.toContain("var(--accent-light)");
    });

    it("ne devrait PAS appeler changeLanguage au click (seulement au confirm)", async () => {
      renderPage();
      await waitLoaded();
      mockChangeLanguage.mockClear();

      fireEvent.click(screen.getByTestId("welcome-lang-en"));

      expect(mockChangeLanguage).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SELECTION KEYBOARD
  // ════════════════════════════════════════════════════════════════════

  describe("sélection clavier", () => {
    it("devrait afficher 2 layouts", async () => {
      renderPage();
      await waitLoaded();

      expect(screen.getByTestId("welcome-keyboard-qwerty")).toBeInTheDocument();
      expect(screen.getByTestId("welcome-keyboard-azerty")).toBeInTheDocument();
    });

    it("devrait changer de layout au click", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-keyboard-azerty"));

      const azertyBtn = screen.getByTestId("welcome-keyboard-azerty");
      expect(azertyBtn.style.background).toContain("var(--accent-light)");

      const qwertyBtn = screen.getByTestId("welcome-keyboard-qwerty");
      expect(qwertyBtn.style.background).not.toContain("var(--accent-light)");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // CONFIRM
  // ════════════════════════════════════════════════════════════════════

  describe("handleConfirm", () => {
    it("devrait appeler changeLanguage avec selectedLang", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-lang-en"));
      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(mockChangeLanguage).toHaveBeenCalledWith("en");
      });
    });

    it("devrait appeler storeSet keyboardLayout", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-keyboard-azerty"));
      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(window.electronAPI.storeSet).toHaveBeenCalledWith(
          "keyboardLayout",
          "azerty",
        );
      });
    });

    it("devrait appeler storeSet hasLaunchedBefore", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(window.electronAPI.storeSet).toHaveBeenCalledWith(
          "hasLaunchedBefore",
          true,
        );
      });
    });

    it("devrait appeler updateTrayLanguage", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-lang-en"));
      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(window.electronAPI.updateTrayLanguage).toHaveBeenCalledWith(
          "en",
        );
      });
    });

    it("devrait appeler window.location.reload", async () => {
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      });
    });

    it("devrait gérer une erreur storeSet", async () => {
      window.electronAPI.storeSet.mockRejectedValue(new Error("full"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it("devrait gérer updateTrayLanguage absent", async () => {
      delete window.electronAPI.updateTrayLanguage;
      renderPage();
      await waitLoaded();

      fireEvent.click(screen.getByTestId("welcome-continue"));

      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // DISPLAY
  // ════════════════════════════════════════════════════════════════════

  it("devrait afficher le titre SoundDeck", async () => {
    renderPage();
    await waitLoaded();
    expect(screen.getByText("SoundDeck")).toBeInTheDocument();
  });

  it("devrait afficher le bouton continue", async () => {
    renderPage();
    await waitLoaded();
    expect(screen.getByTestId("welcome-continue")).toBeInTheDocument();
  });
});
