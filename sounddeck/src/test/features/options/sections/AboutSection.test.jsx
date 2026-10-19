// src/test/features/options/sections/AboutSection.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

import AboutSection from "@features/options/sections/AboutSection";

describe("AboutSection", () => {
  let openExternal;
  let storeGet;

  beforeEach(() => {
    openExternal = vi.fn();
    // Default: store returns "1.4.11" (typical packaged build)
    storeGet = vi.fn().mockResolvedValue("1.4.11");
    window.electronAPI = { openExternal, storeGet };
  });

  const renderSection = () => {
    const sectionRef = { current: null };
    return render(<AboutSection sectionRef={sectionRef} />);
  };

  // ─── VERSION ──────────────────────────────────────────────────────────

  it("affiche la version lue depuis le store", async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByText(/v1\.4\.11/)).toBeInTheDocument();
    });
  });

  it("appelle storeGet('appVersion') au montage", () => {
    renderSection();
    expect(storeGet).toHaveBeenCalledWith("appVersion");
  });

  it('affiche "?" si le store ne renvoie rien', async () => {
    storeGet.mockResolvedValue(null);
    renderSection();
    await waitFor(() => {
      expect(screen.getByText(/v\?/)).toBeInTheDocument();
    });
  });

  it('affiche "?" si storeGet throw', async () => {
    storeGet.mockRejectedValue(new Error("boom"));
    renderSection();
    await waitFor(() => {
      expect(screen.getByText(/v\?/)).toBeInTheDocument();
    });
  });

  it("affiche un placeholder tant que la version est en cours de chargement", () => {
    // Never-resolving promise → version stays null → "…" is shown
    storeGet.mockReturnValue(new Promise(() => {}));
    renderSection();
    expect(screen.getByText(/v…/)).toBeInTheDocument();
  });

  // ─── LICENCE / SOURCE / FOOTER ───────────────────────────────────────

  it("affiche la licence MIT", () => {
    renderSection();
    expect(screen.getByText("aboutLicense")).toBeInTheDocument();
    expect(screen.getByText("aboutLicenseValue")).toBeInTheDocument();
  });

  it("affiche le bouton source code", () => {
    renderSection();
    expect(screen.getByText("aboutSourceCode")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("ouvre GitHub au clic", () => {
    renderSection();
    fireEvent.click(screen.getByText("GitHub"));
    expect(openExternal).toHaveBeenCalledWith(
      expect.stringContaining("github.com"),
    );
  });

  it('affiche le message "made with love"', () => {
    renderSection();
    expect(screen.getByText("aboutMadeWith")).toBeInTheDocument();
    expect(screen.getByText("aboutOpenSource")).toBeInTheDocument();
  });
});