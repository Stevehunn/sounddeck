const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')

const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins')

// Assurer que le dossier plugins existe
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true })
}

// Récupérer la liste des plugins installés
function getInstalledPlugins() {
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
}

// Installer un plugin depuis un fichier ZIP
function installPluginFromFile(zipPath) {
  try {
    const zip = new AdmZip(zipPath)
    const manifestEntry = zip.getEntry('plugin.json')
    
    if (!manifestEntry) {
      throw new Error('plugin.json manquant dans l\'archive')
    }
    
    const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'))
    
    if (!manifest.id) {
      throw new Error('id manquant dans plugin.json')
    }
    
    // Vérifier si le plugin existe déjà
    const pluginDir = path.join(PLUGINS_DIR, manifest.id)
    if (fs.existsSync(pluginDir)) {
      // Supprimer l'ancienne version
      fs.rmSync(pluginDir, { recursive: true, force: true })
    }
    
    // Extraire l'archive
    zip.extractAllTo(pluginDir, true)
    
    return {
      success: true,
      id: manifest.id,
      name: manifest.name || manifest.id,
      version: manifest.version || '1.0.0'
    }
    
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}

// Désinstaller un plugin
function uninstallPlugin(pluginId) {
  const pluginDir = path.join(PLUGINS_DIR, pluginId)
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true })
    return { success: true }
  }
  return { success: false, error: 'Plugin non trouvé' }
}

module.exports = {
  getInstalledPlugins,
  installPluginFromFile,
  uninstallPlugin,
  PLUGINS_DIR
}