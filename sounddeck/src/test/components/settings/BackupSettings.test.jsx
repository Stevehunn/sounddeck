// src/test/components/settings/BackupSettings.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
  getBackupList: vi.fn(),
  restoreBackup: vi.fn(),
  exportBackups: vi.fn(),
  importBackups: vi.fn(),
  performBackup: vi.fn(),
  deleteBackup: vi.fn(),
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@shared/hooks/useConfirm", () => ({
  default: () => ({ confirm: mocks.confirm, ConfirmWrapper: () => null }),
}));

vi.mock("@shared/components/ui", () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-btn" onClick={onDelete}>
      del
    </button>
  ),
}));

vi.mock("@shared/utils/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@shared/utils/backupManager", () => ({
  getBackupList: mocks.getBackupList,
  restoreBackup: mocks.restoreBackup,
  exportBackups: mocks.exportBackups,
  importBackups: mocks.importBackups,
  performBackup: mocks.performBackup,
  deleteBackup: mocks.deleteBackup,
}));

import BackupSettings from "@shared/components/settings/BackupSettings";

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeBackup = (overrides = {}) => ({
  timestamp: Date.now(),
  version: "1.1",
  sounds: [{ id: "s1" }, { id: "s2" }],
  profiles: [{ id: "all" }],
  ...overrides,
});

const defaultProps = (overrides = {}) => ({
  store: { sounds: [], profiles: [] },
  addToast: vi.fn(),
  lang: "fr",
  ...overrides,
});

beforeEach(() => {
  mocks.confirm.mockReset().mockResolvedValue(true);
  mocks.getBackupList.mockReset().mockResolvedValue([]);
  mocks.restoreBackup.mockReset().mockResolvedValue({ success: true });
  mocks.exportBackups
    .mockReset()
    .mockResolvedValue({ success: true, path: "/out.json" });
  mocks.importBackups
    .mockReset()
    .mockResolvedValue({ success: true, count: 3 });
  mocks.performBackup.mockReset().mockResolvedValue({ success: true });
  mocks.deleteBackup.mockReset().mockResolvedValue({ success: true });
});

const renderSettings = (props = {}) =>
  render(<BackupSettings {...defaultProps(props)} />);

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > Rendu", () => {
  it("affiche le titre", () => {
    renderSettings();
    expect(screen.getByText("backupSettings")).toBeInTheDocument();
  });

  it("affiche le count 0 si pas de backups", async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  it('affiche "Aucune sauvegarde" si liste vide', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText("noBackups")).toBeInTheDocument();
    });
  });

  it("affiche les backups triés en ordre inverse", async () => {
    mocks.getBackupList.mockResolvedValue([
      makeBackup({ timestamp: 1000 }),
      makeBackup({ timestamp: 2000 }),
      makeBackup({ timestamp: 3000 }),
    ]);
    renderSettings();

    await waitFor(() => {
      // Les boutons "delete" sont visibles (3 backups)
      const delBtns = screen.getAllByTestId("delete-btn");
      expect(delBtns.length).toBe(3);
    });
  });

  it("appelle getBackupList au mount", async () => {
    renderSettings();
    await waitFor(() => {
      expect(mocks.getBackupList).toHaveBeenCalled();
    });
  });

  it("affiche 3 boutons d'action", () => {
    renderSettings();
    expect(screen.getByText("backupNow")).toBeInTheDocument();
    expect(screen.getByText("exportBackups")).toBeInTheDocument();
    expect(screen.getByText("importBackups")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BACKUP NOW
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > handleBackupNow", () => {
  it("appelle performBackup et toast success", async () => {
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("backupNow"));

    await waitFor(() => {
      expect(mocks.performBackup).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith("backupSuccess", "success");
    });
  });

  it("toast error si performBackup échoue", async () => {
    mocks.performBackup.mockResolvedValue({
      success: false,
      error: "disk full",
    });
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("backupNow"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("disk full", "error");
    });
  });

  it("gère une exception performBackup", async () => {
    mocks.performBackup.mockRejectedValue(new Error("crash"));
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("backupNow"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("crash", "error");
    });
  });

  it("recharge la liste après succès", async () => {
    mocks.getBackupList.mockClear();
    renderSettings();

    fireEvent.click(screen.getByText("backupNow"));

    await waitFor(() => {
      // 1 appel au mount + 1 après backup
      expect(mocks.getBackupList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// RESTORE
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > handleRestore", () => {
  const setupWithBackup = () => {
    mocks.getBackupList.mockResolvedValue([makeBackup()]);
    return renderSettings();
  };

  it("ouvre le confirm au clic sur Restore", async () => {
    setupWithBackup();
    await waitFor(() => screen.getByText("restore"));

    fireEvent.click(screen.getByText("restore"));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
    });
  });

  it("confirme → restoreBackup + toast + reload", async () => {
    mocks.getBackupList.mockResolvedValue([makeBackup()]);
    const addToast = vi.fn();
    renderSettings({ addToast });

    await waitFor(() => screen.getByText("restore"));

    fireEvent.click(screen.getByText("restore"));

    await waitFor(() => {
      expect(mocks.restoreBackup).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith("backupRestored", "success");
    });
  });

  it("annule → pas de restore", async () => {
    mocks.confirm.mockResolvedValue(false);
    setupWithBackup();
    await waitFor(() => screen.getByText("restore"));

    fireEvent.click(screen.getByText("restore"));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
    });
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > handleDelete", () => {
  it("appelle deleteBackup et toast success", async () => {
    mocks.getBackupList.mockResolvedValue([makeBackup()]);
    const addToast = vi.fn();
    renderSettings({ addToast });
    await waitFor(() => screen.getByTestId("delete-btn"));

    fireEvent.click(screen.getByTestId("delete-btn"));

    await waitFor(() => {
      expect(mocks.deleteBackup).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith("backupDeleted", "success");
    });
  });

  it("toast error si deleteBackup échoue", async () => {
    mocks.getBackupList.mockResolvedValue([makeBackup()]);
    mocks.deleteBackup.mockResolvedValue({
      success: false,
      error: "not found",
    });
    const addToast = vi.fn();
    renderSettings({ addToast });
    await waitFor(() => screen.getByTestId("delete-btn"));

    fireEvent.click(screen.getByTestId("delete-btn"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("not found", "error");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > handleExport", () => {
  it("toast success si export réussi", async () => {
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("exportBackups"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("backupsExported", "success");
    });
  });

  it("silence si annulé", async () => {
    mocks.exportBackups.mockResolvedValue({ success: false, canceled: true });
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("exportBackups"));

    await waitFor(() => {
      expect(mocks.exportBackups).toHaveBeenCalled();
    });
    expect(addToast).not.toHaveBeenCalled();
  });

  it("toast error si échec", async () => {
    mocks.exportBackups.mockResolvedValue({
      success: false,
      error: "permission denied",
    });
    const addToast = vi.fn();
    renderSettings({ addToast });

    fireEvent.click(screen.getByText("exportBackups"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("permission denied", "error");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > handleImport", () => {
  it("crée un input file au clic", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    renderSettings();

    fireEvent.click(screen.getByText("importBackups"));

    expect(createElementSpy).toHaveBeenCalledWith("input");
    createElementSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Event refresh-backups
// ═══════════════════════════════════════════════════════════════════════
describe("BackupSettings > Event refresh", () => {
  it('écoute "refresh-backups" et reload', async () => {
    renderSettings();
    await waitFor(() => expect(mocks.getBackupList).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new CustomEvent("refresh-backups"));
    });

    await waitFor(() => {
      expect(mocks.getBackupList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("retire le listener au unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderSettings();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "refresh-backups",
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });
});
