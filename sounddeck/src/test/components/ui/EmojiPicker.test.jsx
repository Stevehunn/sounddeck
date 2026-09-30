import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import EmojiPicker from '@shared/components/ui/EmojiPicker'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        emojiPickerTitle: 'Choisir un emoji',
        emojiPickerDefaultSection: 'Par défaut',
        emojiPickerCustomSection: 'Mes emojis',
        emojiPickerUncategorized: 'Sans catégorie',
        emojiPickerShowMore: 'Afficher plus',
        emojiPickerShowLess: 'Afficher moins',
        emojiPickerNoCustom: 'Vous n\'avez pas encore ajouté d\'emoji',
        emojiPickerAddManual: 'Ajouter manuellement',
        emojiPickerAddPlaceholder: 'Collez un emoji...',
        emojiPickerAddConfirm: 'Ajouter',
        emojiPickerAddInvalid: 'Ce n\'est pas un emoji valide',
        emojiPickerAddError: 'Erreur lors de l\'ajout',
        emojiPickerAdded: 'Emoji ajouté',
        emojiPickerManage: 'Gérer la bibliothèque',
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

// ─── Mock useEmojis ─────────────────────────────────────────────────────
const mockAddEmoji = vi.fn()

vi.mock('@shared/hooks/useEmojis', () => ({
  useEmojis: () => ({
    defaultEmojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊'],
    customEmojis: ['🦊'],
    customGrouped: { __uncategorized__: ['🦊'] },
    addEmoji: mockAddEmoji,
    getCategoryInfo: () => null,
  }),
}))

describe('EmojiPicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    currentEmoji: null,
    onManageClick: vi.fn(),
    defaultEmojisCount: 3, // pour tester expand/collapse
    showManageLink: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddEmoji.mockResolvedValue({ success: true })
  })

  const renderPicker = (props = {}) => {
    return render(<EmojiPicker {...defaultProps} {...props} />)
  }

  // ─── RENDU CONDITIONNEL ───────────────────────────────────────────────

  it('ne devrait rien rendre si isOpen=false', () => {
    renderPicker({ isOpen: false })
    expect(
      document.body.querySelector('[data-testid="emoji-picker-overlay"]')
    ).toBeNull()
  })

  it('devrait rendre l\'overlay si isOpen=true', () => {
    renderPicker()
    expect(
      document.body.querySelector('[data-testid="emoji-picker-overlay"]')
    ).toBeInTheDocument()
  })

  it('devrait afficher le titre', () => {
    renderPicker()
    expect(screen.getByText('Choisir un emoji')).toBeInTheDocument()
  })

  // ─── GRILLE PAR DÉFAUT ────────────────────────────────────────────────

  it('devrait afficher les emojis par défaut (limités à defaultEmojisCount)', () => {
    renderPicker()
    // defaultEmojisCount=3 → seulement 3 emojis visibles
    expect(screen.getByText('😀')).toBeInTheDocument()
    expect(screen.getByText('😃')).toBeInTheDocument()
    expect(screen.getByText('😄')).toBeInTheDocument()
    // Le 4e ne doit pas être visible
    expect(screen.queryByText('😁')).not.toBeInTheDocument()
  })

  // ─── SÉLECTION D'EMOJI ────────────────────────────────────────────────

  it('devrait appeler onSelect + onClose au clic sur un emoji', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    renderPicker({ onSelect, onClose })

    fireEvent.click(screen.getByText('😀'))

    expect(onSelect).toHaveBeenCalledWith('😀')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('devrait marquer l\'emoji actif avec un border accent', () => {
    renderPicker({ currentEmoji: '😃' })
    const activeBtn = screen.getByText('😃').closest('button')
    expect(activeBtn.style.border).toContain('var(--accent)')
  })

  // ─── FERMETURE ────────────────────────────────────────────────────────

  it('devrait appeler onClose au clic sur l\'overlay (extérieur)', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })

    fireEvent.click(
      document.body.querySelector('[data-testid="emoji-picker-overlay"]')
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onClose au clic sur le container (intérieur)', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })

    fireEvent.click(
      document.body.querySelector('[data-testid="emoji-picker-container"]')
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('devrait fermer sur la touche Escape', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler onClose au clic sur le bouton X', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })

    fireEvent.click(
      document.body.querySelector('[data-testid="emoji-picker-close-button"]')
    )
    expect(onClose).toHaveBeenCalled()
  })

  // ─── EXPAND / COLLAPSE ────────────────────────────────────────────────

  it('devrait afficher le bouton "Afficher plus"', () => {
    renderPicker()
    expect(screen.getByText('Afficher plus')).toBeInTheDocument()
  })

  it('devrait montrer tous les emojis après "Afficher plus"', () => {
    renderPicker()

    fireEvent.click(screen.getByText('Afficher plus'))

    // Maintenant les 8 emojis sont visibles
    expect(screen.getByText('😁')).toBeInTheDocument()
    expect(screen.getByText('🤣')).toBeInTheDocument()
    expect(screen.getByText('😊')).toBeInTheDocument()
  })

  it('devrait afficher le bouton "Afficher moins" quand expanded', () => {
    renderPicker()
    fireEvent.click(screen.getByText('Afficher plus'))

    expect(screen.getByText('Afficher moins')).toBeInTheDocument()
  })

  it('devrait revenir à la vue réduite avec "Afficher moins"', () => {
    renderPicker()

    fireEvent.click(screen.getByText('Afficher plus'))
    fireEvent.click(screen.getByText('Afficher moins'))

    expect(screen.queryByText('😁')).not.toBeInTheDocument()
    expect(screen.getByText('Afficher plus')).toBeInTheDocument()
  })

  // ─── SECTION CUSTOM ───────────────────────────────────────────────────

  it('devrait afficher "Sans catégorie" avec les customs après expand', () => {
    renderPicker()
    fireEvent.click(screen.getByText('Afficher plus'))

    expect(screen.getByText('Sans catégorie')).toBeInTheDocument()
  })

  // ─── AJOUT MANUEL ─────────────────────────────────────────────────────

  it('devrait ouvrir le formulaire d\'ajout manuel', () => {
    renderPicker()

    fireEvent.click(screen.getByText('Ajouter manuellement'))
    expect(
      screen.getByPlaceholderText('Collez un emoji...')
    ).toBeInTheDocument()
  })

  it('devrait appeler addEmoji avec un emoji valide', async () => {
    renderPicker()
    fireEvent.click(screen.getByText('Ajouter manuellement'))

    const input = screen.getByPlaceholderText('Collez un emoji...')
    fireEvent.change(input, { target: { value: '🦄' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Ajouter'))
    })

    expect(mockAddEmoji).toHaveBeenCalledWith('🦄', null)
  })

  it('devrait afficher une erreur si emoji invalide', async () => {
    renderPicker()
    fireEvent.click(screen.getByText('Ajouter manuellement'))

    const input = screen.getByPlaceholderText('Collez un emoji...')
    fireEvent.change(input, { target: { value: 'hello' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Ajouter'))
    })

    expect(screen.getByText('Ce n\'est pas un emoji valide')).toBeInTheDocument()
    expect(mockAddEmoji).not.toHaveBeenCalled()
  })

  it('devrait afficher l\'erreur retournée par addEmoji', async () => {
    mockAddEmoji.mockResolvedValue({ success: false, error: 'Doublon' })
    renderPicker()
    fireEvent.click(screen.getByText('Ajouter manuellement'))

    const input = screen.getByPlaceholderText('Collez un emoji...')
    fireEvent.change(input, { target: { value: '🦄' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Ajouter'))
    })

    expect(screen.getByText('Doublon')).toBeInTheDocument()
  })

  // ─── LIEN GÉRER ───────────────────────────────────────────────────────

  it('devrait appeler onManageClick au clic sur le lien "Gérer la bibliothèque"', () => {
    const onManageClick = vi.fn()
    const onClose = vi.fn()
    renderPicker({ onManageClick, onClose })

    fireEvent.click(screen.getByText('Gérer la bibliothèque'))

    expect(onClose).toHaveBeenCalled()
    expect(onManageClick).toHaveBeenCalled()
  })

  it('ne devrait PAS afficher le lien gérer si showManageLink=false', () => {
    renderPicker({ showManageLink: false })
    expect(screen.queryByText('Gérer la bibliothèque')).not.toBeInTheDocument()
  })
})