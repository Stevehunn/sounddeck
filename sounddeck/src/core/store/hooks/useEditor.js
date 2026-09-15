// src/core/store/hooks/useEditor.js
import { useState, useCallback } from 'react'

export function useEditor(save) {
  // Liste des projets d'édition + récents
  const [editorProjects, setEditorProjects] = useState([])
  const [recentEditorProjects, setRecentEditorProjects] = useState([])

  // ─── CHARGEMENT ─────────────────────────────────────────────────────────

  const loadAllEditorProjects = useCallback(async () => {
    try {
      const projects = (await window.electronAPI.getAllEditorProjects?.()) || []
      setEditorProjects(projects)
      return projects
    } catch (e) {
      console.error('Erreur chargement projets:', e)
      return []
    }
  }, [])

  const loadRecentEditorProjects = useCallback(async () => {
    try {
      const recent = (await window.electronAPI.getRecentEditorProjects?.()) || []
      setRecentEditorProjects(recent)
      return recent
    } catch (e) {
      console.error('Erreur chargement projets récents:', e)
      return []
    }
  }, [])

  // ─── CRUD ───────────────────────────────────────────────────────────────

  const saveEditorProject = useCallback(async (projectData) => {
    try {
      const result = await window.electronAPI.saveEditorProject?.(projectData)
      if (result?.success) {
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur sauvegarde projet:', e)
      return null
    }
  }, [loadRecentEditorProjects])

  const loadEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.loadEditorProject?.(projectId)
      if (result?.success) {
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur chargement projet:', e)
      return null
    }
  }, [loadRecentEditorProjects])

  const deleteEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.deleteEditorProject?.(projectId)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return true
      }
      return false
    } catch (e) {
      console.error('Erreur suppression projet:', e)
      return false
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  const exportEditorProject = useCallback(async (project, filePath) => {
    try {
      const result = await window.electronAPI.exportEditorProject?.(project, filePath)
      return result
    } catch (e) {
      console.error('Erreur export projet:', e)
      return { success: false, error: e.message }
    }
  }, [])

  const importEditorProject = useCallback(async (filePath) => {
    try {
      const result = await window.electronAPI.importEditorProject?.(filePath)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur import projet:', e)
      return null
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  const renameEditorProject = useCallback(async (projectId, newName) => {
    try {
      const result = await window.electronAPI.renameEditorProject?.(projectId, newName)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur renommage projet:', e)
      return null
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  const duplicateEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.duplicateEditorProject?.(projectId)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur duplication projet:', e)
      return null
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  return {
    // État
    editorProjects,
    recentEditorProjects,
    // Chargement
    loadAllEditorProjects,
    loadRecentEditorProjects,
    // CRUD
    saveEditorProject,
    loadEditorProject,
    deleteEditorProject,
    exportEditorProject,
    importEditorProject,
    renameEditorProject,
    duplicateEditorProject,
  }
}