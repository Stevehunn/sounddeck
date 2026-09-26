// src/shared/components/ui/TutorialOverlay.jsx
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@core/i18n/LanguageContext';
import { setItem } from '@shared/utils/appStorage'
import { logError } from '@shared/utils/logger'

// ─── CONSTANTES ─────────────────────────────────────────────────────────────

const VIEWPORT_PADDING = 16
const BUBBLE_GAP = 20
const MIN_BUBBLE_WIDTH = 300
const MIN_BUBBLE_HEIGHT = 200
const PREFERRED_BUBBLE_WIDTH = 400
const PREFERRED_BUBBLE_HEIGHT = 340
const FOOTER_RESERVED = 60

//  Seuil au-delà duquel on considère la zone "trop grande"
const BIG_ZONE_RATIO = 0.6

// ─── UTILS ──────────────────────────────────────────────────────────────────

function clamp(v, min, max) {
  return Math.max(min, Math.min(v, max))
}

function getViewport() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  return {
    vw: vv?.width ?? window.innerWidth,
    vh: vv?.height ?? window.innerHeight,
  }
}

function findElement(selector, fallbackSelector) {
  const tryGet = (s) => {
    if (typeof s === 'function') {
      try {
        const r = s()
        if (r && (r.offsetParent !== null || r.getClientRects().length > 0)) return r
      } catch (e) {}
      return null
    }
    if (typeof s === 'string') {
      try {
        const el = document.querySelector(s)
        if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) return el
      } catch (e) {}
      return null
    }
    return null
  }
  return tryGet(selector) || tryGet(fallbackSelector)
}

/**
 * Clampe un rect au viewport visible.
 * Garantit que la zone de highlight ne dépasse jamais de l'écran.
 */
function clampRectToViewport(rect) {
  const { vw, vh } = getViewport()
  const p = VIEWPORT_PADDING

  const top = Math.max(p, Math.min(vh - p, rect.top))
  const bottom = Math.max(p, Math.min(vh - p, rect.bottom))
  const left = Math.max(p, Math.min(vw - p, rect.left))
  const right = Math.max(p, Math.min(vw - p, rect.right))

  const width = Math.max(0, right - left)
  const height = Math.max(0, bottom - top)

  return {
    top,
    left,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    bottom,
    right,
  }
}

function getElementRect(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    centerX: r.left + r.width / 2,
    centerY: r.top + r.height / 2,
    bottom: r.bottom,
    right: r.right,
  }
}

function scrollToElement(el) {
  if (!el) return
  try {
    const r = el.getBoundingClientRect()
    const isVisible = r.top >= 0 && r.bottom <= window.innerHeight
    if (!isVisible) {
      el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' })
    }
  } catch (e) {}
}

// ─── LAYOUT ─────────────────────────────────────────────────────────────────

function computeBubbleLayout(targetRect, forcedPosition) {
  const { vw, vh } = getViewport()
  const p = VIEWPORT_PADDING
  const g = BUBBLE_GAP

  const spaces = {
    right:  vw - targetRect.right - g - p,
    left:   targetRect.left - g - p,
    bottom: vh - targetRect.bottom - g - p,
    top:    targetRect.top - g - p,
  }

  const prefW = Math.min(PREFERRED_BUBBLE_WIDTH, vw - 2 * p)
  const prefH = Math.min(PREFERRED_BUBBLE_HEIGHT, vh - 2 * p)

  const fits = {
    right:  spaces.right  >= MIN_BUBBLE_WIDTH,
    left:   spaces.left   >= MIN_BUBBLE_WIDTH,
    bottom: spaces.bottom >= MIN_BUBBLE_HEIGHT,
    top:    spaces.top    >= MIN_BUBBLE_HEIGHT,
  }

  let dir = null

  if (forcedPosition && fits[forcedPosition]) {
    dir = forcedPosition
  }

  if (!dir) {
    let best = null
    let bestSpace = -1
    for (const d of ['right', 'left', 'bottom', 'top']) {
      if (fits[d] && spaces[d] > bestSpace) {
        bestSpace = spaces[d]
        best = d
      }
    }
    if (best) dir = best
  }

  if (!dir) {
    let best = null
    let bestSpace = -1
    for (const d of ['right', 'left', 'bottom', 'top']) {
      if (spaces[d] > bestSpace) {
        bestSpace = spaces[d]
        best = d
      }
    }
    dir = best || 'bottom'
  }

  const available = spaces[dir]

  let bw, bh

  if (dir === 'right' || dir === 'left') {
    bw = Math.min(prefW, Math.max(available, MIN_BUBBLE_WIDTH))
    bh = Math.min(prefH, vh - 2 * p)
  } else {
    bw = prefW
    bh = Math.min(prefH, Math.max(available, MIN_BUBBLE_HEIGHT))
  }

  bw = Math.min(bw, vw - 2 * p)
  bh = Math.min(bh, vh - 2 * p)

  let top, left, arrow

  if (dir === 'right') {
    top = clamp(targetRect.centerY - bh / 2, p, vh - bh - p)
    left = targetRect.right + g
    arrow = 'left'
  } else if (dir === 'left') {
    top = clamp(targetRect.centerY - bh / 2, p, vh - bh - p)
    left = targetRect.left - bw - g
    arrow = 'right'
  } else if (dir === 'bottom') {
    top = targetRect.bottom + g
    left = clamp(targetRect.centerX - bw / 2, p, vw - bw - p)
    arrow = 'top'
  } else {
    top = targetRect.top - bh - g
    left = clamp(targetRect.centerX - bw / 2, p, vw - bw - p)
    arrow = 'bottom'
  }

  top = clamp(top, p, vh - bh - p)
  left = clamp(left, p, vw - bw - p)

  return { top, left, width: bw, height: bh, arrow, direction: dir }
}

function computeArrowOffset(layout, targetRect) {
  const { top, left, width, height, arrow } = layout
  const MIN_MARGIN = 24

  if (arrow === 'top' || arrow === 'bottom') {
    const rel = targetRect.centerX - left
    return { x: clamp(rel, MIN_MARGIN, width - MIN_MARGIN), y: null }
  }
  if (arrow === 'left' || arrow === 'right') {
    const rel = targetRect.centerY - top
    return { x: null, y: clamp(rel, MIN_MARGIN, height - MIN_MARGIN) }
  }
  return { x: null, y: null }
}

// ─── COMPOSANT ──────────────────────────────────────────────────────────────

export default function TutorialOverlay({
  steps,
  currentStep,
  onNext,
  onSkip,
  onComplete,
  isOpen,
  pageId = '',
}) {
  const { t } = useLanguage()

  const [layout, setLayout] = useState(null)
  const [targetRect, setTargetRect] = useState(null)
  const [arrowPos, setArrowPos] = useState({ x: null, y: null })
  const [isExecutingAction, setIsExecutingAction] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)

  const bubbleRef = useRef(null)
  const bodyRef = useRef(null)
  const rafRef = useRef(null)
  const lastAdvanceTimeRef = useRef(0)
  const actionTimeoutRef = useRef(null)
  const layoutReadyStepRef = useRef(-1)
  const correctedForStepRef = useRef(-1)
  const onShowCalledRef = useRef(-1)

  const stepData = steps[currentStep] || steps[0]
  const isLastStep = currentStep === steps.length - 1

  // ─── Reset à chaque changement d'étape ───────────────────────────────────
  useEffect(() => {
    setLayout(null)
    setTargetRect(null)
    setArrowPos({ x: null, y: null })
    setIsExecutingAction(false)
    setIsScrollable(false)
    setIsScrolledToBottom(false)
    layoutReadyStepRef.current = -1
    correctedForStepRef.current = -1
    onShowCalledRef.current = -1
  }, [currentStep])

  // ─── Cleanup timeout ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current)
    }
  }, [])

  // ─── Détection du scroll interne de la bulle ─────────────────────────────
  const checkScrollable = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    const hasScroll = body.scrollHeight > body.clientHeight + 2
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4
    setIsScrollable(hasScroll)
    setIsScrolledToBottom(atBottom)
  }, [])

  useLayoutEffect(() => {
    if (!layout) return
    const timer = setTimeout(checkScrollable, 50)
    return () => clearTimeout(timer)
  }, [layout, checkScrollable])

  // ─── Calcul et mise à jour de la position ────────────────────────────────
  const updateTarget = useCallback(() => {
    const data = steps[currentStep] || steps[0]
    const { vw, vh } = getViewport()

    const centerFallbackLayout = () => {
      const bw = Math.min(PREFERRED_BUBBLE_WIDTH, vw - 2 * VIEWPORT_PADDING)
      const bh = Math.min(PREFERRED_BUBBLE_HEIGHT, vh - 2 * VIEWPORT_PADDING)
      setLayout({
        top: (vh - bh) / 2,
        left: (vw - bw) / 2,
        width: bw,
        height: bh,
        arrow: null,
        direction: 'center',
      })
      setTargetRect(null)
      setArrowPos({ x: null, y: null })
      layoutReadyStepRef.current = currentStep
    }

    // Pas de target → bulle centrée
    if (!data?.target) {
      centerFallbackLayout()
      return
    }

    const el = findElement(data.target, data.fallbackTarget)

    if (!el) {
      centerFallbackLayout()
      return
    }

    scrollToElement(el)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rawRect = getElementRect(el)
        if (!rawRect) {
          centerFallbackLayout()
          return
        }

        // On clampe au viewport (highlight ne déborde plus)
        const rect = clampRectToViewport(rawRect)

        // Détection "zone trop grande" → bulle ancrée en bas de l'écran
        const isBigZone =
          rect.height > vh * BIG_ZONE_RATIO ||
          rect.width > vw * BIG_ZONE_RATIO

        if (isBigZone) {
          const bw = Math.min(PREFERRED_BUBBLE_WIDTH, vw - 2 * VIEWPORT_PADDING)
          const bh = Math.min(
            PREFERRED_BUBBLE_HEIGHT,
            vh - 2 * VIEWPORT_PADDING
          )
          setLayout({
            top: vh - bh - VIEWPORT_PADDING,
            left: (vw - bw) / 2,
            width: bw,
            height: bh,
            arrow: null,
            direction: 'bottom-fixed',
          })
          setTargetRect(rect)
          setArrowPos({ x: null, y: null })
          layoutReadyStepRef.current = currentStep
          return
        }

        // Comportement classique pour les zones raisonnables
        const newLayout = computeBubbleLayout(rect, data.position)
        const offset = computeArrowOffset(newLayout, rect)

        setLayout(newLayout)
        setTargetRect(rect)
        setArrowPos(offset)
        layoutReadyStepRef.current = currentStep
      })
    })
  }, [currentStep, steps])

  // ─── Déclenchement après changement d'étape ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(updateTarget, 100)
    return () => clearTimeout(timer)
  }, [isOpen, currentStep, updateTarget])

  // ─── Reposition au resize / scroll ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateTarget)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isOpen, updateTarget])

  // Fonction globale pour forcer le recalcul (utilisée par certains steps)
  useEffect(() => {
    if (!isOpen) return
    window.__tutorialUpdateTarget = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateTarget)
    }
    return () => {
      delete window.__tutorialUpdateTarget
    }
  }, [isOpen, updateTarget])

  // ─── Correction post-rendu : garantit que la bulle reste dans le viewport ───
  useLayoutEffect(() => {
    if (!layout || !bubbleRef.current) return
    if (correctedForStepRef.current === currentStep) return
    if (layoutReadyStepRef.current !== currentStep) return

    const el = bubbleRef.current
    const rect = el.getBoundingClientRect()
    const { vw, vh } = getViewport()
    const p = VIEWPORT_PADDING

    let newTop = layout.top
    let newLeft = layout.left
    let needsUpdate = false

    if (rect.bottom > vh - p) {
      newTop = Math.max(p, vh - p - rect.height)
      needsUpdate = true
    }
    if (newTop < p) {
      newTop = p
      needsUpdate = true
    }

    if (rect.right > vw - p) {
      newLeft = Math.max(p, vw - p - rect.width)
      needsUpdate = true
    }
    if (newLeft < p) {
      newLeft = p
      needsUpdate = true
    }

    if (needsUpdate) {
      correctedForStepRef.current = currentStep
      setLayout(prev => prev ? { ...prev, top: newTop, left: newLeft } : prev)

      if (targetRect && layout.arrow) {
        const offset = computeArrowOffset(
          { ...layout, top: newTop, left: newLeft },
          targetRect
        )
        setArrowPos(offset)
      }
    } else {
      correctedForStepRef.current = currentStep
    }
  }, [layout, currentStep, targetRect])

  const showBubble = layoutReadyStepRef.current === currentStep && layout !== null
  useEffect(() => {
    if (!showBubble) return
    if (onShowCalledRef.current === currentStep) return
    onShowCalledRef.current = currentStep
    if (typeof stepData?.onShow === 'function') {
      try {
        stepData.onShow()
      } catch (e) {
        logError('TutorialOverlay', 'Erreur onShow', e)
      }
    }
  }, [showBubble, currentStep, stepData])

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    if (stepData?.onLeave && typeof stepData.onLeave === 'function') {
      stepData.onLeave()
    }
  }, [stepData])

  const handleNext = useCallback((e) => {
    if (e && typeof e.isTrusted === 'boolean' && !e.isTrusted) return

    const now = Date.now()
    if (now - lastAdvanceTimeRef.current < 800) return
    lastAdvanceTimeRef.current = now

    if (stepData?.afterNextStep && typeof stepData.afterNextStep === 'function') {
      setIsExecutingAction(true)

      Promise.resolve()
        .then(() => stepData.afterNextStep())
        .catch((err) => {
          console.error('❌ [TutorialOverlay] Erreur afterNextStep:', err)
        })
        .finally(() => {
          const delay = stepData.afterNextStepDelay || 2000
          actionTimeoutRef.current = setTimeout(() => {
            handleLeave()
            setIsExecutingAction(false)
            onNext?.()
          }, delay)
        })
      return
    }

    handleLeave()
    onNext?.()
  }, [stepData, onNext, handleLeave])

  const handleSkip = useCallback((e) => {
    if (e && typeof e.isTrusted === 'boolean' && !e.isTrusted) return
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current)
      actionTimeoutRef.current = null
    }
    handleLeave()
    if (typeof onSkip === 'function') {
      onSkip()
    } else {
      if (pageId) {
        setItem(`sounddeck-tutorial-${pageId}-done`, true).catch(() => {})
      }
      onComplete?.()
    }
  }, [handleLeave, pageId, onSkip, onComplete])

  // ─── Rendu ────────────────────────────────────────────────────────────────
  if (!isOpen || !stepData) return null

  const showHighlight = targetRect && !isExecutingAction

  const highlightStyle = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - 8,
        left: targetRect.left - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16,
        borderRadius: '12px',
        boxShadow:
          '0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.2), 0 0 30px rgba(124,111,247,0.3)',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 100001,
        animation: 'highlightPulse 2s ease-in-out infinite',
        transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
      }
    : null

  const bubbleStyle = layout
    ? {
        position: 'fixed',
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 32px)',
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(124,111,247,0.15)',
        zIndex: 100002,
        animation: 'bubbleAppear 0.25s ease forwards',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'top 0.15s ease-out, left 0.15s ease-out',
      }
    : null

  const getArrowElement = () => {
    if (!layout?.arrow) return null

    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
    }
    const borderColor = 'var(--accent)'
    const { arrow } = layout
    const { x, y } = arrowPos

    if (arrow === 'top') {
      return (
        <div
          style={{
            ...base,
            bottom: '100%',
            left: x ?? '50%',
            transform: 'translateX(-50%)',
            borderWidth: '0 12px 14px 12px',
            borderColor: `transparent transparent ${borderColor} transparent`,
          }}
        />
      )
    }
    if (arrow === 'bottom') {
      return (
        <div
          style={{
            ...base,
            top: '100%',
            left: x ?? '50%',
            transform: 'translateX(-50%)',
            borderWidth: '14px 12px 0 12px',
            borderColor: `${borderColor} transparent transparent transparent`,
          }}
        />
      )
    }
    if (arrow === 'left') {
      return (
        <div
          style={{
            ...base,
            right: '100%',
            top: y ?? '50%',
            transform: 'translateY(-50%)',
            borderWidth: '12px 14px 12px 0',
            borderColor: `transparent ${borderColor} transparent transparent`,
          }}
        />
      )
    }
    if (arrow === 'right') {
      return (
        <div
          style={{
            ...base,
            left: '100%',
            top: y ?? '50%',
            transform: 'translateY(-50%)',
            borderWidth: '12px 0 12px 14px',
            borderColor: `transparent transparent transparent ${borderColor}`,
          }}
        />
      )
    }
    return null
  }

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 100000,
          animation: 'fadeIn 0.3s ease',
          pointerEvents: 'none',
        }}
      />

      {showHighlight && (
        <>
          <div style={highlightStyle}>
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '16px',
                border: '2px solid var(--accent)',
                opacity: 0.3,
                animation: 'borderPulse 2s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 10,
              left: targetRect.left - 10,
              width: 16,
              height: 16,
              borderLeft: '3px solid var(--accent)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '4px 0 0 0',
              pointerEvents: 'none',
              zIndex: 100001,
              opacity: 0.7,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: targetRect.bottom - 6,
              left: targetRect.right - 6,
              width: 16,
              height: 16,
              borderRight: '3px solid var(--accent)',
              borderBottom: '3px solid var(--accent)',
              borderRadius: '0 0 4px 0',
              pointerEvents: 'none',
              zIndex: 100001,
              opacity: 0.7,
            }}
          />
        </>
      )}

      {showBubble && (
        <div style={bubbleStyle} ref={bubbleRef}>
          {getArrowElement()}

          {isExecutingAction ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                padding: '20px 10px',
                minHeight: 110,
              }}
            >
              <i
                className="ti ti-loader"
                style={{
                  fontSize: 34,
                  color: 'var(--accent)',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {t('tutorialPreparing')}
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--accent-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {stepData.icon || '📖'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: 'var(--accent)',
                    }}
                  >
                    {stepData.title}
                  </div>
                </div>
              </div>

              <div
                ref={bodyRef}
                onScroll={checkScrollable}
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  paddingRight: isScrollable && !isScrolledToBottom ? 8 : 0,
                  transition: 'padding-right 0.2s ease',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--border) transparent',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    paddingBottom: 4,
                  }}
                >
                  {stepData.description}
                </div>

                {stepData.hint && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <i
                      className="ti ti-bulb"
                      style={{
                        color: 'var(--warning)',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                    <span style={{ lineHeight: 1.5 }}>{stepData.hint}</span>
                  </div>
                )}
              </div>

              {isScrollable && !isScrolledToBottom && (
                <div
                  style={{
                    position: 'absolute',
                    left: 2,
                    right: 2,
                    bottom: FOOTER_RESERVED,
                    height: 24,
                    background:
                      'linear-gradient(to bottom, transparent, var(--bg-secondary))',
                    pointerEvents: 'none',
                    borderBottomLeftRadius: 'var(--radius-lg)',
                    borderBottomRightRadius: 'var(--radius-lg)',
                  }}
                />
              )}

              <div
                style={{
                  flexShrink: 0,
                  paddingTop: 12,
                  marginTop: 4,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background:
                          index <= currentStep
                            ? 'var(--accent)'
                            : 'var(--bg-tertiary)',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleSkip}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {t('tutorialSkip')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={handleNext}
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isLastStep ? t('tutorialFinish') : t('tutorialNext')}
                    <i
                      className={`ti ${
                        isLastStep ? 'ti-check' : 'ti-arrow-right'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>,
    document.body
  );
}