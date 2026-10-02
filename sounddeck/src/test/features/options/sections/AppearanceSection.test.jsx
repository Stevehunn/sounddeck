// src/test/features/options/sections/AppearanceSection.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  changeLanguage: vi.fn().mockResolvedValue(),
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: "fr",
    changeLanguage: mocks.changeLanguage,
  }),
}));

vi.mock("@core/i18n/constants", () => ({
  LANGUAGES: [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
  ],
}));

vi.mock("@shared/components/ui/CustomThemeEditor", () => ({
  default: ({ onSave }) => (
    <div data-testid="custom-theme-editor">
      <button
        data-testid="save-theme-btn"
        onClick={() => onSave({ accent: "#f00" })}
      >
        Save
      </button>
    </div>
  ),
}));

vi.mock("@shared/components/navigation/SidebarEditor", () => ({
  default: ({ onSave, onCancel, onReset }) => (
    <div data-testid="sidebar-editor">
      <button
        data-testid="save-sidebar-btn"
        onClick={() => onSave({ mode: "custom" })}
      >
        Save
      </button>
      <button data-testid="cancel-sidebar-btn" onClick={onCancel}>
        Cancel
      </button>
      <button data-testid="reset-sidebar-btn-inner" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));

import AppearanceSection from "@features/options/sections/AppearanceSection";

describe("AppearanceSection", () => {
  let store;
  let addToast;
  let onResetSidebar;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.changeLanguage.mockResolvedValue();

    store = {
      theme: "dark",
      customTheme: null,
      cardSize: "medium",
      lang: "fr",
      sidebarConfig: { mode: "default" },
      sidebarEditMode: false,
      sidebarVersion: 1,
      profiles: [{ id: "all", name: "Tous" }],
      updateLang: vi.fn().mockResolvedValue(),
      updateTheme: vi.fn().mockResolvedValue(),
      updateCustomTheme: vi.fn().mockResolvedValue(),
      updateCardSize: vi.fn().mockResolvedValue(),
      toggleSidebarEditMode: vi.fn(),
      updateSidebarConfig: vi.fn().mockResolvedValue(),
    };
    addToast = vi.fn();
    onResetSidebar = vi.fn();
  });

  const renderSection = (overrides = {}) =>
    render(
      <AppearanceSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
        onResetSidebar={onResetSidebar}
      />,
    );

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  describe("rendu de base", () => {
    it("devrait afficher le titre optionsAppearance", () => {
      renderSection();
      expect(screen.getByText("optionsAppearance")).toBeInTheDocument();
    });

    it("devrait exposer le testid de section", () => {
      renderSection();
      expect(screen.getByTestId("section-appearance")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // LANGUES
  // ════════════════════════════════════════════════════════════════════

  describe("langues", () => {
    it("devrait afficher les 3 langues", () => {
      renderSection();
      expect(screen.getByText("Français")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("Español")).toBeInTheDocument();
    });

    it("devrait appeler updateLang + changeLanguage au click", async () => {
      renderSection();
      fireEvent.click(screen.getByText("English"));

      await waitFor(() => {
        expect(store.updateLang).toHaveBeenCalledWith("en");
        expect(mocks.changeLanguage).toHaveBeenCalledWith("en");
      });
    });

    it("devrait utiliser la langue courante dans currentLang", () => {
      renderSection();
      // ⚠️ jsdom ne résout pas var() dans style.borderColor → on lit le style brut
      const frBtn = screen.getByText("Français").closest("button");
      expect(frBtn.getAttribute("style")).toContain("var(--accent)");

      // Le bouton EN ne doit PAS être actif
      const enBtn = screen.getByText("English").closest("button");
      expect(enBtn.getAttribute("style")).not.toContain("var(--accent)");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // THÈME
  // ════════════════════════════════════════════════════════════════════

  describe("thème", () => {
    it("devrait afficher les 4 thèmes", () => {
      renderSection();
      expect(screen.getByText("themeDark")).toBeInTheDocument();
      expect(screen.getByText("themeLight")).toBeInTheDocument();
      expect(screen.getByText("themeBlue")).toBeInTheDocument();
      expect(screen.getByText("themeCustom")).toBeInTheDocument();
    });

    it("devrait appeler updateTheme au click", () => {
      renderSection();
      fireEvent.click(screen.getByText("themeLight"));
      expect(store.updateTheme).toHaveBeenCalledWith("light");
    });

    it("ne devrait PAS afficher CustomThemeEditor si theme != custom", () => {
      renderSection({ theme: "dark" });
      expect(
        screen.queryByTestId("custom-theme-editor"),
      ).not.toBeInTheDocument();
    });

    it("devrait afficher CustomThemeEditor si theme=custom", () => {
      renderSection({ theme: "custom" });
      expect(screen.getByTestId("custom-theme-editor")).toBeInTheDocument();
    });

    it("devrait appeler updateCustomTheme via save", async () => {
      renderSection({ theme: "custom" });
      fireEvent.click(screen.getByTestId("save-theme-btn"));

      await waitFor(() => {
        expect(store.updateCustomTheme).toHaveBeenCalledWith({
          accent: "#f00",
        });
        expect(addToast).toHaveBeenCalledWith(
          "toastCustomThemeApplied",
          "success",
        );
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // CARD SIZE
  // ════════════════════════════════════════════════════════════════════

  describe("card size", () => {
    it("devrait afficher les 3 tailles", () => {
      renderSection();
      expect(screen.getByText("cardSizeSmall")).toBeInTheDocument();
      expect(screen.getByText("cardSizeMedium")).toBeInTheDocument();
      expect(screen.getByText("cardSizeLarge")).toBeInTheDocument();
    });

    it("devrait appeler updateCardSize au click", () => {
      renderSection();
      fireEvent.click(screen.getByText("cardSizeLarge"));
      expect(store.updateCardSize).toHaveBeenCalledWith("large");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SIDEBAR
  // ════════════════════════════════════════════════════════════════════

  describe("sidebar", () => {
    it("devrait afficher sidebarDefault si mode=default", () => {
      renderSection();
      const txt = document.body.textContent;
      expect(txt).toContain("sidebarDefault");
    });

    it("devrait afficher sidebarCustomized si mode=custom", () => {
      renderSection({ sidebarConfig: { mode: "custom" } });
      const txt = document.body.textContent;
      expect(txt).toContain("sidebarCustomized");
    });

    it("devrait appeler toggleSidebarEditMode au click", () => {
      renderSection();
      fireEvent.click(screen.getByText("sidebarEditorOpen"));
      expect(store.toggleSidebarEditMode).toHaveBeenCalled();
    });

    it("devrait afficher sidebarEditorClose si editMode=true", () => {
      renderSection({ sidebarEditMode: true });
      expect(screen.getByText("sidebarEditorClose")).toBeInTheDocument();
    });

    it("devrait afficher le bouton reset si mode=custom", () => {
      renderSection({ sidebarConfig: { mode: "custom" } });
      expect(screen.getByText("sidebarEditorReset")).toBeInTheDocument();
    });

    it("devrait appeler onResetSidebar au click reset", () => {
      renderSection({ sidebarConfig: { mode: "custom" } });
      fireEvent.click(screen.getByText("sidebarEditorReset"));
      expect(onResetSidebar).toHaveBeenCalled();
    });

    it("ne devrait PAS afficher SidebarEditor si editMode=false", () => {
      renderSection({ sidebarEditMode: false });
      expect(screen.queryByTestId("sidebar-editor")).not.toBeInTheDocument();
    });

    it("devrait afficher SidebarEditor si editMode=true", () => {
      renderSection({ sidebarEditMode: true });
      expect(screen.getByTestId("sidebar-editor")).toBeInTheDocument();
    });

    it("devrait appeler updateSidebarConfig + toggleSidebarEditMode via onSave", async () => {
      renderSection({ sidebarEditMode: true });
      fireEvent.click(screen.getByTestId("save-sidebar-btn"));

      await waitFor(() => {
        expect(store.updateSidebarConfig).toHaveBeenCalledWith({
          mode: "custom",
        });
        expect(store.toggleSidebarEditMode).toHaveBeenCalled();
        expect(addToast).toHaveBeenCalledWith("sidebarEditorSaved", "success");
      });
    });

    it("devrait appeler toggleSidebarEditMode via onCancel", () => {
      renderSection({ sidebarEditMode: true });
      fireEvent.click(screen.getByTestId("cancel-sidebar-btn"));
      expect(store.toggleSidebarEditMode).toHaveBeenCalled();
    });
  });
});
