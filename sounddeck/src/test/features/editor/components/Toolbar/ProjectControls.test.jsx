import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// Mock ProjectManagerModal
vi.mock(
  '@features/editor/components/Modals/ProjectManagerModal',
  () => ({
    default: ({ isOpen, onClose, projects }) =>
      isOpen ? (
        <div data-testid="mock-project-manager-modal">
          Modal({projects?.length || 0})
          <button data-testid="mock-modal-close" onClick={onClose}>
            close
          </button>
        </div>
      ) : null,
  })
)

import ProjectControls from '@features/editor/components/Toolbar/ProjectControls'

describe('ProjectControls', () => {
  let onSaveProject
  let onLoadProject
  let onCreateProject
  let onDeleteProject
  let onDuplicateProject
  let onRenameProject
  let onLoadProjectList
  let onExportProject
  let onImportProject
  let tr

  const defaultProps = () => ({
    project: { id: 'p1', name: 'Mon Projet' },
    projectList: [{ id: 'p1', name: 'Mon Projet' }],
    recentProjects: [],
    isSaving: false,
    isLoading: false,
    onSaveProject,
    onLoadProject,
    onCreateProject,
    onDeleteProject,
    onDuplicateProject,
    onRenameProject,
    onLoadProjectList,
    onExportProject,
    onImportProject,
    tr,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onSaveProject = vi.fn()
    onLoadProject = vi.fn()
    onCreateProject = vi.fn()
    onDeleteProject = vi.fn()
    onDuplicateProject = vi.fn()
    onRenameProject = vi.fn()
    onLoadProjectList = vi.fn()
    onExportProject = vi.fn().mockResolvedValue({ success: true })
    onImportProject = vi.fn().mockResolvedValue({ success: true })
    tr = vi.fn((key) => key)

    window.electronAPI = {
      saveFileDialog: vi.fn().mockResolvedValue({
        success: true,
        path: '/export/test.sounddeck',
      }),
      openFileDialog: vi.fn().mockResolvedValue([]),
    }
  })

  // ─── Rendu de base ─────────────────────────────────────────────

  it('devrait rendre les boutons principaux', () => {
    const { container } = render(<ProjectControls {...defaultProps()} />)
    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(3)
  })

  it('devrait afficher le bouton Projets', () => {
    const { getByText } = render(<ProjectControls {...defaultProps()} />)
    expect(getByText('projects')).toBeInTheDocument()
  })

  it('devrait afficher le bouton Sauvegarder', () => {
    const { getByText } = render(<ProjectControls {...defaultProps()} />)
    expect(getByText('save')).toBeInTheDocument()
  })

  it('devrait afficher "Sauvegarde..." si isSaving', () => {
    const { getByText } = render(
      <ProjectControls {...defaultProps()} isSaving={true} />
    )
    expect(getByText('saving')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton Sauvegarder si isSaving', () => {
    const { container } = render(
      <ProjectControls {...defaultProps()} isSaving={true} />
    )
    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('saving')
    )
    expect(saveBtn?.disabled).toBe(true)
  })

  it('devrait désactiver le bouton Sauvegarder si project absent', () => {
    const { container } = render(
      <ProjectControls {...defaultProps()} project={null} />
    )
    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('save')
    )
    expect(saveBtn?.disabled).toBe(true)
  })

  // ─── Save ──────────────────────────────────────────────────────

  describe('save', () => {
    it('devrait appeler onSaveProject au click', () => {
      const { getByText } = render(<ProjectControls {...defaultProps()} />)
      fireEvent.click(getByText('save'))
      expect(onSaveProject).toHaveBeenCalled()
    })
  })

  // ─── Project Manager ───────────────────────────────────────────

  describe('project manager', () => {
    it('ne devrait PAS afficher la modal par défaut', () => {
      const { queryByTestId } = render(<ProjectControls {...defaultProps()} />)
      expect(queryByTestId('mock-project-manager-modal')).toBeNull()
    })

    it('devrait afficher la modal au click sur Projets', () => {
      const { getByText, getByTestId } = render(
        <ProjectControls {...defaultProps()} />
      )
      fireEvent.click(getByText('projects'))
      expect(getByTestId('mock-project-manager-modal')).toBeInTheDocument()
    })

    it('devrait appeler onLoadProjectList au click sur Projets', () => {
      const { getByText } = render(<ProjectControls {...defaultProps()} />)
      fireEvent.click(getByText('projects'))
      expect(onLoadProjectList).toHaveBeenCalled()
    })

    it('devrait fermer la modal via onClose', () => {
      const { getByText, getByTestId, queryByTestId } = render(
        <ProjectControls {...defaultProps()} />
      )
      fireEvent.click(getByText('projects'))
      fireEvent.click(getByTestId('mock-modal-close'))
      expect(queryByTestId('mock-project-manager-modal')).toBeNull()
    })

    it('devrait passer la liste des projets à la modal', () => {
      const projectList = [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ]
      const { getByText, getByTestId } = render(
        <ProjectControls {...defaultProps()} projectList={projectList} />
      )
      fireEvent.click(getByText('projects'))
      expect(getByTestId('mock-project-manager-modal').textContent).toContain(
        'Modal(2)'
      )
    })
  })

  // ─── Menu Export/Import ────────────────────────────────────────

  describe('menu export/import', () => {
    it('devrait ouvrir le menu au click sur le bouton chevron', () => {
      const { container } = render(<ProjectControls {...defaultProps()} />)
      // Le bouton chevron est le 3e ou 4e — on cherche par icon
      const buttons = container.querySelectorAll('button')
      const chevronBtn = Array.from(buttons).find((b) =>
        b.querySelector('.ti-chevron-down')
      )

      fireEvent.click(chevronBtn)

      expect(container.textContent).toContain('exportProject')
      expect(container.textContent).toContain('importProject')
    })

    it('devrait fermer le menu au 2e click', () => {
      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )

      fireEvent.click(chevronBtn)
      fireEvent.click(chevronBtn)

      expect(container.textContent).not.toContain('exportProject')
    })
  })

  // ─── Export ────────────────────────────────────────────────────

  describe('export', () => {
    it('devrait appeler saveFileDialog + onExportProject', async () => {
      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const exportBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('exportProject')
      )

      await act(async () => {
        fireEvent.click(exportBtn)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(window.electronAPI.saveFileDialog).toHaveBeenCalled()
      expect(onExportProject).toHaveBeenCalledWith(
        expect.any(Object),
        '/export/test.sounddeck'
      )
    })

    it('ne devrait PAS appeler onExportProject si annulé', async () => {
      window.electronAPI.saveFileDialog.mockResolvedValue({
        success: false,
        canceled: true,
      })
      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const exportBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('exportProject')
      )

      await act(async () => {
        fireEvent.click(exportBtn)
        await Promise.resolve()
      })

      expect(onExportProject).not.toHaveBeenCalled()
    })

    it('devrait gérer une exception saveFileDialog', async () => {
      window.electronAPI.saveFileDialog.mockRejectedValue(new Error('crash'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const exportBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('exportProject')
      )

      await act(async () => {
        fireEvent.click(exportBtn)
        await Promise.resolve()
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  // ─── Import ────────────────────────────────────────────────────

  describe('import', () => {
    it('devrait appeler openFileDialog + onImportProject', async () => {
      window.electronAPI.openFileDialog.mockResolvedValue([
        '/import/project.sounddeck',
      ])

      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const importBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('importProject')
      )

      await act(async () => {
        fireEvent.click(importBtn)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(window.electronAPI.openFileDialog).toHaveBeenCalled()
      expect(onImportProject).toHaveBeenCalledWith('/import/project.sounddeck')
    })

    it('devrait accepter les extensions .sounddeck et .json', async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(['/x/data.json'])

      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const importBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('importProject')
      )

      await act(async () => {
        fireEvent.click(importBtn)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(onImportProject).toHaveBeenCalledWith('/x/data.json')
    })

    it('ne devrait PAS appeler onImportProject si extension invalide', async () => {
      window.electronAPI.openFileDialog.mockResolvedValue(['/x/data.txt'])

      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const importBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('importProject')
      )

      await act(async () => {
        fireEvent.click(importBtn)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(onImportProject).not.toHaveBeenCalled()
    })

    it('ne devrait rien faire si fichier non sélectionné', async () => {
      window.electronAPI.openFileDialog.mockResolvedValue([])

      const { container } = render(<ProjectControls {...defaultProps()} />)
      const chevronBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-chevron-down')
      )
      fireEvent.click(chevronBtn)

      const importBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('importProject')
      )

      await act(async () => {
        fireEvent.click(importBtn)
        await Promise.resolve()
      })

      expect(onImportProject).not.toHaveBeenCalled()
    })
  })
})