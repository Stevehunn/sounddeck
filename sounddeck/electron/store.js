/**
 * @file electron-store singleton.
 *
 * A single instance of `electron-store` is shared across all main-process
 * modules (via `require('./store')`). This is required because
 * electron-store locks the config file, and creating multiple instances
 * would cause read/write conflicts.
 *
 * Data is stored in the OS-specific user-data directory:
 * - Windows: `%APPDATA%/SoundDeck/config.json`
 * - macOS:   `~/Library/Application Support/SoundDeck/config.json`
 * - Linux:   `~/.config/SoundDeck/config.json`
 *
 * @see https://github.com/sindresorhus/electron-store
 */

const Store = require("electron-store");

const store = new Store();

module.exports = store;
