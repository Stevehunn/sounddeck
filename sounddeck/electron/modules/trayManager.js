// electron/modules/trayManager.js
const { Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { LANGUAGES } = require('../i18n')
const store = require('../store')

let tray = null
let trayInstance = null

// ─── LABELS PAR LANGUE ─────────────────────────────────────────────────────

const TRAY_LABELS = {
  fr: {
    open: 'Ouvrir SoundDeck',
    shortcuts: 'Raccourcis',
    shortcutsOn: 'Désactiver les raccourcis',
    shortcutsOff: 'Activer les raccourcis',
    launchAtStartup: 'Lancer au démarrage',
    startMinimized: 'Démarrer en arrière-plan',
    quit: 'Quitter SoundDeck'
  },
  en: {
    open: 'Open SoundDeck',
    shortcuts: 'Shortcuts',
    shortcutsOn: 'Disable shortcuts',
    shortcutsOff: 'Enable shortcuts',
    launchAtStartup: 'Launch at startup',
    startMinimized: 'Start minimized',
    quit: 'Quit SoundDeck'
  },
  es: {
    open: 'Abrir SoundDeck',
    shortcuts: 'Atajos',
    shortcutsOn: 'Desactivar atajos',
    shortcutsOff: 'Activar atajos',
    launchAtStartup: 'Iniciar al arrancar',
    startMinimized: 'Iniciar minimizado',
    quit: 'Salir de SoundDeck'
  }
}

// ─── FONCTIONS ──────────────────────────────────────────────────────────────

/**
 *
 */
function getCurrentTrayLanguage() {
  return store.get('lang', 'fr')
}

function buildTrayMenu(lang, callbacks) {
  const labels = TRAY_LABELS[lang] || TRAY_LABELS.fr
  const shortcutsEnabled = store.get('globalShortcutsEnabled', true)

  return Menu.buildFromTemplate([
    {
      label: labels.open,
      click: () => callbacks.onOpen?.()
    },
    {
      label: labels.shortcuts,
      submenu: [
        {
          label: shortcutsEnabled ? labels.shortcutsOn : labels.shortcutsOff,
          click: () => callbacks.onToggleShortcuts?.()
        }
      ]
    },
    { type: 'separator' },
    {
      label: labels.launchAtStartup,
      type: 'checkbox',
      checked: store.get('launchAtStartup', false),
      click: (menuItem) => callbacks.onLaunchAtStartup?.(menuItem.checked)
    },
    {
      label: labels.startMinimized,
      type: 'checkbox',
      checked: store.get('startMinimized', false),
      click: (menuItem) => callbacks.onStartMinimized?.(menuItem.checked)
    },
    { type: 'separator' },
    {
      label: labels.quit,
      click: () => callbacks.onQuit?.()
    }
  ])
}

/**
 *
 * @param lang
 * @param callbacks
 */
function createTray(lang = 'fr', callbacks = {}) {
  if (trayInstance) {
    console.log('ℹ️ Une icône du tray existe déjà')
    return
  }

  const isDev = !require('electron').app.isPackaged
  
  let iconPath
  if (isDev) {
    iconPath = path.join(__dirname, '../../public/logo sd cadre.ico')
  } else {
    iconPath = path.join(require('electron').app.getAppPath(), 'dist', 'logo sd cadre.ico')
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'logo sd cadre.ico')
    }
  }

  let icon
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath)
  } else {
    icon = nativeImage.createEmpty()
  }

  const trayIcon = icon.resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  trayInstance = tray
  tray.setToolTip('SoundDeck - Soundboard')

  const contextMenu = buildTrayMenu(lang, callbacks)
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    callbacks.onDoubleClick?.()
  })
}

/**
 *
 * @param lang
 * @param callbacks
 */
function updateTrayMenu(lang, callbacks) {
  if (tray) {
    const contextMenu = buildTrayMenu(lang, callbacks)
    tray.setContextMenu(contextMenu)
  }
}

/**
 *
 */
function destroyTray() {
  if (trayInstance) {
    try {
      trayInstance.destroy()
      trayInstance = null
      tray = null
      console.log('🧹 Icône du tray nettoyée')
    } catch (e) {
      console.warn('⚠️ Erreur lors du nettoyage du tray:', e)
    }
  }
}

/**
 *
 */
function getTray() {
  return tray
}

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray,
  getTray,
  TRAY_LABELS,
  getCurrentTrayLanguage,
}