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
import MarkersPanel from '../Markers/MarkersPanel'
import { formatTime } from '@shared/utils/format'

const TRACK_HEAD_WIDTH = 200
const BASE_PIXELS_PER_SECOND = 80
const STORAGE_KEY = 'sounddeck_markers_panel_open'
const AUTO_OPEN_KEY = 'sounddeck_markers_auto_open'

export default function EditorTimeline({
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
  onClipSelect,
  onClipMove,
  onClipUpdate,
  onClipRemove,
  onClipDuplicate,
  onClipFade,
  onClipContextMenu,
  onDragCheckpoint,
  onTrackRemove,
  onSeek,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  onTrackReorder,
  onRenameTrack,
  onSetLoopRegion,
  onClearLoop,
  onToggleLoop,
  onUpdateClipDuration,
  onZoomChange,
  onSplitClip,
  addToast,
  store: storeProp,
  setClipDurations,
  removeTrack,
  tr,
  onPlayClip,
  onStopClip,
  onCopyClip,
  onCutClip,
  onPasteClip,
  markers = [],
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onNavigateToMarker,
  loopState = {},
  isPendingAction = false,
  pendingAction = null,
  onExecutePendingAction,
  onCancelPendingAction,
  onToggleTimelineLoop,
  onSetTimelineLoop,
  onOpenLoopPanel,
  onActivateTimelineLoopManualClick,
  isTimelineClickModeActive = false,
  onTimelineClickForLoop,
}) {
  const editorContext = useEditor()

  const containerRef = useRef(null)
  const clipsContainerRef = useRef(null)
  const rulerContainerRef = useRef(null)
  const rulerInnerRef = useRef(null)
  const loopContainerRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStartX, setPanStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const store = storeProp || editorContext?.store

  const [showMarkersPanel, setShowMarkersPanel] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitializedRef = useRef(false)

  const getAutoOpenPreference = useCallback(() => {
    const saved = localStorage.getItem(AUTO_OPEN_KEY)
    return saved === null ? false : saved === 'true'
  }, [])

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  const handleClipsScroll = useCallback((e) => {
    const scrollLeft = e.currentTarget.scrollLeft
    setScrollLeft(scrollLeft)

    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(-${scrollLeft}px)`
    }

    if (loopContainerRef.current) {
      loopContainerRef.current.style.transform = `translateX(-${scrollLeft}px)`
    }
  }, [])

  const handleRulerWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) return
    if (clipsContainerRef.current) {
      clipsContainerRef.current.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }, [])

  const getTrackColor = (index) => {
    const colors = [
      'hsl(220, 70%, 55%)',
      'hsl(340, 70%, 55%)',
      'hsl(40, 70%, 55%)',
      'hsl(160, 70%, 55%)',
      'hsl(280, 70%, 55%)',
      'hsl(10, 70%, 55%)',
      'hsl(190, 70%, 55%)',
      'hsl(70, 70%, 55%)',
    ]
    return colors[index % colors.length]
  }

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const autoOpen = getAutoOpenPreference()

    if (!autoOpen) {
      setShowMarkersPanel(false)
      setIsInitialized(true)
      return
    }

    setShowMarkersPanel(true)
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsInitialized(true)
  }, [onAddMarker, getAutoOpenPreference])

  const handleToggleMarkersPanel = useCallback((show) => {
    setShowMarkersPanel(show)
    localStorage.setItem(STORAGE_KEY, String(show))
  }, [])

  const handleAutoOpenChange = useCallback((autoOpen) => {
    localStorage.setItem(AUTO_OPEN_KEY, String(autoOpen))

    if (autoOpen) {
      setShowMarkersPanel(true)
      localStorage.setItem(STORAGE_KEY, 'true')
    } else {
      setShowMarkersPanel(false)
      localStorage.setItem(STORAGE_KEY, 'false')
    }
  }, [])

  const clientXToTime = useCallback(
    (clientX, containerElement) => {
      const container = containerElement || clipsContainerRef.current
      if (!container) return 0
      const rect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const clickInTimeline = clientX - rect.left + scrollLeft
      const clampedX = Math.max(0, Math.min(totalWidth, clickInTimeline))
      return clampedX / pixelsPerSecond
    },
    [totalWidth, pixelsPerSecond]
  )

  const handleTimelineClick = useCallback(
    (e) => {
      if (isTimelineClickModeActive && onTimelineClickForLoop) {
        const time = clientXToTime(e.clientX)
        if (time >= 0 && time <= totalDuration) {
          e.preventDefault()
          e.stopPropagation()
          onTimelineClickForLoop(time)
        }
        return
      }

      if (isPendingAction) {
        const time = clientXToTime(e.clientX)
        if (time >= 0 && time <= totalDuration) {
          onExecutePendingAction?.(time)
        }
        return
      }

      const target = e.target
      if (
        target.closest?.('.editor-clip-wrapper') ||
        target.closest?.('button')
      ) {
        return
      }

      const time = clientXToTime(e.clientX)
      if (time >= 0 && time <= totalDuration) {
        onSeek?.(time)
      }
    },
    [
      isPendingAction,
      isTimelineClickModeActive,
      onTimelineClickForLoop,
      clientXToTime,
      totalDuration,
      onExecutePendingAction,
      onSeek,
    ]
  )

  const handleRulerClick = useCallback(
    (e) => {
      if (isTimelineClickModeActive && onTimelineClickForLoop) {
        const time = clientXToTime(e.clientX, rulerContainerRef.current)
        if (time >= 0 && time <= totalDuration) {
          e.preventDefault()
          e.stopPropagation()
          onTimelineClickForLoop(time)
        }
        return
      }

      if (isPendingAction) {
        const time = clientXToTime(e.clientX, rulerContainerRef.current)
        if (time >= 0 && time <= totalDuration) {
          onExecutePendingAction?.(time)
        }
        return
      }

      const time = clientXToTime(e.clientX, rulerContainerRef.current)
      if (time >= 0 && time <= totalDuration) {
        onSeek?.(time)
      }
    },
    [
      isPendingAction,
      isTimelineClickModeActive,
      onTimelineClickForLoop,
      clientXToTime,
      totalDuration,
      onExecutePendingAction,
      onSeek,
    ]
  )

  const handleRulerDoubleClick = useCallback(
    (e) => {
      const time = clientXToTime(e.clientX, rulerContainerRef.current)
      if (time >= 0 && time <= totalDuration) {
        onSeek?.(time)

        if (selectedClipId && selectedTrackId && onSplitClip) {
          const allClips = tracks.flatMap((t) => t.clips)
          const clip = allClips.find((c) => c.id === selectedClipId)
          if (clip) {
            const duration = clipDurations[clip.id] || clip.duration || 3
            const start = clip.start || 0
            const end = start + duration
            if (time > start + 0.05 && time < end - 0.05) {
              onSplitClip(selectedTrackId, selectedClipId, time)
              addToast?.(
                tr('editorSplitSuccess') || 'Clip coupé à la position du curseur',
                'success'
              )
            }
          }
        }
      }
    },
    [
      clientXToTime,
      totalDuration,
      onSeek,
      selectedClipId,
      selectedTrackId,
      tracks,
      clipDurations,
      onSplitClip,
      addToast,
      tr,
    ]
  )

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPendingAction) {
        onCancelPendingAction?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPendingAction, onCancelPendingAction])

  const renderLoopMarkers = () => {
    if (!loopState?.clips) return null

    const markers = []

    for (const [clipId, loopData] of Object.entries(loopState.clips)) {
      if (!loopData.enabled) continue

      let clip = null
      let clipStart = 0
      let clipDuration = 0
      let loopEnd = loopData.end || totalDuration

      for (const track of tracks) {
        const found = track.clips.find((c) => c.id === clipId)
        if (found) {
          clip = found
          clipStart = found.start || 0
          clipDuration = clipDurations[found.id] || found.duration || 3
          break
        }
      }

      if (!clip) continue

      const clipEnd = clipStart + clipDuration
      const loopEndPosition = Math.min(loopEnd, totalDuration) * pixelsPerSecond
      const loopColor = loopData.arrowColor || '#22c55e'
      const loopMode = loopData.loopMode || 'endOfTrack'
      const totalCycles = loopData.totalCycles || loopData.cycleCount || 1

      if (loopEndPosition > clipEnd * pixelsPerSecond) {
        markers.push(
          <div
            key={`loop-end-${clipId}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: loopEndPosition,
              zIndex: 6,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -4,
                bottom: -4,
                left: 0,
                width: 2,
                background: loopColor,
                opacity: 0.6,
                boxShadow: `0 0 12px ${loopColor}60`,
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 4,
                transform: 'translateY(-50%)',
                fontSize: 22,
                fontWeight: 900,
                color: loopColor,
                opacity: 0.9,
                textShadow: `0 0 20px ${loopColor}50, 0 0 40px ${loopColor}30`,
                lineHeight: 1,
              }}
            >
              ]
            </div>

            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 4,
                fontSize: 8,
                fontWeight: 500,
                color: loopColor,
                background: 'rgba(0,0,0,0.8)',
                padding: '2px 8px',
                borderRadius: 3,
                border: `1px solid ${loopColor}40`,
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <span>🔚</span>
              <span>{tr('loopEndLabel') || 'FIN'}</span>
              {loopMode === 'cycles' && totalCycles > 1 && (
                <span style={{ opacity: 0.6 }}>({totalCycles}x)</span>
              )}
              <span style={{ opacity: 0.5 }}>
                {(loopEnd - clipStart).toFixed(1)}s
              </span>
            </div>
          </div>
        )
      }

      if (loopMode === 'cycles' && totalCycles > 1) {
        const cycleDuration = clipDuration
        let cycleEnd = clipEnd

        for (let i = 1; i < totalCycles; i++) {
          cycleEnd += cycleDuration
          const position = cycleEnd * pixelsPerSecond
          if (position >= loopEndPosition) break

          markers.push(
            <div
              key={`cycle-marker-${clipId}-${i}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: position,
                width: 1,
                background: loopColor,
                zIndex: 3,
                opacity: 0.2,
                pointerEvents: 'none',
                borderLeft: `2px dashed ${loopColor}40`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 7,
                  color: loopColor,
                  opacity: 0.4,
                  fontFamily: 'monospace',
                }}
              >
                {i + 1}
              </div>
            </div>
          )
        }
      }
    }

    return markers
  }

  const renderMarkerMarkers = () => {
    if (!markers || markers.length === 0) return null

    return markers.map((marker) => {
      const position = marker.time * pixelsPerSecond
      if (position > totalWidth) return null

      return (
        <div
          key={`marker-${marker.id}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: position,
            width: 2,
            background: marker.color || '#3b82f6',
            zIndex: 4,
            pointerEvents: 'none',
            opacity: 0.8,
          }}
          title={`${marker.name} (${formatTime(marker.time)})`}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `6px solid ${marker.color || '#3b82f6'}`,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 7,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-secondary)',
              padding: '1px 4px',
              borderRadius: 2,
              border: `1px solid ${marker.color || '#3b82f6'}`,
              whiteSpace: 'nowrap',
              opacity: 0.7,
              pointerEvents: 'none',
              maxWidth: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {marker.name.length > 8 ? marker.name.slice(0, 8) + '…' : marker.name}
          </div>

          <div
            style={{
              position: 'absolute',
              top: 20,
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 1,
              background: marker.color || '#3b82f6',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          />
        </div>
      )
    })
  }

  useEffect(() => {
    const clipsContainer = clipsContainerRef.current
    if (!clipsContainer) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        onZoomChange?.(newZoom)
      } else {
        clipsContainer.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    clipsContainer.addEventListener('wheel', onWheel, { passive: false })
    return () => clipsContainer.removeEventListener('wheel', onWheel)
  }, [zoomLevel, onZoomChange])

  const getTrackKey = (track) => {
    const clipPositions = track.clips
      .map((c) => `${c.id}:${c.start.toFixed(3)}`)
      .join('|')
    return `${track.id}-${clipPositions}`
  }

  const shouldShowPanel = isInitialized && showMarkersPanel && onAddMarker

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
        position: 'relative',
      }}
    >
      {/* Ruler */}
      <div
        style={{
          display: 'flex',
          height: 36,
          minHeight: 36,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          zIndex: 5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: TRACK_HEAD_WIDTH,
            minWidth: TRACK_HEAD_WIDTH,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            zIndex: 2,
            position: 'relative',
          }}
        />
        <div
          ref={rulerContainerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: isPendingAction || isTimelineClickModeActive ? 'pointer' : 'pointer',
          }}
          onClick={handleRulerClick}
          onDoubleClick={handleRulerDoubleClick}
          onWheel={handleRulerWheel}
        >
          {isPendingAction && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                padding: '4px 16px',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 20px var(--accent)66',
                animation: 'clickHerePulse 1.2s ease-in-out infinite',
              }}
            >
              <i className="ti ti-click" />
              <span>{tr('clickHere') || '🖱️ Cliquez ici'}</span>
            </div>
          )}

          {/* ✅ FIX : width + minWidth au lieu de Math.max avec '100%' */}
          <div
            ref={rulerInnerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: totalWidth,
              minWidth: '100%',
              transform: `translateX(-${scrollLeft}px)`,
              transition: 'none',
              willChange: 'transform',
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
            {renderMarkerMarkers()}
            {renderLoopMarkers()}
          </div>
        </div>
      </div>

      {/* Loop strip */}
      <div
        style={{
          display: 'flex',
          height: 10,
          minHeight: 10,
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: TRACK_HEAD_WIDTH,
            minWidth: TRACK_HEAD_WIDTH,
            flexShrink: 0,
            background: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border)',
            zIndex: 2,
            position: 'relative',
          }}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* ✅ FIX : width + minWidth au lieu de Math.max avec '100%' */}
          <div
            ref={loopContainerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: totalWidth,
              minWidth: '100%',
              transform: `translateX(-${scrollLeft}px)`,
              transition: 'none',
              willChange: 'transform',
            }}
          >
            <TimelineLoop
              loopRegion={loopRegion}
              pixelsPerSecond={pixelsPerSecond}
              onSetLoopRegion={(start, end) => {
                onSetLoopRegion?.(start, end)
                onSetTimelineLoop?.({ start, end })
              }}
              onClearLoop={() => {
                onClearLoop?.()
                onSetTimelineLoop?.({ enabled: false, start: 0, end: 10 })
              }}
              onToggleLoop={() => {
                onToggleTimelineLoop?.()
              }}
              tr={tr}
              totalDuration={totalDuration}
              loopState={loopState}
              onOpenLoopPanel={onOpenLoopPanel}
              onActivateManualClick={onActivateTimelineLoopManualClick}
            />
          </div>
        </div>
      </div>

      {/* Tracks + Markers Panel */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Track Headers */}
        <div
          style={{
            width: TRACK_HEAD_WIDTH,
            minWidth: TRACK_HEAD_WIDTH,
            height: '100%',
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {tracks.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-tertiary)',
                gap: 8,
                padding: 16,
                fontSize: 12,
              }}
            >
              <i className="ti ti-playlist" style={{ fontSize: 24 }} />
              <span>{tr('editorNoTracks')}</span>
              <span style={{ fontSize: 10 }}>{tr('editorAddTrackHint')}</span>
            </div>
          )}

          {tracks.map((track, index) => {
            const trackColor = track.color || getTrackColor(index)
            return (
              <div
                key={`header-${track.id}`}
                style={{
                  height: 96,
                  minHeight: 96,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border)',
                  background:
                    selectedTrackId === track.id
                      ? 'rgba(124,111,247,0.05)'
                      : 'transparent',
                  gap: 4,
                }}
              >
                <TrackHeader
                  track={track}
                  trackIndex={index}
                  trackColor={trackColor}
                  isHovering={true}
                  selectedTrackId={selectedTrackId}
                  onTrackRemove={onTrackRemove}
                  onRenameTrack={onRenameTrack}
                  tr={tr}
                />
                <TrackControls
                  track={track}
                  trackColor={trackColor}
                  onTrackMute={onTrackMute}
                  onTrackSolo={onTrackSolo}
                  onTrackVolume={onTrackVolume}
                  tr={tr}
                />
              </div>
            )
          })}
        </div>

        {/* Clips */}
        <div
          ref={clipsContainerRef}
          data-testid="editor-timeline"
          style={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            position: 'relative',
            background: 'var(--bg-primary)',
            cursor:
              isPendingAction || isTimelineClickModeActive ? 'pointer' : 'pointer',
          }}
          onClick={handleTimelineClick}
          onScroll={handleClipsScroll}
        >
          <div
            style={{
              position: 'relative',
              width: Math.max(totalWidth, 600),
              height: '100%',
            }}
          >
            {markers &&
              markers.length > 0 &&
              markers.map((marker) => {
                const position = marker.time * pixelsPerSecond
                if (position > totalWidth) return null

                return (
                  <div
                    key={`marker-line-${marker.id}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: position,
                      width: 1,
                      background: marker.color || '#3b82f6',
                      opacity: 0.15,
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />
                )
              })}

            {tracks.map((track, index) => {
              const trackColor = track.color || getTrackColor(index)
              const trackKey = getTrackKey(track)

              return (
                <EditorTrack
                  key={trackKey}
                  track={track}
                  trackIndex={index}
                  totalDuration={totalDuration}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipId={selectedClipId}
                  selectedTrackId={selectedTrackId}
                  onClipSelect={onClipSelect}
                  onClipMove={onClipMove}
                  onClipUpdate={onClipUpdate}
                  onClipRemove={onClipRemove}
                  onClipDuplicate={onClipDuplicate}
                  onClipFade={onClipFade}
                  onClipContextMenu={onClipContextMenu}
                  onDragCheckpoint={onDragCheckpoint}
                  waveformData={waveformData}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  clipDurations={clipDurations}
                  onUpdateClipDuration={onUpdateClipDuration}
                  trackColor={trackColor}
                  snapEnabled={snapEnabled}
                  tr={tr}
                  onPlayClip={onPlayClip}
                  onStopClip={onStopClip}
                  onCopyClip={onCopyClip}
                  onCutClip={onCutClip}
                  onPasteClip={onPasteClip}
                  loopState={loopState}
                />
              )
            })}
          </div>
        </div>

        {/* Panel des marqueurs */}
        {shouldShowPanel && (
          <div
            data-testid="editor-markers-panel"
            style={{
              width: 280,
              minWidth: 280,
              height: '100%',
              background: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border)',
              zIndex: 3,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
                background: 'var(--bg-tertiary)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <i className="ti ti-flag" style={{ color: 'var(--accent)' }} />
                {tr('editorMarkers') || 'Marqueurs'}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 400,
                    color: 'var(--text-tertiary)',
                    marginLeft: 2,
                  }}
                >
                  ({markers?.length || 0})
                </span>
              </span>
              <button
                className="btn-ghost btn-sm btn-icon"
                onClick={() => {
                  handleToggleMarkersPanel(false)
                }}
                style={{
                  padding: '2px 4px',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  minWidth: 20,
                  minHeight: 20,
                  borderRadius: 'var(--radius-sm)',
                }}
                title={tr('close') || 'Fermer le panneau des marqueurs'}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 8,
              }}
            >
              <MarkersPanel
                markers={markers}
                onAddMarker={onAddMarker}
                onRemoveMarker={onRemoveMarker}
                onUpdateMarker={onUpdateMarker}
                onNavigateToMarker={onNavigateToMarker}
                currentTime={currentTime}
                totalDuration={totalDuration}
                tr={tr}
                onAutoOpenChange={handleAutoOpenChange}
              />
            </div>
          </div>
        )}

        {isInitialized && !showMarkersPanel && onAddMarker && (
          <button
            data-testid="editor-add-marker-button"
            className="btn-secondary btn-sm"
            onClick={() => {
              handleToggleMarkersPanel(true)
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 10,
              padding: '4px 10px',
              fontSize: 11,
              color: 'var(--accent)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              background: 'var(--bg-secondary)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
            }}
            title={tr('editorMarkers') || 'Afficher les marqueurs'}
          >
            <i className="ti ti-flag" />
            {tr('editorMarkers') || 'Marqueurs'}
            <span
              style={{
                fontSize: 9,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '0 6px',
                borderRadius: 10,
                minWidth: 16,
                textAlign: 'center',
              }}
            >
              {markers?.length || 0}
            </span>
          </button>
        )}
      </div>

      {/* Zoom Controls */}
      <div
        data-testid="editor-zoom-controls"
        style={{
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
          flexShrink: 0,
        }}
      >
        <TimelineZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
          totalDuration={totalDuration}
          containerRef={containerRef}
          tr={tr}
        />
      </div>

      <style>{`
        @keyframes clickHerePulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateX(-50%) scale(1.06);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  )
}