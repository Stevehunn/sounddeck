// src/features/editor/contexts/hooks/useEditorTracks.js
import { useCallback } from 'react'

export function useEditorTracks(core, audioPlayback) {
  const {
    projectRef, clipDurationsRef, commitProject, generateUniqueId,
    setClipDurations, setIsDirty, setSelectedClipId, setSelectedTrackId,
    selectedClipIdRef, addToastRef, tRef, confirm,
  } = core

  const { updateTrackVolume } = audioPlayback

  const addTrack = useCallback(async (name, color) => {
    try {
      let currentProject = projectRef.current
      if (!currentProject) {
        currentProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          loops: { clips: {}, tracks: {}, timeline: {} },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }

      const trackIndex = currentProject.tracks?.length || 0
      const trackName = name || `Piste ${trackIndex + 1}`
      const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`

      const newTrack = {
        id: generateUniqueId('track'),
        name: trackName,
        color: trackColor,
        clips: [],
        volume: 1,
        muted: false,
        solo: false,
        effects: []
      }

      const updatedProject = {
        ...currentProject,
        tracks: [...(currentProject.tracks || []), newTrack],
        updatedAt: Date.now()
      }

      commitProject(updatedProject)

      const durations = {}
      for (const track of updatedProject.tracks) {
        for (const clip of track.clips) {
          if (clip.id) durations[clip.id] = clip.duration || 3
        }
      }
      setClipDurations(durations)
      clipDurationsRef.current = durations

      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastTrackAdded', { name: trackName }),
        'success'
      )
      return newTrack
    } catch (e) {
      addToastRef.current?.(
        tRef.current('editorToastTrackAddError', { error: e.message }),
        'error'
      )
      return null
    }
  }, [projectRef, clipDurationsRef, commitProject, generateUniqueId,
      setClipDurations, setIsDirty, addToastRef, tRef])

  const removeTrack = useCallback(async (trackId) => {
    const currentProject = projectRef.current
    if (!currentProject) {
      addToastRef.current?.(tRef.current('editorToastNoProject'), 'error')
      return
    }

    const trackToRemove = currentProject.tracks.find(t => t.id === trackId)
    if (!trackToRemove) {
      addToastRef.current?.(tRef.current('editorToastTrackNotFound'), 'error')
      return
    }

    if (currentProject.tracks.length <= 1) {
      addToastRef.current?.(tRef.current('editorToastLastTrack'), 'warning')
      return
    }

    if (trackToRemove.clips.length > 0) {
      const message = tRef.current('editorToastDeleteTrackWithClips', {
        name: trackToRemove.name,
        count: trackToRemove.clips.length
      })

      let confirmed = false
      if (confirm) {
        confirmed = await confirm({
          title: tRef.current('confirmDeleteTrack'),
          message,
          type: 'warning',
          confirmText: tRef.current('delete'),
          cancelText: tRef.current('cancel'),
        })
      } else {
        // Fallback (ne devrait pas arriver si confirm est passé par le Provider)
        confirmed = window.confirm(message)
      }
      if (!confirmed) return
    }

    const updatedTracks = currentProject.tracks.filter(t => t.id !== trackId)
    const updatedProject = { ...currentProject, tracks: updatedTracks, updatedAt: Date.now() }
    commitProject(updatedProject)

    const durations = { ...clipDurationsRef.current }
    for (const clip of trackToRemove.clips) delete durations[clip.id]
    setClipDurations(durations)
    clipDurationsRef.current = durations

    setIsDirty(true)
    addToastRef.current?.(
      tRef.current('editorToastTrackRemoved', { name: trackToRemove.name }),
      'info'
    )

    if (selectedClipIdRef.current &&
        !updatedTracks.some(t => t.clips.some(c => c.id === selectedClipIdRef.current))) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
  }, [projectRef, clipDurationsRef, commitProject, selectedClipIdRef,
      setClipDurations, setIsDirty, setSelectedClipId, setSelectedTrackId,
      addToastRef, tRef, confirm])

  const renameTrack = useCallback(async (trackId, newName) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, name: newName } : track
      ),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const muteTrack = useCallback((trackId, muted) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, muted } : track
      ),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const soloTrack = useCallback((trackId, solo) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id === trackId) return { ...track, solo }
        if (solo) return { ...track, muted: true, solo: false }
        return { ...track, solo: false }
      }),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const setTrackVolume = useCallback((trackId, volume) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const clampedVolume = Math.max(0, Math.min(5, volume))
    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, volume: clampedVolume } : track
      ),
      updatedAt: Date.now()
    }
    commitProject(updatedProject, { skipHistory: true })
    updateTrackVolume(trackId, clampedVolume)
    setIsDirty(true)
  }, [projectRef, commitProject, updateTrackVolume, setIsDirty])

  return {
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
  }
}