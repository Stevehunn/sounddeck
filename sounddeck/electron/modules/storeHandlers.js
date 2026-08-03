// electron/modules/storeHandlers.js
const { ipcMain } = require('electron')
const Store = require('electron-store')
const path = require('path')
const fs = require('fs')

const store = new Store()

function registerStoreHandlers() {
  console.log('🔧 [storeHandlers] Enregistrement des handlers...')
  
  // Store get
  ipcMain.handle('store-get', (event, key) => {
    console.log(`📥 store-get: ${key}`)
    return store.get(key)
  })

  // Store set
  ipcMain.handle('store-set', (event, key, value) => {
    console.log(`📤 store-set: ${key}`)
    store.set(key, value)
    return true
  })

  // Store delete
  ipcMain.handle('store-delete', (event, key) => {
    console.log(`🗑️ store-delete: ${key}`)
    store.delete(key)
    return true
  })

  // Store set lang
  ipcMain.handle('store-set-lang', (event, lang) => {
    console.log(`🌐 store-set-lang: ${lang}`)
    store.set('lang', lang)
    return true
  })

  // Get start minimized
  ipcMain.handle('get-start-minimized', () => {
    const value = store.get('startMinimized', false)
    console.log(`📥 get-start-minimized: ${value}`)
    return value
  })

  // Set start minimized
  ipcMain.handle('set-start-minimized', (event, value) => {
    console.log(`📤 set-start-minimized: ${value}`)
    store.set('startMinimized', value)
    return true
  })

  // Get launch at startup
  ipcMain.handle('get-launch-at-startup', () => {
    const value = store.get('launchAtStartup', false)
    console.log(`📥 get-launch-at-startup: ${value}`)
    return value
  })

  // Set launch at startup
  ipcMain.handle('set-launch-at-startup', (event, value) => {
    console.log(`📤 set-launch-at-startup: ${value}`)
    store.set('launchAtStartup', value)
    return true
  })

  // Get global shortcuts state
  ipcMain.handle('get-global-shortcuts-state', () => {
    const value = store.get('globalShortcutsEnabled', true)
    console.log(`📥 get-global-shortcuts-state: ${value}`)
    return value
  })

  // Get installed plugins
  ipcMain.handle('get-installed-plugins', async () => {
    console.log('📥 get-installed-plugins')
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
    
    console.log(`📥 get-installed-plugins: ${plugins.length} plugins trouvés`)
    return plugins
  })

  // Get plugin path
  ipcMain.handle('get-plugin-path', async (event, pluginId) => {
    console.log(`📥 get-plugin-path: ${pluginId}`)
    const { app } = require('electron')
    const pluginDir = path.join(app.getPath('userData'), 'plugins', pluginId)
    const indexPath = path.join(pluginDir, 'index.js')
    if (fs.existsSync(indexPath)) {
      return indexPath
    }
    return null
  })

  // Get plugin component path
  ipcMain.handle('get-plugin-component-path', async (event, pluginId, pageId) => {
    console.log(`📥 get-plugin-component-path: ${pluginId}/${pageId}`)
    const { app } = require('electron')
    const pluginDir = path.join(app.getPath('userData'), 'plugins', pluginId)
    const componentPath = path.join(pluginDir, 'pages', `${pageId}.jsx`)
    if (fs.existsSync(componentPath)) {
      return componentPath
    }
    return null
  })

  // Install plugin from buffer
  ipcMain.handle('install-plugin-from-buffer', async (event, buffer, fileName) => {
    console.log(`📥 install-plugin-from-buffer: ${fileName}`)
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

  // Uninstall plugin
  ipcMain.handle('uninstall-plugin', async (event, pluginId) => {
    console.log(`🗑️ uninstall-plugin: ${pluginId}`)
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
  console.log(`📊 Handlers enregistrés: ${ipcMain.eventNames().join(', ')}`)
}

module.exports = {
  registerStoreHandlers,
  store,
}