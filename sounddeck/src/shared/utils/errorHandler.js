// src/shared/utils/errorHandler.js
import { useState, useEffect } from 'react'

const MAX_LOGS = 100

let errorLogs = []
let isErrorDialogOpen = false
let errorDialogCallbacks = []
let pendingWrite = null

// ─── STORAGE ────────────────────────────────────────────────────────────────

async function readLogsFromStore() {
  try {
    if (typeof window === 'undefined') return []
    if (window.electronAPI?.storeGet) {
      const raw = await window.electronAPI.storeGet('errorLogs')
      return Array.isArray(raw) ? raw : []
    }
    // Fallback localStorage
    const raw = localStorage.getItem('sounddeck-error-logs')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.warn('[errorHandler] readLogsFromStore error:', e)
    return []
  }
}

async function writeLogsToStore(logs) {
  try {
    if (typeof window === 'undefined') return
    const payload = Array.isArray(logs) ? logs : []
    if (window.electronAPI?.storeSet) {
      await window.electronAPI.storeSet('errorLogs', payload)
    } else {
      localStorage.setItem('sounddeck-error-logs', JSON.stringify(payload))
    }
  } catch (e) {
    console.warn('[errorHandler] writeLogsToStore error:', e)
  }
}

// Debounce : évite de spammer le store si 50 erreurs arrivent d'un coup
function scheduleWrite() {
  if (pendingWrite) return
  pendingWrite = setTimeout(async () => {
    pendingWrite = null
    await writeLogsToStore(errorLogs)
  }, 300)
}

// ─── SETUP ──────────────────────────────────────────────────────────────────

export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return

  // Charger les logs existants au démarrage
  readLogsFromStore().then(logs => {
    if (logs.length > 0) {
      errorLogs = logs
    }
  })

  window.addEventListener('error', (event) => {
    handleError(event.error || event.message, 'uncaught', {
      source: event.filename,
      line: event.lineno,
      column: event.colno
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'unhandledrejection', null)
  })
}

// ─── CORE ───────────────────────────────────────────────────────────────────

/**
 * Enregistre une erreur (synchrone pour l'appelant, asynchrone pour le store)
 */
export function handleError(error, type = 'unknown', context = null) {
  const errorEntry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    type,
    message: error?.message || String(error) || 'Erreur inconnue',
    stack: (error?.stack || '').slice(0, 4000),
    context: context ? safeStringify(context) : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    url: typeof window !== 'undefined' ? window.location?.href : null,
  }

  // Log console (dev uniquement)
  if (isDev()) {
    console.error(`❌ [${type}]`, error)
  }

  // Ajouter en tête
  errorLogs = [errorEntry, ...errorLogs].slice(0, MAX_LOGS)

  // Persister (debounced)
  scheduleWrite()

  // Notifier les abonnés (hooks React)
  errorDialogCallbacks.forEach(cb => {
    try { cb(errorEntry) } catch (e) { /* silent */ }
  })

  // Afficher pour les erreurs critiques
  if (isCriticalError(error)) {
    showErrorToUser(errorEntry)
  }

  return errorEntry
}

function isDev() {
  if (typeof window === 'undefined') return false
  return window.location?.hostname === 'localhost' ||
         window.location?.hostname === '127.0.0.1'
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    return String(obj)
  }
}

function isCriticalError(error) {
  const criticalMessages = [
    'out of memory', 'fatal', 'crash',
    'cannot read property', 'undefined is not', 'null is not'
  ]
  const message = (error?.message || String(error) || '').toLowerCase()
  return criticalMessages.some(msg => message.includes(msg))
}

// ─── DIALOG ─────────────────────────────────────────────────────────────────

function showErrorToUser(errorEntry) {
  if (typeof window !== 'undefined' && window.addToast) {
    window.addToast(`❌ Erreur: ${errorEntry.message.slice(0, 100)}`, 'error')
  }
  openErrorDialog(errorEntry)
}

export function openErrorDialog(errorEntry) {
  if (isErrorDialogOpen) return
  if (typeof document === 'undefined') return
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

// ─── REPORT ─────────────────────────────────────────────────────────────────

export async function reportError(errorId) {
  const error = errorLogs.find(e => e.id === errorId)
  if (!error) return { success: false, error: 'Erreur introuvable' }

  try {
    // TODO: brancher un backend de collecte si tu en ajoutes un plus tard.
    // Pour l'instant : feedback local + log console.
    if (isDev()) {
      console.info('📤 [reportError] Erreur signalée:', error)
    }

    if (typeof window !== 'undefined' && window.addToast) {
      window.addToast('Merci ! Votre signalement a été pris en compte.', 'success')
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ─── HOOKS ──────────────────────────────────────────────────────────────────

export function useErrorHandler() {
  const [error, setError] = useState(null)

  const handleErrorLocal = (err) => {
    const entry = handleError(err, 'local')
    setError(entry)
  }

  const clearError = () => setError(null)

  return { error, setError: handleErrorLocal, clearError }
}

export function useErrorLogs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let mounted = true

    readLogsFromStore().then(loaded => {
      if (mounted) {
        setLogs(loaded)
        errorLogs = loaded
      }
    })

    const callback = (entry) => {
      setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS))
    }
    errorDialogCallbacks.push(callback)

    return () => {
      mounted = false
      const index = errorDialogCallbacks.indexOf(callback)
      if (index !== -1) errorDialogCallbacks.splice(index, 1)
    }
  }, [])

  const clearLogs = async () => {
    errorLogs = []
    setLogs([])
    await writeLogsToStore([])
    try { localStorage.removeItem('sounddeck-error-logs') } catch {}
  }

  const exportLogs = () => {
    const json = JSON.stringify(logs, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sounddeck-error-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { logs, clearLogs, exportLogs }
}

// ─── HELPERS PUBLICS ────────────────────────────────────────────────────────

export async function getErrorLogsFromStore() {
  return await readLogsFromStore()
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
  useErrorLogs,
  getErrorLogsFromStore,
}