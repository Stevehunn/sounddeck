import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'
import './animations.css'
import { setupGlobalErrorHandler } from './utils/errorHandler'

// ✅ Configurer le gestionnaire d'erreurs global
setupGlobalErrorHandler()

// ✅ Logger les erreurs non capturées
window.addEventListener('error', (event) => {
  console.error('❌ Erreur non capturée:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promesse rejetée non gérée:', event.reason)
})

// ✅ Détection automatique de la langue système au démarrage
const initApp = async () => {
  try {
    // Vérifier si une langue est déjà sauvegardée
    const savedLang = await window.electronAPI?.storeGet?.('lang')
    
    // Si aucune langue n'est sauvegardée, le LanguageProvider va détecter automatiquement
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

// Initialiser l'application
initApp()

// ✅ Rendu de l'application avec le LanguageProvider
// ⚠️ IMPORTANT : LanguageProvider DOIT être à l'extérieur de tout
// pour que useLanguage() soit disponible dans tous les composants
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
)