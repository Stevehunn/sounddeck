// src/features/editor/components/Timeline/index.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../contexts/EditorContext'
import { useLanguage } from '@core/i18n/LanguageContext'
import EditorTrack from '../Track'
import TrackHeader from '../Track/TrackHeader'
import TrackControls from '../Track/TrackControls'
import TimelineRuler from './TimelineRuler'
import TimelinePlayhead from './TimelinePlayhead'
import TimelineLoop from './TimelineLoop'
import TimelineZoomControls from './TimelineZoomControls'

const TRACK_HEAD_WIDTH = 200
const BASE_PIXELS_PER_SECOND = 80

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  return `${s.toFixed(1)}s`
}

export default function EditorTimeline() {
  const { t } = useLanguage()
  const context = useEditor()
  
  const {
    tracks,
    selectedClipId,
    selectedTrackId,
    totalDuration,
    currentTime,
    isPlaying,
    clipDurations,
    waveformData,
    zoomLevel,
    snapEnabled,
    loopRegion,
    autoCrossfade,
    selectClip,
    updateClip,
    removeClip,
    duplicateClip,
    moveClip,
    play,
    pause,
    stop,
    seek,
    togglePlay,
    muteTrack,
    soloTrack,
    setTrackVolume,
    setLoopRegion,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    addToast,
    store,
    setClipDurations,
    removeTrack,
  } = context

  console.log('🔍 [Timeline] Contexte:', {
    hasTracks: !!tracks,
    trackCount: tracks?.length || 0,
    hasSelectClip: !!selectClip,
    hasUpdateClip: !!updateClip,
    hasSetClipDurations: !!setClipDurations,
    hasRemoveTrack: !!removeTrack,
    hasMoveClip: !!moveClip
  })

  const containerRef = useRef(null)
  const clipsContainerRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  const getTrackColor = (index) => {
    const colors = [
      'hsl(220, 70%, 55%)',
      'hsl(340, 70%, 55%)',
      'hsl(40, 70%, 55%)',
      'hsl(160, 70%, 55%)',
      'hsl(280, 70%, 55%)',
      'hsl(10, 70%, 55%)',
      'hsl(190, 70%, 55%)',
      'hsl(70, 70%, 55%)'
    ]
    return colors[index % colors.length]
  }

  const clientXToTime = (clientX) => {
    const clipsContainer = clipsContainerRef.current
    if (!clipsContainer) return 0
    const rect = clipsContainer.getBoundingClientRect()
    const scrollLeft = clipsContainer.scrollLeft
    const clickInTimeline = (clientX - rect.left) + scrollLeft
    const clampedX = Math.max(0, Math.min(totalWidth, clickInTimeline))
    return clampedX / pixelsPerSecond
  }

  useEffect(() => {
    const clipsContainer = clipsContainerRef.current
    if (!clipsContainer) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        handleZoomChange?.(newZoom)
      } else {
        clipsContainer.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    clipsContainer.addEventListener('wheel', onWheel, { passive: false })
    return () => clipsContainer.removeEventListener('wheel', onWheel)
  }, [zoomLevel, handleZoomChange])

  const handleClipSelect = useCallback((clipId, trackId) => {
    console.log('🎯 [Timeline] handleClipSelect:', clipId, trackId)
    selectClip?.(clipId, trackId)
  }, [selectClip])

  const handleClipMove = useCallback((trackId, clipId, newStart, newTrackId) => {
    console.log('🔄 [Timeline] handleClipMove:', { trackId, clipId, newStart, newTrackId })
    moveClip?.(trackId, clipId, newStart, newTrackId)
  }, [moveClip])

  const handleClipUpdate = useCallback((trackId, clipId, updates) => {
    console.log('✏️ [Timeline] handleClipUpdate:', { trackId, clipId, updates })
    updateClip?.(trackId, clipId, updates)
  }, [updateClip])

  const handleClipRemove = useCallback((clipId, trackId) => {
    console.log('🗑️ [Timeline] handleClipRemove:', { trackId, clipId })
    removeClip?.(trackId, clipId)
  }, [removeClip])

  const handleClipDuplicate = useCallback((clipId, trackId) => {
    console.log('📋 [Timeline] handleClipDuplicate:', { trackId, clipId })
    duplicateClip?.(trackId, clipId)
  }, [duplicateClip])

  const handleClipFade = useCallback((trackId, clipId, edge, duration) => {
    console.log('🌊 [Timeline] handleClipFade:', { trackId, clipId, edge, duration })
    store?.setClipFade?.(trackId, clipId, edge, duration)
  }, [store])

  const handleClipContextMenu = useCallback((e, trackId, clipId) => {
    console.log('📋 [Timeline] handleClipContextMenu:', { trackId, clipId })
    e.preventDefault()
  }, [])

  const handleUpdateClipDuration = useCallback((clipId, newDuration) => {
    console.log('📏 [Timeline] handleUpdateClipDuration:', { clipId, newDuration })
    if (setClipDurations) {
      setClipDurations(prev => ({ ...prev, [clipId]: newDuration }))
    }
    store?.updateClipDurationInEditor?.(clipId, newDuration)
  }, [setClipDurations, store])

  const handleTrackRemove = useCallback((trackId) => {
    console.log('🗑️ [Timeline] handleTrackRemove:', trackId)
    removeTrack?.(trackId)
  }, [removeTrack])

  const handleTrackMute = useCallback((trackId, muted) => {
    console.log('🔇 [Timeline] handleTrackMute:', { trackId, muted })
    muteTrack?.(trackId, muted)
  }, [muteTrack])

  const handleTrackSolo = useCallback((trackId, solo) => {
    console.log('🎧 [Timeline] handleTrackSolo:', { trackId, solo })
    soloTrack?.(trackId, solo)
  }, [soloTrack])

  const handleTrackVolume = useCallback((trackId, volume) => {
    console.log('🔊 [Timeline] handleTrackVolume:', { trackId, volume })
    setTrackVolume?.(trackId, volume)
  }, [setTrackVolume])

  const handleSeek = useCallback((time) => {
    console.log('🎯 [Timeline] handleSeek:', time)
    seek?.(time)
  }, [seek])

  const handlePlay = useCallback(() => {
    console.log('▶️ [Timeline] handlePlay')
    togglePlay?.()
  }, [togglePlay])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{
        display: 'flex',
        height: 36,
        minHeight: 36,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        zIndex: 5,
        position: 'relative'
      }}>
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)'
        }} />
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
        onDoubleClick={(e) => {
          const time = clientXToTime(e.clientX)
          handleSeek(time)
        }}
        >
          <TimelineRuler
            totalDuration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
            isPlaying={isPlaying}
            zoomLevel={zoomLevel}
            formatTime={formatTime}
          />
          <TimelinePlayhead
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            isPlaying={isPlaying}
            formatTime={formatTime}
          />
        </div>
      </div>

      <div style={{
        display: 'flex',
        height: 10,
        minHeight: 10,
        flexShrink: 0,
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)',
        position: 'relative'
      }}>
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
          borderRight: '1px solid var(--border)'
        }} />
        <div style={{ flex: 1, position: 'relative' }}>
          <TimelineLoop
            loopRegion={loopRegion}
            pixelsPerSecond={pixelsPerSecond}
            onSetLoopRegion={setLoopRegion}
            onClearLoop={clearLoop}
            onToggleLoop={toggleLoop}
            tr={t}
            totalDuration={totalDuration}
          />
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: TRACK_HEAD_WIDTH,
          minWidth: TRACK_HEAD_WIDTH,
          height: '100%',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          zIndex: 2,
          overflow: 'hidden'
        }}>
          {tracks.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              gap: 8,
              padding: 16,
              fontSize: 12
            }}>
              <i className="ti ti-playlist" style={{ fontSize: 24 }} />
              <span>{t('editorNoTracks')}</span>
              <span style={{ fontSize: 10 }}>{t('editorAddTrackHint')}</span>
            </div>
          )}
          
          {tracks.map((track, index) => {
            const trackColor = track.color || getTrackColor(index)
            return (
              <div
                key={`header-${track.id}`}
                style={{
                  height: 80,
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border)',
                  background: selectedTrackId === track.id ? 'rgba(124,111,247,0.05)' : 'transparent',
                  gap: 4
                }}
              >
                <TrackHeader
                  track={track}
                  trackIndex={index}
                  trackColor={trackColor}
                  isHovering={true}
                  selectedTrackId={selectedTrackId}
                  onTrackRemove={handleTrackRemove}
                  onRenameTrack={store?.renameTrack || (() => {})}
                  tr={t}
                />
                <TrackControls
                  track={track}
                  trackColor={trackColor}
                  onTrackMute={handleTrackMute}
                  onTrackSolo={handleTrackSolo}
                  onTrackVolume={handleTrackVolume}
                  tr={t}
                />
              </div>
            )
          })}
        </div>

        <div
          ref={clipsContainerRef}
          style={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            position: 'relative',
            background: 'var(--bg-primary)'
          }}
        >
          <div style={{
            position: 'relative',
            width: Math.max(totalWidth, 600),
            height: '100%'
          }}>
            {tracks.map((track, index) => {
              const trackColor = track.color || getTrackColor(index)
              return (
                <EditorTrack
                  key={track.id}
                  track={track}
                  trackIndex={index}
                  totalDuration={totalDuration}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipId={selectedClipId}
                  selectedTrackId={selectedTrackId}
                  onClipSelect={handleClipSelect}
                  onClipMove={handleClipMove}
                  onClipUpdate={handleClipUpdate}
                  onClipRemove={handleClipRemove}
                  onClipDuplicate={handleClipDuplicate}
                  onClipFade={handleClipFade}
                  onClipContextMenu={handleClipContextMenu}
                  onDragCheckpoint={store?.pushEditorHistoryCheckpoint || (() => {})}
                  waveformData={waveformData}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  clipDurations={clipDurations}
                  onUpdateClipDuration={handleUpdateClipDuration}
                  trackColor={trackColor}
                  snapEnabled={snapEnabled}  // ✅ AJOUTÉ
                  tr={t}
                  onPlayClip={(clip, trackId) => {
                    console.log('▶️ [Timeline] Play clip:', clip.name)
                    const time = clip.start || 0
                    console.log('🎯 [Timeline] Seek vers', time)
                    seek?.(time)
                    if (!isPlaying) {
                      setTimeout(() => {
                        console.log('▶️ [Timeline] Démarrage playback')
                        togglePlay?.()
                      }, 100)
                    } else {
                      console.log('⏸️ [Timeline] Lecture déjà en cours, seek seulement')
                    }
                  }}
                  onStopClip={() => stop?.()}
                  onCopyClip={(clip) => {
                    console.log('📋 [Timeline] Copier clip:', clip.name)
                    navigator.clipboard?.writeText?.(JSON.stringify(clip))
                    addToast?.('Clip copié', 'info')
                  }}
                  onCutClip={(clip) => {
                    console.log('✂️ [Timeline] Couper clip:', clip.name)
                    navigator.clipboard?.writeText?.(JSON.stringify(clip))
                    addToast?.('Clip coupé', 'info')
                  }}
                  onPasteClip={(trackId) => {
                    console.log('📋 [Timeline] Coller clip dans piste:', trackId)
                    navigator.clipboard?.readText?.().then(data => {
                      try {
                        const clip = JSON.parse(data)
                        if (clip.id && clip.name) {
                          const newClip = {
                            ...clip,
                            id: `clip-${Date.now()}`,
                            start: (clip.start || 0) + (clip.duration || 3) + 0.5
                          }
                          store?.addClipToTrack?.(trackId, null, newClip.start)
                          addToast?.('Clip collé', 'success')
                        }
                      } catch (e) {
                        console.error('Erreur collage:', e)
                        addToast?.('Erreur lors du collage', 'error')
                      }
                    }).catch(() => {
                      addToast?.('Presse-papiers vide', 'warning')
                    })
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '4px 0',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border)',
        zIndex: 20,
        flexShrink: 0
      }}>
        <TimelineZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          totalDuration={totalDuration}
          containerRef={containerRef}
          tr={t}
        />
      </div>
    </div>
  )
}