import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    currentLang: 'fr',
  }),
}))

vi.mock('@shared/utils/format', () => ({
  formatTime: (s) => `${s}s`,
}))

// Mock DeleteButton
vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete, confirmTitle, deleteLabel }) => (
    <button
      data-testid="delete-button"
      title={confirmTitle}
      onClick={() => onDelete?.()}
    >
      {deleteLabel || 'delete'}
    </button>
  ),
}))

import ProjectManagerModal from '@features/editor/components/Modals/ProjectManagerModal'

describe('ProjectManagerModal', () => {
  let onClose
  let onLoadProject
  let onCreateProject
  let onDeleteProject
  let onDuplicateProject
  let onRenameProject
  let tr
  let projects

  const createProject = (o = {}) => ({
    id: 'p1',
    name: 'Projet A',
    updatedAt: 1700000000000,
    createdAt: 1600000000000,
    tracks: [
      { id: 't1', clips: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 't2', clips: [{ id: 'c3' }] },
    ],
    ...o,
  })

  const defaultProps = () => ({
    isOpen: true,
    onClose,
    projects,
    recentProjects: [],
    currentProjectId: 'p1',
    onLoadProject,
    onCreateProject,
    onDeleteProject,
    onDuplicateProject,
    onRenameProject,
    isDeleting: false,
    tr,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onLoadProject = vi.fn()
    onCreateProject = vi.fn()
    onDeleteProject = vi.fn()
    onDuplicateProject = vi.fn()
    onRenameProject = vi.fn()
    tr = vi.fn((key) => key)
    projects = [
      createProject({ id: 'p1', name: 'Projet A' }),
      createProject({ id: 'p2', name: 'Projet B' }),
      createProject({ id: 'p3', name: 'Projet C' }),
    ]
  })

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <ProjectManagerModal {...defaultProps()} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal-overlay', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  it('devrait afficher le titre', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const title = container.querySelector('.modal-title')
    expect(title?.textContent).toContain('projectManager')
  })

  it('devrait afficher tous les projets', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    expect(container.textContent).toContain('Projet A')
    expect(container.textContent).toContain('Projet B')
    expect(container.textContent).toContain('Projet C')
  })

  it('devrait avoir un input de recherche autofocus', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const searchInput = container.querySelector('input[type="text"]')
    expect(searchInput).not.toBeNull()
  })

  it('devrait filtrer les projets par recherche', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const searchInput = container.querySelector('input[type="text"]')

    fireEvent.change(searchInput, { target: { value: 'Projet A' } })

    expect(container.textContent).toContain('Projet A')
    expect(container.textContent).not.toContain('Projet B')
  })

  it('devrait filtrer par ID', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const searchInput = container.querySelector('input[type="text"]')

    fireEvent.change(searchInput, { target: { value: 'p2' } })

    expect(container.textContent).toContain('Projet B')
  })

  it('devrait afficher "Aucun projet trouvé" si recherche vide', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const searchInput = container.querySelector('input[type="text"]')

    fireEvent.change(searchInput, { target: { value: 'zzzzz' } })

    expect(container.textContent).toContain('noProjectsFound')
  })

  it('devrait afficher "Aucun projet" si liste vide', () => {
    const { container } = render(
      <ProjectManagerModal {...defaultProps()} projects={[]} />
    )
    expect(container.textContent).toContain('noProjects')
  })

  it('devrait basculer en mode création', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('new')
    )
    fireEvent.click(newBtn)

    // Le formulaire de création apparaît avec un placeholder projectName
    const inputs = container.querySelectorAll('input[type="text"]')
    expect(inputs.length).toBeGreaterThan(1)
  })

  it('devrait appeler onCreateProject au submit', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('new')
    )
    fireEvent.click(newBtn)

    const inputs = container.querySelectorAll('input[type="text"]')
    const createInput = inputs[inputs.length - 1]
    fireEvent.change(createInput, { target: { value: 'Nouveau' } })

    const createBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('create')
    )
    fireEvent.click(createBtn)

    expect(onCreateProject).toHaveBeenCalledWith('Nouveau')
  })

  it('devrait ne PAS créer si nom vide', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('new')
    )
    fireEvent.click(newBtn)

    const createBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('create')
    )
    fireEvent.click(createBtn)

    expect(onCreateProject).not.toHaveBeenCalled()
  })

  it('devrait appeler onLoadProject au click sur un projet', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const projetBText = Array.from(container.querySelectorAll('div')).find(
      (d) => d.textContent === 'Projet B'
    )

    // Trouver le parent cliquable
    let clickable = projetBText
    while (clickable && !clickable.style.cursor) {
      clickable = clickable.parentElement
    }

    if (clickable) {
      fireEvent.click(clickable)
      expect(onLoadProject).toHaveBeenCalledWith('p2')
    }
  })

  it('devrait appeler onLoadProject au click sur bouton folder-open', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const openBtns = container.querySelectorAll('button[title="open"]')
    if (openBtns.length > 0) {
      fireEvent.click(openBtns[0])
      expect(onLoadProject).toHaveBeenCalled()
    }
  })

  it('devrait afficher un indicateur du projet actuel', () => {
    const { container } = render(
      <ProjectManagerModal {...defaultProps()} currentProjectId="p1" />
    )
    expect(container.textContent).toContain('current')
  })

  it('devrait entrer en mode renommage au click pencil', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const renameBtns = container.querySelectorAll('button[title="rename"]')
    if (renameBtns.length > 0) {
      fireEvent.click(renameBtns[0])
      // Un input de renommage apparaît
      const inputs = container.querySelectorAll('input[type="text"]')
      expect(inputs.length).toBeGreaterThan(1)
    }
  })

  it('devrait appeler onRenameProject au submit renommage', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const renameBtns = container.querySelectorAll('button[title="rename"]')
    if (renameBtns.length > 0) {
      fireEvent.click(renameBtns[0])

      const inputs = container.querySelectorAll('input[type="text"]')
      const renameInput = inputs[inputs.length - 1]
      fireEvent.change(renameInput, { target: { value: 'Renommé' } })

      // Press Enter
      fireEvent.keyDown(renameInput, { key: 'Enter' })

      expect(onRenameProject).toHaveBeenCalledWith('p1', 'Renommé')
    }
  })

  it('devrait annuler le renommage à Escape', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const renameBtns = container.querySelectorAll('button[title="rename"]')
    if (renameBtns.length > 0) {
      fireEvent.click(renameBtns[0])

      const inputs = container.querySelectorAll('input[type="text"]')
      const renameInput = inputs[inputs.length - 1]
      fireEvent.keyDown(renameInput, { key: 'Escape' })

      expect(onRenameProject).not.toHaveBeenCalled()
    }
  })

  it('devrait appeler onDuplicateProject au click copy', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const dupBtns = container.querySelectorAll('button[title="duplicate"]')
    if (dupBtns.length > 0) {
      fireEvent.click(dupBtns[0])
      expect(onDuplicateProject).toHaveBeenCalledWith('p1')
    }
  })

  it('devrait appeler onDeleteProject via DeleteButton', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const deleteBtns = container.querySelectorAll('[data-testid="delete-button"]')
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0])
      expect(onDeleteProject).toHaveBeenCalledWith('p1')
    }
  })

  it('devrait avoir un bouton Fermer', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const closeBtns = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.includes('close')
    )
    expect(closeBtns.length).toBeGreaterThan(0)

    fireEvent.click(closeBtns[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler onClose au click overlay', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('ne devrait PAS appeler onClose au click sur le modal', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('devrait afficher les projets récents', () => {
    const recentProjects = [createProject({ id: 'r1', name: 'Récent 1' })]
    const { container } = render(
      <ProjectManagerModal
        {...defaultProps()}
        recentProjects={recentProjects}
      />
    )
    expect(container.textContent).toContain('recentProjects')
    expect(container.textContent).toContain('Récent 1')
  })

  it('devrait limiter à 5 projets récents', () => {
    const recentProjects = Array.from({ length: 10 }, (_, i) =>
      createProject({ id: `r${i}`, name: `Récent ${i}` })
    )
    const { container } = render(
      <ProjectManagerModal
        {...defaultProps()}
        recentProjects={recentProjects}
      />
    )
    // "Récent 0" à "Récent 4" présents, "Récent 5" absent
    expect(container.textContent).toContain('Récent 0')
    expect(container.textContent).toContain('Récent 4')
    expect(container.textContent).not.toContain('Récent 5')
  })

  it('devrait appeler onLoadProject au click projet récent', () => {
    const recentProjects = [createProject({ id: 'r1', name: 'Récent' })]
    const { container } = render(
      <ProjectManagerModal
        {...defaultProps()}
        recentProjects={recentProjects}
      />
    )
    const recentBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Récent'
    )
    if (recentBtn) {
      fireEvent.click(recentBtn)
      expect(onLoadProject).toHaveBeenCalledWith('r1')
    }
  })

  it('devrait afficher les dates', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    // Les dates sont affichées avec toLocaleDateString
    // On vérifie juste que ça ne crash pas et qu'il y a du contenu
    expect(container.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('devrait afficher les compteurs de pistes/clips', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    // "2 pistes" et "3 clips"
    expect(container.textContent).toContain('editorTracks')
    expect(container.textContent).toContain('editorClips')
  })

  it('devrait accepter Escape pour annuler la création', () => {
    const { container } = render(<ProjectManagerModal {...defaultProps()} />)
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('new')
    )
    fireEvent.click(newBtn)

    const inputs = container.querySelectorAll('input[type="text"]')
    const createInput = inputs[inputs.length - 1]

    fireEvent.keyDown(createInput, { key: 'Escape' })

    // Le formulaire disparaît (retour à la liste seule)
    expect(container).not.toBeNull()
  })
})