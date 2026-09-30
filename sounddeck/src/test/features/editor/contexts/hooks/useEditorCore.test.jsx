import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Mocks hoistés ───────────────────────────────────────────────────
const uuidMock = vi.hoisted(() => {
  let counter = 0;
  return vi.fn((prefix) => {
    counter++;
    return prefix ? `${prefix}-test-${counter}` : `test-${counter}`;
  });
});

const mockGetAudioFileDuration = vi.hoisted(() => vi.fn().mockResolvedValue(3));

vi.mock("@shared/utils/uuid", () => ({ uuid: uuidMock }));
vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));
vi.mock("@shared/utils/audioContext", () => ({
  getAudioFileDuration: mockGetAudioFileDuration,
}));

import { useEditorCore } from "@features/editor/contexts/hooks/useEditorCore";
import { installElectronAPIMock } from "@/test/utils/mockElectronAPI";

describe("useEditorCore", () => {
  let store, addToast, t, confirm;

  beforeEach(() => {
    vi.clearAllMocks();
    installElectronAPIMock(); // reset electronAPI entre tests

    store = {
      sounds: [],
      profiles: [{ id: "all", name: "Tous les sons", isDefault: true }],
    };
    addToast = vi.fn();
    t = vi.fn((key, params) => {
      if (params && typeof params === "object") {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    });
    confirm = vi.fn().mockResolvedValue(true);
  });

  const render = () =>
    renderHook(() => useEditorCore({ store, addToast, t, confirm }));

  const renderReady = async () => {
    const r = render();
    await waitFor(() => expect(r.result.current.isInitialized).toBe(true));
    return r;
  };

  // ══════════════════════════════════════════════════════════════════
  // INITIALISATION
  // ══════════════════════════════════════════════════════════════════

  describe("initialisation", () => {
    it("devrait démarrer avec isInitialized=false", () => {
      const { result } = render();
      expect(result.current.isInitialized).toBe(false);
    });

    it("devrait démarrer avec project=null", () => {
      const { result } = render();
      expect(result.current.project).toBeNull();
    });

    it("devrait démarrer avec totalDuration=10", () => {
      const { result } = render();
      expect(result.current.totalDuration).toBe(10);
    });

    it("devrait démarrer avec isDirty=false", () => {
      const { result } = render();
      expect(result.current.isDirty).toBe(false);
    });

    it("devrait démarrer avec loopState par défaut", () => {
      const { result } = render();
      expect(result.current.loopState.clips).toEqual({});
      expect(result.current.loopState.tracks).toEqual({});
      expect(result.current.loopState.timeline.enabled).toBe(false);
      expect(result.current.loopState.timeline.start).toBe(0);
      expect(result.current.loopState.timeline.end).toBe(10);
    });

    it("devrait démarrer avec zoomLevel=1", () => {
      const { result } = render();
      expect(result.current.zoomLevel).toBe(1);
    });

    it("devrait démarrer avec snapEnabled=true", () => {
      const { result } = render();
      expect(result.current.snapEnabled).toBe(true);
    });

    it("devrait démarrer avec autoCrossfade=true", () => {
      const { result } = render();
      expect(result.current.autoCrossfade).toBe(true);
    });

    it("devrait démarrer avec canUndoEditor=false et canRedoEditor=false", () => {
      const { result } = render();
      expect(result.current.canUndoEditor).toBe(false);
      expect(result.current.canRedoEditor).toBe(false);
    });

    it("devrait définir isInitialized=true après init", async () => {
      const { result } = await renderReady();
      expect(result.current.isInitialized).toBe(true);
    });

    it("devrait créer un projet par défaut si aucun sauvegardé", async () => {
      const { result } = await renderReady();
      expect(result.current.project).not.toBeNull();
      expect(result.current.project.name).toBe("Nouveau projet");
      expect(result.current.project.tracks).toEqual([]);
      expect(result.current.project.markers).toEqual([]);
      expect(result.current.project.id).toMatch(/^project-/);
    });

    it("devrait charger un projet existant via currentEditorProjectId", async () => {
      const existing = {
        id: "p-existing",
        name: "Mon Projet",
        tracks: [{ id: "t1", clips: [{ id: "c1", start: 0, duration: 5 }] }],
        markers: [],
        loops: { clips: {}, tracks: {}, timeline: { enabled: false } },
        createdAt: 1000,
        updatedAt: 2000,
      };
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === "currentEditorProjectId"
          ? Promise.resolve("p-existing")
          : Promise.resolve(undefined),
      );
      window.electronAPI.loadEditorProject.mockResolvedValueOnce({
        success: true,
        project: existing,
      });

      const { result } = await renderReady();
      expect(result.current.project.id).toBe("p-existing");
      expect(result.current.project.name).toBe("Mon Projet");
    });

    it('devrait migrer depuis l\'ancien format "editorProject"', async () => {
      const oldFormat = {
        id: "p-old",
        name: "Ancien",
        tracks: [],
        markers: [],
        createdAt: 1000,
      };
      window.electronAPI.storeGet.mockImplementation((key) => {
        if (key === "currentEditorProjectId") return Promise.resolve(undefined);
        if (key === "editorProject") return Promise.resolve(oldFormat);
        return Promise.resolve(undefined);
      });

      const { result } = await renderReady();
      expect(result.current.project.id).toBe("p-old");
      expect(window.electronAPI.saveEditorProject).toHaveBeenCalled();
    });

    it("devrait gérer une erreur d'init en fallback", async () => {
      window.electronAPI.storeGet.mockRejectedValue(new Error("boom"));
      const { result } = await renderReady();
      expect(result.current.project).not.toBeNull();
      expect(result.current.project.name).toBe("Nouveau projet");
    });

    it("devrait exposer DEFAULT_TIMELINE_LOOP", () => {
      const { result } = render();
      expect(result.current.DEFAULT_TIMELINE_LOOP.enabled).toBe(false);
      expect(result.current.DEFAULT_TIMELINE_LOOP.color).toBe("#7C6FF7");
    });

    it("devrait exposer INITIAL_OVERLAY_STATE", () => {
      const { result } = render();
      expect(result.current.INITIAL_OVERLAY_STATE.type).toBeNull();
      expect(result.current.INITIAL_OVERLAY_STATE.step).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // generateUniqueId
  // ══════════════════════════════════════════════════════════════════

  describe("generateUniqueId", () => {
    it("devrait préfixer avec le paramètre", async () => {
      const { result } = await renderReady();
      const id = result.current.generateUniqueId("clip");
      expect(id).toMatch(/^clip-/);
    });

    it("devrait générer des IDs uniques", async () => {
      const { result } = await renderReady();
      const id1 = result.current.generateUniqueId("x");
      const id2 = result.current.generateUniqueId("x");
      expect(id1).not.toBe(id2);
    });

    it("devrait appeler uuid du module utilitaire", async () => {
      const { result } = await renderReady();
      uuidMock.mockClear();
      result.current.generateUniqueId("effect");
      expect(uuidMock).toHaveBeenCalledWith("effect");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // findPreviousClip
  // ══════════════════════════════════════════════════════════════════

  describe("findPreviousClip", () => {
    it("devrait retourner null si track null", async () => {
      const { result } = await renderReady();
      expect(
        result.current.findPreviousClip({ id: "c1", start: 5 }, null),
      ).toBeNull();
    });

    it("devrait retourner null si clips vide", async () => {
      const { result } = await renderReady();
      expect(
        result.current.findPreviousClip({ id: "c1", start: 5 }, { clips: [] }),
      ).toBeNull();
    });

    it("devrait retourner null si clips undefined", async () => {
      const { result } = await renderReady();
      expect(
        result.current.findPreviousClip({ id: "c1", start: 5 }, {}),
      ).toBeNull();
    });

    it("devrait retourner le clip juste avant", async () => {
      const { result } = await renderReady();
      const track = {
        clips: [
          { id: "c1", start: 0 },
          { id: "c2", start: 5 },
          { id: "c3", start: 8 },
        ],
      };
      const found = result.current.findPreviousClip(
        { id: "c2", start: 5 },
        track,
      );
      expect(found.id).toBe("c1");
    });

    it("devrait retourner null si rien avant", async () => {
      const { result } = await renderReady();
      const track = { clips: [{ id: "c1", start: 0 }] };
      const found = result.current.findPreviousClip(
        { id: "c1", start: 0 },
        track,
      );
      expect(found).toBeNull();
    });

    it("devrait prendre le plus proche (tri décroissant)", async () => {
      const { result } = await renderReady();
      const track = {
        clips: [
          { id: "c1", start: 0 },
          { id: "c2", start: 2 },
          { id: "c3", start: 8 },
        ],
      };
      const found = result.current.findPreviousClip(
        { id: "c3", start: 8 },
        track,
      );
      expect(found.id).toBe("c2");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // calculateOverlap
  // ══════════════════════════════════════════════════════════════════

  describe("calculateOverlap", () => {
    it("devrait retourner 0 si pas de chevauchement", async () => {
      const { result } = await renderReady();
      expect(
        result.current.calculateOverlap(
          { id: "a", start: 0, duration: 3 },
          { id: "b", start: 10 },
        ),
      ).toBe(0);
    });

    it("devrait calculer un chevauchement positif", async () => {
      const { result } = await renderReady();
      expect(
        result.current.calculateOverlap(
          { id: "a", start: 0, duration: 5 },
          { id: "b", start: 3 },
        ),
      ).toBe(2);
    });

    it("devrait utiliser clipDurationsRef en priorité", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.setClipDurations({ a: 10 });
      });
      await waitFor(() =>
        expect(result.current.clipDurationsRef.current.a).toBe(10),
      );
      expect(
        result.current.calculateOverlap(
          { id: "a", start: 0, duration: 3 },
          { id: "b", start: 8 },
        ),
      ).toBe(2); // 10 - 8
    });

    it("devrait utiliser clip.duration en fallback", async () => {
      const { result } = await renderReady();
      expect(
        result.current.calculateOverlap(
          { id: "zz", start: 0, duration: 4 },
          { id: "yy", start: 3 },
        ),
      ).toBe(1);
    });

    it("devrait utiliser 3 par défaut", async () => {
      const { result } = await renderReady();
      expect(
        result.current.calculateOverlap(
          { id: "zz", start: 0 },
          { id: "yy", start: 2 },
        ),
      ).toBe(1); // 3 - 2
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // recalculateTotalDuration
  // ══════════════════════════════════════════════════════════════════

  describe("recalculateTotalDuration", () => {
    it("devrait retourner 10 pour projet vide", async () => {
      const { result } = await renderReady();
      expect(result.current.recalculateTotalDuration({ tracks: [] })).toBe(10);
    });

    it("devrait retourner 10 pour tracks absent", async () => {
      const { result } = await renderReady();
      expect(result.current.recalculateTotalDuration({})).toBe(10);
    });

    it("devrait calculer max + 2", async () => {
      const { result } = await renderReady();
      const project = {
        tracks: [
          {
            clips: [
              { id: "c1", start: 0, duration: 5 },
              { id: "c2", start: 10, duration: 3 },
            ],
          },
        ],
      };
      expect(result.current.recalculateTotalDuration(project)).toBe(15);
    });

    it("devrait avoir un minimum de 10", async () => {
      const { result } = await renderReady();
      const project = {
        tracks: [{ clips: [{ id: "c1", start: 0, duration: 1 }] }],
      };
      expect(result.current.recalculateTotalDuration(project)).toBe(10);
    });

    it("devrait utiliser clipDurationsRef en priorité", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.setClipDurations({ c1: 20 });
      });
      await waitFor(() =>
        expect(result.current.clipDurationsRef.current.c1).toBe(20),
      );
      const project = {
        tracks: [{ clips: [{ id: "c1", start: 0, duration: 3 }] }],
      };
      expect(result.current.recalculateTotalDuration(project)).toBe(22);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // commitProject
  // ══════════════════════════════════════════════════════════════════

  describe("commitProject", () => {
    it("devrait ne rien faire si null", async () => {
      const { result } = await renderReady();
      const before = result.current.project;
      act(() => {
        result.current.commitProject(null);
      });
      expect(result.current.project).toBe(before);
    });

    it("devrait mettre à jour project et projectRef", async () => {
      const { result } = await renderReady();
      const newProject = { id: "p-new", name: "Nouveau", tracks: [] };
      act(() => {
        result.current.commitProject(newProject);
      });
      expect(result.current.project).toEqual(newProject);
      expect(result.current.projectRef.current).toEqual(newProject);
    });

    it("devrait pousser dans l'historique (canUndo=true)", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-2", name: "Deux", tracks: [] });
      });
      expect(result.current.canUndoEditor).toBe(true);
    });

    it("devrait respecter skipHistory=true", async () => {
      const { result } = await renderReady();
      const wasCanUndo = result.current.canUndoEditor;
      act(() => {
        result.current.commitProject(
          { id: "p-3", name: "Trois", tracks: [] },
          { skipHistory: true },
        );
      });
      expect(result.current.canUndoEditor).toBe(wasCanUndo);
    });

    it("devrait recalculer la durée totale", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p-4",
          name: "Quatre",
          tracks: [{ clips: [{ id: "c1", start: 0, duration: 30 }] }],
        });
      });
      expect(result.current.totalDuration).toBe(32);
    });

    it("devrait appeler saveEditorProject", async () => {
      const { result } = await renderReady();
      window.electronAPI.saveEditorProject.mockClear();
      act(() => {
        result.current.commitProject({ id: "p-5", name: "Cinq", tracks: [] });
      });
      expect(window.electronAPI.saveEditorProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-5" }),
      );
    });

    it("devrait vider le redoStack", async () => {
      const { result } = await renderReady();
      await act(async () => {
        result.current.commitProject({ id: "p-a", name: "A", tracks: [] });
      });
      await act(async () => {
        result.current.undoEditor();
      });
      // ⏱️ Laisse le setTimeout(0) dans undoEditor reset isUndoingRef
      await new Promise((r) => setTimeout(r, 10));
      expect(result.current.canRedoEditor).toBe(true);

      await act(async () => {
        result.current.commitProject({ id: "p-b", name: "B", tracks: [] });
      });
      expect(result.current.canRedoEditor).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // pushEditorHistoryCheckpoint
  // ══════════════════════════════════════════════════════════════════

  describe("pushEditorHistoryCheckpoint", () => {
    it("devrait pousser un checkpoint", async () => {
      const { result } = await renderReady();
      act(() => result.current.pushEditorHistoryCheckpoint());
      expect(result.current.canUndoEditor).toBe(true);
    });

    it("ne devrait rien faire si pas de projet", async () => {
      const { result } = render();
      act(() => result.current.pushEditorHistoryCheckpoint());
      expect(result.current.canUndoEditor).toBe(false);
    });

    it("devrait vider le redoStack", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-a", name: "A", tracks: [] });
      });
      act(() => result.current.undoEditor());
      act(() => result.current.pushEditorHistoryCheckpoint());
      expect(result.current.canRedoEditor).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // undoEditor / redoEditor
  // ══════════════════════════════════════════════════════════════════

  describe("undoEditor", () => {
    it("devrait retourner false si stack vide", async () => {
      const { result } = await renderReady();
      let res;
      act(() => {
        res = result.current.undoEditor();
      });
      expect(res).toBe(false);
    });

    it("devrait restaurer le projet précédent", async () => {
      const { result } = await renderReady();
      const p0 = result.current.project;
      act(() => {
        result.current.commitProject({ id: "p-a", name: "A", tracks: [] });
      });
      act(() => result.current.undoEditor());
      expect(result.current.project.id).toBe(p0.id);
    });

    it("devrait mettre à jour canRedoEditor=true", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-a", name: "A", tracks: [] });
      });
      act(() => result.current.undoEditor());
      expect(result.current.canRedoEditor).toBe(true);
    });

    it("devrait mettre à jour canUndoEditor selon la pile restante", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-a", name: "A", tracks: [] });
      });
      act(() => result.current.undoEditor());
      expect(result.current.canUndoEditor).toBe(false);
    });
  });

  describe("redoEditor", () => {
    it("devrait retourner false si stack vide", async () => {
      const { result } = await renderReady();
      let res;
      act(() => {
        res = result.current.redoEditor();
      });
      expect(res).toBe(false);
    });

    it("devrait restaurer après undo", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-b", name: "B", tracks: [] });
      });
      act(() => result.current.undoEditor());
      act(() => result.current.redoEditor());
      expect(result.current.project.id).toBe("p-b");
    });

    it("devrait mettre à jour canUndoEditor=true", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-b", name: "B", tracks: [] });
      });
      act(() => result.current.undoEditor());
      act(() => result.current.redoEditor());
      expect(result.current.canUndoEditor).toBe(true);
    });

    it("devrait recalculer la durée totale", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p-big",
          name: "B",
          tracks: [{ clips: [{ id: "c1", start: 0, duration: 50 }] }],
        });
      });
      act(() => result.current.undoEditor());
      act(() => result.current.redoEditor());
      expect(result.current.totalDuration).toBe(52);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // updateEditorProjectName
  // ══════════════════════════════════════════════════════════════════

  describe("updateEditorProjectName", () => {
    it("devrait retourner false si pas de projet", async () => {
      const { result } = render();
      let ok;
      act(() => {
        ok = result.current.updateEditorProjectName("Test");
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner false si nom vide", async () => {
      const { result } = await renderReady();
      let ok;
      act(() => {
        ok = result.current.updateEditorProjectName("");
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner false si nom whitespace", async () => {
      const { result } = await renderReady();
      let ok;
      act(() => {
        ok = result.current.updateEditorProjectName("   ");
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner true sans changer si nom identique", async () => {
      const { result } = await renderReady();
      const currentName = result.current.project.name;
      let ok;
      act(() => {
        ok = result.current.updateEditorProjectName(currentName);
      });
      expect(ok).toBe(true);
    });

    it("devrait mettre à jour le nom", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.updateEditorProjectName("Nouveau Nom");
      });
      expect(result.current.project.name).toBe("Nouveau Nom");
    });

    it("devrait trimmer le nom", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.updateEditorProjectName("  Trimmed  ");
      });
      expect(result.current.project.name).toBe("Trimmed");
    });

    it("devrait marquer isDirty=true", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.updateEditorProjectName("X");
      });
      expect(result.current.isDirty).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // reorderTracks
  // ══════════════════════════════════════════════════════════════════

  describe("reorderTracks", () => {
    it("devrait retourner false si pas de projet", async () => {
      const { result } = render();
      let ok;
      act(() => {
        ok = result.current.reorderTracks(0, 1);
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner false si startIndex invalide", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p",
          name: "P",
          tracks: [{ id: "t1" }, { id: "t2" }],
        });
      });
      let ok;
      act(() => {
        ok = result.current.reorderTracks(-1, 1);
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner false si endIndex invalide", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p",
          name: "P",
          tracks: [{ id: "t1" }, { id: "t2" }],
        });
      });
      let ok;
      act(() => {
        ok = result.current.reorderTracks(0, 10);
      });
      expect(ok).toBe(false);
    });

    it("devrait retourner false si start === end", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p",
          name: "P",
          tracks: [{ id: "t1" }],
        });
      });
      let ok;
      act(() => {
        ok = result.current.reorderTracks(0, 0);
      });
      expect(ok).toBe(false);
    });

    it("devrait réordonner les pistes", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p",
          name: "P",
          tracks: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
        });
      });
      act(() => {
        result.current.reorderTracks(0, 2);
      });
      expect(result.current.project.tracks.map((t) => t.id)).toEqual([
        "t2",
        "t3",
        "t1",
      ]);
    });

    it("devrait marquer isDirty=true", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({
          id: "p",
          name: "P",
          tracks: [{ id: "t1" }, { id: "t2" }],
        });
      });
      act(() => {
        result.current.reorderTracks(0, 1);
      });
      expect(result.current.isDirty).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // loadProject
  // ══════════════════════════════════════════════════════════════════

  describe("loadProject", () => {
    it("devrait initialiser si projectData est null", async () => {
      const { result } = await renderReady();
      await act(async () => {
        await result.current.loadProject(null);
      });
      expect(result.current.isInitialized).toBe(true);
    });

    it("devrait charger un projet avec ses clips", async () => {
      const { result } = await renderReady();
      const p = {
        id: "p-load",
        name: "Loaded",
        tracks: [
          {
            id: "t1",
            clips: [
              { id: "c1", start: 0, duration: 5 },
              { id: "c2", start: 5, duration: 5 },
            ],
          },
        ],
        markers: [],
        loops: {
          clips: {},
          tracks: {},
          timeline: { enabled: true, start: 0, end: 20 },
        },
      };
      await act(async () => {
        await result.current.loadProject(p);
      });
      expect(result.current.project.id).toBe("p-load");
      expect(result.current.clipDurations.c1).toBe(5);
      expect(result.current.clipDurations.c2).toBe(5);
      expect(result.current.loopState.timeline.enabled).toBe(true);
    });

    it("devrait calculer totalDuration correctement", async () => {
      const { result } = await renderReady();
      const p = {
        id: "p-dur",
        name: "D",
        tracks: [{ id: "t1", clips: [{ id: "c1", start: 0, duration: 30 }] }],
        markers: [],
        loops: {},
      };
      await act(async () => {
        await result.current.loadProject(p);
      });
      expect(result.current.totalDuration).toBe(32);
    });

    it("devrait reset les sélections", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.setSelectedClipId("c1");
        result.current.setSelectedTrackId("t1");
      });
      await act(async () => {
        await result.current.loadProject({
          id: "p-x",
          name: "X",
          tracks: [],
          markers: [],
          loops: {},
        });
      });
      expect(result.current.selectedClipId).toBeNull();
      expect(result.current.selectedTrackId).toBeNull();
    });

    it("devrait reset l'historique undo/redo", async () => {
      const { result } = await renderReady();
      act(() => {
        result.current.commitProject({ id: "p-1", name: "1", tracks: [] });
      });
      expect(result.current.canUndoEditor).toBe(true);

      await act(async () => {
        await result.current.loadProject({
          id: "p-2",
          name: "2",
          tracks: [],
          markers: [],
          loops: {},
        });
      });
      expect(result.current.canUndoEditor).toBe(false);
      expect(result.current.canRedoEditor).toBe(false);
    });

    it("devrait persister le nouveau project", async () => {
      const { result } = await renderReady();
      window.electronAPI.saveEditorProject.mockClear();
      await act(async () => {
        await result.current.loadProject({
          id: "p-new",
          name: "New",
          tracks: [],
          markers: [],
          loops: {},
        });
      });
      expect(window.electronAPI.saveEditorProject).toHaveBeenCalled();
    });

    it("devrait gérer un projet avec name manquant", async () => {
      const { result } = await renderReady();
      await act(async () => {
        await result.current.loadProject({
          id: "p-noname",
          tracks: [],
          markers: [],
          loops: {},
        });
      });
      expect(result.current.project.name).toBe("Nouveau projet");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // persistProject
  // ══════════════════════════════════════════════════════════════════

  describe("persistProject", () => {
    it("devrait appeler saveEditorProject", async () => {
      const { result } = await renderReady();
      window.electronAPI.saveEditorProject.mockClear();
      act(() => {
        result.current.persistProject({
          id: "p-persist",
          name: "X",
          tracks: [],
        });
      });
      expect(window.electronAPI.saveEditorProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-persist" }),
      );
    });

    it("ne devrait rien faire sans id", async () => {
      const { result } = await renderReady();
      window.electronAPI.saveEditorProject.mockClear();
      act(() => {
        result.current.persistProject({ name: "Sans ID", tracks: [] });
      });
      expect(window.electronAPI.saveEditorProject).not.toHaveBeenCalled();
    });

    it("ne devrait pas planter si electronAPI absent", async () => {
      const { result } = await renderReady();
      delete window.electronAPI.saveEditorProject;
      expect(() => {
        act(() => {
          result.current.persistProject({ id: "p-x", name: "X" });
        });
      }).not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getAudioDuration
  // ══════════════════════════════════════════════════════════════════

  describe("getAudioDuration", () => {
    it("devrait déléguer à getAudioFileDuration", async () => {
      const { result } = await renderReady();
      const duration =
        await result.current.getAudioDuration("/path/to/file.mp3");
      expect(mockGetAudioFileDuration).toHaveBeenCalledWith(
        "/path/to/file.mp3",
        3,
      );
      expect(duration).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SYNC REFS
  // ══════════════════════════════════════════════════════════════════

  describe("synchronisation des refs", () => {
    it("devrait sync projectRef", async () => {
      const { result } = await renderReady();
      await waitFor(() =>
        expect(result.current.projectRef.current).toBe(result.current.project),
      );
    });

    it("devrait sync currentTimeRef", async () => {
      const { result } = await renderReady();
      act(() => result.current.setCurrentTime(42));
      await waitFor(() =>
        expect(result.current.currentTimeRef.current).toBe(42),
      );
    });

    it("devrait sync isPlayingRef", async () => {
      const { result } = await renderReady();
      act(() => result.current.setIsPlaying(true));
      await waitFor(() =>
        expect(result.current.isPlayingRef.current).toBe(true),
      );
    });

    it("devrait sync selectedClipIdRef", async () => {
      const { result } = await renderReady();
      act(() => result.current.setSelectedClipId("c-42"));
      await waitFor(() =>
        expect(result.current.selectedClipIdRef.current).toBe("c-42"),
      );
    });

    it("devrait sync masterGainRef", async () => {
      const { result } = await renderReady();
      act(() => result.current.setMasterGain(0.5));
      await waitFor(() =>
        expect(result.current.masterGainRef.current).toBe(0.5),
      );
    });

    it("devrait sync autoCrossfadeRef", async () => {
      const { result } = await renderReady();
      act(() => result.current.setAutoCrossfade(false));
      await waitFor(() =>
        expect(result.current.autoCrossfadeRef.current).toBe(false),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SETTERS BASIQUES
  // ══════════════════════════════════════════════════════════════════

  describe("setters basiques", () => {
    it("setZoomLevel", async () => {
      const { result } = await renderReady();
      act(() => result.current.setZoomLevel(2));
      expect(result.current.zoomLevel).toBe(2);
    });

    it("setSnapEnabled", async () => {
      const { result } = await renderReady();
      act(() => result.current.setSnapEnabled(false));
      expect(result.current.snapEnabled).toBe(false);
    });

    it("setIsDirty", async () => {
      const { result } = await renderReady();
      act(() => result.current.setIsDirty(true));
      expect(result.current.isDirty).toBe(true);
    });

    it("setLoopState", async () => {
      const { result } = await renderReady();
      const newLoopState = {
        clips: { c1: { enabled: true } },
        tracks: {},
        timeline: { enabled: true, start: 0, end: 5 },
      };
      act(() => result.current.setLoopState(newLoopState));
      expect(result.current.loopState).toEqual(newLoopState);
    });

    it("setActionOverlay", async () => {
      const { result } = await renderReady();
      const overlay = { type: "split", clipId: "c1", step: 0, totalSteps: 1 };
      act(() => result.current.setActionOverlay(overlay));
      expect(result.current.actionOverlay.type).toBe("split");
    });

    it("setMasterGain", async () => {
      const { result } = await renderReady();
      act(() => result.current.setMasterGain(0.75));
      expect(result.current.masterGain).toBe(0.75);
    });
  });
});
