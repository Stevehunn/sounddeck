// electron/modules/storeHandlers.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// ⚠️ fs et adm-zip sont mockés GLOBALEMENT dans setup-electron.js.

import { registerStoreHandlers } from "./storeHandlers";
import { getIpcHandler, getRegisteredChannels } from "./__test-helpers__";

let fs;

describe("storeHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs = globalThis.__fsMock;
    globalThis.__setAdmZipGetEntry(null);
    registerStoreHandlers();
  });

  // ═══════════════════════════════════════════════════════════════════
  // store-get / store-set / store-delete / store-set-lang
  // ═══════════════════════════════════════════════════════════════════

  describe("store-get", () => {
    it("devrait retourner la valeur du store", () => {
      const handler = getIpcHandler("store-get");
      const result = handler({}, "unknownKey");
      expect(result).toBeUndefined();
    });

    it("devrait passer la clé correctement", () => {
      const handler = getIpcHandler("store-get");
      expect(() => handler({}, "myKey")).not.toThrow();
    });
  });

  describe("store-set", () => {
    it("devrait retourner true", () => {
      const handler = getIpcHandler("store-set");
      expect(handler({}, "key", "value")).toBe(true);
    });
  });

  describe("store-delete", () => {
    it("devrait retourner true", () => {
      const handler = getIpcHandler("store-delete");
      expect(handler({}, "key")).toBe(true);
    });
  });

  describe("store-set-lang", () => {
    it("devrait retourner true", () => {
      const handler = getIpcHandler("store-set-lang");
      expect(handler({}, "fr")).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Démarrage
  // ═══════════════════════════════════════════════════════════════════

  describe("get-start-minimized", () => {
    it("devrait retourner un boolean", () => {
      const handler = getIpcHandler("get-start-minimized");
      expect(typeof handler()).toBe("boolean");
    });
  });

  describe("set-start-minimized", () => {
    it("devrait retourner true", () => {
      const handler = getIpcHandler("set-start-minimized");
      expect(handler({}, true)).toBe(true);
    });
  });

  describe("get-launch-at-startup", () => {
    it("devrait retourner un boolean", () => {
      const handler = getIpcHandler("get-launch-at-startup");
      expect(typeof handler()).toBe("boolean");
    });
  });

  describe("set-launch-at-startup", () => {
    it("devrait retourner true", () => {
      const handler = getIpcHandler("set-launch-at-startup");
      expect(handler({}, true)).toBe(true);
    });
  });

  describe("get-global-shortcuts-state", () => {
    it("devrait retourner un boolean", () => {
      const handler = getIpcHandler("get-global-shortcuts-state");
      expect(typeof handler()).toBe("boolean");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Plugins
  // ═══════════════════════════════════════════════════════════════════

  describe("get-installed-plugins", () => {
    it("devrait retourner [] si dossier plugins inexistant", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("get-installed-plugins");
      const result = await handler();
      expect(result).toEqual([]);
    });

    it("devrait lister les plugins valides", async () => {
      fs.existsSync.mockImplementation((p) => {
        if (p.includes("plugins")) return true;
        if (p.includes("plugin.json")) return true;
        return false;
      });
      fs.readdirSync.mockReturnValue(["plugin-a", "plugin-b"]);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ id: "plugin-a", name: "Plugin A", version: "1.0.0" }),
      );

      const handler = getIpcHandler("get-installed-plugins");
      const result = await handler();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
      expect(result[0].enabled).toBe(true);
    });

    it("devrait ignorer les dossiers sans plugin.json", async () => {
      fs.existsSync.mockImplementation((p) => {
        // ⚠️ ordre important : tester plugin.json AVANT plugins
        if (p.includes("plugin.json")) return false;
        if (
          p.endsWith("plugins") ||
          p.includes(`${path.sep}plugins${path.sep}`)
        )
          return true;
        return false;
      });
      fs.readdirSync.mockReturnValue(["invalid-folder"]);

      const handler = getIpcHandler("get-installed-plugins");
      const result = await handler();
      expect(result).toEqual([]);
    });

    it("devrait gérer les JSON invalides sans crash", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(["broken"]);
      fs.readFileSync.mockReturnValue("{invalid json");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const handler = getIpcHandler("get-installed-plugins");
      const result = await handler();
      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe("get-plugin-path", () => {
    it("devrait retourner le chemin index.js si existe", async () => {
      fs.existsSync.mockReturnValue(true);
      const handler = getIpcHandler("get-plugin-path");
      const result = await handler({}, "my-plugin");
      expect(result).toContain("my-plugin");
      expect(result).toContain("index.js");
    });

    it("devrait retourner null si index.js absent", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("get-plugin-path");
      const result = await handler({}, "my-plugin");
      expect(result).toBeNull();
    });
  });

  describe("get-plugin-component-path", () => {
    it("devrait retourner le chemin du composant si existe", async () => {
      fs.existsSync.mockReturnValue(true);
      const handler = getIpcHandler("get-plugin-component-path");
      const result = await handler({}, "my-plugin", "page-1");
      expect(result).toContain("my-plugin");
      expect(result).toContain("page-1.jsx");
    });

    it("devrait retourner null si composant absent", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("get-plugin-component-path");
      const result = await handler({}, "my-plugin", "page-1");
      expect(result).toBeNull();
    });
  });

  describe("install-plugin-from-buffer", () => {
    it("devrait extraire le plugin et retourner les métadonnées", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("install-plugin-from-buffer");
      const result = await handler({}, new ArrayBuffer(100), "test.zip");

      expect(result.success).toBe(true);
      expect(result.id).toBe("test-plugin");
      expect(result.name).toBe("Test");
      expect(result.version).toBe("1.0.0");
    });

    it("devrait nettoyer l'id (caractères invalides)", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("install-plugin-from-buffer");
      const result = await handler({}, new ArrayBuffer(100), "test.zip");
      expect(result.id).not.toMatch(/[^a-zA-Z0-9_-]/);
    });

    it("devrait supprimer le dossier existant avant extraction", async () => {
      fs.existsSync.mockReturnValue(true);
      const handler = getIpcHandler("install-plugin-from-buffer");
      await handler({}, new ArrayBuffer(100), "test.zip");
      expect(fs.rmSync).toHaveBeenCalled();
    });

    it("devrait gérer une erreur d'extraction", async () => {
      globalThis.__setAdmZipGetEntry(() => null);

      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("install-plugin-from-buffer");
      const result = await handler({}, new ArrayBuffer(100), "test.zip");

      expect(result.success).toBe(false);
      expect(result.error).toContain("plugin.json");
    });
  });

  describe("uninstall-plugin", () => {
    it("devrait supprimer le dossier du plugin", async () => {
      fs.existsSync.mockReturnValue(true);
      const handler = getIpcHandler("uninstall-plugin");
      const result = await handler({}, "my-plugin");
      expect(result.success).toBe(true);
      expect(fs.rmSync).toHaveBeenCalled();
    });

    it("devrait retourner une erreur si plugin introuvable", async () => {
      fs.existsSync.mockReturnValue(false);
      const handler = getIpcHandler("uninstall-plugin");
      const result = await handler({}, "unknown-plugin");
      expect(result.success).toBe(false);
      expect(result.error).toContain("non trouvé");
    });

    it("devrait gérer une erreur de suppression", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.rmSync.mockImplementation(() => {
        throw new Error("permission denied");
      });
      const handler = getIpcHandler("uninstall-plugin");
      const result = await handler({}, "my-plugin");
      expect(result.success).toBe(false);
      expect(result.error).toBe("permission denied");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Vérification finale
  // ═══════════════════════════════════════════════════════════════════

  describe("registerStoreHandlers", () => {
    it("devrait enregistrer tous les handlers attendus", () => {
      const channels = getRegisteredChannels();
      expect(channels).toContain("store-get");
      expect(channels).toContain("store-set");
      expect(channels).toContain("store-delete");
      expect(channels).toContain("store-set-lang");
      expect(channels).toContain("get-start-minimized");
      expect(channels).toContain("set-start-minimized");
      expect(channels).toContain("get-launch-at-startup");
      expect(channels).toContain("set-launch-at-startup");
      expect(channels).toContain("get-global-shortcuts-state");
      expect(channels).toContain("get-installed-plugins");
      expect(channels).toContain("get-plugin-path");
      expect(channels).toContain("get-plugin-component-path");
      expect(channels).toContain("install-plugin-from-buffer");
      expect(channels).toContain("uninstall-plugin");
    });
  });
});
