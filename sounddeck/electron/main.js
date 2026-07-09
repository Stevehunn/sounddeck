const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const { LANGUAGES } = require('./i18n')
const { exec } = require('child_process')
const AdmZip = require('adm-zip')
const ytdlp = require('yt-dlp-exec')
const ytdlpPath = require('path').join(__dirname, 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp.exe')

const store = new Store()

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('ℹ️ Une instance de SoundDeck est déjà en cours. Fermeture...')
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

// Ajouter un état pour les raccourcis globaux
let globalShortcutsEnabled = store.get('globalShortcutsEnabled', true)
let registeredShortcuts = []
let mainWindow = null
let tray = null
let trayInstance = null
let isQuitting = false
let closeToTray = store.get('closeToTray', true)
let pendingQuit = false

const isDev = !app.isPackaged

// Supprimer la barre de menu native
Menu.setApplicationMenu(null)

const soundsDir = path.join(app.getPath('userData'), 'sounds')
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true })

// Vérifier si l'app doit démarrer en arrière-plan
const shouldStartMinimized = store.get('startMinimized', false)

const TRENDING_URLS = {
  fr: 'https://www.myinstants.com/fr/index/fr/',
  en: 'https://www.myinstants.com/fr/index/us/',
  es: 'https://www.myinstants.com/fr/index/es/'
}

// ─── TRAY LABELS ──────────────────────────────────────────────────────────────
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

// ─── FONCTIONS POUR LE TRAY ──────────────────────────────────────────────────

function getCurrentTrayLanguage() {
  return store.get('lang', 'fr')
}

function buildTrayMenu(lang) {
  const labels = TRAY_LABELS[lang] || TRAY_LABELS.fr

  return Menu.buildFromTemplate([
    {
      label: labels.open,
      click: () => {
        showMainWindow()
      }
    },
    {
      label: labels.shortcuts,
      submenu: [
        {
          label: globalShortcutsEnabled ? labels.shortcutsOn : labels.shortcutsOff,
          click: () => {
            toggleGlobalShortcuts()
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: labels.launchAtStartup,
      type: 'checkbox',
      checked: store.get('launchAtStartup', false),
      click: (menuItem) => {
        setLaunchAtStartup(menuItem.checked)
      }
    },
    {
      label: labels.startMinimized,
      type: 'checkbox',
      checked: store.get('startMinimized', false),
      click: (menuItem) => {
        store.set('startMinimized', menuItem.checked)
      }
    },
    { type: 'separator' },
    {
      label: labels.quit,
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
}

function createTray(lang = 'fr') {
  // ✅ Empêcher la création de plusieurs icônes
  if (trayInstance) {
    console.log('ℹ️ Une icône du tray existe déjà')
    return
  }

  let iconPath
  if (isDev) {
    iconPath = path.join(__dirname, '../public/logo sd cadre.ico')
  } else {
    iconPath = path.join(app.getAppPath(), 'dist', 'logo sd cadre.ico')
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
  trayInstance = tray // ← STOCKER L'INSTANCE
  tray.setToolTip('SoundDeck - Soundboard')

  const contextMenu = buildTrayMenu(lang)
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        showMainWindow()
      }
    } else {
      createWindow()
    }
  })
}
// ─── RÉOUVERTURE CENTRALISÉE DE LA FENÊTRE ──────────────────────────────────
function showMainWindow() {
  if (mainWindow) {
    const wasHidden = !mainWindow.isVisible()

    if (wasHidden) {
      // ✅ Vraie réouverture depuis le tray : on annule une éventuelle popup
      mainWindow.webContents.send('hide-quit-confirm')
    }

    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
}

// ─── DÉTECTION DE LA LANGUE SYSTÈME ──────────────────────────────────────

function getSystemLanguage() {
  try {
    const locale = app.getLocale() // 'fr', 'en', 'es', 'fr-FR', etc.
    const lang = locale.split('-')[0] // Prendre seulement la partie langue
    const supported = ['fr', 'en', 'es']
    return supported.includes(lang) ? lang : 'fr'
  } catch (e) {
    console.warn('⚠️ Erreur détection langue:', e)
    return 'fr'
  }
}

// ─── DÉTECTION DU LAYOUT CLAVIER ──────────────────────────────────────────

function getSystemKeyboardLayout() {
  if (process.platform !== 'win32') {
    // Sur macOS/Linux, on utilise une approche différente
    return 'qwerty'
  }

  try {
    const { execSync } = require('child_process')
    
    // Méthode: Lire la langue d'installation du système via le registre
    try {
      // Récupérer la langue d'installation de Windows
      const result = execSync(
        'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Keyboard Layout\\DosKeybCodes" /v "0000040c" 2>nul || echo NOT_FOUND',
        { encoding: 'utf8', timeout: 3000 }
      )
      
      // Si la clé 0000040c (français) existe, c'est probablement AZERTY
      if (result.includes('0000040c')) {
        return 'azerty'
      }
    } catch (e) {
      // La clé n'existe pas, on continue
    }

    // Méthode alternative: Lire la langue système
    try {
      const result = execSync(
        'wmic os get locale /value',
        { encoding: 'utf8', timeout: 3000 }
      )
      
      // Locale 040c = Français (France) -> AZERTY
      // 080c = Français (Belgique) -> AZERTY
      // 100c = Français (Suisse) -> AZERTY
      const azertyLocales = ['040c', '080c', '100c']
      
      const match = result.match(/Locale=([0-9a-fA-F]+)/)
      if (match) {
        const locale = match[1].toLowerCase()
        if (azertyLocales.includes(locale)) {
          return 'azerty'
        }
      }
    } catch (e) {
      console.warn('⚠️ Erreur détection locale:', e.message)
    }

    // Fallback: utiliser la langue système
    const lang = getSystemLanguage()
    const azertyCountries = ['fr', 'be', 'ch']
    return azertyCountries.includes(lang) ? 'azerty' : 'qwerty'
    
  } catch (e) {
    console.warn('⚠️ Erreur détection clavier:', e)
    return 'qwerty'
  }
}

// ─── IPC HANDLERS POUR LE TRAY ──────────────────────────────────────────────

ipcMain.handle('update-tray-language', (event, lang) => {
  if (tray) {
    const contextMenu = buildTrayMenu(lang)
    tray.setContextMenu(contextMenu)
  }
  return true
})

ipcMain.handle('store-set-lang', (event, lang) => {
  store.set('lang', lang)
  return true
})

// ─── GESTION DU PILOTE VIRTUAL AUDIO (VB-Cable) ────────────────────────────

// Vérifier si le pilote VB-Cable est installé
function isVirtualDriverInstalled() {
  return store.get('virtualDriverInstalled', false)
}

// Chemin vers l'installateur VB-Cable dans les ressources
function getDriverResourcePath() {
  const possiblePaths = []

  if (isDev) {
    possiblePaths.push(
      // Chercher d'abord l'EXE
      path.join(__dirname, '../resources/drivers/VBCABLE_Setup_x64.exe'),
      path.join(__dirname, '../resources/drivers/VBCABLE_Setup.exe'),
      // Puis les ZIP
      path.join(__dirname, '../resources/drivers/VBCABLE_Driver_Pack.zip'),
      path.join(__dirname, '../resources/drivers/VBCABLE_Driver_Pack45.zip'),
      // Autres chemins
      path.join(__dirname, '../../resources/drivers/VBCABLE_Setup_x64.exe'),
      path.join(process.cwd(), 'resources/drivers/VBCABLE_Setup_x64.exe'),
      path.join(process.cwd(), 'drivers/VBCABLE_Setup_x64.exe'),
      path.join(app.getPath('userData'), 'drivers/VBCABLE_Setup_x64.exe')
    )
  } else {
    possiblePaths.push(
      path.join(process.resourcesPath, 'drivers', 'VBCABLE_Setup_x64.exe'),
      path.join(process.resourcesPath, 'drivers', 'VBCABLE_Driver_Pack.zip'),
      path.join(process.resourcesPath, 'drivers', 'VBCABLE_Driver_Pack45.zip'),
      path.join(path.dirname(app.getPath('exe')), 'resources/drivers/VBCABLE_Setup_x64.exe')
    )
  }

  console.log('🔍 Recherche de l\'installateur VB-Cable:')
  for (const p of possiblePaths) {
    const exists = fs.existsSync(p)
    console.log(`  ${exists ? '✅' : '❌'} ${p}`)
    if (exists) {
      console.log(`✅ Installateur trouvé à: ${p}`)
      return p
    }
  }

  console.warn('⚠️ Aucun installateur VB-Cable trouvé')
  return possiblePaths[0]
}

// Télécharger VB-Cable depuis le site officiel
async function downloadVBCable() {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const url = 'https://vb-audio.com/Cable/VBCABLE_Setup_x64.exe'
    const destPath = path.join(app.getPath('temp'), 'VBCABLE_Setup_x64.exe')

    console.log('📥 Téléchargement de VB-Cable depuis:', url)

    const file = fs.createWriteStream(destPath)
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
        // Redirection - on suit
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://vb-audio.com${res.headers.location}`
        console.log('🔄 Redirection vers:', redirectUrl)
        downloadVBCableFromUrl(redirectUrl, destPath).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        console.log('✅ Téléchargement terminé:', destPath)
        resolve(destPath)
      })
      file.on('error', reject)
    }).on('error', reject)
  })
}

function downloadVBCableFromUrl(url, destPath) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const file = fs.createWriteStream(destPath)

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(destPath)
      })
      file.on('error', reject)
    }).on('error', reject)
  })
}

function checkVBCableInstalled() {
  return new Promise((resolve) => {
    exec('pnputil /enum-drivers | findstr /i "vb-audio"', { timeout: 5000 }, (err, stdout) => {
      if (stdout && stdout.toLowerCase().includes('vb-audio')) {
        resolve(true)
        return
      }
      exec('powershell -Command "Get-PnpDevice -FriendlyName *CABLE* | Select-Object FriendlyName"',
        { timeout: 5000 }, (err2, stdout2) => {
          if (stdout2 && stdout2.toLowerCase().includes('cable')) {
            resolve(true)
            return
          }
          exec('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "VB-CABLE"',
            { timeout: 5000 }, (err3, stdout3) => {
              resolve(stdout3 && stdout3.toLowerCase().includes('vb-cable'))
            })
        })
    })
  })
}

// Installer VB-Cable
async function installVirtualDriver() {
  console.log('🚀 Début installation VB-Cable...')

  if (isVirtualDriverInstalled()) {
    console.log('⚠️ Pilote déjà installé')
    return { success: false, error: 'Pilote déjà installé' }
  }

  if (process.platform !== 'win32') {
    console.log('⚠️ Plateforme non supportée:', process.platform)
    return { success: false, error: 'Plateforme non supportée (Windows uniquement)' }
  }

  try {
    // 1. Chercher l'installateur localement (ZIP ou EXE)
    let installerPath = getDriverResourcePath()
    let downloaded = false
    let isZip = false

    // Vérifier si c'est un ZIP ou un EXE
    if (fs.existsSync(installerPath) && installerPath.endsWith('.zip')) {
      isZip = true
      console.log('📦 Fichier ZIP détecté, extraction en cours...')

      // Extraire le ZIP dans un dossier temporaire
      const extractPath = path.join(app.getPath('temp'), `vbcable_${Date.now()}`)
      fs.mkdirSync(extractPath, { recursive: true })

      const AdmZip = require('adm-zip')
      const zip = new AdmZip(installerPath)
      zip.extractAllTo(extractPath, true)
      console.log('✅ Extraction terminée dans:', extractPath)

      // Chercher l'exe dans le dossier extrait
      const files = fs.readdirSync(extractPath)
      console.log('📁 Fichiers extraits:', files)

      // Chercher VBCABLE_Setup_x64.exe ou VBCABLE_Setup.exe
      let exeFile = files.find(f => f.match(/VBCABLE_Setup.*\.exe/i))
      if (!exeFile) {
        // Chercher dans les sous-dossiers
        for (const file of files) {
          const fullPath = path.join(extractPath, file)
          if (fs.statSync(fullPath).isDirectory()) {
            const subFiles = fs.readdirSync(fullPath)
            const found = subFiles.find(f => f.match(/VBCABLE_Setup.*\.exe/i))
            if (found) {
              exeFile = path.join(file, found)
              break
            }
          }
        }
      }

      if (!exeFile) {
        fs.rmSync(extractPath, { recursive: true, force: true })
        return { success: false, error: 'VBCABLE_Setup.exe non trouvé dans le ZIP' }
      }

      installerPath = path.join(extractPath, exeFile)
      console.log('✅ Installateur trouvé:', installerPath)

      // Nettoyer le dossier après installation
      setTimeout(() => {
        try {
          fs.rmSync(extractPath, { recursive: true, force: true })
          console.log('🧹 Dossier temporaire nettoyé')
        } catch (e) {
          console.warn('⚠️ Erreur nettoyage:', e.message)
        }
      }, 10000)

    } else if (!fs.existsSync(installerPath)) {
      // 2. Si pas trouvé, télécharger le ZIP
      console.log('📥 Installateur non trouvé localement, téléchargement...')
      try {
        installerPath = await downloadVBCableZip()
        downloaded = true
        isZip = true
        console.log('✅ Téléchargement réussi:', installerPath)

        // Extraire le ZIP téléchargé
        const extractPath = path.join(app.getPath('temp'), `vbcable_${Date.now()}`)
        fs.mkdirSync(extractPath, { recursive: true })

        const AdmZip = require('adm-zip')
        const zip = new AdmZip(installerPath)
        zip.extractAllTo(extractPath, true)
        console.log('✅ Extraction terminée dans:', extractPath)

        // Chercher l'exe
        const files = fs.readdirSync(extractPath)
        let exeFile = files.find(f => f.match(/VBCABLE_Setup.*\.exe/i))
        if (!exeFile) {
          for (const file of files) {
            const fullPath = path.join(extractPath, file)
            if (fs.statSync(fullPath).isDirectory()) {
              const subFiles = fs.readdirSync(fullPath)
              const found = subFiles.find(f => f.match(/VBCABLE_Setup.*\.exe/i))
              if (found) {
                exeFile = path.join(file, found)
                break
              }
            }
          }
        }

        if (!exeFile) {
          fs.rmSync(extractPath, { recursive: true, force: true })
          return { success: false, error: 'VBCABLE_Setup.exe non trouvé dans le ZIP' }
        }

        installerPath = path.join(extractPath, exeFile)
        console.log('✅ Installateur trouvé:', installerPath)

        // Nettoyer plus tard
        setTimeout(() => {
          try {
            fs.rmSync(extractPath, { recursive: true, force: true })
          } catch (e) {}
        }, 10000)

      } catch (e) {
        console.error('❌ Erreur téléchargement:', e)
        return { success: false, error: 'Impossible de télécharger VB-Cable: ' + e.message }
      }
    }

    // 3. Installer avec élévation de privilèges (RunAs)
    console.log('🔧 Installation de VB-Cable avec droits administrateur...')
    console.log('📁 Installateur:', installerPath)

    // Utiliser PowerShell avec Start-Process -Verb RunAs pour lancer en tant qu'admin
    // Les options /VERYSILENT /SUPPRESSMSGBOXES /NORESTART fonctionnent avec l'admin
    const psScript = `Start-Process -FilePath "${installerPath}" -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -Verb RunAs -Wait`
    const cmd = `powershell -Command "${psScript}"`
    console.log('🔧 Commande PowerShell:', cmd)

    return new Promise((resolve) => {
      exec(cmd, {
        timeout: 120000,
        shell: 'cmd.exe',
        windowsHide: false
      }, (error, stdout, stderr) => {
        if (stdout) console.log('📤 stdout:', stdout)
        if (stderr) console.error('📤 stderr:', stderr)

        if (error) {
          console.error('❌ Erreur installation:', error)
          // Code 5 = Access denied / besoin de redémarrage
          // Code 4294967295 = erreur générique souvent due à l'UAC
          if (error.code === 5 || error.code === 4294967295) {
            // On vérifie si le pilote est quand même installé
            setTimeout(() => {
              checkVBCableInstalled().then((installed) => {
                if (installed) {
                  store.set('virtualDriverInstalled', true)
                  store.set('virtualDriverInstalledAt', Date.now())
                  console.log('✅ VB-Cable installé avec succès (vérifié)')
                  resolve({ success: true })
                } else {
                  console.log('⚠️ Installation peut nécessiter un redémarrage')
                  store.set('virtualDriverInstalled', true)
                  store.set('virtualDriverInstalledAt', Date.now())
                  resolve({ success: true, warning: 'Installation réussie. Un redémarrage peut être nécessaire pour que le périphérique soit détecté.' })
                }
              })
            }, 3000)
            return
          }
          resolve({ success: false, error: error.message })
          return
        }

        // Vérifier si l'installation a réussi
        setTimeout(() => {
          checkVBCableInstalled().then((installed) => {
            if (installed) {
              store.set('virtualDriverInstalled', true)
              store.set('virtualDriverInstalledAt', Date.now())
              console.log('✅ VB-Cable installé avec succès')
              resolve({ success: true })
            } else {
              console.warn('⚠️ VB-Cable non détecté après installation')
              store.set('virtualDriverInstalled', true)
              store.set('virtualDriverInstalledAt', Date.now())
              resolve({ success: true, warning: 'Installation réussie mais redémarrage peut être nécessaire' })
            }
          })
        }, 3000)
      })
    })

  } catch (e) {
    console.error('❌ Erreur installation VB-Cable:', e)
    return { success: false, error: e.message }
  }
}

// Télécharger le ZIP de VB-Cable
async function downloadVBCableZip() {
  return new Promise((resolve, reject) => {
    const https = require('https')
    // ✅ URL CORRECTE du ZIP officiel
    const url = 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip'
    const destPath = path.join(app.getPath('temp'), 'VBCABLE_Driver_Pack45.zip')

    console.log('📥 Téléchargement de VB-Cable depuis:', url)

    const file = fs.createWriteStream(destPath)
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://vb-audio.com${res.headers.location}`
        console.log('🔄 Redirection vers:', redirectUrl)
        downloadVBCableFromUrl(redirectUrl, destPath).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        console.log('✅ Téléchargement terminé:', destPath)
        resolve(destPath)
      })
      file.on('error', reject)
    }).on('error', reject)
  })
}

// Désinstaller VB-Cable - Version avec recherche PowerShell
function uninstallVirtualDriver() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, error: 'Plateforme non supportée' })
      return
    }

    console.log('🗑️ Début désinstallation VB-Cable...')

    // Méthode 1: Essayer via le désinstallateur officiel
    const uninstallerPaths = [
      'C:\\Program Files\\VB-CABLE\\uninstall.exe',
      'C:\\Program Files\\VB-CABLE\\unins000.exe',
      'C:\\Program Files (x86)\\VB-CABLE\\uninstall.exe',
      'C:\\Program Files (x86)\\VB-CABLE\\unins000.exe'
    ]

    let foundUninstaller = null
    for (const p of uninstallerPaths) {
      if (fs.existsSync(p)) {
        foundUninstaller = p
        break
      }
    }

    if (foundUninstaller) {
      console.log('🔧 Désinstallation via:', foundUninstaller)
      const cmd = `"${foundUninstaller}" /VERYSILENT /SUPPRESSMSGBOXES`
      exec(cmd, { timeout: 60000 }, (error) => {
        if (!error) {
          store.delete('virtualDriverInstalled')
          console.log('✅ VB-Cable désinstallé avec succès')
          resolve({ success: true })
        } else {
          console.log('⚠️ Échec désinstallateur, recherche PowerShell...')
          uninstallViaPowerShell(resolve)
        }
      })
      return
    }

    // Méthode 2: Recherche via PowerShell
    uninstallViaPowerShell(resolve)
  })
}

// Fonction auxiliaire pour désinstaller via PowerShell
function uninstallViaPowerShell(resolve) {
  console.log('🔧 Recherche du driver VB-Cable via PowerShell...')

  // Script PowerShell qui liste TOUS les drivers installés et cherche VB-Cable
  const psScript = `
    $ErrorActionPreference = "SilentlyContinue"

    # Récupérer tous les drivers
    $drivers = pnputil /enum-drivers

    # Chercher les drivers qui contiennent "cable" ou "vb" ou "vbaudio"
    $found = $drivers | Select-String -Pattern "(?i)(cable|vb[-_]?audio|vbaudio)"

    if ($found) {
      # Extraire le nom du fichier .inf (oem*.inf)
      $infFile = ($found.Line -match 'oem\\d+\\.inf').Matches.Value
      if ($infFile) {
        Write-Host "FOUND:$infFile"
      } else {
        # Chercher autrement
        foreach ($line in $found.Line) {
          $match = [regex]::Match($line, 'oem\\d+\\.inf', 'IgnoreCase')
          if ($match.Success) {
            Write-Host "FOUND:$($match.Value)"
            break
          }
        }
      }
    } else {
      # Chercher dans les périphériques audio
      $devices = Get-PnpDevice -Class AudioEndpoint -ErrorAction SilentlyContinue
      foreach ($device in $devices) {
        if ($device.FriendlyName -match "cable|vb") {
          Write-Host "DEVICE:$($device.FriendlyName)"
          # Récupérer l'instance ID pour trouver le driver
          $instanceId = $device.InstanceId
          Write-Host "INSTANCE:$instanceId"
        }
      }
    }
  `

  exec(`powershell -Command "${psScript}"`, { timeout: 15000 }, (err, stdout, stderr) => {
    if (stdout) console.log('📤 PowerShell stdout:', stdout)
    if (stderr) console.error('📤 PowerShell stderr:', stderr)

    if (err) {
      console.error('❌ Erreur PowerShell:', err)
      // Dernière tentative: chercher manuellement dans tous les drivers
      uninstallViaManualSearch(resolve)
      return
    }

    // Analyser la sortie pour trouver le nom du driver
    const lines = stdout.split('\n')
    let infFile = null

    for (const line of lines) {
      if (line.startsWith('FOUND:')) {
        infFile = line.replace('FOUND:', '').trim()
        break
      }
    }

    if (infFile) {
      console.log(`✅ Driver trouvé via PowerShell: ${infFile}`)
      exec(`pnputil /delete-driver ${infFile} /force`, { timeout: 10000 }, (delErr) => {
        if (delErr) {
          console.warn('⚠️ Erreur suppression:', delErr.message)
          uninstallViaManualSearch(resolve)
        } else {
          store.delete('virtualDriverInstalled')
          console.log('✅ VB-Cable désinstallé avec succès')
          resolve({ success: true })
        }
      })
    } else {
      // Si on a trouvé un périphérique mais pas le driver
      if (stdout.includes('DEVICE:')) {
        console.log('🔧 Périphérique VB-Cable trouvé, tentative de suppression...')
        const removeDeviceScript = `
          Get-PnpDevice -FriendlyName "*CABLE*" | Remove-PnpDevice -Confirm:$false
          Get-PnpDevice -FriendlyName "*VB-Audio*" | Remove-PnpDevice -Confirm:$false
        `
        exec(`powershell -Command "${removeDeviceScript}"`, { timeout: 10000 }, (rmErr) => {
          if (!rmErr) {
            store.delete('virtualDriverInstalled')
            console.log('✅ VB-Cable supprimé via PowerShell')
            resolve({ success: true })
          } else {
            uninstallViaManualSearch(resolve)
          }
        })
      } else {
        uninstallViaManualSearch(resolve)
      }
    }
  })
}

// Fonction auxiliaire pour recherche manuelle
function uninstallViaManualSearch(resolve) {
  console.log('🔧 Recherche manuelle dans tous les drivers...')

  // Lister TOUS les drivers
  exec('pnputil /enum-drivers', { timeout: 15000 }, (enumErr, enumStdout) => {
    if (enumErr) {
      console.error('❌ Erreur énumération:', enumErr)
      resolve({ success: false, error: 'Impossible d\'énumérer les drivers' })
      return
    }

    const lines = enumStdout.split('\n')
    let foundInf = null

    // Parcourir chaque ligne et chercher des indices
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()

      // Chercher des mots-clés dans la ligne
      if (line.includes('cable') ||
          line.includes('vb-audio') ||
          line.includes('vbaudio') ||
          (line.includes('vb') && line.includes('audio'))) {

        // Chercher le nom du fichier .inf dans cette ligne ou les lignes suivantes
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 3); j++) {
          const match = lines[j].match(/(oem\d+\.inf)/i)
          if (match) {
            foundInf = match[1]
            console.log(`✅ Driver trouvé: ${foundInf} (ligne: ${lines[j].trim()})`)
            break
          }
        }

        if (foundInf) break
      }
    }

    if (foundInf) {
      console.log(`🔧 Suppression du driver: ${foundInf}`)
      exec(`pnputil /delete-driver ${foundInf} /force`, { timeout: 10000 }, (delErr) => {
        if (delErr) {
          console.warn('⚠️ Erreur suppression:', delErr.message)
          // Dernière chance: essayer avec PowerShell élevé
          console.log('🔧 Dernière tentative avec élévation de privilèges...')
          uninstallViaPowerShellElevated(resolve)
        } else {
          store.delete('virtualDriverInstalled')
          console.log('✅ VB-Cable désinstallé avec succès')
          resolve({ success: true })
        }
      })
    } else {
      console.log('❌ Aucun driver VB-Cable trouvé')
      resolve({ success: false, error: 'Driver VB-Cable non trouvé' })
    }
  })
}

// Fonction auxiliaire pour désinstaller via PowerShell avec élévation - Version avec désactivation
function uninstallViaPowerShellElevated(resolve) {
  console.log('🔧 Tentative de désinstallation avec élévation de privilèges...')

  const tempDir = app.getPath('temp')
  const scriptPath = path.join(tempDir, `uninstall_vbcable_${Date.now()}.ps1`)

  const psScriptContent = `
$ErrorActionPreference = "Continue"

Write-Host "=========================================="
Write-Host "Desinstallation de VB-Cable"
Write-Host "=========================================="

# 1. Desactiver les peripheriques
Write-Host ""
Write-Host "[1] Desactivation des peripheriques..."

# Desactiver CABLE Input/Output
Get-PnpDevice -FriendlyName "*CABLE*" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  Desactivation de: $($_.FriendlyName)"
  $_.FriendlyName | Disable-PnpDevice -Confirm:$false -ErrorAction SilentlyContinue
}

# Desactiver VB-Audio Virtual Cable
Get-PnpDevice -FriendlyName "*VB-Audio*" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  Desactivation de: $($_.FriendlyName)"
  $_.FriendlyName | Disable-PnpDevice -Confirm:$false -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# 2. Trouver et supprimer le driver
Write-Host ""
Write-Host "[2] Recherche et suppression du driver..."

# Rechercher le driver specifique
$foundInf = $null
$drivers = pnputil /enum-drivers

foreach ($line in $drivers) {
    $lowerLine = $line.ToLower()
    if ($lowerLine -match "vbmmecable64_win10" -or
        $lowerLine -match "vbmmecable" -or
        $lowerLine -match "vbaudio" -or
        ($lowerLine -match "vb" -and $lowerLine -match "cable")) {

        $match = [regex]::Match($line, 'oem\\d+\\.inf', 'IgnoreCase')
        if ($match.Success) {
            $foundInf = $match.Value
            Write-Host "  Driver trouve: $foundInf"
            Write-Host "  Ligne: $line"
            break
        }
    }
}

if ($foundInf) {
    Write-Host ""
    Write-Host "[3] Suppression du driver: $foundInf"

    # Essayer la suppression
    $result = pnputil /delete-driver $foundInf /force 2>&1
    Write-Host "  Resultat: $result"

    # Verifier si le driver a ete supprime
    Write-Host ""
    Write-Host "[4] Verification..."
    $check = pnputil /enum-drivers | Select-String -Pattern "vbmmecable"
    if ($check) {
        Write-Host "  Driver VB-Cable encore present"
    } else {
        Write-Host "  Driver VB-Cable supprime !"
    }
} else {
    Write-Host "  Driver VB-Cable non trouve"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Termine. Vous pouvez fermer cette fenetre."
Write-Host "=========================================="
Read-Host "Appuyez sur Entree pour fermer"
`

  fs.writeFileSync(scriptPath, psScriptContent, 'utf8')
  console.log('📁 Script PowerShell créé:', scriptPath)

  const cmd = `powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File ""${scriptPath}""' -Verb RunAs -Wait"`
  console.log('🔧 Lancement du script PowerShell avec élévation...')

  exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
    if (stdout) console.log('📤 PowerShell stdout:', stdout)
    if (stderr) console.error('📤 PowerShell stderr:', stderr)

    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)
      console.log('🧹 Fichier script supprimé')
    } catch (e) {}

    setTimeout(() => {
      checkVBCableInstalled().then((installed) => {
        if (!installed) {
          store.delete('virtualDriverInstalled')
          console.log('✅ VB-Cable désinstallé avec succès')
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Driver toujours présent' })
        }
      })
    }, 3000)
  })
}

// Vérifier le statut du pilote
function getVirtualDriverStatus() {
  return {
    installed: isVirtualDriverInstalled(),
    platform: process.platform
  }
}

// ─── IPC HANDLERS POUR LE PILOTE ─────────────────────────────────────────────

ipcMain.handle('install-virtual-driver', async () => {
  return await installVirtualDriver()
})

ipcMain.handle('uninstall-virtual-driver', async () => {
  return await uninstallVirtualDriver()
})

ipcMain.handle('get-virtual-driver-status', () => {
  return getVirtualDriverStatus()
})

// ─── CREATE WINDOW ────────────────────────────────────────────────────────────

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico')

  console.log('🔍 DIAGNOSTIC createWindow:')
  console.log('📌 __dirname:', __dirname)
  console.log('📌 app.isPackaged:', app.isPackaged)
  console.log('📌 app.getAppPath():', app.getAppPath())

  mainWindow = new BrowserWindow({
    width: 1100, height: 700, minWidth: 800, minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: true
    },
    backgroundColor: '#111113',
    show: !shouldStartMinimized,
    autoHideMenuBar: true,
    frame: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {})
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // ✅ CORRECTION : Chemin correct pour l'app packagée
    // Dans une app packagée, les fichiers sont dans app.asar
    // mais le dossier dist est extrait à la racine
    
    // ✅ Essayer plusieurs chemins
    let indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    
    // ✅ Si le fichier n'existe pas dans app.asar, essayer à la racine
    if (!fs.existsSync(indexPath)) {
      // Pour une app installée, les fichiers sont parfois extraits
      const resourcePath = path.join(process.resourcesPath, 'app', 'dist', 'index.html')
      if (fs.existsSync(resourcePath)) {
        indexPath = resourcePath
      } else {
        // Dernière chance : dans le dossier de l'exe
        const exePath = path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'dist', 'index.html')
        if (fs.existsSync(exePath)) {
          indexPath = exePath
        }
      }
    }
    
    console.log('📄 Chargement de:', indexPath)
    console.log('📄 Fichier existe:', fs.existsSync(indexPath))
    
    // ✅ Si le fichier n'existe pas, afficher une erreur et quitter
    if (!fs.existsSync(indexPath)) {
      console.error('❌ ERREUR: index.html introuvable !')
      dialog.showErrorBox('Erreur de chargement', 
        'Impossible de trouver index.html.\n\n' +
        'Chemin recherché: ' + indexPath + '\n\n' +
        'Vérifiez que le build est correct.'
      )
      app.quit()
      return
    }
    
    mainWindow.loadFile(indexPath)
  }

  mainWindow.once('ready-to-show', () => {
    createTray('fr')
    if (!shouldStartMinimized) {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== mainWindow.webContents.getURL()) e.preventDefault()
  })

  mainWindow.webContents.session.on('will-download', (e) => {
    e.preventDefault()
  })

  mainWindow.on('close', (e) => {
    console.log(`🔴 [MAIN] close event - isQuitting: ${isQuitting}, pendingQuit: ${pendingQuit}, closeToTray: ${closeToTray}`)
    
    if (isQuitting || pendingQuit) {
      console.log(`🔴 [MAIN] Quitting, pas de popup`)
      return
    }

    if (closeToTray === false) {
      console.log(`🔴 [MAIN] closeToTray === false, quit direct`)
      isQuitting = true
      app.quit()
      return
    }

    e.preventDefault()
    console.log(`🔴 [MAIN] Envoi de show-quit-confirm`)
    mainWindow.webContents.send('show-quit-confirm')
  })
}

// ─── Gestion du démarrage automatique ────────────────────────────────────────
function setLaunchAtStartup(enabled) {
  store.set('launchAtStartup', enabled)

  if (process.platform !== 'win32') return

  // ✅ Si on est en développement, NE PAS créer de raccourci de démarrage
  // pour éviter le problème de la double fenêtre Electron
  if (!app.isPackaged) {
    console.log('🛠️ Mode développement : création du raccourci désactivée')
    return
  }

  const targetPath = process.execPath
  const workingDir = path.dirname(targetPath)
  const startupFolder = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  const startupShortcutPath = path.join(startupFolder, 'SoundDeck.lnk')

  console.log('🎯 setLaunchAtStartup - enabled:', enabled)
  console.log('🎯 targetPath:', targetPath)

  // ✅ SUPPRIMER TOUS LES RACCOURCIS SOUNDDECK AVANT DE CRÉER LE BON
  if (enabled) {
    // Rechercher et supprimer tous les raccourcis SoundDeck
    const searchPaths = [
      path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
      path.join(app.getPath('desktop')),
      'C:\\Users\\Public\\Desktop',
    ]
    
    for (const folder of searchPaths) {
      if (!fs.existsSync(folder)) continue
      const files = fs.readdirSync(folder)
      for (const file of files) {
        if (file.toLowerCase().includes('sounddeck') && file.endsWith('.lnk')) {
          const fullPath = path.join(folder, file)
          try {
            fs.unlinkSync(fullPath)
            console.log(`🗑️ Supprimé: ${fullPath}`)
          } catch (e) {}
        }
      }
    }
  }

  if (!fs.existsSync(startupFolder)) {
    try {
      fs.mkdirSync(startupFolder, { recursive: true })
    } catch (e) {
      console.error('❌ Erreur création dossier Startup:', e)
      return
    }
  }

  if (enabled) {
    // Créer le bon raccourci dans Startup
    const tempDir = app.getPath('temp')
    const ps1Path = path.join(tempDir, `create_shortcut_${Date.now()}.ps1`)
    
    const ps1Content = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${startupShortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
$Shortcut.Save()
`
    
    fs.writeFileSync(ps1Path, ps1Content, 'utf8')
    
    const cmd = `powershell -ExecutionPolicy Bypass -File "${ps1Path}"`
    
    exec(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(ps1Path)) fs.unlinkSync(ps1Path)
      } catch (e) {}
      
      if (error) {
        console.error('❌ Erreur création raccourci:', error.message)
        return
      }
      
      if (fs.existsSync(startupShortcutPath)) {
        console.log('✅ Raccourci démarrage créé')
      }
    })
  }
}

// ─── DIAGNOSTIC COMPLET DES RACCOURCIS ──────────────────────────────────────
function findAllSoundDeckShortcuts() {
  console.log('═══════════════════════════════════════════════')
  console.log('🔍 RECHERCHE DE TOUS LES RACCOURCIS SOUNDDECK')
  console.log('═══════════════════════════════════════════════')
  
  const searchPaths = [
    // Startup utilisateur
    path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'),
    // Startup tous les utilisateurs
    'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup',
    // Menu Démarrer utilisateur
    path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    // Menu Démarrer tous les utilisateurs
    'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
    // Bureau utilisateur
    path.join(app.getPath('desktop')),
    // Bureau public
    'C:\\Users\\Public\\Desktop',
    // Dossier d'installation
    path.dirname(process.execPath),
  ]
  
  for (const folder of searchPaths) {
    if (!fs.existsSync(folder)) continue
    
    const files = fs.readdirSync(folder)
    const shortcuts = files.filter(f => f.toLowerCase().includes('sounddeck') && f.endsWith('.lnk'))
    
    if (shortcuts.length > 0) {
      console.log(`📁 ${folder}:`)
      for (const file of shortcuts) {
        const fullPath = path.join(folder, file)
        console.log(`   📄 ${file}`)
        
        // Lire la cible du raccourci
        try {
          const checkCmd = `powershell -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${fullPath.replace(/\\/g, '\\\\')}');Write-Host 'Cible:' $s.TargetPath; Write-Host 'Args:' $s.Arguments"`
          exec(checkCmd, (err, stdout) => {
            if (!err) console.log(`      ${stdout.trim()}`)
          })
        } catch (e) {}
      }
    }
  }
  console.log('═══════════════════════════════════════════════')
}

// Appeler cette fonction au démarrage
app.whenReady().then

// ─── App ──────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  cleanupOrphanShortcuts()
  
  // ✅ Détecter et sauvegarder la langue système si jamais définie
  const systemLang = getSystemLanguage()
  const savedLang = store.get('lang')
  if (!savedLang) {
    store.set('lang', systemLang)
    console.log(`🌐 Langue système détectée: ${systemLang}`)
  }

  // ✅ Détecter et sauvegarder le layout clavier système si jamais défini
  const systemLayout = getSystemKeyboardLayout()
  const savedLayout = store.get('keyboardLayout')
  if (!savedLayout) {
    store.set('keyboardLayout', systemLayout)
    console.log(`⌨️ Layout clavier système détecté: ${systemLayout}`)
  }

  createTray('fr')
  createWindow()
  registerShortcuts()
  registerToggleShortcut()
  
  // Charger le raccourci depuis le store
  try {
    const store = new Store()
    const savedShortcut = store.get('toggleWindowShortcut')
    if (savedShortcut) {
      currentToggleWindowShortcut = savedShortcut
      registerToggleWindowShortcut(savedShortcut)
    } else {
      registerToggleWindowShortcut('CommandOrControl+Shift+S')
    }
  } catch (e) {
    console.warn('Erreur chargement raccourci toggle fenêtre:', e)
    registerToggleWindowShortcut('CommandOrControl+Shift+S')
  }
  
  findAllSoundDeckShortcuts()
  
  console.log('🔍 DIAGNOSTIC DES CHEMINS:')
  console.log('process.execPath:', process.execPath)
  console.log('app.getPath("exe"):', app.getPath('exe'))
  console.log('app.isPackaged:', app.isPackaged)
  console.log('__dirname:', __dirname)
  console.log('app.getAppPath():', app.getAppPath())
  
  // ✅ CRÉER LE VRAI RACCOURCI SI L'OPTION EST ACTIVÉE
  const isLaunchAtStartup = store.get('launchAtStartup', false)
  console.log('📌 launchAtStartup dans le store:', isLaunchAtStartup)
  
  if (isLaunchAtStartup) {
    console.log('🔧 Création du raccourci de démarrage...')
    setLaunchAtStartup(true)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!isQuitting) {
    if (process.platform !== 'darwin') {
      return
    }
  }
  if (isQuitting) {
    globalShortcut.unregisterAll()
    registeredShortcuts = []
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  
  // ✅ Nettoyer l'icône du tray
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
})

app.on('window-all-closed', () => {
  if (!isQuitting) {
    if (process.platform !== 'darwin') {
      return
    }
  }
  if (isQuitting) {
    globalShortcut.unregisterAll()
    registeredShortcuts = []
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true

  // ✅ Nettoyer l'icône du tray
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
})

// ─── Raccourcis ───────────────────────────────────────────────────────────────
function safeRegister(accelerator, callback) {
  if (!accelerator) return false
  try {
    const isFn = /^F\d+$/.test(accelerator)
    const hasMod = accelerator.includes('+')
    if (!isFn && !hasMod) {
      const ok = globalShortcut.register(accelerator, callback)
      if (ok) registeredShortcuts.push(accelerator)
      return ok
    }
    const ok = globalShortcut.register(accelerator, callback)
    if (ok) registeredShortcuts.push(accelerator)
    return ok
  } catch (e) {
    console.warn('Raccourci non supporté:', accelerator, e.message)
    return false
  }
}

function registerToggleShortcut() {
  const toggleAccelerator = store.get('toggleShortcutsAccelerator', 'CommandOrControl+Shift+K')
  if (!toggleAccelerator) return

  try {
    globalShortcut.unregister(toggleAccelerator)

    const ok = globalShortcut.register(toggleAccelerator, () => {
      globalShortcutsEnabled = !globalShortcutsEnabled
      store.set('globalShortcutsEnabled', globalShortcutsEnabled)

      if (globalShortcutsEnabled) {
        registerShortcuts()
      } else {
        unregisterAllShortcuts()
      }

      if (mainWindow) {
        mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
      }

      if (tray) {
        const currentLang = getCurrentTrayLanguage()
        const contextMenu = buildTrayMenu(currentLang)
        tray.setContextMenu(contextMenu)
      }

      const state = globalShortcutsEnabled ? 'activés' : 'désactivés'
      console.log(`🔇 Raccourcis ${state}`)
    })

    console.log('✅ Raccourci toggle enregistré:', toggleAccelerator)
    console.log('📊 État des raccourcis globaux:', globalShortcutsEnabled)

    if (ok) {
      console.log('✅ Raccourci toggle enregistré:', toggleAccelerator)
    } else {
      console.warn('⚠️ Impossible d\'enregistrer le raccourci toggle:', toggleAccelerator)
    }
  } catch (e) {
    console.warn('Erreur enregistrement toggle:', e.message)
  }
}

function unregisterAllShortcuts() {
  registeredShortcuts.forEach(acc => {
    try {
      globalShortcut.unregister(acc)
    } catch (e) {}
  })
  registeredShortcuts = []
  console.log('🔇 Tous les raccourcis désenregistrés')
}

function reregisterShortcuts() {
  unregisterAllShortcuts()

  if (globalShortcutsEnabled) {
    registerShortcuts()
  }

  if (mainWindow) {
    mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
  }
}

function toggleGlobalShortcuts() {
  globalShortcutsEnabled = !globalShortcutsEnabled
  store.set('globalShortcutsEnabled', globalShortcutsEnabled)

  if (globalShortcutsEnabled) {
    registerShortcuts()
  } else {
    unregisterAllShortcuts()
  }

  if (tray) {
    const currentLang = getCurrentTrayLanguage()
    const contextMenu = buildTrayMenu(currentLang)
    tray.setContextMenu(contextMenu)
  }

  if (mainWindow) {
    mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
  }

  return globalShortcutsEnabled
}

function registerShortcuts() {
  if (!globalShortcutsEnabled) {
    console.log('🔇 Raccourcis globaux désactivés')
    return
  }

  const shortcuts = store.get('shortcuts', {})
  Object.entries(shortcuts).forEach(([soundId, accelerator]) => {
    if (!accelerator) return
    safeRegister(accelerator, () => {
      mainWindow?.webContents.send('play-sound', soundId)
    })
  })

  const profileShortcut = store.get('profileShortcut', '')
  if (profileShortcut) {
    safeRegister(profileShortcut, () => {
      mainWindow?.webContents.send('switch-profile')
    })
  }

  const loopShortcut = store.get('loopShortcut', '')
  if (loopShortcut) {
    safeRegister(loopShortcut, () => {
      mainWindow?.webContents.send('toggle-loop')
    })
  }

  const stopAllShortcut = store.get('stopAllShortcut', '')
  if (stopAllShortcut) {
    safeRegister(stopAllShortcut, () => {
      mainWindow?.webContents.send('stop-all-sounds')
    })
  }

  const presentationShortcut = store.get('presentationShortcut', '')
  if (presentationShortcut) {
    safeRegister(presentationShortcut, () => {
      mainWindow?.webContents.send('toggle-presentation')
    })
  }

  console.log('✅ Raccourcis globaux activés')
}

// ─── Nettoyage des raccourcis orphelins ──────────────────────────────────────
function cleanupOrphanShortcuts() {
  console.log('🧹 Nettoyage des raccourcis orphelins...')
  const shortcuts = store.get('shortcuts', {})
  const sounds = store.get('sounds', [])
  const soundIds = new Set(sounds.map(s => s.id))
  let hasChanges = false

  Object.keys(shortcuts).forEach(id => {
    if (!soundIds.has(id)) {
      console.log(`🗑️ Suppression du raccourci orphelin pour l'ID: ${id}`)
      delete shortcuts[id]
      hasChanges = true
    }
  })

  if (hasChanges) {
    store.set('shortcuts', shortcuts)
    console.log('✅ Raccourcis orphelins nettoyés')
    // Mettre à jour les raccourcis enregistrés
    reregisterShortcuts()
  } else {
    console.log('✅ Aucun raccourci orphelin trouvé')
  }
}

// ─── IPC Handlers pour le toggle ────────────────────────────────────────────
ipcMain.handle('toggle-global-shortcuts', () => {
  return toggleGlobalShortcuts()
})

ipcMain.handle('get-global-shortcuts-state', () => {
  return globalShortcutsEnabled
})

// ─── IPC Handlers pour le tray ─────────────────────────────────────────────
ipcMain.handle('get-start-minimized', () => {
  return store.get('startMinimized', false)
})

ipcMain.handle('set-start-minimized', (event, value) => {
  store.set('startMinimized', value)
  return true
})

ipcMain.handle('get-launch-at-startup', () => {
  return store.get('launchAtStartup', false)
})

ipcMain.handle('set-launch-at-startup', (event, value) => {
  setLaunchAtStartup(value)
  return true
})

ipcMain.handle('quit-app', () => {
  isQuitting = true
  app.quit()
  return true
})

ipcMain.handle('confirm-quit', (event, action, remember) => {
  console.log('🔍 confirm-quit appelé avec:', { action, remember })

  if (action === 'quit') {
    if (remember) {
      closeToTray = false
      store.set('closeToTray', false)
      console.log('💾 closeToTray sauvegardé:', false)
    }
    pendingQuit = true
    isQuitting = true
    app.quit()
    return 'quit'
  } else if (action === 'minimize') {
    if (remember) {
      closeToTray = true
      store.set('closeToTray', true)
      console.log('💾 closeToTray sauvegardé:', true)
    }
    
    // ✅ Envoyer l'événement AVANT de cacher la fenêtre
    if (mainWindow) {
      mainWindow.webContents.send('show-window')
      mainWindow.hide()
    }
    return 'minimize'
  } else {
    return 'cancel'
  }
})

ipcMain.handle('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide()
  }
  return true
})

ipcMain.handle('show-window', () => {
  showMainWindow()
  return true
})

// ─── Mise à jour des raccourcis ─────────────────────────────────────────────
ipcMain.handle('update-shortcuts', (event, shortcuts) => {
  store.set('shortcuts', shortcuts)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-profile-shortcut', (event, accelerator) => {
  store.set('profileShortcut', accelerator)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-presentation-shortcut', (event, accelerator) => {
  store.set('presentationShortcut', accelerator)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-stop-all-shortcut', (event, accelerator) => {
  store.set('stopAllShortcut', accelerator)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-loop-shortcut', (event, accelerator) => {
  store.set('loopShortcut', accelerator)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-toggle-shortcuts-accelerator', (event, accelerator) => {
  store.set('toggleShortcutsAccelerator', accelerator)
  reregisterShortcuts()
  return true
})

ipcMain.handle('update-toggle-window-shortcut', (event, accelerator) => {
  registerToggleWindowShortcut(accelerator)
  return true
})

// ─── Fichiers ─────────────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer des sons',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }],
    properties: ['openFile', 'multiSelections']
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir une image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('import-sound-file', async (event, filePath) => {
  try {
    const fileName = path.basename(filePath)
    const destPath = path.join(soundsDir, fileName)
    const finalDest = fs.existsSync(destPath)
      ? path.join(soundsDir, `${Date.now()}_${fileName}`)
      : destPath
    fs.copyFileSync(filePath, finalDest)
    return { success: true, path: finalDest.replace(/\\/g, '/'), name: path.basename(finalDest, path.extname(finalDest)) }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('import-image-file', async (event, filePath) => {
  try {
    const imagesDir = path.join(app.getPath('userData'), 'images')
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
    const fileName = `${Date.now()}_${path.basename(filePath)}`
    const destPath = path.join(imagesDir, fileName)
    fs.copyFileSync(filePath, destPath)
    return { success: true, path: destPath.replace(/\\/g, '/') }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('download-sound-url', async (event, rawUrl, fileName) => {
  const https = require('https')
  const http = require('http')
  const destPath = path.join(soundsDir, fileName)

  function resolveDirectUrl(url) {
    const gdrive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (gdrive) {
      return `https://drive.google.com/uc?export=download&id=${gdrive[1]}`
    }
    const gdriveOpen = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    if (gdriveOpen) {
      return `https://drive.google.com/uc?export=download&id=${gdriveOpen[1]}`
    }
    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?dl=1').replace('&dl=0', '&dl=1')
    }
    if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
      const b64 = Buffer.from(url).toString('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`
    }
    return url
  }

  const url = resolveDirectUrl(rawUrl)
  console.log('Download URL résolu:', rawUrl, '→', url)

  const doRequest = (url, dest, redirectCount = 0) => new Promise((resolve) => {
    if (redirectCount > 10) {
      resolve({ success: false, error: 'Trop de redirections' })
      return
    }
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*, */*'
      }
    }, (res) => {
      console.log('HTTP status:', res.statusCode, 'Content-Type:', res.headers['content-type'])

      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close()
        fs.unlink(dest, () => {})
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href
        console.log('Redirection vers:', redirectUrl)
        doRequest(redirectUrl, dest, redirectCount + 1).then(resolve)
        return
      }

      const contentType = res.headers['content-type'] || ''
      if (res.statusCode === 200 && contentType.includes('text/html')) {
        file.close()
        fs.unlink(dest, () => {})
        resolve({
          success: false,
          error: 'Le lien pointe vers une page web et non un fichier audio direct.\n\nPour Google Drive : ouvrez le fichier → cliquez "Télécharger" → copiez le lien direct.\nPour Dropbox : remplacez ?dl=0 par ?dl=1 dans l\'URL.'
        })
        return
      }

      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        resolve({ success: false, error: `Erreur HTTP ${res.statusCode}` })
        return
      }

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        const stats = fs.statSync(dest)
        if (stats.size < 1000) {
          fs.unlink(dest, () => {})
          resolve({ success: false, error: 'Fichier téléchargé trop petit — lien invalide ou protégé.' })
          return
        }
        resolve({ success: true, path: dest.replace(/\\/g, '/') })
      })
      file.on('error', (e) => {
        fs.unlink(dest, () => {})
        resolve({ success: false, error: e.message })
      })
    })

    req.on('error', (e) => {
      fs.unlink(dest, () => {})
      resolve({ success: false, error: e.message })
    })

    req.setTimeout(15000, () => {
      req.destroy()
      fs.unlink(dest, () => {})
      resolve({ success: false, error: 'Timeout — le serveur ne répond pas.' })
    })
  })

  return doRequest(url, destPath)
})

// Trim audio via fluent-ffmpeg + @ffmpeg-installer/ffmpeg
ipcMain.handle('trim-sound-file', async (event, filePath, startSec, endSec) => {
  try {
    let ffmpegPath = null

    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpegPath = ffmpegInstaller.path
      console.log('ffmpeg via installer:', ffmpegPath)
    } catch (e) {
      console.warn('@ffmpeg-installer/ffmpeg non disponible:', e.message)
      try {
        ffmpegPath = require('ffmpeg-static')
        if (ffmpegPath && ffmpegPath.includes('app.asar')) {
          ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
        }
        console.log('ffmpeg via static:', ffmpegPath)
      } catch (e2) {
        console.warn('ffmpeg-static non disponible:', e2.message)
        ffmpegPath = 'ffmpeg' // fallback
      }
    }

    if (!ffmpegPath) ffmpegPath = 'ffmpeg'

    const ext = path.extname(filePath) || '.mp3'
    const outName = `trimmed_${Date.now()}${ext}`
    const outPath = path.join(soundsDir, outName)
    const duration = endSec - startSec

    console.log('trim:', filePath, startSec, '->', endSec, 'dur:', duration)

    await new Promise((resolve, reject) => {
      const { execFile } = require('child_process')
      execFile(ffmpegPath, [
        '-y',
        '-i', filePath,
        '-ss', String(startSec),
        '-t', String(duration),
        '-acodec', 'copy',
        outPath
      ], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('ffmpeg stderr:', stderr)
          reject(new Error(err.message + ' | ' + stderr))
        } else {
          console.log('trim OK:', outPath)
          resolve()
        }
      })
    })

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 100) {
      throw new Error('Fichier de sortie invalide ou vide')
    }

    return { success: true, path: outPath.replace(/\\/g, '/'), trimmed: true }

  } catch (e) {
    console.error('trim-sound-file error:', e.message)
    try {
      const ext = path.extname(filePath) || '.mp3'
      const outPath = path.join(soundsDir, `copy_${Date.now()}${ext}`)
      fs.copyFileSync(filePath, outPath)
      return {
        success: true,
        path: outPath.replace(/\\/g, '/'),
        trimmed: false,
        warning: 'ffmpeg non disponible — fichier complet importé. Installez @ffmpeg-installer/ffmpeg.'
      }
    } catch (e2) {
      return { success: false, error: e.message }
    }
  }
})

ipcMain.handle('delete-sound-file', async (event, filePath) => {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); return { success: true } }
  catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('get-sounds-dir', () => soundsDir)

ipcMain.handle('cleanup-orphan-shortcuts', () => {
  cleanupOrphanShortcuts()
  return true
})

ipcMain.handle('get-system-language', () => {
  return getSystemLanguage()
})

ipcMain.handle('get-system-keyboard-layout', () => {
  return getSystemKeyboardLayout()
})

// ─── Scraper myinstants ───────────────────────────────────────────────────────

const https = require('https')

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    }, (res) => {
      if ([301,302,303,307].includes(res.statusCode) && res.headers.location) {
        fetchPage(res.headers.location).then(resolve)
        return
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ ok: true, html: data, status: res.statusCode }))
    }).on('error', (e) => resolve({ ok: false, error: e.message }))
  })
}

function parseSoundList(html) {
  const sounds = []
  const seen = new Set()

  console.log('parseSoundList HTML extrait:', html.substring(0, 500))
  console.log('parseSoundList HTML longueur:', html.length)

  const patterns = [
    /href="https?:\/\/(?:www\.)?myinstants\.com\/(?:fr\/)?instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
    /href="\/fr\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
    /href="\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
  ]

  const slugToName = {}
  const allSlugs = []

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)]
    for (const m of matches) {
      const slug = m[1]
      const name = m[2]?.trim()
      if (slug && !seen.has(slug) && slug.length > 0 && slug.length < 80) {
        const ignore = ['favorites', 'recent', 'trending', 'search', 'categories',
                        'new', 'profile', 'settings', 'uploaded', 'best_of_all_time',
                        'report', 'add', 'embed']
        if (ignore.some(i => slug.includes(i))) continue
        seen.add(slug)
        allSlugs.push(slug)
        if (name && name.length > 0 && !name.startsWith('!') && !name.includes('svg')) {
          slugToName[slug] = name
        }
      }
    }
  }

  console.log(`parseSoundList: ${allSlugs.length} slugs uniques trouvés`)
  console.log('Premiers slugs:', allSlugs.slice(0, 5))

  const soundUrlRegex = /play\('(media\/sounds\/[^']+)'\)/g
  const directUrls = [...html.matchAll(soundUrlRegex)].map(m =>
    `https://www.myinstants.com/${m[1]}`
  )
  console.log(`parseSoundList: ${directUrls.length} URLs directes trouvées`)

  for (let i = 0; i < Math.min(allSlugs.length, 40); i++) {
    const slug = allSlugs[i]
    const rawName = slugToName[slug] || slug.replace(/-\d+$/, '').replace(/-/g, ' ')
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
    const url = directUrls[i] || null

    sounds.push({
      id: `mi_${slug}_${Date.now()}`,
      name,
      slug,
      url,
      emoji: getEmojiForName(name)
    })
  }

  return sounds
}

async function resolveInstantUrl(slug) {
  const url = `https://www.myinstants.com/fr/instant/${slug}/`
  const result = await fetchPage(url)
  if (!result.ok) return null

  const ogAudio = result.html.match(/meta-og:audio:\s*(https?:\/\/[^\s\n]+)/)
  if (ogAudio) return ogAudio[1].trim()

  const audioMatch = result.html.match(/href="(\/media\/sounds\/[^"]+\.mp3)"/)
  if (audioMatch) return `https://www.myinstants.com${audioMatch[1]}`

  return null
}

// Handler principal : liste + recherche + catégories
ipcMain.handle('fetch-myinstants', async (event, query, mode = 'search', lang = 'fr') => {
  try {
    let sounds = []

    const langData = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
    const country = langData.country || 'fr'

    if (mode === 'multi') {
      const terms = query.split(',').map(t => t.trim()).filter(Boolean)
      for (const term of terms.slice(0, 4)) {
        const r = await fetchPage(`https://www.myinstants.com/fr/search/?name=${encodeURIComponent(term)}`)
        if (r.ok) {
          const found = parseSoundList(r.html)
          sounds.push(...found)
        }
        await new Promise(r => setTimeout(r, 200))
      }
      const seen = new Set()
      sounds = sounds.filter(s => {
        if (seen.has(s.slug)) return false
        seen.add(s.slug)
        return true
      })
    } else if (mode === 'local') {
      // ✅ Si query est une URL complète (pour le mode local), l'utiliser directement
      let url = query
      if (!url.startsWith('http')) {
        url = TRENDING_URLS[country] || TRENDING_URLS['fr']
      }
      console.log('fetch-myinstants local:', url)
      const result = await fetchPage(url)
      if (!result.ok) return { success: false, error: result.error, sounds: [] }
      sounds = parseSoundList(result.html)
    } else {
      let url
      if (mode === 'trending') {
        // ✅ 'trending' utilise aussi les URLs index/{country}/
        url = TRENDING_URLS[country] || TRENDING_URLS['fr']
      } else if (mode === 'category') {
        url = `https://www.myinstants.com/fr/categories/${encodeURIComponent(query)}/`
      } else {
        const q = query && query.trim() ? query : 'meme'
        url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(q)}`
      }

      console.log('fetch-myinstants:', mode, url)
      const result = await fetchPage(url)
      if (!result.ok) return { success: false, error: result.error, sounds: [] }
      sounds = parseSoundList(result.html)
    }

    if (!sounds.length) {
      return { success: false, error: 'Aucun son trouvé', sounds: [] }
    }

    const needsResolve = sounds.filter(s => !s.url && s.slug)
    console.log(`Résolution de ${needsResolve.length} URLs via pages détail...`)

    if (needsResolve.length > 0) {
      const toResolve = needsResolve.slice(0, 20)
      for (let i = 0; i < toResolve.length; i += 3) {
        const batch = toResolve.slice(i, i + 3)
        await Promise.all(batch.map(async (sound) => {
          const resolvedUrl = await resolveInstantUrl(sound.slug)
          if (resolvedUrl) sound.url = resolvedUrl
        }))
        if (i + 3 < toResolve.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      const resolved = sounds.filter(s => s.url).length
      console.log(`URLs résolues : ${resolved}/${sounds.length}`)
    }

    sounds = sounds.filter(s => s.url)

    console.log(`fetch-myinstants: ${sounds.length} sons trouvés`)
    return { success: true, sounds }

  } catch (e) {
    console.error('fetch-myinstants error:', e.message)
    return { success: false, error: e.message, sounds: [] }
  }
})

function getEmojiForName(name) {
  const n = name.toLowerCase()
  if (n.includes('boom') || n.includes('explo')) return '💥'
  if (n.includes('sad') || n.includes('trombone')) return '🎺'
  if (n.includes('air') || n.includes('horn')) return '📣'
  if (n.includes('laugh') || n.includes('lol') || n.includes('bruh')) return '😂'
  if (n.includes('win') || n.includes('yes') || n.includes('epic')) return '🏆'
  if (n.includes('oof') || n.includes('rip') || n.includes('fail')) return '😬'
  if (n.includes('scream') || n.includes('aah') || n.includes('wtf')) return '😱'
  if (n.includes('bell') || n.includes('ding')) return '🔔'
  if (n.includes('drum') || n.includes('ba dum')) return '🥁'
  if (n.includes('cat') || n.includes('meow')) return '🐱'
  if (n.includes('noot') || n.includes('penguin')) return '🐧'
  return '🔊'
}

// ─── Écriture d'un fichier droppé ─────────────────────────────────────────────
ipcMain.handle('write-dropped-file', async (event, fileName, arrayBuffer) => {
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_')
    const destPath = path.join(soundsDir, `${Date.now()}_${safeName}`)
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(destPath, buffer)
    const name = path.basename(destPath, path.extname(destPath))
    console.log('write-dropped-file OK:', destPath, buffer.length, 'bytes')
    return { success: true, path: destPath.replace(/\\/g, '/'), name }
  } catch (e) {
    console.error('write-dropped-file error:', e.message)
    return { success: false, error: e.message }
  }
})

// ─── Export / Import ─────────────────────────────────────────────────────────

function buildConfig() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: store.get('profiles', []),
    sounds: store.get('sounds', []),
    shortcuts: store.get('shortcuts', {}),
    profileShortcut: store.get('profileShortcut', ''),
    loopShortcut: store.get('loopShortcut', ''),
    stopAllShortcut: store.get('stopAllShortcut', ''),
    presentationShortcut: store.get('presentationShortcut', ''),
    theme: store.get('theme', 'dark'),
    customTheme: store.get('customTheme', null),
    volume: store.get('volume', 80),
    playLocally: store.get('playLocally', true),
    audioDevice: store.get('audioDevice', 'default'),
  }
}

function applyConfig(config) {
  if (config.profiles) store.set('profiles', config.profiles)
  if (config.shortcuts) store.set('shortcuts', config.shortcuts)
  if (config.profileShortcut != null) store.set('profileShortcut', config.profileShortcut)
  if (config.loopShortcut != null) store.set('loopShortcut', config.loopShortcut)
  if (config.stopAllShortcut != null) store.set('stopAllShortcut', config.stopAllShortcut)
  if (config.presentationShortcut != null) store.set('presentationShortcut', config.presentationShortcut)
  if (config.theme) store.set('theme', config.theme)
  if (config.customTheme) store.set('customTheme', config.customTheme)
  if (config.volume != null) store.set('volume', config.volume)
  if (config.playLocally != null) store.set('playLocally', config.playLocally)
  if (config.audioDevice) store.set('audioDevice', config.audioDevice)
}

// ── Mode 1 : Config seule (JSON) ─────────────────────────────────────────────
ipcMain.handle('export-config', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter la configuration',
    defaultPath: `sounddeck-config-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled) return { success: false }
  try {
    const config = buildConfig()
    config.sounds = config.sounds.map(s => ({ ...s, included: false }))
    fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8')
    return { success: true, path: result.filePath }
  } catch (e) { return { success: false, error: e.message } }
})

// ── Mode 2 : Archive complète (ZIP config + sons) ────────────────────────────
ipcMain.handle('export-full', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter archive complète',
    defaultPath: `sounddeck-full-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'Archive ZIP', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const config = buildConfig()
    const sounds = store.get('sounds', [])

    const configForZip = {
      ...config,
      sounds: sounds.map(s => ({
        ...s,
        included: fs.existsSync(s.path || ''),
        zipPath: fs.existsSync(s.path || '') ? `sounds/${path.basename(s.path)}` : null
      }))
    }

    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      archive.append(JSON.stringify(configForZip, null, 2), { name: 'config.json' })

      let added = 0
      for (const sound of sounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: `sounds/${path.basename(sound.path)}` })
          added++
        }
      }

      const imagesDir = path.join(app.getPath('userData'), 'images')
      if (fs.existsSync(imagesDir)) {
        archive.directory(imagesDir, 'images')
      }

      archive.finalize()
      console.log(`Archive : ${added} sons inclus`)
    })

    const stats = fs.statSync(result.filePath)
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb }
  } catch (e) {
    console.error('export-full error:', e)
    return { success: false, error: e.message }
  }
})

// ── Mode 3 : Sons uniquement (ZIP) ───────────────────────────────────────────
ipcMain.handle('export-sounds-only', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter les sons',
    defaultPath: `sounddeck-sons-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'Archive ZIP', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const sounds = store.get('sounds', [])
    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      let added = 0
      for (const sound of sounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: path.basename(sound.path) })
          added++
        }
      }
      archive.finalize()
      console.log(`Sons exportés : ${added}`)
    })

    const stats = fs.statSync(result.filePath)
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb }
  } catch (e) { return { success: false, error: e.message } }
})

// ── Import universel (JSON ou ZIP) ───────────────────────────────────────────
ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer une sauvegarde',
    filters: [
      { name: 'Sauvegardes SoundDeck', extensions: ['json', 'zip'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Archive ZIP', extensions: ['zip'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled) return { success: false }

  const filePath = result.filePaths[0]
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.json') {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(raw)
      if (!config.version) return { success: false, error: 'Fichier JSON invalide' }

      applyConfig(config)

      if (config.sounds) {
        const sounds = config.sounds.map(s => ({
          ...s,
          missing: s.path && !fs.existsSync(s.path)
        }))
        store.set('sounds', sounds)
        const missing = sounds.filter(s => s.missing).length
        return { success: true, type: 'json', exportedAt: config.exportedAt, missing }
      }
      return { success: true, type: 'json', exportedAt: config.exportedAt, missing: 0 }
    } catch (e) { return { success: false, error: e.message } }
  }

  if (ext === '.zip') {
    try {
      const unzipper = require('unzipper')
      const tmpDir = path.join(app.getPath('temp'), `sounddeck_import_${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })

      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: tmpDir }))
          .on('close', resolve)
          .on('error', reject)
      })

      const configPath = path.join(tmpDir, 'config.json')
      let importedSounds = 0
      let importedConfig = false

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        applyConfig(config)
        importedConfig = true

        const soundsTmpDir = path.join(tmpDir, 'sounds')
        if (fs.existsSync(soundsTmpDir)) {
          const updatedSounds = (config.sounds || []).map(sound => {
            if (!sound.zipPath) return { ...sound, missing: !fs.existsSync(sound.path || '') }
            const srcFile = path.join(tmpDir, sound.zipPath)
            if (!fs.existsSync(srcFile)) return { ...sound, missing: true }
            const destFile = path.join(soundsDir, path.basename(srcFile))
            fs.copyFileSync(srcFile, destFile)
            importedSounds++
            return { ...sound, path: destFile.replace(/\\/g, '/'), missing: false }
          })
          store.set('sounds', updatedSounds)
        }

        const imagesTmpDir = path.join(tmpDir, 'images')
        const imagesDir = path.join(app.getPath('userData'), 'images')
        if (fs.existsSync(imagesTmpDir)) {
          if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
          fs.readdirSync(imagesTmpDir).forEach(f => {
            fs.copyFileSync(path.join(imagesTmpDir, f), path.join(imagesDir, f))
          })
        }

      } else {
        const files = fs.readdirSync(tmpDir).filter(f =>
          f.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)
        )
        const existingSounds = store.get('sounds', [])
        const newSounds = []

        for (const file of files) {
          const src = path.join(tmpDir, file)
          const dest = path.join(soundsDir, `imported_${Date.now()}_${file}`)
          fs.copyFileSync(src, dest)
          newSounds.push({
            id: require('crypto').randomUUID(),
            name: path.basename(file, path.extname(file)),
            path: dest.replace(/\\/g, '/'),
            emoji: '🔊',
            favorite: false,
            profiles: ['all'],
            volume: 100,
            createdAt: Date.now()
          })
          importedSounds++
        }
        store.set('sounds', [...existingSounds, ...newSounds])
      }

      fs.rmSync(tmpDir, { recursive: true, force: true })

      return {
        success: true,
        type: importedConfig ? 'full' : 'sounds-only',
        importedSounds,
        importedConfig
      }
    } catch (e) {
      console.error('import-backup ZIP error:', e)
      return { success: false, error: e.message }
    }
  }

  return { success: false, error: 'Format non supporté' }
})

// ─── Ouvrir un lien externe ────────────────────────────────────────────────────
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url)
})

// ─── YouTube import via yt-dlp ───────────────────────────────────────────────

const YTDLP_DIR = path.join(app.getPath('userData'), 'bin')
const YTDLP_PATH = path.join(YTDLP_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')

ipcMain.handle('check-ytdlp', async () => {
  if (fs.existsSync(YTDLP_PATH)) return { available: true, path: YTDLP_PATH, source: 'local' }

  const { execFile } = require('child_process')
  const systemCmd = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return new Promise((resolve) => {
    execFile(systemCmd, ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (!err) resolve({ available: true, path: systemCmd, source: 'system', version: stdout.trim() })
      else resolve({ available: false })
    })
  })
})

ipcMain.handle('download-ytdlp', async () => {
  try {
    if (!fs.existsSync(YTDLP_DIR)) fs.mkdirSync(YTDLP_DIR, { recursive: true })

    const https = require('https')
    const url = process.platform === 'win32'
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : process.platform === 'darwin'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'

    const doDownload = (url, dest) => new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
          file.close()
          doDownload(res.headers.location, dest).then(resolve).catch(reject)
          return
        }
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          if (process.platform !== 'win32') {
            fs.chmodSync(dest, '755')
          }
          resolve()
        })
      }).on('error', reject)
    })

    await doDownload(url, YTDLP_PATH)
    return { success: true, path: YTDLP_PATH }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('youtube-info', async (event, url) => {
  try {
    const ytdlpPath = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp'
    const { execFile } = require('child_process')

    return new Promise((resolve) => {
      execFile(ytdlpPath, [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message })
          return
        }
        try {
          const info = JSON.parse(stdout)
          resolve({
            success: true,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            uploader: info.uploader,
            url: info.webpage_url
          })
        } catch (e) {
          resolve({ success: false, error: 'Impossible de lire les infos' })
        }
      })
    })
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('youtube-download', async (event, url, startSec, endSec, title) => {
  try {
    const ytdlpPath = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp'
    const { execFile } = require('child_process')

    let ffmpegPath = null
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpegPath = ffmpegInstaller.path
      if (ffmpegPath && ffmpegPath.includes('app.asar')) {
        ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
      }
      ffmpegPath = path.dirname(ffmpegPath)
    } catch (e) {
      ffmpegPath = null
    }

    const safeName = (title || 'youtube').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const outPath = path.join(soundsDir, `yt_${Date.now()}_${safeName}.mp3`)

    const args = [
      '--no-playlist',
      '--no-warnings',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
    ]

    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath)
    }

    const fullDuration = endSec > 0
    const hasStart = startSec > 0
    const notFullVideo = hasStart || (endSec > 0 && endSec < 9999)

    if (notFullVideo) {
      const start = formatYtTime(startSec)
      const end = formatYtTime(endSec)
      args.push('--download-sections', `*${start}-${end}`)
      args.push('--force-keyframes-at-cuts')
    }

    args.push('-o', outPath, url)

    console.log('yt-dlp args:', args.join(' '))

    return new Promise((resolve) => {
      execFile(ytdlpPath, args, { timeout: 180000 }, (err, stdout, stderr) => {
        console.log('yt-dlp stdout:', stdout?.slice(0, 200))
        console.log('yt-dlp stderr:', stderr?.slice(0, 200))

        if (err) {
          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
            resolve({ success: true, path: outPath.replace(/\\/g, '/') })
          } else {
            resolve({ success: false, error: stderr || err.message })
          }
          return
        }
        if (fs.existsSync(outPath)) {
          resolve({ success: true, path: outPath.replace(/\\/g, '/') })
        } else {
          const files = fs.readdirSync(soundsDir)
            .filter(f => f.startsWith('yt_') && f.endsWith('.mp3'))
            .map(f => ({ f, t: fs.statSync(path.join(soundsDir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t)
          if (files.length > 0) {
            const found = path.join(soundsDir, files[0].f)
            resolve({ success: true, path: found.replace(/\\/g, '/') })
          } else {
            resolve({ success: false, error: 'Fichier de sortie introuvable' })
          }
        }
      })
    })
  } catch (e) {
    return { success: false, error: e.message }
  }
})

function formatYtTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
}

// ─── SPOTIFY / SOUNDCLOUD ───────────────────────────────────────────────────

ipcMain.handle('spotify-track-info', async (event, trackId) => {
  try {
    // Pour Spotify, on utilise une API tierce ou on simule
    // car yt-dlp ne peut pas récupérer les infos à cause du DRM
    
    // Option 1: Utiliser l'API Spotify (nécessite un token)
    // Option 2: Utiliser une API tierce comme SpotiPy
    // Option 3: Simuler et laisser l'utilisateur entrer les infos
    
    console.log('🎵 Récupération infos Spotify pour:', trackId)
    
    // Simuler une réponse avec un titre générique
    // Dans la vraie vie, on pourrait utiliser l'API Spotify
    return {
      success: true,
      title: `Morceau Spotify (${trackId.slice(0, 8)})`,
      artist: 'Artiste inconnu',
      duration: 180,
      cover: null,
      previewUrl: null
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('soundcloud-track-info', async (event, url) => {
  try {
    console.log('🎵 Récupération infos SoundCloud:', url)
    
    try {
      const result = await ytdlp(url, {
        noPlaylist: true,
        noWarnings: true,
        dumpJson: true
      })
      
      if (result) {
        return {
          success: true,
          title: result.title || 'Morceau SoundCloud',
          artist: result.uploader || result.artist || 'Artiste inconnu',
          duration: result.duration || 180,
          cover: result.thumbnail || null,
          streamUrl: result.url || null
        }
      }
    } catch (e) {
      console.warn('⚠️ Erreur yt-dlp pour les infos SoundCloud:', e.message)
    }
    
    return {
      success: true,
      title: 'Morceau SoundCloud',
      artist: 'Artiste inconnu',
      duration: 180,
      cover: null,
      streamUrl: null
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('download-platform-track', async (event, { platform, url, outputPath, title, artist }) => {
  try {
    const fs = require('fs')
    const path = require('path')
    
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // ✅ Utiliser un dossier temporaire
    const tempDir = path.join(app.getPath('temp'), 'sounddeck_downloads')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    // ✅ Nettoyer les fichiers temporaires anciens
    try {
      const oldFiles = fs.readdirSync(tempDir)
      const now = Date.now()
      for (const file of oldFiles) {
        const filePath = path.join(tempDir, file)
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > 3600000) { // plus d'1 heure
          fs.unlinkSync(filePath)
          console.log(`🧹 Ancien fichier temporaire supprimé: ${file}`)
        }
      }
    } catch (e) {}
    
    // ✅ NOM UNIQUE
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const tempOutputPath = path.join(tempDir, `temp_${uniqueId}.mp3`)
    
    let downloadUrl = url
    
    // Pour Spotify ou recherche YouTube
    if (platform === 'spotify' || platform === 'youtube_search') {
      // ✅ Utiliser une recherche YouTube avec des mots-clés plus précis
      const searchTerms = [title, artist, 'audio'].filter(Boolean).join(' ')
      const searchQuery = encodeURIComponent(searchTerms)
      downloadUrl = `ytsearch1:${searchQuery}`
      console.log(`🔍 Recherche YouTube: "${searchTerms}"`)
    }
    
    console.log(`📥 Téléchargement via yt-dlp-exec:`, downloadUrl)
    console.log(`📁 Fichier temporaire: ${tempOutputPath}`)
    
    // ✅ Trouver ffmpeg
    let ffmpegPath = null
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpegPath = ffmpegInstaller.path
      console.log('✅ ffmpeg trouvé:', ffmpegPath)
    } catch (e) {
      console.warn('⚠️ ffmpeg-installer non disponible:', e.message)
      try {
        const ffmpegStatic = require('ffmpeg-static')
        ffmpegPath = ffmpegStatic
        console.log('✅ ffmpeg-static trouvé:', ffmpegPath)
      } catch (e2) {
        console.warn('⚠️ ffmpeg-static non disponible:', e2.message)
      }
    }
    
    // ✅ Supprimer les fichiers temporaires existants
    try {
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath)
        console.log(`🗑️ Ancien fichier temporaire supprimé: ${tempOutputPath}`)
      }
    } catch (e) {}
    
    try {
      // ✅ Utiliser execFile directement avec plus de contrôle
      const { execFile } = require('child_process')
      
      // Trouver yt-dlp
      let ytdlpPath = 'yt-dlp'
      try {
        require('child_process').execSync('yt-dlp --version', { stdio: 'ignore' })
      } catch (e) {
        try {
          require('child_process').execSync('youtube-dl --version', { stdio: 'ignore' })
          ytdlpPath = 'youtube-dl'
        } catch (e2) {
          return { success: false, error: 'yt-dlp ou youtube-dl non trouvé' }
        }
      }
      
      const args = [
        '--no-playlist',
        '--no-warnings',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '5',
        '--add-metadata',
        '-o', tempOutputPath,
        downloadUrl
      ]
      
      if (ffmpegPath) {
        args.push('--ffmpeg-location', ffmpegPath)
        console.log('🔧 Utilisation de ffmpeg:', ffmpegPath)
      }
      
      // ✅ Ajouter un timeout plus long
      const timeout = 120000
      
      console.log(`🔧 Commande: ${ytdlpPath} ${args.join(' ')}`)
      
      await new Promise((resolve, reject) => {
        const child = execFile(ytdlpPath, args, { 
          timeout: timeout,
          maxBuffer: 1024 * 1024 * 10 // 10MB
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Erreur yt-dlp:', error.message)
            if (stderr) console.error('📤 stderr:', stderr)
            reject(error)
          } else {
            console.log('✅ yt-dlp terminé avec succès')
            if (stdout) console.log('📤 stdout:', stdout.slice(0, 500))
            resolve()
          }
        })
        
        child.on('error', (err) => {
          console.error('❌ Erreur process:', err)
          reject(err)
        })
      })
      
      // ✅ Vérifier le fichier après téléchargement
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (fs.existsSync(tempOutputPath)) {
        const stats = fs.statSync(tempOutputPath)
        if (stats.size > 1000) {
          // ✅ Renommer vers la destination finale
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath) } catch (e) {}
          }
          fs.renameSync(tempOutputPath, outputPath)
          console.log(`✅ Téléchargement réussi: ${outputPath} (${(stats.size/1024).toFixed(1)} KB)`)
          return { success: true, path: outputPath }
        } else {
          console.warn(`⚠️ Fichier trop petit: ${stats.size} bytes`)
        }
      } else {
        console.warn(`⚠️ Fichier temporaire non trouvé: ${tempOutputPath}`)
      }
      
      // ✅ Chercher dans le dossier temporaire
      const files = fs.readdirSync(tempDir)
      const mp3Files = files
        .filter(f => f.endsWith('.mp3') && f.startsWith('temp_'))
        .map(f => ({ f, t: fs.statSync(path.join(tempDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
      
      if (mp3Files.length > 0) {
        const found = path.join(tempDir, mp3Files[0].f)
        const stats = fs.statSync(found)
        if (stats.size > 1000) {
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath) } catch (e) {}
          }
          fs.renameSync(found, outputPath)
          console.log(`✅ Fichier trouvé dans temp: ${outputPath} (${(stats.size/1024).toFixed(1)} KB)`)
          return { success: true, path: outputPath }
        }
      }
      
      return { success: false, error: 'Fichier non trouvé ou trop petit' }
      
    } catch (e) {
      console.error('❌ Erreur téléchargement:', e.message)
      return { success: false, error: e.message }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── Raccourci pour montrer/cacher la fenêtre ─────────────────────────────────
let currentToggleWindowShortcut = 'CommandOrControl+Shift+S'

function registerToggleWindowShortcut(shortcut) {
  // Si shortcut n'est pas fourni, utiliser celui du store ou la valeur par défaut
  if (!shortcut) {
    shortcut = currentToggleWindowShortcut
  }
  
  // Désenregistrer l'ancien
  try {
    globalShortcut.unregister(currentToggleWindowShortcut)
  } catch (e) {}
  
  if (!shortcut) {
    console.log('ℹ️ Raccourci toggle fenêtre désactivé')
    return
  }
  
  try {
    const ok = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          showMainWindow()
        }
      } else {
        createWindow()
      }
    })
    
    if (ok) {
      currentToggleWindowShortcut = shortcut
      console.log(`✅ Raccourci pour toggle la fenêtre enregistré: ${shortcut}`)
    } else {
      console.warn(`⚠️ Impossible d'enregistrer le raccourci: ${shortcut}`)
    }
  } catch (e) {
    console.warn('Erreur enregistrement toggle fenêtre:', e.message)
  }
}

// ─── Partage de profil ───────────────────────────────────────────────────────

ipcMain.handle('export-profile', async (event, profileId) => {
  const profiles = store.get('profiles', [])
  const sounds = store.get('sounds', [])
  const shortcuts = store.get('shortcuts', {})

  const profile = profileId === 'all'
    ? { id: 'all', name: 'All Sounds', isDefault: true }
    : profiles.find(p => p.id === profileId)

  if (!profile) return { success: false, error: 'Profile not found' }

  const profileSounds = profileId === 'all'
    ? sounds
    : sounds.filter(s => s.profiles?.includes(profileId))

  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Export profile "${profile.name}"`,
    defaultPath: `sounddeck-profile-${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'SoundDeck Profile', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    const profileData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      sounds: profileSounds.map(s => ({
        ...s,
        zipPath: fs.existsSync(s.path || '') ? `sounds/${path.basename(s.path)}` : null,
        imageZipPath: s.image && fs.existsSync(s.image || '') ? `images/${path.basename(s.image)}` : null,
        shortcut: shortcuts[s.id] || null
      }))
    }

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      archive.append(JSON.stringify(profileData, null, 2), { name: 'profile.json' })

      let addedSounds = 0
      for (const sound of profileSounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: `sounds/${path.basename(sound.path)}` })
          addedSounds++
        }
        if (sound.image && fs.existsSync(sound.image)) {
          archive.file(sound.image, { name: `images/${path.basename(sound.image)}` })
        }
      }

      archive.finalize()
      console.log(`Export profil "${profile.name}": ${addedSounds} sons`)
    })

    const sizeMb = (fs.statSync(result.filePath).size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb, soundCount: profileSounds.length }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('import-profile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import a profile',
    filters: [{ name: 'SoundDeck Profile', extensions: ['zip'] }],
    properties: ['openFile']
  })
  if (result.canceled) return { success: false }

  try {
    const unzipper = require('unzipper')
    const tmpDir = path.join(app.getPath('temp'), `sounddeck_profile_${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    await new Promise((resolve, reject) => {
      fs.createReadStream(result.filePaths[0])
        .pipe(unzipper.Extract({ path: tmpDir }))
        .on('close', resolve)
        .on('error', reject)
    })

    const profileJsonPath = path.join(tmpDir, 'profile.json')
    if (!fs.existsSync(profileJsonPath)) {
      return { success: false, error: 'Invalid profile file' }
    }

    const profileData = JSON.parse(fs.readFileSync(profileJsonPath, 'utf-8'))
    const { profile, sounds: importedSounds } = profileData

    const { v4: uuidv4 } = require('uuid')
    const newProfileId = uuidv4()
    const newProfile = {
      ...profile,
      id: newProfileId,
      name: profile.name + (profile.id === 'all' ? ' (imported)' : ''),
      isDefault: false
    }

    const imagesDir = path.join(app.getPath('userData'), 'images')
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })

    const existingSounds = store.get('sounds', [])
    const newSounds = []
    const newShortcuts = { ...store.get('shortcuts', {}) }

    for (const sound of importedSounds) {
      const newSoundId = uuidv4()
      let newPath = sound.path
      let newImage = sound.image || null

      if (sound.zipPath) {
        const srcSound = path.join(tmpDir, sound.zipPath)
        if (fs.existsSync(srcSound)) {
          const destSound = path.join(soundsDir, `imported_${Date.now()}_${path.basename(srcSound)}`)
          fs.copyFileSync(srcSound, destSound)
          newPath = destSound.replace(/\\/g, '/')
        }
      }

      if (sound.imageZipPath) {
        const srcImg = path.join(tmpDir, sound.imageZipPath)
        if (fs.existsSync(srcImg)) {
          const destImg = path.join(imagesDir, `imported_${Date.now()}_${path.basename(srcImg)}`)
          fs.copyFileSync(srcImg, destImg)
          newImage = destImg.replace(/\\/g, '/')
        }
      }

      if (sound.shortcut) newShortcuts[newSoundId] = sound.shortcut

      newSounds.push({
        id: newSoundId,
        name: sound.name,
        path: newPath,
        image: newImage,
        emoji: sound.emoji || '🔊',
        favorite: sound.favorite || false,
        profiles: [newProfileId],
        volume: sound.volume || 100,
        playCount: 0,
        createdAt: Date.now()
      })
    }

    const existingProfiles = store.get('profiles', [])
    store.set('profiles', [...existingProfiles, newProfile])
    store.set('sounds', [...existingSounds, ...newSounds])
    store.set('shortcuts', newShortcuts)

    fs.rmSync(tmpDir, { recursive: true, force: true })

    return {
      success: true,
      profileName: newProfile.name,
      soundCount: newSounds.length
    }
  } catch (e) {
    console.error('import-profile error:', e)
    return { success: false, error: e.message }
  }
})

// ─── Vérifier existence fichier ──────────────────────────────────────────────
ipcMain.handle('file-exists', (event, filePath) => {
  try { return fs.existsSync(filePath) }
  catch (e) { return false }
})

// ─── Store ────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true })
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true })