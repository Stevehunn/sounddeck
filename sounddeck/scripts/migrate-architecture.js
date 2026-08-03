// scripts/migrate-architecture.js
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ─── COULEURS POUR LE LOG ──────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
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

// ─── PATHS ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

// Anciens chemins
const OLD_STORE = path.join(SRC, 'store')
const OLD_UTILS = path.join(SRC, 'utils')
const OLD_COMPONENTS = path.join(SRC, 'components')
const OLD_HOOKS = path.join(SRC, 'hooks')
const OLD_PAGES = path.join(SRC, 'pages')
const OLD_PLUGINS = path.join(SRC, 'plugins')
const OLD_CONTEXT = path.join(SRC, 'context')

// Nouveaux chemins
const NEW_CORE = path.join(SRC, 'core')
const NEW_STORE = path.join(NEW_CORE, 'store')
const NEW_STORE_SLICES = path.join(NEW_STORE, 'slices')
const NEW_STORE_MIDDLEWARE = path.join(NEW_STORE, 'middleware')
const NEW_SERVICES = path.join(NEW_CORE, 'services')
const NEW_PLUGINS = path.join(NEW_CORE, 'plugins')
const NEW_PLUGINS_HOOKS = path.join(NEW_PLUGINS, 'hooks')
const NEW_I18N = path.join(NEW_CORE, 'i18n')

const NEW_SHARED = path.join(SRC, 'shared')
const NEW_SHARED_COMPONENTS = path.join(NEW_SHARED, 'components')
const NEW_SHARED_COMPONENTS_UI = path.join(NEW_SHARED_COMPONENTS, 'ui')
const NEW_SHARED_COMPONENTS_AUDIO = path.join(NEW_SHARED_COMPONENTS, 'audio')
const NEW_SHARED_COMPONENTS_NAVIGATION = path.join(NEW_SHARED_COMPONENTS, 'navigation')
const NEW_SHARED_COMPONENTS_SETTINGS = path.join(NEW_SHARED_COMPONENTS, 'settings')
const NEW_SHARED_COMPONENTS_MODALS = path.join(NEW_SHARED_COMPONENTS, 'modals')
const NEW_SHARED_HOOKS = path.join(NEW_SHARED, 'hooks')
const NEW_SHARED_UTILS = path.join(NEW_SHARED, 'utils')

const NEW_FEATURES = path.join(SRC, 'features')
const NEW_FEATURES_HOME = path.join(NEW_FEATURES, 'home')
const NEW_FEATURES_DISCOVER = path.join(NEW_FEATURES, 'discover')
const NEW_FEATURES_EDITOR = path.join(NEW_FEATURES, 'editor')
const NEW_FEATURES_EDITOR_COMPONENTS = path.join(NEW_FEATURES_EDITOR, 'components')
const NEW_FEATURES_EDITOR_CONTEXTS = path.join(NEW_FEATURES_EDITOR, 'contexts')
const NEW_FEATURES_EDITOR_HOOKS = path.join(NEW_FEATURES_EDITOR, 'hooks')
const NEW_FEATURES_SEQUENCER = path.join(NEW_FEATURES, 'sequencer')
const NEW_FEATURES_TRIMMER = path.join(NEW_FEATURES, 'trimmer')
const NEW_FEATURES_YOUTUBE = path.join(NEW_FEATURES, 'youtube')
const NEW_FEATURES_OPTIONS = path.join(NEW_FEATURES, 'options')
const NEW_FEATURES_GUIDE = path.join(NEW_FEATURES, 'guide')
const NEW_FEATURES_STATS = path.join(NEW_FEATURES, 'stats')
const NEW_FEATURES_PRESENTATION = path.join(NEW_FEATURES, 'presentation')
const NEW_FEATURES_WELCOME = path.join(NEW_FEATURES, 'welcome')

// ─── MAPPING DES FICHIERS À DÉPLACER ──────────────────────────────────────

const FILE_MAPPING = {
  // Store → Core/Store
  'store/useStore.js': 'core/store/useStore.js',
  'store/slices/soundsSlice.js': 'core/store/slices/soundsSlice.js',
  'store/slices/profilesSlice.js': 'core/store/slices/profilesSlice.js',
  'store/slices/shortcutsSlice.js': 'core/store/slices/shortcutsSlice.js',
  'store/slices/settingsSlice.js': 'core/store/slices/settingsSlice.js',
  'store/slices/editorSlice.js': 'core/store/slices/editorSlice.js',
  'store/slices/index.js': 'core/store/slices/index.js',
  'store/middleware/persistence.js': 'core/store/middleware/persistence.js',
  'store/middleware/undoRedo.js': 'core/store/middleware/undoRedo.js',
  'store/index.js': 'core/store/index.js',

  // Utils audio → Core/Services
  'utils/audio.js': 'core/services/AudioService.js',
  'utils/audioMixer.js': 'core/services/AudioMixerService.js',
  'utils/audioEffects.js': 'core/services/AudioEditorService.js',
  'utils/audioConverter.js': 'shared/utils/audioConverter.js',
  'utils/mixdown.js': 'shared/utils/mixdown.js',
  'utils/normalizeUtils.js': 'shared/utils/normalizeUtils.js',
  'utils/waveformGenerator.js': 'shared/utils/waveformGenerator.js',
  'utils/crossfade.js': 'shared/utils/crossfade.js',

  // Autres utils → Shared/Utils
  'utils/errorHandler.js': 'shared/utils/errorHandler.js',
  'utils/logger.js': 'shared/utils/logger.js',
  'utils/backupManager.js': 'shared/utils/backupManager.js',
  'utils/cloudBackup.js': 'shared/utils/cloudBackup.js',
  'utils/platformImport.js': 'shared/utils/platformImport.js',
  'utils/obsIntegration.js': 'shared/utils/obsIntegration.js',
  'utils/streamDeckIntegration.js': 'shared/utils/streamDeckIntegration.js',
  'utils/virtualization.js': 'shared/utils/virtualization.js',
  'utils/aiTagging.js': 'shared/utils/aiTagging.js',
  'utils/workerManager.js': 'shared/utils/workerManager.js',
  'utils/accessibility.js': 'shared/utils/accessibility.js',

  // Composants → Shared/Components
  'components/SoundCard.jsx': 'shared/components/audio/SoundCard.jsx',
  'components/AudioVisualizer.jsx': 'shared/components/audio/AudioVisualizer.jsx',
  'components/AudioTrimmer.jsx': 'shared/components/audio/AudioTrimmer.jsx',
  'components/Waveform.jsx': 'shared/components/audio/Waveform.jsx',
  'components/VirtualizedSoundGrid.jsx': 'shared/components/audio/VirtualizedSoundGrid.jsx',
  'components/Sidebar.jsx': 'shared/components/navigation/Sidebar.jsx',
  'components/SidebarEditor.jsx': 'shared/components/navigation/SidebarEditor.jsx',
  'components/ThemeToggle.jsx': 'shared/components/navigation/ThemeToggle.jsx',
  'components/BackupSettings.jsx': 'shared/components/settings/BackupSettings.jsx',
  'components/OBSControl.jsx': 'shared/components/settings/OBSControl.jsx',
  'components/TwitchAlerts.jsx': 'shared/components/settings/TwitchAlerts.jsx',
  'components/PluginInstaller.jsx': 'shared/components/settings/PluginInstaller.jsx',
  'components/KeyboardVisualizer.jsx': 'shared/components/settings/KeyboardVisualizer.jsx',
  'components/ConfirmModal.jsx': 'shared/components/modals/ConfirmModal.jsx',
  'components/QuitConfirm.jsx': 'shared/components/modals/QuitConfirm.jsx',
  'components/FeedbackModal.jsx': 'shared/components/modals/FeedbackModal.jsx',
  'components/ProfileManagerModal.jsx': 'shared/components/modals/ProfileManagerModal.jsx',
  'components/CustomThemeEditor.jsx': 'shared/components/ui/CustomThemeEditor.jsx',
  'components/CardSizeSelector.jsx': 'shared/components/ui/CardSizeSelector.jsx',
  'components/DropIndicator.jsx': 'shared/components/ui/DropIndicator.jsx',
  'components/Toast.jsx': 'shared/components/ui/Toast.jsx',

  // Hooks → Shared/Hooks
  'hooks/useConfirm.jsx': 'shared/hooks/useConfirm.jsx',
  'hooks/useKeyboardNavigation.js': 'shared/hooks/useKeyboardNavigation.js',

  // Pages → Features
  'pages/Home.jsx': 'features/home/Home.jsx',
  'pages/Discover.jsx': 'features/discover/Discover.jsx',
  'pages/Sequencer.jsx': 'features/sequencer/Sequencer.jsx',
  'pages/Trimmer.jsx': 'features/trimmer/Trimmer.jsx',
  'pages/Options.jsx': 'features/options/Options.jsx',
  'pages/Guide.jsx': 'features/guide/Guide.jsx',
  'pages/Stats.jsx': 'features/stats/Stats.jsx',
  'pages/Presentation.jsx': 'features/presentation/Presentation.jsx',
  'pages/WelcomeScreen.jsx': 'features/welcome/WelcomeScreen.jsx',
  'pages/editor/Editor.jsx': 'features/editor/Editor.jsx',

  // Pages/Editor internals
  'pages/editor/contexts/EditorContext.jsx': 'features/editor/contexts/EditorContext.jsx',
  'pages/editor/hooks/usePlayback.js': 'features/editor/hooks/usePlayback.js',
  'pages/editor/hooks/audioUtils.js': 'features/editor/hooks/audioUtils.js',
  'pages/editor/hooks/index.js': 'features/editor/hooks/index.js',
  'pages/editor/utils/index.js': 'features/editor/utils/index.js',

  // Pages/Editor components
  'pages/editor/components/EditorTimeline/index.jsx': 'features/editor/components/Timeline/index.jsx',
  'pages/editor/components/EditorToolbar/index.jsx': 'features/editor/components/Toolbar/index.jsx',
  'pages/editor/components/EditorToolbar/EditorMetronome.jsx': 'features/editor/components/Toolbar/Metronome.jsx',
  'pages/editor/components/EditorTrack/index.jsx': 'features/editor/components/Track/index.jsx',
  'pages/editor/components/EditorClip/index.jsx': 'features/editor/components/Clip/index.jsx',
  'pages/editor/components/EditorEffectsPanel/index.jsx': 'features/editor/components/EffectsPanel/index.jsx',
  'pages/editor/components/EditorMasterVolume/index.jsx': 'features/editor/components/MasterVolume/index.jsx',
  'pages/editor/components/EditorMarkersPanel.jsx': 'features/editor/components/MarkersPanel.jsx',
  'pages/editor/components/ClipActionsMenu.jsx': 'features/editor/components/ClipActionsMenu.jsx',
  'pages/editor/components/AddTrackModal.jsx': 'features/editor/components/AddTrackModal.jsx',
  'pages/editor/components/TrimModal.jsx': 'features/editor/components/TrimModal.jsx',
  'pages/editor/components/ImportFileModal.jsx': 'features/editor/components/ImportFileModal.jsx',
  'pages/editor/components/ExportModal.jsx': 'features/editor/components/ExportModal.jsx',

  // Pages/Editor utils/effects
  'pages/editor/utils/effects/index.js': 'features/editor/utils/effects/index.js',
  'pages/editor/utils/effects/VolumeEffect.js': 'features/editor/utils/effects/VolumeEffect.js',
  'pages/editor/utils/effects/SpeedEffect.js': 'features/editor/utils/effects/SpeedEffect.js',
  'pages/editor/utils/effects/FadeEffect.js': 'features/editor/utils/effects/FadeEffect.js',
  'pages/editor/utils/effects/EchoEffect.js': 'features/editor/utils/effects/EchoEffect.js',
  'pages/editor/utils/effects/ReverbEffect.js': 'features/editor/utils/effects/ReverbEffect.js',

  // Plugins → Core/Plugins (puis déplacés plus tard)
  'core/PluginManager.js': 'core/plugins/PluginManager.js',
  'core/PluginContext.jsx': 'core/plugins/PluginContext.jsx',
  'core/hooks/usePluginPage.js': 'core/plugins/hooks/usePluginPage.js',

  // Context → Core/I18n
  'context/LanguageContext.jsx': 'core/i18n/LanguageContext.jsx',
  'i18n.js': 'core/i18n/translations.js',
}

// ─── FONCTIONS ─────────────────────────────────────────────────────────────

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    log(`📁 Créé: ${path.relative(SRC, dir)}`, 'yellow')
  }
}

function copyFileWithContent(src, dest) {
  if (!fs.existsSync(src)) {
    log(`⚠️ Fichier source manquant: ${src}`, 'red')
    return false
  }

  const destDir = path.dirname(dest)
  ensureDirectory(destDir)

  try {
    let content = fs.readFileSync(src, 'utf-8')
    
    // Mettre à jour les imports
    content = updateImports(content, src, dest)
    
    fs.writeFileSync(dest, content, 'utf-8')
    log(`   📄 ${path.relative(SRC, src)} → ${path.relative(SRC, dest)}`, 'green')
    return true
  } catch (e) {
    log(`   ❌ Erreur copie ${path.relative(SRC, src)}: ${e.message}`, 'red')
    return false
  }
}

function updateImports(content, srcPath, destPath) {
  // Mapping des imports à remplacer
  const importMapping = {
    // Store
    "'../store/useStore'": "'@core/store/useStore'",
    "'./store/useStore'": "'@core/store/useStore'",
    "'../../store/useStore'": "'@core/store/useStore'",
    "'../../../store/useStore'": "'@core/store/useStore'",
    "'../../../../store/useStore'": "'@core/store/useStore'",
    
    // Utils
    "'../utils/audio'" : "'@core/services/AudioService'",
    "'./utils/audio'" : "'@core/services/AudioService'",
    "'../../utils/audio'" : "'@core/services/AudioService'",
    "'../../../utils/audio'" : "'@core/services/AudioService'",
    
    "'../utils/audioMixer'": "'@core/services/AudioMixerService'",
    "'./utils/audioMixer'": "'@core/services/AudioMixerService'",
    "'../../utils/audioMixer'": "'@core/services/AudioMixerService'",
    
    "'../utils/audioEffects'": "'@core/services/AudioEditorService'",
    
    "'../utils/mixdown'": "'@shared/utils/mixdown'",
    "'../utils/normalizeUtils'": "'@shared/utils/normalizeUtils'",
    "'../utils/waveformGenerator'": "'@shared/utils/waveformGenerator'",
    
    "'../utils/errorHandler'": "'@shared/utils/errorHandler'",
    "'../utils/logger'": "'@shared/utils/logger'",
    "'../utils/backupManager'": "'@shared/utils/backupManager'",
    "'../utils/cloudBackup'": "'@shared/utils/cloudBackup'",
    
    // Context
    "'../context/LanguageContext'": "'@core/i18n/LanguageContext'",
    "'./context/LanguageContext'": "'@core/i18n/LanguageContext'",
    "'../../context/LanguageContext'": "'@core/i18n/LanguageContext'",
    
    // Components
    "'../components/SoundCard'": "'@shared/components/audio/SoundCard'",
    "'../components/AudioTrimmer'": "'@shared/components/audio/AudioTrimmer'",
    "'../components/AudioVisualizer'": "'@shared/components/audio/AudioVisualizer'",
    "'../components/Waveform'": "'@shared/components/audio/Waveform'",
    "'../components/VirtualizedSoundGrid'": "'@shared/components/audio/VirtualizedSoundGrid'",
    
    "'../components/Sidebar'": "'@shared/components/navigation/Sidebar'",
    "'../components/SidebarEditor'": "'@shared/components/navigation/SidebarEditor'",
    
    "'../components/ConfirmModal'": "'@shared/components/modals/ConfirmModal'",
    "'../components/QuitConfirm'": "'@shared/components/modals/QuitConfirm'",
    "'../components/FeedbackModal'": "'@shared/components/modals/FeedbackModal'",
    
    "'../components/Toast'": "'@shared/components/ui/Toast'",
    
    // Hooks
    "'../hooks/useConfirm'": "'@shared/hooks/useConfirm'",
    "'../hooks/useKeyboardNavigation'": "'@shared/hooks/useKeyboardNavigation'",
    
    // Editor internals
    "'./components/EditorTimeline'": "'./components/Timeline'",
    "'./components/EditorToolbar'": "'./components/Toolbar'",
    "'./components/EditorTrack'": "'./components/Track'",
    "'./components/EditorClip'": "'./components/Clip'",
    "'./components/EditorEffectsPanel'": "'./components/EffectsPanel'",
    "'./components/EditorMasterVolume'": "'./components/MasterVolume'",
    "'./components/EditorMarkersPanel'": "'./components/MarkersPanel'",
    
    // Core
    "'../core/PluginManager'": "'@core/plugins/PluginManager'",
    "'../core/PluginContext'": "'@core/plugins/PluginContext'",
    "'../core/hooks/usePluginPage'": "'@core/plugins/hooks/usePluginPage'",
  }

  let newContent = content
  
  for (const [oldImport, newImport] of Object.entries(importMapping)) {
    // Remplacer les imports avec guillemets simples
    newContent = newContent.replace(new RegExp(oldImport, 'g'), newImport)
  }
  
  // Ajouter les alias si nécessaire (pour les fichiers qui n'ont pas encore d'alias)
  const fileExt = path.extname(destPath)
  const fileName = path.basename(destPath, fileExt)
  
  // Ajouter un commentaire en haut du fichier pour indiquer la migration
  if (!newContent.includes('@core') && !newContent.includes('@shared') && !newContent.includes('@features')) {
    // Rien à faire
  }

  return newContent
}

function createIndexFiles() {
  // Core index
  const coreIndex = `// src/core/index.js
export * from './store'
export * from './services'
export { default as PluginManager, pluginManager } from './plugins/PluginManager'
export { PluginProvider, usePlugins } from './plugins/PluginContext'
export { usePluginPage } from './plugins/hooks/usePluginPage'
export { LanguageProvider, useLanguage } from './i18n/LanguageContext'
`
  fs.writeFileSync(path.join(NEW_CORE, 'index.js'), coreIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_CORE, 'index.js'))}`, 'green')

  // Shared index
  const sharedIndex = `// src/shared/index.js
export * from './components'
export * from './hooks'
export * from './utils'
`
  fs.writeFileSync(path.join(NEW_SHARED, 'index.js'), sharedIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_SHARED, 'index.js'))}`, 'green')

  // Shared components index
  const componentsIndex = `// src/shared/components/index.js
export * from './ui'
export * from './audio'
export * from './navigation'
export * from './settings'
export * from './modals'
`
  fs.writeFileSync(path.join(NEW_SHARED_COMPONENTS, 'index.js'), componentsIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_SHARED_COMPONENTS, 'index.js'))}`, 'green')

  // Features index
  const featuresIndex = `// src/features/index.js
export { default as Home } from './home/Home'
export { default as Discover } from './discover/Discover'
export { default as Editor } from './editor/Editor'
export { default as Sequencer } from './sequencer/Sequencer'
export { default as Trimmer } from './trimmer/Trimmer'
export { default as Options } from './options/Options'
export { default as Guide } from './guide/Guide'
export { default as Stats } from './stats/Stats'
export { default as Presentation } from './presentation/Presentation'
export { default as WelcomeScreen } from './welcome/WelcomeScreen'
`
  fs.writeFileSync(path.join(NEW_FEATURES, 'index.js'), featuresIndex)
  log(`📄 ${path.relative(SRC, path.join(NEW_FEATURES, 'index.js'))}`, 'green')
}

function updateAppImports() {
  const appPath = path.join(SRC, 'App.jsx')
  if (!fs.existsSync(appPath)) {
    log('⚠️ App.jsx non trouvé', 'yellow')
    return
  }

  let content = fs.readFileSync(appPath, 'utf-8')
  
  // Mettre à jour les imports
  content = content.replace(
    /import.*from '\.\/store\/useStore'/g,
    "import { useStore } from '@core/store'"
  )
  content = content.replace(
    /import.*from '\.\/context\/LanguageContext'/g,
    "import { useLanguage } from '@core/i18n/LanguageContext'"
  )
  content = content.replace(
    /import.*from '\.\/core\/PluginContext'/g,
    "import { PluginProvider, usePlugins } from '@core/plugins/PluginContext'"
  )
  content = content.replace(
    /import.*from '\.\/core\/hooks\/usePluginPage'/g,
    "import { usePluginPage } from '@core/plugins/hooks/usePluginPage'"
  )
  
  // Mettre à jour les imports de pages
  content = content.replace(
    /import Home from '\.\/pages\/Home'/g,
    "import Home from '@features/home/Home'"
  )
  content = content.replace(
    /import Options from '\.\/pages\/Options'/g,
    "import Options from '@features/options/Options'"
  )
  content = content.replace(
    /import Trimmer from '\.\/pages\/Trimmer'/g,
    "import Trimmer from '@features/trimmer/Trimmer'"
  )
  content = content.replace(
    /import Editor from '\.\/pages\/editor\/Editor'/g,
    "import Editor from '@features/editor/Editor'"
  )
  content = content.replace(
    /import Sequencer from '\.\/pages\/Sequencer'/g,
    "import Sequencer from '@features/sequencer/Sequencer'"
  )
  content = content.replace(
    /import Guide from '\.\/pages\/Guide'/g,
    "import Guide from '@features/guide/Guide'"
  )
  content = content.replace(
    /import Stats from '\.\/pages\/Stats'/g,
    "import Stats from '@features/stats/Stats'"
  )
  content = content.replace(
    /import Presentation from '\.\/pages\/Presentation'/g,
    "import Presentation from '@features/presentation/Presentation'"
  )
  content = content.replace(
    /import WelcomeScreen from '\.\/pages\/WelcomeScreen'/g,
    "import WelcomeScreen from '@features/welcome/WelcomeScreen'"
  )
  
  // Mettre à jour les imports de composants
  content = content.replace(
    /import Sidebar from '\.\/components\/Sidebar'/g,
    "import Sidebar from '@shared/components/navigation/Sidebar'"
  )
  content = content.replace(
    /import Toast from '\.\/components\/Toast'/g,
    "import Toast from '@shared/components/ui/Toast'"
  )
  content = content.replace(
    /import QuitConfirm from '\.\/components\/QuitConfirm'/g,
    "import QuitConfirm from '@shared/components/modals/QuitConfirm'"
  )
  content = content.replace(
    /import Tutorial from '\.\/components\/Tutorial'/g,
    "import Tutorial from '@shared/components/ui/Tutorial'"
  )
  content = content.replace(
    /import TutorialAdvanced from '\.\/components\/TutorialAdvanced'/g,
    "import TutorialAdvanced from '@shared/components/ui/TutorialAdvanced'"
  )
  
  // Mettre à jour les imports de utils audio
  content = content.replace(
    /import \{ playSound, stopAllSounds, setStoreRef \} from '\.\/utils\/audio'/g,
    "import { playSound, stopAllSounds, setStoreRef } from '@core/services/AudioService'"
  )
  content = content.replace(
    /import \{ warmupAudioContext \} from '\.\/utils\/audioMixer'/g,
    "import { warmupAudioContext } from '@core/services/AudioMixerService'"
  )
  
  fs.writeFileSync(appPath, content, 'utf-8')
  log(`✅ App.jsx mis à jour`, 'green')
}

function updateViteConfig() {
  const vitePath = path.join(ROOT, 'vite.config.js')
  if (!fs.existsSync(vitePath)) {
    log('⚠️ vite.config.js non trouvé', 'yellow')
    return
  }

  let content = fs.readFileSync(vitePath, 'utf-8')
  
  // Vérifier si les alias sont déjà présents
  if (!content.includes('@core')) {
    // Ajouter les alias
    const aliasConfig = `
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
    }
  },`
    
    // Insérer après le plugin react
    content = content.replace(
      /plugins: \[react\([^)]*\)\],/,
      `plugins: [react({
    include: /\\.(js|jsx|ts|tsx)$/,
  })],${aliasConfig}`
    )
    
    fs.writeFileSync(vitePath, content, 'utf-8')
    log(`✅ vite.config.js mis à jour avec les alias`, 'green')
  } else {
    log(`ℹ️ Les alias sont déjà configurés`, 'yellow')
  }
}

// ─── FONCTION PRINCIPALE ──────────────────────────────────────────────────

function main() {
  log('\n═══════════════════════════════════════════════════════════════', 'blue')
  log('     🚀 MIGRATION DE L\'ARCHITECTURE SOUNDDECK', 'bold')
  log('═══════════════════════════════════════════════════════════════', 'blue')
  
  logStep('1', 'Création des nouveaux dossiers...')
  
  // Créer tous les dossiers
  const directories = [
    NEW_CORE,
    NEW_STORE,
    NEW_STORE_SLICES,
    NEW_STORE_MIDDLEWARE,
    NEW_SERVICES,
    NEW_PLUGINS,
    NEW_PLUGINS_HOOKS,
    NEW_I18N,
    NEW_SHARED,
    NEW_SHARED_COMPONENTS,
    NEW_SHARED_COMPONENTS_UI,
    NEW_SHARED_COMPONENTS_AUDIO,
    NEW_SHARED_COMPONENTS_NAVIGATION,
    NEW_SHARED_COMPONENTS_SETTINGS,
    NEW_SHARED_COMPONENTS_MODALS,
    NEW_SHARED_HOOKS,
    NEW_SHARED_UTILS,
    NEW_FEATURES,
    NEW_FEATURES_HOME,
    NEW_FEATURES_DISCOVER,
    NEW_FEATURES_EDITOR,
    NEW_FEATURES_EDITOR_COMPONENTS,
    NEW_FEATURES_EDITOR_CONTEXTS,
    NEW_FEATURES_EDITOR_HOOKS,
    NEW_FEATURES_SEQUENCER,
    NEW_FEATURES_TRIMMER,
    NEW_FEATURES_YOUTUBE,
    NEW_FEATURES_OPTIONS,
    NEW_FEATURES_GUIDE,
    NEW_FEATURES_STATS,
    NEW_FEATURES_PRESENTATION,
    NEW_FEATURES_WELCOME,
  ]
  
  for (const dir of directories) {
    ensureDirectory(dir)
  }
  
  logSuccess('Dossiers créés')
  
  logStep('2', 'Copie des fichiers...')
  
  let successCount = 0
  let failCount = 0
  
  for (const [src, dest] of Object.entries(FILE_MAPPING)) {
    const srcPath = path.join(SRC, src)
    const destPath = path.join(SRC, dest)
    
    if (copyFileWithContent(srcPath, destPath)) {
      successCount++
    } else {
      failCount++
    }
  }
  
  log(`\n📊 Copie terminée: ${successCount} fichiers copiés, ${failCount} échecs`, 'yellow')
  
  logStep('3', 'Création des fichiers index...')
  createIndexFiles()
  
  logStep('4', 'Mise à jour des imports...')
  
  // Mettre à jour App.jsx
  updateAppImports()
  
  // Mettre à jour vite.config.js
  updateViteConfig()
  
  logStep('5', 'Nettoyage des anciens fichiers...')
  
  log('⚠️ Les anciens fichiers ne sont pas supprimés automatiquement.', 'yellow')
  log('   Pour les supprimer manuellement, exécutez:', 'yellow')
  log(`   rm -rf ${path.relative(ROOT, OLD_STORE)}`, 'red')
  log(`   rm -rf ${path.relative(ROOT, OLD_UTILS)}`, 'red')
  log(`   rm -rf ${path.relative(ROOT, OLD_COMPONENTS)}`, 'red')
  log(`   rm -rf ${path.relative(ROOT, OLD_HOOKS)}`, 'red')
  log(`   rm -rf ${path.relative(ROOT, OLD_PAGES)}`, 'red')
  log(`   rm -rf ${path.relative(ROOT, OLD_CONTEXT)}`, 'red')
  
  logStep('6', 'Vérification finale...')
  
  // Vérifier que les fichiers essentiels ont été créés
  const essentialFiles = [
    path.join(NEW_CORE, 'store/useStore.js'),
    path.join(NEW_CORE, 'services/AudioService.js'),
    path.join(NEW_SHARED, 'utils/errorHandler.js'),
    path.join(NEW_FEATURES, 'home/Home.jsx'),
    path.join(NEW_FEATURES, 'editor/Editor.jsx'),
  ]
  
  let allExist = true
  for (const file of essentialFiles) {
    const fullPath = path.join(SRC, file)
    if (fs.existsSync(fullPath)) {
      log(`   ✅ ${file}`, 'green')
    } else {
      log(`   ❌ ${file} manquant`, 'red')
      allExist = false
    }
  }
  
  if (allExist) {
    logSuccess('\n🎉 Migration terminée avec succès !')
  } else {
    logError('\n⚠️ Certains fichiers essentiels sont manquants.')
  }
  
  log('\n📌 Prochaines étapes:', 'blue')
  log('   1. Vérifier que tous les imports sont corrects')
  log('   2. Lancer npm run dev pour tester')
  log('   3. Supprimer les anciens dossiers après validation')
  log('   4. Mettre à jour les imports dans les plugins')
  log('\n')
}

// ─── EXÉCUTION ─────────────────────────────────────────────────────────────

main()