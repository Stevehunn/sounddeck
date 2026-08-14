// src/features/editor/components/Modals/TrimClipModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import Waveform, { formatTime } from '@shared/components/audio/Waveform'

export default function TrimClipModal({
  isOpen,
  clip,
  trackId,
  clipDuration,
  onClose,
  onTrim,
  tr,
  addToast
}) {
  const { t } = useLanguage()
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(clipDuration || 3)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  
  const audioContextRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    if (isOpen && clip) {
      setStart(0)
      setEnd(clipDuration || 3)
      setCurrentTime(0)
      setIsPlaying(false)
      setError(null)
    }
  }, [isOpen, clip, clipDuration])

  const loadAudio = useCallback(async () => {
    if (!clip?.path) return
    
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close()
      }
      
      const fileUrl = clip.path.startsWith('file://')
        ? clip.path
        : 'file:///' + clip.path.replace(/\\/g, '/')
      
      console.log('🎵 [TrimClipModal] Chargement audio depuis:', fileUrl)
      
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = ctx
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      
      window.__trimAudioBuffer = audioBuffer
      
      console.log('✅ [TrimClipModal] Audio chargé, durée:', audioBuffer.duration)
      
    } catch (e) {
      console.error('❌ Erreur chargement audio:', e)
      setError('Impossible de charger l\'audio: ' + e.message)
    }
  }, [clip])

  useEffect(() => {
    if (isOpen && clip) {
      loadAudio()
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop()
        } catch (e) {}
      }
    }
  }, [isOpen, clip, loadAudio])

  const togglePlay = useCallback(() => {
    const ctx = audioContextRef.current
    const audioBuffer = window.__trimAudioBuffer
    
    if (!ctx || !audioBuffer) {
      console.warn('⚠️ Audio non chargé')
      if (addToast) addToast('Audio non chargé', 'warning')
      return
    }
    
    if (isPlaying) {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop()
        } catch (e) {}
        sourceRef.current = null
      }
      setIsPlaying(false)
      return
    }
    
    try {
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      sourceRef.current = source
      
      const gain = ctx.createGain()
      gain.gain.value = 0.5
      source.connect(gain)
      gain.connect(ctx.destination)
      
      const duration = end - start
      source.start(0, start, duration)
      setIsPlaying(true)
      setCurrentTime(start)
      
      const startTime = ctx.currentTime
      const updateInterval = setInterval(() => {
        if (!isPlaying && !sourceRef.current) {
          clearInterval(updateInterval)
          return
        }
        const elapsed = ctx.currentTime - startTime
        const newTime = start + elapsed
        if (newTime >= end) {
          setCurrentTime(end)
          setIsPlaying(false)
          clearInterval(updateInterval)
        } else {
          setCurrentTime(newTime)
        }
      }, 50)
      
      source.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        clearInterval(updateInterval)
        sourceRef.current = null
      }
      
    } catch (e) {
      console.error('❌ Erreur lecture:', e)
      setError('Erreur de lecture: ' + e.message)
    }
  }, [isPlaying, start, end, addToast])

  const handleTrim = async () => {
    if (!clip?.path) {
      setError('Aucun clip sélectionné')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      console.log('✂️ [TrimClipModal] Appel de trimSoundFile:', {
        path: clip.path,
        start,
        end,
        duration: end - start
      })
      
      const result = await window.electronAPI.trimSoundFile(
        clip.path,
        start,
        end
      )
      
      console.log('✂️ [TrimClipModal] Résultat:', result)
      
      if (result.success) {
        if (result.warning) {
          console.warn('⚠️ Trim warning:', result.warning)
          if (addToast) {
            addToast(result.warning, 'warning')
          }
        }
        if (addToast) {
          addToast('Clip rogné avec succès !', 'success')
        }
        onTrim?.(trackId, clip.id, result.path, end - start)
        onClose()
      } else {
        console.error('❌ Trim error:', result.error)
        setError(result.error || 'Erreur lors du rognage')
        if (addToast) {
          addToast('Erreur lors du rognage: ' + (result.error || 'Erreur inconnue'), 'error')
        }
      }
    } catch (e) {
      console.error('❌ Trim exception:', e)
      setError(e.message)
      if (addToast) {
        addToast('Erreur lors du rognage: ' + e.message, 'error')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !clip) return null

  const totalDuration = clipDuration || 3

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 560, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
          {tr('editorTrim') || 'Rogner le clip'}
          <span style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            marginLeft: 8
          }}>
            {clip.name} ({formatTime(totalDuration)})
          </span>
        </div>

        {/* Waveform */}
        <div style={{ marginBottom: 16 }}>
          <Waveform
            filePath={clip.path}
            start={start}
            end={end}
            currentTime={currentTime}
            duration={totalDuration}
            height={100}
            showHandles
            onSeek={(pos) => {
              setCurrentTime(pos)
              if (isPlaying) {
                if (sourceRef.current) {
                  try {
                    sourceRef.current.stop()
                  } catch (e) {}
                  sourceRef.current = null
                }
                setIsPlaying(false)
              }
            }}
            onStartChange={(pos) => setStart(Math.max(0, pos))}
            onEndChange={(pos) => setEnd(Math.min(totalDuration, pos))}
          />
        </div>

        {/* Informations de sélection */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 12,
          fontSize: 12
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            <i className="ti ti-clock" style={{ marginRight: 4 }} />
            {tr('start')}: <strong>{formatTime(start)}</strong>
          </span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {tr('duration')}: {formatTime(end - start)}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {tr('end')}: <strong>{formatTime(end)}</strong>
          </span>
        </div>

        {/* Contrôles précis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('start')}: {formatTime(start)}
            </label>
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.01"
              value={start}
              onChange={e => setStart(Math.min(Number(e.target.value), end - 0.05))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('end')}: {formatTime(end)}
            </label>
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.01"
              value={end}
              onChange={e => setEnd(Math.max(Number(e.target.value), start + 0.05))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            padding: '8px 12px',
            marginBottom: 12,
            background: 'rgba(224,82,82,0.1)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--danger)'
          }}>
            <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
            {error}
          </div>
        )}

        {/* ✅ Boutons - Annuler et Rogner à droite */}
        <div style={{ 
          display: 'flex', 
          gap: 10, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          {/* Groupe gauche */}
          <div style={{ display: 'flex', gap: 8, flex: '1 1 auto' }}>
            <button
              onClick={togglePlay}
              className="btn-secondary"
              disabled={isProcessing}
              style={{
                borderRadius: 'var(--radius-md)',
                minHeight: 40,
                minWidth: 160,
                padding: '8px 20px',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13
              }}
            >
              <i className={`ti ${isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
              {isPlaying ? tr('editorPause') : tr('listenSelection')}
            </button>
            
            <button
              onClick={() => { 
                setStart(0)
                setEnd(totalDuration)
                if (isPlaying) {
                  if (sourceRef.current) {
                    try {
                      sourceRef.current.stop()
                    } catch (e) {}
                    sourceRef.current = null
                  }
                  setIsPlaying(false)
                }
              }}
              className="btn-ghost"
              disabled={isProcessing}
              style={{
                borderRadius: 'var(--radius-md)',
                minHeight: 40,
                minWidth: 120,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13
              }}
            >
              <i className="ti ti-refresh" /> {tr('selectAll')}
            </button>
          </div>
          
          {/* ✅ Groupe droit - poussé à droite avec margin-left: auto */}
          <div style={{ 
            display: 'flex', 
            gap: 8,
            marginLeft: 'auto',
            flexShrink: 0
          }}>
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isProcessing}
              style={{
                borderRadius: 'var(--radius-md)',
                minHeight: 40,
                minWidth: 120,
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13
              }}
            >
              {tr('cancel')}
            </button>
            
            <button
              onClick={handleTrim}
              className="btn-primary"
              disabled={isProcessing || (end - start) < 0.05}
              style={{
                borderRadius: 'var(--radius-md)',
                minHeight: 40,
                minWidth: 140,
                padding: '8px 24px',
                background: 'var(--accent)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13
              }}
            >
              {isProcessing ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('processing')}</>
              ) : (
                <><i className="ti ti-cut" /> {tr('editorTrim')}</>
              )}
            </button>
          </div>
        </div>

        {/* Note */}
        <div style={{
          marginTop: 12,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          padding: '6px 10px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)'
        }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
          {tr('editorTrimNote')}
        </div>
      </div>
    </div>
  )
}