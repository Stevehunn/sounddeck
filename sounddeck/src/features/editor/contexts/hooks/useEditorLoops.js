// src/features/editor/contexts/hooks/useEditorLoops.js
import { useCallback } from 'react'

export function useEditorLoops(core) {
  const {
    projectRef, loopStateRef, clipDurationsRef, totalDurationRef,
    commitProject, setLoopState, setLoopRegionState,
    setIsDirty, addToastRef,
  } = core

  const toggleClipLoop = useCallback((clipId, options = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const track = currentProject.tracks.find(t => t.clips.some(c => c.id === clipId))
    if (!track) return
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return

    const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
    const start = clip.start || 0
    const currentLoopState = loopStateRef.current

    if (options.enabled === false || currentLoopState.clips[clipId]?.enabled) {
      const updatedLoopState = {
        ...currentLoopState,
        clips: {
          ...currentLoopState.clips,
          [clipId]: { ...currentLoopState.clips[clipId], enabled: false }
        }
      }
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState

      commitProject({ ...currentProject, loops: updatedLoopState, updatedAt: Date.now() })
      addToastRef.current?.(`Boucle désactivée sur "${clip.name}"`, 'info')
      return
    }

    const arrowColor = options.arrowColor || '#22c55e'
    const loopMode = options.loopMode || 'endOfTrack'
    const cycleCount = options.cycleCount || 3
    const manualDuration = options.manualDuration || 10

    let loopEnd = totalDurationRef.current

    if (loopMode === 'endOfTrack') {
      const normalClips = currentProject.tracks.flatMap(t => t.clips)
        .filter(c => c.id !== clipId && !currentLoopState.clips[c.id]?.enabled)
      if (normalClips.length > 0) {
        const lastNormalClip = normalClips.reduce((max, c) => {
          const end = (c.start || 0) + (clipDurationsRef.current[c.id] || c.duration || 3)
          return end > max ? end : max
        }, 0)
        loopEnd = Math.max(lastNormalClip + 2, start + duration * 2)
      } else {
        loopEnd = Math.max(totalDurationRef.current, start + duration * 4)
      }
    } else if (loopMode === 'cycles') {
      loopEnd = start + (duration * cycleCount)
    } else if (loopMode === 'manualDuration') {
      loopEnd = Math.max(start + duration, start + manualDuration)
    } else if (loopMode === 'manualClick') {
      loopEnd = Math.max(start + duration, totalDurationRef.current)
    }

    const updatedLoopState = {
      ...currentLoopState,
      clips: {
        ...currentLoopState.clips,
        [clipId]: {
          enabled: true,
          start,
          end: loopEnd,
          visual: 'arrow',
          arrowColor,
          followClip: true,
          loopMode,
          cycleCount: loopMode === 'cycles' ? cycleCount : undefined,
          manualDuration: loopMode === 'manualDuration' ? manualDuration : undefined,
          manualEndTime: loopMode === 'manualClick' ? null : undefined,
          cycleCountCurrent: 0,
          totalCycles: loopMode === 'cycles' ? cycleCount : undefined,
        }
      }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState

    commitProject({ ...currentProject, loops: updatedLoopState, updatedAt: Date.now() })

    let toastMessage = `Boucle activée sur "${clip.name}"`
    if (loopMode === 'cycles') toastMessage += ` (${cycleCount} cycles)`
    else if (loopMode === 'endOfTrack') toastMessage += ` (jusqu'à la fin de la piste)`
    else if (loopMode === 'manualDuration') toastMessage += ` (${manualDuration}s)`
    else if (loopMode === 'manualClick') toastMessage += ` (clic sur la timeline)`
    addToastRef.current?.(toastMessage, 'success')
  }, [projectRef, loopStateRef, clipDurationsRef, totalDurationRef,
      commitProject, setLoopState, addToastRef])

  const updateClipLoopOptions = useCallback((clipId, options) => {
    const currentProject = projectRef.current
    const currentLoopState = loopStateRef.current
    if (!currentProject || !currentLoopState.clips[clipId]) return

    const updatedLoopState = {
      ...currentLoopState,
      clips: {
        ...currentLoopState.clips,
        [clipId]: { ...currentLoopState.clips[clipId], ...options }
      }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState
    commitProject({ ...currentProject, loops: updatedLoopState, updatedAt: Date.now() })
  }, [projectRef, loopStateRef, commitProject, setLoopState])

  const setTimelineLoop = useCallback((options) => {
    const currentProject = projectRef.current
    const currentLoopState = loopStateRef.current
    if (!currentProject) return

    const updatedLoopState = {
      ...currentLoopState,
      timeline: { ...currentLoopState.timeline, ...options }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState

    commitProject({ ...currentProject, loops: updatedLoopState, updatedAt: Date.now() })
    setIsDirty(true)
  }, [projectRef, loopStateRef, commitProject, setLoopState, setIsDirty])

  const toggleTimelineLoop = useCallback(() => {
    const timeline = loopStateRef.current.timeline
    const newEnabled = !timeline.enabled

    if (newEnabled) {
      const start = timeline.start
      const end = timeline.end
      if (start >= end) {
        setTimelineLoop({ enabled: true, end: Math.max(start + 1, 10) })
        return
      }
    }
    setTimelineLoop({ enabled: newEnabled })
  }, [loopStateRef, setTimelineLoop])

  const setLoopRegionFn = useCallback((start, end) => {
    setLoopRegionState(prev => ({
      ...prev,
      start: Math.max(0, start),
      end: Math.min(totalDurationRef.current, end)
    }))
  }, [totalDurationRef, setLoopRegionState])

  const toggleLoop = useCallback(() => {
    toggleTimelineLoop()
  }, [toggleTimelineLoop])

  const clearLoop = useCallback(() => {
    setLoopRegionState({ enabled: false, start: 0, end: 10 })
    setTimelineLoop({ enabled: false, start: 0, end: 10 })
  }, [setLoopRegionState, setTimelineLoop])

  return {
    toggleClipLoop,
    updateClipLoopOptions,
    setTimelineLoop,
    toggleTimelineLoop,
    setLoopRegion: setLoopRegionFn,
    toggleLoop,
    clearLoop,
  }
}