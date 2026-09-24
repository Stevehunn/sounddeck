// src/features/editor/components/Timeline/TimelineLoopMarkers.jsx
import { memo } from 'react'

/**
 * Rend les marqueurs visuels des boucles de clips :
 *  - marqueur de fin de boucle (avec label FIN + count cycles)
 *  - marqueurs de cycles intermédiaires si mode "cycles"
 */
const TimelineLoopMarkers = memo(function TimelineLoopMarkers({
  clipIndex,
  loopState,
  totalDuration,
  pixelsPerSecond,
  tr,
}) {
  if (!loopState?.clips) return null

  const markers = []
  const loops = loopState.clips

  for (const clipId in loops) {
    const loopData = loops[clipId]
    if (!loopData?.enabled) continue

    const entry = clipIndex.get(clipId)
    if (!entry) continue

    const { start: clipStart, duration: clipDuration } = entry
    const clipEnd = clipStart + clipDuration
    const loopEnd = loopData.end || totalDuration
    const loopEndPosition = Math.min(loopEnd, totalDuration) * pixelsPerSecond
    const loopColor = loopData.arrowColor || '#22c55e'
    const loopMode = loopData.loopMode || 'endOfTrack'
    const totalCycles = loopData.totalCycles || loopData.cycleCount || 1

    // Marqueur de fin de boucle
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

    // Cycles intermédiaires
    if (loopMode === 'cycles' && totalCycles > 1) {
      let cycleEnd = clipEnd
      for (let i = 1; i < totalCycles; i++) {
        cycleEnd += clipDuration
        const position = cycleEnd * pixelsPerSecond
        if (position >= loopEndPosition) break

        markers.push(
          <div
            key={`cycle-${clipId}-${i}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: position,
              width: 1,
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

  return <>{markers}</>
})

export default TimelineLoopMarkers