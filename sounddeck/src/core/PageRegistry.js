import React from 'react'
import { pluginManager } from './PluginManager'

// Composant pour charger dynamiquement une page de plugin
export function PluginPageLoader({ pageId, store, addToast, lang }) {
  const [Component, setComponent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const page = pluginManager.pages.get(pageId)
    if (!page) {
      setLoading(false)
      return
    }

    // Charger le composant de la page
    import(page.componentPath)
      .then(module => {
        const PageComponent = module.default || module
        setComponent(() => PageComponent)
        setLoading(false)
      })
      .catch(err => {
        console.error(`❌ Erreur chargement page ${pageId}:`, err)
        setLoading(false)
      })
  }, [pageId])

  if (loading) return <div>Chargement...</div>
  if (!Component) return <div>Page non trouvée</div>

  return <Component store={store} addToast={addToast} lang={lang} />
}