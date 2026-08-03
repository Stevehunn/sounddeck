// electron/modules/diagnostic.js - Version complète et finalisée
const { ipcMain, app, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Store = require('electron-store')

const store = new Store()

// ─── LISTE DES HANDLERS ATTENDUS (pour référence) ──────────────────────────

const EXPECTED_HANDLERS = {
  // Store
  'store-get': { file: 'storeHandlers.js', required: true },
  'store-set': { file: 'storeHandlers.js', required: true },
  'store-delete': { file: 'storeHandlers.js', required: true },
  'store-set-lang': { file: 'storeHandlers.js', required: true },
  
  // Démarrage
  'get-start-minimized': { file: 'storeHandlers.js', required: true },
  'set-start-minimized': { file: 'storeHandlers.js', required: true },
  'get-launch-at-startup': { file: 'storeHandlers.js', required: true },
  'set-launch-at-startup': { file: 'storeHandlers.js', required: true },
  'get-global-shortcuts-state': { file: 'storeHandlers.js', required: true },
  
  // Plugins
  'get-installed-plugins': { file: 'storeHandlers.js', required: true },
  'get-plugin-path': { file: 'storeHandlers.js', required: false },
  'get-plugin-component-path': { file: 'storeHandlers.js', required: false },
  'install-plugin': { file: 'storeHandlers.js', required: false },
  'install-plugin-from-buffer': { file: 'storeHandlers.js', required: false },
  'uninstall-plugin': { file: 'storeHandlers.js', required: false },
  
  // MyInstants
  'fetch-myinstants': { file: 'ipcHandlers.js', required: true },
  
  // Système
  'open-external': { file: 'ipcHandlers.js', required: true },
  'quit-app': { file: 'ipcHandlers.js', required: true },
  'hide-window': { file: 'ipcHandlers.js', required: true },
  'show-window': { file: 'ipcHandlers.js', required: true },
  'confirm-quit': { file: 'ipcHandlers.js', required: true },
  'update-tray-language': { file: 'ipcHandlers.js', required: true },
  'get-system-language': { file: 'ipcHandlers.js', required: true },
  'get-system-keyboard-layout': { file: 'ipcHandlers.js', required: true },
  
  // Fichiers
  'open-file-dialog': { file: 'fileHandlers.js', required: true },
  'open-image-dialog': { file: 'fileHandlers.js', required: true },
  'open-directory-dialog': { file: 'fileHandlers.js', required: true },
  'import-sound-file': { file: 'fileHandlers.js', required: true },
  'import-image-file': { file: 'fileHandlers.js', required: true },
  'delete-sound-file': { file: 'fileHandlers.js', required: true },
  'file-exists': { file: 'fileHandlers.js', required: true },
  'read-file': { file: 'fileHandlers.js', required: true },
  'write-sound-file': { file: 'fileHandlers.js', required: true },
  'get-sounds-dir': { file: 'fileHandlers.js', required: true },
  'write-dropped-file': { file: 'fileHandlers.js', required: true },
  'save-file-dialog': { file: 'fileHandlers.js', required: true },
  'download-sound-url': { file: 'fileHandlers.js', required: true },
  
  // Export / Import
  'export-config': { file: 'fileHandlers.js', required: false },
  'export-full': { file: 'fileHandlers.js', required: false },
  'export-sounds-only': { file: 'fileHandlers.js', required: false },
  'import-backup': { file: 'fileHandlers.js', required: false },
  'export-profile': { file: 'fileHandlers.js', required: false },
  'import-profile': { file: 'fileHandlers.js', required: false },
  
  // Pilote virtuel
  'install-virtual-driver': { file: 'fileHandlers.js', required: false },
  'uninstall-virtual-driver': { file: 'fileHandlers.js', required: false },
  'get-virtual-driver-status': { file: 'fileHandlers.js', required: false },
  
  // YouTube
  'check-ytdlp': { file: 'fileHandlers.js', required: false },
  'download-ytdlp': { file: 'fileHandlers.js', required: false },
  'youtube-info': { file: 'fileHandlers.js', required: false },
  'youtube-download': { file: 'fileHandlers.js', required: false },
  
  // Spotify / SoundCloud
  'spotify-track-info': { file: 'fileHandlers.js', required: false },
  'soundcloud-track-info': { file: 'fileHandlers.js', required: false },
  'download-platform-track': { file: 'fileHandlers.js', required: false },
  
  // Éditeur
  'trim-sound-file': { file: 'fileHandlers.js', required: false },
  'export-audio-file': { file: 'fileHandlers.js', required: false },
  'convert-audio': { file: 'fileHandlers.js', required: false },
}

// ─── FONCTIONS PRINCIPALES ──────────────────────────────────────────────────

/**
 * Liste tous les handlers IPC enregistrés (version réelle)
 */
function listAllHandlers() {
  console.log('\n' + '═'.repeat(60))
  console.log('📋 TOUS LES HANDLERS IPC ENREGISTRÉS')
  console.log('═'.repeat(60))
  
  const allHandlers = ipcMain.eventNames()
  
  if (allHandlers.length === 0) {
    console.log('  Aucun handler enregistré')
  } else {
    for (const handler of allHandlers) {
      const listeners = ipcMain.listeners(handler)
      console.log(`  ✅ ${handler} (${listeners.length} écouteur(s))`)
    }
  }
  
  console.log('═'.repeat(60) + '\n')
  
  return allHandlers
}

/**
 * Vérifie les handlers attendus par rapport à la réalité
 */
function checkExpectedHandlers() {
  console.log('\n' + '═'.repeat(60))
  console.log('📋 VÉRIFICATION DES HANDLERS ATTENDUS')
  console.log('═'.repeat(60))
  
  const registered = []
  const missing = []
  const optionalMissing = []
  
  const allHandlers = new Set(ipcMain.eventNames())
  
  for (const [handler, config] of Object.entries(EXPECTED_HANDLERS)) {
    const exists = allHandlers.has(handler)
    
    if (exists) {
      registered.push(handler)
      console.log(`  ✅ ${handler} (${config.file})`)
    } else if (config.required) {
      missing.push(handler)
      console.log(`  ❌ ${handler} (${config.file}) - MANQUANT !`)
    } else {
      optionalMissing.push(handler)
      console.log(`  ⚠️ ${handler} (${config.file}) - optionnel`)
    }
  }
  
  console.log('═'.repeat(60))
  console.log(`📊 Résumé: ${registered.length} enregistrés, ${missing.length} manquants (critiques), ${optionalMissing.length} optionnels`)
  
  if (missing.length > 0) {
    console.log('\n🔴 HANDLERS CRITIQUES MANQUANTS:')
    for (const h of missing) {
      console.log(`  - ${h}`)
    }
  }
  
  console.log('═'.repeat(60) + '\n')
  
  return { registered, missing, optionalMissing }
}

// ─── DIAGNOSTIC DES PLUGINS ──────────────────────────────────────────────────

function diagnosePlugins() {
  console.log('\n' + '═'.repeat(60))
  console.log('🔌 DIAGNOSTIC DES PLUGINS')
  console.log('═'.repeat(60))
  
  const userData = app.getPath('userData')
  const pluginsDir = path.join(userData, 'plugins')
  
  console.log(`📁 Dossier plugins: ${pluginsDir}`)
  
  if (!fs.existsSync(pluginsDir)) {
    console.log('  ⚠️ Dossier plugins inexistant')
    console.log('═'.repeat(60) + '\n')
    return { exists: false, plugins: [] }
  }
  
  const folders = fs.readdirSync(pluginsDir)
  console.log(`📁 ${folders.length} dossier(s) trouvé(s)`)
  
  const plugins = []
  
  for (const folder of folders) {
    const manifestPath = path.join(pluginsDir, folder, 'plugin.json')
    const indexPath = path.join(pluginsDir, folder, 'index.js')
    
    console.log(`\n  📦 ${folder}:`)
    console.log(`    📄 manifest: ${fs.existsSync(manifestPath) ? '✅' : '❌'}`)
    console.log(`    📄 index: ${fs.existsSync(indexPath) ? '✅' : '❌'}`)
    
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        console.log(`    📝 name: ${manifest.name || 'N/A'}`)
        console.log(`    📝 version: ${manifest.version || 'N/A'}`)
        console.log(`    📝 pages: ${manifest.pages?.length || 0}`)
        plugins.push({ folder, manifest, manifestPath, indexPath })
      } catch (e) {
        console.log(`    ❌ Erreur lecture manifest: ${e.message}`)
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60) + '\n')
  
  return { exists: true, plugins }
}

// ─── DIAGNOSTIC DU STORE ──────────────────────────────────────────────────────

function diagnoseStore() {
  console.log('\n' + '═'.repeat(60))
  console.log('💾 DIAGNOSTIC DU STORE')
  console.log('═'.repeat(60))
  
  const keys = [
    'profiles', 'sounds', 'shortcuts', 'soundOrder', 'tags',
    'theme', 'customTheme', 'lang', 'audioDevice', 'volume',
    'playLocally', 'mixerEnabled', 'virtualDriverInstalled',
    'currentProfileId', 'editorProject', 'sidebarConfig'
  ]
  
  let totalSize = 0
  
  for (const key of keys) {
    try {
      const value = store.get(key)
      const size = value ? JSON.stringify(value).length : 0
      totalSize += size
      const exists = value !== undefined && value !== null
      console.log(`  ${exists ? '✅' : '⬜'} ${key}: ${exists ? `${(size / 1024).toFixed(1)} KB` : 'vide'}`)
    } catch (e) {
      console.log(`  ❌ ${key}: erreur - ${e.message}`)
    }
  }
  
  console.log(`\n  📊 Taille totale: ${(totalSize / 1024).toFixed(1)} KB`)
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC DU SYSTÈME ────────────────────────────────────────────────────

function diagnoseSystem() {
  console.log('\n' + '═'.repeat(60))
  console.log('🖥️ DIAGNOSTIC DU SYSTÈME')
  console.log('═'.repeat(60))
  
  console.log(`  💻 Platform: ${process.platform}`)
  console.log(`  🏗️ Arch: ${process.arch}`)
  console.log(`  📦 Node: ${process.version}`)
  console.log(`  📦 Electron: ${require('electron').version}`)
  console.log(`  🖥️ OS: ${os.type()} ${os.release()}`)
  console.log(`  🧠 CPU: ${os.cpus()[0]?.model || 'N/A'}`)
  console.log(`  💾 RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`)
  console.log(`  📁 UserData: ${app.getPath('userData')}`)
  console.log(`  📁 Temp: ${app.getPath('temp')}`)
  console.log(`  📁 Exe: ${app.getPath('exe')}`)
  console.log(`  📦 Packaged: ${app.isPackaged}`)
  
  try {
    const locale = app.getLocale()
    console.log(`  🌐 Locale: ${locale}`)
  } catch (e) {
    console.log(`  🌐 Locale: erreur - ${e.message}`)
  }
  
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC AUDIO ──────────────────────────────────────────────────────

function diagnoseAudio() {
  console.log('\n' + '═'.repeat(60))
  console.log('🔊 DIAGNOSTIC AUDIO')
  console.log('═'.repeat(60))
  
  try {
    const mixerEnabled = store.get('mixerEnabled', false)
    console.log(`  🎛️ Mixeur activé dans le store: ${mixerEnabled ? '✅' : '❌'}`)
    
    const audioDevice = store.get('audioDevice', 'default')
    console.log(`  🔊 Périphérique audio: ${audioDevice}`)
    
    const playLocally = store.get('playLocally', true)
    console.log(`  🔊 Play local: ${playLocally ? '✅' : '❌'}`)
    
    const volume = store.get('volume', 80)
    console.log(`  🔊 Volume global: ${volume}%`)
    
    const micDevice = store.get('microphoneDevice', 'default')
    console.log(`  🎤 Micro: ${micDevice}`)
    
    const micVolume = store.get('microphoneVolume', 80)
    console.log(`  🎤 Volume micro: ${micVolume}%`)
    
    // Vérifier les périphériques audio disponibles
    console.log(`  📱 Périphériques audio:`)
    try {
      const { getAudioInputDevices } = require('./ipcHandlers')
      // Note: Cette fonction doit être exposée via IPC ou appelée directement
      console.log(`    ⚠️ Vérification des périphériques audio disponible via l'UI`)
    } catch (e) {
      console.log(`    ❌ Impossible de lister les périphériques audio`)
    }
    
  } catch (e) {
    console.log(`  ❌ Erreur diagnostic audio: ${e.message}`)
  }
  
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC DES SONS ─────────────────────────────────────────────────

function diagnoseSounds() {
  console.log('\n' + '═'.repeat(60))
  console.log('🎵 DIAGNOSTIC DES SONS')
  console.log('═'.repeat(60))
  
  const sounds = store.get('sounds', [])
  const shortcuts = store.get('shortcuts', {})
  const soundOrder = store.get('soundOrder', {})
  
  console.log(`  📁 Sons dans la bibliothèque: ${sounds.length}`)
  console.log(`  🎯 Raccourcis définis: ${Object.keys(shortcuts).length}`)
  console.log(`  📋 Ordre des sons: ${Object.keys(soundOrder).length} profils`)
  
  // Vérifier les fichiers manquants
  const missing = []
  const soundDir = path.join(app.getPath('userData'), 'sounds')
  
  for (const sound of sounds) {
    if (sound.path) {
      const fullPath = sound.path.startsWith('file://') 
        ? sound.path.replace('file:///', '') 
        : sound.path
      if (!fs.existsSync(fullPath) && !fs.existsSync(path.join(soundDir, path.basename(fullPath)))) {
        missing.push(sound)
      }
    }
  }
  
  if (missing.length > 0) {
    console.log(`  ⚠️ Fichiers manquants: ${missing.length}`)
    for (const sound of missing.slice(0, 5)) {
      console.log(`    - ${sound.name}: ${sound.path}`)
    }
    if (missing.length > 5) {
      console.log(`    - ... et ${missing.length - 5} autres`)
    }
  } else {
    console.log(`  ✅ Tous les fichiers sont présents`)
  }
  
  // Statistiques
  let totalSize = 0
  let soundsWithImage = 0
  
  for (const sound of sounds) {
    if (sound.image) soundsWithImage++
    if (sound.path) {
      try {
        const fullPath = sound.path.startsWith('file://') 
          ? sound.path.replace('file:///', '') 
          : sound.path
        if (fs.existsSync(fullPath)) {
          totalSize += fs.statSync(fullPath).size
        }
      } catch (e) {
        // Ignorer
      }
    }
  }
  
  console.log(`  📊 Taille totale: ${(totalSize / 1024 / 1024).toFixed(1)} MB`)
  console.log(`  🖼️ Sons avec image: ${soundsWithImage}/${sounds.length}`)
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC DES RACCOURCIS ───────────────────────────────────────────

function diagnoseShortcuts() {
  console.log('\n' + '═'.repeat(60))
  console.log('⌨️ DIAGNOSTIC DES RACCOURCIS')
  console.log('═'.repeat(60))
  
  const shortcuts = store.get('shortcuts', {})
  const soundIds = new Set(store.get('sounds', []).map(s => s.id))
  const allShortcuts = store.get('shortcuts', {})
  
  // Raccourcis orphelins
  const orphan = []
  for (const [id, acc] of Object.entries(shortcuts)) {
    if (acc && !soundIds.has(id)) {
      orphan.push({ id, acc })
    }
  }
  
  if (orphan.length > 0) {
    console.log(`  ⚠️ Raccourcis orphelins: ${orphan.length}`)
    for (const o of orphan.slice(0, 5)) {
      console.log(`    - ${o.id}: ${o.acc}`)
    }
    if (orphan.length > 5) {
      console.log(`    - ... et ${orphan.length - 5} autres`)
    }
    console.log(`  💡 Exécuter cleanupOrphanShortcuts() pour les supprimer`)
  } else {
    console.log(`  ✅ Aucun raccourci orphelin`)
  }
  
  const activeShortcuts = Object.values(shortcuts).filter(Boolean).length
  console.log(`  🎯 Raccourcis actifs: ${activeShortcuts}`)
  console.log(`  📋 Raccourci profil: ${store.get('profileShortcut') || 'Aucun'}`)
  console.log(`  📋 Raccourci loop: ${store.get('loopShortcut') || 'Aucun'}`)
  console.log(`  📋 Raccourci stop: ${store.get('stopAllShortcut') || 'Aucun'}`)
  console.log(`  📋 Raccourci presentation: ${store.get('presentationShortcut') || 'Aucun'}`)
  console.log(`  📋 Raccourci toggle: ${store.get('toggleShortcutsAccelerator') || 'Aucun'}`)
  
  const shortcutsEnabled = store.get('shortcutsEnabled', true)
  console.log(`  🔘 Raccourcis activés: ${shortcutsEnabled ? '✅' : '❌'}`)
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC PERFORMANCE ─────────────────────────────────────────────

function diagnosePerformance() {
  console.log('\n' + '═'.repeat(60))
  console.log('⚡ DIAGNOSTIC PERFORMANCE')
  console.log('═'.repeat(60))
  
  const memUsage = process.memoryUsage()
  console.log(`  💾 Mémoire:`)
  console.log(`    - RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`)
  console.log(`    - Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`)
  console.log(`    - Externe: ${(memUsage.external / 1024 / 1024).toFixed(1)} MB`)
  
  // Nombre de sons
  const sounds = store.get('sounds', [])
  console.log(`  🎵 Sons en mémoire: ${sounds.length}`)
  
  // Profils
  const profiles = store.get('profiles', [])
  console.log(`  👤 Profils: ${profiles.length + 1} (incluant "Tous les sons")`)
  
  // Cache
  console.log(`  📁 Cache:`)
  try {
    // Le cache n'est pas accessible directement depuis le processus principal
    console.log(`    ⚠️ Cache accessible uniquement depuis le renderer`)
  } catch (e) {
    console.log(`    ❌ Impossible d'accéder au cache`)
  }
  
  console.log('═'.repeat(60) + '\n')
}

// ─── DIAGNOSTIC DE LA SIDEBAR ──────────────────────────────────────────────

function diagnoseSidebar() {
  console.log('\n' + '═'.repeat(60))
  console.log('📑 DIAGNOSTIC DE LA SIDEBAR')
  console.log('═'.repeat(60))
  
  const sidebarConfig = store.get('sidebarConfig')
  
  if (!sidebarConfig) {
    console.log('  ⚠️ Aucune configuration sidebar trouvée (utilisation des defaults)')
    console.log('═'.repeat(60) + '\n')
    return { exists: false }
  }
  
  console.log(`  📋 Mode: ${sidebarConfig.mode || 'default'}`)
  console.log(`  📋 Items: ${sidebarConfig.items?.length || 0}`)
  console.log(`  📋 Sections: ${sidebarConfig.sectionOrder?.join(', ') || 'N/A'}`)
  
  // Vérifier les items
  if (sidebarConfig.items) {
    const visible = sidebarConfig.items.filter(i => i.visible !== false).length
    const pinned = sidebarConfig.items.filter(i => i.pinned).length
    console.log(`  📌 Visibles: ${visible}/${sidebarConfig.items.length}`)
    console.log(`  📌 Épinglés: ${pinned}`)
    
    // Vérifier les profils dans la sidebar
    const profileItems = sidebarConfig.items.filter(i => i.isProfile)
    console.log(`  👤 Profils dans la sidebar: ${profileItems.length}`)
  }
  
  console.log('═'.repeat(60) + '\n')
  return { exists: true }
}

// ─── DIAGNOSTIC DE L'ÉDITEUR ──────────────────────────────────────────────

function diagnoseEditor() {
  console.log('\n' + '═'.repeat(60))
  console.log('✏️ DIAGNOSTIC DE L\'ÉDITEUR')
  console.log('═'.repeat(60))
  
  const editorProject = store.get('editorProject')
  
  if (!editorProject || !editorProject.tracks || editorProject.tracks.length === 0) {
    console.log('  📋 Aucun projet actif')
    console.log('═'.repeat(60) + '\n')
    return { exists: false }
  }
  
  console.log(`  📋 Projet: ${editorProject.name || 'Sans nom'}`)
  console.log(`  📋 ID: ${editorProject.id || 'N/A'}`)
  console.log(`  📋 Pistes: ${editorProject.tracks.length}`)
  
  let totalClips = 0
  for (const track of editorProject.tracks) {
    console.log(`    - ${track.name || 'Sans nom'}: ${track.clips?.length || 0} clips`)
    totalClips += track.clips?.length || 0
  }
  
  console.log(`  📋 Total clips: ${totalClips}`)
  console.log(`  📋 Durée: ${editorProject.duration || 60}s`)
  console.log(`  📋 Marqueurs: ${editorProject.markers?.length || 0}`)
  console.log(`  📋 Dernière modification: ${new Date(editorProject.updatedAt).toLocaleString()}`)
  console.log('═'.repeat(60) + '\n')
  
  return { exists: true }
}

// ─── EXPORT DU DIAGNOSTIC VERS UN FICHIER ────────────────────────────────

function exportDiagnosticToFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `sounddeck-diagnostic-${timestamp}.json`
  const filepath = path.join(app.getPath('desktop'), filename)
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: require('electron').version,
      osType: os.type(),
      osRelease: os.release(),
      cpu: os.cpus()[0]?.model || 'N/A',
      totalMemory: os.totalmem(),
      userData: app.getPath('userData'),
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
    },
    store: (() => {
      const keys = [
        'profiles', 'sounds', 'shortcuts', 'soundOrder', 'tags',
        'theme', 'customTheme', 'lang', 'audioDevice', 'volume',
        'playLocally', 'mixerEnabled', 'virtualDriverInstalled',
        'currentProfileId', 'editorProject', 'sidebarConfig',
        'microphoneDevice', 'microphoneVolume', 'mixerSoundVolume',
        'noiseSuppression', 'noiseSuppressionMode', 'lowLatencyMode',
        'compressOnImport', 'compressionBitrate', 'cardSize',
        'autoBackupEnabled', 'backupInterval', 'lazyLoadingEnabled'
      ]
      const result = {}
      for (const key of keys) {
        try { 
          const value = store.get(key)
          if (value !== undefined && value !== null) {
            result[key] = typeof value === 'object' ? '[Object]' : value
          }
        } catch (e) { 
          result[key] = { error: e.message } 
        }
      }
      return result
    })(),
    handlers: {
      registered: ipcMain.eventNames(),
      count: ipcMain.eventNames().length,
    },
    plugins: (() => {
      const userData = app.getPath('userData')
      const pluginsDir = path.join(userData, 'plugins')
      if (!fs.existsSync(pluginsDir)) return { exists: false, count: 0 }
      
      const folders = fs.readdirSync(pluginsDir)
      const plugins = []
      for (const folder of folders) {
        const manifestPath = path.join(pluginsDir, folder, 'plugin.json')
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
            plugins.push({ id: manifest.id, name: manifest.name, version: manifest.version })
          } catch (e) {}
        }
      }
      return { exists: true, count: plugins.length, plugins }
    })(),
    stats: (() => {
      const sounds = store.get('sounds', [])
      const profiles = store.get('profiles', [])
      const shortcuts = store.get('shortcuts', {})
      return {
        sounds: sounds.length,
        profiles: profiles.length,
        shortcuts: Object.keys(shortcuts).length,
        activeShortcuts: Object.values(shortcuts).filter(Boolean).length,
        editorProject: !!store.get('editorProject'),
        mixerEnabled: store.get('mixerEnabled', false),
      }
    })(),
  }
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(diagnostic, null, 2))
    console.log(`📄 Diagnostic exporté vers: ${filepath}`)
    return { success: true, path: filepath }
  } catch (e) {
    console.error(`❌ Erreur export: ${e.message}`)
    return { success: false, error: e.message }
  }
}

// ─── DIAGNOSTIC COMPLET ──────────────────────────────────────────────────

function runFullDiagnostic() {
  console.clear()
  console.log('═'.repeat(60))
  console.log('  🔍 SOUNDDECK - DIAGNOSTIC COMPLET')
  console.log('═'.repeat(60))
  console.log(`  📅 ${new Date().toLocaleString()}`)
  console.log('═'.repeat(60))
  
  diagnoseSystem()
  diagnoseStore()
  listAllHandlers()
  checkExpectedHandlers()
  diagnosePlugins()
  diagnoseAudio()
  diagnoseSounds()
  diagnoseShortcuts()
  diagnosePerformance()
  diagnoseSidebar()
  diagnoseEditor()
  
  console.log('═'.repeat(60))
  console.log('  ✅ Diagnostic terminé')
  console.log('═'.repeat(60) + '\n')
  
  console.log('💡 Pour exporter le diagnostic: exportDiagnosticToFile()')
}

// ─── HANDLERS IPC POUR LE DIAGNOSTIC ─────────────────────────────────────

function registerDiagnosticHandlers() {
  console.log('🔧 Enregistrement des handlers de diagnostic...')
  
  // Obtenir tous les handlers
  ipcMain.handle('diagnostic-get-handlers', () => {
    return {
      all: ipcMain.eventNames(),
      count: ipcMain.eventNames().length,
      expected: checkExpectedHandlers()
    }
  })
  
  // Obtenir les infos système
  ipcMain.handle('diagnostic-get-system', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: require('electron').version,
      osType: os.type(),
      osRelease: os.release(),
      cpu: os.cpus()[0]?.model || 'N/A',
      totalMemory: os.totalmem(),
      userData: app.getPath('userData'),
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
    }
  })
  
  // Obtenir les données du store
  ipcMain.handle('diagnostic-get-store', () => {
    const keys = [
      'profiles', 'sounds', 'shortcuts', 'soundOrder', 'tags',
      'theme', 'customTheme', 'lang', 'audioDevice', 'volume',
      'playLocally', 'mixerEnabled', 'virtualDriverInstalled',
      'currentProfileId', 'editorProject', 'sidebarConfig'
    ]
    
    const result = {}
    for (const key of keys) {
      try {
        const value = store.get(key)
        result[key] = {
          exists: value !== undefined && value !== null,
          size: value ? JSON.stringify(value).length : 0,
          type: value ? typeof value : 'undefined'
        }
      } catch (e) {
        result[key] = { exists: false, error: e.message }
      }
    }
    return result
  })
  
  // Obtenir les plugins
  ipcMain.handle('diagnostic-get-plugins', () => {
    return diagnosePlugins()
  })
  
  // Exécuter un diagnostic complet
  ipcMain.handle('diagnostic-run-full', () => {
    runFullDiagnostic()
    return { success: true, timestamp: new Date().toISOString() }
  })
  
  // Exporter le diagnostic
  ipcMain.handle('diagnostic-export', () => {
    return exportDiagnosticToFile()
  })
  
  // Diagnostic audio
  ipcMain.handle('diagnostic-audio', () => {
    return diagnoseAudio()
  })
  
  // Diagnostic des sons
  ipcMain.handle('diagnostic-sounds', () => {
    return diagnoseSounds()
  })
  
  // Diagnostic des raccourcis
  ipcMain.handle('diagnostic-shortcuts', () => {
    return diagnoseShortcuts()
  })
  
  // Diagnostic performance
  ipcMain.handle('diagnostic-performance', () => {
    return diagnosePerformance()
  })
  
  // Diagnostic de la sidebar
  ipcMain.handle('diagnostic-sidebar', () => {
    return diagnoseSidebar()
  })
  
  // Diagnostic de l'éditeur
  ipcMain.handle('diagnostic-editor', () => {
    return diagnoseEditor()
  })
  
  console.log('✅ Handlers de diagnostic enregistrés')
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

module.exports = {
  listAllHandlers,
  checkExpectedHandlers,
  diagnosePlugins,
  diagnoseStore,
  diagnoseSystem,
  diagnoseAudio,
  diagnoseSounds,
  diagnoseShortcuts,
  diagnosePerformance,
  diagnoseSidebar,
  diagnoseEditor,
  runFullDiagnostic,
  exportDiagnosticToFile,
  registerDiagnosticHandlers,
  EXPECTED_HANDLERS,
}