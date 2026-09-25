// src/features/editor/components/Timeline/index.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor } from '../../contexts/EditorContext'
import EditorTrack from '../Track'
import TrackHeader from '../Track/TrackHeader'
import TrackControls from '../Track/TrackControls'
import TimelineRuler from './TimelineRuler'
import TimelinePlayhead from './TimelinePlayhead'
import TimelineLoop from './TimelineLoop'
import TimelineZoomControls from './TimelineZoomControls'
import TimelineLoopMarkers from './TimelineLoopMarkers'
import TimelineMarkerLines from './TimelineMarkerLines'
import TimelineMarkersPanel from './TimelineMarkersPanel'
import { useTimelineScroll } from './useTimelineScroll'
import { useTimelineClickHandlers } from './useTimelineClickHandlers'
import { useClipIndex } from './useClipIndex'
import { formatTime } from '@shared/utils/format'
import { getBoolean, setItem } from '@shared/utils/appStorage'
import { getTrackColor } from '../../utils/trackColors'

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
  const store = storeProp || editorContext?.store

  const containerRef = useRef(null)

  const [showMarkersPanel, setShowMarkersPanel] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitializedRef = useRef(false)

  // Scroll sync (ruler + loop)
  const scroll = useTimelineScroll()

  // Index clips (O(1) lookup pour loop markers)
  const clipIndex = useClipIndex(tracks, clipDurations)

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(totalDuration * pixelsPerSecond + 100, 600)

  // Click handlers (ruler + timeline)
  const {
    handleTimelineClick,
    handleRulerClick,
    handleRulerDoubleClick,
  } = useTimelineClickHandlers({
    clipsContainerRef: scroll.clipsContainerRef,
    rulerContainerRef: scroll.rulerContainerRef,
    pixelsPerSecond,
    totalWidth,
    totalDuration,
    isPendingAction,
    isTimelineClickModeActive,
    onTimelineClickForLoop,
    onExecutePendingAction,
    onCancelPendingAction,
    onSeek,
    selectedClipId,
    selectedTrackId,
    tracks,
    clipDurations,
    onSplitClip,
    addToast,
    tr,
  })

  // ─── Init markers panel ────────────────────────────────────────────
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    ;(async () => {
      try {
        const autoOpen = await getBoolean(AUTO_OPEN_KEY, false)
        if (!autoOpen) {
          setShowMarkersPanel(false)
          setIsInitialized(true)
          return
        }
        setShowMarkersPanel(true)
        await setItem(STORAGE_KEY, true)
        setIsInitialized(true)
      } catch (e) {
        console.warn('[Timeline] Erreur init markers panel:', e)
        setIsInitialized(true)
      }
    })()
  }, [])

  const handleToggleMarkersPanel = useCallback(async (show) => {
    setShowMarkersPanel(show)
    try {
      await setItem(STORAGE_KEY, show)
    } catch (e) {}
  }, [])

  const handleAutoOpenChange = useCallback(async (autoOpen) => {
    try {
      await setItem(AUTO_OPEN_KEY, autoOpen)
      if (autoOpen) {
        setShowMarkersPanel(true)
        await setItem(STORAGE_KEY, true)
      } else {
        setShowMarkersPanel(false)
        await setItem(STORAGE_KEY, false)
      }
    } catch (e) {}
  }, [])

  // ─── Wheel zoom sur la zone clips ──────────────────────────────────
  useEffect(() => {
    const el = scroll.clipsContainerRef.current
    if (!el) return

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZoom = Math.max(0.05, Math.min(10, zoomLevel + delta))
        onZoomChange?.(newZoom)
      } else {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomLevel, onZoomChange, scroll.clipsContainerRef])

  const shouldShowPanel = isInitialized && showMarkersPanel && onAddMarker

  // ─── RENDER ────────────────────────────────────────────────────────
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
      {/* ─── Ruler ────────────────────────────────────────────────── */}
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
          ref={scroll.rulerContainerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={handleRulerClick}
          onDoubleClick={handleRulerDoubleClick}
          onWheel={scroll.handleRulerWheel}
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

          <div
            ref={scroll.rulerInnerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: totalWidth,
              minWidth: '100%',
              transform: `translateX(-${scroll.scrollLeft}px)`,
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
            <TimelineMarkerLines
              markers={markers}
              pixelsPerSecond={pixelsPerSecond}
              totalWidth={totalWidth}
              variant="ruler"
            />
            <TimelineLoopMarkers
              clipIndex={clipIndex}
              loopState={loopState}
              totalDuration={totalDuration}
              pixelsPerSecond={pixelsPerSecond}
              tr={tr}
            />
          </div>
        </div>
      </div>

      {/* ─── Loop strip ───────────────────────────────────────────── */}
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
          }}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            ref={scroll.loopContainerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: totalWidth,
              minWidth: '100%',
              transform: `translateX(-${scroll.scrollLeft}px)`,
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
              onToggleLoop={() => onToggleTimelineLoop?.()}
              tr={tr}
              totalDuration={totalDuration}
              loopState={loopState}
              onOpenLoopPanel={onOpenLoopPanel}
              onActivateManualClick={onActivateTimelineLoopManualClick}
            />
          </div>
        </div>
      </div>

      {/* ─── Tracks + Markers Panel ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Track headers */}
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

        {/* Clips area */}
        <div
          ref={scroll.clipsContainerRef}
          data-testid="editor-timeline"
          style={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            position: 'relative',
            background: 'var(--bg-primary)',
            cursor: 'pointer',
          }}
          onClick={handleTimelineClick}
          onScroll={scroll.handleClipsScroll}
        >
          <div
            style={{
              position: 'relative',
              width: Math.max(totalWidth, 600),
              height: '100%',
            }}
          >
            <TimelineMarkerLines
              markers={markers}
              pixelsPerSecond={pixelsPerSecond}
              totalWidth={totalWidth}
              variant="timeline"
            />

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

        {/* Markers panel (ou bouton flottant) */}
        {isInitialized && (
          <TimelineMarkersPanel
            isOpen={shouldShowPanel}
            markers={markers}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onAddMarker={onAddMarker}
            onRemoveMarker={onRemoveMarker}
            onUpdateMarker={onUpdateMarker}
            onNavigateToMarker={onNavigateToMarker}
            onClose={() => handleToggleMarkersPanel(false)}
            onOpen={() => handleToggleMarkersPanel(true)}
            onAutoOpenChange={handleAutoOpenChange}
            tr={tr}
          />
        )}
      </div>

      {/* ─── Zoom controls ────────────────────────────────────────── */}
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