import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import EmojiDiscover from "./EmojiDiscover";

// ─── Mocks ─────────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

const mockAddEmoji = vi.fn();
const mockAddCategory = vi.fn();
const mockHasEmoji = vi.fn(() => false);

vi.mock("@shared/hooks/useEmojis", () => ({
  useEmojis: () => ({
    addEmoji: mockAddEmoji,
    addCategory: mockAddCategory,
    hasEmoji: mockHasEmoji,
    customEmojis: [],
  }),
}));

const mockEnsureOnline = vi.fn(() => Promise.resolve(true));
const mockShowNoConnection = vi.fn();

vi.mock("@shared/contexts", () => ({
  useNetwork: () => ({
    ensureOnline: mockEnsureOnline,
    showNoConnection: mockShowNoConnection,
  }),
}));

vi.mock("./categories", () => ({
  EMOJI_DISCOVER_CATEGORIES: [
    { id: "smileys", labelKey: "catSmileys", emoji: "😀" },
    { id: "animals", labelKey: "catAnimals", emoji: "🐾" },
  ],
}));

describe("EmojiDiscover", () => {
  let store;
  let addToast;

  beforeEach(() => {
    vi.clearAllMocks();
    // ✅ Reset les implémentations (clearAllMocks ne les touche PAS)
    mockAddEmoji.mockReset();
    mockAddCategory.mockReset();
    mockHasEmoji.mockReset().mockReturnValue(false);

    store = {};
    addToast = vi.fn();
    window.electronAPI = {
      fetchEmojis: vi.fn().mockResolvedValue({
        success: true,
        emojis: ["😀", "😃", "😄"],
      }),
    };
  });

  const renderPage = () =>
    render(<EmojiDiscover store={store} addToast={addToast} />);

  const waitInit = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  };

  // ─── RENDU INITIAL ──────────────────────────────────────────────────

  it("devrait afficher le titre", async () => {
    renderPage();
    await waitInit();
    // Le titre apparaît 2× (sidebar header + contenu)
    const titles = screen.getAllByText("emojiDiscoverTitle");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it("devrait afficher les catégories dans la sidebar", async () => {
    renderPage();
    await waitInit();
    expect(
      screen.getByTestId("emoji-discover-cat-smileys"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("emoji-discover-cat-animals"),
    ).toBeInTheDocument();
  });

  it("devrait charger la catégorie par défaut au mount", async () => {
    renderPage();
    await waitInit();
    expect(window.electronAPI.fetchEmojis).toHaveBeenCalledWith("smileys");
  });

  it("devrait afficher les emojis chargés", async () => {
    renderPage();
    await waitInit();
    await waitFor(() => {
      expect(screen.getByTestId("emoji-discover-item-😀")).toBeInTheDocument();
      expect(screen.getByTestId("emoji-discover-item-😃")).toBeInTheDocument();
    });
  });

  it("devrait afficher le compteur d'emojis", async () => {
    renderPage();
    await waitInit();
    await waitFor(() => {
      const text = document.body.textContent;
      expect(text).toMatch(/emojiDiscoverCategoryEmojiCount/);
    });
  });

  // ─── CHANGEMENT DE CATÉGORIE ────────────────────────────────────────

  it("devrait charger une nouvelle catégorie au click", async () => {
    renderPage();
    await waitInit();

    fireEvent.click(screen.getByTestId("emoji-discover-cat-animals"));

    await waitFor(() => {
      expect(window.electronAPI.fetchEmojis).toHaveBeenCalledWith("animals");
    });
  });

  it("devrait utiliser le cache au 2e clic", async () => {
    renderPage();
    await waitInit();

    // 1er clic sur animals
    fireEvent.click(screen.getByTestId("emoji-discover-cat-animals"));
    await waitFor(() =>
      expect(window.electronAPI.fetchEmojis).toHaveBeenCalledTimes(2),
    );

    // Retour smileys
    fireEvent.click(screen.getByTestId("emoji-discover-cat-smileys"));

    // Attendre un peu
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Toujours 2 appels (cache hit pour smileys)
    expect(window.electronAPI.fetchEmojis).toHaveBeenCalledTimes(2);
  });

  // ─── AJOUT EMOJI ────────────────────────────────────────────────────

  it("devrait appeler addEmoji au click", async () => {
    mockAddEmoji.mockResolvedValue({ success: true });
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(screen.getByTestId("emoji-discover-item-😀")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("emoji-discover-item-😀"));

    await waitFor(() => {
      expect(mockAddEmoji).toHaveBeenCalledWith("😀", "smileys");
    });
  });

  it("ne devrait PAS appeler addEmoji si owned", async () => {
    mockHasEmoji.mockReturnValue(true);
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(screen.getByTestId("emoji-discover-item-😀")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("emoji-discover-item-😀"));
    expect(mockAddEmoji).not.toHaveBeenCalled();
  });

  it("devrait appeler addToast si addEmoji échoue", async () => {
    mockAddEmoji.mockResolvedValue({ success: false, error: "already owned" });
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(screen.getByTestId("emoji-discover-item-😀")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("emoji-discover-item-😀"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("already owned", "error");
    });
  });

  // ─── AJOUT CATÉGORIE ────────────────────────────────────────────────

  it("devrait appeler addCategory au click", async () => {
    mockAddCategory.mockResolvedValue({ success: true, added: 3 });
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(
        screen.getByTestId("emoji-discover-add-category-button"),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("emoji-discover-add-category-button"));

    await waitFor(() => {
      expect(mockAddCategory).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalled();
    });
  });

  it("devrait afficher un toast d'erreur si catégorie déjà owned", async () => {
    mockAddCategory.mockResolvedValue({ success: false });
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(
        screen.getByTestId("emoji-discover-add-category-button"),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("emoji-discover-add-category-button"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        "emojiDiscoverCategoryAlreadyOwned",
        "info",
      );
    });
  });

  // ─── REFRESH ────────────────────────────────────────────────────────

  it("devrait recharger au click refresh", async () => {
    renderPage();
    await waitInit();

    fireEvent.click(screen.getByTestId("emoji-discover-refresh-button"));

    await waitFor(() => {
      expect(window.electronAPI.fetchEmojis).toHaveBeenCalledTimes(2);
    });
  });

  // ─── ERREURS ────────────────────────────────────────────────────────

  it("devrait afficher une erreur si fetchEmojis échoue", async () => {
    window.electronAPI.fetchEmojis.mockResolvedValue({
      success: false,
      error: "network down",
    });

    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(document.body.textContent).toContain("network down");
    });
  });

  it("devrait appeler showNoConnection si erreur réseau", async () => {
    window.electronAPI.fetchEmojis.mockResolvedValue({
      success: false,
      isNetworkError: true,
    });

    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(mockShowNoConnection).toHaveBeenCalled();
    });
  });

  it('devrait afficher "emojiDiscoverEmpty" si 0 emojis', async () => {
    window.electronAPI.fetchEmojis.mockResolvedValue({
      success: true,
      emojis: [],
    });

    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(document.body.textContent).toContain("emojiDiscoverEmpty");
    });
  });

  it("devrait gérer une exception fetchEmojis", async () => {
    window.electronAPI.fetchEmojis.mockRejectedValue(new Error("boom"));
    renderPage();
    await waitInit();

    await waitFor(() => {
      expect(document.body.textContent).toContain("boom");
    });
  });

  // ─── FALLBACK ──────────────────────────────────────────────────────

  it("ne devrait pas crash si electronAPI.fetchEmojis absent", async () => {
    delete window.electronAPI.fetchEmojis;
    renderPage();
    await waitInit();
    expect(screen.getByTestId("emoji-discover-container")).toBeInTheDocument();
  });

  it("devrait utiliser le labelKey de la catégorie", async () => {
    renderPage();
    await waitInit();
    expect(screen.getByText("catSmileys")).toBeInTheDocument();
  });

  it("devrait exposer le testid principal", async () => {
    renderPage();
    await waitInit();
    expect(screen.getByTestId("emoji-discover-container")).toBeInTheDocument();
  });

  it("devrait exposer la grille", async () => {
    renderPage();
    await waitInit();
    expect(screen.getByTestId("emoji-discover-grid")).toBeInTheDocument();
  });
});
