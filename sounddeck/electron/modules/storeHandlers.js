/**
 * @file IPC handlers for the electron-store persistence layer.
 *
 * The renderer never has direct access to electron-store — all get/set/delete
 * calls go through these IPC handlers, exposed in `preload.js` as
 * `electronAPI.storeGet` / `storeSet` / `storeDelete` / `storeSetLang`.
 *
 * Also handles plugin lifecycle (list / install / uninstall) and startup
 * preferences (start minimized, launch at startup, global shortcuts state).
 *
 * @see ../store.js (the shared electron-store instance)
 * @see ../preload.js (exposes the IPC channels to the renderer)
 */

const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const store = require("../store");

/**
 * Returns the plugins directory (`<userData>/plugins`).
 *
 * @returns {string}
 */
function getPluginsDir() {
  return path.join(app.getPath("userData"), "plugins");
}

/**
 * Registers all store-related IPC handlers.
 *
 * Channels registered:
 * - `store-get`                    `(key) -> value`
 * - `store-set`                    `(key, value) -> true`
 * - `store-delete`                 `(key) -> true`
 * - `store-set-lang`               `(lang) -> true`
 * - `get-start-minimized`          `() -> boolean`
 * - `set-start-minimized`          `(value) -> true`
 * - `get-launch-at-startup`        `() -> boolean`
 * - `set-launch-at-startup`        `(value) -> true`
 * - `get-global-shortcuts-state`   `() -> boolean`
 * - `get-installed-plugins`        `() -> Array<Plugin>`
 * - `get-plugin-path`              `(pluginId) -> string | null`
 * - `get-plugin-component-path`    `(pluginId, pageId) -> string | null`
 * - `install-plugin-from-buffer`   `(buffer, fileName) -> { success, id?, error? }`
 * - `uninstall-plugin`             `(pluginId) -> { success, error? }`
 *
 * Must be called once, during app startup.
 *
 * @returns {void}
 */
function registerStoreHandlers() {
  // ─── Generic store access ──────────────────────────────────────────
  ipcMain.handle("store-get", (event, key) => {
    return store.get(key);
  });

  ipcMain.handle("store-set", (event, key, value) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle("store-delete", (event, key) => {
    store.delete(key);
    return true;
  });

  ipcMain.handle("store-set-lang", (event, lang) => {
    store.set("lang", lang);
    return true;
  });

  // ─── Startup preferences ───────────────────────────────────────────
  ipcMain.handle("get-start-minimized", () => {
    return !!store.get("startMinimized", false);
  });

  ipcMain.handle("set-start-minimized", (event, value) => {
    store.set("startMinimized", !!value);
    return true;
  });

  ipcMain.handle("get-launch-at-startup", () => {
    return !!store.get("launchAtStartup", false);
  });

  ipcMain.handle("set-launch-at-startup", (event, value) => {
    store.set("launchAtStartup", !!value);
    return true;
  });

  ipcMain.handle("get-global-shortcuts-state", () => {
    try {
      const { getShortcutsEnabled } = require("./shortcutManager");
      return !!getShortcutsEnabled();
    } catch {
      return !!store.get("globalShortcutsEnabled", true);
    }
  });

  // ─── Plugins ───────────────────────────────────────────────────────
  ipcMain.handle("get-installed-plugins", () => {
    const pluginsDir = getPluginsDir();
    if (!fs.existsSync(pluginsDir)) return [];

    let folders;
    try {
      folders = fs.readdirSync(pluginsDir);
    } catch {
      return [];
    }

    const result = [];
    for (const folder of folders) {
      const manifestPath = path.join(pluginsDir, folder, "plugin.json");
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, "utf-8");
        const manifest = JSON.parse(raw);
        result.push({ ...manifest, enabled: true });
      } catch (e) {
        console.warn(
          `[get-installed-plugins] plugin.json invalide (${folder}):`,
          e.message,
        );
      }
    }
    return result;
  });

  ipcMain.handle("get-plugin-path", (event, pluginId) => {
    if (!pluginId) return null;
    const indexPath = path.join(getPluginsDir(), pluginId, "index.js");
    return fs.existsSync(indexPath) ? indexPath : null;
  });

  ipcMain.handle("get-plugin-component-path", (event, pluginId, pageId) => {
    if (!pluginId || !pageId) return null;
    const componentPath = path.join(getPluginsDir(), pluginId, `${pageId}.jsx`);
    return fs.existsSync(componentPath) ? componentPath : null;
  });

  ipcMain.handle(
    "install-plugin-from-buffer",
    async (event, buffer, fileName) => {
      try {
        const AdmZip = require("adm-zip");
        const zip = new AdmZip(Buffer.from(buffer));

        const manifestEntry = zip.getEntry("plugin.json");
        if (!manifestEntry) {
          return {
            success: false,
            error: "plugin.json introuvable dans l'archive",
          };
        }

        const manifestRaw = manifestEntry.getData().toString("utf-8");
        const manifest = JSON.parse(manifestRaw);

        if (!manifest.id) {
          return {
            success: false,
            error: "plugin.json : champ 'id' manquant",
          };
        }

        // Sanitize the ID so it can be used as a directory name
        const safeId = String(manifest.id).replace(/[^a-zA-Z0-9_-]/g, "");
        if (!safeId) {
          return { success: false, error: "ID de plugin invalide" };
        }

        const pluginDir = path.join(getPluginsDir(), safeId);

        // Remove any existing install
        if (fs.existsSync(pluginDir)) {
          fs.rmSync(pluginDir, { recursive: true, force: true });
        }

        fs.mkdirSync(pluginDir, { recursive: true });
        zip.extractAllTo(pluginDir, true);

        return {
          success: true,
          id: safeId,
          name: manifest.name || safeId,
          version: manifest.version || "1.0.0",
        };
      } catch (e) {
        console.error(
          `[install-plugin-from-buffer] Erreur (${fileName || "?"}):`,
          e.message,
        );
        return { success: false, error: e.message };
      }
    },
  );

  ipcMain.handle("uninstall-plugin", async (event, pluginId) => {
    if (!pluginId) {
      return { success: false, error: "ID de plugin manquant" };
    }

    const pluginDir = path.join(getPluginsDir(), pluginId);
    if (!fs.existsSync(pluginDir)) {
      return { success: false, error: "Plugin non trouvé" };
    }

    try {
      fs.rmSync(pluginDir, { recursive: true, force: true });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerStoreHandlers };
