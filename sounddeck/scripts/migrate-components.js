// scripts/migrate-components.js
const fs = require('fs')
const path = require('path')

// ─── COULEURS POUR LE LOG ──────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n📌 ${step}`, 'blue')
  log(`   ${message}`, 'yellow')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logFile(src, dest) {
  log(`   📄 ${path.basename(src)} → ${path.relative(process.cwd(), dest)}`, 'cyan')
}

// ─── PATHS ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

// Ancien dossier components
const OLD_COMPONENTS = path.join(SRC, 'shared', 'components')

// Nouveaux dossiers
const NEW_UI = path.join(OLD_COMPONENTS, 'ui')
const NEW_AUDIO = path.join(OLD_COMPONENTS, 'audio')
const NEW_NAVIGATION = path.join(OLD_COMPONENTS, 'navigation')
const NEW_SETTINGS = path.join(OLD_COMPONENTS, 'settings')
const NEW_MODALS = path.join(OLD_COMPONENTS, 'modals')

// ─── MAPPING DES COMPOSANTS ────────────────────────────────────────────────

const COMPONENT_MAPPING = {
  // ─── UI (composants d'interface de base) ──────────────────────────────
  'CardSizeSelector.jsx': { dest: NEW_UI, category: 'ui' },
  'CustomThemeEditor.jsx': { dest: NEW_UI, category: 'ui' },
  'DropIndicator.jsx': { dest: NEW_UI, category: 'ui' },
  'Toast.jsx': { dest: NEW_UI, category: 'ui' },
  'ThemeToggle.jsx': { dest: NEW_UI, category: 'ui' },
  'Tutorial.jsx': { dest: NEW_UI, category: 'ui' },
  'TutorialAdvanced.jsx': { dest: NEW_UI, category: 'ui' },
  
  // ─── AUDIO (composants audio) ──────────────────────────────────────────
  'SoundCard.jsx': { dest: NEW_AUDIO, category: 'audio' },
  'AudioVisualizer.jsx': { dest: NEW_AUDIO, category: 'audio' },
  'AudioTrimmer.jsx': { dest: NEW_AUDIO, category: 'audio' },
  'Waveform.jsx': { dest: NEW_AUDIO, category: 'audio' },
  'VirtualizedSoundGrid.jsx': { dest: NEW_AUDIO, category: 'audio' },
  
  // ─── NAVIGATION ─────────────────────────────────────────────────────────
  'Sidebar.jsx': { dest: NEW_NAVIGATION, category: 'navigation' },
  'SidebarEditor.jsx': { dest: NEW_NAVIGATION, category: 'navigation' },
  
  // ─── SETTINGS (paramètres) ─────────────────────────────────────────────
  'BackupSettings.jsx': { dest: NEW_SETTINGS, category: 'settings' },
  'OBSControl.jsx': { dest: NEW_SETTINGS, category: 'settings' },
  'TwitchAlerts.jsx': { dest: NEW_SETTINGS, category: 'settings' },
  'PluginInstaller.jsx': { dest: NEW_SETTINGS, category: 'settings' },
  'KeyboardVisualizer.jsx': { dest: NEW_SETTINGS, category: 'settings' },
  
  // ─── MODALS ─────────────────────────────────────────────────────────────
  'ConfirmModal.jsx': { dest: NEW_MODALS, category: 'modals' },
  'QuitConfirm.jsx': { dest: NEW_MODALS, category: 'modals' },
  'FeedbackModal.jsx': { dest: NEW_MODALS, category: 'modals' },
  'ProfileManagerModal.jsx': { dest: NEW_MODALS, category: 'modals' },
}

// ─── FONCTIONS ─────────────────────────────────────────────────────────────

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    log(`📁 Créé: ${path.relative(SRC, dir)}`, 'yellow')
  }
}

function updateImports(content, fileName, category) {
  // Remplacer les imports de composants
  const importReplacements = {
    // Composants audio
    "'../components/SoundCard'": "'@shared/components/audio/SoundCard'",
    "'./SoundCard'": "'@shared/components/audio/SoundCard'",
    "'../components/AudioTrimmer'": "'@shared/components/audio/AudioTrimmer'",
    "'./AudioTrimmer'": "'@shared/components/audio/AudioTrimmer'",
    "'../components/AudioVisualizer'": "'@shared/components/audio/AudioVisualizer'",
    "'./AudioVisualizer'": "'@shared/components/audio/AudioVisualizer'",
    "'../components/Waveform'": "'@shared/components/audio/Waveform'",
    "'./Waveform'": "'@shared/components/audio/Waveform'",
    "'../components/VirtualizedSoundGrid'": "'@shared/components/audio/VirtualizedSoundGrid'",
    "'./VirtualizedSoundGrid'": "'@shared/components/audio/VirtualizedSoundGrid'",
    
    // Composants navigation
    "'../components/Sidebar'": "'@shared/components/navigation/Sidebar'",
    "'./Sidebar'": "'@shared/components/navigation/Sidebar'",
    "'../components/SidebarEditor'": "'@shared/components/navigation/SidebarEditor'",
    "'./SidebarEditor'": "'@shared/components/navigation/SidebarEditor'",
    
    // Composants UI
    "'../components/ThemeToggle'": "'@shared/components/ui/ThemeToggle'",
    "'./ThemeToggle'": "'@shared/components/ui/ThemeToggle'",
    "'../components/CustomThemeEditor'": "'@shared/components/ui/CustomThemeEditor'",
    "'./CustomThemeEditor'": "'@shared/components/ui/CustomThemeEditor'",
    "'../components/CardSizeSelector'": "'@shared/components/ui/CardSizeSelector'",
    "'./CardSizeSelector'": "'@shared/components/ui/CardSizeSelector'",
    "'../components/DropIndicator'": "'@shared/components/ui/DropIndicator'",
    "'./DropIndicator'": "'@shared/components/ui/DropIndicator'",
    "'../components/Toast'": "'@shared/components/ui/Toast'",
    "'./Toast'": "'@shared/components/ui/Toast'",
    "'../components/Tutorial'": "'@shared/components/ui/Tutorial'",
    "'./Tutorial'": "'@shared/components/ui/Tutorial'",
    "'../components/TutorialAdvanced'": "'@shared/components/ui/TutorialAdvanced'",
    "'./TutorialAdvanced'": "'@shared/components/ui/TutorialAdvanced'",
    
    // Composants settings
    "'../components/BackupSettings'": "'@shared/components/settings/BackupSettings'",
    "'./BackupSettings'": "'@shared/components/settings/BackupSettings'",
    "'../components/OBSControl'": "'@shared/components/settings/OBSControl'",
    "'./OBSControl'": "'@shared/components/settings/OBSControl'",
    "'../components/TwitchAlerts'": "'@shared/components/settings/TwitchAlerts'",
    "'./TwitchAlerts'": "'@shared/components/settings/TwitchAlerts'",
    "'../components/PluginInstaller'": "'@shared/components/settings/PluginInstaller'",
    "'./PluginInstaller'": "'@shared/components/settings/PluginInstaller'",
    "'../components/KeyboardVisualizer'": "'@shared/components/settings/KeyboardVisualizer'",
    "'./KeyboardVisualizer'": "'@shared/components/settings/KeyboardVisualizer'",
    
    // Composants modals
    "'../components/ConfirmModal'": "'@shared/components/modals/ConfirmModal'",
    "'./ConfirmModal'": "'@shared/components/modals/ConfirmModal'",
    "'../components/QuitConfirm'": "'@shared/components/modals/QuitConfirm'",
    "'./QuitConfirm'": "'@shared/components/modals/QuitConfirm'",
    "'../components/FeedbackModal'": "'@shared/components/modals/FeedbackModal'",
    "'./FeedbackModal'": "'@shared/components/modals/FeedbackModal'",
    "'../components/ProfileManagerModal'": "'@shared/components/modals/ProfileManagerModal'",
    "'./ProfileManagerModal'": "'@shared/components/modals/ProfileManagerModal'",
  }

  let newContent = content
  
  for (const [oldImport, newImport] of Object.entries(importReplacements)) {
    newContent = newContent.replace(new RegExp(oldImport, 'g'), newImport)
  }
  
  return newContent
}

function copyAndUpdateFile(srcPath, destPath, fileName, category) {
  if (!fs.existsSync(srcPath)) {
    log(`⚠️ Fichier source manquant: ${fileName}`, 'red')
    return false
  }

  const destDir = path.dirname(destPath)
  ensureDirectory(destDir)

  try {
    let content = fs.readFileSync(srcPath, 'utf-8')
    
    // Mettre à jour les imports
    content = updateImports(content, fileName, category)
    
    fs.writeFileSync(destPath, content, 'utf-8')
    logFile(srcPath, destPath)
    return true
  } catch (e) {
    log(`   ❌ Erreur copie ${fileName}: ${e.message}`, 'red')
    return false
  }
}

function createIndexFiles() {
  // UI index
  const uiIndex = `// src/shared/components/ui/index.js
export { default as CardSizeSelector } from './CardSizeSelector'
export { default as CustomThemeEditor } from './CustomThemeEditor'
export { default as DropIndicator } from './DropIndicator'
export { default as Toast } from './Toast'
export { default as ThemeToggle } from './ThemeToggle'
export { default as Tutorial } from './Tutorial'
export { default as TutorialAdvanced } from './TutorialAdvanced'
`
  fs.writeFileSync(path.join(NEW_UI, 'index.js'), uiIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_UI, 'index.js'))}`, 'green')

  // Audio index
  const audioIndex = `// src/shared/components/audio/index.js
export { default as SoundCard } from './SoundCard'
export { default as AudioVisualizer } from './AudioVisualizer'
export { default as AudioTrimmer } from './AudioTrimmer'
export { default as Waveform } from './Waveform'
export { default as VirtualizedSoundGrid } from './VirtualizedSoundGrid'
`
  fs.writeFileSync(path.join(NEW_AUDIO, 'index.js'), audioIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_AUDIO, 'index.js'))}`, 'green')

  // Navigation index
  const navIndex = `// src/shared/components/navigation/index.js
export { default as Sidebar } from './Sidebar'
export { default as SidebarEditor } from './SidebarEditor'
`
  fs.writeFileSync(path.join(NEW_NAVIGATION, 'index.js'), navIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_NAVIGATION, 'index.js'))}`, 'green')

  // Settings index
  const settingsIndex = `// src/shared/components/settings/index.js
export { default as BackupSettings } from './BackupSettings'
export { default as OBSControl } from './OBSControl'
export { default as TwitchAlerts } from './TwitchAlerts'
export { default as PluginInstaller } from './PluginInstaller'
export { default as KeyboardVisualizer } from './KeyboardVisualizer'
`
  fs.writeFileSync(path.join(NEW_SETTINGS, 'index.js'), settingsIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_SETTINGS, 'index.js'))}`, 'green')

  // Modals index
  const modalsIndex = `// src/shared/components/modals/index.js
export { default as ConfirmModal } from './ConfirmModal'
export { default as QuitConfirm } from './QuitConfirm'
export { default as FeedbackModal } from './FeedbackModal'
export { default as ProfileManagerModal } from './ProfileManagerModal'
`
  fs.writeFileSync(path.join(NEW_MODALS, 'index.js'), modalsIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_MODALS, 'index.js'))}`, 'green')

  // Components root index
  const rootIndex = `// src/shared/components/index.js
export * from './ui'
export * from './audio'
export * from './navigation'
export * from './settings'
export * from './modals'
`
  fs.writeFileSync(path.join(OLD_COMPONENTS, 'index.js'), rootIndex)
  log(`📄 ${path.relative(SRC, path.join(OLD_COMPONENTS, 'index.js'))}`, 'green')
}

function updateAppImports() {
  const appPath = path.join(SRC, 'App.jsx')
  if (!fs.existsSync(appPath)) {
    log('⚠️ App.jsx non trouvé', 'yellow')
    return
  }

  let content = fs.readFileSync(appPath, 'utf-8')
  
  // Mettre à jour les imports de composants
  const componentImports = {
    "import Sidebar from './components/Sidebar'": "import Sidebar from '@shared/components/navigation/Sidebar'",
    "import Toast from './components/Toast'": "import Toast from '@shared/components/ui/Toast'",
    "import QuitConfirm from './components/QuitConfirm'": "import QuitConfirm from '@shared/components/modals/QuitConfirm'",
    "import Tutorial from './components/Tutorial'": "import Tutorial from '@shared/components/ui/Tutorial'",
    "import TutorialAdvanced from './components/TutorialAdvanced'": "import TutorialAdvanced from '@shared/components/ui/TutorialAdvanced'",
  }
  
  for (const [oldImport, newImport] of Object.entries(componentImports)) {
    content = content.replace(new RegExp(oldImport, 'g'), newImport)
  }
  
  fs.writeFileSync(appPath, content, 'utf-8')
  log(`✅ App.jsx mis à jour`, 'green')
}

function updateFeatureImports() {
  // Parcourir tous les fichiers dans features
  const featuresDir = path.join(SRC, 'features')
  if (!fs.existsSync(featuresDir)) return
  
  const files = []
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        walkDir(fullPath)
      } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
        files.push(fullPath)
      }
    }
  }
  
  walkDir(featuresDir)
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8')
    let hasChanges = false
    
    // Remplacer les imports de composants
    const replacements = {
      "'../components/SoundCard'": "'@shared/components/audio/SoundCard'",
      "'./SoundCard'": "'@shared/components/audio/SoundCard'",
      "'../components/AudioTrimmer'": "'@shared/components/audio/AudioTrimmer'",
      "'./AudioTrimmer'": "'@shared/components/audio/AudioTrimmer'",
      "'../components/AudioVisualizer'": "'@shared/components/audio/AudioVisualizer'",
      "'./AudioVisualizer'": "'@shared/components/audio/AudioVisualizer'",
      "'../components/Waveform'": "'@shared/components/audio/Waveform'",
      "'./Waveform'": "'@shared/components/audio/Waveform'",
      "'../components/VirtualizedSoundGrid'": "'@shared/components/audio/VirtualizedSoundGrid'",
      "'./VirtualizedSoundGrid'": "'@shared/components/audio/VirtualizedSoundGrid'",
      "'../components/Sidebar'": "'@shared/components/navigation/Sidebar'",
      "'./Sidebar'": "'@shared/components/navigation/Sidebar'",
      "'../components/SidebarEditor'": "'@shared/components/navigation/SidebarEditor'",
      "'./SidebarEditor'": "'@shared/components/navigation/SidebarEditor'",
      "'../components/ThemeToggle'": "'@shared/components/ui/ThemeToggle'",
      "'./ThemeToggle'": "'@shared/components/ui/ThemeToggle'",
      "'../components/ConfirmModal'": "'@shared/components/modals/ConfirmModal'",
      "'./ConfirmModal'": "'@shared/components/modals/ConfirmModal'",
      "'../components/QuitConfirm'": "'@shared/components/modals/QuitConfirm'",
      "'./QuitConfirm'": "'@shared/components/modals/QuitConfirm'",
      "'../components/FeedbackModal'": "'@shared/components/modals/FeedbackModal'",
      "'./FeedbackModal'": "'@shared/components/modals/FeedbackModal'",
      "'../components/ProfileManagerModal'": "'@shared/components/modals/ProfileManagerModal'",
      "'./ProfileManagerModal'": "'@shared/components/modals/ProfileManagerModal'",
    }
    
    for (const [oldImport, newImport] of Object.entries(replacements)) {
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport, 'g'), newImport)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf-8')
      log(`   🔄 ${path.relative(SRC, filePath)}`, 'yellow')
    }
  }
}

// ─── FONCTION PRINCIPALE ──────────────────────────────────────────────────

function main() {
  log('\n═══════════════════════════════════════════════════════════════', 'blue')
  log('     📦 MIGRATION DES COMPOSANTS SOUNDDECK', 'bold')
  log('═══════════════════════════════════════════════════════════════', 'blue')
  
  logStep('1', 'Création des sous-dossiers...')
  
  const directories = [NEW_UI, NEW_AUDIO, NEW_NAVIGATION, NEW_SETTINGS, NEW_MODALS]
  for (const dir of directories) {
    ensureDirectory(dir)
  }
  
  logSuccess('Dossiers créés')
  
  logStep('2', 'Déplacement des composants...')
  
  let successCount = 0
  let failCount = 0
  const movedFiles = []
  
  for (const [fileName, config] of Object.entries(COMPONENT_MAPPING)) {
    const srcPath = path.join(OLD_COMPONENTS, fileName)
    const destPath = path.join(config.dest, fileName)
    
    if (copyAndUpdateFile(srcPath, destPath, fileName, config.category)) {
      successCount++
      movedFiles.push(fileName)
    } else {
      failCount++
    }
  }
  
  log(`\n📊 Migration terminée: ${successCount} fichiers migrés, ${failCount} échecs`, 'yellow')
  
  logStep('3', 'Création des fichiers index...')
  createIndexFiles()
  
  logStep('4', 'Mise à jour des imports...')
  
  // Mettre à jour App.jsx
  updateAppImports()
  
  // Mettre à jour les imports dans features
  updateFeatureImports()
  
  logStep('5', 'Nettoyage des anciens composants...')
  
  // Déplacer les fichiers restants (qui ne sont pas dans le mapping)
  const allFiles = fs.readdirSync(OLD_COMPONENTS)
  const remainingFiles = allFiles.filter(f => 
    f.endsWith('.jsx') && 
    !f.endsWith('.js') && 
    !movedFiles.includes(f) &&
    f !== 'index.js'
  )
  
  if (remainingFiles.length > 0) {
    log(`\n⚠️ Fichiers non migrés trouvés:`, 'yellow')
    for (const file of remainingFiles) {
      log(`   📄 ${file}`, 'yellow')
    }
    log('\n💡 Veuillez les déplacer manuellement dans le bon dossier.', 'yellow')
  }
  
  logStep('6', 'Vérification finale...')
  
  // Vérifier que les fichiers essentiels ont été migrés
  const essentialFiles = [
    path.join(NEW_AUDIO, 'SoundCard.jsx'),
    path.join(NEW_NAVIGATION, 'Sidebar.jsx'),
    path.join(NEW_UI, 'Toast.jsx'),
    path.join(NEW_MODALS, 'ConfirmModal.jsx'),
  ]
  
  let allExist = true
  for (const file of essentialFiles) {
    if (fs.existsSync(file)) {
      log(`   ✅ ${path.relative(SRC, file)}`, 'green')
    } else {
      log(`   ❌ ${path.relative(SRC, file)} manquant`, 'red')
      allExist = false
    }
  }
  
  if (allExist) {
    logSuccess('\n🎉 Migration des composants terminée avec succès !')
  } else {
    logError('\n⚠️ Certains fichiers essentiels sont manquants.')
  }
  
  log('\n📌 Structure finale des composants:', 'blue')
  log('   📁 src/shared/components/', 'cyan')
  log('   ├── 📁 ui/         # Composants UI de base', 'cyan')
  log('   ├── 📁 audio/      # Composants audio', 'cyan')
  log('   ├── 📁 navigation/ # Composants de navigation', 'cyan')
  log('   ├── 📁 settings/   # Composants de paramètres', 'cyan')
  log('   └── 📁 modals/     # Modaux', 'cyan')
  log('\n')
}

// ─── EXÉCUTION ─────────────────────────────────────────────────────────────

main()