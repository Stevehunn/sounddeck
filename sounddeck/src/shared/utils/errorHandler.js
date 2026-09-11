// src/shared/utils/errorHandler.js
import { useState, useEffect } from 'react'

let errorLogs = []
let isErrorDialogOpen = false
let errorDialogCallbacks = []

/**
 * Gère les erreurs globalement
 */
export function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    handleError(event.error || event.message, 'uncaught', event)
  })

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'unhandledrejection', event)
  })
}

/**
 * Gère une erreur
 */
export function handleError(error, type = 'unknown', context = null) {
  const errorEntry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    type,
    message: error?.message || String(error),
    stack: error?.stack,
    context: context ? JSON.stringify(context) : null,
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  console.error(`❌ Erreur [${type}]:`, error)

  errorLogs.unshift(errorEntry)

  if (errorLogs.length > 100) {
    errorLogs = errorLogs.slice(0, 100)
  }

  try {
    localStorage.setItem('sounddeck-error-logs', JSON.stringify(errorLogs))
  } catch (e) {
    console.warn('Impossible de sauvegarder les logs:', e)
  }

  errorDialogCallbacks.forEach(cb => cb(errorEntry))

  if (isCriticalError(error)) {
    showErrorToUser(errorEntry)
  }

  return errorEntry
}

/**
 * Détermine si une erreur est critique
 */
function isCriticalError(error) {
  const criticalMessages = [
    'out of memory',
    'fatal',
    'crash',
    'cannot read property',
    'undefined is not',
    'null is not'
  ]

  const message = error?.message?.toLowerCase() || String(error).toLowerCase()
  return criticalMessages.some(msg => message.includes(msg))
}

/**
 * Affiche une erreur à l'utilisateur
 */
function showErrorToUser(errorEntry) {
  if (window.addToast) {
    window.addToast(`❌ Erreur: ${errorEntry.message.slice(0, 100)}`, 'error')
  }

  openErrorDialog(errorEntry)
}

/**
 * Ouvre la boîte de dialogue d'erreur
 */
export function openErrorDialog(errorEntry) {
  if (isErrorDialogOpen) return
  isErrorDialogOpen = true

  const dialog = document.createElement('div')
  dialog.className = 'error-dialog'
  dialog.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `

  const content = document.createElement('div')
  content.style.cssText = `
    background: var(--bg-secondary);
    border: 1px solid var(--danger);
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
  `

  const safeId = JSON.stringify(errorEntry.id)
  const safeMessage = escapeHtml(errorEntry.message)
  const safeStack = escapeHtml(errorEntry.stack || 'Aucune stack disponible')
  const safeContext = errorEntry.context ? escapeHtml('\n\nContexte: ' + errorEntry.context) : ''

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <i class="ti ti-alert-triangle" style="color: var(--danger); font-size: 24px;"></i>
      <span style="font-weight: 600; font-size: 16px;">Une erreur est survenue</span>
    </div>
    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
      ${safeMessage}
    </div>
    <details style="margin-bottom: 16px;">
      <summary style="cursor: pointer; font-size: 12px; color: var(--text-tertiary);">
        Détails techniques
      </summary>
      <pre style="font-size: 11px; color: var(--text-tertiary); background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm); overflow: auto; max-height: 200px; white-space: pre-wrap; word-break: break-all;">
${safeStack}${safeContext}
      </pre>
    </details>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button class="btn-secondary" data-action="close">
        <i class="ti ti-x"></i> Fermer
      </button>
      <button class="btn-primary" data-action="report">
        <i class="ti ti-send"></i> Signaler
      </button>
    </div>
  `

  dialog.appendChild(content)
  document.body.appendChild(dialog)

  const closeDialog = () => {
    dialog.remove()
    isErrorDialogOpen = false
  }

  content.querySelector('[data-action="close"]').addEventListener('click', closeDialog)
  content.querySelector('[data-action="report"]').addEventListener('click', () => {
    reportError(errorEntry.id)
    closeDialog()
  })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Rapporte une erreur
 */
export function reportError(errorId) {
  const error = errorLogs.find(e => e.id === errorId)
  if (!error) return

  alert('Erreur signalée ! Merci de nous aider à améliorer SoundDeck.')
}

/**
 * Hook pour les erreurs locales
 */
export function useErrorHandler() {
  const [error, setError] = useState(null)

  const handleErrorLocal = (err) => {
    const entry = handleError(err, 'local')
    setError(entry)
  }

  const clearError = () => {
    setError(null)
  }

  return { error, setError: handleErrorLocal, clearError }
}

/**
 * Hook pour les logs
 */
export function useErrorLogs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sounddeck-error-logs')
      if (saved) {
        setLogs(JSON.parse(saved))
      }
    } catch (e) {
      console.warn('Erreur lecture logs:', e)
    }

    const callback = (error) => {
      setLogs(prev => [error, ...prev].slice(0, 100))
    }

    errorDialogCallbacks.push(callback)
    return () => {
      const index = errorDialogCallbacks.indexOf(callback)
      if (index !== -1) {
        errorDialogCallbacks.splice(index, 1)
      }
    }
  }, [])

  const clearLogs = () => {
    errorLogs = []
    setLogs([])
    localStorage.removeItem('sounddeck-error-logs')
  }

  const exportLogsFn = () => {
    const json = JSON.stringify(logs, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sounddeck-error-logs-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { logs, clearLogs, exportLogs: exportLogsFn }
}

if (typeof window !== 'undefined') {
  window.handleError = handleError
  window.reportError = reportError
}

export default {
  setupGlobalErrorHandler,
  handleError,
  openErrorDialog,
  reportError,
  useErrorHandler,
  useErrorLogs
}