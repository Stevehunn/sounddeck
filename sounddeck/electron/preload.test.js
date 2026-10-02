// electron/preload.test.js
import { describe, it, expect, beforeAll, vi } from "vitest";

// ✅ Safety net : window/File doivent exister AVANT le moindre import de preload.
//    (Redondant avec setup-electron.js mais garantit l'ordre.)
if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}
if (typeof globalThis.File === "undefined") {
  globalThis.File = class File {};
}

describe("preload.js (electron)", () => {
  let contextBridge;
  let ipcRenderer;
  let exposedApi;
  let exposeCalls;

  beforeAll(async () => {
    const electron = globalThis.__electronMock;
    contextBridge = electron.contextBridge;
    ipcRenderer = electron.ipcRenderer;

    // Clear avant import
    contextBridge.exposeInMainWorld.mockClear();
    ipcRenderer.invoke.mockClear();

    // Charge preload (exécute ses side-effects)
    await import("./preload");

    exposeCalls = contextBridge.exposeInMainWorld.mock.calls.slice();
    exposedApi = exposeCalls[0]?.[1];
  });

  // ═══════════════════════════════════════════════════════════════════
  // Exposition de l'API
  // ═══════════════════════════════════════════════════════════════════

  it("devrait appeler contextBridge.exposeInMainWorld", () => {
    expect(exposeCalls.length).toBeGreaterThan(0);
  });

  it('devrait exposer sous le nom "electronAPI"', () => {
    expect(exposeCalls[0][0]).toBe("electronAPI");
  });

  it("devrait exposer un objet", () => {
    expect(typeof exposedApi).toBe("object");
    expect(exposedApi).not.toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════
  // API Fichiers
  // ═══════════════════════════════════════════════════════════════════

  it("devrait exposer openFileDialog, openImageDialog, etc.", () => {
    expect(typeof exposedApi.openFileDialog).toBe("function");
    expect(typeof exposedApi.openImageDialog).toBe("function");
    expect(typeof exposedApi.importSoundFile).toBe("function");
    expect(typeof exposedApi.importImageFile).toBe("function");
    expect(typeof exposedApi.downloadSoundUrl).toBe("function");
    expect(typeof exposedApi.trimSoundFile).toBe("function");
    expect(typeof exposedApi.deleteSoundFile).toBe("function");
    expect(typeof exposedApi.getSoundsDir).toBe("function");
    expect(typeof exposedApi.fileExists).toBe("function");
    expect(typeof exposedApi.writeDroppedFile).toBe("function");
    expect(typeof exposedApi.exportJsonFile).toBe("function");
  });

  // ═══════════════════════════════════════════════════════════════════
  // API Store
  // ═══════════════════════════════════════════════════════════════════

  it("devrait exposer storeGet/storeSet/storeDelete/storeSetLang", () => {
    expect(typeof exposedApi.storeGet).toBe("function");
    expect(typeof exposedApi.storeSet).toBe("function");
    expect(typeof exposedApi.storeDelete).toBe("function");
    expect(typeof exposedApi.storeSetLang).toBe("function");
  });

  it('storeGet devrait appeler ipcRenderer.invoke("store-get", key)', () => {
    ipcRenderer.invoke.mockClear();
    exposedApi.storeGet("lang");
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("store-get", "lang");
  });

  it('storeSet devrait appeler ipcRenderer.invoke("store-set", key, value)', () => {
    ipcRenderer.invoke.mockClear();
    exposedApi.storeSet("theme", "dark");
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "store-set",
      "theme",
      "dark",
    );
  });

  it('storeDelete devrait appeler ipcRenderer.invoke("store-delete", key)', () => {
    ipcRenderer.invoke.mockClear();
    exposedApi.storeDelete("theme");
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("store-delete", "theme");
  });

  // ═══════════════════════════════════════════════════════════════════
  // API Raccourcis
  // ═══════════════════════════════════════════════════════════════════

  it("devrait exposer les fonctions de raccourcis", () => {
    expect(typeof exposedApi.updateShortcuts).toBe("function");
    expect(typeof exposedApi.updateProfileShortcut).toBe("function");
    expect(typeof exposedApi.updateLoopShortcut).toBe("function");
    expect(typeof exposedApi.updateStopAllShortcut).toBe("function");
    expect(typeof exposedApi.toggleGlobalShortcuts).toBe("function");
  });

  it("updateShortcuts devrait appeler ipcRenderer.invoke", () => {
    ipcRenderer.invoke.mockClear();
    const shortcuts = { "sound-1": "Ctrl+1" };
    exposedApi.updateShortcuts(shortcuts);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "update-shortcuts",
      shortcuts,
    );
  });

  // ═══════════════════════════════════════════════════════════════════
  // API Listeners (on)
  // ═══════════════════════════════════════════════════════════════════

  it("devrait exposer les listeners on*", () => {
    expect(typeof exposedApi.onPlaySound).toBe("function");
    expect(typeof exposedApi.onSwitchProfile).toBe("function");
    expect(typeof exposedApi.onToggleLoop).toBe("function");
    expect(typeof exposedApi.onStopAllSounds).toBe("function");
    expect(typeof exposedApi.onTogglePresentation).toBe("function");
    expect(typeof exposedApi.onShortcutsToggle).toBe("function");
    expect(typeof exposedApi.onShowQuitConfirm).toBe("function");
    expect(typeof exposedApi.onHideQuitConfirm).toBe("function");
  });

  it("onPlaySound devrait enregistrer un listener via ipcRenderer.on", () => {
    ipcRenderer.on.mockClear();
    const cb = () => {};
    exposedApi.onPlaySound(cb);
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      "play-sound",
      expect.any(Function),
    );
  });

  it("onPlaySound devrait passer le soundId au callback", () => {
    ipcRenderer.on.mockClear();
    const cb = vi.fn();
    exposedApi.onPlaySound(cb);

    const [, listener] = ipcRenderer.on.mock.calls[0];
    listener({}, "sound-42");
    expect(cb).toHaveBeenCalledWith("sound-42");
  });

  it("onShortcutsToggle devrait passer le boolean au callback", () => {
    ipcRenderer.on.mockClear();
    const cb = vi.fn();
    exposedApi.onShortcutsToggle(cb);

    const [, listener] = ipcRenderer.on.mock.calls[0];
    listener({}, true);
    expect(cb).toHaveBeenCalledWith(true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // API Système / Plugins / Éditeur
  // ═══════════════════════════════════════════════════════════════════

  it("devrait exposer les fonctions système", () => {
    expect(typeof exposedApi.quitApp).toBe("function");
    expect(typeof exposedApi.hideWindow).toBe("function");
    expect(typeof exposedApi.showWindow).toBe("function");
    expect(typeof exposedApi.confirmQuit).toBe("function");
    expect(typeof exposedApi.getSystemLanguage).toBe("function");
  });

  it("devrait exposer les fonctions plugins", () => {
    expect(typeof exposedApi.getInstalledPlugins).toBe("function");
    expect(typeof exposedApi.getPluginPath).toBe("function");
    expect(typeof exposedApi.installPluginFromBuffer).toBe("function");
    expect(typeof exposedApi.uninstallPlugin).toBe("function");
  });

  it("devrait exposer les fonctions éditeur", () => {
    expect(typeof exposedApi.saveEditorProject).toBe("function");
    expect(typeof exposedApi.loadEditorProject).toBe("function");
    expect(typeof exposedApi.getAllEditorProjects).toBe("function");
    expect(typeof exposedApi.exportEditorProject).toBe("function");
  });

  it("devrait exposer les fonctions YouTube", () => {
    expect(typeof exposedApi.checkYtdlp).toBe("function");
    expect(typeof exposedApi.downloadYtdlp).toBe("function");
    expect(typeof exposedApi.youtubeInfo).toBe("function");
    expect(typeof exposedApi.youtubeDownload).toBe("function");
  });

  it("devrait exposer isElectron: true", () => {
    expect(exposedApi.isElectron).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // COUVERTURE EXHAUSTIVE — appel de toutes les fonctions exposées
  // ═══════════════════════════════════════════════════════════════════

  describe("couverture exhaustive — fichiers", () => {
    it("devrait appeler toutes les fonctions fichiers une fois", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.openFileDialog();
      exposedApi.openImageDialog();
      exposedApi.openDirectoryDialog();
      exposedApi.importSoundFile("/path");
      exposedApi.importImageFile("/path");
      exposedApi.downloadSoundUrl("http://x", "file.mp3");
      exposedApi.trimSoundFile("/path", 0, 10);
      exposedApi.deleteSoundFile("/path");
      exposedApi.getSoundsDir();
      exposedApi.fileExists("/path");
      exposedApi.writeDroppedFile("file.mp3", new ArrayBuffer(10));
      exposedApi.exportJsonFile("{}", "out.json", "Title");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(12);
    });
  });

  describe("couverture exhaustive — store", () => {
    it("devrait appeler toutes les fonctions store une fois", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.storeGet("key");
      exposedApi.storeSet("key", "value");
      exposedApi.storeDelete("key");
      exposedApi.storeSetLang("fr");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(4);
    });
  });

  describe("couverture exhaustive — myinstants/emoji", () => {
    it("devrait appeler fetchMyinstants", () => {
      ipcRenderer.invoke.mockClear();
      exposedApi.fetchMyinstants("search", "search", "fr");
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "fetch-myinstants",
        "search",
        "search",
        "fr",
      );
    });

    it("devrait appeler fetchEmojis", () => {
      ipcRenderer.invoke.mockClear();
      exposedApi.fetchEmojis("smileys");
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(
        "fetch-emojis",
        "smileys",
      );
    });
  });

  describe("couverture exhaustive — raccourcis", () => {
    it("devrait appeler toutes les fonctions raccourcis", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.updateShortcuts({});
      exposedApi.updateProfileShortcut("Ctrl+P");
      exposedApi.updateLoopShortcut("Ctrl+L");
      exposedApi.updateStopAllShortcut("Ctrl+S");
      exposedApi.updatePresentationShortcut("Ctrl+Shift+P");
      exposedApi.updateToggleShortcutsAccelerator("Ctrl+K");
      exposedApi.updateToggleWindowShortcut("Ctrl+W");
      exposedApi.toggleGlobalShortcuts();
      exposedApi.getGlobalShortcutsState();

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(9);
    });
  });

  describe("couverture exhaustive — IPC listeners", () => {
    it("devrait enregistrer tous les listeners", () => {
      ipcRenderer.on.mockClear();

      exposedApi.onPlaySound(() => {});
      exposedApi.onSwitchProfile(() => {});
      exposedApi.onToggleLoop(() => {});
      exposedApi.onStopAllSounds(() => {});
      exposedApi.onTogglePresentation(() => {});
      exposedApi.onShortcutsToggle(() => {});
      exposedApi.onShowQuitConfirm(() => {});
      exposedApi.onHideQuitConfirm(() => {});
      exposedApi.onShowWindow(() => {});

      expect(ipcRenderer.on).toHaveBeenCalledTimes(9);
    });

    it("removeAllListeners devrait appeler ipcRenderer.removeAllListeners", () => {
      ipcRenderer.removeAllListeners.mockClear();
      exposedApi.removeAllListeners("play-sound");
      expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith("play-sound");
    });
  });

  describe("couverture exhaustive — tray & fenêtre", () => {
    it("devrait appeler toutes les fonctions tray", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.updateTrayLanguage("fr");
      exposedApi.getStartMinimized();
      exposedApi.setStartMinimized(true);
      exposedApi.getLaunchAtStartup();
      exposedApi.setLaunchAtStartup(true);
      exposedApi.quitApp();
      exposedApi.hideWindow();
      exposedApi.showWindow();
      exposedApi.confirmQuit("quit", false);

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(9);
    });
  });

  describe("couverture exhaustive — pilote virtuel", () => {
    it("devrait appeler toutes les fonctions pilote", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.installVirtualDriver();
      exposedApi.uninstallVirtualDriver();
      exposedApi.getVirtualDriverStatus();

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("couverture exhaustive — YouTube", () => {
    it("devrait appeler toutes les fonctions YouTube", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.checkYtdlp();
      exposedApi.downloadYtdlp();
      exposedApi.youtubeInfo("http://youtube.com/x");
      exposedApi.youtubeDownload("http://youtube.com/x", 0, 10, "title");
      exposedApi.downloadThumbnail("http://thumb.jpg", "name");
      exposedApi.openExternal("http://x");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(6);
    });
  });

  describe("couverture exhaustive — Spotify/SoundCloud", () => {
    it("devrait appeler les fonctions de plateforme", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.spotifyTrackInfo("track-id");
      exposedApi.soundcloudTrackInfo("http://soundcloud.com/x");
      exposedApi.downloadPlatformTrack({ platform: "spotify" });

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("couverture exhaustive — export/import", () => {
    it("devrait appeler toutes les fonctions export/import", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.exportProfile("p1");
      exposedApi.importProfile();
      exposedApi.exportConfig();
      exposedApi.exportFull();
      exposedApi.exportSoundsOnly();
      exposedApi.importBackup();

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(6);
    });
  });

  describe("couverture exhaustive — système", () => {
    it("devrait appeler les fonctions système", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.getSystemLanguage();
      exposedApi.getSystemKeyboardLayout();

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe("couverture exhaustive — plugins", () => {
    it("devrait appeler toutes les fonctions plugins", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.getInstalledPlugins();
      exposedApi.getPluginPath("plugin-id");
      exposedApi.getPluginComponentPath("plugin-id", "page-id");
      exposedApi.installPluginFromBuffer(new ArrayBuffer(10), "file.zip");
      exposedApi.uninstallPlugin("plugin-id");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(5);
    });
  });

  describe("couverture exhaustive — éditeur", () => {
    it("devrait appeler toutes les fonctions éditeur", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.saveFileDialog("out.wav", new ArrayBuffer(10));
      exposedApi.writeSoundFile("/path", new ArrayBuffer(10));
      exposedApi.exportAudioFile(new ArrayBuffer(10), "out.wav", "wav");
      exposedApi.convertAudio("/in.mp3", "/out.ogg", "ogg", 192);
      exposedApi.readFile("/path");
      exposedApi.readFileBase64("/path");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(6);
    });
  });

  describe("couverture exhaustive — projets éditeur", () => {
    it("devrait appeler toutes les fonctions projets", () => {
      ipcRenderer.invoke.mockClear();

      exposedApi.saveEditorProject({ id: "p1" });
      exposedApi.loadEditorProject("p1");
      exposedApi.getAllEditorProjects();
      exposedApi.getRecentEditorProjects();
      exposedApi.deleteEditorProject("p1");
      exposedApi.renameEditorProject("p1", "New Name");
      exposedApi.duplicateEditorProject("p1");
      exposedApi.exportEditorProject({ id: "p1" }, "/path.json");
      exposedApi.importEditorProject("/path.json");

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(9);
    });
  });

  describe("couverture exhaustive — divers", () => {
    it("isElectron devrait être true", () => {
      expect(exposedApi.isElectron).toBe(true);
    });

    it("devrait enregistrer le listener DOMContentLoaded", () => {
      // Le preload enregistre un listener au chargement
      expect(window.addEventListener).toHaveBeenCalledWith(
        "DOMContentLoaded",
        expect.any(Function),
      );
    });
  });
});
