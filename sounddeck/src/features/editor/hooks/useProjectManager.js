// src/features/editor/hooks/useProjectManager.js
import { useState, useCallback, useEffect } from 'react'

export function useProjectManager(store, project, setProject, addToast) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [projectList, setProjectList] = useState([])
  const [recentProjects, setRecentProjects] = useState([])

  // 📂 Charger la liste des projets
  const loadProjectList = useCallback(async () => {
    try {
      console.log('📂 Chargement de la liste des projets...')
      const projects = await window.electronAPI.getAllEditorProjects?.() || []
      console.log(`📂 ${projects.length} projets trouvés:`, projects.map(p => p.name))
      setProjectList(projects)
      return projects
    } catch (e) {
      console.error('❌ Erreur chargement projets:', e)
      addToast?.('Erreur lors du chargement des projets', 'error')
      return []
    }
  }, [addToast])

  // 🔄 Charger les projets récents
  const loadRecentProjects = useCallback(async () => {
    try {
      console.log('🔄 Chargement des projets récents...')
      const recent = await window.electronAPI.getRecentEditorProjects?.() || []
      console.log(`🔄 ${recent.length} projets récents:`, recent.map(p => p.name))
      setRecentProjects(recent)
      return recent
    } catch (e) {
      console.error('❌ Erreur chargement projets récents:', e)
      addToast?.('Erreur lors du chargement des projets récents', 'error')
      return []
    }
  }, [addToast])

  // 💾 Sauvegarder le projet
  const saveProject = useCallback(async () => {
    if (!project) {
      addToast?.('Aucun projet à sauvegarder', 'warning')
      return null
    }

    console.log('💾 Sauvegarde du projet:', project.name)
    setIsSaving(true)
    
    try {
      const result = await window.electronAPI.saveEditorProject?.(project)
      console.log('📤 Résultat sauvegarde:', result)
      
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

  // 📂 Charger un projet
  const loadProject = useCallback(async (projectId) => {
    console.log('📂 [MANAGER] Chargement du projet:', projectId)
    console.log('📂 [MANAGER] Type de projectId:', typeof projectId)
    setIsLoading(true)
    
    try {
      const result = await window.electronAPI.loadEditorProject?.(projectId)
      console.log('📤 [MANAGER] Résultat chargement:', result)
      
      if (result?.success) {
        console.log('📂 [MANAGER] Projet chargé:', result.project?.name, result.project?.id)
        
        setProject(result.project)
        
        try {
          await window.electronAPI.storeSet?.('currentEditorProjectId', projectId)
          console.log('💾 [MANAGER] currentEditorProjectId sauvegardé:', projectId)
          
          // ✅ Mettre à jour store.editorProject
          if (store?.updateEditorProject) {
            await store.updateEditorProject(result.project)
            console.log('💾 [MANAGER] store.editorProject mis à jour avec:', result.project?.name)
          }
        } catch (e) {
          console.warn('⚠️ [MANAGER] Impossible de sauvegarder:', e)
        }
        
        await loadRecentProjects()
        addToast?.(`Projet "${result.project.name}" chargé`, 'success')
        return result.project
      }
      
      console.warn('📂 [MANAGER] Projet non trouvé:', projectId)
      addToast?.('Projet non trouvé', 'error')
      return null
    } catch (e) {
      console.error('❌ [MANAGER] Erreur chargement:', e)
      addToast?.('Erreur lors du chargement: ' + e.message, 'error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [setProject, addToast, loadRecentProjects, store])

  // 🆕 Créer un nouveau projet
  const createProject = useCallback(async (name) => {
    console.log('🆕 Création du projet:', name)
    
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

      console.log('📦 Nouveau projet créé:', newProject)

      const result = await window.electronAPI.saveEditorProject?.(newProject)
      console.log('📤 Résultat création:', result)
      
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

  // 🗑️ Supprimer un projet
  const deleteProject = useCallback(async (projectId) => {
    console.log('🗑️ Suppression du projet:', projectId)
    
    try {
      const result = await window.electronAPI.deleteEditorProject?.(projectId)
      console.log('📤 Résultat suppression:', result)
      
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

  // 📤 Exporter un projet
  const exportProject = useCallback(async (projectData, filePath) => {
    console.log('📤 Export du projet:', projectData?.name)
    
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

  // 📥 Importer un projet
  const importProject = useCallback(async (filePath) => {
    console.log('📥 Import du projet:', filePath)
    
    try {
      const result = await window.electronAPI.importEditorProject?.(filePath)
      console.log('📤 Résultat import:', result)
      
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

  // 📋 Dupliquer un projet
  const duplicateProject = useCallback(async (projectId) => {
    console.log('📋 Duplication du projet:', projectId)
    
    try {
      const result = await window.electronAPI.duplicateEditorProject?.(projectId)
      console.log('📤 Résultat duplication:', result)
      
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

  // ✏️ Renommer un projet - UNE SEULE FOIS
  const renameProject = useCallback(async (projectId, newName) => {
    console.log(`✏️ [MANAGER] renameProject appelé avec: projectId=${projectId}, newName="${newName}"`)
    console.log(`✏️ [MANAGER] typeof projectId: ${typeof projectId}, typeof newName: ${typeof newName}`)
    console.log(`✏️ [MANAGER] projectId est-il une chaîne valide? ${typeof projectId === 'string' && projectId.startsWith('project-')}`)
    
    if (projectId && typeof projectId === 'string' && !projectId.startsWith('project-')) {
      console.warn(`⚠️ [MANAGER] projectId invalide: "${projectId}", recherche dans la liste...`)
      const found = projectList.find(p => p.name === projectId)
      if (found) {
        console.log(`🔍 [MANAGER] Projet trouvé par nom:`, found.id, found.name)
        projectId = found.id
      } else {
        console.error(`❌ [MANAGER] Aucun projet trouvé avec le nom "${projectId}"`)
        addToast?.('Projet non trouvé', 'error')
        return null
      }
    }
    
    if (!projectId) {
      console.error('❌ [MANAGER] projectId manquant')
      addToast?.('ID de projet manquant', 'error')
      return null
    }
    
    if (!newName || !newName.trim()) {
      console.log('ℹ️ [MANAGER] Nom vide, annulation du renommage')
      return null
    }
    
    const trimmedName = newName.trim()
    console.log(`✏️ [MANAGER] Renommage du projet ${projectId} en: "${trimmedName}"`)
    
    try {
      const result = await window.electronAPI.renameEditorProject?.(projectId, trimmedName)
      console.log('📤 [MANAGER] Résultat renommage:', result)
      
      if (result?.success) {
        await loadProjectList()
        await loadRecentProjects()
        
        if (project?.id === projectId) {
          console.log('🔄 [MANAGER] Mise à jour du projet actuel')
          setProject(result.project)
          
          try {
            await window.electronAPI.storeSet?.('currentEditorProjectId', projectId)
            console.log('💾 [MANAGER] currentEditorProjectId sauvegardé:', projectId)
            
            // ✅ Mettre à jour store.editorProject
            if (store?.updateEditorProject) {
              await store.updateEditorProject(result.project)
              console.log('💾 [MANAGER] store.editorProject mis à jour avec:', result.project?.name)
            }
          } catch (e) {
            console.warn('⚠️ [MANAGER] Impossible de sauvegarder:', e)
          }
        }
        
        addToast?.(`Projet renommé en "${result.project.name}"`, 'success')
        return result.project
      }
      
      addToast?.('Erreur lors du renommage: ' + (result?.error || 'Erreur inconnue'), 'error')
      return null
    } catch (e) {
      console.error('❌ [MANAGER] Erreur renommage:', e)
      addToast?.('Erreur lors du renommage: ' + e.message, 'error')
      return null
    }
  }, [project, setProject, addToast, loadProjectList, loadRecentProjects, projectList, store])

  // Chargement initial
  useEffect(() => {
    console.log('🔄 Chargement initial des projets...')
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
    renameProject // ← UNE SEULE FOIS
  }
}

export default useProjectManager