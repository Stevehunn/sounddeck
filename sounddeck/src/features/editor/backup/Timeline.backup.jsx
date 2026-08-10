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
    addToast,
  } = context

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

  // ─── GESTION DU SCROLL ──────────────────────────────────────────────────

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

  // ─── RENDU ──────────────────────────────────────────────────────────────

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
      {/* Règle avec marqueurs */}
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
          onSeek?.(time)
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

      {/* Bande de boucle */}
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
            onSetLoopRegion={onSetLoopRegion}
            onClearLoop={onClearLoop}
            onToggleLoop={onToggleLoop}
            tr={t}
            totalDuration={totalDuration}
          />
        </div>
      </div>

      {/* Corps de la timeline */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Section gauche : HEADERS */}
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
            const trackColor = getTrackColor(index)
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
                  onTrackRemove={onTrackRemove}
                  onRenameTrack={onRenameTrack}
                  tr={t}
                />
                <TrackControls
                  track={track}
                  trackColor={trackColor}
                  onTrackMute={onTrackMute}
                  onTrackSolo={onTrackSolo}
                  onTrackVolume={onTrackVolume}
                  tr={t}
                />
              </div>
            )
          })}
        </div>

        {/* Section droite : CLIPS */}
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
              const trackColor = getTrackColor(index)
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
                  tr={t}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Contrôles de zoom */}
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
          onZoomChange={onZoomChange}
          totalDuration={totalDuration}
          containerRef={containerRef}
          tr={t}
        />
      </div>
    </div>
  )
}