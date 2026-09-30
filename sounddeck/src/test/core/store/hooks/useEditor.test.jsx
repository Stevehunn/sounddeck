import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditor } from '@core/store/hooks/useEditor'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('useEditor', () => {
  let save
  let electronMock

  const PROJECT_A = { id: 'p-a', name: 'Projet A', updatedAt: 1000 }
  const PROJECT_B = { id: 'p-b', name: 'Projet B', updatedAt: 2000 }

  beforeEach(() => {
    vi.clearAllMocks()
    save = vi.fn().mockResolvedValue()

    electronMock = {
      getAllEditorProjects: vi.fn().mockResolvedValue([PROJECT_A, PROJECT_B]),
      getRecentEditorProjects: vi.fn().mockResolvedValue([PROJECT_B]),
      saveEditorProject: vi.fn().mockResolvedValue({
        success: true,
        project: PROJECT_A,
      }),
      loadEditorProject: vi.fn().mockResolvedValue({
        success: true,
        project: PROJECT_A,
      }),
      deleteEditorProject: vi.fn().mockResolvedValue({ success: true }),
      exportEditorProject: vi.fn().mockResolvedValue({ success: true, path: '/x.json' }),
      importEditorProject: vi.fn().mockResolvedValue({
        success: true,
        project: PROJECT_A,
      }),
      renameEditorProject: vi.fn().mockResolvedValue({
        success: true,
        project: { ...PROJECT_A, name: 'Renommé' },
      }),
      duplicateEditorProject: vi.fn().mockResolvedValue({
        success: true,
        project: { ...PROJECT_A, id: 'p-copy' },
      }),
    }
    window.electronAPI = electronMock
  })

  const render = () => renderHook(() => useEditor(save))

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT INITIAL
  // ════════════════════════════════════════════════════════════════════

  describe('état initial', () => {
    it('devrait démarrer avec editorProjects=[]', () => {
      const { result } = render()
      expect(result.current.editorProjects).toEqual([])
    })

    it('devrait démarrer avec recentEditorProjects=[]', () => {
      const { result } = render()
      expect(result.current.recentEditorProjects).toEqual([])
    })

    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()
      expect(typeof result.current.loadAllEditorProjects).toBe('function')
      expect(typeof result.current.loadRecentEditorProjects).toBe('function')
      expect(typeof result.current.saveEditorProject).toBe('function')
      expect(typeof result.current.loadEditorProject).toBe('function')
      expect(typeof result.current.deleteEditorProject).toBe('function')
      expect(typeof result.current.exportEditorProject).toBe('function')
      expect(typeof result.current.importEditorProject).toBe('function')
      expect(typeof result.current.renameEditorProject).toBe('function')
      expect(typeof result.current.duplicateEditorProject).toBe('function')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // LOAD
  // ════════════════════════════════════════════════════════════════════

  describe('loadAllEditorProjects', () => {
    it('devrait charger tous les projets', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.loadAllEditorProjects()
      })

      expect(result.current.editorProjects).toEqual([PROJECT_A, PROJECT_B])
    })

    it('devrait retourner la liste', async () => {
      const { result } = render()

      let projects
      await act(async () => {
        projects = await result.current.loadAllEditorProjects()
      })

      expect(projects).toEqual([PROJECT_A, PROJECT_B])
    })

    it('devrait gérer une erreur sans planter', async () => {
      electronMock.getAllEditorProjects.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let projects
      await act(async () => {
        projects = await result.current.loadAllEditorProjects()
      })

      expect(projects).toEqual([])
    })

    it('devrait gérer electronAPI absent', async () => {
      delete window.electronAPI.getAllEditorProjects
      const { result } = render()

      let projects
      await act(async () => {
        projects = await result.current.loadAllEditorProjects()
      })

      expect(projects).toEqual([])
    })
  })

  describe('loadRecentEditorProjects', () => {
    it('devrait charger les projets récents', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.loadRecentEditorProjects()
      })

      expect(result.current.recentEditorProjects).toEqual([PROJECT_B])
    })

    it('devrait gérer une erreur sans planter', async () => {
      electronMock.getRecentEditorProjects.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let recent
      await act(async () => {
        recent = await result.current.loadRecentEditorProjects()
      })

      expect(recent).toEqual([])
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // SAVE
  // ════════════════════════════════════════════════════════════════════

  describe('saveEditorProject', () => {
    it('devrait sauvegarder un projet', async () => {
      const { result } = render()

      let saved
      await act(async () => {
        saved = await result.current.saveEditorProject(PROJECT_A)
      })

      expect(saved).toEqual(PROJECT_A)
      expect(electronMock.saveEditorProject).toHaveBeenCalledWith(PROJECT_A)
    })

    it('devrait recharger les projets récents après save', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.saveEditorProject(PROJECT_A)
      })

      expect(electronMock.getRecentEditorProjects).toHaveBeenCalled()
    })

    it('devrait retourner null si succès=false', async () => {
      electronMock.saveEditorProject.mockResolvedValue({ success: false })
      const { result } = render()

      let saved
      await act(async () => {
        saved = await result.current.saveEditorProject(PROJECT_A)
      })

      expect(saved).toBeNull()
    })

    it('devrait gérer une erreur sans planter', async () => {
      electronMock.saveEditorProject.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let saved
      await act(async () => {
        saved = await result.current.saveEditorProject(PROJECT_A)
      })

      expect(saved).toBeNull()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // LOAD SINGLE
  // ════════════════════════════════════════════════════════════════════

  describe('loadEditorProject', () => {
    it('devrait charger un projet par ID', async () => {
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.loadEditorProject('p-a')
      })

      expect(project).toEqual(PROJECT_A)
      expect(electronMock.loadEditorProject).toHaveBeenCalledWith('p-a')
    })

    it('devrait retourner null si succès=false', async () => {
      electronMock.loadEditorProject.mockResolvedValue({ success: false })
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.loadEditorProject('unknown')
      })

      expect(project).toBeNull()
    })

    it('devrait gérer une erreur', async () => {
      electronMock.loadEditorProject.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.loadEditorProject('p-a')
      })

      expect(project).toBeNull()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // DELETE
  // ════════════════════════════════════════════════════════════════════

  describe('deleteEditorProject', () => {
    it('devrait supprimer un projet', async () => {
      const { result } = render()

      let ok
      await act(async () => {
        ok = await result.current.deleteEditorProject('p-a')
      })

      expect(ok).toBe(true)
      expect(electronMock.deleteEditorProject).toHaveBeenCalledWith('p-a')
    })

    it('devrait recharger les projets après suppression', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.deleteEditorProject('p-a')
      })

      expect(electronMock.getAllEditorProjects).toHaveBeenCalled()
      expect(electronMock.getRecentEditorProjects).toHaveBeenCalled()
    })

    it('devrait retourner false si succès=false', async () => {
      electronMock.deleteEditorProject.mockResolvedValue({ success: false })
      const { result } = render()

      let ok
      await act(async () => {
        ok = await result.current.deleteEditorProject('unknown')
      })

      expect(ok).toBe(false)
    })

    it('devrait gérer une erreur', async () => {
      electronMock.deleteEditorProject.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let ok
      await act(async () => {
        ok = await result.current.deleteEditorProject('p-a')
      })

      expect(ok).toBe(false)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════════

  describe('exportEditorProject', () => {
    it('devrait exporter un projet', async () => {
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.exportEditorProject(PROJECT_A, '/x.json')
      })

      expect(res).toEqual({ success: true, path: '/x.json' })
      expect(electronMock.exportEditorProject).toHaveBeenCalledWith(PROJECT_A, '/x.json')
    })

    it('devrait retourner { success: false } sur erreur', async () => {
      electronMock.exportEditorProject.mockRejectedValue(new Error('disk full'))
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.exportEditorProject(PROJECT_A, '/x.json')
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('disk full')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // IMPORT
  // ════════════════════════════════════════════════════════════════════

  describe('importEditorProject', () => {
    it('devrait importer un projet', async () => {
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.importEditorProject('/import.json')
      })

      expect(project).toEqual(PROJECT_A)
    })

    it('devrait recharger les projets après import', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.importEditorProject('/import.json')
      })

      expect(electronMock.getAllEditorProjects).toHaveBeenCalled()
    })

    it('devrait retourner null si succès=false', async () => {
      electronMock.importEditorProject.mockResolvedValue({ success: false })
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.importEditorProject('/invalid.json')
      })

      expect(project).toBeNull()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // RENAME
  // ════════════════════════════════════════════════════════════════════

  describe('renameEditorProject', () => {
    it('devrait renommer un projet', async () => {
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.renameEditorProject('p-a', 'Nouveau')
      })

      expect(project.name).toBe('Renommé')
      expect(electronMock.renameEditorProject).toHaveBeenCalledWith('p-a', 'Nouveau')
    })

    it('devrait recharger les projets', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.renameEditorProject('p-a', 'X')
      })

      expect(electronMock.getAllEditorProjects).toHaveBeenCalled()
    })

    it('devrait retourner null si erreur', async () => {
      electronMock.renameEditorProject.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.renameEditorProject('p-a', 'X')
      })

      expect(project).toBeNull()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // DUPLICATE
  // ════════════════════════════════════════════════════════════════════

  describe('duplicateEditorProject', () => {
    it('devrait dupliquer un projet', async () => {
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.duplicateEditorProject('p-a')
      })

      expect(project.id).toBe('p-copy')
    })

    it('devrait recharger les projets', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.duplicateEditorProject('p-a')
      })

      expect(electronMock.getAllEditorProjects).toHaveBeenCalled()
    })

    it('devrait retourner null si erreur', async () => {
      electronMock.duplicateEditorProject.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let project
      await act(async () => {
        project = await result.current.duplicateEditorProject('p-a')
      })

      expect(project).toBeNull()
    })
  })
})