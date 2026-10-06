// src/test/components/SidebarEditorHeader.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => {
      const FR = {
        sidebarEditorTitle: 'Éditeur de la sidebar',
        sidebarEditorSub: 'Personnalisez l\'ordre et la visibilité',
        sidebarEditorReset: 'Réinitialiser',
        sidebarEditorSave: 'Sauvegarder',
        cancel: 'Annuler',
        sidebarEditorDragHint: 'Glissez pour réorganiser',
        sidebarEditorShowHide: 'Afficher/Masquer',
        sidebarEditorPin: 'Épingler',
        sidebarEditorPinnedNote: 'Les éléments épinglés apparaissent en haut',
        sidebarEditorDragGroupHint: 'Glissez entre les groupes',
        sidebarEditorFixedHint: 'Les sections verrouillées restent visibles',
      }
      return FR[k] || k
    },
    currentLang: 'fr',
  }),
}))

import SidebarEditorHeader from '@shared/components/navigation/SidebarEditor/SidebarEditorHeader'

const defaultProps = (overrides = {}) => ({
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onReset: vi.fn(),
  fixedSectionsCount: 0,
  ...overrides,
})

describe('SidebarEditorHeader', () => {
  describe('Rendu', () => {
    it('affiche le titre', () => {
      render(<SidebarEditorHeader {...defaultProps()} />)
      expect(screen.getByText('Éditeur de la sidebar')).toBeInTheDocument()
    })

    it('affiche le sous-titre', () => {
      render(<SidebarEditorHeader {...defaultProps()} />)
      expect(screen.getByText(/Personnalisez l'ordre/)).toBeInTheDocument()
    })

    it('affiche 3 boutons (reset, cancel, save)', () => {
      render(<SidebarEditorHeader {...defaultProps()} />)
      expect(screen.getByText('Réinitialiser')).toBeInTheDocument()
      expect(screen.getByText('Annuler')).toBeInTheDocument()
      expect(screen.getByText('Sauvegarder')).toBeInTheDocument()
    })

    it('affiche le toolbar avec les hints', () => {
      render(<SidebarEditorHeader {...defaultProps()} />)
      expect(screen.getByText(/Glissez pour réorganiser/)).toBeInTheDocument()
    })

    it('affiche le count fixedSections (X/2)', () => {
      render(<SidebarEditorHeader {...defaultProps({ fixedSectionsCount: 1 })} />)
      expect(screen.getByText(/1\/2/)).toBeInTheDocument()
    })

    it('affiche 0/2 par défaut', () => {
      render(<SidebarEditorHeader {...defaultProps()} />)
      expect(screen.getByText(/0\/2/)).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('clic "Sauvegarder" appelle onSave', () => {
      const onSave = vi.fn()
      render(<SidebarEditorHeader {...defaultProps({ onSave })} />)
      fireEvent.click(screen.getByText('Sauvegarder'))
      expect(onSave).toHaveBeenCalled()
    })

    it('clic "Annuler" appelle onCancel', () => {
      const onCancel = vi.fn()
      render(<SidebarEditorHeader {...defaultProps({ onCancel })} />)
      fireEvent.click(screen.getByText('Annuler'))
      expect(onCancel).toHaveBeenCalled()
    })

    it('clic "Réinitialiser" appelle onReset', () => {
      const onReset = vi.fn()
      render(<SidebarEditorHeader {...defaultProps({ onReset })} />)
      fireEvent.click(screen.getByText('Réinitialiser'))
      expect(onReset).toHaveBeenCalled()
    })
  })
})