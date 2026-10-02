// src/test/features/options/sections/ShortcutsSection.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

// ShortcutRecorder mocké : expose un bouton Save qui passe un accelerator
vi.mock("@shared/components/settings/ShortcutRecorder", () => ({
  default: ({ onSave, onClear, value }) => (
    <div data-testid="shortcut-recorder" data-value={value}>
      <button
        data-testid={`save-${value || "empty"}`}
        onClick={() => onSave("Ctrl+X")}
      >
        Save
      </button>
      <button data-testid="clear-recorder" onClick={onClear}>
        Clear
      </button>
    </div>
  ),
}));

vi.mock("@shared/components/settings/KeyboardVisualizer", () => ({
  default: ({ shortcuts, layout }) => (
    <div data-testid="keyboard-visualizer" data-layout={layout} />
  ),
}));

import ShortcutsSection from "@features/options/sections/ShortcutsSection";

describe("ShortcutsSection", () => {
  let store;
  let addToast;

  beforeEach(() => {
    vi.clearAllMocks();
    store = {
      keyboardLayout: "qwerty",
      shortcuts: { s1: "Ctrl+1" },
      profileShortcut: "Ctrl+Tab",
      loopShortcut: "Ctrl+L",
      stopAllShortcut: "Ctrl+S",
      presentationShortcut: "Ctrl+P",
      toggleShortcutsAccelerator: "Ctrl+Shift+K",
      toggleWindowShortcut: "Ctrl+Shift+S",
      lang: "fr",
      updateKeyboardLayout: vi.fn().mockResolvedValue(),
      updateProfileShortcut: vi.fn().mockResolvedValue(),
      updateLoopShortcut: vi.fn().mockResolvedValue(),
      updateStopAllShortcut: vi.fn().mockResolvedValue(),
      updatePresentationShortcut: vi.fn().mockResolvedValue(),
      updateToggleShortcutsAccelerator: vi.fn().mockResolvedValue(),
      updateToggleWindowShortcut: vi.fn().mockResolvedValue(),
    };
    addToast = vi.fn();
  });

  const renderSection = (overrides = {}) =>
    render(
      <ShortcutsSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
      />,
    );

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  it("devrait afficher le titre optionsShortcuts", () => {
    renderSection();
    expect(screen.getByText("optionsShortcuts")).toBeInTheDocument();
  });

  it("devrait exposer le testid section-shortcuts", () => {
    renderSection();
    expect(screen.getByTestId("section-shortcuts")).toBeInTheDocument();
  });

  it("devrait afficher KeyboardVisualizer", () => {
    renderSection();
    expect(screen.getByTestId("keyboard-visualizer")).toBeInTheDocument();
  });

  it("devrait passer layout à KeyboardVisualizer", () => {
    renderSection({ keyboardLayout: "azerty" });
    expect(
      screen.getByTestId("keyboard-visualizer").getAttribute("data-layout"),
    ).toBe("azerty");
  });

  // ════════════════════════════════════════════════════════════════════
  // KEYBOARD LAYOUT
  // ════════════════════════════════════════════════════════════════════

  describe("keyboardLayout", () => {
    it("devrait afficher le select keyboardLayout", () => {
      renderSection();
      expect(screen.getByText("keyboardLayout")).toBeInTheDocument();
    });

    it("devrait appeler updateKeyboardLayout au change", async () => {
      renderSection();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "azerty" },
      });

      await waitFor(() => {
        expect(store.updateKeyboardLayout).toHaveBeenCalledWith("azerty");
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining("keyboardLayoutChanged"),
          "info",
        );
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SHORTCUT RECORDERS
  // ════════════════════════════════════════════════════════════════════

  describe("ShortcutRecorder sections", () => {
    it("devrait afficher les 7 labels", () => {
      renderSection();
      expect(screen.getByText("switchProfile")).toBeInTheDocument();
      expect(screen.getByText("toggleLoop")).toBeInTheDocument();
      expect(screen.getByText("stopAllShortcut")).toBeInTheDocument();
      expect(screen.getByText("presentationShortcut")).toBeInTheDocument();
      expect(screen.getByText("toggleShortcuts")).toBeInTheDocument();
      expect(screen.getByText("toggleWindowShortcut")).toBeInTheDocument();
    });

    it("devrait afficher 6 ShortcutRecorder", () => {
      renderSection();
      expect(screen.getAllByTestId("shortcut-recorder")).toHaveLength(6);
    });

    it("devrait passer les valeurs au recorder", () => {
      renderSection();
      const recorders = screen.getAllByTestId("shortcut-recorder");
      const values = recorders.map((r) => r.getAttribute("data-value"));
      expect(values).toContain("Ctrl+Tab");
      expect(values).toContain("Ctrl+L");
      expect(values).toContain("Ctrl+S");
      expect(values).toContain("Ctrl+P");
      expect(values).toContain("Ctrl+Shift+K");
      expect(values).toContain("Ctrl+Shift+S");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // CALLBACKS
  // ════════════════════════════════════════════════════════════════════

  describe("callbacks de sauvegarde", () => {
    it("devrait appeler updateProfileShortcut", async () => {
      renderSection();
      const recorder = screen.getByTestId("save-Ctrl+Tab");
      fireEvent.click(recorder);

      await waitFor(() => {
        expect(store.updateProfileShortcut).toHaveBeenCalledWith("Ctrl+X");
      });
    });

    it("devrait appeler updateLoopShortcut", async () => {
      renderSection();
      fireEvent.click(screen.getByTestId("save-Ctrl+L"));

      await waitFor(() => {
        expect(store.updateLoopShortcut).toHaveBeenCalledWith("Ctrl+X");
      });
    });

    it("devrait appeler updateStopAllShortcut", async () => {
      renderSection();
      fireEvent.click(screen.getByTestId("save-Ctrl+S"));

      await waitFor(() => {
        expect(store.updateStopAllShortcut).toHaveBeenCalledWith("Ctrl+X");
      });
    });

    it("devrait appeler updatePresentationShortcut", async () => {
      renderSection();
      fireEvent.click(screen.getByTestId("save-Ctrl+P"));

      await waitFor(() => {
        expect(store.updatePresentationShortcut).toHaveBeenCalledWith("Ctrl+X");
      });
    });

    it("devrait appeler updateToggleShortcutsAccelerator", async () => {
      renderSection();
      fireEvent.click(screen.getByTestId("save-Ctrl+Shift+K"));

      await waitFor(() => {
        expect(store.updateToggleShortcutsAccelerator).toHaveBeenCalledWith(
          "Ctrl+X",
        );
      });
    });

    it("devrait appeler updateToggleWindowShortcut", async () => {
      renderSection();
      fireEvent.click(screen.getByTestId("save-Ctrl+Shift+S"));

      await waitFor(() => {
        expect(store.updateToggleWindowShortcut).toHaveBeenCalledWith("Ctrl+X");
      });
    });
  });

  describe("callbacks onClear", () => {
    it('devrait appeler updateProfileShortcut("")', () => {
      renderSection();
      const clearBtns = screen.getAllByTestId("clear-recorder");
      fireEvent.click(clearBtns[0]);
      expect(store.updateProfileShortcut).toHaveBeenCalledWith("");
    });

    it('devrait appeler updateToggleShortcutsAccelerator("") + toast', async () => {
      renderSection();
      const clearBtns = screen.getAllByTestId("clear-recorder");
      // Index 4 = toggleShortcuts
      fireEvent.click(clearBtns[4]);

      await waitFor(() => {
        expect(store.updateToggleShortcutsAccelerator).toHaveBeenCalledWith("");
        expect(addToast).toHaveBeenCalledWith("toggleShortcutRemoved", "info");
      });
    });

    it('devrait appeler updateToggleWindowShortcut("") + toast', async () => {
      renderSection();
      const clearBtns = screen.getAllByTestId("clear-recorder");
      fireEvent.click(clearBtns[5]);

      await waitFor(() => {
        expect(store.updateToggleWindowShortcut).toHaveBeenCalledWith("");
        expect(addToast).toHaveBeenCalledWith(
          "toggleWindowShortcutRemoved",
          "info",
        );
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // DÉFAUTS
  // ════════════════════════════════════════════════════════════════════

  it("devrait utiliser CommandOrControl+Shift+K par défaut", () => {
    renderSection({ toggleShortcutsAccelerator: null });
    const recorders = screen.getAllByTestId("shortcut-recorder");
    const values = recorders.map((r) => r.getAttribute("data-value"));
    expect(values).toContain("CommandOrControl+Shift+K");
  });

  it("devrait utiliser CommandOrControl+Shift+S par défaut", () => {
    renderSection({ toggleWindowShortcut: null });
    const recorders = screen.getAllByTestId("shortcut-recorder");
    const values = recorders.map((r) => r.getAttribute("data-value"));
    expect(values).toContain("CommandOrControl+Shift+S");
  });

  it("devrait afficher le note shortcutsPerSoundNote", () => {
    renderSection();
    expect(screen.getByText("shortcutsPerSoundNote")).toBeInTheDocument();
  });
});
