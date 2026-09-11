// src/shared/components/ui/TutorialOverlay.jsx
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@core/i18n/LanguageContext';

function findElement(selector, fallbackSelector) {
  if (typeof selector === 'function') {
    try {
      const result = selector();
      if (result && (result.offsetParent !== null || result.getClientRects().length > 0)) return result;
    } catch (e) {}
  }
  if (typeof selector === 'string') {
    try {
      const el = document.querySelector(selector);
      if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) return el;
    } catch (e) {}
  }
  if (fallbackSelector) {
    if (typeof fallbackSelector === 'function') {
      try {
        const result = fallbackSelector();
        if (result && (result.offsetParent !== null || result.getClientRects().length > 0)) return result;
      } catch (e) {}
    }
    try {
      const el = document.querySelector(fallbackSelector);
      if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) return el;
    } catch (e) {}
  }
  return null;
}

function getElementRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    bottom: rect.bottom,
    right: rect.right,
  };
}

function scrollToElement(element) {
  if (!element) return false;
  try {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!isVisible) {
      element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export default function TutorialOverlay({
  steps,
  currentStep,
  onNext,
  onSkip,
  onComplete,
  isOpen,
  pageId = ''
}) {
  const { t } = useLanguage();

  const [bubbleState, setBubbleState] = useState({
    top: 0,
    left: 0,
    arrow: 'bottom',
    targetRect: null,
    readyForStep: -1,
  });
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const bubbleRef = useRef(null);
  const bodyRef = useRef(null);
  const rafRef = useRef(null);

  const lastAdvanceTimeRef = useRef(0);
  const actionTimeoutRef = useRef(null);

  const stepData = steps[currentStep] || steps[0];
  const isLastStep = currentStep === steps.length - 1;

  const [lastRenderedStep, setLastRenderedStep] = useState(currentStep);
  if (lastRenderedStep !== currentStep) {
    setLastRenderedStep(currentStep);
    setBubbleState({ top: 0, left: 0, arrow: 'bottom', targetRect: null, readyForStep: -1 });
    setIsExecutingAction(false);
    setIsScrollable(false);
    setIsScrolledToBottom(false);
  }

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  // Détecte si le body nécessite un scroll
  const checkScrollable = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const hasScroll = body.scrollHeight > body.clientHeight + 2;
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
    setIsScrollable(hasScroll);
    setIsScrolledToBottom(atBottom);
  }, []);

  // Vérifie le scroll après le rendu du contenu
  useLayoutEffect(() => {
    if (bubbleState.readyForStep !== currentStep) return;
    const timer = setTimeout(checkScrollable, 50);
    return () => clearTimeout(timer);
  }, [bubbleState.readyForStep, currentStep, checkScrollable]);

  const calculateBubblePosition = useCallback((rect, forcePosition) => {
    if (!rect) return { top: window.innerHeight / 2 - 125, left: window.innerWidth / 2 - 190, arrow: 'bottom' };

    const bubbleWidth = 420;
    // Estimation plus large pour tenir compte du scroll possible
    const bubbleHeight = Math.min(window.innerHeight - 40, 480);
    const padding = 20;
    const gap = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBottom = viewportHeight - rect.bottom - gap - padding;
    const spaceTop = rect.top - gap - padding;
    const spaceRight = viewportWidth - rect.right - gap - padding;
    const spaceLeft = rect.left - gap - padding;

    const canFitBottom = spaceBottom >= Math.min(bubbleHeight, 260);
    const canFitTop = spaceTop >= Math.min(bubbleHeight, 260);
    const canFitRight = spaceRight >= bubbleWidth;
    const canFitLeft = spaceLeft >= bubbleWidth;

    const centeredLeft = Math.max(
      padding,
      Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)
    );
    const centeredTop = Math.max(
      padding,
      Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)
    );

    const buildBottom = () => ({
      top: Math.min(rect.bottom + gap, viewportHeight - bubbleHeight - padding),
      left: centeredLeft,
      arrow: 'top'
    });
    const buildTop = () => ({
      top: Math.max(padding, rect.top - bubbleHeight - gap),
      left: centeredLeft,
      arrow: 'bottom'
    });
    const buildRight = () => ({
      top: centeredTop,
      left: rect.right + gap,
      arrow: 'left'
    });
    const buildLeft = () => ({
      top: centeredTop,
      left: rect.left - bubbleWidth - gap,
      arrow: 'right'
    });

    if (forcePosition === 'top' && canFitTop) return buildTop();
    if (forcePosition === 'bottom' && canFitBottom) return buildBottom();
    if (forcePosition === 'right' && canFitRight) return buildRight();
    if (forcePosition === 'left' && canFitLeft) return buildLeft();

    if (canFitBottom) return buildBottom();
    if (canFitTop) return buildTop();
    if (canFitRight) return buildRight();
    if (canFitLeft) return buildLeft();

    return {
      top: Math.max(padding, Math.min(rect.bottom + gap, viewportHeight - bubbleHeight - padding)),
      left: centeredLeft,
      arrow: 'top'
    };
  }, []);

  const updateTarget = useCallback(() => {
    const currentStepData = steps[currentStep] || steps[0];

    if (!currentStepData?.target) {
      setBubbleState({
        top: window.innerHeight / 2 - 125,
        left: window.innerWidth / 2 - 190,
        arrow: 'bottom',
        targetRect: null,
        readyForStep: currentStep,
      });
      return;
    }

    const element = findElement(currentStepData.target, currentStepData.fallbackTarget);
    if (element) {
      scrollToElement(element);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = getElementRect(element);
          const pos = calculateBubblePosition(rect, currentStepData.position);
          setBubbleState({
            ...pos,
            targetRect: rect,
            readyForStep: currentStep,
          });
        });
      });
    } else {
      setBubbleState({
        top: window.innerHeight / 2 - 125,
        left: window.innerWidth / 2 - 190,
        arrow: 'bottom',
        targetRect: null,
        readyForStep: currentStep,
      });
    }
  }, [currentStep, steps, calculateBubblePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => updateTarget(), 80);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, updateTarget]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTarget);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, updateTarget]);

  const handleLeave = useCallback(() => {
    if (stepData?.onLeave && typeof stepData.onLeave === 'function') {
      stepData.onLeave();
    }
  }, [stepData]);

  if (!isOpen || !stepData) return null;

  const handleNext = useCallback((e) => {
    if (e && typeof e.isTrusted === 'boolean' && !e.isTrusted) return;

    const now = Date.now();
    if (now - lastAdvanceTimeRef.current < 800) return;
    lastAdvanceTimeRef.current = now;

    if (stepData?.afterNextStep && typeof stepData.afterNextStep === 'function') {
      setIsExecutingAction(true);

      try {
        stepData.afterNextStep();
      } catch (err) {
        console.error('❌ [TutorialOverlay] Erreur afterNextStep:', err);
      }

      const delay = stepData.afterNextStepDelay || 2000;

      actionTimeoutRef.current = setTimeout(() => {
        handleLeave();
        setIsExecutingAction(false);
        onNext?.();
      }, delay);
      return;
    }

    handleLeave();
    onNext?.();
  }, [currentStep, steps, stepData, onNext, handleLeave]);

  const handleSkip = useCallback((e) => {
    if (e && typeof e.isTrusted === 'boolean' && !e.isTrusted) return;
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
    handleLeave();
    if (pageId) {
      localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
    }
    onComplete?.();
  }, [handleLeave, pageId, onComplete]);

  const isBubbleReady = bubbleState.readyForStep === currentStep;
  const targetRect = isBubbleReady ? bubbleState.targetRect : null;
  const showBubble = isBubbleReady && !isExecutingAction;
  const bubblePosition = { top: bubbleState.top, left: bubbleState.left, arrow: bubbleState.arrow };

  const highlightStyle = targetRect ? {
    position: 'fixed',
    top: targetRect.top - 8,
    left: targetRect.left - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
    borderRadius: '12px',
    boxShadow: '0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.2), 0 0 30px rgba(124,111,247,0.3)',
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 100001,
    animation: 'highlightPulse 2s ease-in-out infinite',
    transition: 'top 0.12s ease-out, left 0.12s ease-out, width 0.12s ease-out, height 0.12s ease-out',
  } : {};

  const bubbleStyle = {
    position: 'fixed',
    top: bubblePosition.top,
    left: bubblePosition.left,
    width: '420px',
    maxWidth: 'calc(100vw - 40px)',
    maxHeight: 'calc(100vh - 40px)',
    background: 'var(--bg-secondary)',
    border: '2px solid var(--accent)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(124,111,247,0.15)',
    zIndex: 100002,
    animation: `bubbleAppear 0.3s ease forwards`,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  const arrowStyle = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    pointerEvents: 'none',
  };

  const getArrowStyles = () => {
    const colors = { border: 'var(--accent)', background: 'var(--bg-secondary)' };
    const arrowOffset = '50%';

    switch (bubblePosition.arrow) {
      case 'top':
        return { ...arrowStyle, bottom: '100%', left: arrowOffset, transform: 'translateX(-50%)', borderWidth: '0 12px 14px 12px', borderColor: `transparent transparent ${colors.border} transparent` };
      case 'bottom':
        return { ...arrowStyle, top: '100%', left: arrowOffset, transform: 'translateX(-50%)', borderWidth: '14px 12px 0 12px', borderColor: `${colors.border} transparent transparent transparent` };
      case 'left':
        return { ...arrowStyle, right: '100%', top: arrowOffset, transform: 'translateY(-50%)', borderWidth: '12px 14px 12px 0', borderColor: `transparent ${colors.border} transparent transparent` };
      case 'right':
        return { ...arrowStyle, left: '100%', top: arrowOffset, transform: 'translateY(-50%)', borderWidth: '12px 0 12px 14px', borderColor: `transparent transparent transparent ${colors.border}` };
      default:
        return {};
    }
  };

  const arrowStyles = getArrowStyles();

  useEffect(() => {
    if (isOpen) {
      window.__tutorialUpdateTarget = updateTarget;
      return () => { delete window.__tutorialUpdateTarget; };
    }
  }, [isOpen, updateTarget]);

  return createPortal(
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100000,
        animation: 'fadeIn 0.3s ease',
        pointerEvents: 'none',
      }} />

      {targetRect && !isExecutingAction && (
        <>
          <div style={highlightStyle}>
            <div style={{
              position: 'absolute', inset: -4,
              borderRadius: '16px',
              border: '2px solid var(--accent)',
              opacity: 0.3,
              animation: 'borderPulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          </div>

          <div style={{
            position: 'fixed',
            top: targetRect.top - 10, left: targetRect.left - 10,
            width: 16, height: 16,
            borderLeft: '3px solid var(--accent)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '4px 0 0 0',
            pointerEvents: 'none', zIndex: 100001, opacity: 0.6,
          }} />

          <div style={{
            position: 'fixed',
            top: targetRect.bottom - 6,
            left: targetRect.right - 6,
            width: 16, height: 16,
            borderRight: '3px solid var(--accent)',
            borderBottom: '3px solid var(--accent)',
            borderRadius: '0 0 4px 0',
            pointerEvents: 'none', zIndex: 100001, opacity: 0.6,
          }} />
        </>
      )}

      {showBubble && (
        <div style={bubbleStyle} ref={bubbleRef}>
          <div style={arrowStyles} />

          {/* ─── HEADER : icône + titre (fixe) ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {stepData.icon || '📖'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent)' }}>
                {stepData.title}
              </div>
            </div>
          </div>

          {/* ─── BODY : description + hint (scrollable si besoin) ─── */}
          <div
            ref={bodyRef}
            onScroll={checkScrollable}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: isScrollable && !isScrolledToBottom ? 8 : 0,
              transition: 'padding-right 0.2s ease',
              // Style scrollbar fin
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
            }}
          >
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              paddingBottom: 4,
            }}>
              {stepData.description}
            </div>

            {stepData.hint && (
              <div style={{
                marginTop: 8,
                padding: '6px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}>
                <i className="ti ti-bulb" style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ lineHeight: 1.5 }}>
                  {stepData.hint}
                </span>
              </div>
            )}
          </div>

          {/* ─── Indicateur de scroll (dégradé en bas) ─── */}
          {isScrollable && !isScrolledToBottom && (
            <div
              style={{
                position: 'absolute',
                left: 2,
                right: 2,
                bottom: 62,
                height: 24,
                background: 'linear-gradient(to bottom, transparent, var(--bg-secondary))',
                pointerEvents: 'none',
                borderBottomLeftRadius: 'var(--radius-lg)',
                borderBottomRightRadius: 'var(--radius-lg)',
              }}
            />
          )}

          {/* ─── FOOTER : points + boutons (fixe) ─── */}
          <div style={{
            flexShrink: 0,
            paddingTop: 12,
            marginTop: 4,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {steps.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: index <= currentStep ? 'var(--accent)' : 'var(--bg-tertiary)',
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
                style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {isLastStep ? t('tutorialFinish') : t('tutorialNext')}
                <i className={`ti ${isLastStep ? 'ti-check' : 'ti-arrow-right'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.15), 0 0 30px rgba(124,111,247,0.2); }
          50% { box-shadow: 0 0 0 4px var(--accent), 0 0 0 8px rgba(124,111,247,0.25), 0 0 50px rgba(124,111,247,0.35); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.03); }
        }
        @keyframes bubbleAppear {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
}