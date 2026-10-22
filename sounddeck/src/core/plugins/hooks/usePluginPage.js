/**
 * @file Hook that lazily loads a plugin page component.
 *
 * Given a `pageId`, this hook:
 * - Checks if the ID is a plugin page (`isPluginPage`)
 * - Loads the corresponding React component via `getPluginComponent`
 * - Tracks `loading` and `error` state
 * - Provides a `reload()` method for manual retries
 *
 * The setState calls inside the effect are deferred via `setTimeout(0)` so
 * they don't run synchronously in the effect body (React 19 rule).
 *
 * @see @core/plugins/PluginContext.jsx
 */

import { useState, useEffect, useCallback } from 'react'
import { usePlugins } from '../PluginContext'

/**
 * Loads and returns a plugin page component.
 *
 * @param {string|null} pageId - The plugin page ID, or `null`/`undefined`
 *   for "no plugin page".
 * @returns {{
 *   Component: React.ComponentType|null,
 *   loading: boolean,
 *   error: string|null,
 *   page: Object|undefined,
 *   isPlugin: boolean,
 *   reload: () => Promise<void>,
 * }}
 */
export function usePluginPage(pageId) {
  const [Component, setComponent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { getPluginComponent, isPluginPage, getPage } = usePlugins()

  const loadPage = useCallback(async () => {
    if (!pageId) {
      const t = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(t)
    }

    // Not a plugin page → don't load anything
    if (!isPluginPage(pageId)) {
      const t = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(t)
    }

    try {
      const component = await getPluginComponent(pageId)
      if (component) {
        setComponent(() => component)
      } else {
        setError('Component not found')
      }
    } catch (err) {
      console.error(`❌ Error loading plugin page ${pageId}:`, err)
      setError(err.message || 'Loading error')
    } finally {
      setLoading(false)
    }
  }, [pageId, getPluginComponent, isPluginPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPage()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadPage])

  const page = getPage(pageId)

  return {
    Component,
    loading,
    error,
    page,
    isPlugin: isPluginPage(pageId),
    reload: loadPage,
  }
}

export default usePluginPage