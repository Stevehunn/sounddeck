import { useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'

export default function EditorClip({
  clip,
  index,
  totalDuration,
  pixelsPerSecond,
  trackHeight,
  isSelected,
  isPlaying,
  waveformData,
  clipDuration,
  onSelect,
  onMove,
  onUpdate,
  onRemove,
  onDuplicate,
  onCopy,
  onCut,
  onDragStart,
  onFadeInChange,
  onFadeOutChange,
  onDragCheckpoint,
  onWaveformUpdate,
  tr
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeSide, setResizeSide] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const [fadeDrag, setFadeDrag] = useState(null)
  const [liveFadeIn, setLiveFadeIn] = useState(null)
  const [liveFadeOut, setLiveFadeOut] = useState(null)
  const dragValueRef = useRef(0)
  const clipRef = useRef(null)
  
  // REFS POUR LE DRAG
  const hasDraggedRef = useRef(false)
  const mouseDownPosRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  
  // REFS POUR LE DOUBLE-CLIC
  const lastClickTimeRef = useRef(0)
  const clickTimerRef = useRef(null)
  const isDoubleClickRef = useRef(false)
  
  // Lecture preview
  const [isClipPlaying, setIsClipPlaying] = useState(false)
  const [playbackHowl, setPlaybackHowl] = useState(null)

  const duration = clipDuration || clip.duration || 3
  const left = clip.start * pixelsPerSecond
  const width = Math.max(duration * pixelsPerSecond, 10)

  const hue = (index * 30 + 200) % 360
  const color = `hsl(${hue}, 70%, 50%)`

  const fadeInEffect = clip.effects?.find(e => e.type === 'fadeIn')
  const fadeOutEffect = clip.effects?.find(e => e.type === 'fadeOut')
  const fadeInDuration = liveFadeIn != null ? liveFadeIn : (fadeInEffect?.enabled ? (fadeInEffect.params?.duration || 0) : 0)
  const fadeOutDuration = liveFadeOut != null ? liveFadeOut : (fadeOutEffect?.enabled ? (fadeOutEffect.params?.duration || 0) : 0)
  const maxFade = duration / 2

  // Nettoyage du playback
  useEffect(() => {
    return () => {
      if (playbackHowl) {
        playbackHowl.stop()
        playbackHowl.unload()
        setPlaybackHowl(null)
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
    }
  }, [playbackHowl])

  // Regénérer le waveform quand le clip est modifié
  useEffect(() => {
    if (clip.path && onWaveformUpdate) {
      const timer = setTimeout(() => {
        onWaveformUpdate(clip.id, clip.path, clip.offset || 0, clip.duration || null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [clip.path, clip.duration, clip.offset, clip.id, onWaveformUpdate])

  const handleFadeMouseDown = (e, edge) => {
    e.stopPropagation()
    const current = edge === 'in' ? fadeInDuration : fadeOutDuration
    dragValueRef.current = current
    setFadeDrag({ edge, startX: e.clientX, startDuration: current })
  }

  useEffect(() => {
    if (!fadeDrag) return

    const handleMove = (e) => {
      const deltaSeconds = (e.clientX - fadeDrag.startX) / pixelsPerSecond
      const raw = fadeDrag.edge === 'in'
        ? fadeDrag.startDuration + deltaSeconds
        : fadeDrag.startDuration - deltaSeconds
      const clamped = Math.max(0, Math.min(maxFade, raw))
      dragValueRef.current = clamped
      if (fadeDrag.edge === 'in') setLiveFadeIn(clamped)
      else setLiveFadeOut(clamped)
    }

    const handleUp = () => {
      if (fadeDrag.edge === 'in') {
        onFadeInChange?.(dragValueRef.current)
        setLiveFadeIn(null)
      } else {
        onFadeOutChange?.(dragValueRef.current)
        setLiveFadeOut(null)
      }
      setFadeDrag(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [fadeDrag, pixelsPerSecond, maxFade, onFadeInChange, onFadeOutChange])

  // Lecture preview - via bouton
  const playClipPreview = (e) => {
    if (e) e.stopPropagation()
    
    if (playbackHowl && isClipPlaying) {
      playbackHowl.stop()
      playbackHowl.unload()
      setPlaybackHowl(null)
      setIsClipPlaying(false)
      return
    }

    try {
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')
      
      const howl = new Howl({
        src: [fileUrl],
        volume: 0.5,
        html5: true,
        onend: () => {
          setIsClipPlaying(false)
          setPlaybackHowl(null)
        },
        onstop: () => {
          setIsClipPlaying(false)
          setPlaybackHowl(null)
        }
      })
      
      setPlaybackHowl(howl)
      setIsClipPlaying(true)
      howl.play()
    } catch (e) {
      console.warn('Erreur lecture preview:', e)
    }
  }

  // ACTION DU DOUBLE-CLIC
  const handleDoubleClickAction = (e) => {
    if (e) e.stopPropagation()
    
    // Vérifier qu'on n'a pas déjà un son en cours de lecture
    if (playbackHowl && isClipPlaying) {
      playbackHowl.stop()
      playbackHowl.unload()
      setPlaybackHowl(null)
      setIsClipPlaying(false)
      return
    }
    
    // Jouer le clip
    playClipPreview(e)
  }

  // GESTION DU CLIC MANUEL
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('.clip-actions')) {
      return
    }

    // Réinitialiser le timer de double-clic
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }

    mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
    hasDraggedRef.current = false
    isDraggingRef.current = true
    
    onDragCheckpoint?.()
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragStartY(e.clientY)
    
    // Sélectionner le clip
    onSelect()
    
    // Enregistrer le temps du clic
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    
    // Si le dernier clic était il y a moins de 300ms, c'est un double-clic
    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      lastClickTimeRef.current = 0
      isDoubleClickRef.current = true
      
      // Exécuter l'action du double-clic immédiatement
      handleDoubleClickAction(e)
      return
    }
    
    // Premier clic ou clic après le délai
    lastClickTimeRef.current = now
    isDoubleClickRef.current = false
    
    // Démarrer un timer pour réinitialiser après 300ms
    clickTimerRef.current = setTimeout(() => {
      lastClickTimeRef.current = 0
      isDoubleClickRef.current = false
      clickTimerRef.current = null
    }, 300)
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return

    const dx = Math.abs(e.clientX - mouseDownPosRef.current.x)
    const dy = Math.abs(e.clientY - mouseDownPosRef.current.y)
    
    // Si on a dragué et que c'était un double-clic, on annule le drag
    if (isDoubleClickRef.current) {
      setIsDragging(false)
      isDraggingRef.current = false
      return
    }
    
    if (dx > 5 || dy > 5) {
      hasDraggedRef.current = true
      // Si on a commencé à draguer, annuler le double-clic
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
        lastClickTimeRef.current = 0
        isDoubleClickRef.current = false
      }
    }

    const deltaX = e.clientX - dragStartX
    const deltaSeconds = deltaX / pixelsPerSecond
    const newStart = Math.max(0, clip.start + deltaSeconds)

    onMove(newStart)
    setDragStartX(e.clientX)
    setDragStartY(e.clientY)
  }

  const handleMouseUp = (e) => {
    setIsDragging(false)
    isDraggingRef.current = false
    
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
    }
  }

  const handleResizeStart = (e, side) => {
    e.stopPropagation()
    onDragCheckpoint?.()
    setIsResizing(true)
    setResizeSide(side)
    setDragStartX(e.clientX)
  }

  const handleResizeMove = (e) => {
    if (!isResizing) return

    const deltaX = e.clientX - dragStartX
    const deltaSeconds = deltaX / pixelsPerSecond

    if (resizeSide === 'end') {
      const newDuration = Math.max(0.5, duration + deltaSeconds)
      onUpdate({ duration: newDuration })
    } else if (resizeSide === 'start') {
      const newStart = Math.max(0, clip.start + deltaSeconds)
      const newDuration = duration - deltaSeconds
      if (newDuration >= 0.5) {
        onUpdate({ start: newStart, duration: newDuration })
      }
    }

    setDragStartX(e.clientX)
  }

  const handleResizeUp = () => {
    setIsResizing(false)
    setResizeSide(null)
  }

  // Effets pour les événements globaux
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Effets pour le resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeUp)
    }
  }, [isResizing])

  const effectBadges = clip.effects?.filter(e => e.enabled).map(e => e.type) || []
  const showDuration = duration > 5
  const hasActiveEffects = clip.effects?.some(e => e.enabled) || false

  return (
    <div
      ref={clipRef}
      style={{
        position: 'absolute',
        left: left,
        top: 4,
        width: width,
        height: trackHeight,
        background: isSelected ? color : 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${isSelected ? color : 'var(--border)'}`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging || isResizing ? 'none' : 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 20px ${color}44` : 'none',
        zIndex: isSelected ? 3 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: isDragging ? 'none' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Waveform */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        opacity: 0.6,
        pointerEvents: 'none'
      }}>
        {waveformData && waveformData.length > 0 ? (
          waveformData.map((value, i) => {
            const barHeight = Math.max(2, value * trackHeight * 0.8)
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: barHeight,
                  minWidth: 1,
                  background: isSelected ? 'white' : 'var(--text-secondary)',
                  borderRadius: 1,
                  opacity: 0.7,
                  marginRight: 0.5
                }}
              />
            )
          })
        ) : (
          <div style={{
            width: '100%',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-music" style={{ fontSize: 14 }} />
          </div>
        )}
      </div>

      {/* Badge effets actifs */}
      {hasActiveEffects && (
        <div style={{
          position: 'absolute',
          top: 2,
          left: 4,
          fontSize: 7,
          padding: '1px 4px',
          borderRadius: 2,
          background: 'rgba(124,111,247,0.8)',
          color: 'white',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <i className="ti ti-wand" style={{ fontSize: 8 }} /> Effets
        </div>
      )}

      {/* Nom du clip */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 6,
        right: 6,
        fontSize: 9,
        fontWeight: 600,
        color: isSelected ? 'white' : 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
        zIndex: 2,
        pointerEvents: 'none'
      }}>
        {clip.name}
        {showDuration && (
          <span style={{ marginLeft: 4, opacity: 0.7 }}>
            ({Math.round(duration)}s)
          </span>
        )}
      </div>

      {/* Badges d'effets */}
      {effectBadges.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 4,
          display: 'flex',
          gap: 2,
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          {effectBadges.slice(0, 3).map(type => (
            <span key={type} style={{
              fontSize: 7,
              padding: '0 4px',
              borderRadius: 2,
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              textTransform: 'uppercase'
            }}>
              {type.slice(0, 3)}
            </span>
          ))}
        </div>
      )}

      {/* Indicateur de lecture du projet */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'var(--accent)',
          zIndex: 4,
          animation: 'pulse 0.8s ease-in-out infinite'
        }} />
      )}

      {/* Indicateur de preview en cours avec bouton Pause */}
      {isClipPlaying && (
        <div 
          className="clip-playing-indicator"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 7,
            pointerEvents: 'none',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <i className="ti ti-player-pause" style={{ color: 'white', fontSize: 20 }} />
        </div>
      )}

      {/* Poignées de fade */}
      {(isHovered || isSelected || fadeDrag) && (
        <>
          <div
            onMouseDown={(e) => handleFadeMouseDown(e, 'in')}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: `0 0 ${Math.min(trackHeight, Math.max(10, fadeInDuration * pixelsPerSecond))}px ${Math.min(width / 2, Math.max(10, fadeInDuration * pixelsPerSecond))}px`,
              borderColor: 'transparent transparent rgba(0,0,0,0.4) transparent',
              cursor: 'ew-resize',
              zIndex: 5,
              transition: fadeDrag ? 'none' : 'border-width 0.1s ease'
            }}
            title={tr('editorFadeIn')}
          />
          <div
            onMouseDown={(e) => handleFadeMouseDown(e, 'out')}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: `0 ${Math.min(width / 2, Math.max(10, fadeOutDuration * pixelsPerSecond))}px ${Math.min(trackHeight, Math.max(10, fadeOutDuration * pixelsPerSecond))}px 0`,
              borderColor: 'transparent rgba(0,0,0,0.4) transparent transparent',
              cursor: 'ew-resize',
              zIndex: 5,
              transition: fadeDrag ? 'none' : 'border-width 0.1s ease'
            }}
            title={tr('editorFadeOut')}
          />
        </>
      )}

      {/* Poignées de resize */}
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              left: -3,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'ew-resize',
              zIndex: 5
            }}
            onMouseDown={(e) => handleResizeStart(e, 'start')}
          />
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'ew-resize',
              zIndex: 5
            }}
            onMouseDown={(e) => handleResizeStart(e, 'end')}
          />
        </>
      )}

      {/* Actions contextuelles - avec bouton Play/Pause */}
      <div className="clip-actions" style={{
        position: 'absolute',
        top: 2,
        right: 4,
        display: isSelected ? 'flex' : 'none',
        gap: 2,
        zIndex: 6,
        flexWrap: 'wrap'
      }}>
        {/* Bouton Play/Pause */}
        <button
          onClick={(e) => { e.stopPropagation(); playClipPreview(e) }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: isClipPlaying ? 'rgba(239,159,39,0.8)' : 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer',
            minWidth: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isClipPlaying ? tr('editorStopPreview') : tr('editorListenClip')}
        >
          <i className={`ti ${isClipPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onCopy?.(clip.id) }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorCopy') || 'Copier (Ctrl+C)'}
        >
          <i className="ti ti-copy" />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); onCut?.(clip.id) }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(224,82,82,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorCut') || 'Couper (Ctrl+X)'}
        >
          <i className="ti ti-scissors" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(29,158,117,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorDuplicateClip')}
        >
          <i className="ti ti-copy" style={{ transform: 'scaleX(-1)' }} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(224,82,82,0.8)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorRemoveClip') || 'Supprimer (Delete)'}
        >
          <i className="ti ti-trash" />
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}