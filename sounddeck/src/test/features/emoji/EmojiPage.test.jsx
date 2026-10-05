// src/test/features/emoji/EmojiPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
  removeEmoji: vi.fn().mockResolvedValue({ success: true }),
  removeCategory: vi.fn().mockResolvedValue({ success: true, removed: 2 }),
  addEmoji: vi.fn().mockResolvedValue({ success: true }),
  isPluginLoaded: vi.fn(() => true),
  isPluginPage: vi.fn(() => true),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/hooks/useConfirm', () => ({
  default: () => ({
    confirm: mocks.confirm,
    ConfirmWrapper: () => null,
  }),
}))

vi.mock('@core/plugins/PluginContext', () => ({
  usePlugins: () => ({
    pluginManager: {
      isPluginLoaded: mocks.isPluginLoaded,
      isPluginPage: mocks.isPluginPage,
    },
  }),
}))

// Mock useEmojis — surchargeable par test
const emojiState = {
  defaultEmojis: ['🔊', '🎵', '🎸', '🥁'],
  customEmojis: ['🦄', '🐲'],
  customGrouped: { animals: ['🦄', '🐲'] },
  categories: [
    { id: 'audio', labelKey: 'emojiCategoryAudio', label: 'Audio', icon: 'ti-music', emojis: ['🔊', '🎵'] },
    { id: 'animals', labelKey: 'emojiCategoryAnimals', label: 'Animaux', icon: 'ti-paw', emojis: ['🐶', '🐱', '🐭'] },
  ],
  getCategoryInfo: vi.fn((id) => ({ id, label: `Cat-${id}`, labelKey: null, icon: 'ti-folder' })),
  loading: false,
}

vi.mock('@shared/hooks/useEmojis', () => ({
  useEmojis: () => ({
    ...emojiState,
    removeEmoji: mocks.removeEmoji,
    removeCategory: mocks.removeCategory,
    addEmoji: mocks.addEmoji,
  }),
}))

import EmojiPage from '@features/emoji/EmojiPage'

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultProps = (overrides = {}) => ({
  store: { sounds: [], profiles: [] },
  addToast: vi.fn(),
  ...overrides,
})

const renderPage = (props = {}) => render(<EmojiPage {...defaultProps(props)} />)

beforeEach(() => {
  mocks.confirm.mockReset().mockResolvedValue(true)
  mocks.removeEmoji.mockReset().mockResolvedValue({ success: true })
  mocks.removeCategory.mockReset().mockResolvedValue({ success: true, removed: 2 })
  mocks.addEmoji.mockReset().mockResolvedValue({ success: true })
  mocks.isPluginLoaded.mockReset().mockReturnValue(true)
  mocks.isPluginPage.mockReset().mockReturnValue(true)

  // Reset loading
  emojiState.loading = false
  emojiState.customEmojis = ['🦄', '🐲']
  emojiState.customGrouped = { animals: ['🦄', '🐲'] }
  emojiState.defaultEmojis = ['🔊', '🎵', '🎸', '🥁']

  delete global.window.__navigateTo
})

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Rendu', () => {
  it('affiche le loader si loading=true', () => {
    emojiState.loading = true
    const { container } = renderPage()
    expect(container.querySelector('.ti-loader')).toBeInTheDocument()
  })

  it('affiche le titre', () => {
    renderPage()
    expect(screen.getByText('emojiPageTitle')).toBeInTheDocument()
  })

  it('affiche le count total', () => {
    renderPage()
    // 4 defaults + 2 customs = 6
    expect(screen.getByText('emojiPageTotalCount')).toBeInTheDocument()
  })

  it('affiche le bouton "Ajouter manuellement"', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-add-manual-button')).toBeInTheDocument()
  })

  it('affiche le bouton "Ajouter plus d\'emojis"', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-open-discover-button')).toBeInTheDocument()
  })

  it('affiche la section custom', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-custom-section')).toBeInTheDocument()
  })

  it('affiche la section default', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-default-section')).toBeInTheDocument()
  })

  it('affiche les groupes custom', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-custom-group-animals')).toBeInTheDocument()
  })

  it('affiche les emojis custom', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-item-🦄')).toBeInTheDocument()
    expect(screen.getByTestId('emoji-page-item-🐲')).toBeInTheDocument()
  })

  it('affiche les emojis par défaut (par catégorie)', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-default-🔊')).toBeInTheDocument()
    expect(screen.getByTestId('emoji-page-default-🐶')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Empty state', () => {
  beforeEach(() => {
    emojiState.customEmojis = []
    emojiState.customGrouped = {}
  })

  it('affiche l\'empty state si aucun custom', () => {
    renderPage()
    expect(screen.getByTestId('emoji-page-empty-state')).toBeInTheDocument()
  })

  it('affiche les 2 boutons dans l\'empty state', () => {
    renderPage()
    // ⚠️ "emojiPickerAddManual" apparaît aussi dans le header → getAllByText
    expect(screen.getAllByText('emojiPickerAddManual').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('emojiPageAddMore').length).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// AJOUT MANUEL
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Ajout manuel', () => {
  it('clic "Ajouter manuellement" ouvre l\'input', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    expect(screen.getByTestId('emoji-page-add-manual-input')).toBeInTheDocument()
  })

  it('bouton confirm désactivé si input vide', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    expect(screen.getByTestId('emoji-page-add-manual-confirm')).toBeDisabled()
  })

  it('ajout valide appelle addEmoji + toast', async () => {
    const addToast = vi.fn()
    renderPage({ addToast })

    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    fireEvent.change(screen.getByTestId('emoji-page-add-manual-input'), {
      target: { value: '🦄' },
    })
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-confirm'))

    await waitFor(() => {
      expect(mocks.addEmoji).toHaveBeenCalledWith('🦄', null)
      expect(addToast).toHaveBeenCalledWith('emojiPickerAdded', 'success')
    })
  })

  it('ferme l\'input après ajout réussi', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    fireEvent.change(screen.getByTestId('emoji-page-add-manual-input'), {
      target: { value: '🦄' },
    })
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('emoji-page-add-manual-input')).not.toBeInTheDocument()
    })
  })

  it('affiche erreur si addEmoji échoue', async () => {
    mocks.addEmoji.mockResolvedValue({ success: false, error: 'already exists' })
    renderPage()

    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    fireEvent.change(screen.getByTestId('emoji-page-add-manual-input'), {
      target: { value: '🦄' },
    })
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-confirm'))

    await waitFor(() => {
      expect(screen.getByText('already exists')).toBeInTheDocument()
    })
  })

  it('Enter déclenche l\'ajout', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    const input = screen.getByTestId('emoji-page-add-manual-input')
    fireEvent.change(input, { target: { value: '🦄' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(mocks.addEmoji).toHaveBeenCalled())
  })

  it('Escape ferme l\'input', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-add-manual-button'))
    const input = screen.getByTestId('emoji-page-add-manual-input')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('emoji-page-add-manual-input')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SUPPRESSION EMOJI
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Suppression emoji', () => {
  it('clic sur le bouton × ouvre confirm', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-remove-🦄'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
  })

  it('confirme → removeEmoji + toast info', async () => {
    const addToast = vi.fn()
    renderPage({ addToast })

    fireEvent.click(screen.getByTestId('emoji-page-remove-🦄'))

    await waitFor(() => {
      expect(mocks.removeEmoji).toHaveBeenCalledWith('🦄')
      expect(addToast).toHaveBeenCalledWith('emojiPageRemovedOne', 'info')
    })
  })

  it('annule → pas de removeEmoji', async () => {
    mocks.confirm.mockResolvedValue(false)
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-remove-🦄'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
    expect(mocks.removeEmoji).not.toHaveBeenCalled()
  })

  it('affiche un toast erreur si removeEmoji échoue', async () => {
    mocks.removeEmoji.mockResolvedValue({ success: false, error: 'not found' })
    const addToast = vi.fn()
    renderPage({ addToast })

    fireEvent.click(screen.getByTestId('emoji-page-remove-🦄'))

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith('not found', 'error')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SUPPRESSION CATÉGORIE
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Suppression catégorie', () => {
  it('clic sur "Retirer la catégorie" ouvre confirm', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-remove-category-animals'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
  })

  it('confirme → removeCategory + toast', async () => {
    const addToast = vi.fn()
    renderPage({ addToast })

    fireEvent.click(screen.getByTestId('emoji-page-remove-category-animals'))

    await waitFor(() => {
      expect(mocks.removeCategory).toHaveBeenCalledWith('animals')
      expect(addToast).toHaveBeenCalledWith('emojiPageRemoved', 'info')
    })
  })

  it('annule → pas de removeCategory', async () => {
    mocks.confirm.mockResolvedValue(false)
    renderPage()
    fireEvent.click(screen.getByTestId('emoji-page-remove-category-animals'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
    expect(mocks.removeCategory).not.toHaveBeenCalled()
  })

  it('pas de bouton "Retirer catégorie" pour __uncategorized__', () => {
    emojiState.customGrouped = { __uncategorized__: ['🦄'] }
    renderPage()
    expect(screen.queryByTestId('emoji-page-remove-category-__uncategorized__')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// OPEN DISCOVER (plugin)
// ═══════════════════════════════════════════════════════════════════════
describe('EmojiPage > Open discover', () => {
  it('plugin disponible → __navigateTo("emoji-discover")', () => {
    const navigate = vi.fn()
    global.window.__navigateTo = navigate
    renderPage()

    fireEvent.click(screen.getByTestId('emoji-page-open-discover-button'))
    expect(navigate).toHaveBeenCalledWith('emoji-discover')
  })

  it('plugin absent → confirm + navigateTo("options")', async () => {
    mocks.isPluginLoaded.mockReturnValue(false)
    const navigate = vi.fn()
    global.window.__navigateTo = navigate
    renderPage()

    fireEvent.click(screen.getByTestId('emoji-page-open-discover-button'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith('options')
    })
  })

  it('plugin absent + annulation → pas de navigation', async () => {
    mocks.isPluginLoaded.mockReturnValue(false)
    mocks.confirm.mockResolvedValue(false)
    const navigate = vi.fn()
    global.window.__navigateTo = navigate
    renderPage()

    fireEvent.click(screen.getByTestId('emoji-page-open-discover-button'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('plugin absent + pas de __navigateTo → pas de crash', async () => {
    mocks.isPluginLoaded.mockReturnValue(false)
    // pas de window.__navigateTo
    renderPage()

    fireEvent.click(screen.getByTestId('emoji-page-open-discover-button'))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled()
    })
  })

  it('plugin dispo + pas de __navigateTo → toast info', () => {
    const addToast = vi.fn()
    renderPage({ addToast })

    fireEvent.click(screen.getByTestId('emoji-page-open-discover-button'))
    expect(addToast).toHaveBeenCalledWith('emojiPageEmptyDesc', 'info')
  })
})