// src/features/editor/components/Clip/ClipFadeHandles.jsx
import React, { memo } from 'react'

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
        onMouseDown={(e) => {
          e.stopPropagation()
          // Logique de drag pour le fade in
          const startFade = clip.fadeIn || 0
          const onMouseMove = (e2) => {
            const rect = e.currentTarget.parentElement.getBoundingClientRect()
            const x = e2.clientX - rect.left
            const duration = Math.max(0, x / pixelsPerSecond)
            onFade?.(clip.id, 'in', duration)
          }
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
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
        onMouseDown={(e) => {
          e.stopPropagation()
          // Logique de drag pour le fade out
          const onMouseMove = (e2) => {
            const rect = e.currentTarget.parentElement.getBoundingClientRect()
            const x = rect.right - e2.clientX
            const duration = Math.max(0, x / pixelsPerSecond)
            onFade?.(clip.id, 'out', duration)
          }
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
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