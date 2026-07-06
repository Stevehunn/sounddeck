import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)