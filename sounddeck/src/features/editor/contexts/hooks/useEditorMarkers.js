// src/features/editor/contexts/hooks/useEditorMarkers.js
import { useCallback } from 'react'

function generateMarkerId() {
  const rand = Math.random().toString(36).slice(2, 7)
  return `marker-${Date.now()}-${rand}`
}

export function useEditorMarkers(core, playback) {
  const {
    projectRef, currentTimeRef, commitProject, setIsDirty, addToastRef,
  } = core
  const { seek } = playback

  const addMarker = useCallback((markerData) => {
    const currentProject = projectRef.current
    if (!currentProject) return null

    const newMarker = {
      id: generateMarkerId(),
      name: markerData.name || `Marqueur ${(currentProject.markers?.length || 0) + 1}`,
      time: markerData.time || currentTimeRef.current,
      color: markerData.color || '#3b82f6'
    }

    const updatedProject = {
      ...currentProject,
      markers: [...(currentProject.markers || []), newMarker],
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    addToastRef.current?.(`Marqueur "${newMarker.name}" ajouté`, 'success')
    return newMarker
  }, [projectRef, currentTimeRef, commitProject, setIsDirty, addToastRef])

  const removeMarker = useCallback((markerId) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const markerToRemove = currentProject.markers?.find(m => m.id === markerId)
    if (!markerToRemove) return

    const updatedProject = {
      ...currentProject,
      markers: (currentProject.markers || []).filter(m => m.id !== markerId),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    addToastRef.current?.(`Marqueur "${markerToRemove.name}" supprimé`, 'info')
  }, [projectRef, commitProject, setIsDirty, addToastRef])

  const updateMarker = useCallback((markerId, updates) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      markers: (currentProject.markers || []).map(m =>
        m.id === markerId ? { ...m, ...updates } : m
      ),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const navigateToMarker = useCallback((time) => {
    seek(time)
  }, [seek])

  return {
    addMarker,
    removeMarker,
    updateMarker,
    navigateToMarker,
  }
}