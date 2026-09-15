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
    setActionOverlay, addToastRef,
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
    addToastRef.current?.('🖱️ Mode clic activé', 'info')
  }, [projectRef, actionOverlayRef, setActionOverlay, addToastRef])

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
    addToastRef.current?.('🖱️ Mode clic activé - Étape 1/3', 'info')
  }, [actionOverlayRef, setActionOverlay, addToastRef])

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
    addToastRef.current?.('✂️ Mode clic activé', 'info')
  }, [projectRef, actionOverlayRef, setActionOverlay, addToastRef])

  const executeActionOverlay = useCallback((clickTime) => {
    const overlay = actionOverlayRef.current
    if (!overlay.type) return

    const { type, clipId, trackId, options, step, data } = overlay
    const clampedTime = Math.max(0, Math.min(clickTime, totalDurationRef.current))

    if (type === 'loop-clip') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const manualDuration = Math.max(duration, clampedTime - start)

      toggleClipLoop(clipId, { ...options, loopMode: 'manualDuration', manualDuration })
      addToastRef.current?.(`🔄 Boucle définie jusqu'à ${manualDuration.toFixed(1)}s`, 'success')
      cancelActionOverlay()
    } else if (type === 'loop-timeline') {
      const newData = { ...data }

      if (step === 0) {
        newData.start = clampedTime
        const next = { ...overlay, step: 1, data: newData }
        setActionOverlay(next)
        actionOverlayRef.current = next
        addToastRef.current?.(`🖱️ Début défini à ${clampedTime.toFixed(1)}s (2/3)`, 'info')
      } else if (step === 1) {
        if (clampedTime > data.start) {
          newData.end = clampedTime
          const next = { ...overlay, step: 2, data: newData }
          setActionOverlay(next)
          actionOverlayRef.current = next
          addToastRef.current?.(`🖱️ Fin définie à ${clampedTime.toFixed(1)}s (3/3)`, 'info')
        } else {
          addToastRef.current?.('⚠️ La fin doit être après le début', 'warning')
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
          addToastRef.current?.(`✅ Boucle définie: ${data.start.toFixed(1)}s → ${(data.end || clampedTime).toFixed(1)}s`, 'success')
          cancelActionOverlay()
        } else {
          addToastRef.current?.('⚠️ La durée doit être d\'au moins 0.1s', 'warning')
        }
      }
    } else if (type === 'split') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration

      if (clampedTime > start + 0.05 && clampedTime < end - 0.05) {
        splitClip(trackId, clipId, clampedTime)
        addToastRef.current?.(`✂️ Clip coupé à ${clampedTime.toFixed(1)}s`, 'success')
      } else {
        addToastRef.current?.('❌ Position invalide pour couper le clip', 'warning')
      }
      cancelActionOverlay()
    }
  }, [projectRef, clipDurationsRef, totalDurationRef, actionOverlayRef,
      setActionOverlay, toggleClipLoop, setTimelineLoop, splitClip,
      cancelActionOverlay, addToastRef])

  return {
    cancelActionOverlay,
    activateLoopManualClick,
    activateTimelineLoopManualClick,
    activateSplitManualClick,
    executeActionOverlay,
  }
}