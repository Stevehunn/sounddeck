// Système de logs pour le débogage utilisateur

import { useState, useEffect } from 'react'

// Niveaux de log
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
}

// Configuration
const LOG_CONFIG = {
  maxEntries: 1000,
  persistToDisk: true,
  logLevel: LOG_LEVELS.DEBUG
}

// Stockage des logs
let logEntries = []
let logCallbacks = []

/**
 * Ajoute une entrée de log
 */
export function log(level, message, data = null, context = null) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : String(message),
    data: data ? JSON.stringify(data) : null,
    context: context ? JSON.stringify(context) : null,
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  // Console output
  const consoleMethod = {
    [LOG_LEVELS.DEBUG]: console.debug,
    [LOG_LEVELS.INFO]: console.info,
    [LOG_LEVELS.WARN]: console.warn,
    [LOG_LEVELS.ERROR]: console.error
  }[level] || console.log

  consoleMethod(`[${level.toUpperCase()}]`, message, data || '')

  // Stocker
  logEntries.unshift(entry)
  if (logEntries.length > LOG_CONFIG.maxEntries) {
    logEntries = logEntries.slice(0, LOG_CONFIG.maxEntries)
  }

  // Sauvegarder dans localStorage
  if (LOG_CONFIG.persistToDisk) {
    try {
      localStorage.setItem('sounddeck-logs', JSON.stringify(logEntries))
    } catch (e) {
      console.warn('Impossible de sauvegarder les logs:', e)
    }
  }

  // Notifier les callbacks
  logCallbacks.forEach(cb => cb(entry))

  return entry
}

/**
 * Raccourcis pour les niveaux de log
 */
export const debug = (msg, data, ctx) => log(LOG_LEVELS.DEBUG, msg, data, ctx)
export const info = (msg, data, ctx) => log(LOG_LEVELS.INFO, msg, data, ctx)
export const warn = (msg, data, ctx) => log(LOG_LEVELS.WARN, msg, data, ctx)
export const error = (msg, data, ctx) => log(LOG_LEVELS.ERROR, msg, data, ctx)

/**
 * Récupère les logs
 */
export function getLogs() {
  return logEntries
}

/**
 * Efface les logs
 */
export function clearLogs() {
  logEntries = []
  localStorage.removeItem('sounddeck-logs')
  return true
}

/**
 * Exporte les logs en JSON
 */
export function exportLogs() {
  const json = JSON.stringify(logEntries, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sounddeck-logs-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Hook pour utiliser les logs dans un composant
 */
export function useLogger(componentName) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    // Charger les logs existants
    try {
      const saved = localStorage.getItem('sounddeck-logs')
      if (saved) {
        const parsed = JSON.parse(saved)
        setLogs(parsed)
        logEntries = parsed
      }
    } catch (e) {
      console.warn('Erreur lecture logs:', e)
    }

    // S'abonner aux nouveaux logs
    const callback = (entry) => {
      setLogs(prev => [entry, ...prev].slice(0, LOG_CONFIG.maxEntries))
    }
    logCallbacks.push(callback)

    return () => {
      const index = logCallbacks.indexOf(callback)
      if (index !== -1) logCallbacks.splice(index, 1)
    }
  }, [])

  const clear = () => {
    clearLogs()
    setLogs([])
  }

  const exportLogsFn = () => {
    exportLogs()
  }

  const logFn = (level, message, data) => {
    return log(level, `[${componentName}] ${message}`, data)
  }

  return {
    logs,
    clearLogs: clear,
    exportLogs: exportLogsFn,
    log: logFn,
    debug: (msg, data) => logFn(LOG_LEVELS.DEBUG, msg, data),
    info: (msg, data) => logFn(LOG_LEVELS.INFO, msg, data),
    warn: (msg, data) => logFn(LOG_LEVELS.WARN, msg, data),
    error: (msg, data) => logFn(LOG_LEVELS.ERROR, msg, data)
  }
}

export default {
  log,
  debug,
  info,
  warn,
  error,
  getLogs,
  clearLogs,
  exportLogs,
  useLogger,
  LOG_LEVELS
}