// src/pages/editor/hooks/useAudioEffects.js
import { useCallback, useRef } from 'react'

export function useAudioEffects() {
  const effectsRef = useRef({})

  // ✅ Créer un effet de volume
  const createVolumeEffect = useCallback((audioContext, value) => {
    const gainNode = audioContext.createGain()
    gainNode.gain.value = Math.max(0, Math.min(5, value))
    return gainNode
  }, [])

  // ✅ Créer un effet de pitch (via détune)
  const createPitchEffect = useCallback((audioContext, semitones) => {
    // Le pitch est appliqué directement sur le source.detune
    // Retourne un objet avec la valeur de détune
    return { detune: semitones * 100 }
  }, [])

  // ✅ Créer un effet de vitesse
  const createSpeedEffect = useCallback((audioContext, value) => {
    // La vitesse est appliquée directement sur le source.playbackRate
    return { playbackRate: Math.max(0.1, Math.min(4, value)) }
  }, [])

  // ✅ Créer un effet d'écho
  const createEchoEffect = useCallback((audioContext, delay, decay, mix) => {
    const delayNode = audioContext.createDelay()
    delayNode.delayTime.value = Math.max(0.05, Math.min(3, delay))
    
    const feedbackNode = audioContext.createGain()
    feedbackNode.gain.value = Math.max(0, Math.min(1, decay))
    
    const wetGain = audioContext.createGain()
    wetGain.gain.value = Math.max(0, Math.min(1, mix))
    
    const dryGain = audioContext.createGain()
    dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))
    
    // Chaînage
    // Input -> delay -> feedback -> delay (loop)
    // Input -> dryGain -> output
    // delay -> wetGain -> output
    
    return { delayNode, feedbackNode, wetGain, dryGain }
  }, [])

  // ✅ Créer un effet de réverbération
  const createReverbEffect = useCallback((audioContext, roomSize, mix) => {
    const convolver = audioContext.createConvolver()
    
    // Générer une réponse impulsionnelle
    const sampleRate = audioContext.sampleRate
    const impulseLength = Math.max(0.1, roomSize * 2) * sampleRate
    const impulseBuffer = audioContext.createBuffer(1, impulseLength, sampleRate)
    const data = impulseBuffer.getChannelData(0)
    
    for (let i = 0; i < impulseLength; i++) {
      const decay = Math.exp(-i / (impulseLength * 0.5))
      data[i] = (Math.random() * 2 - 1) * decay
    }
    
    convolver.buffer = impulseBuffer
    
    const wetGain = audioContext.createGain()
    wetGain.gain.value = Math.max(0, Math.min(1, mix))
    
    const dryGain = audioContext.createGain()
    dryGain.gain.value = Math.max(0, Math.min(1, 1 - mix))
    
    return { convolver, wetGain, dryGain }
  }, [])

  // ✅ Créer un effet de fade
  const createFadeEffect = useCallback((audioContext, gainNode, duration, isFadeIn) => {
    const now = audioContext.currentTime
    
    if (isFadeIn) {
      const currentGain = gainNode.gain.value
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(currentGain, now + duration)
    } else {
      const currentGain = gainNode.gain.value
      gainNode.gain.setValueAtTime(currentGain, now)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)
    }
  }, [])

  return {
    createVolumeEffect,
    createPitchEffect,
    createSpeedEffect,
    createEchoEffect,
    createReverbEffect,
    createFadeEffect,
  }
}

export default useAudioEffects