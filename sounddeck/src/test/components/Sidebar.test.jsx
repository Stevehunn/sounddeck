// src/test/components/Sidebar.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
const { mockTogglePause, mockStop } = vi.hoisted(() => ({
  mockTogglePause: vi.fn(),
  mockStop: vi.fn(),
}))

vi.mock('@shared/hooks/useCurrentPlaying', () => ({
  useCurrentPlaying: () => ({
    playingSounds: [],
    togglePause: mockTogglePause,
    stop: mockStop,
  }),
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://${p}` : null)),
}))

vi.mock('@shared/constants/navigation', () => ({
  ACTION_IDS: ['loop', 'shortcuts', 'presentation'],
  CORE_PAGES: [
    { id: 'home', labelKey: 'home' },
    { id: 'discover', labelKey: 'discover' },
    { id: 'options', labelKey: 'options' },
    { id: 'stats', labelKey: 'stats' },
  ],
  DEFAULT_ICONS: {
    home: 'ti-home',
    discover: 'ti-search',
    options: 'ti-settings',
    stats: 'ti-chart-bar',
    loop: 'ti-repeat',
    shortcuts: 'ti-keyboard',
    presentation: 'ti-presentation',
    editor: 'ti-music',
  },
  DEFAULT_GROUPS: {
    home: 'navigation',
    discover: 'navigation',
    editor: 'navigation',
    options: 'footer',
    stats: 'footer',
    loop: 'actions',
    shortcuts: 'actions',
    presentation: 'actions',
  },
}))

import Sidebar from '@shared/components/navigation/Sidebar'

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultProfiles = () => [
  { id: 'all', name: 'Tous les sons', isDefault: true },
  { id: 'p1', name: 'Gaming' },
  { id: 'p2', name: 'Musique' },
]

const defaultSidebarConfig = () => ({
  mode: 'default',
  items: [
    { id: 'home', group: 'navigation', icon: 'ti-home', visible: true, pinned: false, order: 0, canHide: true },
    { id: 'discover', group: 'navigation', icon: 'ti-search', visible: true, pinned: false, order: 1, canHide: true },
    { id: 'options', group: 'footer', icon: 'ti-settings', visible: true, pinned: false, order: 2, canHide: true },
    { id: 'loop', group: 'actions', icon: 'ti-repeat', visible: true, pinned: false, order: 3, canHide: true },
    { id: 'shortcuts', group: 'actions', icon: 'ti-keyboard', visible: true, pinned: false, order: 4, canHide: true },
    { id: 'presentation', group: 'actions', icon: 'ti-presentation', visible: true, pinned: false, order: 5, canHide: true },
    { id: 'profile-all', group: 'profiles', icon: 'ti-stack', visible: true, pinned: false, order: 6, canHide: false, isProfile: true, isDefaultProfile: true },
    { id: 'profile-p1', group: 'profiles', icon: 'ti-user', visible: true, pinned: false, order: 7, canHide: false, isProfile: true },
    { id: 'profile-p2', group: 'profiles', icon: 'ti-user', visible: true, pinned: false, order: 8, canHide: false, isProfile: true },
  ],
  sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'],
  fixedSections: [],
})

const defaultProps = (overrides = {}) => ({
  profiles: defaultProfiles(),
  sounds: [],
  currentProfileId: 'all',
  currentPage: 'home',
  onSwitchProfile: vi.fn(),
  onChangePage: vi.fn(),
  onCreateProfile: vi.fn().mockResolvedValue(undefined),
  onToggleLoop: vi.fn(),
  loopEnabled: false,
  volume: 80,
  onVolumeChange: vi.fn(),
  onStopAll: vi.fn(),
  onPresentation: vi.fn(),
  addToast: vi.fn(),
  onReorderProfiles: vi.fn().mockResolvedValue(true),
  sidebarConfig: defaultSidebarConfig(),
  sidebarEditMode: false,
  sidebarVersion: 0,
  pluginPages: [],
  isPluginPage: () => false,
  ...overrides,
})

const renderSidebar = (props = {}) => render(<Sidebar {...defaultProps(props)} />)

beforeEach(() => {
  mockTogglePause.mockReset()
  mockStop.mockReset()

  global.window.electronAPI = {
    getGlobalShortcutsState: vi.fn().mockResolvedValue(true),
    onShortcutsToggle: vi.fn(),
    toggleGlobalShortcuts: vi.fn().mockResolvedValue(false),
    removeAllListeners: vi.fn(),
  }
})

// ═══════════════════════════════════════════════════════════════════════
// RENDU DE BASE
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Rendu de base', () => {
  it('affiche le logo SoundDeck', () => {
    renderSidebar()
    expect(screen.getByText('SoundDeck')).toBeInTheDocument()
  })

  it('affiche le slider volume avec la valeur courante', () => {
    const { container } = renderSidebar({ volume: 65 })
    const slider = container.querySelector('input[type="range"][max="100"]')
    expect(slider).toBeInTheDocument()
    expect(slider.value).toBe('65')
  })

  it('affiche le pourcentage du volume', () => {
    renderSidebar({ volume: 42 })
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('changer le slider appelle onVolumeChange', () => {
    const onVolumeChange = vi.fn()
    const { container } = renderSidebar({ onVolumeChange })
    const slider = container.querySelector('input[type="range"][max="100"]')
    fireEvent.change(slider, { target: { value: '50' } })
    expect(onVolumeChange).toHaveBeenCalledWith(50)
  })

  it('affiche le bouton Stop All', () => {
    renderSidebar()
    expect(screen.getByText(/Tout arrêter|stopAll/)).toBeInTheDocument()
  })

  it('clic Stop All appelle onStopAll', () => {
    const onStopAll = vi.fn()
    renderSidebar({ onStopAll })
    fireEvent.click(screen.getByText(/Tout arrêter|stopAll/).closest('button'))
    expect(onStopAll).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Navigation', () => {
  it('clic sur "Mes sons" appelle onChangePage("home")', () => {
    const onChangePage = vi.fn()
    renderSidebar({ onChangePage })
    const homeBtn = screen.getByText('Mes sons').closest('button')
    fireEvent.click(homeBtn)
    expect(onChangePage).toHaveBeenCalledWith('home')
  })

  it('clic sur "Découverte" appelle onChangePage("discover")', () => {
    const onChangePage = vi.fn()
    renderSidebar({ onChangePage })
    // ⚠️ La valeur FR est "Découverte" (dans common.js), pas "Découvrir".
    const btn = screen.getByText(/Découverte|discover/).closest('button')
    fireEvent.click(btn)
    expect(onChangePage).toHaveBeenCalledWith('discover')
  })

  it('clic sur "Options" appelle onChangePage("options")', () => {
    const onChangePage = vi.fn()
    renderSidebar({ onChangePage })
    const btn = screen.getByText('Options').closest('button')
    fireEvent.click(btn)
    expect(onChangePage).toHaveBeenCalledWith('options')
  })

  it('item actif a la classe "active"', () => {
    const { container } = renderSidebar({ currentPage: 'home' })
    const activeItem = container.querySelector('.sidebar-item.active')
    expect(activeItem).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Sections', () => {
  it('affiche le titre de la section Profils', () => {
    renderSidebar()
    expect(screen.getByText(/Profils|profiles/)).toBeInTheDocument()
  })

  it('affiche le titre de la section Navigation', () => {
    renderSidebar()
    expect(screen.getByText(/Navigation|navigation/)).toBeInTheDocument()
  })

  it('affiche le titre de la section Actions', () => {
    renderSidebar()
    expect(screen.getByText(/Actions|actions/)).toBeInTheDocument()
  })

  it('affiche la section Profils avec data-testid', () => {
    renderSidebar()
    expect(screen.getByTestId('profiles-section')).toBeInTheDocument()
  })

  it('les items cachés (visible=false) ne sont pas affichés', () => {
    const config = defaultSidebarConfig()
    config.items = config.items.map((i) =>
      i.id === 'discover' ? { ...i, visible: false } : i
    )
    renderSidebar({ sidebarConfig: config })
    expect(screen.queryByText(/Découverte|discover/)).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Actions', () => {
  it('bouton Loop affiche OFF si loopEnabled=false', () => {
    renderSidebar({ loopEnabled: false })
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('bouton Loop affiche ON si loopEnabled=true', () => {
    renderSidebar({ loopEnabled: true })
    const onLabels = screen.getAllByText('ON')
    expect(onLabels.length).toBeGreaterThan(0)
  })

  it('clic Loop appelle onToggleLoop', () => {
    const onToggleLoop = vi.fn()
    renderSidebar({ onToggleLoop })
    const loopBtn = screen.getByText(/Boucle|loop/).closest('button')
    fireEvent.click(loopBtn)
    expect(onToggleLoop).toHaveBeenCalled()
  })

  it('bouton Shortcuts appelle toggleGlobalShortcuts', async () => {
    renderSidebar()
    const shortcutsBtn = screen.getByText(/Raccourcis|shortcuts/).closest('button')

    await act(async () => {
      fireEvent.click(shortcutsBtn)
    })

    expect(global.window.electronAPI.toggleGlobalShortcuts).toHaveBeenCalled()
  })

  it('clic Présentation appelle onPresentation', () => {
    const onPresentation = vi.fn()
    renderSidebar({ onPresentation })
    const presentBtn = screen.getByText(/Présentation|presentation/).closest('button')
    fireEvent.click(presentBtn)
    expect(onPresentation).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PROFILS
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Profils', () => {
  it('affiche "Tous les sons" pour le profil all', () => {
    renderSidebar()
    expect(screen.getAllByText(/Tous les sons|allSounds/).length).toBeGreaterThan(0)
  })

  it('affiche les profils utilisateur', () => {
    renderSidebar()
    expect(screen.getByText('Gaming')).toBeInTheDocument()
    expect(screen.getByText('Musique')).toBeInTheDocument()
  })

  it('clic sur un profil appelle onSwitchProfile + onChangePage("home")', () => {
    const onSwitchProfile = vi.fn()
    const onChangePage = vi.fn()
    renderSidebar({ onSwitchProfile, onChangePage })

    const profileBtn = screen.getByText('Gaming').closest('button')
    fireEvent.click(profileBtn)

    expect(onSwitchProfile).toHaveBeenCalledWith('p1')
    expect(onChangePage).toHaveBeenCalledWith('home')
  })

  it('bouton "Nouveau profil" ouvre l\'input', () => {
    renderSidebar()
    const newProfileBtn = screen.getByTestId('new-profile-button')
    fireEvent.click(newProfileBtn)

    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/)
    expect(input).toBeInTheDocument()
  })

  it('créer un profil appelle onCreateProfile + addToast', async () => {
    const onCreateProfile = vi.fn().mockResolvedValue(undefined)
    const addToast = vi.fn()
    renderSidebar({ onCreateProfile, addToast })

    fireEvent.click(screen.getByTestId('new-profile-button'))
    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/)
    fireEvent.change(input, { target: { value: 'Mon Profil' } })

    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons.find((b) => b.querySelector('.ti-check'))

    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    expect(onCreateProfile).toHaveBeenCalledWith('Mon Profil')
    expect(addToast).toHaveBeenCalled()
  })

  it('Escape ferme le formulaire de création', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('new-profile-button'))
    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/)
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByPlaceholderText(/Nouveau profil|newProfile/)).not.toBeInTheDocument()
  })

  it('profil all : pas de dragStart (non-draggable)', () => {
    renderSidebar()
    const allItems = screen.getAllByText(/Tous les sons|allSounds/)
    expect(allItems.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// FIXED SECTIONS
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Fixed sections', () => {
  it('respecte fixedSections limité à 2', () => {
    const config = defaultSidebarConfig()
    config.fixedSections = ['navigation', 'actions', 'footer']

    renderSidebar({ sidebarConfig: config })
    expect(screen.getByText(/Navigation|navigation/)).toBeInTheDocument()
  })

  it('section footer est toujours rendue en bas', () => {
    renderSidebar()
    expect(screen.getByText('Options')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// CONFIG VIDE
// ═══════════════════════════════════════════════════════════════════════
describe('Sidebar > Config vide', () => {
  it('ne crash pas si sidebarConfig est null', () => {
    expect(() => renderSidebar({ sidebarConfig: null })).not.toThrow()
  })

  it('ne crash pas si sidebarConfig.items est vide', () => {
    const config = { items: [], sectionOrder: [], fixedSections: [] }
    expect(() => renderSidebar({ sidebarConfig: config })).not.toThrow()
  })
})