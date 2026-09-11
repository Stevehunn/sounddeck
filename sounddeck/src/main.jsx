// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from '@core/i18n/LanguageContext'
import './index.css'
import './animations.css'
import { setupGlobalErrorHandler } from './shared/utils/errorHandler'

// ✅ Configurer le gestionnaire d'erreurs global
setupGlobalErrorHandler()

// ✅ Détection automatique de la langue système au démarrage
const initApp = async () => {
  try {
    const savedLang = await window.electronAPI?.storeGet?.('lang')
    console.log('🚀 Démarrage de SoundDeck...')
    if (savedLang) {
      console.log(`🌐 Langue chargée: ${savedLang}`)
    } else {
      console.log('🌐 Aucune langue sauvegardée, détection automatique...')
    }
  } catch (e) {
    console.warn('⚠️ Erreur lors de l\'initialisation:', e)
  }
}

initApp()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
)