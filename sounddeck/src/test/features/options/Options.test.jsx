// src/test/features/options/Options.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve(true)),
  scrollToSection: vi.fn(),
  handleInstallDriver: vi.fn(),
  handleDetectDevices: vi.fn(),
  testMicrophone: vi.fn(),
  loadPlugins: vi.fn(),
  handlePluginUninstall: vi.fn(),
  handlePluginEnable: vi.fn(),
  stopMixer: vi.fn(),
  isMixerActive: vi.fn(() => false),
  clearAllErrorLogs: vi.fn(),
  changeLanguage: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
    changeLanguage: mocks.changeLanguage,
  }),
}))

vi.mock('@shared/hooks/useConfirm', () => ({
  default: () => ({
    confirm: mocks.confirm,
    ConfirmWrapper: () => null,
  }),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  stopMixer: mocks.stopMixer,
  isMixerActive: mocks.isMixerActive,
}))

vi.mock('@shared/utils/errorHandler', () => ({
  clearAllErrorLogs: mocks.clearAllErrorLogs,
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

vi.mock('@features/options/hooks/useSectionObserver', () => ({
  useSectionObserver: () => ({
    activeSection: 'appearance',
    sectionRefs: { current: {} },
    scrollToSection: mocks.scrollToSection,
  }),
}))

vi.mock('@features/options/hooks/useAudioDevices', () => ({
  useAudioDevices: () => ({
    audioDevices: [],
    microphones: [],
    isDetecting: false,
    isInstallingDriver: false,
    isMicrophoneTesting: false,
    handleInstallDriver: mocks.handleInstallDriver,
    handleDetectDevices: mocks.handleDetectDevices,
    testMicrophone: mocks.testMicrophone,
  }),
}))

vi.mock('@features/options/hooks/usePluginsManagement', () => ({
  usePluginsManagement: () => ({
    plugins: [],
    disabledPlugins: [],
    loadPlugins: mocks.loadPlugins,
    handlePluginUninstall: mocks.handlePluginUninstall,
    handlePluginEnable: mocks.handlePluginEnable,
  }),
}))

// ─── Sections mockées avec boutons pour tester les callbacks ─────────
vi.mock('@features/options/sections/AppearanceSection', () => ({
  default: ({ onResetSidebar }) => (
    <div data-testid="appearance-section">
      <button data-testid="reset-sidebar-btn" onClick={onResetSidebar}>
        Reset
      </button>
    </div>
  ),
}))
vi.mock('@features/options/sections/AudioSection', () => ({
  default: ({ onInstallDriver }) => (
    <div data-testid="audio-section">
      <button data-testid="install-driver-btn" onClick={onInstallDriver}>
        Install
      </button>
    </div>
  ),
}))
vi.mock('@features/options/sections/ShortcutsSection', () => ({
  default: () => <div data-testid="shortcuts-section" />,
}))
vi.mock('@features/options/sections/SoundManagementSection', () => ({
  default: () => <div data-testid="sound-mgmt-section" />,
}))
vi.mock('@features/options/sections/PluginsSection', () => ({
  default: () => <div data-testid="plugins-section" />,
}))
vi.mock('@features/options/sections/IntegrationsSection', () => ({
  default: () => <div data-testid="integrations-section" />,
}))
vi.mock('@features/options/sections/AdvancedSection', () => ({
  default: ({ onClearLogs, onExportLogs }) => (
    <div data-testid="advanced-section">
      <button data-testid="clear-logs-btn" onClick={onClearLogs}>
        Clear
      </button>
      <button data-testid="export-logs-btn" onClick={onExportLogs}>
        Export
      </button>
    </div>
  ),
}))
vi.mock('@features/options/sections/BackupSection', () => ({
  default: () => <div data-testid="backup-section" />,
}))
vi.mock('@features/options/sections/ProfilesSection', () => ({
  default: () => <div data-testid="profiles-section" />,
}))

// ✅ Fix : SupportSection + AboutSection étaient rendues pour de vrai
// et appellent `storeGet(...)` en montant. Comme `storeGet` est mocké
// avec `mockResolvedValue([{ id: '1' }])` dans les tests d'export, ces
// composants essayaient de rendre un tableau d'objets → crash
// "Objects are not valid as a React child".
vi.mock('@features/options/sections/SupportSection', () => ({
  default: () => <div data-testid="support-section" />,
}))
vi.mock('@features/options/sections/AboutSection', () => ({
  default: () => <div data-testid="about-section" />,
}))

import Options from '@features/options/Options'

describe('Options', () => {
  let store
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.confirm.mockResolvedValue(true)
    mocks.isMixerActive.mockReturnValue(false)

    store = {
      mixerEnabled: false,
      resetSidebarConfig: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()

    // ✅ Fix : `storeGet` key-aware. Retourne la valeur attendue pour chaque
    // clé connue, et `undefined` par défaut (les composants qui n'ont pas
    // de valeur à rendre resteront muets). Évite qu'un composant qui fait
    // `storeGet("appVersion")` reçoive `[{ id: '1' }]` par accident.
    window.electronAPI = {
      storeGet: vi.fn().mockImplementation((key) => {
        if (key === 'errorLogs') return Promise.resolve([])
        // Toutes les autres clés : pas de valeur → les composants
        // doivent tolérer `undefined`.
        return Promise.resolve(undefined)
      }),
      exportJsonFile: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  const renderOptions = () => render(<Options store={store} addToast={addToast} />)

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  describe('rendu de base', () => {
    it('devrait afficher le titre optionsTitle', () => {
      renderOptions()
      expect(screen.getByText('optionsTitle')).toBeInTheDocument()
    })

    it('devrait afficher les 9 sections', () => {
      renderOptions()
      expect(screen.getByTestId('appearance-section')).toBeInTheDocument()
      expect(screen.getByTestId('audio-section')).toBeInTheDocument()
      expect(screen.getByTestId('shortcuts-section')).toBeInTheDocument()
      expect(screen.getByTestId('sound-mgmt-section')).toBeInTheDocument()
      expect(screen.getByTestId('plugins-section')).toBeInTheDocument()
      expect(screen.getByTestId('integrations-section')).toBeInTheDocument()
      expect(screen.getByTestId('advanced-section')).toBeInTheDocument()
      expect(screen.getByTestId('backup-section')).toBeInTheDocument()
      expect(screen.getByTestId('profiles-section')).toBeInTheDocument()
    })

    it('devrait afficher les tabs de navigation', () => {
      renderOptions()
      expect(screen.getByText('optionsAppearance')).toBeInTheDocument()
      expect(screen.getByText('optionsAudio')).toBeInTheDocument()
      expect(screen.getByText('optionsShortcuts')).toBeInTheDocument()
      expect(screen.getByText('optionsPlugins')).toBeInTheDocument()
      expect(screen.getByText('optionsBackup')).toBeInTheDocument()
      expect(screen.getByText('optionsProfiles')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════════

  describe('navigation', () => {
    it('devrait appeler scrollToSection au click sur un tab', () => {
      renderOptions()
      fireEvent.click(screen.getByText('optionsAudio'))
      expect(mocks.scrollToSection).toHaveBeenCalledWith('audio')
    })

    it('devrait appeler scrollToSection avec chaque id', () => {
      renderOptions()
      fireEvent.click(screen.getByText('optionsBackup'))
      expect(mocks.scrollToSection).toHaveBeenCalledWith('backup')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // SYNC MIXER
  // ════════════════════════════════════════════════════════════════════

  describe('sync mixer au mount', () => {
    it('devrait stop mixer si mixerEnabled=false + isMixerActive=true', async () => {
      mocks.isMixerActive.mockReturnValue(true)
      renderOptions()

      await waitFor(() => {
        expect(mocks.stopMixer).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalledWith('mixerResynced', 'info')
      })
    })

    it('ne devrait PAS stop mixer si mixerEnabled=true', async () => {
      mocks.isMixerActive.mockReturnValue(true)
      store.mixerEnabled = true
      renderOptions()

      await new Promise((r) => setTimeout(r, 20))
      expect(mocks.stopMixer).not.toHaveBeenCalled()
    })

    it('ne devrait PAS stop mixer si isMixerActive=false', async () => {
      mocks.isMixerActive.mockReturnValue(false)
      renderOptions()

      await new Promise((r) => setTimeout(r, 20))
      expect(mocks.stopMixer).not.toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // RESET SIDEBAR
  // ════════════════════════════════════════════════════════════════════

  describe('handleResetSidebar', () => {
    it('devrait demander confirmation', async () => {
      renderOptions()
      fireEvent.click(screen.getByTestId('reset-sidebar-btn'))

      await waitFor(() => {
        expect(mocks.confirm).toHaveBeenCalled()
      })
    })

    it('devrait appeler resetSidebarConfig si confirmé', async () => {
      renderOptions()
      fireEvent.click(screen.getByTestId('reset-sidebar-btn'))

      await waitFor(() => {
        expect(store.resetSidebarConfig).toHaveBeenCalled()
      })
    })

    it('ne devrait PAS reset si refusé', async () => {
      mocks.confirm.mockResolvedValue(false)
      renderOptions()
      fireEvent.click(screen.getByTestId('reset-sidebar-btn'))

      await new Promise((r) => setTimeout(r, 20))
      expect(store.resetSidebarConfig).not.toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // LOGS
  // ════════════════════════════════════════════════════════════════════

  describe('handleClearLogs', () => {
    it('devrait appeler clearAllErrorLogs', async () => {
      mocks.clearAllErrorLogs.mockResolvedValue()
      renderOptions()
      fireEvent.click(screen.getByTestId('clear-logs-btn'))

      await waitFor(() => {
        expect(mocks.clearAllErrorLogs).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalledWith('logsCleared', 'info')
      })
    })

    it('devrait gérer une erreur clearAllErrorLogs', async () => {
      mocks.clearAllErrorLogs.mockRejectedValue(new Error('boom'))
      renderOptions()
      fireEvent.click(screen.getByTestId('clear-logs-btn'))

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining('boom'),
          'error'
        )
      })
    })
  })

  describe('handleExportLogs', () => {
    it('devrait afficher un info si aucun log', async () => {
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === 'errorLogs' ? Promise.resolve([]) : Promise.resolve(undefined)
      )
      renderOptions()
      fireEvent.click(screen.getByTestId('export-logs-btn'))

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('noErrorLogs', 'info')
      })
    })

    it('devrait exporter les logs si présents', async () => {
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === 'errorLogs'
          ? Promise.resolve([{ id: '1', msg: 'err' }])
          : Promise.resolve(undefined)
      )
      renderOptions()
      fireEvent.click(screen.getByTestId('export-logs-btn'))

      await waitFor(() => {
        expect(window.electronAPI.exportJsonFile).toHaveBeenCalled()
      })
    })

    it('devrait afficher un toast succès après export', async () => {
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === 'errorLogs'
          ? Promise.resolve([{ id: '1' }])
          : Promise.resolve(undefined)
      )
      window.electronAPI.exportJsonFile.mockResolvedValue({ success: true })
      renderOptions()
      fireEvent.click(screen.getByTestId('export-logs-btn'))

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.stringContaining('logsExported'),
          'success'
        )
      })
    })

    it('ne devrait PAS afficher error si annulé', async () => {
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === 'errorLogs'
          ? Promise.resolve([{ id: '1' }])
          : Promise.resolve(undefined)
      )
      window.electronAPI.exportJsonFile.mockResolvedValue({ canceled: true })
      renderOptions()
      fireEvent.click(screen.getByTestId('export-logs-btn'))

      await new Promise((r) => setTimeout(r, 20))
      const errorCalls = addToast.mock.calls.filter((c) => c[1] === 'error')
      expect(errorCalls).toHaveLength(0)
    })

    it('devrait afficher un toast erreur si export échoue', async () => {
      window.electronAPI.storeGet.mockImplementation((key) =>
        key === 'errorLogs'
          ? Promise.resolve([{ id: '1' }])
          : Promise.resolve(undefined)
      )
      window.electronAPI.exportJsonFile.mockResolvedValue({
        success: false,
        error: 'disk full',
      })
      renderOptions()
      fireEvent.click(screen.getByTestId('export-logs-btn'))

      await waitFor(() => {
        const errorCall = addToast.mock.calls.find(
          (c) => c[1] === 'error' && c[0].includes('disk full')
        )
        expect(errorCall).toBeDefined()
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // CALLBACKS passés aux sections
  // ════════════════════════════════════════════════════════════════════

  describe('callbacks passés aux sections', () => {
    it('AudioSection devrait recevoir onInstallDriver', () => {
      renderOptions()
      fireEvent.click(screen.getByTestId('install-driver-btn'))
      expect(mocks.handleInstallDriver).toHaveBeenCalled()
    })
  })
})