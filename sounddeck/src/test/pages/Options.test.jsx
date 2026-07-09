import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Options from './Options'

// ✅ Mock de useTranslation complet
vi.mock('../i18n', () => ({
  useTranslation: vi.fn(() => (key) => {
    const translations = {
      optionsTitle: 'Options',
      optionsAppearance: 'Apparence',
      optionsAudio: 'Audio',
      optionsShortcuts: 'Raccourcis',
      optionsBackup: 'Sauvegarde',
      optionsProfiles: 'Profils',
      language: 'Langue',
      theme: 'Thème',
      themeDark: 'Sombre',
      themeLight: 'Clair',
      themeBlue: 'Bleu',
      themeCustom: 'Personnalisé',
      audioMode: 'Mode audio',
      audioModeDesc: "Comment SoundDeck envoie l'audio",
      audioModeSimple: 'Simple (VB-Cable)',
      audioModeAdvanced: 'Avancé (VoiceMeeter)',
      virtualDriver: 'Pilote audio virtuel',
      virtualDriverSub: 'Nécessaire pour Discord',
      installVirtualDriver: 'Installer VB-Cable',
      installing: 'Installation...',
      outputDevice: 'Périphérique de sortie',
      outputDeviceDesc: 'Sélectionner le câble virtuel pour Discord',
      outputDeviceDefault: 'Par défaut',
      outputDeviceLabel: 'Périphérique',
      playLocally: 'Jouer en local aussi',
      playLocallyDesc: 'Entendre les sons sur votre propre PC',
      mixerEnable: 'Mixeur micro + sons',
      mixerEnableDesc: 'Mélange ton micro avec les sons',
      normalization: 'Normalisation',
      normalizationDesc: 'Égalise le volume des sons automatiquement',
      exportLabel: 'Exporter',
      importLabel: 'Importer',
      exportSectionLabel: 'Exporter',
      importSectionLabel: 'Importer',
      configOnly: 'Config seule',
      configOnlyDesc: 'Profils, raccourcis, thème · Fichier JSON léger',
      fullArchive: 'Archive complète',
      fullArchiveDesc: 'Config + tous les sons · Fichier ZIP (peut être lourd)',
      soundsOnly: 'Sons uniquement',
      soundsOnlyDesc: 'Tous les fichiers audio · ZIP sans config',
      importBackup: 'Importer une sauvegarde',
      importBackupDesc: 'JSON ou ZIP — détection automatique du format',
      restartNote: 'Un redémarrage est nécessaire après l\'import',
      toastCustomThemeApplied: 'Thème personnalisé appliqué !',
      toastConfigExported: 'Configuration exportée ✓',
      toastArchiveCreating: 'Création de l\'archive en cours...',
      toastSoundsCompressing: 'Compression des sons en cours...',
      profileExported: 'Profil exporté',
      profileImported: 'Profil importé',
      profileDeleted: 'Profil supprimé',
      toastProfileExporting: 'Création de l\'archive du profil...',
      virtualDriverDetected: '✅ Pilote VB-Cable installé !',
      virtualDriverNotDetected: 'Aucun périphérique virtuel détecté',
      virtualDriverInfo: 'Installe automatiquement le pilote VB-Cable',
      virtualDriverSuccess: '✅ Pilote VB-Cable installé !',
      uninstallGuideTitle: '📌 Si tu as besoin de désinstaller VB-Cable',
      uninstallGuideStep1: 'Va dans Panneau de configuration → Programmes → Désinstaller un programme',
      uninstallGuideStep2: 'Cherche "VB-CABLE" et désinstalle-le.',
      uninstallGuideRestart: '⚠️ Un redémarrage du PC peut être nécessaire',
      localOutputDevice: 'Périphérique de sortie local',
      localOutputDeviceDesc: 'Périphérique utilisé pour l\'écoute locale (casque)',
      localOutputDeviceDefault: 'Par défaut',
      localOutputDeviceChanged: 'Périphérique local changé : {device}',
      keyboardLayout: 'Disposition du clavier',
      keyboardLayoutDesc: 'Sélectionnez votre type de clavier',
      switchProfile: 'Changer de profil',
      switchProfileDesc: 'Cycle entre vos profils',
      toggleLoop: 'Activer/désactiver le Loop',
      toggleLoopDesc: 'Active le mode répétition pour tous les sons',
      stopAllShortcut: 'Stop tous les sons',
      stopAllDesc: 'Coupe immédiatement tous les sons en cours',
      presentationShortcut: 'Mode présentation',
      presentationDesc: 'Ouvre/ferme le mode présentation plein écran',
      toggleShortcuts: 'Toggle raccourcis',
      toggleShortcutsDesc: 'Activer/désactiver tous les raccourcis globaux',
      toggleWindowShortcut: 'Afficher/cacher la fenêtre',
      toggleWindowShortcutDesc: 'Raccourci pour montrer ou cacher la fenêtre de SoundDeck',
      shortcutPlaceholder: '+ Raccourci',
      shortcutPressKey: '⌨️ Appuyez sur une touche...',
      shortcutNeedMod: '⚠️ Ajoutez Ctrl/Alt/Shift',
      shortcutHintMod: 'Combinaison requise (ex: Ctrl+Shift+P)',
      shortcutHintAny: 'Une touche ou une combinaison (ex: F1, Ctrl+1)',
      shortcutsPerSoundNote: 'Les raccourcis par son se configurent directement sur chaque carte de son',
      restartRequired: 'redémarre l\'app',
      configImported: 'Config importée',
      archiveImported: 'Archive importée',
      error: 'Erreur',
      exported: 'exportés',
      archiveCreated: 'Archive créée',
      detect: 'Détecter',
      unknown: 'Inconnue',
      installError: 'Erreur installation',
      driverInstalled: 'Pilote VB-Cable installé avec succès !',
      downloadingDriver: 'Téléchargement du pilote VB-Cable...',
      allSounds: 'Tous les sons',
      sounds: 'son(s)',
      exportProfile: 'Exporter',
      importProfile: 'Importer un profil partagé',
      reanalyzeGains: 'Réanalyser les gains',
      reanalyzeGainsDesc: 'Force la réanalyse des niveaux sonores',
      gainCacheCleared: 'Cache des gains vidé',
      normalizationTarget: 'Seuil de normalisation',
      normalizationTargetDesc: 'Plus la valeur est élevée, plus les sons sont amplifiés',
      normalizationLabelLow: 'Plus fort 🔈',
      normalizationLabelMedium: 'Équilibre ⚖️',
      normalizationLabelHigh: 'Plus faible 🔉',
      normalizationDefaultLabel: 'Par défaut',
      normalizationAdvice: 'Conseil :',
      normalizationAdviceLow: '🔈 Sons très réduits',
      normalizationAdviceMedium: '⚖️ Équilibre par défaut',
      normalizationAdviceModerate: '🔊 Sons modérément amplifiés',
      normalizationAdviceHigh: '🔊🔊 Sons fortement amplifiés',
      noiseSuppressionMode: 'Mode de réduction de bruit',
      noiseSuppressionModeDesc: 'AudioWorklet = plus efficace, Filtre = plus compatible',
      noiseSuppressionModeAuto: 'Auto (recommandé)',
      noiseSuppressionModeWorklet: 'AudioWorklet (meilleur)',
      noiseSuppressionModeFilter: 'Filtre basique (compatible)',
      noiseSuppressionModeOff: 'Désactivé',
      microphone: 'Micro',
      microphoneSelect: 'Sélectionne ton micro',
      microphoneDefault: 'Micro par défaut',
      microphoneLabel: 'Micro',
      microphoneChanged: 'Micro changé',
      microphoneVolume: 'Volume du micro',
      mixerSoundVolume: 'Volume des sons',
      testMicrophone: 'Tester le micro',
      test: 'Tester',
      reconnectFlow: 'Reconnecter le flux',
      reconnectFlowDesc: 'Force la reconnexion du flux au périphérique de sortie',
      reconnect: 'Reconnecter',
      mixerStatus: 'État du mixeur',
      mixerStatusSub: 'Vérifier et réparer si nécessaire',
      mixerOperational: 'Mixeur opérationnel',
      mixerNotOperational: 'Mixeur non opérationnel',
      mixerRepair: 'Vérifier/Réparer',
      mixerRepaired: '✅ Mixeur réparé avec succès',
      mixerReset: '🔄 Réinitialisation du mixeur...',
      mixerResetSuccess: '✅ Mixeur réinitialisé avec succès',
      mixerRepairError: '❌ Erreur: {error}',
      mixerActivated: 'Mixeur activé !',
      mixerActivationError: 'Erreur activation du mixeur',
      mixerDeactivated: 'Mixeur désactivé',
      mixerActive: 'Mixage actif',
      mixerActiveDesc: 'Ton micro et les sons sont mélangés dans un seul flux.',
      mixerDiscordTip: '📌 Dans Discord, sélectionne "CABLE Output" comme périphérique d\'entrée.',
      mixerNotInitialized: 'Mixeur non initialisé',
      flowReconnected: 'Flux reconnecté',
      noiseSuppressionActivated: '🔇 Réduction de bruit activée',
      noiseSuppressionDeactivated: '🔊 Réduction de bruit désactivée',
      noiseSuppressionModeChanged: 'Mode réduction de bruit: {mode}',
      close: 'Fermer',
      cancel: 'Annuler',
      add: 'Ajouter',
      download: 'Télécharger',
      toastShortcutSet: 'Raccourci défini :',
      toastShortcutLoop: 'Raccourci loop :',
      toastShortcutStop: 'Raccourci stop :',
      toastShortcutPresentation: 'Raccourci présentation :',
      toggleShortcutSet: 'Raccourci toggle défini :',
      toggleShortcutRemoved: 'Raccourci toggle supprimé',
      toggleWindowShortcutSet: 'Raccourci fenêtre défini :',
      toggleWindowShortcutRemoved: 'Raccourci fenêtre supprimé',
      volumeDefault: '(par défaut)',
      volumeReset: 'Réinitialiser le volume',
      reset: '0 dB',
      sidebarDefault: 'Par défaut',
      sidebarCustomized: 'Personnalisé',
      sidebarCustomization: 'Personnaliser la sidebar',
      sidebarCustomizationDesc: 'Réorganisez, épinglez ou masquez les éléments',
      sidebarEditorOpen: 'Personnaliser',
      sidebarEditorClose: 'Fermer l\'éditeur',
      sidebarEditorSaved: '✅ Configuration de la sidebar sauvegardée !',
      sidebarEditorResetConfirm: 'Voulez-vous vraiment réinitialiser la sidebar à sa configuration par défaut ?',
      sidebarEditorReset: 'Réinitialiser',
      sidebarEditorResetSuccess: '✅ Sidebar réinitialisée',
      toastConfigExported: 'Configuration exportée ✓',
      toastArchiveCreating: 'Création de l\'archive en cours...',
      toastSoundsCompressing: 'Compression des sons en cours...',
      toastProfileExporting: 'Création de l\'archive du profil...',
      virtualDriverDetected: '✅ Pilote VB-Cable installé !',
      virtualDriverNotDetected: 'Aucun périphérique virtuel détecté',
      virtualDriverInfo: 'Installe automatiquement le pilote VB-Cable',
      virtualDriverSuccess: '✅ Pilote VB-Cable installé !',
      uninstallGuideTitle: '📌 Si tu as besoin de désinstaller VB-Cable',
      uninstallGuideStep1: 'Va dans Panneau de configuration → Programmes → Désinstaller un programme',
      uninstallGuideStep2: 'Cherche "VB-CABLE" et désinstalle-le.',
      uninstallGuideRestart: '⚠️ Un redémarrage du PC peut être nécessaire',
      localOutputDevice: 'Périphérique de sortie local',
      localOutputDeviceDesc: 'Périphérique utilisé pour l\'écoute locale (casque)',
      localOutputDeviceDefault: 'Par défaut',
      localOutputDeviceChanged: 'Périphérique local changé : {device}',
      keyboardLayout: 'Disposition du clavier',
      keyboardLayoutDesc: 'Sélectionnez votre type de clavier',
      switchProfile: 'Changer de profil',
      switchProfileDesc: 'Cycle entre vos profils',
      toggleLoop: 'Activer/désactiver le Loop',
      toggleLoopDesc: 'Active le mode répétition pour tous les sons',
      stopAllShortcut: 'Stop tous les sons',
      stopAllDesc: 'Coupe immédiatement tous les sons en cours',
      presentationShortcut: 'Mode présentation',
      presentationDesc: 'Ouvre/ferme le mode présentation plein écran',
      toggleShortcuts: 'Toggle raccourcis',
      toggleShortcutsDesc: 'Activer/désactiver tous les raccourcis globaux',
      toggleWindowShortcut: 'Afficher/cacher la fenêtre',
      toggleWindowShortcutDesc: 'Raccourci pour montrer ou cacher la fenêtre de SoundDeck',
      shortcutPlaceholder: '+ Raccourci',
      shortcutPressKey: '⌨️ Appuyez sur une touche...',
      shortcutNeedMod: '⚠️ Ajoutez Ctrl/Alt/Shift',
      shortcutHintMod: 'Combinaison requise (ex: Ctrl+Shift+P)',
      shortcutHintAny: 'Une touche ou une combinaison (ex: F1, Ctrl+1)',
      shortcutsPerSoundNote: 'Les raccourcis par son se configurent directement sur chaque carte de son',
      restartRequired: 'redémarre l\'app',
      configImported: 'Config importée',
      archiveImported: 'Archive importée',
      error: 'Erreur',
      exported: 'exportés',
      archiveCreated: 'Archive créée',
      detect: 'Détecter',
      unknown: 'Inconnue',
      installError: 'Erreur installation',
      driverInstalled: 'Pilote VB-Cable installé avec succès !',
      downloadingDriver: 'Téléchargement du pilote VB-Cable...',
      allSounds: 'Tous les sons',
      sounds: 'son(s)',
      exportProfile: 'Exporter',
      importProfile: 'Importer un profil partagé',
      reanalyzeGains: 'Réanalyser les gains',
      reanalyzeGainsDesc: 'Force la réanalyse des niveaux sonores',
      gainCacheCleared: 'Cache des gains vidé',
      normalizationTarget: 'Seuil de normalisation',
      normalizationTargetDesc: 'Plus la valeur est élevée, plus les sons sont amplifiés',
      normalizationLabelLow: 'Plus fort 🔈',
      normalizationLabelMedium: 'Équilibre ⚖️',
      normalizationLabelHigh: 'Plus faible 🔉',
      normalizationDefaultLabel: 'Par défaut',
      normalizationAdvice: 'Conseil :',
      normalizationAdviceLow: '🔈 Sons très réduits',
      normalizationAdviceMedium: '⚖️ Équilibre par défaut',
      normalizationAdviceModerate: '🔊 Sons modérément amplifiés',
      normalizationAdviceHigh: '🔊🔊 Sons fortement amplifiés',
      noiseSuppressionMode: 'Mode de réduction de bruit',
      noiseSuppressionModeDesc: 'AudioWorklet = plus efficace, Filtre = plus compatible',
      noiseSuppressionModeAuto: 'Auto (recommandé)',
      noiseSuppressionModeWorklet: 'AudioWorklet (meilleur)',
      noiseSuppressionModeFilter: 'Filtre basique (compatible)',
      noiseSuppressionModeOff: 'Désactivé',
      microphone: 'Micro',
      microphoneSelect: 'Sélectionne ton micro',
      microphoneDefault: 'Micro par défaut',
      microphoneLabel: 'Micro',
      microphoneChanged: 'Micro changé',
      microphoneVolume: 'Volume du micro',
      mixerSoundVolume: 'Volume des sons',
      testMicrophone: 'Tester le micro',
      test: 'Tester',
      reconnectFlow: 'Reconnecter le flux',
      reconnectFlowDesc: 'Force la reconnexion du flux au périphérique de sortie',
      reconnect: 'Reconnecter',
      mixerStatus: 'État du mixeur',
      mixerStatusSub: 'Vérifier et réparer si nécessaire',
      mixerOperational: 'Mixeur opérationnel',
      mixerNotOperational: 'Mixeur non opérationnel',
      mixerRepair: 'Vérifier/Réparer',
      mixerRepaired: '✅ Mixeur réparé avec succès',
      mixerReset: '🔄 Réinitialisation du mixeur...',
      mixerResetSuccess: '✅ Mixeur réinitialisé avec succès',
      mixerRepairError: '❌ Erreur: {error}',
      mixerActivated: 'Mixeur activé !',
      mixerActivationError: 'Erreur activation du mixeur',
      mixerDeactivated: 'Mixeur désactivé',
      mixerActive: 'Mixage actif',
      mixerActiveDesc: 'Ton micro et les sons sont mélangés dans un seul flux.',
      mixerDiscordTip: '📌 Dans Discord, sélectionne "CABLE Output" comme périphérique d\'entrée.',
      mixerNotInitialized: 'Mixeur non initialisé',
      flowReconnected: 'Flux reconnecté',
      noiseSuppressionActivated: '🔇 Réduction de bruit activée',
      noiseSuppressionDeactivated: '🔊 Réduction de bruit désactivée',
      noiseSuppressionModeChanged: 'Mode réduction de bruit: {mode}',
      close: 'Fermer',
      cancel: 'Annuler',
      add: 'Ajouter',
      download: 'Télécharger',
      toastShortcutSet: 'Raccourci défini :',
      toastShortcutLoop: 'Raccourci loop :',
      toastShortcutStop: 'Raccourci stop :',
      toastShortcutPresentation: 'Raccourci présentation :',
      toggleShortcutSet: 'Raccourci toggle défini :',
      toggleShortcutRemoved: 'Raccourci toggle supprimé',
      toggleWindowShortcutSet: 'Raccourci fenêtre défini :',
      toggleWindowShortcutRemoved: 'Raccourci fenêtre supprimé',
      volumeDefault: '(par défaut)',
      volumeReset: 'Réinitialiser le volume',
      reset: '0 dB'
    }
    return translations[key] || key
  }),
  LANGUAGES: [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ]
}))

vi.mock('../components/ShortcutRecorder', () => ({
  default: ({ value, onSave, onClear }) => (
    <div data-testid="shortcut-recorder">
      <span>{value || 'Aucun raccourci'}</span>
      <button onClick={() => onSave('Ctrl+Shift+1')}>Enregistrer</button>
      <button onClick={() => onClear()}>Effacer</button>
    </div>
  )
}))

vi.mock('../components/CustomThemeEditor', () => ({
  default: ({ current, onSave }) => (
    <div data-testid="custom-theme-editor">
      <button onClick={() => onSave({ accent: '#ff0000' })}>Appliquer</button>
    </div>
  )
}))

vi.mock('../components/KeyboardVisualizer', () => ({
  default: () => <div data-testid="keyboard-visualizer">Visualisation clavier</div>
}))

vi.mock('../components/SidebarEditor', () => ({
  default: ({ config, onSave, onCancel, onReset }) => (
    <div data-testid="sidebar-editor">
      <button data-testid="sidebar-save" onClick={() => onSave({ ...config, mode: 'custom' })}>
        Enregistrer
      </button>
      <button data-testid="sidebar-cancel" onClick={onCancel}>Annuler</button>
      <button data-testid="sidebar-reset" onClick={onReset}>Réinitialiser</button>
    </div>
  )
}))

vi.mock('../utils/audioMixer', () => ({
  getMicrophoneStatus: vi.fn(() => ({ isConnected: false })),
  getMixerStats: vi.fn(() => ({ isInitialized: false })),
  testMicrophoneOnce: vi.fn().mockResolvedValue({ success: true, deviceName: 'Test Mic' }),
  connectMixerToOutput: vi.fn(() => true),
  repairMixer: vi.fn(() => true),
  isMixerOperational: vi.fn(() => true),
  stopMixer: vi.fn().mockResolvedValue(),
  initAudioMixer: vi.fn().mockResolvedValue({}),
  resumeAudioContext: vi.fn(),
  setNoiseSuppressionMode: vi.fn(),
  setMicrophoneVolume: vi.fn(),
  setSoundVolume: vi.fn(),
  changeMicrophone: vi.fn().mockResolvedValue(true)
}))

// ✅ Mock de IntersectionObserver simplifié
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
    this.observe = vi.fn((element) => {
      if (this.callback) {
        this.callback([
          {
            target: element,
            intersectionRatio: 0.5,
            isIntersecting: true
          }
        ])
      }
    })
    this.unobserve = vi.fn()
    this.disconnect = vi.fn()
  }
}
global.IntersectionObserver = MockIntersectionObserver

describe('Options', () => {
  const mockStore = {
    lang: 'fr',
    theme: 'dark',
    customTheme: null,
    audioMode: 'simple',
    virtualDriverInstalled: false,
    audioDevice: 'default',
    playLocally: true,
    mixerEnabled: false,
    noiseSuppressionMode: 'auto',
    normalizationEnabled: true,
    normalizationTarget: 0.2,
    microphoneDevice: 'default',
    microphoneVolume: 80,
    mixerSoundVolume: 100,
    localAudioDevice: 'default',
    keyboardLayout: 'qwerty',
    volume: 80,
    shortcuts: {},
    profileShortcut: '',
    loopShortcut: '',
    stopAllShortcut: '',
    presentationShortcut: '',
    toggleShortcutsAccelerator: 'CommandOrControl+Shift+K',
    toggleWindowShortcut: 'CommandOrControl+Shift+S',
    sounds: [],
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true },
      { id: 'profile1', name: 'Test Profile', isDefault: false }
    ],
    sidebarConfig: {
      mode: 'default',
      items: [],
      sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
    },
    sidebarEditMode: false,
    sidebarVersion: 0,
    updateLang: vi.fn(),
    updateTheme: vi.fn(),
    updateCustomTheme: vi.fn(),
    updateAudioMode: vi.fn(),
    updateVirtualDriverInstalled: vi.fn(),
    updateAudioDevice: vi.fn(),
    updatePlayLocally: vi.fn(),
    updateMixerEnabled: vi.fn(),
    updateNoiseSuppressionMode: vi.fn(),
    updateNormalizationEnabled: vi.fn(),
    updateNormalizationTarget: vi.fn(),
    updateMicrophoneDeviceId: vi.fn(),
    updateMicrophoneVolume: vi.fn(),
    updateMixerSoundVolume: vi.fn(),
    updateLocalAudioDevice: vi.fn(),
    updateKeyboardLayout: vi.fn(),
    updateProfileShortcut: vi.fn(),
    updateLoopShortcut: vi.fn(),
    updateStopAllShortcut: vi.fn(),
    updatePresentationShortcut: vi.fn(),
    updateToggleShortcutsAccelerator: vi.fn(),
    updateToggleWindowShortcut: vi.fn(),
    resetGainCache: vi.fn(),
    deleteProfile: vi.fn(),
    switchProfile: vi.fn(),
    updateSound: vi.fn(),
    addSound: vi.fn(),
    updateSidebarConfig: vi.fn(),
    resetSidebarConfig: vi.fn(),
    toggleSidebarEditMode: vi.fn()
  }

  const defaultProps = {
    store: mockStore,
    addToast: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.installVirtualDriver = vi.fn().mockResolvedValue({ success: true })
    window.electronAPI.exportConfig = vi.fn().mockResolvedValue({ success: true })
    window.electronAPI.exportFull = vi.fn().mockResolvedValue({ success: true, sizeMb: '5.6' })
    window.electronAPI.exportSoundsOnly = vi.fn().mockResolvedValue({ success: true, sizeMb: '4.2' })
    window.electronAPI.importBackup = vi.fn().mockResolvedValue({ success: true, type: 'json' })
    window.electronAPI.exportProfile = vi.fn().mockResolvedValue({ success: true, soundCount: 5, sizeMb: '1.2' })
    window.electronAPI.importProfile = vi.fn().mockResolvedValue({ success: true, profileName: 'Imported', soundCount: 3 })
    window.electronAPI.updateShortcuts = vi.fn().mockResolvedValue()
    global.IntersectionObserver.mockClear?.()
    Element.prototype.scrollIntoView = vi.fn()
  })

  const renderOptions = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Options {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  const goToSection = async (sectionName) => {
    const tab = screen.getByRole('button', { name: sectionName })
    await act(async () => {
      await userEvent.click(tab)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  }

  it('devrait afficher le titre Options', async () => {
    await renderOptions()
    expect(screen.getByText('Options')).toBeInTheDocument()
  })

  it('devrait afficher les sections de navigation', async () => {
    await renderOptions()
    expect(screen.getAllByText('Apparence').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Audio').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Raccourcis').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sauvegarde').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Profils').length).toBeGreaterThan(0)
  })

  it('devrait afficher les options de langue', async () => {
    await renderOptions()
    expect(screen.getByText('Français')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('devrait changer de langue', async () => {
    await renderOptions()
    const englishButton = screen.getByText('English')
    await act(async () => {
      await userEvent.click(englishButton)
    })
    expect(mockStore.updateLang).toHaveBeenCalledWith('en')
  })

  it('devrait afficher les options de thème', async () => {
    await renderOptions()
    expect(screen.getByText('Sombre')).toBeInTheDocument()
    expect(screen.getByText('Clair')).toBeInTheDocument()
    expect(screen.getByText('Bleu')).toBeInTheDocument()
    expect(screen.getByText('Personnalisé')).toBeInTheDocument()
  })

  it('devrait changer de thème', async () => {
    await renderOptions()
    const lightButton = screen.getByText('Clair')
    await act(async () => {
      await userEvent.click(lightButton)
    })
    expect(mockStore.updateTheme).toHaveBeenCalledWith('light')
  })

  it('devrait afficher l\'éditeur de thème personnalisé quand le thème est "custom"', async () => {
    const storeWithCustomTheme = {
      ...mockStore,
      theme: 'custom',
      customTheme: { accent: '#7C6FF7' }
    }
    await renderOptions({ store: storeWithCustomTheme })
    expect(screen.getByTestId('custom-theme-editor')).toBeInTheDocument()
  })

  it('devrait afficher les options audio', async () => {
    await renderOptions()
    await goToSection('Audio')
    expect(screen.getByText('Mode audio')).toBeInTheDocument()
    expect(screen.getByText('Périphérique de sortie')).toBeInTheDocument()
    expect(screen.getByText('Jouer en local aussi')).toBeInTheDocument()
  })

  it('devrait changer le mode audio', async () => {
    await renderOptions()
    
    const audioTab = screen.getByRole('button', { name: 'Audio' })
    await act(async () => {
      await userEvent.click(audioTab)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
    })
    
    const audioModeLabel = screen.getByText('Mode audio')
    const optionRow = audioModeLabel.closest('.option-row')
    const audioModeSelect = optionRow?.querySelector('select')
    
    expect(audioModeSelect).toBeInTheDocument()
    expect(audioModeSelect).toHaveValue('simple')
    
    await act(async () => {
      fireEvent.change(audioModeSelect, { target: { value: 'advanced' } })
    })
    
    expect(mockStore.updateAudioMode).toHaveBeenCalledWith('advanced')
  })

  it('devrait afficher le bouton "Installer VB-Cable" quand le driver n\'est pas installé', async () => {
    await renderOptions()
    await goToSection('Audio')
    expect(screen.getByText('Installer VB-Cable')).toBeInTheDocument()
  })

  it('devrait afficher "Pilote détecté" quand le driver est installé', async () => {
    const storeWithDriver = {
      ...mockStore,
      virtualDriverInstalled: true
    }
    await renderOptions({ store: storeWithDriver })
    await goToSection('Audio')
    expect(screen.getByText('✅ Pilote VB-Cable installé !')).toBeInTheDocument()
  })

  it('devrait afficher les options de sauvegarde', async () => {
    await renderOptions()
    await goToSection('Sauvegarde')
    expect(screen.getAllByText('Exporter').length).toBeGreaterThan(0)
    expect(screen.getByText('Config seule')).toBeInTheDocument()
    expect(screen.getByText('Archive complète')).toBeInTheDocument()
    expect(screen.getByText('Sons uniquement')).toBeInTheDocument()
    expect(screen.getAllByText('Importer').length).toBeGreaterThan(0)
  })

  it('devrait exporter la configuration', async () => {
    await renderOptions()
    await goToSection('Sauvegarde')
    
    const configOnlyRow = screen.getByText('Config seule').closest('.option-row')
    const exportButton = configOnlyRow?.querySelector('button')
    
    expect(exportButton).toBeTruthy()
    
    await act(async () => {
      await userEvent.click(exportButton)
    })
    
    await waitFor(() => {
      expect(window.electronAPI.exportConfig).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher les profils', async () => {
    await renderOptions()
    await goToSection('Profils')
    expect(screen.getByText('Tous les sons')).toBeInTheDocument()
    expect(screen.getByText('Test Profile')).toBeInTheDocument()
  })

  it('devrait supprimer un profil', async () => {
    const storeWithDelete = {
      ...mockStore,
      deleteProfile: vi.fn().mockResolvedValue(),
      profiles: [
        { id: 'all', name: 'Tous les sons', isDefault: true },
        { id: 'profile1', name: 'Test Profile', isDefault: false },
        { id: 'profile2', name: 'Profile 2', isDefault: false }
      ],
      sounds: []
    }
    const addToast = vi.fn()
    await renderOptions({ store: storeWithDelete, addToast })
    await goToSection('Profils')
    
    // ✅ Trouver le bouton de suppression par son icône
    const deleteButtons = document.querySelectorAll('.btn-danger')
    expect(deleteButtons.length).toBeGreaterThan(0)
    
    if (deleteButtons.length > 0) {
      // ✅ Simuler la confirmation de suppression
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      await act(async () => {
        await userEvent.click(deleteButtons[0])
      })
      
      await waitFor(() => {
        expect(storeWithDelete.deleteProfile).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      confirmSpy.mockRestore()
    }
  })

  it('devrait afficher les raccourcis', async () => {
    await renderOptions()
    await goToSection('Raccourcis')
    expect(screen.getByTestId('keyboard-visualizer')).toBeInTheDocument()
    expect(screen.getAllByTestId('shortcut-recorder').length).toBeGreaterThan(0)
  })

  it('devrait afficher l\'éditeur de sidebar quand le mode édition est activé', async () => {
    const storeWithEditMode = {
      ...mockStore,
      sidebarEditMode: true,
      sidebarConfig: {
        mode: 'default',
        items: [],
        sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
      }
    }
    await renderOptions({ store: storeWithEditMode })
    expect(screen.getByTestId('sidebar-editor')).toBeInTheDocument()
  })

  it('devrait sauvegarder la sidebar', async () => {
    const storeWithEditMode = {
      ...mockStore,
      sidebarEditMode: true,
      sidebarConfig: {
        mode: 'default',
        items: [],
        sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
      },
      updateSidebarConfig: vi.fn().mockResolvedValue(),
      toggleSidebarEditMode: vi.fn()
    }
    const addToast = vi.fn()
    await renderOptions({ store: storeWithEditMode, addToast })
    
    const saveButton = screen.getByTestId('sidebar-save')
    await act(async () => {
      await userEvent.click(saveButton)
    })
    
    await waitFor(() => {
      expect(storeWithEditMode.updateSidebarConfig).toHaveBeenCalled()
      expect(storeWithEditMode.toggleSidebarEditMode).toHaveBeenCalled()
      expect(addToast).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('devrait afficher le bouton "Par défaut" quand la sidebar n\'est pas personnalisée', async () => {
    await renderOptions()
    expect(screen.getByText('📋 Par défaut')).toBeInTheDocument()
  })

  it('devrait afficher "Personnalisé" quand la sidebar est personnalisée', async () => {
    const storeWithCustom = {
      ...mockStore,
      sidebarConfig: {
        mode: 'custom',
        items: [],
        sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
      }
    }
    await renderOptions({ store: storeWithCustom })
    expect(screen.getByText('🎨 Personnalisé')).toBeInTheDocument()
  })

  it('devrait basculer le mode édition de la sidebar', async () => {
    const toggleSidebarEditMode = vi.fn()
    const storeWithToggle = {
      ...mockStore,
      toggleSidebarEditMode
    }
    await renderOptions({ store: storeWithToggle })
    
    const customizeButton = screen.getByText('Personnaliser')
    await act(async () => {
      await userEvent.click(customizeButton)
    })
    
    expect(toggleSidebarEditMode).toHaveBeenCalled()
  })
})