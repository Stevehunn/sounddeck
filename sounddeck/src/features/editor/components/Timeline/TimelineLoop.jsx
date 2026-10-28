/**
 * @file Global timeline loop strip — drag to create, drag handles to
 * resize, click the settings button to open the loop panel.
 *
 * Renders one thin horizontal strip below the ruler. When a loop is
 * active, it shows:
 * - the loop zone (colored rectangle),
 * - an extended zone (diagonal stripes) representing extra cycles,
 * - `[` / `]` markers with `▼` arrows,
 * - a `END` label at the extended end,
 * - cycle markers (dashed vertical lines) when in `cycles` mode,
 * - a summary label (`LOOP 2.0s → 10.0s (8.0s) 3x`).
 *
 * Modes (`timeline.durationMode`):
 * - `'cycles'` — loop N times the base duration.
 * - `'manualDuration'` — explicit total duration (seconds).
 * - `'manualTime'` — explicit end time (seconds).
 *
 * @see ../Timeline/index.jsx — the parent that mounts it
 * @see ./TimelineLoopMarkers.jsx — end markers on the ruler
 */

import { useState, useRef, useEffect, memo } from 'react'

/** Default loop color when `timeline.color` is absent. */
const DEFAULT_LOOP_COLOR = '#7C6FF7'

/** Default number of cycles for `cycles` mode. */
const DEFAULT_CYCLE_COUNT = 3

/** Default manual duration (seconds). */
const DEFAULT_MANUAL_DURATION = 10

/** Max cycle markers rendered (avoids O(n) when cycleCount is huge). */
const MAX_CYCLE_MARKERS = 10

/** Smallest visible extended zone (px) before showing the END label. */
const MIN_EXTENDED_PX_FOR_END_LABEL = 5

/**
 * Timeline global loop strip.
 *
 * @param {Object} props
 * @param {Object} [props.loopRegion] - `{ enabled, start, end }` (legacy).
 * @param {number} props.pixelsPerSecond
 * @param {(start: number, end: number) => void} [props.onSetLoopRegion]
 * @param {Function} [props.onClearLoop]
 * @param {Function} [props.onToggleLoop]
 * @param {(key: string, params?: Object) => string} props.tr
 * @param {number} props.totalDuration
 * @param {Object} [props.loopState] - `{ timeline: {...} }`.
 * @param {Function} [props.onOpenLoopPanel]
 * @param {Function} [props.onActivateManualClick]
 * @returns {JSX.Element}
 */
const TimelineLoop = memo(function TimelineLoop({
  loopRegion: _loopRegion,
  pixelsPerSecond,
  onSetLoopRegion,
  onClearLoop: _onClearLoop,
  onToggleLoop,
  tr,
  totalDuration,
  loopState = {},
  onOpenLoopPanel,
  onActivateManualClick: _onActivateManualClick,
}) {
  const [loopDrag, setLoopDrag] = useState(null)
  const containerRef = useRef(null)

  const timelineLoop = loopState?.timeline || {
    enabled: false,
    start: 0,
    end: DEFAULT_MANUAL_DURATION,
    color: DEFAULT_LOOP_COLOR,
    startMode: 'startZero',
    endMode: 'endOfTrack',
    durationMode: 'cycles',
    cycleCount: DEFAULT_CYCLE_COUNT,
    manualDuration: DEFAULT_MANUAL_DURATION,
    manualTime: DEFAULT_MANUAL_DURATION,
  }

  const hasLoop =
    timelineLoop.enabled && timelineLoop.end > timelineLoop.start + 0.01

  /**
   * Starts a "create loop" drag from the current cursor position.
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleLoopStripMouseDown = (e) => {
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
    setLoopDrag({ mode: 'create', anchor: time })

    const start = Math.min(time, totalDuration)
    const end = Math.min(time + 1, totalDuration)
    onSetLoopRegion?.(start, end)
  }

  /**
   * Starts a "resize handle" drag (either `start` or `end`).
   * @param {'start'|'end'} mode
   * @returns {(e: React.MouseEvent) => void}
   */
  const handleLoopHandleMouseDown = (mode) => (e) => {
    e.stopPropagation()
    const anchor =
      mode === 'start' ? timelineLoop.end : timelineLoop.start
    setLoopDrag({ mode, anchor })
  }

  // Global mouse listeners while dragging.
  useEffect(() => {
    if (!loopDrag) return

    const handleMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))

      if (loopDrag.mode === 'create') {
        const start = Math.min(loopDrag.anchor, time)
        const end = Math.max(loopDrag.anchor, time)
        onSetLoopRegion?.(start, end)
      } else if (loopDrag.mode === 'start') {
        if (time < timelineLoop.end) {
          onSetLoopRegion?.(time, timelineLoop.end)
        }
      } else if (loopDrag.mode === 'end') {
        if (time > timelineLoop.start) {
          onSetLoopRegion?.(timelineLoop.start, time)
        }
      }
    }

    const handleUp = () => setLoopDrag(null)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [
    loopDrag,
    onSetLoopRegion,
    pixelsPerSecond,
    totalDuration,
    timelineLoop.start,
    timelineLoop.end,
  ])

  const loopStart = timelineLoop.start ?? 0
  const loopEnd = timelineLoop.end ?? DEFAULT_MANUAL_DURATION
  const loopColor = timelineLoop.color ?? DEFAULT_LOOP_COLOR

  const loopStartPx = Math.max(0, loopStart * pixelsPerSecond)
  const loopWidthPx = Math.max(0, (loopEnd - loopStart) * pixelsPerSecond)
  const loopDuration = Math.max(0, loopEnd - loopStart)

  // Max loop duration depends on the current duration mode.
  let maxLoopDuration = loopDuration
  let durationLabel = ''
  const cycleCount = timelineLoop.cycleCount || DEFAULT_CYCLE_COUNT
  const manualDuration = timelineLoop.manualDuration || DEFAULT_MANUAL_DURATION

  if (timelineLoop.durationMode === 'cycles') {
    maxLoopDuration = loopDuration * cycleCount
    durationLabel = `${cycleCount}x`
  } else if (timelineLoop.durationMode === 'manualDuration') {
    maxLoopDuration = manualDuration
    durationLabel = `${manualDuration}s`
  } else if (timelineLoop.durationMode === 'manualTime') {
    maxLoopDuration = timelineLoop.manualTime || DEFAULT_MANUAL_DURATION
    durationLabel = `${timelineLoop.manualTime || DEFAULT_MANUAL_DURATION}s`
  }

  const loopEndTotalPx = Math.min(
    (loopStart + maxLoopDuration) * pixelsPerSecond,
    totalDuration * pixelsPerSecond
  )
  const loopEndZonePx = loopStartPx + loopWidthPx
  const extendedWidthPx = Math.max(0, loopEndTotalPx - loopEndZonePx)

  // ─── EMPTY STATE ────────────────────────────────────────────────
  if (!hasLoop) {
    return (
      <div
        ref={containerRef}
        className="loop-strip"
        onMouseDown={handleLoopStripMouseDown}
        onDoubleClick={() => onOpenLoopPanel?.()}
        style={{
          position: 'sticky',
          top: 36,
          height: 10,
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
          zIndex: 5,
          cursor: 'text',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          color: 'var(--text-tertiary)',
          opacity: 0.5,
        }}
      >
        <i className="ti ti-repeat" style={{ marginRight: 4 }} />
        {tr('clickToDefineLoop') || 'Click to define a global loop'}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenLoopPanel?.()
          }}
          style={{
            marginLeft: 8,
            padding: '1px 8px',
            fontSize: 8,
            border: '1px solid var(--border)',
            borderRadius: 3,
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <i className="ti ti-settings" /> {tr('settings') || 'Settings'}
        </button>
      </div>
    )
  }

  // ─── ACTIVE STATE ───────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: 'sticky',
        top: 36,
        height: 10,
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)',
        zIndex: 5,
        cursor: 'text',
      }}
    >
      {/* Loop zone */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: loopStartPx,
          width: loopWidthPx,
          background: loopColor,
          opacity: 0.3,
          cursor: 'pointer',
          borderLeft: `2px solid ${loopColor}`,
          borderRight: `2px solid ${loopColor}`,
        }}
        onDoubleClick={() => onOpenLoopPanel?.()}
        title={
          tr('doubleClickToEditLoop') || 'Double-click to edit the loop'
        }
      />

      {/* Extended zone (diagonal stripes = extra cycles) */}
      {extendedWidthPx > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: loopEndZonePx,
            width: extendedWidthPx,
            pointerEvents: 'none',
            zIndex: 4,
            overflow: 'hidden',
            opacity: 0.5,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `repeating-linear-gradient(45deg, ${loopColor} 0px, ${loopColor} 2px, transparent 2px, transparent 8px)`,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 7,
              fontWeight: 700,
              color: loopColor,
              textShadow:
                '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
              opacity: 0.8,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {durationLabel}
          </div>
        </div>
      )}

      {/* Start marker [` with ▼ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: loopStartPx - 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: loopColor,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 900,
              opacity: 0.7,
              lineHeight: 1,
              marginBottom: 1,
            }}
          >
            ▼
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              opacity: 0.9,
              textShadow: `0 0 10px ${loopColor}40`,
              lineHeight: 1,
            }}
          >
            [
          </span>
        </div>
      </div>

      {/* End marker ]` with ▼ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: loopEndZonePx - 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: loopColor,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 900,
              opacity: 0.7,
              lineHeight: 1,
              marginBottom: 1,
            }}
          >
            ▼
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              opacity: 0.9,
              textShadow: `0 0 10px ${loopColor}40`,
              lineHeight: 1,
            }}
          >
            ]
          </span>
        </div>
      </div>

      {/* END label at extended end */}
      {extendedWidthPx > MIN_EXTENDED_PX_FOR_END_LABEL && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            bottom: -4,
            left: loopEndTotalPx,
            width: 2,
            background: loopColor,
            opacity: 0.8,
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: `0 0 12px ${loopColor}60`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 7,
              fontWeight: 700,
              color: 'white',
              background: `linear-gradient(135deg, ${loopColor}, ${loopColor}dd)`,
              padding: '1px 6px',
              borderRadius: 3,
              border: `1px solid ${loopColor}`,
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              opacity: 0.9,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              letterSpacing: '0.5px',
            }}
          >
            {tr('editorClipLoopEnd') || 'END'}
          </div>
        </div>
      )}

      {/* Cycle markers (dashed vertical lines) */}
      {timelineLoop.durationMode === 'cycles' &&
        cycleCount > 1 &&
        Array.from({
          length: Math.min(cycleCount - 1, MAX_CYCLE_MARKERS),
        }).map((_, i) => {
          const cycleNumber = i + 1
          const cyclePosition =
            loopStartPx + (loopWidthPx / cycleCount) * cycleNumber
          if (cyclePosition >= loopEndTotalPx) return null

          return (
            <div
              key={`cycle-marker-${cycleNumber}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: cyclePosition,
                width: 1,
                background: loopColor,
                zIndex: 3,
                opacity: 0.3,
                pointerEvents: 'none',
                borderLeft: `1px dashed ${loopColor}50`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 6,
                  color: loopColor,
                  opacity: 0.5,
                  fontFamily: 'monospace',
                  background: 'var(--bg-tertiary)',
                  padding: '0 2px',
                }}
              >
                {cycleNumber + 1}
              </div>
            </div>
          )
        })}

      {/* Loop summary label */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 7,
          color: loopColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <i className="ti ti-repeat" style={{ fontSize: 8 }} />
        <span>{tr('editorClipLoop') || 'LOOP'}</span>
        <span style={{ fontWeight: 400, opacity: 0.6 }}>
          {loopStart.toFixed(1)}s → {loopEnd.toFixed(1)}s
        </span>
        <span
          style={{ fontWeight: 400, opacity: 0.4, fontFamily: 'monospace' }}
        >
          ({(loopEnd - loopStart).toFixed(1)}s)
        </span>
        {timelineLoop.durationMode === 'cycles' && cycleCount > 1 && (
          <span
            style={{
              fontWeight: 400,
              opacity: 0.5,
              fontFamily: 'monospace',
              fontSize: 6,
              background: `${loopColor}30`,
              padding: '0 4px',
              borderRadius: 2,
            }}
          >
            {cycleCount}x
          </span>
        )}
        {timelineLoop.durationMode === 'manualDuration' && (
          <span
            style={{
              fontWeight: 400,
              opacity: 0.5,
              fontFamily: 'monospace',
              fontSize: 6,
              background: `${loopColor}30`,
              padding: '0 4px',
              borderRadius: 2,
            }}
          >
            {manualDuration}s
          </span>
        )}
        {extendedWidthPx > 0 && (
          <span
            style={{
              fontWeight: 400,
              opacity: 0.4,
              fontFamily: 'monospace',
              fontSize: 6,
              color: loopColor,
            }}
          >
            +{(maxLoopDuration - loopDuration).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Start handle */}
      <div
        onMouseDown={handleLoopHandleMouseDown('start')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopStartPx - 3,
          width: 6,
          cursor: 'ew-resize',
          zIndex: 7,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 2,
            height: '100%',
            background: loopColor,
            opacity: 0.8,
            borderRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -6,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: loopColor,
            border: '1px solid var(--bg-primary)',
            boxShadow: '0 0 8px rgba(0,0,0,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            fontSize: 6,
            color: loopColor,
            opacity: 0.5,
            fontFamily: 'monospace',
          }}
        >
          ◀
        </div>
      </div>

      {/* End handle */}
      <div
        onMouseDown={handleLoopHandleMouseDown('end')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopEndZonePx - 3,
          width: 6,
          cursor: 'ew-resize',
          zIndex: 7,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 2,
            height: '100%',
            background: loopColor,
            opacity: 0.8,
            borderRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: loopColor,
            border: '1px solid var(--bg-primary)',
            boxShadow: '0 0 8px rgba(0,0,0,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            fontSize: 6,
            color: loopColor,
            opacity: 0.5,
            fontFamily: 'monospace',
          }}
        >
          ▶
        </div>
      </div>

      {/* Settings button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onOpenLoopPanel?.()
        }}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '1px 6px',
          fontSize: 8,
          border: '1px solid var(--border)',
          borderRadius: 3,
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          zIndex: 8,
        }}
        title={tr('editLoopSettings') || 'Edit loop settings'}
      >
        <i className="ti ti-settings" />
      </button>

      {/* Toggle button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleLoop?.()
        }}
        style={{
          position: 'absolute',
          right: 28,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '1px 6px',
          fontSize: 7,
          border: '1px solid var(--border)',
          borderRadius: 3,
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          cursor: 'pointer',
          zIndex: 8,
          fontWeight: 600,
        }}
        title={tr('toggleLoop') || 'Toggle loop'}
      >
        {timelineLoop.enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
})

TimelineLoop.displayName = 'TimelineLoop'

export default TimelineLoop