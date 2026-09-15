// src/features/editor/contexts/hooks/useEditorEffects.js
import { useCallback } from 'react'

export function useEditorEffects(core) {
  const {
    projectRef, commitProject, generateUniqueId, setIsDirty,
  } = core

  const addEffectToClip = useCallback(async (trackId, clipId, effectType, params = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return null

    const effect = {
      id: generateUniqueId('effect'),
      type: effectType,
      params,
      enabled: true
    }

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipId ? { ...clip, effects: [...(clip.effects || []), effect] } : clip
          )
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    return effect
  }, [projectRef, commitProject, generateUniqueId, setIsDirty])

  const removeEffectFromClip = useCallback(async (trackId, clipId, effectId) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipId
              ? { ...clip, effects: (clip.effects || []).filter(e => e.id !== effectId) }
              : clip
          )
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const updateEffectParam = useCallback(async (trackId, clipId, effectId, param, value) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            return {
              ...clip,
              effects: (clip.effects || []).map(effect =>
                effect.id === effectId
                  ? { ...effect, params: { ...effect.params, [param]: value } }
                  : effect
              )
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject, { skipHistory: true })
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const toggleEffect = useCallback(async (trackId, clipId, effectId, enabled) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            return {
              ...clip,
              effects: (clip.effects || []).map(effect =>
                effect.id === effectId ? { ...effect, enabled } : effect
              )
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [projectRef, commitProject, setIsDirty])

  const setClipFade = useCallback((trackId, clipId, edge, duration) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip

            const existingEffect = (clip.effects || []).find(e => e.type === effectType)

            if (existingEffect) {
              return {
                ...clip,
                effects: (clip.effects || []).map(e =>
                  e.type === effectType
                    ? {
                        ...e,
                        params: { ...e.params, duration: clampedDuration },
                        enabled: clampedDuration > 0.05
                      }
                    : e
                )
              }
            }
            return {
              ...clip,
              effects: [
                ...(clip.effects || []),
                {
                  id: generateUniqueId('effect'),
                  type: effectType,
                  params: { duration: clampedDuration },
                  enabled: clampedDuration > 0.05
                }
              ]
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject, { skipHistory: true })
    setIsDirty(true)
  }, [projectRef, commitProject, generateUniqueId, setIsDirty])

  return {
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
  }
}