/**
 * @file Test helpers for the `electron/modules` test suite.
 *
 * These helpers wrap the mock `ipcMain` (installed globally by
 * `src/test/setup-electron.js`) so individual tests can:
 * - Retrieve the handler registered for a given channel
 * - Check whether a channel is registered
 * - List all registered channels (useful for `console.table`-style dumps)
 * - Reset all handlers + listeners between tests
 *
 * `globalThis.__electronMock` must be defined before any helper is used —
 * the setup file guarantees this via `beforeAll()` in `setup-electron.js`.
 *
 * @see ../__test-mocks__/electron.cjs — the mock itself
 * @see ../../src/test/setup-electron.js — installs `__electronMock`
 */

/**
 * Returns the mock `ipcMain` from the global electron mock.
 *
 * @returns {Object} The mock `ipcMain`.
 * @throws {Error} If `globalThis.__electronMock.ipcMain` isn't set (which
 *   would indicate that `setup-electron.js` hasn't run yet).
 */
function getIpcMain() {
  if (!globalThis.__electronMock?.ipcMain) {
    throw new Error(
      "[__test-helpers__] globalThis.__electronMock non défini. " +
        "setup-electron.js doit être chargé avant les tests.",
    );
  }
  return globalThis.__electronMock.ipcMain;
}

/**
 * Returns the handler function registered for a given IPC channel.
 *
 * @param {string} channel - The IPC channel name (e.g. `'store-get'`).
 * @returns {Function} The registered handler function.
 * @throws {Error} If no handler is registered for the channel. The error
 *   includes the list of all registered channels to ease debugging.
 */
export function getIpcHandler(channel) {
  const ipcMain = getIpcMain();
  const handler = ipcMain._handlers.get(channel);
  if (!handler) {
    const registered = Array.from(ipcMain._handlers.keys());
    throw new Error(
      `Handler IPC introuvable: "${channel}"\n` +
        `Handlers enregistrés (${registered.length}): ${registered.join(", ")}`,
    );
  }
  return handler;
}

/**
 * Returns whether a given IPC channel has a registered handler.
 *
 * @param {string} channel - The IPC channel name.
 * @returns {boolean} `true` if a handler is registered, `false` otherwise.
 */
export function hasIpcHandler(channel) {
  return getIpcMain()._handlers.has(channel);
}

/**
 * Returns the list of currently registered IPC channels.
 *
 * @returns {string[]} The channel names.
 */
export function getRegisteredChannels() {
  return Array.from(getIpcMain()._handlers.keys());
}

/**
 * Clears all registered IPC handlers and listeners (used between tests).
 *
 * @returns {void}
 */
export function clearIpcHandlers() {
  const ipcMain = getIpcMain();
  ipcMain._handlers.clear();
  ipcMain._listeners.clear();
}