/**
 * @file Secure context bridge between the main process and the renderer.
 *
 * The renderer has NO access to Node.js primitives (`require`, `process`,
 * `fs`, etc.). Everything it can do is exposed here via
 * `contextBridge.exposeInMainWorld('electronAPI', {…})`.
 *
 * Each method below maps 1:1 to an `ipcMain.handle('channel', …)` handler
 * registered in the main process (see `./modules/*`). The channel names
 * are the strings passed to `ipcRenderer.invoke(channel, …)`.
 *
 * @see https://www.electronjs.org/docs/latest/tutorial/context-isolation
 * @see ./main.js
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ─── FILES ──────────────────────────────────────────────────────────────
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  openImageDialog: () => ipcRenderer.invoke("open-image-dialog"),
  importSoundFile: (filePath) =>
    ipcRenderer.invoke("import-sound-file", filePath),
  importImageFile: (filePath) =>
    ipcRenderer.invoke("import-image-file", filePath),
  downloadSoundUrl: (url, fileName) =>
    ipcRenderer.invoke("download-sound-url", url, fileName),
  trimSoundFile: (filePath, start, end) =>
    ipcRenderer.invoke("trim-sound-file", filePath, start, end),
  deleteSoundFile: (filePath) =>
    ipcRenderer.invoke("delete-sound-file", filePath),
  getSoundsDir: () => ipcRenderer.invoke("get-sounds-dir"),
  fileExists: (filePath) => ipcRenderer.invoke("file-exists", filePath),
  writeDroppedFile: (fileName, arrayBuffer) =>
    ipcRenderer.invoke("write-dropped-file", fileName, arrayBuffer),

  /** Export any JSON-serializable object to a file chosen via native dialog. */
  exportJsonFile: (json, defaultName, title) =>
    ipcRenderer.invoke("export-json-file", json, defaultName, title),

  // ─── STORE ──────────────────────────────────────────────────────────────
  storeGet: (key) => ipcRenderer.invoke("store-get", key),
  storeSet: (key, value) => ipcRenderer.invoke("store-set", key, value),
  storeDelete: (key) => ipcRenderer.invoke("store-delete", key),
  storeSetLang: (lang) => ipcRenderer.invoke("store-set-lang", lang),

  // ─── MYINSTANTS ─────────────────────────────────────────────────────────
  fetchMyinstants: (query, mode, lang) =>
    ipcRenderer.invoke("fetch-myinstants", query, mode, lang),

  /** Fetches emojis for a category (getemoji.com). */
  fetchEmojis: (categoryId) => ipcRenderer.invoke("fetch-emojis", categoryId),

  // ─── SHORTCUTS ──────────────────────────────────────────────────────────
  updateShortcuts: (shortcuts) =>
    ipcRenderer.invoke("update-shortcuts", shortcuts),
  updateProfileShortcut: (acc) =>
    ipcRenderer.invoke("update-profile-shortcut", acc),
  updateLoopShortcut: (acc) => ipcRenderer.invoke("update-loop-shortcut", acc),
  updateStopAllShortcut: (acc) =>
    ipcRenderer.invoke("update-stop-all-shortcut", acc),
  updatePresentationShortcut: (acc) =>
    ipcRenderer.invoke("update-presentation-shortcut", acc),
  updateToggleShortcutsAccelerator: (accelerator) =>
    ipcRenderer.invoke("update-toggle-shortcuts-accelerator", accelerator),
  updateToggleWindowShortcut: (accelerator) =>
    ipcRenderer.invoke("update-toggle-window-shortcut", accelerator),
  toggleGlobalShortcuts: () => ipcRenderer.invoke("toggle-global-shortcuts"),
  getGlobalShortcutsState: () =>
    ipcRenderer.invoke("get-global-shortcuts-state"),

  // ─── IPC LISTENERS (main → renderer) ────────────────────────────────────
  onPlaySound: (cb) => ipcRenderer.on("play-sound", (e, id) => cb(id)),
  onSwitchProfile: (cb) => ipcRenderer.on("switch-profile", () => cb()),
  onToggleLoop: (cb) => ipcRenderer.on("toggle-loop", () => cb()),
  onStopAllSounds: (cb) => ipcRenderer.on("stop-all-sounds", () => cb()),
  onTogglePresentation: (cb) =>
    ipcRenderer.on("toggle-presentation", () => cb()),
  onShortcutsToggle: (cb) =>
    ipcRenderer.on("shortcuts-toggle", (e, enabled) => cb(enabled)),
  onShowQuitConfirm: (cb) => ipcRenderer.on("show-quit-confirm", () => cb()),
  onHideQuitConfirm: (cb) => ipcRenderer.on("hide-quit-confirm", () => cb()),
  onShowWindow: (cb) => ipcRenderer.on("show-window", () => cb()),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),

  // ─── SOUND POPUP (separate BrowserWindow) ───────────────────────────────
  soundPopup: {
    show: (payload) => ipcRenderer.invoke("sound-popup:show", payload),
    hide: () => ipcRenderer.invoke("sound-popup:hide"),
    setEnabled: (enabled) =>
      ipcRenderer.invoke("sound-popup:set-enabled", enabled),
    setPosition: (position) =>
      ipcRenderer.invoke("sound-popup:set-position", position),
    setSize: (size) => ipcRenderer.invoke("sound-popup:set-size", size),
    preview: (payload) => ipcRenderer.invoke("sound-popup:preview", payload),
    onAction: (cb) => {
      const listener = (_e, action) => cb(action);
      ipcRenderer.on("sound-popup:action", listener);
      return () => ipcRenderer.removeListener("sound-popup:action", listener);
    },
  },

  // ─── TRAY ───────────────────────────────────────────────────────────────
  updateTrayLanguage: (lang) =>
    ipcRenderer.invoke("update-tray-language", lang),
  getStartMinimized: () => ipcRenderer.invoke("get-start-minimized"),
  setStartMinimized: (value) =>
    ipcRenderer.invoke("set-start-minimized", value),
  getLaunchAtStartup: () => ipcRenderer.invoke("get-launch-at-startup"),
  setLaunchAtStartup: (value) =>
    ipcRenderer.invoke("set-launch-at-startup", value),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  showWindow: () => ipcRenderer.invoke("show-window"),
  confirmQuit: (action, remember) =>
    ipcRenderer.invoke("confirm-quit", action, remember),

  // ─── VIRTUAL AUDIO DRIVER ───────────────────────────────────────────────
  installVirtualDriver: () => ipcRenderer.invoke("install-virtual-driver"),
  uninstallVirtualDriver: () => ipcRenderer.invoke("uninstall-virtual-driver"),
  getVirtualDriverStatus: () => ipcRenderer.invoke("get-virtual-driver-status"),

  // ─── YOUTUBE ────────────────────────────────────────────────────────────
  checkYtdlp: () => ipcRenderer.invoke("check-ytdlp"),
  downloadYtdlp: () => ipcRenderer.invoke("download-ytdlp"),
  youtubeInfo: (url) => ipcRenderer.invoke("youtube-info", url),
  youtubeDownload: (url, start, end, title) =>
    ipcRenderer.invoke("youtube-download", url, start, end, title),
  downloadThumbnail: (url, soundName) =>
    ipcRenderer.invoke("download-thumbnail", url, soundName),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // ─── SPOTIFY / SOUNDCLOUD ──────────────────────────────────────────────
  spotifyTrackInfo: (trackId) =>
    ipcRenderer.invoke("spotify-track-info", trackId),
  soundcloudTrackInfo: (url) =>
    ipcRenderer.invoke("soundcloud-track-info", url),
  downloadPlatformTrack: (params) =>
    ipcRenderer.invoke("download-platform-track", params),

  // ─── EXPORT / IMPORT ────────────────────────────────────────────────────
  exportProfile: (profileId) => ipcRenderer.invoke("export-profile", profileId),
  importProfile: () => ipcRenderer.invoke("import-profile"),
  exportConfig: () => ipcRenderer.invoke("export-config"),
  exportFull: () => ipcRenderer.invoke("export-full"),
  exportSoundsOnly: () => ipcRenderer.invoke("export-sounds-only"),
  importBackup: () => ipcRenderer.invoke("import-backup"),

  // ─── SYSTEM ─────────────────────────────────────────────────────────────
  getSystemLanguage: () => ipcRenderer.invoke("get-system-language"),
  getSystemKeyboardLayout: () =>
    ipcRenderer.invoke("get-system-keyboard-layout"),

  // ─── PLUGINS ────────────────────────────────────────────────────────────
  getInstalledPlugins: () => ipcRenderer.invoke("get-installed-plugins"),
  getPluginPath: (pluginId) => ipcRenderer.invoke("get-plugin-path", pluginId),
  getPluginComponentPath: (pluginId, pageId) =>
    ipcRenderer.invoke("get-plugin-component-path", pluginId, pageId),
  installPluginFromBuffer: (buffer, fileName) =>
    ipcRenderer.invoke("install-plugin-from-buffer", buffer, fileName),
  uninstallPlugin: (pluginId) =>
    ipcRenderer.invoke("uninstall-plugin", pluginId),

  // ─── ADVANCED EDITOR ────────────────────────────────────────────────────
  saveFileDialog: (fileName, buffer) =>
    ipcRenderer.invoke("save-file-dialog", fileName, buffer),
  writeSoundFile: (filePath, data) =>
    ipcRenderer.invoke("write-sound-file", filePath, data),
  exportAudioFile: (data, fileName, format) =>
    ipcRenderer.invoke("export-audio-file", { data, fileName, format }),
  convertAudio: (inputPath, outputPath, format, bitrate) =>
    ipcRenderer.invoke("convert-audio", inputPath, outputPath, format, bitrate),
  openDirectoryDialog: () => ipcRenderer.invoke("open-directory-dialog"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  readFileBase64: (filePath) =>
    ipcRenderer.invoke("read-file-base64", filePath),

  // ─── EDITOR PROJECTS ────────────────────────────────────────────────────
  saveEditorProject: (projectData) =>
    ipcRenderer.invoke("save-editor-project", projectData),
  loadEditorProject: (projectId) =>
    ipcRenderer.invoke("load-editor-project", projectId),
  getAllEditorProjects: () => ipcRenderer.invoke("get-all-editor-projects"),
  getRecentEditorProjects: () =>
    ipcRenderer.invoke("get-recent-editor-projects"),
  deleteEditorProject: (projectId) =>
    ipcRenderer.invoke("delete-editor-project", projectId),
  renameEditorProject: (projectId, newName) =>
    ipcRenderer.invoke("rename-editor-project", { projectId, newName }),
  duplicateEditorProject: (projectId) =>
    ipcRenderer.invoke("duplicate-editor-project", projectId),
  exportEditorProject: (project, filePath) =>
    ipcRenderer.invoke("export-editor-project", { project, filePath }),
  importEditorProject: (filePath) =>
    ipcRenderer.invoke("import-editor-project", filePath),

  // ─── AUTO-UPDATE ────────────────────────────────────────────────────────
  updateCheck: () => ipcRenderer.invoke("update:check"),
  updateDownload: () => ipcRenderer.invoke("update:download"),
  updateInstall: () => ipcRenderer.invoke("update:install"),
  updateOpenGithub: () => ipcRenderer.invoke("update:open-github"),
  onUpdateChecking: (cb) => ipcRenderer.on("update:checking", () => cb()),
  onUpdateAvailable: (cb) =>
    ipcRenderer.on("update:available", (e, info) => cb(info)),
  onUpdateNotAvailable: (cb) =>
    ipcRenderer.on("update:not-available", (e, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on("update:progress", (e, p) => cb(p)),
  onUpdateDownloaded: (cb) =>
    ipcRenderer.on("update:downloaded", (e, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on("update:error", (e, err) => cb(err)),

  // ─── MISC ───────────────────────────────────────────────────────────────
  isElectron: true,
});

window.addEventListener("DOMContentLoaded", () => {
  const originalFileDescriptor = Object.getOwnPropertyDescriptor(
    File.prototype,
    "path",
  );
  if (!originalFileDescriptor) {
    console.warn("File.path not natively available — drop partially limited");
  }
});
