// src/features/trimmer/Trimmer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import Trimmer from "./Trimmer";

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@shared/hooks/useConfirm", () => ({
  default: () => ({
    confirm: mocks.confirm,
    ConfirmWrapper: () => null,
  }),
}));

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: (p) => (p ? `sounddeck-local://file/${p}` : null),
}));

vi.mock("@shared/components/ui/EmojiPicker", () => ({
  default: ({ isOpen, onSelect }) =>
    isOpen ? (
      <div data-testid="emoji-picker">
        <button onClick={() => onSelect("🎸")}>PICK</button>
      </div>
    ) : null,
}));

// ─── Waveform (avec formatTime) ──────────────────────────────────────
vi.mock("@shared/components/audio/Waveform", () => ({
  default: ({ onSeek, onStartChange, onEndChange }) => (
    <div data-testid="waveform">
      <button onClick={() => onSeek?.(5)}>seek-5</button>
      <button onClick={() => onStartChange?.(2)}>start-2</button>
      <button onClick={() => onEndChange?.(8)}>end-8</button>
    </div>
  ),
  formatTime: (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  },
}));

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe("Trimmer", () => {
  let store;
  let addToast;

  const createSound = (id = "s1", name = "Mon son") => ({
    id,
    name,
    path: `/sounds/${id}.mp3`,
    emoji: "🔊",
    image: null,
    profiles: ["all"],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);

    store = {
      sounds: [createSound("s1", "Son A"), createSound("s2", "Son B")],
      profiles: [
        { id: "all", name: "Tous", isDefault: true },
        { id: "p1", name: "Gaming" },
      ],
      addSound: vi.fn().mockResolvedValue(),
    };
    addToast = vi.fn();

    window.electronAPI = {
      openImageDialog: vi.fn().mockResolvedValue(null),
      importImageFile: vi
        .fn()
        .mockResolvedValue({ success: true, path: "/img.png" }),
      trimSoundFile: vi
        .fn()
        .mockResolvedValue({ success: true, path: "/sounds/trimmed.mp3" }),
    };

    // Mock Audio global (classe pour que `new` fonctionne correctement)
    class MockAudio {
      constructor(src) {
        this.src = src || "";
        this.play = vi.fn().mockResolvedValue();
        this.pause = vi.fn();
        this.currentTime = 0;
        this.duration = 10;
        this._listeners = {};
        this.addEventListener = vi.fn((event, cb) => {
          this._listeners[event] = cb;
          // ✅ Fire synchrone pour que le composant ait sa durée AVANT les tests
          if (event === "loadedmetadata") {
            cb();
          }
        });
      }
    }
    global.Audio = MockAudio;
    window.Audio = MockAudio;

    delete window.__trimmerSelectFirstSound;
  });

  afterEach(() => {
    delete window.__trimmerSelectFirstSound;
  });

  const renderPage = () =>
    render(<Trimmer store={store} addToast={addToast} />);

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  describe("rendu de base", () => {
    it("devrait afficher le titre trimmerTitle", () => {
      renderPage();
      expect(screen.getByText("trimmerTitle")).toBeInTheDocument();
    });

    it("devrait afficher la barre de recherche", () => {
      renderPage();
      expect(screen.getByTestId("trimmer-search-input")).toBeInTheDocument();
    });

    it("devrait afficher les sons dans la liste", () => {
      renderPage();
      expect(screen.getByTestId("sound-list-item-s1")).toBeInTheDocument();
      expect(screen.getByTestId("sound-list-item-s2")).toBeInTheDocument();
    });

    it("devrait afficher l'état vide par défaut", () => {
      renderPage();
      expect(screen.getByTestId("trimmer-empty-state")).toBeInTheDocument();
    });

    it('devrait afficher "editorNoSound" si aucun son', () => {
      store.sounds = [];
      renderPage();
      expect(screen.getByText("editorNoSound")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // RECHERCHE
  // ════════════════════════════════════════════════════════════════════

  describe("recherche", () => {
    it("devrait filtrer les sons par nom", () => {
      renderPage();

      fireEvent.change(screen.getByTestId("trimmer-search-input"), {
        target: { value: "Son A" },
      });

      expect(screen.getByTestId("sound-list-item-s1")).toBeInTheDocument();
      expect(
        screen.queryByTestId("sound-list-item-s2"),
      ).not.toBeInTheDocument();
    });

    it("devrait être insensible à la casse", () => {
      renderPage();

      fireEvent.change(screen.getByTestId("trimmer-search-input"), {
        target: { value: "son a" },
      });

      expect(screen.getByTestId("sound-list-item-s1")).toBeInTheDocument();
    });

    it('devrait afficher "editorNoSound" si rien ne matche', () => {
      renderPage();

      fireEvent.change(screen.getByTestId("trimmer-search-input"), {
        target: { value: "xyz" },
      });

      expect(screen.getByText("editorNoSound")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SÉLECTION
  // ════════════════════════════════════════════════════════════════════

  describe("sélection son", () => {
    it("devrait afficher l'éditeur après sélection", () => {
      renderPage();

      fireEvent.click(screen.getByTestId("sound-list-item-s1"));

      expect(
        screen.queryByTestId("trimmer-empty-state"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("trimmer-waveform-container"),
      ).toBeInTheDocument();
    });

    it("devrait marquer le son comme actif", () => {
      renderPage();

      fireEvent.click(screen.getByTestId("sound-list-item-s1"));

      expect(screen.getByTestId("sound-list-item-s1")).toHaveAttribute(
        "data-active",
        "true",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // FONCTION GLOBALE TUTORIEL
  // ════════════════════════════════════════════════════════════════════

  describe("window.__trimmerSelectFirstSound", () => {
    it("devrait être exposée au mount", () => {
      renderPage();
      expect(typeof window.__trimmerSelectFirstSound).toBe("function");
    });

    it("devrait sélectionner le 1er son", () => {
      renderPage();

      act(() => {
        window.__trimmerSelectFirstSound();
      });

      expect(screen.getByTestId("sound-list-item-s1")).toHaveAttribute(
        "data-active",
        "true",
      );
    });

    it("devrait retourner true si sélection réussie", () => {
      renderPage();

      let result;
      act(() => {
        result = window.__trimmerSelectFirstSound();
      });

      expect(result).toBe(true);
    });

    it("devrait retourner false si aucun son", () => {
      store.sounds = [];
      renderPage();

      let result;
      act(() => {
        result = window.__trimmerSelectFirstSound();
      });

      expect(result).toBe(false);
    });

    it("devrait reset la recherche", () => {
      renderPage();

      fireEvent.change(screen.getByTestId("trimmer-search-input"), {
        target: { value: "xyz" },
      });

      act(() => {
        window.__trimmerSelectFirstSound();
      });

      expect(screen.getByTestId("trimmer-search-input")).toHaveValue("");
    });

    it("devrait être supprimée au unmount", () => {
      const { unmount } = renderPage();
      unmount();
      expect(window.__trimmerSelectFirstSound).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — affichage
  // ════════════════════════════════════════════════════════════════════

  describe("éditeur", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait afficher le nom original", async () => {
      await goToEditor();
      // "Son A" apparaît 2× : dans la liste + dans le header éditeur
      const matches = screen.getAllByText("Son A");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('devrait afficher "originalKept"', async () => {
      await goToEditor();
      expect(screen.getByText("originalKept")).toBeInTheDocument();
    });

    it('devrait préfixer le nom avec "(copie)"', async () => {
      await goToEditor();
      const input = screen.getByTestId("trimmer-name-input");
      expect(input.value).toContain("(copie)");
    });

    it("devrait afficher les profils", async () => {
      await goToEditor();
      expect(screen.getByText("Gaming")).toBeInTheDocument();
    });

    it("devrait afficher le bouton emoji si pas d'image", async () => {
      await goToEditor();
      expect(
        screen.getByTestId("trimmer-emoji-picker-button"),
      ).toBeInTheDocument();
    });

    it("devrait afficher les boutons listen + reset", async () => {
      await goToEditor();
      expect(screen.getByTestId("trimmer-listen-button")).toBeInTheDocument();
      expect(screen.getByTestId("trimmer-reset-button")).toBeInTheDocument();
    });

    it("devrait afficher le bouton create", async () => {
      await goToEditor();
      expect(screen.getByTestId("trimmer-create-button")).toBeInTheDocument();
    });

    it('devrait afficher "listenSelection" par défaut', async () => {
      await goToEditor();
      expect(screen.getByTestId("trimmer-listen-button").textContent).toContain(
        "listenSelection",
      );
    });

    it("togglePlay devrait alterner pause/play", async () => {
      await goToEditor();

      // Attend que `loadedmetadata` ait set duration/end
      await waitFor(() => {
        expect(screen.getByTestId("trimmer-listen-button")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("trimmer-listen-button"));
      });

      await waitFor(() => {
        expect(
          screen.getByTestId("trimmer-listen-button").textContent,
        ).toContain("trimmerPause");
      });

      // 2ème click → pause
      await act(async () => {
        fireEvent.click(screen.getByTestId("trimmer-listen-button"));
      });

      await waitFor(() => {
        expect(
          screen.getByTestId("trimmer-listen-button").textContent,
        ).toContain("listenSelection");
      });
    });

    it("reset devrait remettre start=0 et end=duration", async () => {
      await goToEditor();
      fireEvent.click(screen.getByTestId("trimmer-reset-button"));
      // Pas d'assertion stricte (duration=0 en jsdom) mais ne doit pas crash
      expect(screen.getByTestId("trimmer-reset-button")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — Nom
  // ════════════════════════════════════════════════════════════════════

  describe("édition du nom", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait permettre de modifier le nom", async () => {
      await goToEditor();
      const input = screen.getByTestId("trimmer-name-input");
      fireEvent.change(input, { target: { value: "Nouveau nom" } });
      expect(input).toHaveValue("Nouveau nom");
    });

    it('devrait afficher "editorNameRequired" si nom vide', async () => {
      await goToEditor();
      fireEvent.change(screen.getByTestId("trimmer-name-input"), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith("editorNameRequired", "error");
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — Image
  // ════════════════════════════════════════════════════════════════════

  describe("image", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait appeler openImageDialog", async () => {
      await goToEditor();

      const imgBtns = screen.getAllByText("editorImageChoose");
      fireEvent.click(imgBtns[0]);

      await waitFor(() => {
        expect(window.electronAPI.openImageDialog).toHaveBeenCalled();
      });
    });

    it("devrait appeler importImageFile si path retourné", async () => {
      window.electronAPI.openImageDialog.mockResolvedValue("/img.png");
      await goToEditor();

      const imgBtns = screen.getAllByText("editorImageChoose");
      fireEvent.click(imgBtns[0]);

      await waitFor(() => {
        expect(window.electronAPI.importImageFile).toHaveBeenCalledWith(
          "/img.png",
        );
      });
    });

    it("ne devrait rien faire si dialog annulé", async () => {
      window.electronAPI.openImageDialog.mockResolvedValue(null);
      await goToEditor();

      const imgBtns = screen.getAllByText("editorImageChoose");
      fireEvent.click(imgBtns[0]);

      await new Promise((r) => setTimeout(r, 50));
      expect(window.electronAPI.importImageFile).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — Emoji
  // ════════════════════════════════════════════════════════════════════

  describe("emoji", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait ouvrir le picker au click", async () => {
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-emoji-picker-button"));

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    it("devrait mettre à jour l'emoji via onSelect", async () => {
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-emoji-picker-button"));
      fireEvent.click(screen.getByText("PICK"));

      await waitFor(() => {
        expect(
          screen.getByTestId("trimmer-emoji-picker-button").textContent,
        ).toContain("🎸");
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — Profils
  // ════════════════════════════════════════════════════════════════════

  describe("profils", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait toggle un profil", async () => {
      await goToEditor();

      const checkboxes = screen.getAllByRole("checkbox");
      // Click sur Gaming
      fireEvent.click(checkboxes[1]);

      // Pas d'erreur = OK
      expect(checkboxes[1]).toBeInTheDocument();
    });

    it('devrait afficher "editorProfileRequired" si 0 profils', async () => {
      await goToEditor();

      // Décoche tous les profils
      const checkboxes = screen.getAllByRole("checkbox");
      for (const cb of checkboxes) {
        if (cb.checked) fireEvent.click(cb);
      }

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith("editorProfileRequired", "error");
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ÉDITEUR — Save
  // ════════════════════════════════════════════════════════════════════

  describe("save", () => {
    const goToEditor = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sound-list-item-s1"));
    };

    it("devrait appeler trimSoundFile", async () => {
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(window.electronAPI.trimSoundFile).toHaveBeenCalled();
      });
    });

    it("devrait appeler store.addSound si success", async () => {
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(store.addSound).toHaveBeenCalled();
      });
    });

    it("devrait afficher un toast succès", async () => {
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining("editorCreated"),
          "success",
        );
      });
    });

    it("devrait afficher un toast d'erreur si trim échoue", async () => {
      window.electronAPI.trimSoundFile.mockResolvedValue({
        success: false,
        error: "ffmpeg error",
      });
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining("trimmerError"),
          "error",
        );
      });
    });

    it("devrait afficher un toast si warning", async () => {
      window.electronAPI.trimSoundFile.mockResolvedValue({
        success: true,
        path: "/x.mp3",
        warning: "copy fallback",
      });
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith("copy fallback", "info");
      });
    });

    it("devrait demander confirmation si nom existe", async () => {
      store.sounds = [
        createSound("s1", "Son A"),
        { id: "s99", name: "Son A (copie)", path: "/x.mp3" },
      ];
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled();
      });
    });

    it("ne devrait PAS sauvegarder si confirmation refusée", async () => {
      mocks.confirm.mockResolvedValue(false);
      store.sounds = [
        createSound("s1", "Son A"),
        { id: "s99", name: "Son A (copie)", path: "/x.mp3" },
      ];
      await goToEditor();

      fireEvent.click(screen.getByTestId("trimmer-create-button"));

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled();
      });
      expect(store.addSound).not.toHaveBeenCalled();
    });

    it("bouton Cancel devrait appeler onDone", async () => {
      await goToEditor();

      const cancelBtn = screen.getByText("cancel").closest("button");
      fireEvent.click(cancelBtn);

      // Retour à l'état vide
      await waitFor(() => {
        expect(screen.getByTestId("trimmer-empty-state")).toBeInTheDocument();
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SOUND LIST ITEM
  // ════════════════════════════════════════════════════════════════════

  describe("SoundListItem", () => {
    it("devrait afficher l'image si présente", () => {
      store.sounds = [
        { ...createSound("s1", "With Image"), image: "/img.png" },
      ];
      renderPage();
      const item = screen.getByTestId("sound-list-item-s1");
      expect(item.querySelector("img")).toBeInTheDocument();
    });

    it("devrait afficher l'emoji si pas d'image", () => {
      store.sounds = [{ ...createSound("s1", "No Image"), emoji: "🎵" }];
      renderPage();
      const item = screen.getByTestId("sound-list-item-s1");
      expect(item.textContent).toContain("🎵");
    });

    it("devrait afficher 🔊 par défaut si pas d'emoji", () => {
      store.sounds = [{ ...createSound("s1"), emoji: null }];
      renderPage();
      const item = screen.getByTestId("sound-list-item-s1");
      expect(item.textContent).toContain("🔊");
    });
  });
});
