// electron/modules/autoUpdater.js
const { autoUpdater } = require('electron-updater')
const { ipcMain, app, shell } = require('electron')

const isDev = !app.isPackaged

const log = (level, msg, ...args) => {
  const prefix = '[autoUpdater]'
  if (level === 'error') console.error(prefix, msg, ...args)
  else if (level === 'warn') console.warn(prefix, msg, ...args)
  else console.log(prefix, msg, ...args)
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.logger = {
    info: (m) => log('info', m),
    warn: (m) => log('warn', m),
    error: (m) => log('error', m),
    debug: (m) => log('info', m),
  }
}

function forwardEvents(getMainWindow) {
  const send = (channel, payload) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    log('info', 'Vérification en cours...')
    send('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    log('info', `Mise à jour dispo : ${info.version}`)
    send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    log('info', `À jour (${info.version})`)
    send('update:not-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    send('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('info', `Mise à jour téléchargée : ${info.version}`)
    send('update:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('error', (err) => {
    log('error', 'Erreur auto-update :', err?.message || err)
    send('update:error', { message: err?.message || String(err) })
  })
}

function registerIpcHandlers() {
  ipcMain.handle('update:check', async () => {
    if (isDev) {
      log('warn', 'Skip check : on est en dev')
      return { ok: false, reason: 'dev-mode' }
    }
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (e) {
      log('error', 'checkForUpdates échoué :', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      log('error', 'downloadUpdate échoué :', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('update:install', () => {
    log('info', 'Installation + redémarrage demandés')
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('update:open-github', () => {
    shell.openExternal('https://github.com/Stevehunn/sounddeck/releases/latest')
  })
}

function initAutoUpdater(getMainWindow) {
  configureAutoUpdater()
  forwardEvents(getMainWindow)
  registerIpcHandlers()

  if (!isDev) {
    setTimeout(() => {
      log('info', 'Check automatique au démarrage')
      autoUpdater.checkForUpdates().catch((e) => {
        log('warn', 'Check auto échoué :', e.message)
      })
    }, 5000)
  } else {
    log('info', 'Mode dev : auto-update désactivé')
  }
}

module.exports = { initAutoUpdater }