/**
 * @file YouTube Import plugin entry point.
 *
 * SoundDeck plugins follow a simple contract:
 * - **Metadata** — `id`, `name`, `nameKey`, `version`, `author`, `description`
 * - **Pages** — an array of sidebar pages this plugin contributes
 * - **Lifecycle** — `init(store, manager)` on activate, `destroy()` on
 *   deactivate. Both are optional.
 *
 * This plugin adds a "YouTube Import" page (id `youtube`) to the sidebar,
 * which lets the user paste a YouTube / Spotify / SoundCloud URL, pick a
 * portion, download the audio (via yt-dlp + ffmpeg), and save it to the
 * library.
 *
 * The plugin requires external binaries:
 * - **yt-dlp** — audio extraction (auto-downloaded if missing)
 * - **ffmpeg** — audio transcoding to MP3 (auto-detected at runtime)
 *
 * See `plugin.json` for the manifest used by the plugin installer.
 *
 * @see ./YouTube.jsx — the actual page component
 * @see ./plugin.json — the static manifest (with `dependencies`)
 * @see ../../core/plugins/PluginManager.js — the plugin engine
 */

import YouTube from './YouTube.jsx'
import { logInfo } from '@shared/utils/logger'

/**
 * @type {{
 *   id: string,
 *   name: string,
 *   nameKey: string,
 *   version: string,
 *   author: string,
 *   description: string,
 *   pages: Array<{
 *     id: string,
 *     labelKey: string,
 *     icon: string,
 *     component: React.ComponentType,
 *     componentPath: string,
 *     group: string,
 *     pinned: boolean,
 *     visible: boolean
 *   }>,
 *   init: (store: Object, manager: Object) => void,
 *   destroy: () => void
 * }}
 */
const YouTubePlugin = {
  id: 'youtube',
  name: 'YouTube Import',
  nameKey: 'pluginNameYoutube',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Import audio from YouTube, Spotify and SoundCloud',

  pages: [
    {
      id: 'youtube',
      labelKey: 'youtubeTitle',
      icon: 'ti-brand-youtube',
      component: YouTube,
      componentPath: './YouTube.jsx',
      group: 'navigation',
      pinned: false,
      visible: true
    }
  ],

  /**
   * Called when the plugin is activated (app boot, or after install).
   *
   * @param {Object} _store - App store (unused here).
   * @param {Object} _manager - Plugin manager (unused here).
   * @returns {void}
   */
  init(_store, _manager) {
    logInfo('YouTubePlugin', 'Initialized')
  },

  /**
   * Called when the plugin is deactivated (uninstall, app quit).
   *
   * @returns {void}
   */
  destroy() {
    logInfo('YouTubePlugin', 'Unloaded')
  }
}

export default YouTubePlugin