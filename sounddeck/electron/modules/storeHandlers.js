// electron/modules/storeHandlers.js
const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const store = require('../store')

function registerStoreHandlers() {
  console.log('🔧 [storeHandlers] Enregistrement des handlers...')
  
  ipcMain.handle('store-get', (event, key) => {
    console.log(`📥 store-get: ${key}`)
    return store.get(key)
  })

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value)
    return true
  })

  ipcMain.handle('store-delete', (event, key) => {
    console.log(`🗑️ store-delete: ${key}`)
    store.delete(key)
    return true
  })

  ipcMain.handle('store-set-lang', (event, lang) => {
    console.log(`🌐 store-set-lang: ${lang}`)
    store.set('lang', lang)
    return true
  })

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
    store.set('launchAtStartup', value)
    return true
  })

  ipcMain.handle('get-global-shortcuts-state', () => {
    return store.get('globalShortcutsEnabled', true)
  })

  ipcMain.handle('get-installed-plugins', async () => {
    const { app } = require('electron')
    const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins')
    const plugins = []
    
    if (!fs.existsSync(PLUGINS_DIR)) return plugins
    
    const folders = fs.readdirSync(PLUGINS_DIR)
    
    for (const folder of folders) {
      const manifestPath = path.join(PLUGINS_DIR, folder, 'plugin.json')
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          plugins.push({
            ...manifest,
            path: path.join(PLUGINS_DIR, folder),
            enabled: true
          })
        } catch (e) {
          console.warn(`⚠️ Plugin invalide dans ${folder}:`, e.message)
        }
      }
    }
    
    return plugins
  })

  ipcMain.handle('get-plugin-path', async (event, pluginId) => {
    const { app } = require('electron')
    const pluginDir = path.join(app.getPath('userData'), 'plugins', pluginId)
    const indexPath = path.join(pluginDir, 'index.js')
    if (fs.existsSync(indexPath)) return indexPath
    return null
  })

  ipcMain.handle('get-plugin-component-path', async (event, pluginId, pageId) => {
    const { app } = require('electron')
    const pluginDir = path.join(app.getPath('userData'), 'plugins', pluginId)
    const componentPath = path.join(pluginDir, 'pages', `${pageId}.jsx`)
    if (fs.existsSync(componentPath)) return componentPath
    return null
  })

  ipcMain.handle('install-plugin-from-buffer', async (event, buffer, fileName) => {
    const { app } = require('electron')
    const AdmZip = require('adm-zip')
    const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins')
    
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }
    
    try {
      const zip = new AdmZip(Buffer.from(buffer))
      const manifestEntry = zip.getEntry('plugin.json')
      
      if (!manifestEntry) {
        return { success: false, error: 'plugin.json manquant dans l\'archive' }
      }
      
      const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'))
      
      if (!manifest.id) {
        return { success: false, error: 'id manquant dans plugin.json' }
      }
      
      const pluginId = manifest.id.replace(/[^a-zA-Z0-9_-]/g, '')
      const pluginDir = path.join(PLUGINS_DIR, pluginId)
      
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }
      
      zip.extractAllTo(pluginDir, true)
      
      return {
        success: true,
        id: pluginId,
        name: manifest.name || manifest.id,
        version: manifest.version || '1.0.0'
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('uninstall-plugin', async (event, pluginId) => {
    const { app } = require('electron')
    const pluginDir = path.join(app.getPath('userData'), 'plugins', pluginId)
    if (fs.existsSync(pluginDir)) {
      try {
        fs.rmSync(pluginDir, { recursive: true, force: true })
        return { success: true }
      } catch (e) {
        return { success: false, error: e.message }
      }
    }
    return { success: false, error: 'Plugin non trouvé' }
  })

  console.log('✅ Store handlers enregistrés')
}

module.exports = {
  registerStoreHandlers,
  store,  // ✅ On ré-exporte pour compatibilité avec main.js
}