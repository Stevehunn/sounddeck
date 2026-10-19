/**
 * @file React hook for the in-app auto-updater UI.
 *
 * Mirror of `electron/modules/autoUpdater.js` on the renderer side. Listens
 * to the `update:*` IPC events emitted by the main process and exposes a
 * reactive state object plus three actions (`download`, `install`,
 * `openGithub`) that the sidebar banner calls when the user clicks.
 *
 * State machine (`status`):
 *
 *   idle ──check──▶ checking ──available──▶ available
 *                       │                       │
 *                       ▼                       ▼
 *                  not-available         downloading ──▶ downloaded
 *                       │                       │               │
 *                       ▼                       ▼               ▼
 *                      idle                   error          (install)
 *
 * On error, the UI falls back to `openGithub()` (manual download from the
 * releases page) — the flow is never a dead end.
 *
 * @see electron/modules/autoUpdater.js
 * @see src/shared/components/navigation/Sidebar.jsx (UpdateBanner)
 */

import { useState, useEffect, useCallback } from "react";
import { logWarn } from "@shared/utils/logger";

/**
 * Subscribes to auto-updater events and exposes the current update state
 * with imperative actions.
 *
 * @returns {{
 *   status: 'idle'|'checking'|'available'|'downloading'|'downloaded'|'error',
 *   version: string|null,
 *   releaseNotes: string|null,
 *   progress: {percent: number, transferred: number, total: number, bytesPerSecond: number}|null,
 *   error: string|null,
 *   download: () => Promise<void>,
 *   install: () => Promise<void>,
 *   openGithub: () => Promise<void>,
 * }}
 */
export function useAutoUpdater() {
  const [state, setState] = useState({
    status: "idle",
    version: null,
    releaseNotes: null,
    progress: null,
    error: null,
  });

  // ─── Subscribe to IPC events ────────────────────────────────────────
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateChecking?.(() => {
      setState((s) => ({ ...s, status: "checking", error: null }));
    });

    api.onUpdateAvailable?.((info) => {
      setState((s) => ({
        ...s,
        status: "available",
        version: info.version,
        releaseNotes: info.releaseNotes || null,
        error: null,
      }));
    });

    api.onUpdateNotAvailable?.(() => {
      setState((s) => ({ ...s, status: "idle" }));
    });

    api.onUpdateProgress?.((p) => {
      setState((s) => ({ ...s, status: "downloading", progress: p }));
    });

    api.onUpdateDownloaded?.((info) => {
      setState((s) => ({
        ...s,
        status: "downloaded",
        version: info.version,
        releaseNotes: info.releaseNotes || s.releaseNotes,
        progress: null,
      }));
    });

    api.onUpdateError?.((err) => {
      logWarn("useAutoUpdater", "Error", err);
      setState((s) => ({ ...s, status: "error", error: err.message }));
    });

    return () => {
      api.removeAllListeners?.("update:checking");
      api.removeAllListeners?.("update:available");
      api.removeAllListeners?.("update:not-available");
      api.removeAllListeners?.("update:progress");
      api.removeAllListeners?.("update:downloaded");
      api.removeAllListeners?.("update:error");
    };
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────

  /**
   * Starts downloading the available update.
   * Switches `status` to `'downloading'` immediately (before the first
   * progress event arrives) for a snappier UI.
   *
   * @returns {Promise<void>}
   */
  const download = useCallback(async () => {
    setState((s) => ({
      ...s,
      status: "downloading",
      progress: null,
      error: null,
    }));
    const res = await window.electronAPI?.updateDownload?.();
    if (!res?.ok) {
      setState((s) => ({
        ...s,
        status: "error",
        error: res?.error || "Download failed",
      }));
    }
  }, []);

  /**
   * Quits the app and installs the downloaded update.
   * Delegates to `autoUpdater.quitAndInstall()` in the main process.
   *
   * @returns {Promise<void>}
   */
  const install = useCallback(async () => {
    await window.electronAPI?.updateInstall?.();
  }, []);

  /**
   * Opens the GitHub "latest release" page in the default browser.
   * Used as a fallback when the auto-update fails (e.g. unsigned builds,
   * macOS without a Developer certificate, etc.).
   *
   * @returns {Promise<void>}
   */
  const openGithub = useCallback(async () => {
    await window.electronAPI?.updateOpenGithub?.();
  }, []);

  return { ...state, download, install, openGithub };
}

export default useAutoUpdater;
