// electron/modules/diagnostic.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  listAllHandlers,
  checkExpectedHandlers,
  diagnosePlugins,
  diagnoseStore,
  diagnoseSystem,
  diagnoseAudio,
  diagnoseSounds,
  diagnoseShortcuts,
  diagnosePerformance,
  diagnoseSidebar,
  diagnoseEditor,
  runFullDiagnostic,
  exportDiagnosticToFile,
  registerDiagnosticHandlers,
  EXPECTED_HANDLERS,
} from "./diagnostic";
import { getIpcHandler, getRegisteredChannels } from "./__test-helpers__";

describe("diagnostic", () => {
  let electronMock;
  let store;
  let fs;
  let os;
  let ipcMain;
  let consoleSpy;

  beforeEach(() => {
    electronMock = globalThis.__electronMock;
    ipcMain = electronMock.ipcMain;
    store = globalThis.__storeMock;
    fs = globalThis.__fsMock;
    os = globalThis.__osMock;

    // Silence tous les logs
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset store
    store._data.clear();

    // Reset fs
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue("");
    fs.statSync.mockReturnValue({ size: 1024 });

    // Reset ipcMain
    ipcMain._handlers.clear();
    ipcMain._listeners.clear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════════
  // EXPECTED_HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  describe("EXPECTED_HANDLERS", () => {
    it("devrait être un objet non-vide", () => {
      expect(typeof EXPECTED_HANDLERS).toBe("object");
      expect(Object.keys(EXPECTED_HANDLERS).length).toBeGreaterThan(0);
    });

    it("devrait contenir les handlers critiques du store", () => {
      expect(EXPECTED_HANDLERS["store-get"]).toMatchObject({
        file: "storeHandlers.js",
        required: true,
      });
      expect(EXPECTED_HANDLERS["store-set"].required).toBe(true);
    });

    it("devrait contenir les handlers fichiers", () => {
      expect(EXPECTED_HANDLERS["open-file-dialog"]).toMatchObject({
        file: "fileHandlers.js",
        required: true,
      });
    });

    it("devrait marquer certains handlers comme optionnels", () => {
      expect(EXPECTED_HANDLERS["install-plugin"]).toMatchObject({
        required: false,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // listAllHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe("listAllHandlers", () => {
    it("devrait retourner un tableau", () => {
      expect(Array.isArray(listAllHandlers())).toBe(true);
    });

    it("devrait retourner [] si aucun handler", () => {
      expect(listAllHandlers()).toEqual([]);
    });

    it("devrait lister les handlers enregistrés", () => {
      ipcMain._handlers.set("store-get", vi.fn());
      ipcMain._handlers.set("store-set", vi.fn());

      const result = listAllHandlers();
      expect(result).toContain("store-get");
      expect(result).toContain("store-set");
      expect(result).toHaveLength(2);
    });

    it("devrait logger chaque handler", () => {
      ipcMain._handlers.set("a", vi.fn());
      ipcMain._handlers.set("b", vi.fn());

      listAllHandlers();

      // Vérifie que les noms apparaissent dans les logs
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("a"))).toBe(true);
      expect(logCalls.some((l) => l.includes("b"))).toBe(true);
    });

    it('devrait afficher "Aucun handler" si vide', () => {
      listAllHandlers();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Aucun handler"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // checkExpectedHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe("checkExpectedHandlers", () => {
    it("devrait retourner { registered, missing, optionalMissing }", () => {
      const result = checkExpectedHandlers();
      expect(result).toHaveProperty("registered");
      expect(result).toHaveProperty("missing");
      expect(result).toHaveProperty("optionalMissing");
    });

    it('devrait mettre TOUS les required dans "missing" si rien n\'est enregistré', () => {
      const result = checkExpectedHandlers();
      const requiredKeys = Object.entries(EXPECTED_HANDLERS)
        .filter(([, cfg]) => cfg.required)
        .map(([k]) => k);

      expect(result.missing.length).toBe(requiredKeys.length);
      expect(result.registered).toEqual([]);
    });

    it("devrait classer les handlers enregistrés correctement", () => {
      ipcMain._handlers.set("store-get", vi.fn());
      ipcMain._handlers.set("store-set", vi.fn());

      const result = checkExpectedHandlers();
      expect(result.registered).toContain("store-get");
      expect(result.registered).toContain("store-set");
      expect(result.missing).not.toContain("store-get");
    });

    it("devrait placer les optionnels manquants dans optionalMissing", () => {
      const result = checkExpectedHandlers();
      expect(result.optionalMissing.length).toBeGreaterThan(0);
      expect(result.optionalMissing).toContain("install-plugin");
    });

    it("devrait logger un récapitulatif", () => {
      checkExpectedHandlers();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logCalls.some(
          (l) => l.includes("Résumé:") || l.includes("enregistrés"),
        ),
      ).toBe(true);
    });

    it("devrait signaler les handlers critiques manquants", () => {
      checkExpectedHandlers();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logCalls.some((l) => l.includes("HANDLERS CRITIQUES MANQUANTS")),
      ).toBe(true);
    });

    it('ne devrait PAS signaler "critiques manquants" si tout est OK', () => {
      // Enregistre tous les required
      for (const [ch, cfg] of Object.entries(EXPECTED_HANDLERS)) {
        if (cfg.required) ipcMain._handlers.set(ch, vi.fn());
      }

      checkExpectedHandlers();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logCalls.some((l) => l.includes("HANDLERS CRITIQUES MANQUANTS")),
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnosePlugins
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnosePlugins", () => {
    it("devrait retourner { exists: false, plugins: [] } si dossier absent", () => {
      fs.existsSync.mockReturnValue(false);
      const result = diagnosePlugins();
      expect(result).toEqual({ exists: false, plugins: [] });
    });

    it("devrait retourner { exists: true, plugins: [] } si dossier vide", () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);
      const result = diagnosePlugins();
      expect(result).toEqual({ exists: true, plugins: [] });
    });

    it("devrait détecter un plugin valide", () => {
      fs.existsSync.mockImplementation(
        (p) => p.includes("plugins") || p.includes("plugin.json"),
      );
      fs.readdirSync.mockReturnValue(["plugin-a"]);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ name: "Plugin A", version: "1.0.0", pages: [{}] }),
      );

      const result = diagnosePlugins();
      expect(result.exists).toBe(true);
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].manifest.name).toBe("Plugin A");
    });

    it("devrait ignorer un dossier sans manifest", () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.endsWith("plugins")) return true;
        if (p.includes("plugin.json")) return false;
        return false;
      });
      fs.readdirSync.mockReturnValue(["no-manifest"]);

      const result = diagnosePlugins();
      expect(result.plugins).toHaveLength(0);
    });

    it("devrait gérer un manifest JSON invalide sans crash", () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(["broken"]);
      fs.readFileSync.mockReturnValue("{invalid");

      expect(() => diagnosePlugins()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseStore
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseStore", () => {
    it("ne devrait pas throw avec store vide", () => {
      expect(() => diagnoseStore()).not.toThrow();
    });

    it("devrait lire les valeurs du store", () => {
      store._data.set("profiles", [{ id: "p1" }]);
      store._data.set("sounds", [{ id: "s1" }]);

      diagnoseStore();
      expect(store.get).toHaveBeenCalledWith("profiles");
      expect(store.get).toHaveBeenCalledWith("sounds");
    });

    it("devrait afficher la taille totale", () => {
      store._data.set("profiles", [{ id: "p1" }]);
      diagnoseStore();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Taille totale"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseSystem
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseSystem", () => {
    it("ne devrait pas throw", () => {
      expect(() => diagnoseSystem()).not.toThrow();
    });

    it("devrait lire os.type() et os.release()", () => {
      diagnoseSystem();
      expect(os.type).toHaveBeenCalled();
      expect(os.release).toHaveBeenCalled();
    });

    it("devrait lire os.cpus()", () => {
      diagnoseSystem();
      expect(os.cpus).toHaveBeenCalled();
    });

    it("devrait lire os.totalmem()", () => {
      diagnoseSystem();
      expect(os.totalmem).toHaveBeenCalled();
    });

    it("devrait afficher Platform et Arch", () => {
      diagnoseSystem();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Platform"))).toBe(true);
      expect(logCalls.some((l) => l.includes("Arch"))).toBe(true);
    });

    it("devrait afficher la locale", () => {
      diagnoseSystem();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Locale"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseAudio
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseAudio", () => {
    it("ne devrait pas throw", () => {
      expect(() => diagnoseAudio()).not.toThrow();
    });

    it("devrait lire les options audio du store", () => {
      diagnoseAudio();
      expect(store.get).toHaveBeenCalledWith("mixerEnabled", false);
      expect(store.get).toHaveBeenCalledWith("audioDevice", "default");
      expect(store.get).toHaveBeenCalledWith("volume", 80);
    });

    it("devrait afficher les infos de mixeur", () => {
      diagnoseAudio();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Mixeur activé"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseSounds
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseSounds", () => {
    it("ne devrait pas throw avec store vide", () => {
      expect(() => diagnoseSounds()).not.toThrow();
    });

    it("devrait lire sounds/shortcuts/soundOrder du store", () => {
      diagnoseSounds();
      expect(store.get).toHaveBeenCalledWith("sounds", []);
      expect(store.get).toHaveBeenCalledWith("shortcuts", {});
      expect(store.get).toHaveBeenCalledWith("soundOrder", {});
    });

    it("devrait compter les sons", () => {
      store._data.set("sounds", [
        { id: "s1", path: "/fake/userData/sounds/a.mp3" },
        { id: "s2", path: "/fake/userData/sounds/b.mp3" },
      ]);

      diagnoseSounds();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logCalls.some((l) => l.includes("Sons dans la bibliothèque: 2")),
      ).toBe(true);
    });

    it("devrait détecter les fichiers manquants", () => {
      store._data.set("sounds", [
        { id: "s1", name: "ghost", path: "/fake/userData/sounds/missing.mp3" },
      ]);
      fs.existsSync.mockReturnValue(false);

      diagnoseSounds();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Fichiers manquants"))).toBe(true);
    });

    it('devrait signaler "Tous les fichiers présents" si rien ne manque', () => {
      store._data.set("sounds", [
        { id: "s1", name: "ok", path: "/fake/userData/sounds/ok.mp3" },
      ]);
      fs.existsSync.mockReturnValue(true);

      diagnoseSounds();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(
        logCalls.some((l) => l.includes("Tous les fichiers sont présents")),
      ).toBe(true);
    });

    it("devrait gérer une erreur de statSync sans crash", () => {
      store._data.set("sounds", [
        { id: "s1", path: "/fake/userData/sounds/a.mp3" },
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation(() => {
        throw new Error("boom");
      });

      expect(() => diagnoseSounds()).not.toThrow();
    });

    it("devrait nettoyer les préfixes file:///", () => {
      store._data.set("sounds", [
        { id: "s1", path: "file:///fake/userData/sounds/a.mp3" },
      ]);
      fs.existsSync.mockReturnValue(true);

      diagnoseSounds();
      // Vérifie que le chemin testé ne contient plus le préfixe
      const existsCalls = fs.existsSync.mock.calls.map((c) => c[0]);
      expect(existsCalls.every((p) => !p.startsWith("file://"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseShortcuts
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseShortcuts", () => {
    it("ne devrait pas throw", () => {
      expect(() => diagnoseShortcuts()).not.toThrow();
    });

    it("devrait détecter les raccourcis orphelins", () => {
      store._data.set("sounds", [{ id: "s1" }]);
      store._data.set("shortcuts", {
        s1: "Ctrl+1",
        "ghost-id": "Ctrl+2",
      });

      diagnoseShortcuts();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Raccourcis orphelins"))).toBe(
        true,
      );
    });

    it('devrait signaler "Aucun raccourci orphelin" si tout est OK', () => {
      store._data.set("sounds", [{ id: "s1" }]);
      store._data.set("shortcuts", { s1: "Ctrl+1" });

      diagnoseShortcuts();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Aucun raccourci orphelin"))).toBe(
        true,
      );
    });

    it("devrait compter les raccourcis actifs", () => {
      store._data.set("shortcuts", {
        s1: "Ctrl+1",
        s2: "",
        s3: "Ctrl+3",
      });

      diagnoseShortcuts();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Raccourcis actifs: 2"))).toBe(
        true,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnosePerformance
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnosePerformance", () => {
    it("ne devrait pas throw", () => {
      expect(() => diagnosePerformance()).not.toThrow();
    });

    it("devrait afficher les métriques mémoire", () => {
      diagnosePerformance();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Mémoire"))).toBe(true);
      expect(logCalls.some((l) => l.includes("RSS"))).toBe(true);
      expect(logCalls.some((l) => l.includes("Heap"))).toBe(true);
    });

    it("devrait compter les sons et profils", () => {
      store._data.set("sounds", [{ id: "s1" }, { id: "s2" }]);
      store._data.set("profiles", [{ id: "p1" }]);

      diagnosePerformance();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Sons en mémoire: 2"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseSidebar
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseSidebar", () => {
    it("devrait retourner { exists: false } si aucune config", () => {
      const result = diagnoseSidebar();
      expect(result).toEqual({ exists: false });
    });

    it("devrait retourner { exists: true } si config présente", () => {
      store._data.set("sidebarConfig", {
        mode: "default",
        items: [{ visible: true }],
      });

      const result = diagnoseSidebar();
      expect(result).toEqual({ exists: true });
    });

    it("devrait compter les items visibles / épinglés", () => {
      store._data.set("sidebarConfig", {
        items: [
          { visible: true, pinned: true },
          { visible: true, pinned: false },
          { visible: false, pinned: false },
        ],
      });

      diagnoseSidebar();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Visibles: 2/3"))).toBe(true);
      expect(logCalls.some((l) => l.includes("Épinglés: 1"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // diagnoseEditor
  // ═══════════════════════════════════════════════════════════════════

  describe("diagnoseEditor", () => {
    it("devrait retourner { exists: false } si pas de projet", () => {
      expect(diagnoseEditor()).toEqual({ exists: false });
    });

    it("devrait retourner { exists: false } si pas de tracks", () => {
      store._data.set("editorProject", { tracks: [] });
      expect(diagnoseEditor()).toEqual({ exists: false });
    });

    it("devrait retourner { exists: true } avec un projet valide", () => {
      store._data.set("editorProject", {
        id: "p1",
        name: "Mon projet",
        tracks: [{ name: "Track 1", clips: [{}, {}] }],
        duration: 60,
        markers: [],
        updatedAt: Date.now(),
      });

      expect(diagnoseEditor()).toEqual({ exists: true });
    });

    it("devrait compter les clips", () => {
      store._data.set("editorProject", {
        id: "p1",
        name: "X",
        tracks: [
          { name: "T1", clips: [{}, {}] },
          { name: "T2", clips: [{}] },
        ],
        duration: 60,
        markers: [],
        updatedAt: Date.now(),
      });

      diagnoseEditor();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Total clips: 3"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // exportDiagnosticToFile
  // ═══════════════════════════════════════════════════════════════════

  describe("exportDiagnosticToFile", () => {
    it("devrait écrire un fichier JSON et retourner { success: true }", () => {
      const result = exportDiagnosticToFile();
      expect(result.success).toBe(true);
      expect(result.path).toBeTruthy();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("devrait écrire un JSON valide", () => {
      exportDiagnosticToFile();
      const [, content] = fs.writeFileSync.mock.calls[0];
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("devrait inclure timestamp et system dans le JSON", () => {
      exportDiagnosticToFile();
      const [, content] = fs.writeFileSync.mock.calls[0];
      const data = JSON.parse(content);
      expect(data.timestamp).toBeDefined();
      expect(data.system).toBeDefined();
      expect(data.system.platform).toBeDefined();
      expect(data.system.nodeVersion).toBeDefined();
    });

    it("devrait inclure store, handlers, plugins, stats", () => {
      exportDiagnosticToFile();
      const [, content] = fs.writeFileSync.mock.calls[0];
      const data = JSON.parse(content);
      expect(data.store).toBeDefined();
      expect(data.handlers).toBeDefined();
      expect(data.plugins).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    it('devrait utiliser app.getPath("desktop")', () => {
      exportDiagnosticToFile();
      const filePath = fs.writeFileSync.mock.calls[0][0];
      expect(filePath).toContain("desktop");
    });

    it("devrait retourner { success: false } en cas d'erreur", () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error("disk full");
      });
      const result = exportDiagnosticToFile();
      expect(result.success).toBe(false);
      expect(result.error).toBe("disk full");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // runFullDiagnostic
  // ═══════════════════════════════════════════════════════════════════

  describe("runFullDiagnostic", () => {
    it("ne devrait pas throw", () => {
      expect(() => runFullDiagnostic()).not.toThrow();
    });

    it("devrait appeler toutes les sous-diagnostics", () => {
      runFullDiagnostic();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      // Headers connus
      expect(logCalls.some((l) => l.includes("DIAGNOSTIC COMPLET"))).toBe(true);
      expect(logCalls.some((l) => l.includes("SYSTÈME"))).toBe(true);
      expect(logCalls.some((l) => l.includes("STORE"))).toBe(true);
      expect(logCalls.some((l) => l.includes("HANDLERS"))).toBe(true);
      expect(logCalls.some((l) => l.includes("PLUGINS"))).toBe(true);
      expect(logCalls.some((l) => l.includes("AUDIO"))).toBe(true);
      expect(logCalls.some((l) => l.includes("SONS"))).toBe(true);
      expect(logCalls.some((l) => l.includes("RACCOURCIS"))).toBe(true);
      expect(logCalls.some((l) => l.includes("PERFORMANCE"))).toBe(true);
      expect(logCalls.some((l) => l.includes("SIDEBAR"))).toBe(true);
      expect(logCalls.some((l) => l.includes("ÉDITEUR"))).toBe(true);
    });

    it("devrait signaler la fin du diagnostic", () => {
      runFullDiagnostic();
      const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logCalls.some((l) => l.includes("Diagnostic terminé"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // registerDiagnosticHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe("registerDiagnosticHandlers", () => {
    beforeEach(() => {
      registerDiagnosticHandlers();
    });

    it("devrait enregistrer tous les handlers de diagnostic", () => {
      const channels = getRegisteredChannels();
      expect(channels).toContain("diagnostic-get-handlers");
      expect(channels).toContain("diagnostic-get-system");
      expect(channels).toContain("diagnostic-get-store");
      expect(channels).toContain("diagnostic-get-plugins");
      expect(channels).toContain("diagnostic-run-full");
      expect(channels).toContain("diagnostic-export");
      expect(channels).toContain("diagnostic-audio");
      expect(channels).toContain("diagnostic-sounds");
      expect(channels).toContain("diagnostic-shortcuts");
      expect(channels).toContain("diagnostic-performance");
      expect(channels).toContain("diagnostic-sidebar");
      expect(channels).toContain("diagnostic-editor");
    });

    it("diagnostic-get-handlers devrait retourner all + count + expected", async () => {
      const handler = getIpcHandler("diagnostic-get-handlers");
      const result = await handler();
      expect(result).toHaveProperty("all");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("expected");
      expect(Array.isArray(result.all)).toBe(true);
    });

    it("diagnostic-get-system devrait retourner les infos système", async () => {
      const handler = getIpcHandler("diagnostic-get-system");
      const result = await handler();
      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.userData).toBe("/fake/userData");
    });

    it("diagnostic-get-store devrait retourner les statuts par clé", async () => {
      store._data.set("profiles", [{ id: "p1" }]);
      const handler = getIpcHandler("diagnostic-get-store");
      const result = await handler();
      expect(result.profiles.exists).toBe(true);
      expect(result.profiles.type).toBe("object");
      expect(result.sounds.exists).toBe(false);
    });

    it("diagnostic-get-plugins devrait retourner { exists, plugins }", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("diagnostic-get-plugins");
      const result = await handler();
      expect(result).toHaveProperty("exists");
      expect(result).toHaveProperty("plugins");
    });

    it("diagnostic-run-full devrait retourner { success, timestamp }", async () => {
      const handler = getIpcHandler("diagnostic-run-full");
      const result = await handler();
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it("diagnostic-export devrait retourner le résultat d'export", async () => {
      const handler = getIpcHandler("diagnostic-export");
      const result = await handler();
      expect(result).toHaveProperty("success");
    });

    it("diagnostic-audio ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-audio");
      expect(() => handler()).not.toThrow();
    });

    it("diagnostic-sounds ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-sounds");
      expect(() => handler()).not.toThrow();
    });

    it("diagnostic-shortcuts ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-shortcuts");
      expect(() => handler()).not.toThrow();
    });

    it("diagnostic-performance ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-performance");
      expect(() => handler()).not.toThrow();
    });

    it("diagnostic-sidebar ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-sidebar");
      expect(() => handler()).not.toThrow();
    });

    it("diagnostic-editor ne devrait pas throw", () => {
      const handler = getIpcHandler("diagnostic-editor");
      expect(() => handler()).not.toThrow();
    });
  });
});
