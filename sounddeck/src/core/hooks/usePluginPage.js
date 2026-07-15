import { useState, useEffect, useCallback } from 'react'
import { usePlugins } from '../PluginContext'

/**
 * Hook pour charger une page de plugin
 * 
 * @param {string} pageId - L'ID de la page à charger
 * @returns {Object} { Component, loading, error, page, isPlugin }
 */
export function usePluginPage(pageId) {
  const [Component, setComponent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { 
    getPluginComponent, 
    isPluginPage, 
    getPage,
    pluginManager 
  } = usePlugins()

  const loadPage = useCallback(async () => {
    if (!pageId) {
      setLoading(false)
      return
    }

    // Vérifier si c'est une page plugin
    if (!isPluginPage(pageId)) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const component = await getPluginComponent(pageId)
      if (component) {
        setComponent(() => component)
      } else {
        setError('Composant non trouvé')
      }
    } catch (err) {
      console.error(`❌ Erreur chargement page ${pageId}:`, err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [pageId, getPluginComponent, isPluginPage])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const page = getPage(pageId)

  return {
    Component,
    loading,
    error,
    page,
    isPlugin: isPluginPage(pageId),
    reload: loadPage
  }
}

export default usePluginPage