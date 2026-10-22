/**
 * @file Editor projects hook — load/save/rename/export/duplicate projects.
 *
 * Wraps `electronAPI.*EditorProject` IPC calls. Each method is resilient
 * to missing IPC methods (`?.()`) so the app degrades gracefully in dev
 * or if a build excludes the feature.
 *
 * The hook exposes:
 * - `editorProjects` — all projects (full list)
 * - `recentEditorProjects` — last N opened projects
 * - CRUD: save, load, delete, rename, duplicate, export, import
 *
 * @see src/features/editor/Editor.jsx — primary consumer
 */

import { useState, useCallback } from 'react'
import { logError } from '@shared/utils/logger'

// NOTE: `_save` is accepted for API compatibility but currently unused —
// all persistence goes through `window.electronAPI.*EditorProject`.
export function useEditor(_save) {
  const [editorProjects, setEditorProjects] = useState([])
  const [recentEditorProjects, setRecentEditorProjects] = useState([])

  /**
   * Reloads the full project list from disk.
   * @returns {Promise<Array>} The loaded projects (or empty array on error).
   */
  const loadAllEditorProjects = useCallback(async () => {
    try {
      const projects =
        (await window.electronAPI.getAllEditorProjects?.()) || []
      setEditorProjects(projects)
      return projects
    } catch (e) {
      logError('useEditor', 'Load projects error', e)
      return []
    }
  }, [])

  /**
   * Reloads the "recent projects" list from disk.
   * @returns {Promise<Array>}
   */
  const loadRecentEditorProjects = useCallback(async () => {
    try {
      const recent =
        (await window.electronAPI.getRecentEditorProjects?.()) || []
      setRecentEditorProjects(recent)
      return recent
    } catch (e) {
      logError('useEditor', 'Load recent projects error', e)
      return []
    }
  }, [])

  /**
   * Saves a project (create or update).
   *
   * @param {Object} projectData
   * @returns {Promise<Object|null>} The saved project, or `null` on error.
   */
  const saveEditorProject = useCallback(
    async (projectData) => {
      try {
        const result = await window.electronAPI.saveEditorProject?.(projectData)
        if (result?.success) {
          await loadRecentEditorProjects()
          return result.project
        }
        return null
      } catch (e) {
        logError('useEditor', 'Save project error', e)
        return null
      }
    },
    [loadRecentEditorProjects]
  )

  /**
   * Loads a project by ID.
   *
   * @param {string} projectId
   * @returns {Promise<Object|null>} The loaded project, or `null`.
   */
  const loadEditorProject = useCallback(
    async (projectId) => {
      try {
        const result = await window.electronAPI.loadEditorProject?.(projectId)
        if (result?.success) {
          await loadRecentEditorProjects()
          return result.project
        }
        return null
      } catch (e) {
        logError('useEditor', 'Load project error', e)
        return null
      }
    },
    [loadRecentEditorProjects]
  )

  /**
   * Deletes a project by ID.
   *
   * @param {string} projectId
   * @returns {Promise<boolean>} `true` on success.
   */
  const deleteEditorProject = useCallback(
    async (projectId) => {
      try {
        const result = await window.electronAPI.deleteEditorProject?.(
          projectId
        )
        if (result?.success) {
          await loadAllEditorProjects()
          await loadRecentEditorProjects()
          return true
        }
        return false
      } catch (e) {
        logError('useEditor', 'Delete project error', e)
        return false
      }
    },
    [loadAllEditorProjects, loadRecentEditorProjects]
  )

  /**
   * Exports a project to the given path (native save dialog).
   *
   * @param {Object} project
   * @param {string} filePath
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  const exportEditorProject = useCallback(async (project, filePath) => {
    try {
      const result = await window.electronAPI.exportEditorProject?.(
        project,
        filePath
      )
      return result
    } catch (e) {
      logError('useEditor', 'Export project error', e)
      return { success: false, error: e.message }
    }
  }, [])

  /**
   * Imports a project from the given path (native file dialog).
   *
   * @param {string} filePath
   * @returns {Promise<Object|null>}
   */
  const importEditorProject = useCallback(
    async (filePath) => {
      try {
        const result = await window.electronAPI.importEditorProject?.(filePath)
        if (result?.success) {
          await loadAllEditorProjects()
          await loadRecentEditorProjects()
          return result.project
        }
        return null
      } catch (e) {
        logError('useEditor', 'Import project error', e)
        return null
      }
    },
    [loadAllEditorProjects, loadRecentEditorProjects]
  )

  /**
   * Renames a project.
   *
   * @param {string} projectId
   * @param {string} newName
   * @returns {Promise<Object|null>}
   */
  const renameEditorProject = useCallback(
    async (projectId, newName) => {
      try {
        const result = await window.electronAPI.renameEditorProject?.(
          projectId,
          newName
        )
        if (result?.success) {
          await loadAllEditorProjects()
          await loadRecentEditorProjects()
          return result.project
        }
        return null
      } catch (e) {
        logError('useEditor', 'Rename project error', e)
        return null
      }
    },
    [loadAllEditorProjects, loadRecentEditorProjects]
  )

  /**
   * Duplicates a project.
   *
   * @param {string} projectId
   * @returns {Promise<Object|null>}
   */
  const duplicateEditorProject = useCallback(
    async (projectId) => {
      try {
        const result = await window.electronAPI.duplicateEditorProject?.(
          projectId
        )
        if (result?.success) {
          await loadAllEditorProjects()
          await loadRecentEditorProjects()
          return result.project
        }
        return null
      } catch (e) {
        logError('useEditor', 'Duplicate project error', e)
        return null
      }
    },
    [loadAllEditorProjects, loadRecentEditorProjects]
  )

  return {
    editorProjects,
    recentEditorProjects,
    loadAllEditorProjects,
    loadRecentEditorProjects,
    saveEditorProject,
    loadEditorProject,
    deleteEditorProject,
    exportEditorProject,
    importEditorProject,
    renameEditorProject,
    duplicateEditorProject,
  }
}