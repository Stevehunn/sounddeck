// src/pages/editor/hooks/usePlayback.js
import { useCallback } from 'react'
import { useAudioEngine } from './useAudioEngine'

export function usePlayback({
  project,
  clipDurations,
  store,
  masterVolume = 100,
  isMasterMuted = false,
  loopRegion = null,
  onError = null
}) {
  const audioEngine = useAudioEngine({
    project,
    clipDurations,
    masterVolume,
    isMasterMuted,
    loopRegion,
    onError
  })

  // ✅ Wrapper pour compatibilité avec l'ancienne API
  const updateClipEffects = useCallback((clipId) => {
    // Dans Web Audio API, les effets sont appliqués au moment de la lecture
    console.log(`🔄 Mise à jour des effets pour le clip ${clipId}`)
    // La mise à jour se fera au prochain startClip
  }, [])

  return {
    ...audioEngine,
    updateClipEffects,
    rebuildEngine: audioEngine.stop,
    isEngineReady: true,
    engine: null
  }
}

export default usePlayback