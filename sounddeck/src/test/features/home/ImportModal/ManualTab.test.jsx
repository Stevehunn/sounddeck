import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: (p) => (p ? `sounddeck-local://file/${p}` : null),
}));

vi.mock("@features/home/ImportModal/CompressionOptions", () => ({
  default: () => <div data-testid="compression-options" />,
}));

// AudioTrimmer mocké avec bouton confirm
vi.mock("@shared/components/audio/AudioTrimmer", () => ({
  default: ({ onConfirm, onCancel }) => (
    <div data-testid="audio-trimmer">
      <button
        data-testid="trimmer-confirm"
        onClick={() => onConfirm("/sounds/trimmed.mp3")}
      >
        Confirm
      </button>
      <button data-testid="trimmer-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@shared/components/ui/EmojiPicker", () => ({
  default: ({ isOpen, onSelect }) =>
    isOpen ? (
      <div data-testid="emoji-picker">
        <button onClick={() => onSelect("🎸")}>PICK</button>
      </div>
    ) : null,
}));

import ManualTab from "@features/home/ImportModal/ManualTab";

describe("ManualTab", () => {
  let onClose;
  let onManualAdd;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onManualAdd = vi.fn().mockResolvedValue();

    window.electronAPI = {
      openFileDialog: vi.fn().mockResolvedValue([]),
      importSoundFile: vi.fn().mockResolvedValue({
        success: true,
        path: "/sounds/a.mp3",
        name: "My Sound",
      }),
      openImageDialog: vi.fn().mockResolvedValue(null),
      importImageFile: vi.fn().mockResolvedValue({
        success: true,
        path: "/img.png",
      }),
    };
  });

  const renderTab = (overrides = {}) =>
    render(
      <ManualTab
        onClose={onClose}
        onManualAdd={onManualAdd}
        compressOnImport={false}
        setCompressOnImport={vi.fn()}
        compressionBitrate={128}
        setCompressionBitrate={vi.fn()}
        {...overrides}
      />,
    );

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  it("devrait afficher les champs", () => {
    renderTab();
    expect(screen.getByText("soundName")).toBeInTheDocument();
    expect(screen.getByText("audioFile")).toBeInTheDocument();
    expect(screen.getAllByText("image").length).toBeGreaterThanOrEqual(1);
  });

  it("devrait afficher compression-options", () => {
    renderTab();
    expect(screen.getByTestId("compression-options")).toBeInTheDocument();
  });

  it("devrait afficher le bouton emoji", () => {
    renderTab();
    expect(
      screen.getByTestId("import-modal-emoji-picker-button"),
    ).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════════════════
  // PICK FILE
  // ════════════════════════════════════════════════════════════════════

  describe("pick file", () => {
    it("devrait appeler openFileDialog + importSoundFile", async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(["/src/a.mp3"]);
      renderTab();
      fireEvent.click(screen.getByText("browse"));

      await waitFor(() => {
        expect(window.electronAPI.openFileDialog).toHaveBeenCalled();
        expect(window.electronAPI.importSoundFile).toHaveBeenCalledWith(
          "/src/a.mp3",
        );
      });
    });

    it("devrait remplir le nom automatiquement", async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(["/src/a.mp3"]);
      renderTab();
      fireEvent.click(screen.getByText("browse"));

      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue(/My Sound/);
        expect(inputs.length).toBeGreaterThan(0);
      });
    });

    it("ne devrait rien faire si dialog annulé", async () => {
      renderTab();
      fireEvent.click(screen.getByText("browse"));
      await new Promise((r) => setTimeout(r, 20));
      expect(window.electronAPI.importSoundFile).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PICK IMAGE
  // ════════════════════════════════════════════════════════════════════

  describe("pick image", () => {
    it("devrait appeler openImageDialog", async () => {
      window.electronAPI.openImageDialog.mockResolvedValue("/src/img.png");
      renderTab();
      fireEvent.click(
        screen.getByText("image", { selector: "button" }).closest("button") ||
          screen.getAllByText("image")[1],
      );
      // On cible plus précisément : le bouton qui a le texte "image"
      const buttons = screen.getAllByRole("button");
      const imgBtn = buttons.find(
        (b) => b.textContent.includes("image") && b.querySelector(".ti-photo"),
      );
      fireEvent.click(imgBtn);

      await waitFor(() => {
        expect(window.electronAPI.openImageDialog).toHaveBeenCalled();
      });
    });

    it("devrait appeler importImageFile si path", async () => {
      window.electronAPI.openImageDialog.mockResolvedValue("/src/img.png");
      renderTab();
      const buttons = screen.getAllByRole("button");
      const imgBtn = buttons.find(
        (b) => b.textContent.includes("image") && b.querySelector(".ti-photo"),
      );
      fireEvent.click(imgBtn);

      await waitFor(() => {
        expect(window.electronAPI.importImageFile).toHaveBeenCalledWith(
          "/src/img.png",
        );
      });
    });

    it("ne devrait rien faire si annulé", async () => {
      renderTab();
      const buttons = screen.getAllByRole("button");
      const imgBtn = buttons.find(
        (b) => b.textContent.includes("image") && b.querySelector(".ti-photo"),
      );
      fireEvent.click(imgBtn);

      await new Promise((r) => setTimeout(r, 20));
      expect(window.electronAPI.importImageFile).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // EMOJI
  // ════════════════════════════════════════════════════════════════════

  describe("emoji", () => {
    it("devrait ouvrir le picker au click", () => {
      renderTab();
      fireEvent.click(screen.getByTestId("import-modal-emoji-picker-button"));
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    it("devrait mettre à jour l'emoji", async () => {
      renderTab();
      fireEvent.click(screen.getByTestId("import-modal-emoji-picker-button"));
      fireEvent.click(screen.getByText("PICK"));

      await waitFor(() => {
        expect(
          screen.getByTestId("import-modal-emoji-picker-button").textContent,
        ).toContain("🎸");
      });
    });

    it("ne devrait PAS afficher l'emoji picker si une image est sélectionnée", async () => {
      window.electronAPI.openImageDialog.mockResolvedValue("/img.png");
      renderTab();
      const buttons = screen.getAllByRole("button");
      const imgBtn = buttons.find(
        (b) => b.textContent.includes("image") && b.querySelector(".ti-photo"),
      );
      fireEvent.click(imgBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId("import-modal-emoji-picker-button"),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TRIMMER
  // ════════════════════════════════════════════════════════════════════

  describe("trimmer", () => {
    const setupFile = async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(["/src/a.mp3"]);
      renderTab();
      fireEvent.click(screen.getByText("browse"));
      await waitFor(() => screen.getByText("trimAudio"));
    };

    it("devrait afficher le bouton trimAudio après avoir choisi un fichier", async () => {
      await setupFile();
      expect(screen.getByText("trimAudio")).toBeInTheDocument();
    });

    it("devrait ouvrir AudioTrimmer au click", async () => {
      await setupFile();
      fireEvent.click(screen.getByText("trimAudio"));
      expect(screen.getByTestId("audio-trimmer")).toBeInTheDocument();
    });

    it("devrait fermer le trimmer après confirm", async () => {
      await setupFile();
      fireEvent.click(screen.getByText("trimAudio"));
      fireEvent.click(screen.getByTestId("trimmer-confirm"));

      await waitFor(() => {
        expect(screen.queryByTestId("audio-trimmer")).not.toBeInTheDocument();
      });
    });

    it("devrait fermer le trimmer après cancel", async () => {
      await setupFile();
      fireEvent.click(screen.getByText("trimAudio"));
      fireEvent.click(screen.getByTestId("trimmer-cancel"));

      await waitFor(() => {
        expect(screen.queryByTestId("audio-trimmer")).not.toBeInTheDocument();
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SUBMIT
  // ════════════════════════════════════════════════════════════════════

  describe("submit", () => {
    const setupFull = async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(["/src/a.mp3"]);
      renderTab();
      fireEvent.click(screen.getByText("browse"));
      await waitFor(() => screen.getByText("add"));
    };

    it("devrait désactiver add si pas de fichier", () => {
      renderTab();
      expect(screen.getByText("add").closest("button")).toBeDisabled();
    });

    it("devrait activer add si fichier + name", async () => {
      await setupFull();
      expect(screen.getByText("add").closest("button")).not.toBeDisabled();
    });

    it("devrait appeler onManualAdd", async () => {
      await setupFull();
      fireEvent.click(screen.getByText("add"));

      await waitFor(() => {
        expect(onManualAdd).toHaveBeenCalledWith(
          "My Sound",
          "/sounds/a.mp3",
          null,
          "🔊",
        );
      });
    });

    it("devrait appeler onClose au click cancel", () => {
      renderTab();
      fireEvent.click(screen.getByText("cancel"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
