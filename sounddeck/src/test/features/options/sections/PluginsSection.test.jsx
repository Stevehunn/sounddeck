// src/test/features/options/sections/PluginsSection.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  onUninstall: vi.fn(),
  onEnable: vi.fn(),
  onInstall: vi.fn(),
  reload: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-plugin-btn" onClick={onDelete}>
      Delete
    </button>
  ),
}))

vi.mock('@shared/components/settings/PluginInstaller', () => ({
  default: ({ onClose, onInstall }) => (
    <div data-testid="plugin-installer">
      <button data-testid="close-installer-btn" onClick={onClose}>
        Close
      </button>
      <button data-testid="install-btn" onClick={onInstall}>
        Install
      </button>
    </div>
  ),
}))

import PluginsSection from '@features/options/sections/PluginsSection'

describe('PluginsSection', () => {
  let baseProps

  beforeEach(() => {
    vi.clearAllMocks()
    // ⚠️ window.location.reload en jsdom
    Object.defineProperty(window, 'location', {
      value: { reload: mocks.reload },
      writable: true,
      configurable: true,
    })

    baseProps = {
      sectionRef: () => {},
      plugins: [],
      disabledPlugins: [],
      loadPlugins: vi.fn(),
      onUninstallPlugin: mocks.onUninstall,
      onEnablePlugin: mocks.onEnable,
      addToast: vi.fn(),
    }
  })

  const renderSection = (overrides = {}) =>
    render(<PluginsSection {...baseProps} {...overrides} />)

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher le titre optionsPlugins', () => {
    renderSection()
    expect(screen.getByText('optionsPlugins')).toBeInTheDocument()
  })

  it('devrait exposer le testid section-plugins', () => {
    renderSection()
    expect(screen.getByTestId('section-plugins')).toBeInTheDocument()
  })

  it('devrait afficher le message "aucun plugin" si liste vide', () => {
    renderSection()
    expect(screen.getByText('pluginsNoPluginsInstalled')).toBeInTheDocument()
  })

  // ════════════════════════════════════════════════════════════════════
  // LISTE PLUGINS
  // ════════════════════════════════════════════════════════════════════

  describe('liste plugins', () => {
    const plugins = [
      {
        id: 'youtube',
        name: 'YouTube',
        version: '1.0.0',
        author: 'Team',
        pages: 1,
        isIntegrated: true,
      },
      {
        id: 'custom',
        name: 'Custom Plugin',
        version: '2.0.0',
        author: 'User',
        pages: 3,
      },
    ]

    it('devrait afficher tous les plugins', () => {
      renderSection({ plugins })
      expect(screen.getByText('YouTube')).toBeInTheDocument()
      expect(screen.getByText('Custom Plugin')).toBeInTheDocument()
    })

    it('devrait afficher les versions', () => {
      renderSection({ plugins })
      expect(screen.getByText('v1.0.0')).toBeInTheDocument()
      expect(screen.getByText('v2.0.0')).toBeInTheDocument()
    })

    it('devrait afficher le nombre de plugins', () => {
      renderSection({ plugins })
      expect(screen.getByText('2 pluginsCount')).toBeInTheDocument()
    })

    it('devrait utiliser nameKey si présent', () => {
      renderSection({
        plugins: [{ ...plugins[0], nameKey: 'pluginNameYouTube' }],
      })
      expect(screen.getByText(/pluginNameYouTube/)).toBeInTheDocument()
    })

    it('devrait afficher les pages count', () => {
      renderSection({ plugins })
      expect(screen.getByText(/3 pluginsPages/)).toBeInTheDocument()
    })

    it('devrait appeler onUninstallPlugin via DeleteButton', () => {
      renderSection({ plugins })
      const deleteBtns = screen.getAllByTestId('delete-plugin-btn')
      fireEvent.click(deleteBtns[0])
      expect(mocks.onUninstall).toHaveBeenCalledWith(plugins[0])
    })

    it('devrait appeler window.location.reload au click refresh', () => {
      renderSection({ plugins })
      const reloadBtn = screen.getAllByTitle('pluginsReloadTooltip')[0]
      fireEvent.click(reloadBtn)
      expect(mocks.reload).toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // PLUGINS DÉSACTIVÉS
  // ════════════════════════════════════════════════════════════════════

  describe('plugins désactivés', () => {
    const disabled = [
      { id: 'old-plugin', name: 'Old Plugin', version: '0.5.0' },
    ]

    it('ne devrait PAS afficher la section si vide', () => {
      renderSection({ disabledPlugins: [] })
      expect(screen.queryByText(/pluginsDisabledTitle/)).not.toBeInTheDocument()
    })

    it('devrait afficher la section si non vide', () => {
      renderSection({ disabledPlugins: disabled })
      expect(screen.getByText(/pluginsDisabledTitle/)).toBeInTheDocument()
    })

    it('devrait afficher les plugins désactivés', () => {
      renderSection({ disabledPlugins: disabled })
      expect(screen.getByText('Old Plugin')).toBeInTheDocument()
    })

    it('devrait afficher le statut désactivé', () => {
      renderSection({ disabledPlugins: disabled })
      expect(screen.getByText('pluginsDisabledStatus')).toBeInTheDocument()
    })

    it('devrait appeler onEnablePlugin au click', () => {
      renderSection({ disabledPlugins: disabled })
      fireEvent.click(screen.getByText('pluginsEnableBtn'))
      expect(mocks.onEnable).toHaveBeenCalledWith(disabled[0])
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // PLUGIN INSTALLER
  // ════════════════════════════════════════════════════════════════════

  describe('PluginInstaller', () => {
    it('ne devrait PAS l\'afficher au mount', () => {
      renderSection()
      expect(screen.queryByTestId('plugin-installer')).not.toBeInTheDocument()
    })

    it('devrait l\'afficher au click sur installer', () => {
      renderSection()
      fireEvent.click(screen.getByText('pluginsInstallBtn'))
      expect(screen.getByTestId('plugin-installer')).toBeInTheDocument()
    })

    it('devrait le fermer au click sur close', () => {
      renderSection()
      fireEvent.click(screen.getByText('pluginsInstallBtn'))
      fireEvent.click(screen.getByTestId('close-installer-btn'))
      expect(screen.queryByTestId('plugin-installer')).not.toBeInTheDocument()
    })

    it('devrait passer loadPlugins comme onInstall', () => {
      const loadPlugins = vi.fn()
      renderSection({ loadPlugins })
      fireEvent.click(screen.getByText('pluginsInstallBtn'))
      fireEvent.click(screen.getByTestId('install-btn'))
      expect(loadPlugins).toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // NOTE INFO
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher pluginsWhereToFind', () => {
    renderSection()
    expect(screen.getByText('pluginsWhereToFind')).toBeInTheDocument()
  })

  it('devrait afficher pluginsDescription', () => {
    renderSection()
    expect(screen.getByText('pluginsDescription')).toBeInTheDocument()
  })
})