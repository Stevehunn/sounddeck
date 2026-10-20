/**
 * @file Emoji Discovery plugin entry point.
 *
 * SoundDeck plugins follow a simple contract:
 * - **Metadata** — `id`, `name`, `nameKey`, `version`, `author`, `description`
 * - **Pages** — an array of sidebar pages this plugin contributes. Each
 *   page has an `id`, `labelKey` (i18n key), `icon`, `component` (React
 *   component), `componentPath` (used for lazy loading in some builds),
 *   and a `group` for sidebar placement.
 * - **Lifecycle** — `init(store, manager)` on activate, `destroy()` on
 *   deactivate. Both are optional.
 *
 * This plugin adds an "Emoji Discovery" page (id `emoji-discover`) that
 * is **not shown in the sidebar** (`sidebarVisible: false`) — it's only
 * reachable from the "My emojis" page via a "Discover" link.
 *
 * @see ./EmojiDiscover.jsx — the actual page component
 * @see ./plugin.json — the static manifest (used by the plugin installer)
 * @see ../../core/plugins/PluginManager.js — the plugin engine
 */

import EmojiDiscover from './EmojiDiscover.jsx'
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
 *     visible: boolean,
 *     sidebarVisible: boolean
 *   }>,
 *   init: (store: Object, manager: Object) => void,
 *   destroy: () => void
 * }}
 */
const EmojiPlugin = {
  id: 'emoji',
  name: 'Emoji Discovery',
  nameKey: 'pluginNameEmoji',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Discover and add emojis by category',

  pages: [
    {
      id: 'emoji-discover',
      labelKey: 'emojiDiscoverTitle',
      icon: 'ti-mood-smile-beam',
      component: EmojiDiscover,
      componentPath: './EmojiDiscover.jsx',
      group: 'navigation',
      pinned: false,
      visible: true,
      // Hidden from the sidebar — reachable from the "My emojis" page.
      sidebarVisible: false,
    },
  ],

  /**
   * Called when the plugin is activated (app boot, or after install).
   *
   * @param {Object} _store - App store (unused here).
   * @param {Object} _manager - Plugin manager (unused here).
   * @returns {void}
   */
  init(_store, _manager) {
    logInfo('EmojiPlugin', 'Initialized')
  },

  /**
   * Called when the plugin is deactivated (uninstall, app quit).
   *
   * @returns {void}
   */
  destroy() {
    logInfo('EmojiPlugin', 'Unloaded')
  },
}

export default EmojiPlugin