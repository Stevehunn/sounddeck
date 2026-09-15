// src/features/editor/hooks/useProjectManager.js
import { useState, useCallback, useEffect } from 'react'

export function useProjectManager(store, project, setProject, addToast) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [projectList, setProjectList] = useState([])
  const [recentProjects, setRecentProjects] = useState([])

  const loadProjectList = useCallback(async () => {
    try {
      const projects = await window.electronAPI.getAllEditorProjects?.() || []
      setProjectList(projects)
      return projects
    } catch (e) {
      console.error('❌ Erreur chargement projets:', e)
      addToast?.('Erreur lors du chargement des projets', 'error')
      return []
    }
  }, [addToast])

  const loadRecentProjects = useCallback(async () => {
    try {
      const recent = await window.electronAPI.getRecentEditorProjects?.() || []
      setRecentProjects(recent)
      return recent
    } catch (e) {
      console.error('❌ Erreur chargement projets récents:', e)
      addToast?.('Erreur lors du chargement des projets récents', 'error')
      return []
    }
  }, [addToast])

  const saveProject = useCallback(async () => {
    if (!project) {
      addToast?.('Aucun projet à sauvegarder', 'warning')
      return null
    }

    setIsSaving(true)
    
    try {
      const result = await window.electronAPI.saveEditorProject?.(project)
      
      if (result?.success) {
        setProject(result.project)
        await loadProjectList()
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" sauvegardé`, 'success')
        return result.project
      }
      
      addToast?.('Erreur lors de la sauvegarde', 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur sauvegarde:', e)
      addToast?.('Erreur lors de la sauvegarde: ' + e.message, 'error')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [project, setProject, addToast, loadProjectList, loadRecentProjects])

  const loadProject = useCallback(async (projectId) => {
    setIsLoading(true)
    
    try {
      const result = await window.electronAPI.loadEditorProject?.(projectId)
      
      if (result?.success) {
        setProject(result.project)
        
        try {
          await window.electronAPI.storeSet?.('currentEditorProjectId', projectId)
          // ✅ FIX S3c : saveEditorProject écrit dans editorProjects[id] + currentEditorProjectId
          // Plus besoin d'appeler store.updateEditorProject
          await window.electronAPI.saveEditorProject?.(result.project)
        } catch (e) {
          console.warn('⚠️ Impossible de sauvegarder:', e)
        }
        
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" chargé`, 'success')
        return result.project
      }
      
      addToast?.('Projet non trouvé', 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur chargement:', e)
      addToast?.('Erreur lors du chargement: ' + e.message, 'error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [setProject, addToast, loadRecentProjects])

  const createProject = useCallback(async (name) => {
    try {
      const newProject = {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name || 'Nouveau projet',
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
            manualDuration: 10
          }
        },
        duration: 60,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = await window.electronAPI.saveEditorProject?.(newProject)
      
      if (result?.success) {
        setProject(result.project)
        await loadProjectList()
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" créé`, 'success')
        return result.project
      }
      
      addToast?.('Erreur lors de la création du projet', 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur création projet:', e)
      addToast?.('Erreur lors de la création: ' + e.message, 'error')
      return null
    }
  }, [setProject, addToast, loadProjectList, loadRecentProjects])

  const deleteProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.deleteEditorProject?.(projectId)
      
      if (result?.success) {
        await loadProjectList()
        await loadRecentProjects()
        addToast?.('Projet supprimé', 'info')
        return true
      }
      return false
    } catch (e) {
      console.error('❌ Erreur suppression:', e)
      addToast?.('Erreur lors de la suppression: ' + e.message, 'error')
      return false
    }
  }, [addToast, loadProjectList, loadRecentProjects])

  const exportProject = useCallback(async (projectData, filePath) => {
    try {
      const result = await window.electronAPI.exportEditorProject?.(projectData, filePath)
      if (result?.success) {
        addToast?.('Projet exporté avec succès', 'success')
        return result
      }
      addToast?.('Erreur lors de l\'export: ' + (result?.error || 'Erreur inconnue'), 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur export:', e)
      addToast?.('Erreur lors de l\'export: ' + e.message, 'error')
      return null
    }
  }, [addToast])

  const importProject = useCallback(async (filePath) => {
    try {
      const result = await window.electronAPI.importEditorProject?.(filePath)
      
      if (result?.success) {
        setProject(result.project)
        await loadProjectList()
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" importé`, 'success')
        return result.project
      }
      addToast?.('Erreur lors de l\'import', 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur import:', e)
      addToast?.('Erreur lors de l\'import: ' + e.message, 'error')
      return null
    }
  }, [setProject, addToast, loadProjectList, loadRecentProjects])

  const duplicateProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.duplicateEditorProject?.(projectId)
      
      if (result?.success) {
        await loadProjectList()
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" dupliqué`, 'success')
        return result.project
      }
      return null
    } catch (e) {
      console.error('❌ Erreur duplication:', e)
      addToast?.('Erreur lors de la duplication: ' + e.message, 'error')
      return null
    }
  }, [addToast, loadProjectList, loadRecentProjects])

  const renameProject = useCallback(async (projectId, newName) => {
    if (!projectId) {
      addToast?.('ID de projet manquant', 'error')
      return null
    }
    
    if (!newName || !newName.trim()) {
      return null
    }
    
    const trimmedName = newName.trim()
    
    try {
      const result = await window.electronAPI.renameEditorProject?.(projectId, trimmedName)
      
      if (result?.success) {
        await loadProjectList()
        await loadRecentProjects()
        
        if (project?.id === projectId) {
          setProject(result.project)
          
          try {
            await window.electronAPI.storeSet?.('currentEditorProjectId', projectId)
            // ✅ FIX S3c : pas besoin de store.updateEditorProject
          } catch (e) {
            console.warn('⚠️ Impossible de sauvegarder:', e)
          }
        }
        
        addToast?.(`Projet renommé en "${result.project.name}"`, 'success')
        return result.project
      }
      
      addToast?.('Erreur lors du renommage: ' + (result?.error || 'Erreur inconnue'), 'error')
      return null
    } catch (e) {
      console.error('❌ Erreur renommage:', e)
      addToast?.('Erreur lors du renommage: ' + e.message, 'error')
      return null
    }
  }, [project, setProject, addToast, loadProjectList, loadRecentProjects])

  useEffect(() => {
    loadRecentProjects()
    loadProjectList()
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
    renameProject
  }
}

export default useProjectManager