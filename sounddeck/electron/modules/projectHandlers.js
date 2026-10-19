/**
 * @file IPC handlers for the audio editor's project system.
 *
 * A "project" is a serializable snapshot of the multi-track audio editor
 * (tracks, clips, effects, markers, loop regions). This module owns:
 *
 * - **Persistence** — save / load / list / delete projects in
 *   electron-store (`editorProjects` map + `recentEditorProjects` list +
 *   `currentEditorProjectId` pointer)
 * - **Export / Import** — round-trip a project through a `.json` file
 *   on disk, with metadata wrapping (`{ type: 'sounddeck-project',
 *   version, exportedAt, project }`)
 * - **Duplication** — deep-copy a project and regenerate every ID
 *   (project, tracks, clips, effect instances, markers) so the copy is
 *   fully independent. Loop regions are remapped to the new IDs so the
 *   user's loop setup survives the copy.
 *
 * **ID regeneration** is critical: without it, editing the duplicated
 * project would mutate the original (same IDs = shared state in the
 * store and the React component tree).
 *
 * @see ../../src/features/editor/ — the renderer side of the editor
 * @see ../preload.js — exposes these channels via
 *      `electronAPI.saveEditorProject`, `.loadEditorProject`, …
 * @see ../store.js — persists everything under `editorProjects`
 */

const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

// ─── ID REGENERATION ────────────────────────────────────────────────────

/**
 * Deep-clones a project and regenerates **every** ID in it:
 *
 * - `project.id` → new UUID
 * - `project.tracks[i].id` → new UUID
 * - `project.tracks[i].clips[j].id` → new UUID
 * - `project.tracks[i].clips[j].effects[k].id` → new UUID
 * - `project.markers[m].id` → new UUID
 * - `project.loops` — remapped so that `loops.clips` and `loops.tracks`
 *   point to the *new* IDs (the user's loop setup survives the
 *   duplicate/import)
 *
 * The `loopState.timeline` sub-object is copied as-is (it has no IDs).
 *
 * Also sets `createdAt` and `updatedAt` to `Date.now()`.
 *
 * **Why this matters**: if we duplicated a project without this, both
 * projects would share the same `track.id` / `clip.id`, and any edit in
 * one would mutate the other (React keys collide, store updates leak,
 * undo history gets confused).
 *
 * @param {Object} project - The project to clone.
 * @returns {Object} A brand-new project object with fresh IDs. The
 *   input is not mutated.
 */
function regenerateProjectIds(project) {
  const trackIdMap = new Map();
  const clipIdMap = new Map();

  const newTracks = (project.tracks || []).map((track) => {
    const newTrackId = randomUUID();
    trackIdMap.set(track.id, newTrackId);

    return {
      ...track,
      id: newTrackId,
      clips: (track.clips || []).map((clip) => {
        const newClipId = randomUUID();
        clipIdMap.set(clip.id, newClipId);
        return {
          ...clip,
          id: newClipId,
          effects: (clip.effects || []).map((eff) => ({
            ...eff,
            id: randomUUID(),
          })),
        };
      }),
    };
  });

  const newMarkers = (project.markers || []).map((m) => ({
    ...m,
    id: randomUUID(),
  }));

  // Remap loopState: each key was an old clip/track ID → now must point
  // to the corresponding NEW ID.
  const oldLoops = project.loops || { clips: {}, tracks: {}, timeline: {} };
  const newLoops = {
    clips: {},
    tracks: {},
    timeline: oldLoops.timeline ? { ...oldLoops.timeline } : {},
  };
  for (const [oldClipId, loopData] of Object.entries(oldLoops.clips || {})) {
    const newClipId = clipIdMap.get(oldClipId);
    if (newClipId) newLoops.clips[newClipId] = { ...loopData };
  }
  for (const [oldTrackId, loopData] of Object.entries(oldLoops.tracks || {})) {
    const newTrackId = trackIdMap.get(oldTrackId);
    if (newTrackId) newLoops.tracks[newTrackId] = { ...loopData };
  }

  return {
    ...project,
    id: randomUUID(),
    tracks: newTracks,
    markers: newMarkers,
    loops: newLoops,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── HANDLERS REGISTRATION ──────────────────────────────────────────────

/**
 * Registers every project-related IPC handler.
 *
 * Must be called exactly once at app startup (see `electron/main.js`).
 *
 * Channels registered:
 *
 * **Persistence (electron-store)**
 * - `save-editor-project`      `(projectData) -> { success, project?, error? }`
 * - `load-editor-project`      `(projectId) -> { success, project?, error? }`
 * - `get-all-editor-projects`  `() -> Project[]` (sorted by `updatedAt`)
 * - `get-recent-editor-projects` `() -> Project[]` (max 10)
 * - `delete-editor-project`    `(projectId) -> { success, error? }`
 * - `rename-editor-project`    `({ projectId, newName }) -> { success, project?, error? }`
 * - `duplicate-editor-project` `(projectId) -> { success, project?, error? }`
 *
 * **File export / import**
 * - `export-editor-project`    `({ project, filePath }) -> { success, path?, error? }`
 * - `import-editor-project`    `(filePath) -> { success, project?, error? }`
 *
 * @param {{
 *   get: (key: string, defaultValue?: unknown) => unknown,
 *   set: (key: string, value: unknown) => void,
 *   delete: (key: string) => void
 * }} store - The electron-store instance (injected for testability).
 * @returns {void}
 */
function registerProjectHandlers(store) {
  console.log("🔧 [projectHandlers] Enregistrement des handlers...");

  // ─── SAVE ─────────────────────────────────────────────────────────
  // Persists a project snapshot + updates the recent list. Ensures
  // `updatedAt` is fresh and moves the project to the top of the
  // recents (max 20 entries).
  ipcMain.handle("save-editor-project", async (_event, projectData) => {
    try {
      if (!projectData || !projectData.id) {
        return { success: false, error: "Données de projet invalides" };
      }

      const updatedProject = { ...projectData, updatedAt: Date.now() };

      const projects = store.get("editorProjects", {});
      projects[projectData.id] = updatedProject;
      store.set("editorProjects", projects);
      store.set("currentEditorProjectId", projectData.id);

      const recent = store.get("recentEditorProjects", []);
      const filtered = recent.filter((id) => id !== projectData.id);
      filtered.unshift(projectData.id);
      store.set("recentEditorProjects", filtered.slice(0, 20));

      return { success: true, project: updatedProject };
    } catch (e) {
      console.error("❌ Erreur sauvegarde projet:", e);
      return { success: false, error: e.message };
    }
  });

  // ─── LOAD ─────────────────────────────────────────────────────────
  // Loads a project by ID and promotes it to the top of the recents
  // + sets `currentEditorProjectId`.
  ipcMain.handle("load-editor-project", async (_event, projectId) => {
    try {
      const projects = store.get("editorProjects", {});
      const project = projects[projectId];

      if (!project) {
        return { success: false, error: "Projet non trouvé" };
      }

      const recent = store.get("recentEditorProjects", []);
      const filtered = recent.filter((id) => id !== projectId);
      filtered.unshift(projectId);
      store.set("recentEditorProjects", filtered.slice(0, 20));
      store.set("currentEditorProjectId", projectId);

      return { success: true, project };
    } catch (e) {
      console.error("❌ Erreur chargement projet:", e);
      return { success: false, error: e.message };
    }
  });

  // ─── LIST ALL ─────────────────────────────────────────────────────
  // Returns every saved project, sorted by `updatedAt` descending.
  ipcMain.handle("get-all-editor-projects", async () => {
    try {
      const projects = store.get("editorProjects", {});
      return Object.values(projects).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
      );
    } catch (e) {
      console.error("❌ Erreur récupération projets:", e);
      return [];
    }
  });

  // ─── LIST RECENTS ─────────────────────────────────────────────────
  // Returns up to 10 recent projects, preserving order. Skips IDs
  // whose project no longer exists in the store (defensive).
  ipcMain.handle("get-recent-editor-projects", async () => {
    try {
      const recentIds = store.get("recentEditorProjects", []);
      const projects = store.get("editorProjects", {});
      return recentIds
        .map((id) => projects[id])
        .filter(Boolean)
        .slice(0, 10);
    } catch (e) {
      console.error("❌ Erreur récupération projets récents:", e);
      return [];
    }
  });

  // ─── DELETE ───────────────────────────────────────────────────────
  // Removes a project, cleans the recents list, and clears
  // `currentEditorProjectId` if it pointed to the deleted project.
  ipcMain.handle("delete-editor-project", async (_event, projectId) => {
    try {
      const projects = store.get("editorProjects", {});

      if (!projects[projectId]) {
        return { success: false, error: "Projet non trouvé" };
      }

      delete projects[projectId];
      store.set("editorProjects", projects);

      const recent = store.get("recentEditorProjects", []);
      store.set(
        "recentEditorProjects",
        recent.filter((id) => id !== projectId),
      );

      if (store.get("currentEditorProjectId") === projectId) {
        store.delete("currentEditorProjectId");
      }

      return { success: true };
    } catch (e) {
      console.error("❌ Erreur suppression projet:", e);
      return { success: false, error: e.message };
    }
  });

  // ─── EXPORT (JSON file) ───────────────────────────────────────────
  // Writes the project as a standalone `.json` file with a metadata
  // wrapper (`{ version, type, exportedAt, project }`).
  ipcMain.handle(
    "export-editor-project",
    async (_event, { project, filePath }) => {
      try {
        if (!project) {
          return { success: false, error: "Aucun projet à exporter" };
        }

        const exportData = {
          version: "1.0.0",
          type: "sounddeck-project",
          exportedAt: Date.now(),
          project: { ...project, exportedAt: Date.now() },
        };

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
          filePath,
          JSON.stringify(exportData, null, 2),
          "utf-8",
        );
        return { success: true, path: filePath };
      } catch (e) {
        console.error("❌ Erreur export projet:", e);
        return { success: false, error: e.message };
      }
    },
  );

  // ─── IMPORT (from JSON file) ──────────────────────────────────────
  // Reads a `.json` file, validates the wrapper, regenerates all IDs
  // (so the imported project can't collide with existing ones), and
  // stores it. Also promotes it to the top of the recents.
  ipcMain.handle("import-editor-project", async (_event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: "Fichier non trouvé" };
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.type !== "sounddeck-project") {
        return { success: false, error: "Format de projet invalide" };
      }

      if (!data.project || !data.project.id) {
        return { success: false, error: "Données de projet invalides" };
      }

      // Regenerate every ID to avoid collisions with existing projects
      const importedProject = {
        ...regenerateProjectIds(data.project),
        importedAt: Date.now(),
      };

      const projects = store.get("editorProjects", {});
      projects[importedProject.id] = importedProject;
      store.set("editorProjects", projects);

      const recent = store.get("recentEditorProjects", []);
      recent.unshift(importedProject.id);
      store.set("recentEditorProjects", recent.slice(0, 20));

      return { success: true, project: importedProject };
    } catch (e) {
      console.error("❌ Erreur import projet:", e);
      return { success: false, error: e.message };
    }
  });

  // ─── RENAME ───────────────────────────────────────────────────────
  // Renames a project. Rejects empty / whitespace-only names.
  ipcMain.handle(
    "rename-editor-project",
    async (_event, { projectId, newName }) => {
      try {
        if (!newName || !newName.trim()) {
          return { success: false, error: "Nom invalide" };
        }

        const projects = store.get("editorProjects", {});
        const project = projects[projectId];

        if (!project) {
          return { success: false, error: "Projet non trouvé" };
        }

        project.name = newName.trim();
        project.updatedAt = Date.now();
        store.set("editorProjects", projects);

        return { success: true, project };
      } catch (e) {
        console.error("❌ Erreur renommage projet:", e);
        return { success: false, error: e.message };
      }
    },
  );

  // ─── DUPLICATE ────────────────────────────────────────────────────
  // Creates a copy of a project with regenerated IDs. The new project
  // name is suffixed with " (copie)" so it's identifiable in the list.
  ipcMain.handle("duplicate-editor-project", async (_event, projectId) => {
    try {
      const projects = store.get("editorProjects", {});
      const project = projects[projectId];

      if (!project) {
        return { success: false, error: "Projet non trouvé" };
      }

      // Regenerate every ID + remap loopState
      const duplicatedProject = {
        ...regenerateProjectIds(project),
        name: `${project.name} (copie)`,
      };

      projects[duplicatedProject.id] = duplicatedProject;
      store.set("editorProjects", projects);

      const recent = store.get("recentEditorProjects", []);
      const filtered = recent.filter((id) => id !== duplicatedProject.id);
      filtered.unshift(duplicatedProject.id);
      store.set("recentEditorProjects", filtered.slice(0, 20));

      return { success: true, project: duplicatedProject };
    } catch (e) {
      console.error("❌ Erreur duplication projet:", e);
      return { success: false, error: e.message };
    }
  });

  console.log("✅ [projectHandlers] Tous les handlers enregistrés");
}

module.exports = { registerProjectHandlers };
