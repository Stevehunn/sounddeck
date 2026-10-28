/**
 * @file Editor project lifecycle hook.
 *
 * Wraps the `electronAPI.*EditorProject` IPC calls into a React-friendly
 * API:
 * - **List** — `loadProjectList`, `loadRecentProjects`.
 * - **CRUD** — `saveProject`, `loadProject`, `createProject`,
 *   `deleteProject`, `duplicateProject`, `renameProject`.
 * - **Transfer** — `exportProject`, `importProject`.
 *
 * Every operation returns the server response (or `null` on error) and
 * shows a toast via `addToast`.
 *
 * The initial mount fetches both the full project list and the "recent
 * projects" list. `store` is accepted for API compatibility with the
 * parent (`Editor.jsx`) but isn't currently read.
 *
 * @see @features/editor/Editor.jsx — the caller
 * @see electron/modules/projectHandlers.js — IPC surface
 */

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { logError } from '@shared/utils/logger'
import { uuid } from '@shared/utils/uuid'

/**
 * Editor project lifecycle hook.
 *
 * @param {Object} _store - App store (unused; kept for API compatibility).
 * @param {Object|null} project - Currently-open project.
 * @param {(p: Object) => void} setProject - Project setter.
 * @param {(msg: string, type?: string) => void} [addToast]
 * @returns {{
 *   isSaving: boolean,
 *   isLoading: boolean,
 *   projectList: Array<Object>,
 *   recentProjects: Array<Object>,
 *   loadProjectList: () => Promise<Array<Object>>,
 *   loadRecentProjects: () => Promise<Array<Object>>,
 *   saveProject: () => Promise<Object|null>,
 *   loadProject: (projectId: string) => Promise<Object|null>,
 *   createProject: (name?: string) => Promise<Object|null>,
 *   deleteProject: (projectId: string) => Promise<boolean>,
 *   exportProject: (data: Object, path?: string) => Promise<Object|null>,
 *   importProject: (path: string) => Promise<Object|null>,
 *   duplicateProject: (projectId: string) => Promise<Object|null>,
 *   renameProject: (projectId: string, newName: string) => Promise<Object|null>,
 * }}
 */
export function useProjectManager(_store, project, setProject, addToast) {
  const { t } = useLanguage()

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [projectList, setProjectList] = useState([])
  const [recentProjects, setRecentProjects] = useState([])

  // ─── LISTS ──────────────────────────────────────────────────────────

  const loadProjectList = useCallback(async () => {
    try {
      const projects = (await window.electronAPI.getAllEditorProjects?.()) || []
      setProjectList(projects)
      return projects
    } catch (e) {
      logError('useProjectManager', 'Project list loading error', e)
      addToast?.(t('toastProjectLoadListError'), 'error')
      return []
    }
  }, [addToast, t])

  const loadRecentProjects = useCallback(async () => {
    try {
      const recent =
        (await window.electronAPI.getRecentEditorProjects?.()) || []
      setRecentProjects(recent)
      return recent
    } catch (e) {
      logError('useProjectManager', 'Recent projects loading error', e)
      addToast?.(t('toastProjectLoadRecentError'), 'error')
      return []
    }
  }, [addToast, t])

  // ─── SAVE ───────────────────────────────────────────────────────────

  const saveProject = useCallback(async () => {
    if (!project) {
      addToast?.(t('toastProjectNoProjectToSave'), 'warning')
      return null
    }

    setIsSaving(true)

    try {
      const result = await window.electronAPI.saveEditorProject?.(project)

      if (result?.success) {
        setProject(result.project)
        await loadProjectList()
        await loadRecentProjects()
        addToast?.(
          t('toastProjectSaved', { name: result.project.name }),
          'success'
        )
        return result.project
      }

      addToast?.(t('toastProjectSaveError'), 'error')
      return null
    } catch (e) {
      logError('useProjectManager', 'Save error', e)
      addToast?.(`${t('toastProjectSaveError')}: ${e.message}`, 'error')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [project, setProject, addToast, t, loadProjectList, loadRecentProjects])

  // ─── LOAD ───────────────────────────────────────────────────────────

  const loadProject = useCallback(
    async (projectId) => {
      setIsLoading(true)

      try {
        const result = await window.electronAPI.loadEditorProject?.(projectId)

        if (result?.success) {
          setProject(result.project)

          try {
            await window.electronAPI.storeSet?.(
              'currentEditorProjectId',
              projectId
            )
            await window.electronAPI.saveEditorProject?.(result.project)
          } catch (e) {
            logError(
              'useProjectManager',
              'Store currentEditorProjectId error',
              e
            )
          }

          await loadRecentProjects()
          addToast?.(
            t('toastProjectLoaded', { name: result.project.name }),
            'success'
          )
          return result.project
        }

        addToast?.(t('toastProjectNotFound'), 'error')
        return null
      } catch (e) {
        logError('useProjectManager', 'Load error', e)
        addToast?.(`${t('toastProjectLoadError')}: ${e.message}`, 'error')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [setProject, addToast, t, loadRecentProjects]
  )

  // ─── CREATE ─────────────────────────────────────────────────────────

  const createProject = useCallback(
    async (name) => {
      try {
        const newProject = {
          id: uuid('project'),
          name: name || t('editorNoProject'),
          tracks: [],
          markers: [],
          loops: {
            clips: {},
            timeline: {
              enabled: false,
              start: 0,
              end: 10,
              color: '#7C6FF7',
              durationMode: 'cycles',
              cycleCount: 3,
              manualDuration: 10,
            },
          },
          duration: 60,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const result = await window.electronAPI.saveEditorProject?.(newProject)

        if (result?.success) {
          setProject(result.project)
          await loadProjectList()
          await loadRecentProjects()
          addToast?.(
            t('toastProjectCreated', { name: result.project.name }),
            'success'
          )
          return result.project
        }

        addToast?.(t('toastProjectCreateError'), 'error')
        return null
      } catch (e) {
        logError('useProjectManager', 'Create error', e)
        addToast?.(`${t('toastProjectCreateError')}: ${e.message}`, 'error')
        return null
      }
    },
    [setProject, addToast, t, loadProjectList, loadRecentProjects]
  )

  // ─── DELETE ─────────────────────────────────────────────────────────

  const deleteProject = useCallback(
    async (projectId) => {
      try {
        const result =
          await window.electronAPI.deleteEditorProject?.(projectId)

        if (result?.success) {
          await loadProjectList()
          await loadRecentProjects()
          addToast?.(t('toastProjectDeleted'), 'info')
          return true
        }
        return false
      } catch (e) {
        logError('useProjectManager', 'Delete error', e)
        addToast?.(`${t('toastProjectDeleteError')}: ${e.message}`, 'error')
        return false
      }
    },
    [addToast, t, loadProjectList, loadRecentProjects]
  )

  // ─── EXPORT / IMPORT ────────────────────────────────────────────────

  const exportProject = useCallback(
    async (projectData, filePath) => {
      try {
        const result = await window.electronAPI.exportEditorProject?.(
          projectData,
          filePath
        )
        if (result?.success) {
          addToast?.(t('toastProjectExported'), 'success')
          return result
        }
        addToast?.(
          `${t('toastProjectExportError')}: ${result?.error || t('unknown')}`,
          'error'
        )
        return null
      } catch (e) {
        logError('useProjectManager', 'Export error', e)
        addToast?.(`${t('toastProjectExportError')}: ${e.message}`, 'error')
        return null
      }
    },
    [addToast, t]
  )

  const importProject = useCallback(
    async (filePath) => {
      try {
        const result =
          await window.electronAPI.importEditorProject?.(filePath)

        if (result?.success) {
          setProject(result.project)
          await loadProjectList()
          await loadRecentProjects()
          addToast?.(
            t('toastProjectImported', { name: result.project.name }),
            'success'
          )
          return result.project
        }
        addToast?.(t('toastProjectImportError'), 'error')
        return null
      } catch (e) {
        logError('useProjectManager', 'Import error', e)
        addToast?.(`${t('toastProjectImportError')}: ${e.message}`, 'error')
        return null
      }
    },
    [setProject, addToast, t, loadProjectList, loadRecentProjects]
  )

  // ─── DUPLICATE ──────────────────────────────────────────────────────

  const duplicateProject = useCallback(
    async (projectId) => {
      try {
        const result =
          await window.electronAPI.duplicateEditorProject?.(projectId)

        if (result?.success) {
          await loadProjectList()
          await loadRecentProjects()
          addToast?.(
            t('toastProjectDuplicated', { name: result.project.name }),
            'success'
          )
          return result.project
        }
        return null
      } catch (e) {
        logError('useProjectManager', 'Duplicate error', e)
        addToast?.(`${t('toastProjectDuplicateError')}: ${e.message}`, 'error')
        return null
      }
    },
    [addToast, t, loadProjectList, loadRecentProjects]
  )

  // ─── RENAME ─────────────────────────────────────────────────────────

  const renameProject = useCallback(
    async (projectId, newName) => {
      if (!projectId) {
        addToast?.(t('toastProjectMissingId'), 'error')
        return null
      }

      if (!newName || !newName.trim()) {
        return null
      }

      const trimmedName = newName.trim()

      try {
        const result = await window.electronAPI.renameEditorProject?.(
          projectId,
          trimmedName
        )

        if (result?.success) {
          await loadProjectList()
          await loadRecentProjects()

          if (project?.id === projectId) {
            setProject(result.project)

            try {
              await window.electronAPI.storeSet?.(
                'currentEditorProjectId',
                projectId
              )
            } catch (e) {
              logError('useProjectManager', 'Store after rename error', e)
            }
          }

          addToast?.(
            t('toastProjectRenamed', { name: result.project.name }),
            'success'
          )
          return result.project
        }

        addToast?.(
          `${t('toastProjectRenameError')}: ${result?.error || t('unknown')}`,
          'error'
        )
        return null
      } catch (e) {
        logError('useProjectManager', 'Rename error', e)
        addToast?.(`${t('toastProjectRenameError')}: ${e.message}`, 'error')
        return null
      }
    },
    [project, setProject, addToast, t, loadProjectList, loadRecentProjects]
  )

  // ─── INIT ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadRecentProjects()
    loadProjectList()
    // Intentional: only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    isSaving,
    isLoading,
    projectList,
    recentProjects,
    loadProjectList,
    loadRecentProjects,
    saveProject,
    loadProject,
    createProject,
    deleteProject,
    exportProject,
    importProject,
    duplicateProject,
    renameProject,
  }
}

export default useProjectManager