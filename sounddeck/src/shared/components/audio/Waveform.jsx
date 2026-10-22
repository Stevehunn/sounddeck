/**
 * @file Canvas-based audio waveform renderer with optional drag handles.
 *
 * Renders a waveform from an audio file by:
 * 1. Generating a downsampled peak array (`generateWaveformData`, 300 bars)
 * 2. Drawing each bar to a `<canvas>`
 *
 * Supports two modes:
 * - **Playback mode** (`showHandles === false`): the waveform shows the
 *   played portion in `color` and the remaining part in `colorUnselected`.
 *   Clicking on the waveform calls `onSeek(pos)`.
 * - **Selection mode** (`showHandles === true`): shows three zones
 *   (before, selected, after), two draggable handles (start/end), and a
 *   vertical playhead. Dragging a handle calls `onStartChange` /
 *   `onEndChange`; dragging elsewhere calls `onSeek`.
 *
 * Loading state: while `generateWaveformData` is running, a spinner overlay
 * is shown. The wave data is only re-fetched when `filePath` changes.
 *
 * Note on state:
 * - `waveState` is a single state object `{path, data, loading}` so that
 *   "loading a new file" is derived from `waveState.path !== filePath` —
 *   no `set-state-in-effect` needed.
 *
 * @see ./AudioTrimmer.jsx — primary consumer (selection mode)
 * @see @shared/utils/waveformGenerator.js
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { formatTime as formatTimeShared } from '@shared/utils/format'
import { generateWaveformData } from '@shared/utils/waveformGenerator'

/**
 * Waveform component.
 *
 * @param {Object} props
 * @param {string} props.filePath - Path to the audio file.
 * @param {number} [props.start=0] - Selection start (seconds).
 * @param {number|null} [props.end=null] - Selection end (seconds, defaults to `duration`).
 * @param {number} [props.currentTime=0] - Playhead position (seconds).
 * @param {number} [props.duration=0] - Total duration (seconds).
 * @param {((pos: number) => void)|null} [props.onSeek] - Click/drag on the waveform.
 * @param {((pos: number) => void)|null} [props.onStartChange] - Start handle drag (requires `showHandles`).
 * @param {((pos: number) => void)|null} [props.onEndChange] - End handle drag (requires `showHandles`).
 * @param {number} [props.height=80] - Component height (px).
 * @param {boolean} [props.showHandles=false] - Enable selection mode.
 * @param {string} [props.color='var(--accent)'] - Played bar color.
 * @param {string} [props.colorSelected='rgba(124,111,247,0.8)'] - Selected bar color.
 * @param {string} [props.colorUnselected='rgba(124,111,247,0.25)'] - Unplayed bar color.
 * @returns {JSX.Element}
 */
export default function Waveform({
  filePath,
  start = 0,
  end = null,
  currentTime = 0,
  duration = 0,
  onSeek = null,
  onStartChange = null,
  onEndChange = null,
  height = 80,
  showHandles = false,
  color = 'var(--accent)',
  colorSelected = 'rgba(124,111,247,0.8)',
  colorUnselected = 'rgba(124,111,247,0.25)',
}) {
  const { t } = useLanguage()
  const canvasRef = useRef(null)
  const [waveState, setWaveState] = useState({
    path: filePath,
    data: null,
    loading: !!filePath,
  })
  const [dragging, setDragging] = useState(null)
  const containerRef = useRef(null)

  // Derived from `waveState` (avoids set-state-in-effect when filePath changes)
  const waveData = waveState.path === filePath ? waveState.data : null
  const loading = waveState.path === filePath ? waveState.loading : !!filePath

  // ─── Load waveform data ───────────────────────────────────────────
  useEffect(() => {
    if (!filePath) return

    let mounted = true
    generateWaveformData(filePath, 300)
      .then((data) => {
        if (!mounted) return
        setWaveState({ path: filePath, data, loading: false })
      })
      .catch(() => {
        if (!mounted) return
        setWaveState({ path: filePath, data: null, loading: false })
      })

    return () => {
      mounted = false
    }
  }, [filePath])

  // ─── Draw canvas ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveData) return

    const ctx = canvas.getContext('2d')
    const { width, height: h } = canvas
    ctx.clearRect(0, 0, width, h)

    const endTime = end ?? duration
    const startRatio = duration > 0 ? start / duration : 0
    const endRatio = duration > 0 ? endTime / duration : 1
    const playRatio = duration > 0 ? currentTime / duration : 0

    const barWidth = width / waveData.length
    const centerY = h / 2

    waveData.forEach((val, i) => {
      const x = i * barWidth
      const ratio = i / waveData.length
      const barH = Math.max(2, val * h * 0.9)

      let fillColor
      if (showHandles) {
        if (ratio >= startRatio && ratio <= endRatio) {
          fillColor = ratio <= playRatio ? color : colorSelected
        } else {
          fillColor = colorUnselected
        }
      } else {
        fillColor = ratio <= playRatio ? color : colorUnselected
      }

      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(
        x + 0.5,
        centerY - barH / 2,
        Math.max(1, barWidth - 1),
        barH,
        1
      )
      ctx.fill()
    })

    if (duration > 0) {
      const playX = playRatio * width
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(playX, 0)
      ctx.lineTo(playX, h)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [
    waveData,
    start,
    end,
    currentTime,
    duration,
    showHandles,
    color,
    colorSelected,
    colorUnselected,
  ])

  // ─── Mouse interaction ────────────────────────────────────────────
  const getPosFromEvent = useCallback(
    (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !duration) return 0
      return (
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
      )
    },
    [duration]
  )

  const handleMouseDown = (e) => {
    if (!duration) return
    const pos = getPosFromEvent(e)
    const endTime = end ?? duration
    const startRatio = start / duration
    const endRatio = endTime / duration
    const posRatio = pos / duration

    if (showHandles) {
      const distStart = Math.abs(posRatio - startRatio)
      const distEnd = Math.abs(posRatio - endRatio)
      if (distStart < 0.03) {
        setDragging('start')
        return
      }
      if (distEnd < 0.03) {
        setDragging('end')
        return
      }
    }
    setDragging('seek')
    onSeek?.(pos)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return
      const pos = getPosFromEvent(e)
      if (dragging === 'seek') onSeek?.(pos)
      else if (dragging === 'start')
        onStartChange?.(Math.min(pos, (end ?? duration) - 0.1))
      else if (dragging === 'end') onEndChange?.(Math.max(pos, start + 0.1))
    }
    const handleMouseUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    dragging,
    start,
    end,
    duration,
    onSeek,
    onStartChange,
    onEndChange,
    getPosFromEvent,
  ])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        cursor: 'crosshair',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: loading ? 'none' : 'block',
          borderRadius: 8,
        }}
      />

      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            gap: 8,
            color: 'var(--text-tertiary)',
            fontSize: 12,
          }}
        >
          <i
            className="ti ti-loader"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          {t('waveformAnalyzing')}
        </div>
      )}

      {showHandles && duration > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(start / duration) * 100}%`,
            width: 3,
            background: 'var(--accent)',
            cursor: 'ew-resize',
            transform: 'translateX(-1px)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: -4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '2px solid white',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
            }}
          >
            {formatTime(start)}
          </div>
        </div>
      )}

      {showHandles && duration > 0 && end != null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(end / duration) * 100}%`,
            width: 3,
            background: 'var(--accent)',
            cursor: 'ew-resize',
            transform: 'translateX(-1px)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: -4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '2px solid white',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
            }}
          >
            {formatTime(end)}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Formats a duration for the waveform handles (M:SS.d, always MM:SS).
 *
 * Re-exported from this module so callers can use the same format as the
 * handle labels without importing `@shared/utils/format` directly.
 *
 * @param {number} s - Duration in seconds.
 * @returns {string} Formatted duration (e.g. "0:45.0").
 */
// `formatTime` is re-exported here for backward compatibility. Fast
// Refresh normally requires a file to export only components — this
// disable is safe because the export is stable (no state depends on it),
// so HMR simply falls back to a full reload when editing this file.
// eslint-disable-next-line react-refresh/only-export-components
export function formatTime(s) {
  return formatTimeShared(s, { alwaysMMSS: true, decimals: 1 })
}