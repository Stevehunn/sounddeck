// electron/modules/shortcutManager.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./windowManager", () => ({
  getMainWindow: vi.fn(),
}));

import {
  registerShortcuts,
  reregisterShortcuts,
  toggleGlobalShortcuts,
  registerToggleShortcut,
  registerToggleWindowShortcut,
  getShortcutsEnabled,
  getRegisteredShortcuts,
  cleanupShortcuts,
  unregisterAllShortcuts,
  registerShortcutHandlers,
} from "./shortcutManager";
import { getMainWindow } from "./windowManager";
import { getIpcHandler, getRegisteredChannels } from "./__test-helpers__";

// ✅ Récupère les références dans le beforeEach (PAS au top-level)
//    car globalThis.__electronMock n'est disponible qu'après chargement du setup.

describe("shortcutManager", () => {
  let mockWindow;
  let globalShortcut;
  let store;

  beforeEach(() => {
    // ✅ Récupère les références ICI
    globalShortcut = globalThis.__electronMock.globalShortcut;
    store = globalThis.__storeMock;

    cleanupShortcuts();
    vi.clearAllMocks();

    store._data.clear();

    globalShortcut.register.mockReturnValue(true);
    globalShortcut.isRegistered.mockReturnValue(false);

    mockWindow = {
      webContents: { send: vi.fn() },
      isVisible: vi.fn(() => true),
      hide: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
    };
    getMainWindow.mockReturnValue(mockWindow);
  });

  // ═══════════════════════════════════════════════════════════════════
  // registerShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("registerShortcuts", () => {
    it("devrait enregistrer les raccourcis de sons", () => {
      store._data.set("shortcuts", {
        "sound-1": "Ctrl+1",
        "sound-2": "Ctrl+2",
      });

      registerShortcuts(mockWindow);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+1",
        expect.any(Function),
      );
      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+2",
        expect.any(Function),
      );
    });

    it('devrait appeler webContents.send("play-sound") au déclenchement', () => {
      store._data.set("shortcuts", { "sound-1": "Ctrl+1" });

      registerShortcuts(mockWindow);

      const call = globalShortcut.register.mock.calls.find(
        (c) => c[0] === "Ctrl+1",
      );
      expect(call).toBeDefined();
      call[1]();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "play-sound",
        "sound-1",
      );
    });

    it("devrait ignorer les raccourcis vides", () => {
      store._data.set("shortcuts", { "sound-1": "", "sound-2": null });

      registerShortcuts(mockWindow);

      expect(globalShortcut.register).not.toHaveBeenCalled();
    });

    it("devrait enregistrer le raccourci profil", () => {
      store._data.set("profileShortcut", "Ctrl+Tab");

      registerShortcuts(mockWindow);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+Tab",
        expect.any(Function),
      );
    });

    it('devrait envoyer "switch-profile" au déclenchement', () => {
      store._data.set("profileShortcut", "Ctrl+Tab");

      registerShortcuts(mockWindow);

      const call = globalShortcut.register.mock.calls.find(
        (c) => c[0] === "Ctrl+Tab",
      );
      expect(call).toBeDefined();
      call[1]();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "switch-profile",
      );
    });

    it("devrait enregistrer loop/stopAll/presentation shortcuts", () => {
      store._data.set("loopShortcut", "Ctrl+L");
      store._data.set("stopAllShortcut", "Ctrl+S");
      store._data.set("presentationShortcut", "Ctrl+P");

      registerShortcuts(mockWindow);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+L",
        expect.any(Function),
      );
      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+S",
        expect.any(Function),
      );
      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+P",
        expect.any(Function),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // unregisterAllShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("unregisterAllShortcuts", () => {
    it("devrait désenregistrer tous les raccourcis", () => {
      store._data.set("shortcuts", { "sound-1": "Ctrl+1" });
      registerShortcuts(mockWindow);

      unregisterAllShortcuts();

      expect(globalShortcut.unregister).toHaveBeenCalledWith("Ctrl+1");
    });

    it("devrait vider la liste interne", () => {
      store._data.set("shortcuts", { "sound-1": "Ctrl+1" });
      registerShortcuts(mockWindow);

      unregisterAllShortcuts();

      expect(getRegisteredShortcuts()).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // registerToggleShortcut
  // ═══════════════════════════════════════════════════════════════════

  describe("registerToggleShortcut", () => {
    it("devrait enregistrer le raccourci toggle", () => {
      store._data.set("toggleShortcutsAccelerator", "Ctrl+Shift+K");

      registerToggleShortcut(mockWindow);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+Shift+K",
        expect.any(Function),
      );
    });

    it("devrait utiliser la valeur par défaut si absente", () => {
      registerToggleShortcut(mockWindow);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "CommandOrControl+Shift+K",
        expect.any(Function),
      );
    });

    it("ne devrait rien faire si accelerator vide", () => {
      store._data.set("toggleShortcutsAccelerator", "");

      registerToggleShortcut(mockWindow);

      // Le unregister est appelé mais pas register
      expect(globalShortcut.register).not.toHaveBeenCalled();
    });

    it("devrait gérer un échec d'enregistrement", () => {
      globalShortcut.register.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      registerToggleShortcut(mockWindow);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // registerToggleWindowShortcut
  // ═══════════════════════════════════════════════════════════════════

  describe("registerToggleWindowShortcut", () => {
    it("devrait enregistrer le raccourci toggle window", () => {
      registerToggleWindowShortcut(mockWindow, "Ctrl+Shift+S");

      expect(globalShortcut.register).toHaveBeenCalledWith(
        "Ctrl+Shift+S",
        expect.any(Function),
      );
    });

    it("devrait toggle la fenêtre au déclenchement (visible → hide)", () => {
      mockWindow.isVisible.mockReturnValue(true);

      registerToggleWindowShortcut(mockWindow, "Ctrl+Shift+S");

      const call = globalShortcut.register.mock.calls.find(
        (c) => c[0] === "Ctrl+Shift+S",
      );
      expect(call).toBeDefined();
      call[1]();

      expect(mockWindow.hide).toHaveBeenCalled();
    });

    it("devrait toggle la fenêtre au déclenchement (cachée → show + focus)", () => {
      mockWindow.isVisible.mockReturnValue(false);

      registerToggleWindowShortcut(mockWindow, "Ctrl+Shift+S");

      const call = globalShortcut.register.mock.calls.find(
        (c) => c[0] === "Ctrl+Shift+S",
      );
      expect(call).toBeDefined();
      call[1]();

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it("devrait gérer un échec d'enregistrement", () => {
      globalShortcut.register.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      registerToggleWindowShortcut(mockWindow, "Ctrl+X");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // reregisterShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("reregisterShortcuts", () => {
    it("devrait désenregistrer puis réenregistrer", () => {
      store._data.set("globalShortcutsEnabled", true);
      store._data.set("shortcuts", { "sound-1": "Ctrl+1" });

      // ✅ 1. On enregistre D'ABORD pour peupler registeredShortcuts
      registerShortcuts(mockWindow);

      // ✅ 2. Puis on reregister → il doit unregister puis re-register
      reregisterShortcuts(mockWindow);

      expect(globalShortcut.unregister).toHaveBeenCalledWith("Ctrl+1");
      expect(globalShortcut.register).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // cleanupShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("cleanupShortcuts", () => {
    it("devrait appeler unregisterAll", () => {
      cleanupShortcuts();
      expect(globalShortcut.unregisterAll).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // queries
  // ═══════════════════════════════════════════════════════════════════

  describe("queries", () => {
    it("getShortcutsEnabled devrait retourner l'état", () => {
      expect(typeof getShortcutsEnabled()).toBe("boolean");
    });

    it("getRegisteredShortcuts devrait retourner la liste", () => {
      expect(Array.isArray(getRegisteredShortcuts())).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // registerShortcutHandlers (IPC)
  // ═══════════════════════════════════════════════════════════════════

  describe("registerShortcutHandlers", () => {
    beforeEach(() => {
      registerShortcutHandlers();
    });

    it("devrait enregistrer tous les handlers IPC", () => {
      const channels = getRegisteredChannels();
      expect(channels).toContain("update-shortcuts");
      expect(channels).toContain("update-profile-shortcut");
      expect(channels).toContain("update-loop-shortcut");
      expect(channels).toContain("update-stop-all-shortcut");
      expect(channels).toContain("update-presentation-shortcut");
      expect(channels).toContain("update-toggle-shortcuts-accelerator");
      expect(channels).toContain("update-toggle-window-shortcut");
      expect(channels).toContain("toggle-global-shortcuts");
    });

    it("update-shortcuts devrait sauvegarder", () => {
      const handler = getIpcHandler("update-shortcuts");
      const result = handler({}, { "sound-1": "Ctrl+1" });

      expect(result).toBe(true);
      expect(store._data.get("shortcuts")).toEqual({ "sound-1": "Ctrl+1" });
    });

    it("update-profile-shortcut devrait sauvegarder", () => {
      const handler = getIpcHandler("update-profile-shortcut");
      handler({}, "Ctrl+P");
      expect(store._data.get("profileShortcut")).toBe("Ctrl+P");
    });

    it("toggle-global-shortcuts devrait retourner l'état", () => {
      const handler = getIpcHandler("toggle-global-shortcuts");
      const result = handler();
      expect(typeof result).toBe("boolean");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // toggleGlobalShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("toggleGlobalShortcuts", () => {
    it("devrait basculer l'état et sauvegarder", () => {
      store._data.set("globalShortcutsEnabled", true);

      const before = getShortcutsEnabled();
      const result = toggleGlobalShortcuts(mockWindow);

      expect(typeof result).toBe("boolean");
      expect(result).toBe(!before);
      expect(store._data.get("globalShortcutsEnabled")).toBe(result);

      // Restaurer
      toggleGlobalShortcuts(mockWindow);
    });

    it("devrait notifier le renderer", () => {
      toggleGlobalShortcuts(mockWindow);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "shortcuts-toggle",
        expect.any(Boolean),
      );

      // Restaurer
      toggleGlobalShortcuts(mockWindow);
    });
  });
});
