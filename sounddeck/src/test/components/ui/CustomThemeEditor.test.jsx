import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CustomThemeEditor from '@shared/components/ui/CustomThemeEditor'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        // Header
        themeEditorTitle: 'Éditeur de thème personnalisé',
        themeEditorReset: 'Réinitialiser',
        themeEditorApply: 'Appliquer',
        // Presets
        themeEditorPresets: 'Palettes prédéfinies',
        themePresetDefault: 'Violet (défaut)',
        themePresetMidnightBlue: 'Minuit Bleu',
        themePresetForest: 'Forêt',
        themePresetEmber: 'Braise',
        themePresetPastelLight: 'Clair Pastel',
        // Groups
        themeGroupBg: 'Arrière-plans',
        themeGroupText: 'Textes',
        themeGroupAccent: 'Accents',
        themeGroupState: 'États',
        // Fields
        themeFieldBgPrimary: 'Fond principal',
        themeFieldBgSecondary: 'Fond secondaire',
        themeFieldBgTertiary: 'Fond tertiaire',
        themeFieldBgHover: 'Fond survol',
        themeFieldBorder: 'Bordures',
        themeFieldTextPrimary: 'Texte principal',
        themeFieldTextSecondary: 'Texte secondaire',
        themeFieldTextTertiary: 'Texte discret',
        themeFieldAccent: 'Couleur principale',
        themeFieldAccentLight: 'Accent clair',
        themeFieldAccentHover: 'Accent survol',
        themeFieldSuccess: 'Succès',
        themeFieldWarning: 'Avertissement',
        themeFieldDanger: 'Danger',
        // Preview
        themeEditorPreview: 'Aperçu',
        themeEditorPreviewName: 'SoundDeck',
        themeEditorPreviewSub: 'Aperçu du thème',
        themeEditorPrimary: 'Primaire',
        themeEditorSuccess: 'Succès',
        themeEditorDanger: 'Danger',
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

describe('CustomThemeEditor', () => {
  const mockColors = {
    bgPrimary: '#111113',
    bgSecondary: '#1a1a1e',
    bgTertiary: '#222228',
    bgHover: '#2a2a32',
    border: '#2e2e36',
    textPrimary: '#f0f0f2',
    textSecondary: '#a0a0b0',
    textTertiary: '#606070',
    accent: '#7C6FF7',
    accentLight: '#2d2855',
    accentHover: '#9B96FF',
    success: '#1D9E75',
    warning: '#EF9F27',
    danger: '#E05252',
  }

  const defaultProps = {
    current: mockColors,
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup : retire les CSS vars du documentElement
    const vars = [
      '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-hover', '--border',
      '--text-primary', '--text-secondary', '--text-tertiary',
      '--accent', '--accent-light', '--accent-hover',
      '--success', '--warning', '--danger',
    ]
    vars.forEach(v => document.documentElement.style.removeProperty(v))
  })

  const renderEditor = (props = {}) => {
    return render(<CustomThemeEditor {...defaultProps} {...props} />)
  }

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait afficher le titre de l\'éditeur', () => {
    renderEditor()
    expect(screen.getByText('Éditeur de thème personnalisé')).toBeInTheDocument()
  })

  it('devrait afficher les boutons Réinitialiser et Appliquer', () => {
    renderEditor()
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument()
    expect(screen.getByText('Appliquer')).toBeInTheDocument()
  })

  // ─── PRESETS ──────────────────────────────────────────────────────────

  it('devrait afficher les 5 presets', () => {
    renderEditor()
    expect(screen.getByText('Violet (défaut)')).toBeInTheDocument()
    expect(screen.getByText('Minuit Bleu')).toBeInTheDocument()
    expect(screen.getByText('Forêt')).toBeInTheDocument()
    expect(screen.getByText('Braise')).toBeInTheDocument()
    expect(screen.getByText('Clair Pastel')).toBeInTheDocument()
  })

  it('devrait appliquer un preset au clic (marque changed → bouton Appliquer actif)', () => {
    renderEditor()

    // Au départ, bouton Appliquer désactivé (pas de changement)
    const applyBtn = screen.getByText('Appliquer').closest('button')
    expect(applyBtn).toBeDisabled()

    // Applique un preset
    fireEvent.click(screen.getByText('Minuit Bleu'))

    expect(applyBtn).not.toBeDisabled()
  })

  // ─── TABS GROUPES ─────────────────────────────────────────────────────

  it('devrait afficher les 4 groupes (bg, text, accent, state)', () => {
    renderEditor()
    expect(screen.getByText('Arrière-plans')).toBeInTheDocument()
    expect(screen.getByText('Textes')).toBeInTheDocument()
    expect(screen.getByText('Accents')).toBeInTheDocument()
    expect(screen.getByText('États')).toBeInTheDocument()
  })

  it('devrait afficher les champs du groupe "accent" par défaut', () => {
    renderEditor()
    // Le groupe "accent" contient : accent, accentLight, accentHover
    expect(screen.getByText('Couleur principale')).toBeInTheDocument()
    expect(screen.getByText('Accent clair')).toBeInTheDocument()
    expect(screen.getByText('Accent survol')).toBeInTheDocument()
  })

  it('devrait changer de groupe au clic sur un tab', () => {
    renderEditor()

    fireEvent.click(screen.getByText('Arrière-plans'))

    // Le groupe "bg" contient : bgPrimary, bgSecondary, bgTertiary, bgHover, border
    expect(screen.getByText('Fond principal')).toBeInTheDocument()
    expect(screen.getByText('Fond secondaire')).toBeInTheDocument()
    expect(screen.getByText('Bordures')).toBeInTheDocument()
  })

  // ─── INPUTS DE COULEUR ────────────────────────────────────────────────

  it('devrait rendre des inputs type="color" pour chaque champ du groupe', () => {
    renderEditor()
    const colorInputs = document.querySelectorAll('input[type="color"]')
    // Groupe "accent" → 3 champs
    expect(colorInputs.length).toBe(3)
  })

  it('devrait changer une couleur via input', () => {
    renderEditor()

    const colorInputs = document.querySelectorAll('input[type="color"]')
    const firstInput = colorInputs[0]

    fireEvent.change(firstInput, { target: { value: '#ff0000' } })

    // Le bouton Appliquer doit être actif après un changement
    const applyBtn = screen.getByText('Appliquer').closest('button')
    expect(applyBtn).not.toBeDisabled()
  })

  it('devrait mettre à jour la CSS variable sur documentElement après un changement', () => {
    renderEditor()

    const colorInputs = document.querySelectorAll('input[type="color"]')
    fireEvent.change(colorInputs[0], { target: { value: '#abcdef' } })

    // Le premier input du groupe "accent" → --accent
    const cssValue = document.documentElement.style.getPropertyValue('--accent')
    expect(cssValue).toBe('#abcdef')
  })

  // ─── SAVE ─────────────────────────────────────────────────────────────

  it('devrait appeler onSave avec les couleurs au clic sur Appliquer', () => {
    const onSave = vi.fn()
    renderEditor({ onSave })

    // 1. Modifie une couleur pour activer le bouton
    const colorInputs = document.querySelectorAll('input[type="color"]')
    fireEvent.change(colorInputs[0], { target: { value: '#123456' } })

    // 2. Clique sur Appliquer
    fireEvent.click(screen.getByText('Appliquer').closest('button'))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [savedColors, options] = onSave.mock.calls[0]
    expect(savedColors.accent).toBe('#123456')
    expect(options).toEqual({ activate: true })
  })

  it('devrait désactiver le bouton Appliquer sans changement', () => {
    renderEditor()
    const applyBtn = screen.getByText('Appliquer').closest('button')
    expect(applyBtn).toBeDisabled()
  })

  it('devrait désactiver Appliquer après un save (changed=false)', () => {
    const onSave = vi.fn()
    renderEditor({ onSave })

    const colorInputs = document.querySelectorAll('input[type="color"]')
    fireEvent.change(colorInputs[0], { target: { value: '#abcdef' } })
    fireEvent.click(screen.getByText('Appliquer').closest('button'))

    expect(screen.getByText('Appliquer').closest('button')).toBeDisabled()
  })

  // ─── RESET ────────────────────────────────────────────────────────────

  it('devrait restaurer les couleurs par défaut au clic sur Réinitialiser', () => {
    renderEditor()

    // Change d'abord une couleur
    const colorInputs = document.querySelectorAll('input[type="color"]')
    fireEvent.change(colorInputs[0], { target: { value: '#000000' } })

    // Puis reset
    fireEvent.click(screen.getByText('Réinitialiser'))

    // Le bouton Appliquer est actif (changed=true après reset)
    const applyBtn = screen.getByText('Appliquer').closest('button')
    expect(applyBtn).not.toBeDisabled()
  })

  // ─── CLEANUP AU UNMOUNT ───────────────────────────────────────────────

  it('devrait nettoyer les CSS variables au unmount', () => {
    const { unmount } = renderEditor()

    // Change une couleur pour définir une CSS var
    const colorInputs = document.querySelectorAll('input[type="color"]')
    fireEvent.change(colorInputs[0], { target: { value: '#ff00ff' } })

    // Vérifie que la var est définie
    expect(
      document.documentElement.style.getPropertyValue('--accent')
    ).toBe('#ff00ff')

    // Unmount
    unmount()

    // Les vars doivent être nettoyées
    expect(
      document.documentElement.style.getPropertyValue('--accent')
    ).toBe('')
  })

  // ─── PREVIEW ──────────────────────────────────────────────────────────

  it('devrait afficher l\'aperçu du thème', () => {
    renderEditor()
    expect(screen.getByText('Aperçu')).toBeInTheDocument()
    expect(screen.getByText('SoundDeck')).toBeInTheDocument()
  })

  it('devrait utiliser les couleurs passées dans current pour le preview', () => {
    renderEditor()
    // Le preview affiche "SoundDeck" avec textPrimary
    const previewTitle = screen.getByText('SoundDeck')
    expect(previewTitle).toBeInTheDocument()
    expect(previewTitle.style.color).toBe('rgb(240, 240, 242)') // #f0f0f2
  })

  // ─── ROBUSTESSE ───────────────────────────────────────────────────────

  it('devrait utiliser les DEFAULTS si current est null', () => {
    renderEditor({ current: null })
    // Ne doit pas planter
    expect(screen.getByText('Éditeur de thème personnalisé')).toBeInTheDocument()
  })
})