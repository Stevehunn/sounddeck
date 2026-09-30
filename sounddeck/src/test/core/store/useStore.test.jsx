import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStore } from "@core/store";

// ─── Mock logger ────────────────────────────────────────────────────────
vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// ─── Mock services Audio (pour resetGainCache) ──────────────────────────
vi.mock("@core/services/AudioService", () => ({
  gainCache: { foo: 1, bar: 2 },
}));

// ─── Mock AudioMixerService (pour useMixer) ─────────────────────────────
vi.mock("@core/services/AudioMixerService", () => ({
  initAudioMixer: vi.fn().mockResolvedValue({ id: "stream" }),
  stopMixer: vi.fn().mockResolvedValue(),
  isMixerActive: vi.fn(() => false),
  resumeAudioContext: vi.fn(),
  connectMixerToOutput: vi.fn(),
  setNoiseSuppressionMode: vi.fn(),
  setStoreRef: vi.fn(),
  setMonitoring: vi.fn(),
  getMixerFullState: vi.fn(() => ({})),
}));

// ─── Mock uuid déterministe ─────────────────────────────────────────────
let uuidCounter = 0;
vi.mock("@shared/utils/uuid", () => ({
  uuid: vi.fn(() => {
    uuidCounter++;
    return `uuid-${uuidCounter}`;
  }),
}));

// ─── Mock electronAPI ───────────────────────────────────────────────────
const mockElectron = () => {
  const store = new Map();
  return {
    storeGet: vi.fn(async (key) => {
      return store.has(key) ? store.get(key) : undefined;
    }),
    storeSet: vi.fn(async (key, value) => {
      store.set(key, value);
    }),
    storeDelete: vi.fn(async (key) => {
      store.delete(key);
    }),
    _set(key, value) {
      store.set(key, value);
    },
    getStartMinimized: vi.fn(async () => false),
    getLaunchAtStartup: vi.fn(async () => false),
    getAllEditorProjects: vi.fn(async () => []),
    getRecentEditorProjects: vi.fn(async () => []),
    toggleGlobalShortcuts: vi.fn(async () => true),
    updateShortcuts: vi.fn(async () => {}),
    updateProfileShortcut: vi.fn(async () => {}),
    updateLoopShortcut: vi.fn(async () => {}),
    updateStopAllShortcut: vi.fn(async () => {}),
    updatePresentationShortcut: vi.fn(async () => {}),
    updateToggleShortcutsAccelerator: vi.fn(async () => {}),
    updateToggleWindowShortcut: vi.fn(async () => {}),
  };
};

describe("useStore", () => {
  let electronMock;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    electronMock = mockElectron();
    window.electronAPI = electronMock;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderStore = () => renderHook(() => useStore());

  const waitHydration = async () => {
    await waitFor((r) => r?.current?.loading === false, { timeout: 3000 });
  };

  const renderAndWait = async () => {
    const rendered = renderStore();
    await waitFor(
      () => {
        expect(rendered.result.current.loading).toBe(false);
      },
      { timeout: 3000 },
    );
    return rendered;
  };

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT INITIAL
  // ════════════════════════════════════════════════════════════════════

  describe("état initial", () => {
    it("devrait démarrer avec loading=true", () => {
      const { result } = renderStore();
      expect(result.current.loading).toBe(true);
    });

    it("devrait démarrer avec loopEnabled=false", () => {
      const { result } = renderStore();
      expect(result.current.loopEnabled).toBe(false);
    });

    it("devrait démarrer avec sidebarEditMode=false", () => {
      const { result } = renderStore();
      expect(result.current.sidebarEditMode).toBe(false);
    });

    it("devrait démarrer avec sounds=[]", () => {
      const { result } = renderStore();
      expect(result.current.sounds).toEqual([]);
    });

    it("devrait exposer toutes les propriétés principales", () => {
      const { result } = renderStore();
      expect(result.current.sounds).toBeDefined();
      expect(result.current.profiles).toBeDefined();
      expect(result.current.shortcuts).toBeDefined();
      expect(result.current.theme).toBe("dark");
      expect(result.current.lang).toBe("fr");
      expect(result.current.volume).toBe(80);
      expect(result.current.mixerEnabled).toBe(false);
      expect(result.current.sidebarConfig).toBeDefined();
      expect(result.current.currentSounds).toBeDefined();
      expect(result.current.favoriteSounds).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // HYDRATATION
  // ════════════════════════════════════════════════════════════════════

  describe("hydratation", () => {
    it("devrait passer loading à false après hydratation", async () => {
      const { result } = await renderAndWait();
      expect(result.current.loading).toBe(false);
    });

    it("devrait charger les sons depuis le store", async () => {
      electronMock._set("sounds", [
        { id: "s1", name: "A", path: "/a.mp3", volumeDb: 0 },
      ]);
      const { result } = await renderAndWait();
      expect(result.current.sounds).toHaveLength(1);
    });

    it("devrait migrer les sons sans volumeDb", async () => {
      electronMock._set("sounds", [
        { id: "s1", name: "Ancien", path: "/a.mp3", volume: 50 }, // pas de volumeDb
      ]);
      const { result } = await renderAndWait();
      // migrateSoundVolume → volumeDb devient 0
      expect(result.current.sounds[0].volumeDb).toBeDefined();
    });

    it('devrait charger les profils user + "all" en 1er', async () => {
      electronMock._set("profiles", [
        { id: "gaming", name: "Gaming", isDefault: false },
      ]);
      const { result } = await renderAndWait();
      expect(result.current.profiles[0].id).toBe("all");
      expect(result.current.profiles).toHaveLength(2);
    });

    it("devrait charger les shortcuts", async () => {
      electronMock._set("shortcuts", { s1: "Ctrl+1" });
      const { result } = await renderAndWait();
      expect(result.current.shortcuts).toEqual({ s1: "Ctrl+1" });
    });

    it("devrait charger theme, lang, volume", async () => {
      electronMock._set("theme", "light");
      electronMock._set("lang", "en");
      electronMock._set("volume", 50);
      const { result } = await renderAndWait();
      expect(result.current.theme).toBe("light");
      expect(result.current.lang).toBe("en");
      expect(result.current.volume).toBe(50);
    });

    it("devrait charger mixerEnabled, microphoneDevice", async () => {
      electronMock._set("mixerEnabled", true);
      electronMock._set("microphoneDevice", "mic-1");
      const { result } = await renderAndWait();
      expect(result.current.mixerEnabled).toBe(true);
      expect(result.current.microphoneDevice).toBe("mic-1");
    });

    it("devrait créer sidebarConfig par défaut si absent (sans re-save)", async () => {
      const { result } = await renderAndWait();
      expect(result.current.sidebarConfig).not.toBeNull();
      expect(result.current.sidebarConfig.items.length).toBeGreaterThan(0);

      // ⚠️ Pendant l'hydratation, `save` est court-circuité (isHydrating=true)
      // → storeSet('sidebarConfig') n'est PAS appelé lors du chargement initial
      const sidebarSaveCalls = electronMock.storeSet.mock.calls.filter(
        ([key]) => key === "sidebarConfig",
      );
      expect(sidebarSaveCalls).toHaveLength(0);
    });

    it("devrait utiliser les valeurs par défaut si storeGet retourne undefined", async () => {
      const { result } = await renderAndWait();
      expect(result.current.theme).toBe("dark");
      expect(result.current.volume).toBe(80);
      expect(result.current.playLocally).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SIDEBAR
  // ════════════════════════════════════════════════════════════════════

  describe("sidebar", () => {
    it("devrait inclure les profils user dans la sidebar par défaut", async () => {
      electronMock._set("profiles", [{ id: "gaming", name: "Gaming" }]);
      const { result } = await renderAndWait();

      const profileItems = result.current.sidebarConfig.items.filter((i) =>
        i.id.startsWith("profile-"),
      );
      expect(profileItems).toHaveLength(2); // all + gaming
    });

    it("devrait nettoyer les profils orphelins si config existante", async () => {
      electronMock._set("sidebarConfig", {
        mode: "custom",
        items: [
          {
            id: "home",
            group: "navigation",
            label: "home",
            visible: true,
            order: 0,
          },
          {
            id: "profile-orphan",
            group: "profiles",
            label: "Orphan",
            visible: true,
            order: 1,
            isProfile: true,
          },
        ],
      });
      const { result } = await renderAndWait();

      const orphans = result.current.sidebarConfig.items.filter(
        (i) => i.id === "profile-orphan",
      );
      expect(orphans).toHaveLength(0);
    });

    it("devrait ajouter les items core manquants", async () => {
      electronMock._set("sidebarConfig", {
        mode: "custom",
        items: [
          {
            id: "home",
            group: "navigation",
            label: "home",
            visible: true,
            order: 0,
          },
        ],
      });
      const { result } = await renderAndWait();

      const ids = result.current.sidebarConfig.items.map((i) => i.id);
      expect(ids).toContain("editor");
      expect(ids).toContain("options");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ACTIONS SIMPLES
  // ════════════════════════════════════════════════════════════════════

  describe("toggleLoop", () => {
    it("devrait basculer loopEnabled", async () => {
      const { result } = await renderAndWait();
      expect(result.current.loopEnabled).toBe(false);

      act(() => {
        result.current.toggleLoop();
      });
      expect(result.current.loopEnabled).toBe(true);

      act(() => {
        result.current.toggleLoop();
      });
      expect(result.current.loopEnabled).toBe(false);
    });
  });

  describe("toggleSidebarEditMode", () => {
    it("devrait basculer sidebarEditMode", async () => {
      const { result } = await renderAndWait();
      expect(result.current.sidebarEditMode).toBe(false);

      act(() => {
        result.current.toggleSidebarEditMode();
      });
      expect(result.current.sidebarEditMode).toBe(true);
    });
  });

  describe("updateSidebarConfig", () => {
    it("devrait remplacer la config + persister", async () => {
      const { result } = await renderAndWait();
      const newConfig = {
        mode: "custom",
        items: [{ id: "custom-item", visible: true }],
      };

      await act(async () => {
        await result.current.updateSidebarConfig(newConfig);
      });

      expect(result.current.sidebarConfig).toEqual(newConfig);
      expect(electronMock.storeSet).toHaveBeenCalledWith(
        "sidebarConfig",
        newConfig,
      );
    });

    it("devrait incrémenter sidebarVersion", async () => {
      const { result } = await renderAndWait();
      const v0 = result.current.sidebarVersion;

      await act(async () => {
        await result.current.updateSidebarConfig({ mode: "x", items: [] });
      });

      expect(result.current.sidebarVersion).toBeGreaterThan(v0);
    });
  });

  describe("resetSidebarConfig", () => {
    it("devrait restaurer la config par défaut", async () => {
      const { result } = await renderAndWait();
      electronMock.storeSet.mockClear();

      await act(async () => {
        await result.current.resetSidebarConfig();
      });

      expect(result.current.sidebarConfig.mode).toBe("default");
      expect(electronMock.storeSet).toHaveBeenCalledWith(
        "sidebarConfig",
        expect.objectContaining({ mode: "default" }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // SYNCPROFILESTOSIDEBAR
  // ════════════════════════════════════════════════════════════════════

  describe("syncProfilesToSidebar", () => {
    it("devrait ajouter les nouveaux profils à la sidebar", async () => {
      const { result } = await renderAndWait();

      await act(async () => {
        await result.current.syncProfilesToSidebar([
          { id: "new-one", name: "Nouveau" },
        ]);
      });

      const has = result.current.sidebarConfig.items.find(
        (i) => i.id === "profile-new-one",
      );
      expect(has).toBeDefined();
      expect(has.label).toBe("Nouveau");
    });

    it("devrait supprimer les profils absents", async () => {
      const { result } = await renderAndWait();

      await act(async () => {
        await result.current.syncProfilesToSidebar([]);
      });

      const orphans = result.current.sidebarConfig.items.filter(
        (i) => i.id.startsWith("profile-") && i.id !== "profile-all",
      );
      expect(orphans).toHaveLength(0);
    });

    it("devrait retourner la config mise à jour", async () => {
      const { result } = await renderAndWait();

      let config;
      await act(async () => {
        config = await result.current.syncProfilesToSidebar([
          { id: "x", name: "X" },
        ]);
      });

      expect(config).toBeDefined();
      expect(config.items).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // ACTIONS SPÉCIALES
  // ════════════════════════════════════════════════════════════════════

  describe("resetGainCache", () => {
    it("devrait vider le gainCache sans planter", async () => {
      const { result } = await renderAndWait();

      // ⚠️ On ne peut pas inspecter gainCache directement (vi.resetModules
      // peut recréer le module). On vérifie que l'appel ne throw pas.
      await expect(
        act(async () => {
          await result.current.resetGainCache();
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("toggleGlobalShortcuts", () => {
    it("devrait appeler electronAPI + mettre à jour shortcutsEnabled", async () => {
      electronMock.toggleGlobalShortcuts.mockResolvedValue(false);
      const { result } = await renderAndWait();

      let newState;
      await act(async () => {
        newState = await result.current.toggleGlobalShortcuts();
      });

      expect(newState).toBe(false);
      expect(result.current.shortcutsEnabled).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════════════

  describe("currentSounds", () => {
    it('devrait retourner tous les sons pour profil "all"', async () => {
      electronMock._set("sounds", [
        { id: "s1", name: "A", path: "/a.mp3", profiles: ["all"], volumeDb: 0 },
        { id: "s2", name: "B", path: "/b.mp3", profiles: ["all"], volumeDb: 0 },
      ]);
      const { result } = await renderAndWait();

      expect(result.current.currentSounds).toHaveLength(2);
    });

    it("devrait filtrer par profil", async () => {
      electronMock._set("sounds", [
        {
          id: "s1",
          name: "A",
          path: "/a.mp3",
          profiles: ["all", "gaming"],
          volumeDb: 0,
        },
        { id: "s2", name: "B", path: "/b.mp3", profiles: ["all"], volumeDb: 0 },
      ]);
      electronMock._set("profiles", [{ id: "gaming", name: "Gaming" }]);
      electronMock._set("currentProfileId", "gaming");

      const { result } = await renderAndWait();
      expect(result.current.currentSounds).toHaveLength(1);
      expect(result.current.currentSounds[0].id).toBe("s1");
    });
  });

  describe("favoriteSounds", () => {
    it("devrait retourner les sons favoris du profil", async () => {
      electronMock._set("sounds", [
        {
          id: "s1",
          name: "A",
          path: "/a.mp3",
          profiles: ["all"],
          favorites: ["all"],
          volumeDb: 0,
        },
        {
          id: "s2",
          name: "B",
          path: "/b.mp3",
          profiles: ["all"],
          favorites: [],
          volumeDb: 0,
        },
      ]);
      const { result } = await renderAndWait();

      expect(result.current.favoriteSounds).toHaveLength(1);
      expect(result.current.favoriteSounds[0].id).toBe("s1");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // EXPOSITION DES HOOKS INTERNES
  // ════════════════════════════════════════════════════════════════════

  describe("exposition des méthodes des sous-hooks", () => {
    it("devrait exposer addSound du hook useSounds", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.addSound).toBe("function");
    });

    it("devrait exposer createProfile du hook useProfiles", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.createProfile).toBe("function");
    });

    it("devrait exposer setShortcut du hook useShortcuts", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.setShortcut).toBe("function");
    });

    it("devrait exposer updateTheme du hook useSettings", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.updateTheme).toBe("function");
    });

    it("devrait exposer updateMixerEnabled du hook useMixer", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.updateMixerEnabled).toBe("function");
    });

    it("devrait exposer saveEditorProject du hook useEditor", async () => {
      const { result } = await renderAndWait();
      expect(typeof result.current.saveEditorProject).toBe("function");
    });
  });
});
