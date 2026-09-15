// src/features/editor/components/Clip/ClipFadeHandles.jsx
import React, { memo } from 'react'

const THROTTLE_MS = 33 // ~30fps, évite de saturer React pendant le drag

/**
 * Démarre un drag de fade (in ou out).
 * Throttle les appels à onFade via requestAnimationFrame + limite à ~30fps.
 * Garantit un flush final au mouseup pour capturer la valeur exacte.
 */
function startFadeDrag(e, edge, parentEl, clipId, pixelsPerSecond, onFade) {
  e.stopPropagation()
  if (!parentEl) return

  let latestValue = null
  let rafId = null
  let lastFlush = 0

  const flush = () => {
    rafId = null
    if (latestValue === null) return
    const now = performance.now()
    if (now - lastFlush < THROTTLE_MS) {
      rafId = requestAnimationFrame(flush)
      return
    }
    lastFlush = now
    onFade?.(clipId, edge, latestValue)
    latestValue = null
  }

  const onMouseMove = (e2) => {
    const rect = parentEl.getBoundingClientRect()
    const x = edge === 'in'
      ? e2.clientX - rect.left
      : rect.right - e2.clientX
    latestValue = Math.max(0, x / pixelsPerSecond)
    if (rafId === null) {
      rafId = requestAnimationFrame(flush)
    }
  }

  const onMouseUp = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    // Flush final : capture la dernière valeur exacte
    if (latestValue !== null) {
      onFade?.(clipId, edge, latestValue)
      latestValue = null
    }
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const ClipFadeHandles = memo(({
  clip,
  trackId,
  isSelected,
  isHovering,
  onFade,
  pixelsPerSecond
}) => {
  const hasFadeIn = clip.fadeIn && clip.fadeIn > 0
  const hasFadeOut = clip.fadeOut && clip.fadeOut > 0
  const visible = isSelected || isHovering

  if (!visible) return null

  return (
    <>
      {/* Fade In */}
      {hasFadeIn && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: clip.fadeIn * pixelsPerSecond,
            height: '100%',
            background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      )}

      {/* Fade Out */}
      {hasFadeOut && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: clip.fadeOut * pixelsPerSecond,
            height: '100%',
            background: 'linear-gradient(to left, rgba(0,0,0,0.3), transparent)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      )}

      {/* Poignée de Fade In (survol) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 8,
          height: '100%',
          cursor: 'ew-resize',
          zIndex: 5,
          opacity: isHovering ? 0.6 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: isHovering ? 'auto' : 'none'
        }}
        onMouseDown={(e) =>
          startFadeDrag(e, 'in', e.currentTarget.parentElement, clip.id, pixelsPerSecond, onFade)
        }
      >
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 2,
          height: 20,
          background: 'var(--accent)',
          borderRadius: 1,
          opacity: 0.5
        }} />
      </div>

      {/* Poignée de Fade Out (survol) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 8,
          height: '100%',
          cursor: 'ew-resize',
          zIndex: 5,
          opacity: isHovering ? 0.6 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: isHovering ? 'auto' : 'none'
        }}
        onMouseDown={(e) =>
          startFadeDrag(e, 'out', e.currentTarget.parentElement, clip.id, pixelsPerSecond, onFade)
        }
      >
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 2,
          height: 20,
          background: 'var(--accent)',
          borderRadius: 1,
          opacity: 0.5
        }} />
      </div>
    </>
  )
})

ClipFadeHandles.displayName = 'ClipFadeHandles'

export default ClipFadeHandles