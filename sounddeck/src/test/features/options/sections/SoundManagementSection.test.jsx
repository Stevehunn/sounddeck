import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

import SoundManagementSection from "@features/options/sections/SoundManagementSection";

describe("SoundManagementSection", () => {
  let store;
  let addToast;

  beforeEach(() => {
    vi.clearAllMocks();
    store = {
      normalizationEnabled: true,
      normalizationTarget: 0.2,
      updateNormalizationEnabled: vi.fn(),
      updateNormalizationTarget: vi.fn(),
      resetGainCache: vi.fn().mockResolvedValue(),
    };
    addToast = vi.fn();
  });

  const renderSection = (overrides = {}) =>
    render(
      <SoundManagementSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
      />,
    );

  it("devrait afficher le titre soundManagement", () => {
    renderSection();
    expect(screen.getByText("soundManagement")).toBeInTheDocument();
  });

  it("devrait afficher le toggle normalisation actif", () => {
    const { container } = renderSection();
    const toggle = container.querySelector(".toggle");
    expect(toggle.className).toContain("active");
  });

  it("devrait appeler updateNormalizationEnabled au click", () => {
    const { container } = renderSection();
    fireEvent.click(container.querySelector(".toggle"));
    expect(store.updateNormalizationEnabled).toHaveBeenCalledWith(false);
  });

  it("ne devrait PAS afficher le slider si normalizationEnabled=false", () => {
    renderSection({ normalizationEnabled: false });
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("devrait afficher le slider si normalizationEnabled=true", () => {
    renderSection({ normalizationEnabled: true });
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("devrait afficher le calcul dB (-14 dB pour 0.2)", () => {
    renderSection({ normalizationTarget: 0.2 });
    // -20 * log10(0.2) ≈ 14 dB
    expect(screen.getByText(/-14 dB/)).toBeInTheDocument();
  });

  it("devrait appeler updateNormalizationTarget au change du slider", () => {
    renderSection();
    fireEvent.change(screen.getByRole("slider"), {
      target: { value: "0.5" },
    });
    expect(store.updateNormalizationTarget).toHaveBeenCalledWith(0.5);
  });

  it("devrait afficher le conseil low si target < 0.15", () => {
    renderSection({ normalizationTarget: 0.1 });
    expect(screen.getByText(/normalizationAdviceLow/)).toBeInTheDocument();
  });

  it("devrait afficher le conseil high si target >= 0.6", () => {
    renderSection({ normalizationTarget: 0.8 });
    expect(screen.getByText(/normalizationAdviceHigh/)).toBeInTheDocument();
  });

  it("devrait appeler resetGainCache au click", async () => {
    renderSection();
    // ⚠️ "reanalyzeGains" apparaît 2× (label + bouton) → on cible le bouton
    const buttons = screen.getAllByText("reanalyzeGains");
    const resetBtn = buttons.find((el) => el.closest("button"));
    fireEvent.click(resetBtn);
    expect(store.resetGainCache).toHaveBeenCalled();
  });

  it("devrait afficher un toast après reset", async () => {
    renderSection();
    const buttons = screen.getAllByText("reanalyzeGains");
    const resetBtn = buttons.find((el) => el.closest("button"));
    fireEvent.click(resetBtn);
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("gainCacheCleared", "info");
    });
  });
});
