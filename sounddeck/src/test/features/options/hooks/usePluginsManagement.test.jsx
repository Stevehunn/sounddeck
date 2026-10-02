import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => ({
  pluginManager: {
    getLoadedPlugins: vi.fn(() => []),
    getDisabledPlugins: vi.fn(() => []),
    unloadPlugin: vi.fn(),
    enablePlugin: vi.fn(),
  },
  refreshPlugins: vi.fn(),
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k) => {
      // Simule les placeholders {name} pour que .replace() fonctionne
      if (k === "pluginsUninstallSuccess") return "Uninstalled {name}";
      if (k === "pluginsEnableSuccess") return "Enabled {name}";
      return k;
    },
    currentLang: "fr",
  }),
}));

vi.mock("@core/plugins/PluginContext", () => ({
  usePlugins: () => ({
    pluginManager: mocks.pluginManager,
    refresh: mocks.refreshPlugins,
  }),
}));

vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { usePluginsManagement } from "@features/options/hooks/usePluginsManagement";

describe("usePluginsManagement", () => {
  let addToast;

  beforeEach(() => {
    vi.clearAllMocks();
    addToast = vi.fn();

    mocks.pluginManager.getLoadedPlugins.mockReturnValue([
      { id: "youtube", name: "YouTube", version: "1.0.0" },
    ]);
    mocks.pluginManager.getDisabledPlugins.mockReturnValue([]);
    mocks.pluginManager.unloadPlugin.mockResolvedValue(true);
    mocks.pluginManager.enablePlugin.mockResolvedValue(true);

    window.electronAPI = {
      uninstallPlugin: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  const renderHookWith = () =>
    renderHook(() => usePluginsManagement({ addToast }));

  // ─── ÉTAT INITIAL ───────────────────────────────────────────────────

  it("devrait exposer plugins/disabledPlugins/loadPlugins", () => {
    const { result } = renderHookWith();
    expect(Array.isArray(result.current.plugins)).toBe(true);
    expect(Array.isArray(result.current.disabledPlugins)).toBe(true);
    expect(typeof result.current.loadPlugins).toBe("function");
    expect(typeof result.current.handlePluginUninstall).toBe("function");
    expect(typeof result.current.handlePluginEnable).toBe("function");
  });

  it("devrait charger les plugins au mount", async () => {
    renderHookWith();
    await waitFor(() => {
      expect(mocks.pluginManager.getLoadedPlugins).toHaveBeenCalled();
      expect(mocks.pluginManager.getDisabledPlugins).toHaveBeenCalled();
    });
  });

  it("devrait peupler plugins avec les données du manager", async () => {
    const { result } = renderHookWith();
    await waitFor(() => {
      expect(result.current.plugins).toHaveLength(1);
      expect(result.current.plugins[0].id).toBe("youtube");
    });
  });

  // ─── handlePluginUninstall ──────────────────────────────────────────

  it("devrait appeler unloadPlugin avec permanent:true", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: "myinstants",
        name: "MyInstants",
        isIntegrated: true,
      });
    });

    expect(mocks.pluginManager.unloadPlugin).toHaveBeenCalledWith(
      "myinstants",
      {
        permanent: true,
      },
    );
  });

  it("ne devrait PAS appeler uninstallPlugin IPC si isIntegrated", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: "integrated",
        isIntegrated: true,
      });
    });

    expect(window.electronAPI.uninstallPlugin).not.toHaveBeenCalled();
  });

  it("devrait appeler uninstallPlugin IPC si non intégré", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: "custom-plugin",
        isIntegrated: false,
      });
    });

    expect(window.electronAPI.uninstallPlugin).toHaveBeenCalledWith(
      "custom-plugin",
    );
  });

  it("devrait appeler refresh et addToast succès", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: "p1",
        name: "Plugin 1",
        isIntegrated: false,
      });
    });

    expect(mocks.refreshPlugins).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith("Uninstalled Plugin 1", "info");
  });

  it("devrait utiliser nameKey si présent", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({
        id: "p1",
        nameKey: "pluginNameYouTube",
      });
    });

    // Le toast reçoit le résultat de t(pluginNameYouTube) = 'pluginNameYouTube'
    const call = addToast.mock.calls[0];
    expect(call[0]).toContain("pluginNameYouTube");
  });

  it("devrait gérer une erreur unloadPlugin", async () => {
    mocks.pluginManager.unloadPlugin.mockRejectedValue(new Error("boom"));

    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginUninstall({ id: "p1" });
    });

    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining("pluginsUninstallError"),
      "error",
    );
  });

  // ─── handlePluginEnable ─────────────────────────────────────────────

  it("devrait appeler enablePlugin et afficher un toast succès", async () => {
    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginEnable({
        id: "p1",
        name: "Plugin 1",
      });
    });

    expect(mocks.pluginManager.enablePlugin).toHaveBeenCalledWith("p1");
    expect(addToast).toHaveBeenCalledWith("Enabled Plugin 1", "success");
  });

  it("devrait afficher une erreur si enablePlugin retourne false", async () => {
    mocks.pluginManager.enablePlugin.mockResolvedValue(false);

    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginEnable({ id: "p1", name: "P1" });
    });

    expect(addToast).toHaveBeenCalledWith("pluginsEnableError", "error");
  });

  it("devrait gérer une exception enablePlugin", async () => {
    mocks.pluginManager.enablePlugin.mockRejectedValue(new Error("crash"));

    const { result } = renderHookWith();
    await waitFor(() =>
      expect(result.current.plugins.length).toBeGreaterThan(0),
    );

    await act(async () => {
      await result.current.handlePluginEnable({ id: "p1" });
    });

    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining("pluginsEnableError"),
      "error",
    );
  });
});
