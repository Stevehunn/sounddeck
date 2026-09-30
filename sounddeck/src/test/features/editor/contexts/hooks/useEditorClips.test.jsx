import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────
vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { useEditorClips } from "@features/editor/contexts/hooks/useEditorClips";

describe("useEditorClips", () => {
  let core;
  let addToast;
  let t;
  let currentProject;
  let uuidCounter;

  // ─── Helpers ─────────────────────────────────────────────────────────
  const createClip = (overrides = {}) => ({
    id: "c1",
    soundId: "s1",
    name: "Clip",
    path: "/a.mp3",
    start: 0,
    duration: 3,
    offset: 0,
    volume: 0,
    volumeDb: 0,
    effects: [],
    fadeIn: 0,
    fadeOut: 0,
    pitch: 0,
    speed: 1,
    ...overrides,
  });

  beforeEach(() => {
    uuidCounter = 0;

    currentProject = {
      id: "p-1",
      name: "Test",
      tracks: [
        { id: "t1", name: "Track 1", clips: [] },
        { id: "t2", name: "Track 2", clips: [] },
      ],
      markers: [],
      updatedAt: 1000,
    };

    addToast = vi.fn();
    t = vi.fn((key, params) => {
      if (params && typeof params === "object") {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    });

    core = {
      projectRef: { current: currentProject },
      storeRef: {
        current: {
          sounds: [
            { id: "s1", name: "Sound 1", path: "/a.mp3", duration: 3 },
            { id: "s2", name: "Sound 2", path: "/b.mp3", duration: 5 },
          ],
        },
      },
      clipDurationsRef: { current: {} },
      loopStateRef: { current: { clips: {}, tracks: {}, timeline: {} } },
      commitProject: vi.fn(),
      generateUniqueId: vi.fn((prefix) => `${prefix}-test-${++uuidCounter}`),
      getAudioDuration: vi.fn().mockResolvedValue(3),
      setClipDurations: vi.fn(),
      setIsDirty: vi.fn(),
      setSelectedClipId: vi.fn(),
      setSelectedTrackId: vi.fn(),
      selectedClipIdRef: { current: null },
      addToastRef: { current: addToast },
      tRef: { current: t },
      setLoopState: vi.fn(),
    };
  });

  const render = () => renderHook(() => useEditorClips(core));

  // ═══════════════════════════════════════════════════════════════════════
  // addClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("addClip", () => {
    it("devrait retourner null si storeRef.current absent", async () => {
      core.storeRef.current = null;
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClip("t1", "s1");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastStoreNotAvailable",
        "error",
      );
    });

    it("devrait retourner null si le son n'existe pas", async () => {
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClip("t1", "unknown-sound");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastSoundNotFound",
        "error",
      );
    });

    it("devrait retourner null si la piste n'existe pas", async () => {
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClip("unknown-track", "s1");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastTrackNotFound",
        "error",
      );
    });

    it("devrait créer un clip avec start=0 sur piste vide", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1");
      });

      expect(newClip).not.toBeNull();
      expect(newClip.start).toBe(0);
      expect(newClip.name).toBe("Sound 1");
      expect(newClip.path).toBe("/a.mp3");
      expect(newClip.id).toMatch(/^clip-/);
    });

    it("devrait placer le clip après le dernier (start + 0.5)", async () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "existing", start: 0, duration: 3 }),
      ];
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1");
      });

      // dernier clip finit à 0 + 3 = 3, donc start = 3.5
      expect(newClip.start).toBe(3.5);
    });

    it("devrait respecter startPosition explicite", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1", 7.5);
      });

      expect(newClip.start).toBe(7.5);
    });

    it("devrait appeler getAudioDuration avec sound.path", async () => {
      const { result } = render();
      await act(async () => {
        await result.current.addClip("t1", "s1");
      });
      expect(core.getAudioDuration).toHaveBeenCalledWith("/a.mp3");
    });

    it("devrait appeler commitProject avec la durée mise à jour", async () => {
      const { result } = render();
      await act(async () => {
        await result.current.addClip("t1", "s1");
      });
      expect(core.commitProject).toHaveBeenCalled();
      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips).toHaveLength(1);
      expect(committed.updatedAt).toBeGreaterThan(0);
    });

    it("devrait enregistrer la durée dans clipDurationsRef", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1");
      });

      expect(core.setClipDurations).toHaveBeenCalled();
      const newDurations = core.setClipDurations.mock.calls[0][0];
      expect(newDurations[newClip.id]).toBe(3);
    });

    it("devrait marquer isDirty=true et sélectionner le clip", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1");
      });

      expect(core.setIsDirty).toHaveBeenCalledWith(true);
      expect(core.setSelectedClipId).toHaveBeenCalledWith(newClip.id);
      expect(core.setSelectedTrackId).toHaveBeenCalledWith("t1");
    });

    it("devrait trier les clips par start", async () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "existing-later", start: 10, duration: 2 }),
      ];
      const { result } = render();

      await act(async () => {
        await result.current.addClip("t1", "s1", 1);
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips[0].start).toBe(1);
      expect(committed.tracks[0].clips[1].start).toBe(10);
    });

    it("devrait afficher un toast de succès", async () => {
      const { result } = render();
      await act(async () => {
        await result.current.addClip("t1", "s1");
      });
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining("editorToastClipAdded"),
        "success",
      );
    });

    it("devrait gérer une erreur de getAudioDuration", async () => {
      core.getAudioDuration.mockRejectedValue(new Error("decode failed"));
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClip("t1", "s1");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining("editorToastClipAddError"),
        "error",
      );
    });

    it("devrait initialiser les effets par défaut", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClip("t1", "s1");
      });

      expect(newClip.effects).toEqual([]);
      expect(newClip.fadeIn).toBe(0);
      expect(newClip.fadeOut).toBe(0);
      expect(newClip.pitch).toBe(0);
      expect(newClip.speed).toBe(1);
      expect(newClip.offset).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // addClipFromFile
  // ═══════════════════════════════════════════════════════════════════════

  describe("addClipFromFile", () => {
    beforeEach(() => {
      window.electronAPI.importSoundFile = vi.fn().mockResolvedValue({
        success: true,
        path: "/imported/sound.mp3",
        name: "sound",
      });
    });

    it("devrait retourner null si filePath vide", async () => {
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClipFromFile("t1", null);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastNoFileSelected",
        "error",
      );
    });

    it("devrait retourner null si track introuvable", async () => {
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClipFromFile("unknown", "/x.mp3");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastTrackNotFound",
        "error",
      );
    });

    it("devrait retourner null si importSoundFile échoue", async () => {
      window.electronAPI.importSoundFile.mockResolvedValue({
        success: false,
        error: "ffmpeg missing",
      });
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClipFromFile("t1", "/x.mp3");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastFileImportError",
        "error",
      );
    });

    it("devrait créer un clip avec le nom du fichier", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClipFromFile("t1", "/x/MySound.mp3");
      });

      expect(newClip.name).toBe("MySound.mp3");
      expect(newClip.path).toBe("/imported/sound.mp3");
      expect(newClip.isExternal).toBe(true);
    });

    it("devrait marquer soundId comme null", async () => {
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClipFromFile("t1", "/x.mp3");
      });

      expect(newClip.soundId).toBeNull();
    });

    it("devrait placer après les clips existants", async () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c0", start: 0, duration: 4 }),
      ];
      const { result } = render();

      let newClip;
      await act(async () => {
        newClip = await result.current.addClipFromFile("t1", "/x.mp3");
      });

      expect(newClip.start).toBe(4.5);
    });

    it("devrait gérer une exception", async () => {
      window.electronAPI.importSoundFile.mockRejectedValue(new Error("boom"));
      const { result } = render();

      let res;
      await act(async () => {
        res = await result.current.addClipFromFile("t1", "/x.mp3");
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastFileImportError",
        "error",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // removeClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("removeClip", () => {
    it("ne devrait rien faire si projet absent", () => {
      core.projectRef.current = null;
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("ne devrait rien faire si track introuvable", () => {
      const { result } = render();
      act(() => {
        result.current.removeClip("unknown", "c1");
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("ne devrait rien faire si clip introuvable dans la track", () => {
      currentProject.tracks[0].clips = [createClip({ id: "autre" })];
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("devrait retirer le clip du track", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1" }),
        createClip({ id: "c2", start: 5 }),
      ];
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips).toHaveLength(1);
      expect(committed.tracks[0].clips[0].id).toBe("c2");
    });

    it("devrait nettoyer clipDurations", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      core.clipDurationsRef.current = { c1: 3, c2: 5 };
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });

      const newDurations = core.setClipDurations.mock.calls[0][0];
      expect(newDurations.c1).toBeUndefined();
      expect(newDurations.c2).toBe(5);
    });

    it("devrait nettoyer loopState si le clip y était", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      core.loopStateRef.current = {
        clips: { c1: { enabled: true } },
        tracks: {},
        timeline: {},
      };
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });

      expect(core.setLoopState).toHaveBeenCalled();
      const updatedLoop = core.setLoopState.mock.calls[0][0];
      expect(updatedLoop.clips.c1).toBeUndefined();
    });

    it("devrait désélectionner le clip s'il était sélectionné", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      core.selectedClipIdRef.current = "c1";
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });

      expect(core.setSelectedClipId).toHaveBeenCalledWith(null);
      expect(core.setSelectedTrackId).toHaveBeenCalledWith(null);
    });

    it("devrait marquer isDirty=true et toaster", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      const { result } = render();

      act(() => {
        result.current.removeClip("t1", "c1");
      });

      expect(core.setIsDirty).toHaveBeenCalledWith(true);
      expect(addToast).toHaveBeenCalledWith("editorToastClipRemoved", "info");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // updateClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("updateClip", () => {
    it("ne devrait rien faire si projet absent", () => {
      core.projectRef.current = null;
      const { result } = render();

      act(() => {
        result.current.updateClip("t1", "c1", { name: "New" });
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("devrait appliquer les updates au clip", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", name: "Old" })];
      const { result } = render();

      act(() => {
        result.current.updateClip("t1", "c1", { name: "New", start: 10 });
      });

      const committed = core.commitProject.mock.calls[0][0];
      const updated = committed.tracks[0].clips[0];
      expect(updated.name).toBe("New");
      expect(updated.start).toBe(10);
    });

    it("devrait passer les options à commitProject", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      const { result } = render();

      act(() => {
        result.current.updateClip(
          "t1",
          "c1",
          { name: "X" },
          { skipHistory: true },
        );
      });

      expect(core.commitProject).toHaveBeenCalledWith(expect.any(Object), {
        skipHistory: true,
      });
    });

    it("devrait marquer isDirty=true", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      const { result } = render();

      act(() => {
        result.current.updateClip("t1", "c1", { name: "X" });
      });
      expect(core.setIsDirty).toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // duplicateClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("duplicateClip", () => {
    it("devrait retourner null si projet absent", () => {
      core.projectRef.current = null;
      const { result } = render();

      let res;
      act(() => {
        res = result.current.duplicateClip("t1", "c1");
      });
      expect(res).toBeNull();
    });

    it("devrait retourner null si track introuvable", () => {
      const { result } = render();

      let res;
      act(() => {
        res = result.current.duplicateClip("unknown", "c1");
      });
      expect(res).toBeNull();
    });

    it("devrait retourner null si clip introuvable", () => {
      const { result } = render();

      let res;
      act(() => {
        res = result.current.duplicateClip("t1", "unknown");
      });
      expect(res).toBeNull();
    });

    it("devrait créer un nouveau clip avec un nouvel ID", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 3 }),
      ];
      const { result } = render();

      let dup;
      act(() => {
        dup = result.current.duplicateClip("t1", "c1");
      });

      expect(dup.id).not.toBe("c1");
      expect(dup.id).toMatch(/^clip-/);
    });

    it("devrait placer à start + duration + 0.5", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 2, duration: 4 }),
      ];
      const { result } = render();

      let dup;
      act(() => {
        dup = result.current.duplicateClip("t1", "c1");
      });

      // 2 + 4 + 0.5
      expect(dup.start).toBe(6.5);
    });

    it("devrait régénérer les IDs des effets", () => {
      currentProject.tracks[0].clips = [
        createClip({
          id: "c1",
          effects: [
            { id: "e1", type: "volume", params: { value: 1 } },
            { id: "e2", type: "fadeIn", params: { duration: 0.5 } },
          ],
        }),
      ];
      const { result } = render();

      let dup;
      act(() => {
        dup = result.current.duplicateClip("t1", "c1");
      });

      expect(dup.effects).toHaveLength(2);
      expect(dup.effects[0].id).not.toBe("e1");
      expect(dup.effects[1].id).not.toBe("e2");
      expect(dup.effects[0].type).toBe("volume");
      expect(dup.effects[1].type).toBe("fadeIn");
    });

    it("devrait ajouter la durée au clipDurationsRef", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", duration: 5 })];
      const { result } = render();

      let dup;
      act(() => {
        dup = result.current.duplicateClip("t1", "c1");
      });

      const newDurations = core.setClipDurations.mock.calls[0][0];
      expect(newDurations[dup.id]).toBe(5);
    });

    it("devrait toaster et marquer isDirty", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      const { result } = render();

      act(() => {
        result.current.duplicateClip("t1", "c1");
      });

      expect(addToast).toHaveBeenCalledWith(
        "editorToastClipDuplicated",
        "success",
      );
      expect(core.setIsDirty).toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // moveClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("moveClip", () => {
    it("ne devrait rien faire si projet absent", () => {
      core.projectRef.current = null;
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 5);
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("ne devrait rien faire si clip introuvable", () => {
      const { result } = render();
      act(() => {
        result.current.moveClip("t1", "unknown", 5);
      });
      expect(core.commitProject).not.toHaveBeenCalled();
    });

    it("devrait déplacer sur la même piste", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", start: 0 })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 10);
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips[0].start).toBe(10);
    });

    it("devrait clamper start à 0 minimum", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", start: 5 })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", -3);
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips[0].start).toBe(0);
    });

    it("devrait déplacer vers une autre piste", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", start: 0 })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 2, "t2");
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[0].clips).toHaveLength(0);
      expect(committed.tracks[1].clips).toHaveLength(1);
      expect(committed.tracks[1].clips[0].id).toBe("c1");
      expect(committed.tracks[1].clips[0].start).toBe(2);
    });

    it("devrait passer les options (skipHistory)", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1" })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 5, null, { skipHistory: true });
      });

      expect(core.commitProject).toHaveBeenCalledWith(expect.any(Object), {
        skipHistory: true,
      });
    });

    it("devrait chercher le clip dans toutes les pistes si trackId fourni ne le contient pas", () => {
      // clip sur t2 mais on passe trackId=t1
      currentProject.tracks[1].clips = [createClip({ id: "c1", start: 0 })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 5);
      });

      const committed = core.commitProject.mock.calls[0][0];
      expect(committed.tracks[1].clips[0].start).toBe(5);
    });

    it("devrait mettre à jour clipDurations si le clip a une durée", () => {
      currentProject.tracks[0].clips = [createClip({ id: "c1", duration: 7 })];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 10);
      });

      const newDurations = core.setClipDurations.mock.calls[0][0];
      expect(newDurations.c1).toBe(7);
    });

    it("devrait trier les clips après le move", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0 }),
        createClip({ id: "c2", start: 5 }),
      ];
      const { result } = render();

      act(() => {
        result.current.moveClip("t1", "c1", 10);
      });

      const committed = core.commitProject.mock.calls[0][0];
      const starts = committed.tracks[0].clips.map((c) => c.start);
      expect(starts).toEqual([5, 10]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // splitClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("splitClip", () => {
    it("devrait retourner null si projet absent", () => {
      core.projectRef.current = null;
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 2);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith("editorToastNoProject", "error");
    });

    it("devrait retourner null si track introuvable", () => {
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("unknown", "c1", 2);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastTrackNotFound",
        "error",
      );
    });

    it("devrait retourner null si clip introuvable", () => {
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "unknown", 2);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith("editorToastClipNotFound", "error");
    });

    it("devrait refuser un split trop proche du début", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 5 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 0.01);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastClipSplitTooClose",
        "warning",
      );
    });

    it("devrait refuser un split trop proche de la fin", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 5 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 4.99);
      });

      expect(res).toBeNull();
    });

    it("devrait créer deux clips left + right", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 2.5);
      });

      expect(res.leftClip).toBeDefined();
      expect(res.rightClip).toBeDefined();
      expect(res.leftClip.duration).toBe(2.5);
      expect(res.rightClip.duration).toBe(3.5);
    });

    it("devrait positionner left à start, right à splitTime", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 5, duration: 4 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 7);
      });

      expect(res.leftClip.start).toBe(5);
      expect(res.rightClip.start).toBe(7);
    });

    it("devrait ajuster les offsets", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6, offset: 1 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 3);
      });

      expect(res.leftClip.offset).toBe(1); // offset original
      expect(res.rightClip.offset).toBe(4); // 1 + 3
    });

    it("devrait générer des IDs uniques", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 3);
      });

      expect(res.leftClip.id).not.toBe("c1");
      expect(res.rightClip.id).not.toBe("c1");
      expect(res.leftClip.id).not.toBe(res.rightClip.id);
    });

    it("devrait clipper les fadeOut trop longs sur leftClip", () => {
      currentProject.tracks[0].clips = [
        createClip({
          id: "c1",
          start: 0,
          duration: 4,
          effects: [
            { type: "fadeOut", params: { duration: 3 } }, // 3 > 2*0.5
          ],
        }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 2);
      });

      const fadeOut = res.leftClip.effects.find((e) => e.type === "fadeOut");
      expect(fadeOut.params.duration).toBeLessThanOrEqual(1); // 2 * 0.5
    });

    it("devrait clipper les fadeIn trop longs sur rightClip", () => {
      currentProject.tracks[0].clips = [
        createClip({
          id: "c1",
          start: 0,
          duration: 4,
          effects: [{ type: "fadeIn", params: { duration: 3 } }],
        }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 2);
      });

      const fadeIn = res.rightClip.effects.find((e) => e.type === "fadeIn");
      expect(fadeIn.params.duration).toBeLessThanOrEqual(1);
    });

    it("devrait enregistrer les nouvelles durées", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 2);
      });

      const newDurations = core.setClipDurations.mock.calls[0][0];
      expect(newDurations[res.leftClip.id]).toBe(2);
      expect(newDurations[res.rightClip.id]).toBe(4);
    });

    it("devrait sélectionner leftClip et toaster", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 3);
      });

      expect(core.setSelectedClipId).toHaveBeenCalledWith(res.leftClip.id);
      expect(core.setSelectedTrackId).toHaveBeenCalledWith("t1");
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining("editorToastClipSplitAt"),
        "success",
      );
    });

    it("devrait refuser un splitTime hors bornes", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 100);
      });

      expect(res).toBeNull();
      expect(addToast).toHaveBeenCalledWith(
        "editorToastClipSplitTooClose",
        "warning",
      );
    });

    it("devrait accepter un splitTime exactement à 0.05 de la fin", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
      ];
      const { result } = render();

      let res;
      act(() => {
        res = result.current.splitClip("t1", "c1", 5.95);
      });

      expect(res).not.toBeNull();
      expect(res.rightClip.start).toBe(5.95);
      expect(res.rightClip.duration).toBeCloseTo(0.05, 5);
    });

    it("devrait trier les clips après split", () => {
      currentProject.tracks[0].clips = [
        createClip({ id: "c1", start: 0, duration: 6 }),
        createClip({ id: "c2", start: 10, duration: 2 }),
      ];
      const { result } = render();

      act(() => {
        result.current.splitClip("t1", "c1", 3);
      });

      const committed = core.commitProject.mock.calls[0][0];
      const starts = committed.tracks[0].clips.map((c) => c.start);
      expect(starts).toEqual([0, 3, 10]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // selectClip / deselectClip
  // ═══════════════════════════════════════════════════════════════════════

  describe("selectClip", () => {
    it("devrait sélectionner le clip + la track", () => {
      const { result } = render();

      act(() => {
        result.current.selectClip("c1", "t1");
      });

      expect(core.setSelectedClipId).toHaveBeenCalledWith("c1");
      expect(core.setSelectedTrackId).toHaveBeenCalledWith("t1");
    });
  });

  describe("deselectClip", () => {
    it("devrait désélectionner le clip + la track", () => {
      const { result } = render();

      act(() => {
        result.current.deselectClip();
      });

      expect(core.setSelectedClipId).toHaveBeenCalledWith(null);
      expect(core.setSelectedTrackId).toHaveBeenCalledWith(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Structure de retour
  // ═══════════════════════════════════════════════════════════════════════

  describe("structure de retour", () => {
    it("devrait exposer toutes les méthodes attendues", () => {
      const { result } = render();

      expect(typeof result.current.addClip).toBe("function");
      expect(typeof result.current.addClipFromFile).toBe("function");
      expect(typeof result.current.removeClip).toBe("function");
      expect(typeof result.current.updateClip).toBe("function");
      expect(typeof result.current.duplicateClip).toBe("function");
      expect(typeof result.current.moveClip).toBe("function");
      expect(typeof result.current.splitClip).toBe("function");
      expect(typeof result.current.selectClip).toBe("function");
      expect(typeof result.current.deselectClip).toBe("function");
    });
  });
});
