/**
 * @file MyInstants Discovery plugin entry point.
 *
 * SoundDeck plugins follow a simple contract:
 * - **Metadata** — `id`, `name`, `nameKey`, `version`, `author`, `description`
 * - **Pages** — an array of sidebar pages this plugin contributes
 * - **Lifecycle** — `init(store, manager)` on activate, `destroy()` on
 *   deactivate. Both are optional.
 *
 * This plugin adds a "Discovery" page (id `discover`) to the sidebar,
 * which lets the user search and import sounds from myinstants.com.
 *
 * @see ./Discover.jsx — the actual page component
 * @see ./plugin.json — the static manifest (used by the plugin installer)
 * @see ../../core/plugins/PluginManager.js — the plugin engine
 */

import MyInstantsDiscover from './Discover.jsx'
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
const MyInstantsPlugin = {
  id: 'myinstants',
  name: 'MyInstants Discovery',
  nameKey: 'pluginNameMyInstants',
  version: '1.0.0',
  author: 'SoundDeck Team',
  description: 'Search and add sounds from MyInstants',

  pages: [
    {
      id: 'discover',
      labelKey: 'myinstantsTitle',
      icon: 'ti-compass',
      component: MyInstantsDiscover,
      componentPath: './Discover.jsx',
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
    logInfo('MyInstantsPlugin', 'Initialized')
  },

  /**
   * Called when the plugin is deactivated (uninstall, app quit).
   *
   * @returns {void}
   */
  destroy() {
    logInfo('MyInstantsPlugin', 'Unloaded')
  }
}

export default MyInstantsPlugin