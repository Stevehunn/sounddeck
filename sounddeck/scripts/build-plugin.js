const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const PLUGIN_NAME = 'myinstants'
const PLUGIN_DIR = path.join(__dirname, '../src/plugins', PLUGIN_NAME)
const OUTPUT_DIR = path.join(__dirname, '../dist-plugins')

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const output = fs.createWriteStream(path.join(OUTPUT_DIR, `${PLUGIN_NAME}.sdplugin`))
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () => {
  console.log(`✅ Plugin construit: ${PLUGIN_NAME}.sdplugin (${archive.pointer()} bytes)`)
  console.log(`📁 Fichier généré: ${path.join(OUTPUT_DIR, `${PLUGIN_NAME}.sdplugin`)}`)
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

// Ajouter les fichiers du plugin
const files = [
  'index.js',
  'Discover.jsx',
  'categories.js',
  'i18n.js',
  'plugin.json'
]

for (const file of files) {
  const filePath = path.join(PLUGIN_DIR, file)
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file })
    console.log(`📄 Ajouté: ${file}`)
  } else {
    console.warn(`⚠️ Fichier manquant: ${file}`)
  }
}

archive.finalize()