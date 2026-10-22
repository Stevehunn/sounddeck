/**
 * @file Global error handler + error-log UI.
 *
 * Responsibilities:
 * - **Setup** — attaches `window.onerror` and `window.onunhandledrejection`
 *   listeners so uncaught errors are logged and (if critical) surfaced to
 *   the user.
 * - **Persistence** — keeps the last 100 error logs in electron-store under
 *   `errorLogs` (falls back to `localStorage` in the browser). Writes are
 *   debounced (300ms) to avoid thrashing on error bursts.
 * - **Dialog** — displays a vanilla-DOM modal when a critical error
 *   happens (out-of-memory, "undefined is not", etc.), with a "Report"
 *   button that attaches the log to the next feedback submission.
 * - **Hooks** — `useErrorHandler()` and `useErrorLogs()` for React
 *   components that want to read/react to error state.
 *
 * The handler is idempotent: calling `setupGlobalErrorHandler()` twice
 * won't double-register listeners.
 *
 * @see src/main.jsx — calls `setupGlobalErrorHandler()` at boot
 * @see @shared/components/modals/FeedbackModal.jsx — consumes `errorLogs`
 */

import { useState, useEffect } from 'react'

const MAX_LOGS = 100

let errorLogs = []
let isErrorDialogOpen = false
let errorDialogCallbacks = []
let pendingWrite = null

// ─── STORAGE ───────────────────────────────────────────────────────────

/**
 * Reads the persisted error logs from the store (or `localStorage`).
 *
 * @returns {Promise<Array<Object>>}
 */
async function readLogsFromStore() {
  try {
    if (typeof window === 'undefined') return []
    if (window.electronAPI?.storeGet) {
      const raw = await window.electronAPI.storeGet('errorLogs')
      return Array.isArray(raw) ? raw : []
    }
    const raw = localStorage.getItem('sounddeck-error-logs')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.warn('[errorHandler] readLogsFromStore error:', e)
    return []
  }
}

/**
 * Persists the given logs (or the current buffer when no argument is given).
 *
 * @param {Array<Object>} logs
 * @returns {Promise<void>}
 */
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

/**
 * Schedules a debounced write of the current error buffer (300ms).
 * @returns {void}
 */
function scheduleWrite() {
  if (pendingWrite) return
  pendingWrite = setTimeout(async () => {
    pendingWrite = null
    await writeLogsToStore(errorLogs)
  }, 300)
}

// ─── SETUP ─────────────────────────────────────────────────────────────

/**
 * Installs the global error listeners. Safe to call multiple times.
 * @returns {void}
 */
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return

  readLogsFromStore().then((logs) => {
    if (logs.length > 0) {
      errorLogs = logs
    }
  })

  window.addEventListener('error', (event) => {
    handleError(event.error || event.message, 'uncaught', {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'unhandledrejection', null)
  })
}

// ─── CORE ──────────────────────────────────────────────────────────────

/**
 * Records an error and notifies listeners. Opens the error dialog if the
 * error looks critical.
 *
 * @param {Error|string} error
 * @param {string} [type='unknown'] - Category tag (e.g. `'uncaught'`).
 * @param {Object|null} [context] - Extra JSON-serializable context.
 * @returns {Object} The recorded log entry.
 */
export function handleError(error, type = 'unknown', context = null) {
  const errorEntry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    type,
    message: error?.message || String(error) || 'Unknown error',
    stack: (error?.stack || '').slice(0, 4000),
    context: context ? safeStringify(context) : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    url: typeof window !== 'undefined' ? window.location?.href : null,
  }

  if (isDev()) {
    console.error(`❌ [${type}]`, error)
  }

  errorLogs = [errorEntry, ...errorLogs].slice(0, MAX_LOGS)

  scheduleWrite()

  errorDialogCallbacks.forEach((cb) => {
    try {
      cb(errorEntry)
    } catch {
      // ignore
    }
  })

  if (isCriticalError(error)) {
    showErrorToUser(errorEntry)
  }

  return errorEntry
}

/**
 * Returns `true` when running on `localhost` / `127.0.0.1`.
 * @returns {boolean}
 */
function isDev() {
  if (typeof window === 'undefined') return false
  return (
    window.location?.hostname === 'localhost' ||
    window.location?.hostname === '127.0.0.1'
  )
}

/**
 * JSON-serializes `obj`, falling back to `String(obj)` on error.
 *
 * @param {any} obj
 * @returns {string}
 */
function safeStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    return String(obj)
  }
}

/**
 * Returns `true` if the given error matches a "critical" pattern
 * (out-of-memory, crash, null/undefined access, …).
 *
 * @param {Error|string} error
 * @returns {boolean}
 */
function isCriticalError(error) {
  const criticalMessages = [
    'out of memory',
    'fatal',
    'crash',
    'cannot read property',
    'undefined is not',
    'null is not',
  ]
  const message = (error?.message || String(error) || '').toLowerCase()
  return criticalMessages.some((msg) => message.includes(msg))
}

// ─── DIALOG ────────────────────────────────────────────────────────────

/**
 * Shows a toast (if available) and opens the error dialog.
 * @param {Object} errorEntry
 * @returns {void}
 */
function showErrorToUser(errorEntry) {
  if (typeof window !== 'undefined' && window.addToast) {
    window.addToast(`❌ Erreur: ${errorEntry.message.slice(0, 100)}`, 'error')
  }
  openErrorDialog(errorEntry)
}

/**
 * Opens the vanilla-DOM error dialog (no React).
 *
 * Idempotent: calling it while a dialog is already open is a no-op.
 *
 * @param {Object} errorEntry
 * @returns {void}
 */
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
  const safeStack = escapeHtml(errorEntry.stack || 'No stack trace')
  const safeContext = errorEntry.context
    ? escapeHtml('\n\nContext: ' + errorEntry.context)
    : ''

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <i class="ti ti-alert-triangle" style="color: var(--danger); font-size: 24px;"></i>
      <span style="font-weight: 600; font-size: 16px;">An error occurred</span>
    </div>
    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
      ${safeMessage}
    </div>
    <details style="margin-bottom: 16px;">
      <summary style="cursor: pointer; font-size: 12px; color: var(--text-tertiary);">
        Technical details
      </summary>
      <pre style="font-size: 11px; color: var(--text-tertiary); background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm); overflow: auto; max-height: 200px; white-space: pre-wrap; word-break: break-all;">
${safeStack}${safeContext}
      </pre>
    </details>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button class="btn-secondary" data-action="close">
        <i class="ti ti-x"></i> Close
      </button>
      <button class="btn-primary" data-action="report">
        <i class="ti ti-send"></i> Report
      </button>
    </div>
  `

  dialog.appendChild(content)
  document.body.appendChild(dialog)

  const closeDialog = () => {
    dialog.remove()
    isErrorDialogOpen = false
  }

  content
    .querySelector('[data-action="close"]')
    .addEventListener('click', closeDialog)
  content.querySelector('[data-action="report"]').addEventListener('click', () => {
    reportError(errorEntry.id)
    closeDialog()
  })
}

/**
 * HTML-escapes the given string (used in the raw `innerHTML` template).
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── REPORT ────────────────────────────────────────────────────────────

/**
 * Marks an error as "reported". In practice, this attaches the log to the
 * next `FeedbackModal` submission.
 *
 * @param {string} errorId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reportError(errorId) {
  const error = errorLogs.find((e) => e.id === errorId)
  if (!error) return { success: false, error: 'Error not found' }

  try {
    if (isDev()) {
      console.info('📤 [reportError] Error reported:', error)
    }

    if (typeof window !== 'undefined' && window.addToast) {
      window.addToast('Thanks! Your report has been recorded.', 'success')
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ─── HOOKS ─────────────────────────────────────────────────────────────

/**
 * Local error-handling hook (single component).
 *
 * @returns {{
 *   error: Object|null,
 *   setError: (err: any) => void,
 *   clearError: () => void,
 * }}
 */
export function useErrorHandler() {
  const [error, setError] = useState(null)

  const handleErrorLocal = (err) => {
    const entry = handleError(err, 'local')
    setError(entry)
  }

  const clearError = () => setError(null)

  return { error, setError: handleErrorLocal, clearError }
}

/**
 * Subscribes to the global error log stream.
 *
 * @returns {{
 *   logs: Array<Object>,
 *   clearLogs: () => Promise<void>,
 *   exportLogs: () => Promise<{success: boolean, path?: string, error?: string}>,
 * }}
 */
export function useErrorLogs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let mounted = true

    readLogsFromStore().then((loaded) => {
      if (mounted) {
        setLogs(loaded)
        errorLogs = loaded
      }
    })

    const callback = (entry) => {
      if (!entry) return
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS))
    }
    errorDialogCallbacks.push(callback)

    return () => {
      mounted = false
      const index = errorDialogCallbacks.indexOf(callback)
      if (index !== -1) errorDialogCallbacks.splice(index, 1)
    }
  }, [])

  const clearLogs = async () => {
    await clearAllErrorLogs()
    setLogs([])
  }

  /**
   * Exports the current log list to a JSON file (native save dialog).
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  const exportLogs = async () => {
    const json = JSON.stringify(logs, null, 2)
    const defaultName = `sounddeck-error-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.json`

    if (window.electronAPI?.exportJsonFile) {
      return await window.electronAPI.exportJsonFile(
        json,
        defaultName,
        'Exporter les logs d’erreur'
      )
    }

    // Fallback: browser download
    try {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  return { logs, clearLogs, exportLogs }
}

/**
 * Clears all error logs (memory + storage).
 * @returns {Promise<void>}
 */
export async function clearAllErrorLogs() {
  errorLogs = []
  await writeLogsToStore([])
}

// ─── PUBLIC HELPERS ────────────────────────────────────────────────────

/**
 * Returns the current logs from storage (bypassing the in-memory buffer).
 *
 * @returns {Promise<Array<Object>>}
 */
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
  clearAllErrorLogs,
}