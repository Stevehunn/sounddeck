/**
 * @file Timeline — orchestrates the ruler, loop strip, tracks, clips,
 * markers panel, and zoom controls. Owns the horizontal scroll sync
 * (`useTimelineScroll`), the ruler/timeline click handlers
 * (`useTimelineClickHandlers`), the clip index for O(1) loop lookups
 * (`useClipIndex`), and the snap context shared by every clip.
 *
 * Layout (top → bottom):
 * 1. **Ruler** — `TimelineRuler` + `TimelinePlayhead` + markers.
 * 2. **Loop strip** — `TimelineLoop` (global timeline loop).
 * 3. **Tracks** — one `<EditorTrack>` per track, with a matching
 *    `<TrackHeader>` + `<TrackControls>` on the left.
 * 4. **Markers panel** — toggled, persisted in `appStorage`.
 * 5. **Zoom controls** — sticky at the bottom.
 *
 * @see ./useTimelineScroll.js
 * @see ./useTimelineClickHandlers.js
 * @see ./useClipIndex.js
 * @see ../Track/index.jsx
 * @see ../Clip/index.jsx
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { getTrackColor } from '../../utils/trackColors'
import { formatTime } from '@shared/utils/format'
import { getBoolean, setItem } from '@shared/utils/appStorage'

/** Width of the left column (track headers). */
const TRACK_HEAD_WIDTH = 200

/** Base horizontal scale (px / s) at zoomLevel = 1. */
const BASE_PIXELS_PER_SECOND = 80

/** Storage keys for the markers panel state. */
const STORAGE_KEY = 'sounddeck_markers_panel_open'
const AUTO_OPEN_KEY = 'sounddeck_markers_auto_open'

/** Min timeline width (px) — prevents the ruler from collapsing when the
 *  project is empty. */
const MIN_TIMELINE_WIDTH = 600

/** Track row height (px). */
const TRACK_HEIGHT_PX = 96

/**
 * Timeline root component (see file header).
 *
 * @param {Object} props
 * @param {Array} props.tracks
 * @param {string|null} props.selectedClipId
 * @param {string|null} props.selectedTrackId
 * @param {number} props.totalDuration
 * @param {number} props.currentTime
 * @param {boolean} props.isPlaying
 * @param {Object} [props.clipDurations]
 * @param {Object} [props.waveformData]
 * @param {number} props.zoomLevel
 * @param {boolean} props.snapEnabled
 * @param {Object} [props.loopRegion]
 * @param {boolean} [props.autoCrossfade]
 * @param {Function} [props.onClipSelect]
 * @param {Function} [props.onClipMove]
 * @param {Function} [props.onClipUpdate]
 * @param {Function} [props.onClipRemove]
 * @param {Function} [props.onClipDuplicate]
 * @param {Function} [props.onClipFade]
 * @param {Function} [props.onClipContextMenu]
 * @param {Function} [props.onDragCheckpoint]
 * @param {Function} [props.onTrackRemove]
 * @param {Function} [props.onSeek]
 * @param {Function} [props.onTrackMute]
 * @param {Function} [props.onTrackSolo]
 * @param {Function} [props.onTrackVolume]
 * @param {Function} [props.onTrackReorder]
 * @param {Function} [props.onRenameTrack]
 * @param {Function} [props.onSetLoopRegion]
 * @param {Function} [props.onClearLoop]
 * @param {Function} [props.onToggleLoop]
 * @param {Function} [props.onUpdateClipDuration]
 * @param {Function} [props.onZoomChange]
 * @param {Function} [props.onSplitClip]
 * @param {Function} [props.addToast]
 * @param {Object} [props.store]
 * @param {Function} [props.setClipDurations]
 * @param {Function} [props.removeTrack]
 * @param {(key: string, params?: Object) => string} props.tr
 * @param {Function} [props.onPlayClip]
 * @param {Function} [props.onStopClip]
 * @param {Function} [props.onCopyClip]
 * @param {Function} [props.onCutClip]
 * @param {Function} [props.onPasteClip]
 * @param {Array} [props.markers]
 * @param {Function} [props.onAddMarker]
 * @param {Function} [props.onRemoveMarker]
 * @param {Function} [props.onUpdateMarker]
 * @param {Function} [props.onNavigateToMarker]
 * @param {Object} [props.loopState]
 * @param {boolean} [props.isPendingAction]
 * @param {Object} [props.pendingAction]
 * @param {Function} [props.onExecutePendingAction]
 * @param {Function} [props.onCancelPendingAction]
 * @param {Function} [props.onToggleTimelineLoop]
 * @param {Function} [props.onSetTimelineLoop]
 * @param {Function} [props.onOpenLoopPanel]
 * @param {Function} [props.onActivateTimelineLoopManualClick]
 * @param {boolean} [props.isTimelineClickModeActive]
 * @param {Function} [props.onTimelineClickForLoop]
 * @returns {JSX.Element}
 */
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
  onTrackReorder: _onTrackReorder,
  onRenameTrack,
  onSetLoopRegion,
  onClearLoop,
  onToggleLoop,
  onUpdateClipDuration,
  onZoomChange,
  onSplitClip,
  addToast,
  store: storeProp,
  setClipDurations: _setClipDurations,
  removeTrack: _removeTrack,
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
  pendingAction: _pendingAction,
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

  // Horizontal scroll sync (ruler + loop strip follow the clips container).
  const scroll = useTimelineScroll()

  // O(1) clip index for loop markers.
  const clipIndex = useClipIndex(tracks, clipDurations)

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel
  const totalWidth = Math.max(
    totalDuration * pixelsPerSecond + 100,
    MIN_TIMELINE_WIDTH
  )

  // Snap context shared by all clips (other clip edges, markers, playhead,
  // and the timeline end).
  const snapContext = useMemo(() => {
    const allClips = []
    for (const track of tracks || []) {
      for (const clip of track.clips || []) {
        allClips.push({
          id: clip.id,
          start: clip.start || 0,
          duration: clipDurations?.[clip.id] || clip.duration || 3,
        })
      }
    }
    return {
      allClips,
      markers: markers || [],
      playhead: currentTime,
      totalDuration,
    }
  }, [tracks, clipDurations, markers, currentTime, totalDuration])

  const { handleTimelineClick, handleRulerClick, handleRulerDoubleClick } =
    useTimelineClickHandlers({
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

  // Initialize the markers panel from `appStorage` (once).
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const init = async () => {
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
        console.warn('[Timeline] Error initializing markers panel:', e)
        setIsInitialized(true)
      }
    }
    init()
  }, [])

  const handleToggleMarkersPanel = useCallback(async (show) => {
    setShowMarkersPanel(show)
    try {
      await setItem(STORAGE_KEY, show)
    } catch {
      // ignore — persistence is best-effort
    }
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
    } catch {
      // ignore
    }
  }, [])

  // Ctrl/Cmd + wheel → zoom. Plain wheel → horizontal scroll.
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
      {/* ─── Ruler ─────────────────────────────────────────────────── */}
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
              <span>{tr('clickHere') || '🖱️ Click here'}</span>
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

      {/* ─── Loop strip ────────────────────────────────────────────── */}
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
        {/* Left column: track headers + controls */}
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
                  height: TRACK_HEIGHT_PX,
                  minHeight: TRACK_HEIGHT_PX,
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

        {/* Right column: clips */}
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
              width: Math.max(totalWidth, MIN_TIMELINE_WIDTH),
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
                  snapContext={snapContext}
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

        {/* Markers panel (or floating "add marker" button) */}
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

      {/* ─── Zoom controls ─────────────────────────────────────────── */}
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