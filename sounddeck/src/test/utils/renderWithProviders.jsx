// src/test/utils/renderWithProviders.jsx
import { render } from '@testing-library/react'
import { LanguageProvider } from '@core/i18n/LanguageContext'
import { PluginProvider } from '@core/plugins/PluginContext'
import { NetworkProvider } from '@shared/contexts'

/**
 * Rend un composant avec tous les providers de l'app.
 * Utile pour tester un composant qui utilise useLanguage(), usePlugins(), etc.
 */
export function renderWithProviders(ui, { store = null, ...options } = {}) {
  const Wrapper = ({ children }) => (
    <NetworkProvider>
      <LanguageProvider>
        <PluginProvider store={store}>
          {children}
        </PluginProvider>
      </LanguageProvider>
    </NetworkProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Version sans PluginProvider (plus rapide si le composant n'en a pas besoin).
 */
export function renderWithLanguage(ui, options = {}) {
  const Wrapper = ({ children }) => (
    <LanguageProvider>{children}</LanguageProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}