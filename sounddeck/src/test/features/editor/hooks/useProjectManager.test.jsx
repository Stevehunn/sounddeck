// src/test/features/editor/hooks/useProjectManager.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k, p) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}))

vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock('@shared/utils/uuid', () => ({
  uuid: vi.fn((prefix = '') => `${prefix ? prefix + '-' : ''}test-uuid`),
}))

import { useProjectManager } from '@features/editor/hooks/useProjectManager'

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeApi = (overrides = {}) => ({
  getAllEditorProjects: vi.fn().mockResolvedValue([
    { id: 'p1', name: 'Projet 1' },
    { id: 'p2', name: 'Projet 2' },
  ]),
  getRecentEditorProjects: vi.fn().mockResolvedValue([
    { id: 'p1', name: 'Projet 1' },
  ]),
  saveEditorProject: vi.fn().mockImplementation(async (p) => ({
    success: true,
    project: { ...p, updatedAt: Date.now() },
  })),
  loadEditorProject: vi.fn().mockResolvedValue({
    success: true,
    project: { id: 'p1', name: 'Projet 1' },
  }),
  deleteEditorProject: vi.fn().mockResolvedValue({ success: true }),
  exportEditorProject: vi.fn().mockResolvedValue({ success: true, path: '/out.json' }),
  importEditorProject: vi.fn().mockResolvedValue({
    success: true,
    project: { id: 'p9', name: 'Importé' },
  }),
  duplicateEditorProject: vi.fn().mockResolvedValue({
    success: true,
    project: { id: 'p10', name: 'Projet 1 (copie)' },
  }),
  renameEditorProject: vi.fn().mockImplementation(async (id, name) => ({
    success: true,
    project: { id, name },
  })),
  storeSet: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

const makeStore = () => ({
  sounds: [],
  profiles: [],
})

const makeDeps = (overrides = {}) => {
  const setProject = vi.fn()
  const addToast = vi.fn()
  return {
    store: makeStore(),
    project: null,
    setProject,
    addToast,
    ...overrides,
  }
}

beforeEach(() => {
  global.window.electronAPI = makeApi()
})

const setup = (depsOverrides = {}) => {
  const deps = makeDeps(depsOverrides)
  const hook = renderHook(() =>
    useProjectManager(deps.store, deps.project, deps.setProject, deps.addToast)
  )
  return { ...hook, deps }
}

describe('useProjectManager', () => {
  describe('Init', () => {
    it('charge les projets au mount', async () => {
      const { deps } = setup()
      await waitFor(() => {
        expect(window.electronAPI.getAllEditorProjects).toHaveBeenCalled()
        expect(window.electronAPI.getRecentEditorProjects).toHaveBeenCalled()
      })
    })

    it('expose isSaving / isLoading à false par défaut', () => {
      const { result } = setup()
      expect(result.current.isSaving).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('expose les listes de projets', async () => {
      const { result } = setup()
      await waitFor(() => expect(result.current.projectList.length).toBe(2))
      expect(result.current.recentProjects.length).toBe(1)
    })
  })

  describe('loadProjectList / loadRecentProjects', () => {
    it('loadProjectList met à jour la liste', async () => {
      const { result } = setup()
      await act(async () => {
        await result.current.loadProjectList()
      })
      expect(result.current.projectList).toHaveLength(2)
    })

    it('loadRecentProjects met à jour les récents', async () => {
      const { result } = setup()
      await act(async () => {
        await result.current.loadRecentProjects()
      })
      expect(result.current.recentProjects).toHaveLength(1)
    })

    it('loadProjectList gère erreur → toast', async () => {
      window.electronAPI.getAllEditorProjects.mockRejectedValueOnce(new Error('boom'))
      const { result, deps } = setup()
      await act(async () => {
        await result.current.loadProjectList()
      })
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectLoadListError'),
        'error'
      )
    })
  })

  describe('saveProject', () => {
    it('retourne null sans project', async () => {
      const { result, deps } = setup()
      let returned
      await act(async () => {
        returned = await result.current.saveProject()
      })
      expect(returned).toBeNull()
      expect(deps.addToast).toHaveBeenCalledWith('toastProjectNoProjectToSave', 'warning')
    })

    it('sauvegarde et met à jour project', async () => {
      const project = { id: 'p1', name: 'Test' }
      const { result, deps } = setup({ project })

      await act(async () => {
        await result.current.saveProject()
      })

      expect(window.electronAPI.saveEditorProject).toHaveBeenCalledWith(project)
      expect(deps.setProject).toHaveBeenCalled()
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectSaved'),
        'success'
      )
    })

    it('gère erreur save → toast', async () => {
      window.electronAPI.saveEditorProject.mockRejectedValueOnce(new Error('disk'))
      const project = { id: 'p1' }
      const { result, deps } = setup({ project })

      await act(async () => {
        await result.current.saveProject()
      })

      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectSaveError'),
        'error'
      )
    })
  })

  describe('loadProject', () => {
    it('charge et set project', async () => {
      const { result, deps } = setup()
      await act(async () => {
        await result.current.loadProject('p1')
      })

      expect(deps.setProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' })
      )
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectLoaded'),
        'success'
      )
    })

    it('gère erreur load → toast not found', async () => {
      window.electronAPI.loadEditorProject.mockResolvedValueOnce({ success: false })
      const { result, deps } = setup()
      await act(async () => {
        await result.current.loadProject('unknown')
      })
      expect(deps.addToast).toHaveBeenCalledWith('toastProjectNotFound', 'error')
    })
  })

  describe('createProject', () => {
    it('crée un projet avec uuid', async () => {
      const { result, deps } = setup()
      let created
      await act(async () => {
        created = await result.current.createProject('Mon Projet')
      })

      expect(window.electronAPI.saveEditorProject).toHaveBeenCalled()
      expect(deps.setProject).toHaveBeenCalled()
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectCreated'),
        'success'
      )
    })

    it('utilise le nom par défaut si name vide', async () => {
      const { result } = setup()
      await act(async () => {
        await result.current.createProject('')
      })
      const [saved] = window.electronAPI.saveEditorProject.mock.calls.at(-1)
      expect(saved.name).toContain('editorNoProject')
    })
  })

  describe('deleteProject', () => {
    it('supprime et retourne true', async () => {
      const { result, deps } = setup()
      let ok
      await act(async () => {
        ok = await result.current.deleteProject('p1')
      })
      expect(ok).toBe(true)
      expect(deps.addToast).toHaveBeenCalledWith('toastProjectDeleted', 'info')
    })

    it('retourne false si échec', async () => {
      window.electronAPI.deleteEditorProject.mockResolvedValueOnce({ success: false })
      const { result } = setup()
      let ok
      await act(async () => {
        ok = await result.current.deleteProject('p1')
      })
      expect(ok).toBe(false)
    })
  })

  describe('exportProject', () => {
    it('exporte et toast success', async () => {
      const { result, deps } = setup()
      await act(async () => {
        await result.current.exportProject({ id: 'p1' }, '/out.json')
      })
      expect(deps.addToast).toHaveBeenCalledWith('toastProjectExported', 'success')
    })
  })

  describe('importProject', () => {
    it('importe et set project', async () => {
      const { result, deps } = setup()
      await act(async () => {
        await result.current.importProject('/in.json')
      })
      expect(deps.setProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p9' })
      )
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectImported'),
        'success'
      )
    })
  })

  describe('duplicateProject', () => {
    it('duplique et toast success', async () => {
      const { result, deps } = setup()
      await act(async () => {
        await result.current.duplicateProject('p1')
      })
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectDuplicated'),
        'success'
      )
    })
  })

  describe('renameProject', () => {
    it('renomme et toast success', async () => {
      const project = { id: 'p1', name: 'Old' }
      const { result, deps } = setup({ project })

      await act(async () => {
        await result.current.renameProject('p1', 'New Name')
      })

      expect(window.electronAPI.renameEditorProject).toHaveBeenCalledWith(
        'p1',
        'New Name'
      )
      expect(deps.setProject).toHaveBeenCalled()
      expect(deps.addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastProjectRenamed'),
        'success'
      )
    })

    it('trim le nom', async () => {
      const { result } = setup()
      await act(async () => {
        await result.current.renameProject('p1', '  New  ')
      })
      const [, name] = window.electronAPI.renameEditorProject.mock.calls.at(-1)
      expect(name).toBe('New')
    })

    it('retourne null si nom vide', async () => {
      const { result } = setup()
      let returned
      await act(async () => {
        returned = await result.current.renameProject('p1', '   ')
      })
      expect(returned).toBeNull()
      expect(window.electronAPI.renameEditorProject).not.toHaveBeenCalled()
    })

    it('retourne null si projectId manquant + toast', async () => {
      const { result, deps } = setup()
      await act(async () => {
        await result.current.renameProject(null, 'X')
      })
      expect(deps.addToast).toHaveBeenCalledWith('toastProjectMissingId', 'error')
    })
  })
})