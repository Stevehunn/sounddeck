import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SidebarEditor from '@shared/components/navigation/SidebarEditor'

// ✅ Mock de useLanguage
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {

      sidebarEditorTitle: 'Personnaliser la sidebar',
      sidebarEditorSub: 'Glissez, épinglez, masquez les éléments',
      sidebarEditorSave: 'Enregistrer',
      sidebarEditorReset: 'Réinitialiser',
      sidebarEditorDragHint: 'Glisser pour réorganiser',
      sidebarEditorShowHide: 'Afficher/Masquer',
      sidebarEditorPin: 'Épingler',
      sidebarEditorUnpin: 'Désépingler',
      sidebarEditorPinnedNote: 'Les éléments épinglés apparaissent en haut',
      sidebarEditorPinnedItems: 'toujours en haut',
      sidebarEditorDragGroupHint: 'Déplacez entre les groupes',
      sidebarEditorReorderGroups: 'Ordre des sections',
      sidebarEditorResetConfirm: 'Voulez-vous vraiment réinitialiser la sidebar ?',
      sidebarEditorResetSuccess: 'Sidebar réinitialisée',
      sidebarEditorSaved: 'Configuration sauvegardée',
      cancel: 'Annuler',
      allSounds: 'Tous les sons',
      sidebarEditorPin: 'Épingler',
      sidebarEditorUnpin: 'Désépingler',
      sidebarEditorHide: 'Masquer',
      sidebarEditorShow: 'Afficher',
      sidebarEditorFixedHint: 'Cliquez sur le cadenas pour rendre une section fixe (max 2)',
      fixed: 'Fixe',
      unfixed: 'Défixer',
      lockSection: 'Rendre cette section fixe',
      unlockSection: 'Rendre cette section scrollable'
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

// ✅ Mock de l'API Electron
const mockElectronAPI = {
  storeGet: vi.fn().mockResolvedValue(null),
  storeSet: vi.fn().mockResolvedValue(),
  getSystemLanguage: vi.fn().mockResolvedValue('fr'),
  getSystemKeyboardLayout: vi.fn().mockResolvedValue('qwerty')
}
window.electronAPI = mockElectronAPI

describe('SidebarEditor', () => {
  const defaultProps = {
    config: {
      mode: 'default',
      items: [
        { id: 'home', group: 'navigation', label: 'Mes sons', icon: 'ti-home', visible: true, pinned: false },
        { id: 'discover', group: 'navigation', label: 'Découverte', icon: 'ti-compass', visible: true, pinned: false },
        { id: 'editor', group: 'navigation', label: 'Éditeur', icon: 'ti-cut', visible: true, pinned: false },
        { id: 'sequencer', group: 'navigation', label: 'Séquenceur', icon: 'ti-playlist', visible: true, pinned: false },
        { id: 'youtube', group: 'navigation', label: 'YouTube', icon: 'ti-brand-youtube', visible: true, pinned: false },
        { id: 'loop', group: 'actions', label: 'Répétition', icon: 'ti-repeat', visible: true, pinned: false },
        { id: 'shortcuts', group: 'actions', label: 'Raccourcis', icon: 'ti-keyboard', visible: true, pinned: false },
        { id: 'presentation', group: 'actions', label: 'Présentation', icon: 'ti-layout-grid', visible: true, pinned: false },
        { id: 'guide', group: 'footer', label: 'Guide Discord', icon: 'ti-book', visible: true, pinned: false },
        { id: 'options', group: 'footer', label: 'Options', icon: 'ti-settings', visible: true, pinned: false },
      ],
      sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'],
      fixedSections: []
    },
    profiles: [
      { id: 'all', name: 'Tous les sons', isDefault: true }
    ],
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onReset: vi.fn(),
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderEditor = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<SidebarEditor {...defaultProps} {...props} />)
    })
    // Attendre que le composant s'initialise
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    return result
  }

  it('devrait afficher le titre de l\'éditeur', async () => {
    await renderEditor()
    expect(screen.getByText('Personnaliser la sidebar')).toBeInTheDocument()
  })

  it('devrait afficher le sous-titre', async () => {
    await renderEditor()
    expect(screen.getByText('Glissez, épinglez, masquez les éléments')).toBeInTheDocument()
  })

  it('devrait afficher les boutons Enregistrer et Réinitialiser', async () => {
    await renderEditor()
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument()
  })

  it('devrait appeler onSave quand on clique sur Enregistrer', async () => {
    const onSave = vi.fn()
    await renderEditor({ onSave })
    
    const saveButton = screen.getByText('Enregistrer')
    await act(async () => {
      await userEvent.click(saveButton)
    })
    
    expect(onSave).toHaveBeenCalled()
  })

  it('devrait appeler onCancel quand on clique sur Annuler', async () => {
    const onCancel = vi.fn()
    await renderEditor({ onCancel })
    
    const cancelButton = screen.getByText('Annuler')
    await act(async () => {
      await userEvent.click(cancelButton)
    })
    
    expect(onCancel).toHaveBeenCalled()
  })
})