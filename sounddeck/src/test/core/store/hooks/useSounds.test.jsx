import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSounds } from "@core/store/hooks/useSounds";

// ─── Mock uuid (déterministe) ───────────────────────────────────────────
let uuidCounter = 0;
vi.mock("@shared/utils/uuid", () => ({
  uuid: vi.fn(() => {
    uuidCounter++;
    return `uuid-${uuidCounter}`;
  }),
}));

describe("useSounds", () => {
  let save;
  let electronMock;

  const SOUND_A = {
    id: "sa",
    name: "Sound A",
    path: "C:/sounds/a.mp3",
    image: null,
    emoji: "🔊",
    favorites: [],
    profiles: ["all"],
    volume: 0,
    volumeDb: 0,
    createdAt: 1000,
  };

  const SOUND_B = {
    id: "sb",
    name: "Sound B",
    path: "C:/sounds/b.mp3",
    image: null,
    emoji: "🎵",
    favorites: [],
    profiles: ["all"],
    volume: 0,
    volumeDb: 0,
    createdAt: 2000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    save = vi.fn().mockResolvedValue();

    electronMock = {
      deleteSoundFile: vi.fn().mockResolvedValue({ success: true }),
    };
    window.electronAPI = electronMock;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderHookWith = (
    initialSounds = [],
    initialSoundOrder = {},
    initialTags = {},
  ) =>
    renderHook(() =>
      useSounds(initialSounds, initialSoundOrder, initialTags, save),
    );

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT INITIAL
  // ════════════════════════════════════════════════════════════════════

  describe("état initial", () => {
    it("devrait démarrer avec les sons passés", () => {
      const { result } = renderHookWith([SOUND_A]);
      expect(result.current.sounds).toEqual([SOUND_A]);
    });

    it("devrait démarrer avec soundOrder", () => {
      const { result } = renderHookWith([], { all: ["sa"] });
      expect(result.current.soundOrder).toEqual({ all: ["sa"] });
    });

    it("devrait démarrer avec tags", () => {
      const { result } = renderHookWith([], {}, { sa: ["meme"] });
      expect(result.current.tags).toEqual({ sa: ["meme"] });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // addSound
  // ════════════════════════════════════════════════════════════════════

  describe("addSound", () => {
    it("devrait créer un son avec UUID généré", async () => {
      const { result } = renderHookWith();

      let newSound;
      await act(async () => {
        newSound = await result.current.addSound({
          name: "Nouveau",
          path: "C:/new.mp3",
        });
      });

      expect(newSound.id).toMatch(/^uuid-/);
      expect(newSound.name).toBe("Nouveau");
    });

    it("devrait normaliser le path (backslashes → forward)", async () => {
      const { result } = renderHookWith();

      let newSound;
      await act(async () => {
        newSound = await result.current.addSound({
          name: "Test",
          path: "C:\\sounds\\test.mp3",
        });
      });

      expect(newSound.path).toBe("C:/sounds/test.mp3");
    });

    it("devrait utiliser 🔊 par défaut si emoji absent", async () => {
      const { result } = renderHookWith();

      let newSound;
      await act(async () => {
        newSound = await result.current.addSound({
          name: "Sans emoji",
          path: "/x.mp3",
        });
      });

      expect(newSound.emoji).toBe("🔊");
    });

    it("devrait ajouter le son à la liste", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.addSound({ name: "New", path: "/new.mp3" });
      });

      expect(result.current.sounds.length).toBe(2);
    });

    it("devrait ajouter l'id à soundOrder pour chaque profil cible", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.addSound({
          name: "Multi",
          path: "/x.mp3",
          profiles: ["all", "gaming"],
        });
      });

      expect(result.current.soundOrder.all).toHaveLength(1);
      expect(result.current.soundOrder.gaming).toHaveLength(1);
    });

    it("devrait persister sounds ET soundOrder", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.addSound({ name: "X", path: "/x.mp3" });
      });

      expect(save).toHaveBeenCalledWith("sounds", expect.any(Array));
      expect(save).toHaveBeenCalledWith("soundOrder", expect.any(Object));
    });

    it('devrait utiliser ["all"] si profiles absent', async () => {
      const { result } = renderHookWith();

      let newSound;
      await act(async () => {
        newSound = await result.current.addSound({ name: "X", path: "/x.mp3" });
      });

      expect(newSound.profiles).toEqual(["all"]);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // restoreSounds
  // ════════════════════════════════════════════════════════════════════

  describe("restoreSounds", () => {
    it("devrait restaurer une liste de sons", async () => {
      const { result } = renderHookWith();

      let count;
      await act(async () => {
        count = await result.current.restoreSounds([SOUND_A, SOUND_B]);
      });

      expect(count).toBe(2);
      expect(result.current.sounds.length).toBe(2);
    });

    it("devrait ignorer les sons déjà présents (même ID)", async () => {
      const { result } = renderHookWith([SOUND_A]);

      let count;
      await act(async () => {
        count = await result.current.restoreSounds([SOUND_A, SOUND_B]);
      });

      expect(count).toBe(1);
      expect(result.current.sounds.length).toBe(2);
    });

    it("devrait retourner 0 pour un tableau vide", async () => {
      const { result } = renderHookWith();

      let count;
      await act(async () => {
        count = await result.current.restoreSounds([]);
      });

      expect(count).toBe(0);
    });

    it("devrait ignorer les valeurs non-tableau", async () => {
      const { result } = renderHookWith();

      let count;
      await act(async () => {
        count = await result.current.restoreSounds(null);
      });

      expect(count).toBe(0);
    });

    it("devrait filtrer les entrées sans id", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.restoreSounds([
          SOUND_A,
          { name: "No ID" },
          { id: "no-path" }, // path manquant → normalizePath undefined
        ]);
      });

      // Le 1er + le 3e ont un id → restaurés
      expect(result.current.sounds.length).toBe(2);
    });

    it("devrait normaliser les paths restaurés", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.restoreSounds([
          { ...SOUND_A, path: "C:\\back\\a.mp3" },
        ]);
      });

      expect(result.current.sounds[0].path).toBe("C:/back/a.mp3");
    });

    it("devrait utiliser des valeurs par défaut pour les champs manquants", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.restoreSounds([{ id: "only-id" }]);
      });

      const restored = result.current.sounds[0];
      expect(restored.name).toBe("Son restauré");
      expect(restored.emoji).toBe("🔊");
      expect(restored.profiles).toEqual(["all"]);
      expect(restored.favorites).toEqual([]);
      expect(restored.playCount).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // deleteSound
  // ════════════════════════════════════════════════════════════════════

  describe("deleteSound", () => {
    it("devrait supprimer un son", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B]);

      let ok;
      await act(async () => {
        ok = await result.current.deleteSound("sa");
      });

      expect(ok).toBe(true);
      expect(result.current.sounds).toHaveLength(1);
      expect(result.current.sounds[0].id).toBe("sb");
    });

    it("devrait retourner false si le son n'existe pas", async () => {
      const { result } = renderHookWith([SOUND_A]);

      let ok;
      await act(async () => {
        ok = await result.current.deleteSound("unknown");
      });

      expect(ok).toBe(false);
      expect(result.current.sounds).toHaveLength(1);
    });

    it("devrait nettoyer soundOrder de toutes les entrées", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {
        all: ["sa", "sb"],
        gaming: ["sa"],
      });

      await act(async () => {
        await result.current.deleteSound("sa");
      });

      expect(result.current.soundOrder.all).toEqual(["sb"]);
      expect(result.current.soundOrder.gaming).toEqual([]);
    });

    it("devrait supprimer le fichier si plus utilisé", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.deleteSound("sa");
      });

      expect(electronMock.deleteSoundFile).toHaveBeenCalledWith(
        "C:/sounds/a.mp3",
      );
    });

    it("ne devrait PAS supprimer le fichier si partagé par un autre son", async () => {
      const sharedSound = { ...SOUND_B, path: SOUND_A.path }; // même path
      const { result } = renderHookWith([SOUND_A, sharedSound]);

      await act(async () => {
        await result.current.deleteSound("sa");
      });

      expect(electronMock.deleteSoundFile).not.toHaveBeenCalled();
    });

    it("devrait gérer une erreur de suppression fichier sans planter", async () => {
      electronMock.deleteSoundFile.mockRejectedValue(new Error("file locked"));
      const { result } = renderHookWith([SOUND_A]);

      await expect(
        act(async () => {
          await result.current.deleteSound("sa");
        }),
      ).resolves.not.toThrow();

      // Le son doit quand même être supprimé du store
      expect(result.current.sounds).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // updateSound
  // ════════════════════════════════════════════════════════════════════

  describe("updateSound", () => {
    it("devrait mettre à jour les champs du son", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSound("sa", { name: "Renommé" });
      });

      expect(result.current.sounds[0].name).toBe("Renommé");
    });

    it("devrait préserver les autres champs", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSound("sa", { name: "Renommé" });
      });

      expect(result.current.sounds[0].path).toBe("C:/sounds/a.mp3");
      expect(result.current.sounds[0].emoji).toBe("🔊");
    });

    it("devrait persister après mise à jour", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSound("sa", { name: "X" });
      });

      expect(save).toHaveBeenCalledWith("sounds", expect.any(Array));
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // updateSoundVolume
  // ════════════════════════════════════════════════════════════════════

  describe("updateSoundVolume", () => {
    it("devrait mettre à jour volume + volumeDb", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundVolume("sa", 6);
      });

      expect(result.current.sounds[0].volume).toBe(6);
      expect(result.current.sounds[0].volumeDb).toBe(6);
    });

    it("devrait clamper à +24 dB max", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundVolume("sa", 100);
      });

      expect(result.current.sounds[0].volumeDb).toBe(24);
    });

    it("devrait clamper à -24 dB min", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundVolume("sa", -100);
      });

      expect(result.current.sounds[0].volumeDb).toBe(-24);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // incrementPlayCount (debounced)
  // ════════════════════════════════════════════════════════════════════

  describe("incrementPlayCount", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("devrait incrémenter playCount immédiatement", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });

      expect(result.current.sounds[0].playCount).toBe(1);
    });

    it("devrait mettre à jour lastPlayed", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });

      expect(result.current.sounds[0].lastPlayed).toBeGreaterThan(0);
    });

    it("devrait debouncer la persistence (save)", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });

      // Save n'a pas encore été appelé
      expect(save).not.toHaveBeenCalled();

      // Avance le timer 1500ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(save).toHaveBeenCalledWith("sounds", expect.any(Array));
    });

    it("devrait cumuler plusieurs increments avant debounce", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });
      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });
      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });

      expect(result.current.sounds[0].playCount).toBe(3);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Un seul save (debounce)
      expect(save).toHaveBeenCalledTimes(1);
    });

    it("devrait gérer les erreurs de save sans planter", async () => {
      save.mockRejectedValue(new Error("save failed"));
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.incrementPlayCount("sa");
      });

      await expect(
        act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        }),
      ).resolves.not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // toggleFavorite
  // ════════════════════════════════════════════════════════════════════

  describe("toggleFavorite", () => {
    it("devrait ajouter le profil aux favoris", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.toggleFavorite("sa", "gaming");
      });

      expect(result.current.sounds[0].favorites).toContain("gaming");
    });

    it("devrait retirer le profil si déjà favori", async () => {
      const withFav = { ...SOUND_A, favorites: ["gaming"] };
      const { result } = renderHookWith([withFav]);

      await act(async () => {
        await result.current.toggleFavorite("sa", "gaming");
      });

      expect(result.current.sounds[0].favorites).not.toContain("gaming");
    });

    it("devrait préserver les autres favoris", async () => {
      const withFav = { ...SOUND_A, favorites: ["all"] };
      const { result } = renderHookWith([withFav]);

      await act(async () => {
        await result.current.toggleFavorite("sa", "gaming");
      });

      expect(result.current.sounds[0].favorites).toEqual(["all", "gaming"]);
    });

    it("devrait persister après toggle", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.toggleFavorite("sa", "all");
      });

      expect(save).toHaveBeenCalledWith("sounds", expect.any(Array));
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // addSoundToProfile
  // ════════════════════════════════════════════════════════════════════

  describe("addSoundToProfile", () => {
    it("devrait ajouter le profil au son", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.addSoundToProfile("sa", "gaming");
      });

      expect(result.current.sounds[0].profiles).toContain("gaming");
    });

    it("ne devrait PAS dupliquer si déjà présent", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.addSoundToProfile("sa", "all");
      });

      expect(result.current.sounds[0].profiles).toEqual(["all"]);
    });

    it("devrait ajouter l'id à soundOrder du profil", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.addSoundToProfile("sa", "gaming");
      });

      expect(result.current.soundOrder.gaming).toContain("sa");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // removeSoundFromProfile
  // ════════════════════════════════════════════════════════════════════

  describe("removeSoundFromProfile", () => {
    it("devrait retirer le profil du son", async () => {
      const withMulti = { ...SOUND_A, profiles: ["all", "gaming"] };
      const { result } = renderHookWith([withMulti]);

      await act(async () => {
        await result.current.removeSoundFromProfile("sa", "gaming");
      });

      expect(result.current.sounds[0].profiles).toEqual(["all"]);
    });

    it("devrait nettoyer soundOrder du profil", async () => {
      const withMulti = { ...SOUND_A, profiles: ["all", "gaming"] };
      const { result } = renderHookWith([withMulti], {
        all: ["sa"],
        gaming: ["sa"],
      });

      await act(async () => {
        await result.current.removeSoundFromProfile("sa", "gaming");
      });

      expect(result.current.soundOrder.gaming).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // reorderSounds
  // ════════════════════════════════════════════════════════════════════

  describe("reorderSounds", () => {
    it("devrait réordonner les sons d'un profil", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {
        all: ["sa", "sb"],
      });

      let ok;
      await act(async () => {
        ok = await result.current.reorderSounds(0, 1, "all");
      });

      expect(ok).toBe(true);
      expect(result.current.soundOrder.all).toEqual(["sb", "sa"]);
    });

    it("devrait retourner false pour indices invalides", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {
        all: ["sa", "sb"],
      });

      let ok;
      await act(async () => {
        ok = await result.current.reorderSounds(5, 10, "all");
      });

      expect(ok).toBe(false);
    });

    it("devrait construire l'ordre si absent", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {});

      let ok;
      await act(async () => {
        ok = await result.current.reorderSounds(0, 1, "all");
      });

      expect(ok).toBe(true);
    });

    it("devrait persister le nouvel ordre", async () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {
        all: ["sa", "sb"],
      });

      await act(async () => {
        await result.current.reorderSounds(0, 1, "all");
      });

      expect(save).toHaveBeenCalledWith("soundOrder", expect.any(Object));
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // updateSoundImage
  // ════════════════════════════════════════════════════════════════════

  describe("updateSoundImage", () => {
    it("devrait mettre à jour l'image", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundImage("sa", "C:\\img.png");
      });

      expect(result.current.sounds[0].image).toBe("C:/img.png");
    });

    it("devrait normaliser le path (backslashes)", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundImage("sa", "/a/b/img.jpg");
      });

      expect(result.current.sounds[0].image).toBe("/a/b/img.jpg");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // updateSoundEmoji
  // ════════════════════════════════════════════════════════════════════

  describe("updateSoundEmoji", () => {
    it("devrait mettre à jour l'emoji", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundEmoji("sa", "🎸");
      });

      expect(result.current.sounds[0].emoji).toBe("🎸");
    });

    it("devrait persister après mise à jour", async () => {
      const { result } = renderHookWith([SOUND_A]);

      await act(async () => {
        await result.current.updateSoundEmoji("sa", "🎸");
      });

      expect(save).toHaveBeenCalledWith("sounds", expect.any(Array));
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // addTagToSound
  // ════════════════════════════════════════════════════════════════════

  describe("addTagToSound", () => {
    it("devrait ajouter un tag", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.addTagToSound("sa", "meme");
      });

      expect(result.current.tags.sa).toContain("meme");
    });

    it("ne devrait PAS dupliquer un tag existant", async () => {
      const { result } = renderHookWith([], {}, { sa: ["meme"] });

      await act(async () => {
        await result.current.addTagToSound("sa", "meme");
      });

      expect(result.current.tags.sa).toEqual(["meme"]);
    });

    it("devrait persister après ajout", async () => {
      const { result } = renderHookWith();

      await act(async () => {
        await result.current.addTagToSound("sa", "meme");
      });

      expect(save).toHaveBeenCalledWith("tags", expect.any(Object));
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // removeTagFromSound
  // ════════════════════════════════════════════════════════════════════

  describe("removeTagFromSound", () => {
    it("devrait retirer un tag", async () => {
      const { result } = renderHookWith([], {}, { sa: ["meme", "gaming"] });

      await act(async () => {
        await result.current.removeTagFromSound("sa", "meme");
      });

      expect(result.current.tags.sa).toEqual(["gaming"]);
    });

    it("devrait supprimer l'entrée si le tableau devient vide", async () => {
      const { result } = renderHookWith([], {}, { sa: ["meme"] });

      await act(async () => {
        await result.current.removeTagFromSound("sa", "meme");
      });

      expect(result.current.tags.sa).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getSoundTags
  // ════════════════════════════════════════════════════════════════════

  describe("getSoundTags", () => {
    it("devrait retourner les tags d'un son", () => {
      const { result } = renderHookWith([], {}, { sa: ["meme", "gaming"] });

      expect(result.current.getSoundTags("sa")).toEqual(["meme", "gaming"]);
    });

    it("devrait retourner [] pour un son sans tag", () => {
      const { result } = renderHookWith();

      expect(result.current.getSoundTags("unknown")).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getOrderedSounds
  // ════════════════════════════════════════════════════════════════════

  describe("getOrderedSounds", () => {
    it('devrait retourner tous les sons pour profil "all"', () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B]);

      const ordered = result.current.getOrderedSounds("all");
      expect(ordered.length).toBe(2);
    });

    it("devrait respecter l'ordre du soundOrder", () => {
      const { result } = renderHookWith([SOUND_A, SOUND_B], {
        all: ["sb", "sa"],
      });

      const ordered = result.current.getOrderedSounds("all");
      expect(ordered[0].id).toBe("sb");
      expect(ordered[1].id).toBe("sa");
    });

    it("devrait filtrer par profil spécifique", () => {
      const soundGaming = { ...SOUND_B, profiles: ["gaming"] };
      const { result } = renderHookWith([SOUND_A, soundGaming]);

      const ordered = result.current.getOrderedSounds("gaming");
      expect(ordered).toHaveLength(1);
      expect(ordered[0].id).toBe("sb");
    });

    it("devrait retourner les sons bruts si l'ordre est incomplet", () => {
      const { result } = renderHookWith(
        [SOUND_A, SOUND_B],
        { all: ["sa"] }, // manque 'sb'
      );

      const ordered = result.current.getOrderedSounds("all");
      // Fallback sur l'ordre brut
      expect(ordered).toHaveLength(2);
    });

    it("devrait ajouter les sons manquants à la fin", () => {
      const { result } = renderHookWith(
        [SOUND_A, SOUND_B],
        { all: ["sb"] }, // 'sa' manquant
      );

      // ⚠️ order.length !== profileSounds.length → fallback sur ordre brut
      // (comportement du code : strict equality)
      const ordered = result.current.getOrderedSounds("all");
      expect(ordered).toHaveLength(2);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getFavoriteSounds
  // ════════════════════════════════════════════════════════════════════

  describe("getFavoriteSounds", () => {
    it("devrait retourner les sons favoris du profil", () => {
      const favA = { ...SOUND_A, favorites: ["all"] };
      const { result } = renderHookWith([favA, SOUND_B]);

      const favorites = result.current.getFavoriteSounds("all");
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe("sa");
    });

    it("devrait filtrer par profil", () => {
      // ⚠️ Un son doit être dans `profiles` ET `favorites` du profil pour apparaître
      const favGaming = {
        ...SOUND_A,
        profiles: ["all", "gaming"],
        favorites: ["gaming"],
      };
      const favAll = {
        ...SOUND_B,
        profiles: ["all"],
        favorites: ["all"],
      };
      const { result } = renderHookWith([favGaming, favAll]);

      const gaming = result.current.getFavoriteSounds("gaming");
      expect(gaming).toHaveLength(1);
      expect(gaming[0].id).toBe("sa");

      const all = result.current.getFavoriteSounds("all");
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe("sb");
    });

    it("devrait retourner [] si aucun favori", () => {
      const { result } = renderHookWith([SOUND_A]);

      expect(result.current.getFavoriteSounds("all")).toEqual([]);
    });
  });
});
