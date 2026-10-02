import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@shared/components/modals/FeedbackModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="feedback-modal">
      <button onClick={onClose}>close-feedback</button>
    </div>
  ),
}));

vi.mock("@shared/components/ui", () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-logs-btn" onClick={onDelete}>
      Delete
    </button>
  ),
}));

import AdvancedSection from "@features/options/sections/AdvancedSection";

describe("AdvancedSection", () => {
  let store;
  let addToast;

  beforeEach(() => {
    vi.clearAllMocks();
    store = {
      compressOnImport: false,
      compressionBitrate: 128,
      updateCompressOnImport: vi.fn(),
      updateCompressionBitrate: vi.fn(),
    };
    addToast = vi.fn();
  });

  const renderSection = (overrides = {}) =>
    render(
      <AdvancedSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
        onClearLogs={vi.fn()}
        onExportLogs={vi.fn()}
      />,
    );

  it("devrait afficher le titre advancedOptions", () => {
    renderSection();
    expect(screen.getByText("advancedOptions")).toBeInTheDocument();
  });

  it("devrait afficher le toggle compressOnImport", () => {
    renderSection();
    expect(screen.getByText("compressOnImport")).toBeInTheDocument();
  });

  it("devrait appeler updateCompressOnImport au click", () => {
    const { container } = renderSection();
    const toggle = container.querySelector(".toggle");
    fireEvent.click(toggle);
    expect(store.updateCompressOnImport).toHaveBeenCalledWith(true);
  });

  it("devrait afficher un toast quand on active/désactive", async () => {
    const { container } = renderSection();
    fireEvent.click(container.querySelector(".toggle"));

    // ⚠️ updateCompressOnImport est async → le toast part dans un microtask
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("compressOnImportEnabled", "info");
    });
  });

  it("ne devrait PAS afficher le select bitrate si désactivé", () => {
    renderSection({ compressOnImport: false });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("devrait afficher le select bitrate si activé", () => {
    renderSection({ compressOnImport: true });
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("devrait appeler updateCompressionBitrate au change", () => {
    renderSection({ compressOnImport: true });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "256" },
    });
    expect(store.updateCompressionBitrate).toHaveBeenCalledWith(256);
  });

  it("devrait afficher errorLogs", () => {
    renderSection();
    expect(screen.getByText("errorLogs")).toBeInTheDocument();
  });

  it("devrait appeler onExportLogs", () => {
    const onExportLogs = vi.fn();
    render(
      <AdvancedSection
        sectionRef={() => {}}
        store={store}
        addToast={addToast}
        onClearLogs={vi.fn()}
        onExportLogs={onExportLogs}
      />,
    );
    fireEvent.click(screen.getByText("exportLogs"));
    expect(onExportLogs).toHaveBeenCalled();
  });

  it("devrait appeler onClearLogs via DeleteButton", () => {
    const onClearLogs = vi.fn();
    render(
      <AdvancedSection
        sectionRef={() => {}}
        store={store}
        addToast={addToast}
        onClearLogs={onClearLogs}
        onExportLogs={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("delete-logs-btn"));
    expect(onClearLogs).toHaveBeenCalled();
  });

  it("devrait ouvrir FeedbackModal au click", () => {
    renderSection();
    fireEvent.click(screen.getByText("feedbackSend"));
    expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();
  });

  it("devrait fermer FeedbackModal via onClose", () => {
    renderSection();
    fireEvent.click(screen.getByText("feedbackSend"));
    fireEvent.click(screen.getByText("close-feedback"));
    expect(screen.queryByTestId("feedback-modal")).not.toBeInTheDocument();
  });
});
