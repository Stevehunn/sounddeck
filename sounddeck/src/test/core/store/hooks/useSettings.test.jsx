import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettings } from "@core/store/hooks/useSettings";

describe("useSettings", () => {
  let save;
  let electronMock;

  beforeEach(() => {
    vi.clearAllMocks();
    save = vi.fn().mockResolvedValue();

    electronMock = {
      updateToggleShortcutsAccelerator: vi.fn().mockResolvedValue(),
      updateToggleWindowShortcut: vi.fn().mockResolvedValue(),
      updateLoopShortcut: vi.fn().mockResolvedValue(),
      updateStopAllShortcut: vi.fn().mockResolvedValue(),
      updatePresentationShortcut: vi.fn().mockResolvedValue(),
    };
    window.electronAPI = electronMock;
  });

  const renderHookWith = (initialState = {}) =>
    renderHook(() => useSettings(initialState, save));

  // ════════════════════════════════════════════════════════════════════
  // VALEURS PAR DÉFAUT
  // ════════════════════════════════════════════════════════════════════

  describe("valeurs par défaut", () => {
    it("devrait utiliser les valeurs par défaut si initialState vide", () => {
      const { result } = renderHookWith();
      expect(result.current.theme).toBe("dark");
      expect(result.current.lang).toBe("fr");
      expect(result.current.audioDevice).toBe("default");
      expect(result.current.volume).toBe(80);
      expect(result.current.playLocally).toBe(true);
      expect(result.current.previewVolume).toBe(70);
      expect(result.current.keyboardLayout).toBe("qwerty");
      expect(result.current.cardSize).toBe("medium");
      expect(result.current.normalizationEnabled).toBe(true);
      expect(result.current.normalizationTarget).toBe(0.2);
      expect(result.current.autoBackupEnabled).toBe(true);
      expect(result.current.backupInterval).toBe(5);
      expect(result.current.lazyLoadingEnabled).toBe(true);
      expect(result.current.compressOnImport).toBe(false);
      expect(result.current.compressionBitrate).toBe(128);
      expect(result.current.shortcutsEnabled).toBe(true);
      expect(result.current.toggleShortcutsAccelerator).toBe(
        "CommandOrControl+Shift+K",
      );
      expect(result.current.toggleWindowShortcut).toBe(
        "CommandOrControl+Shift+S",
      );
      expect(result.current.loopShortcut).toBe("");
      expect(result.current.stopAllShortcut).toBe("");
      expect(result.current.presentationShortcut).toBe("");
    });

    it("devrait utiliser les valeurs initiales fournies", () => {
      const { result } = renderHookWith({
        theme: "light",
        volume: 50,
        lang: "en",
      });
      expect(result.current.theme).toBe("light");
      expect(result.current.volume).toBe(50);
      expect(result.current.lang).toBe("en");
    });

    it("devrait fallback si valeurs null/undefined", () => {
      const { result } = renderHookWith({
        theme: null,
        volume: undefined,
      });
      expect(result.current.theme).toBe("dark");
      expect(result.current.volume).toBe(80);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // THEME
  // ════════════════════════════════════════════════════════════════════

  describe("updateTheme", () => {
    it("devrait mettre à jour le thème", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(save).toHaveBeenCalledWith("theme", "light");
    });

    it("ne devrait pas planter si save échoue", async () => {
      save.mockRejectedValue(new Error("save failed"));
      const { result } = renderHookWith();

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.updateTheme("light");
        }),
      ).resolves.not.toThrow();

      // Le state est quand même mis à jour
      expect(result.current.theme).toBe("light");
      errorSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // CUSTOM THEME
  // ════════════════════════════════════════════════════════════════════

  describe("updateCustomTheme", () => {
    it("devrait mettre à jour customTheme", async () => {
      const { result } = renderHookWith();
      const colors = { accent: "#ff0000" };

      await act(async () => {
        await result.current.updateCustomTheme(colors);
      });

      expect(result.current.customTheme).toEqual(colors);
      expect(save).toHaveBeenCalledWith("customTheme", colors);
    });

    it('devrait activer theme="custom" si activate=true', async () => {
      const { result } = renderHookWith();
      const colors = { accent: "#ff0000" };

      await act(async () => {
        await result.current.updateCustomTheme(colors, { activate: true });
      });

      expect(result.current.theme).toBe("custom");
      expect(save).toHaveBeenCalledWith("theme", "custom");
    });

    it("ne devrait PAS changer le thème si activate=false", async () => {
      const { result } = renderHookWith();
      const colors = { accent: "#ff0000" };

      await act(async () => {
        await result.current.updateCustomTheme(colors);
      });

      expect(result.current.theme).toBe("dark");
    });

    it("devrait persister theme avant customTheme (ordre réel)", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateCustomTheme({ a: 1 }, { activate: true });
      });

      // ⚠️ Comportement réel : theme d'abord, puis customTheme
      const calls = save.mock.calls.map((c) => c[0]);
      expect(calls.indexOf("theme")).toBeLessThan(calls.indexOf("customTheme"));
    });
  });

  describe("hydrateCustomTheme", () => {
    it("devrait hydrater sans persister", () => {
      const { result } = renderHookWith();
      const colors = { accent: "#abc" };

      act(() => {
        result.current.hydrateCustomTheme(colors);
      });

      expect(result.current.customTheme).toEqual(colors);
      expect(save).not.toHaveBeenCalled();
    });

    it("devrait accepter null", () => {
      const { result } = renderHookWith();

      act(() => {
        result.current.hydrateCustomTheme(null);
      });

      expect(result.current.customTheme).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // LANG
  // ════════════════════════════════════════════════════════════════════

  describe("updateLang", () => {
    it("devrait mettre à jour lang", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateLang("en");
      });

      expect(result.current.lang).toBe("en");
      expect(save).toHaveBeenCalledWith("lang", "en");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // AUDIO DEVICES
  // ════════════════════════════════════════════════════════════════════

  describe("audio devices", () => {
    it("updateAudioDevice devrait mettre à jour audioDevice", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateAudioDevice("CABLE-Input");
      });

      expect(result.current.audioDevice).toBe("CABLE-Input");
      expect(save).toHaveBeenCalledWith("audioDevice", "CABLE-Input");
    });

    it("updateLocalAudioDevice devrait mettre à jour localAudioDevice", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateLocalAudioDevice("Headphones");
      });

      expect(result.current.localAudioDevice).toBe("Headphones");
      expect(save).toHaveBeenCalledWith("localAudioDevice", "Headphones");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VOLUME
  // ════════════════════════════════════════════════════════════════════

  describe("volume", () => {
    it("updateVolume devrait mettre à jour le volume global", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateVolume(45);
      });

      expect(result.current.volume).toBe(45);
      expect(save).toHaveBeenCalledWith("volume", 45);
    });

    it("updatePreviewVolume devrait mettre à jour previewVolume", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updatePreviewVolume(60);
      });

      expect(result.current.previewVolume).toBe(60);
      expect(save).toHaveBeenCalledWith("previewVolume", 60);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PLAY LOCALLY
  // ════════════════════════════════════════════════════════════════════

  describe("updatePlayLocally", () => {
    it("devrait basculer playLocally", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updatePlayLocally(false);
      });

      expect(result.current.playLocally).toBe(false);
      expect(save).toHaveBeenCalledWith("playLocally", false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // KEYBOARD / CARD
  // ════════════════════════════════════════════════════════════════════

  describe("keyboard et card", () => {
    it("updateKeyboardLayout devrait changer le layout", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateKeyboardLayout("azerty");
      });

      expect(result.current.keyboardLayout).toBe("azerty");
      expect(save).toHaveBeenCalledWith("keyboardLayout", "azerty");
    });

    it("updateCardSize devrait changer la taille des cartes", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateCardSize("large");
      });

      expect(result.current.cardSize).toBe("large");
      expect(save).toHaveBeenCalledWith("cardSize", "large");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // NORMALISATION
  // ════════════════════════════════════════════════════════════════════

  describe("normalisation", () => {
    it("updateNormalizationEnabled devrait basculer", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateNormalizationEnabled(false);
      });

      expect(result.current.normalizationEnabled).toBe(false);
      expect(save).toHaveBeenCalledWith("normalizationEnabled", false);
    });

    it("updateNormalizationTarget devrait mettre à jour la cible", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateNormalizationTarget(0.5);
      });

      expect(result.current.normalizationTarget).toBe(0.5);
      expect(save).toHaveBeenCalledWith("normalizationTarget", 0.5);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VIRTUAL DRIVER
  // ════════════════════════════════════════════════════════════════════

  describe("virtual driver", () => {
    it("updateVirtualDriverInstalled devrait mettre à jour", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateVirtualDriverInstalled(true);
      });

      expect(result.current.virtualDriverInstalled).toBe(true);
      expect(save).toHaveBeenCalledWith("virtualDriverInstalled", true);
    });

    it("updateVirtualDeviceActive devrait mettre à jour", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateVirtualDeviceActive(true);
      });

      expect(result.current.virtualDeviceActive).toBe(true);
      expect(save).toHaveBeenCalledWith("virtualDeviceActive", true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // BACKUP
  // ════════════════════════════════════════════════════════════════════

  describe("backup", () => {
    it("updateAutoBackupEnabled devrait basculer", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateAutoBackupEnabled(false);
      });

      expect(result.current.autoBackupEnabled).toBe(false);
      expect(save).toHaveBeenCalledWith("autoBackupEnabled", false);
    });

    it("updateBackupInterval devrait mettre à jour l'intervalle", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateBackupInterval(15);
      });

      expect(result.current.backupInterval).toBe(15);
      expect(save).toHaveBeenCalledWith("backupInterval", 15);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // LAZY LOADING
  // ════════════════════════════════════════════════════════════════════

  describe("updateLazyLoadingEnabled", () => {
    it("devrait basculer le lazy loading", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateLazyLoadingEnabled(false);
      });

      expect(result.current.lazyLoadingEnabled).toBe(false);
      expect(save).toHaveBeenCalledWith("lazyLoadingEnabled", false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // COMPRESSION
  // ════════════════════════════════════════════════════════════════════

  describe("compression", () => {
    it("updateCompressOnImport devrait basculer", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateCompressOnImport(true);
      });

      expect(result.current.compressOnImport).toBe(true);
      expect(save).toHaveBeenCalledWith("compressOnImport", true);
    });

    it("updateCompressionBitrate devrait changer le bitrate", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateCompressionBitrate(256);
      });

      expect(result.current.compressionBitrate).toBe(256);
      expect(save).toHaveBeenCalledWith("compressionBitrate", 256);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SHORTCUTS ENABLED
  // ════════════════════════════════════════════════════════════════════

  describe("updateShortcutsEnabled", () => {
    it("devrait basculer shortcutsEnabled", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateShortcutsEnabled(false);
      });

      expect(result.current.shortcutsEnabled).toBe(false);
      expect(save).toHaveBeenCalledWith("shortcutsEnabled", false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SHORTCUTS (avec IPC)
  // ════════════════════════════════════════════════════════════════════

  describe("shortcuts avec IPC", () => {
    it("updateToggleShortcutsAccelerator devrait appeler l'IPC", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateToggleShortcutsAccelerator("Ctrl+Shift+K");
      });

      expect(result.current.toggleShortcutsAccelerator).toBe("Ctrl+Shift+K");
      expect(save).toHaveBeenCalledWith(
        "toggleShortcutsAccelerator",
        "Ctrl+Shift+K",
      );
      expect(
        electronMock.updateToggleShortcutsAccelerator,
      ).toHaveBeenCalledWith("Ctrl+Shift+K");
    });

    it("updateToggleWindowShortcut devrait appeler l'IPC", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateToggleWindowShortcut("Ctrl+Shift+S");
      });

      expect(result.current.toggleWindowShortcut).toBe("Ctrl+Shift+S");
      expect(electronMock.updateToggleWindowShortcut).toHaveBeenCalledWith(
        "Ctrl+Shift+S",
      );
    });

    it("updateLoopShortcut devrait appeler l'IPC", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateLoopShortcut("Ctrl+L");
      });

      expect(result.current.loopShortcut).toBe("Ctrl+L");
      expect(electronMock.updateLoopShortcut).toHaveBeenCalledWith("Ctrl+L");
    });

    it("updateStopAllShortcut devrait appeler l'IPC", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updateStopAllShortcut("Ctrl+Shift+X");
      });

      expect(result.current.stopAllShortcut).toBe("Ctrl+Shift+X");
      expect(electronMock.updateStopAllShortcut).toHaveBeenCalledWith(
        "Ctrl+Shift+X",
      );
    });

    it("updatePresentationShortcut devrait appeler l'IPC", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.updatePresentationShortcut("F11");
      });

      expect(result.current.presentationShortcut).toBe("F11");
      expect(electronMock.updatePresentationShortcut).toHaveBeenCalledWith(
        "F11",
      );
    });

    it("ne devrait pas planter si electronAPI absent", async () => {
      delete window.electronAPI;
      const { result } = renderHookWith();

      await expect(
        act(async () => {
          await result.current.updateLoopShortcut("Ctrl+L");
        }),
      ).resolves.not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // START MINIMIZED / LAUNCH AT STARTUP
  // ════════════════════════════════════════════════════════════════════

  describe("start et launch", () => {
    it("setStartMinimized devrait mettre à jour", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.setStartMinimized(true);
      });

      expect(result.current.startMinimized).toBe(true);
      expect(save).toHaveBeenCalledWith("startMinimized", true);
    });

    it("setLaunchAtStartup devrait mettre à jour", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.setLaunchAtStartup(true);
      });

      expect(result.current.launchAtStartup).toBe(true);
      expect(save).toHaveBeenCalledWith("launchAtStartup", true);
    });
  });
});
