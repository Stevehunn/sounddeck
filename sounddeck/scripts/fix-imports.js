// scripts/fix-imports.js
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../src')

// Mapping des anciens imports vers les nouveaux
const importMap = {
  // Context
  "from '../context/LanguageContext'": "from '@core/i18n/LanguageContext'",
  "from '../../context/LanguageContext'": "from '@core/i18n/LanguageContext'",
  "from '../../../context/LanguageContext'": "from '@core/i18n/LanguageContext'",
  "from './context/LanguageContext'": "from '@core/i18n/LanguageContext'",
  
  // Components
  "from '../components/SoundCard'": "from '@shared/components/audio/SoundCard'",
  "from '../components/AudioTrimmer'": "from '@shared/components/audio/AudioTrimmer'",
  "from '../components/AudioVisualizer'": "from '@shared/components/audio/AudioVisualizer'",
  "from '../components/Waveform'": "from '@shared/components/audio/Waveform'",
  "from '../components/VirtualizedSoundGrid'": "from '@shared/components/audio/VirtualizedSoundGrid'",
  "from '../components/Sidebar'": "from '@shared/components/navigation/Sidebar'",
  "from '../components/SidebarEditor'": "from '@shared/components/navigation/SidebarEditor'",
  "from '../components/ThemeToggle'": "from '@shared/components/ui/ThemeToggle'",
  "from '../components/CustomThemeEditor'": "from '@shared/components/ui/CustomThemeEditor'",
  "from '../components/CardSizeSelector'": "from '@shared/components/ui/CardSizeSelector'",
  "from '../components/DropIndicator'": "from '@shared/components/ui/DropIndicator'",
  "from '../components/Toast'": "from '@shared/components/ui/Toast'",
  "from '../components/Tutorial'": "from '@shared/components/ui/Tutorial'",
  "from '../components/TutorialAdvanced'": "from '@shared/components/ui/TutorialAdvanced'",
  "from '../components/BackupSettings'": "from '@shared/components/settings/BackupSettings'",
  "from '../components/OBSControl'": "from '@shared/components/settings/OBSControl'",
  "from '../components/TwitchAlerts'": "from '@shared/components/settings/TwitchAlerts'",
  "from '../components/PluginInstaller'": "from '@shared/components/settings/PluginInstaller'",
  "from '../components/KeyboardVisualizer'": "from '@shared/components/settings/KeyboardVisualizer'",
  "from '../components/ShortcutRecorder'": "from '@shared/components/settings/ShortcutRecorder'",
  "from '../components/ConfirmModal'": "from '@shared/components/modals/ConfirmModal'",
  "from '../components/QuitConfirm'": "from '@shared/components/modals/QuitConfirm'",
  "from '../components/FeedbackModal'": "from '@shared/components/modals/FeedbackModal'",
  "from '../components/ProfileManagerModal'": "from '@shared/components/modals/ProfileManagerModal'",
  
  // Hooks
  "from '../hooks/useConfirm'": "from '@shared/hooks/useConfirm'",
  "from '../../hooks/useConfirm'": "from '@shared/hooks/useConfirm'",
  "from '../../../hooks/useConfirm'": "from '@shared/hooks/useConfirm'",
  
  // Utils
  "from '../utils/audio'": "from '@core/services/AudioService'",
  "from '../../utils/audio'": "from '@core/services/AudioService'",
  "from '../../../utils/audio'": "from '@core/services/AudioService'",
  "from '../utils/audioMixer'": "from '@core/services/AudioMixerService'",
  "from '../../utils/audioMixer'": "from '@core/services/AudioMixerService'",
  "from '../../../utils/audioMixer'": "from '@core/services/AudioMixerService'",
  "from '../utils/mixdown'": "from '@shared/utils/mixdown'",
  "from '../../utils/mixdown'": "from '@shared/utils/mixdown'",
  "from '../utils/waveformGenerator'": "from '@shared/utils/waveformGenerator'",
  "from '../../utils/waveformGenerator'": "from '@shared/utils/waveformGenerator'",
  "from '../utils/normalizeUtils'": "from '@shared/utils/normalizeUtils'",
  "from '../utils/crossfade'": "from '@shared/utils/crossfade'",
  "from '../utils/audioConverter'": "from '@shared/utils/audioConverter'",
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    let hasChanges = false
    
    for (const [oldImport, newImport] of Object.entries(importMap)) {
      if (content.includes(oldImport)) {
        content = content.replaceAll(oldImport, newImport)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✅ Fixé: ${path.relative(SRC, filePath)}`)
      return true
    }
    return false
  } catch (e) {
    console.error(`❌ Erreur: ${path.relative(SRC, filePath)} - ${e.message}`)
    return false
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir)
  let fixed = 0
  
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        fixed += walkDir(fullPath)
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      if (fixFile(fullPath)) {
        fixed++
      }
    }
  }
  
  return fixed
}

console.log('🔧 Correction des imports...')
const fixed = walkDir(SRC)
console.log(`✅ ${fixed} fichiers corrigés`)