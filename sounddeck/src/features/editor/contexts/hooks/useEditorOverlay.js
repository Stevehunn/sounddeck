// src/features/editor/contexts/hooks/useEditorOverlay.js
import { useCallback } from 'react'

const INITIAL_OVERLAY_STATE = {
  type: null,
  clipId: null,
  trackId: null,
  options: null,
  step: 0,
  totalSteps: 1,
  clipName: null,
  data: {}
}

export function useEditorOverlay(core, loops, clips) {
  const {
    projectRef, clipDurationsRef, totalDurationRef, actionOverlayRef,
    setActionOverlay, addToastRef, tRef,
  } = core
  const { toggleClipLoop, setTimelineLoop } = loops
  const { splitClip } = clips

  const cancelActionOverlay = useCallback(() => {
    setActionOverlay(INITIAL_OVERLAY_STATE)
    actionOverlayRef.current = INITIAL_OVERLAY_STATE
  }, [setActionOverlay, actionOverlayRef])

  const activateLoopManualClick = useCallback((clipId, trackId, options = {}) => {
    const currentProject = projectRef.current
    const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)

    const newOverlay = {
      type: 'loop-clip',
      clipId,
      trackId,
      options: { arrowColor: options.arrowColor || '#22c55e', loopMode: 'manualClick', ...options },
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.(tRef.current('editorToastClickModeActivated'), 'info')
  }, [projectRef, actionOverlayRef, setActionOverlay, addToastRef, tRef])

  const activateTimelineLoopManualClick = useCallback(() => {
    const newOverlay = {
      type: 'loop-timeline',
      clipId: null,
      trackId: null,
      options: null,
      step: 0,
      totalSteps: 3,
      clipName: null,
      data: { start: null, end: null, duration: null }
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.(tRef.current('editorToastClickModeStep1'), 'info')
  }, [actionOverlayRef, setActionOverlay, addToastRef, tRef])

  const activateSplitManualClick = useCallback((clipId, trackId) => {
    const currentProject = projectRef.current
    const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)

    const newOverlay = {
      type: 'split',
      clipId,
      trackId,
      options: null,
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.(tRef.current('editorToastSplitClickModeActivated'), 'info')
  }, [projectRef, actionOverlayRef, setActionOverlay, addToastRef, tRef])

  const executeActionOverlay = useCallback((clickTime) => {
    const overlay = actionOverlayRef.current
    if (!overlay.type) return

    const { type, clipId, trackId, options, step, data } = overlay
    const clampedTime = Math.max(0, Math.min(clickTime, totalDurationRef.current))

    if (type === 'loop-clip') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.(tRef.current('editorToastClipNotFound'), 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const manualDuration = Math.max(duration, clampedTime - start)

      toggleClipLoop(clipId, { ...options, loopMode: 'manualDuration', manualDuration })
      addToastRef.current?.(
        tRef.current('editorToastLoopDefinedUntil', { duration: manualDuration.toFixed(1) }),
        'success'
      )
      cancelActionOverlay()
    } else if (type === 'loop-timeline') {
      const newData = { ...data }

      if (step === 0) {
        newData.start = clampedTime
        const next = { ...overlay, step: 1, data: newData }
        setActionOverlay(next)
        actionOverlayRef.current = next
        addToastRef.current?.(
          tRef.current('editorToastLoopStartDefined', { time: clampedTime.toFixed(1) }),
          'info'
        )
      } else if (step === 1) {
        if (clampedTime > data.start) {
          newData.end = clampedTime
          const next = { ...overlay, step: 2, data: newData }
          setActionOverlay(next)
          actionOverlayRef.current = next
          addToastRef.current?.(
            tRef.current('editorToastLoopEndDefined', { time: clampedTime.toFixed(1) }),
            'info'
          )
        } else {
          addToastRef.current?.(tRef.current('editorToastLoopEndMustBeAfterStart'), 'warning')
        }
      } else if (step === 2) {
        const duration = clampedTime - data.start
        if (duration > 0.1) {
          setTimelineLoop({
            enabled: true,
            start: data.start,
            end: data.end || clampedTime,
            manualDuration: duration,
            durationMode: 'manualDuration'
          })
          addToastRef.current?.(
            tRef.current('editorToastLoopDefined', {
              start: data.start.toFixed(1),
              end: (data.end || clampedTime).toFixed(1)
            }),
            'success'
          )
          cancelActionOverlay()
        } else {
          addToastRef.current?.(tRef.current('editorToastLoopDurationTooShort'), 'warning')
        }
      }
    } else if (type === 'split') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.(tRef.current('editorToastClipNotFound'), 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration

      if (clampedTime > start + 0.05 && clampedTime < end - 0.05) {
        splitClip(trackId, clipId, clampedTime)
      } else {
        addToastRef.current?.(tRef.current('editorToastClipSplitInvalid'), 'warning')
      }
      cancelActionOverlay()
    }
  }, [projectRef, clipDurationsRef, totalDurationRef, actionOverlayRef,
      setActionOverlay, toggleClipLoop, setTimelineLoop, splitClip,
      cancelActionOverlay, addToastRef, tRef])

  return {
    cancelActionOverlay,
    activateLoopManualClick,
    activateTimelineLoopManualClick,
    activateSplitManualClick,
    executeActionOverlay,
  }
}