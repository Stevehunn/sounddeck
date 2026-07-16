import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PLUGINS_DIR = path.join(__dirname, '../src/plugins')
const OUTPUT_DIR = path.join(__dirname, '../dist-plugins')

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// ✅ Lire tous les dossiers de plugins
const pluginFolders = fs.readdirSync(PLUGINS_DIR).filter(folder => {
  const pluginPath = path.join(PLUGINS_DIR, folder)
  const manifestPath = path.join(pluginPath, 'plugin.json')
  return fs.statSync(pluginPath).isDirectory() && fs.existsSync(manifestPath)
})

if (pluginFolders.length === 0) {
  console.log('⚠️ Aucun plugin trouvé dans src/plugins/')
  process.exit(0)
}

console.log(`📦 ${pluginFolders.length} plugin(s) trouvé(s): ${pluginFolders.join(', ')}`)

// ✅ Builder chaque plugin
for (const pluginName of pluginFolders) {
  const pluginPath = path.join(PLUGINS_DIR, pluginName)
  const manifestPath = path.join(pluginPath, 'plugin.json')
  
  // Lire le manifeste pour obtenir le nom et la version
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const outputPath = path.join(OUTPUT_DIR, `${pluginName}.sdplugin`)
  
  console.log(`\n📦 Build du plugin: ${manifest.name || pluginName} (v${manifest.version || '1.0.0'})`)

  const output = fs.createWriteStream(outputPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  await new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2)
      console.log(`✅ ${pluginName}.sdplugin généré (${sizeKB} KB)`)
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    // ✅ Ajouter tous les fichiers du plugin
    const files = getAllFiles(pluginPath)
    
    for (const filePath of files) {
      const relativePath = path.relative(pluginPath, filePath)
      // Ignorer les fichiers cachés et node_modules
      if (relativePath.startsWith('.') || relativePath.includes('node_modules')) {
        continue
      }
      archive.file(filePath, { name: relativePath })
      console.log(`  📄 ${relativePath}`)
    }

    archive.finalize()
  })
}

console.log(`\n🎉 Build des plugins terminé !`)
console.log(`📁 Dossier: ${OUTPUT_DIR}`)

// ✅ Fonction pour récupérer tous les fichiers récursivement
function getAllFiles(dir) {
  const results = []
  const list = fs.readdirSync(dir)
  
  for (const item of list) {
    const itemPath = path.join(dir, item)
    const stat = fs.statSync(itemPath)
    
    if (stat.isDirectory()) {
      // Ignorer les dossiers cachés et node_modules
      if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') {
        continue
      }
      results.push(...getAllFiles(itemPath))
    } else {
      // Ignorer les fichiers cachés
      if (item.startsWith('.')) {
        continue
      }
      results.push(itemPath)
    }
  }
  
  return results
}