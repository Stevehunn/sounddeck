// src/shared/components/ui/TutorialOverlay.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@core/i18n/LanguageContext';

/**
 * Trouve un élément DOM avec gestion des composants React
 * ✅ NE CRÉE PAS D'ÉLÉMENT FACTICE - retourne null si non trouvé
 */
function findElement(selector, fallbackSelector) {
    if (typeof selector === 'function') {
        try {
            const result = selector();
            if (result) {
                if (result.offsetParent !== null || result.getClientRects().length > 0) {
                    return result;
                }
            }
        } catch (e) {
            // Ignorer
        }
    }
    
    if (typeof selector === 'string') {
        try {
            const el = document.querySelector(selector);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                return el;
            }
        } catch (e) {}
    }
    
    if (fallbackSelector) {
        if (typeof fallbackSelector === 'function') {
            try {
                const result = fallbackSelector();
                if (result && (result.offsetParent !== null || result.getClientRects().length > 0)) {
                    return result;
                }
            } catch (e) {}
        }
        
        try {
            const el = document.querySelector(fallbackSelector);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                return el;
            }
        } catch (e) {}
    }
    
    try {
        const allTestIds = document.querySelectorAll('[data-testid]');
        for (const el of allTestIds) {
            if (el.offsetParent !== null) {
                return el;
            }
        }
    } catch (e) {}
    
    return null;
}

/**
 * Calcule la position d'un élément pour le surlignage
 */
function getElementRect(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX,
    };
}

/**
 * Récupère la position du menu contextuel s'il est ouvert
 */
function getContextMenuRect() {
    const menuSelectors = [
        '[data-testid="context-menu"]',
        '.context-menu',
        '.sound-card-menu',
        '[class*="context"]:not([style*="display: none"])',
        '[class*="menu"]:not([style*="display: none"])',
    ];
    
    for (const selector of menuSelectors) {
        try {
            const menu = document.querySelector(selector);
            if (menu) {
                const style = window.getComputedStyle(menu);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const rect = menu.getBoundingClientRect();
                    return {
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width,
                        height: rect.height,
                        bottom: rect.bottom + window.scrollY,
                        right: rect.right + window.scrollX,
                        centerX: rect.left + rect.width / 2,
                        centerY: rect.top + rect.height / 2,
                    };
                }
            }
        } catch (e) {}
    }
    
    return null;
}

/**
 * Fait défiler la page pour rendre l'élément visible
 */
function scrollToElement(element) {
    if (!element) return false;
    try {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!isVisible) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Ouvre le menu contextuel
 */
function openContextMenu(element) {
    if (!element) return false;
    
    try {
        element.click();
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
            button: 0,
        });
        element.dispatchEvent(clickEvent);
        
        const downEvent = new MouseEvent('mousedown', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
            button: 0,
        });
        const upEvent = new MouseEvent('mouseup', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
            button: 0,
        });
        element.dispatchEvent(downEvent);
        element.dispatchEvent(upEvent);
        
        try {
            const rect = element.getBoundingClientRect();
            const realisticClick = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                button: 0,
            });
            element.dispatchEvent(realisticClick);
        } catch (e) {}
        
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Met le focus sur le menu contextuel
 */
function focusContextMenu() {
    const menuSelectors = [
        '[data-testid="context-menu"]',
        '.context-menu',
        '.sound-card-menu',
        '[class*="context"]:not([style*="display: none"])',
        '[class*="menu"]:not([style*="display: none"])',
    ];
    
    for (const selector of menuSelectors) {
        try {
            const menus = document.querySelectorAll(selector);
            for (const menu of menus) {
                const style = window.getComputedStyle(menu);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    menu.classList.add('tutorial-highlight');
                    try { menu.focus(); } catch (e) {}
                    const firstButton = menu.querySelector('button:not([disabled]), [role="menuitem"]:not([disabled])');
                    if (firstButton) {
                        try { firstButton.focus(); } catch (e) {}
                    }
                    return menu;
                }
            }
        } catch (e) {}
    }
    
    return null;
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
    const [targetRect, setTargetRect] = useState(null);
    const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0, arrow: 'bottom' });
    const [isVisible, setIsVisible] = useState(false);
    const [isActionExecuted, setIsActionExecuted] = useState(false);
    const [showBubble, setShowBubble] = useState(true);
    const [menuRect, setMenuRect] = useState(null);
    const overlayRef = useRef(null);
    const bubbleRef = useRef(null);
    const rafRef = useRef(null);
    const stepData = steps[currentStep] || steps[0];
    const isLastStep = currentStep === steps.length - 1;
    const hasAction = stepData?.action === 'click';
    const hasAfterShow = stepData?.afterShow && typeof stepData.afterShow === 'function';

    useEffect(() => {
        setIsActionExecuted(false);
        setShowBubble(true);
        setMenuRect(null);
    }, [currentStep]);

    useEffect(() => {
        if (!isOpen) {
            setShowBubble(true);
            return;
        }
        
        if (!hasAction) {
            setShowBubble(true);
            return;
        }
        
        if (isActionExecuted) {
            return;
        }
        
        const executeAction = () => {
            const element = findElement(stepData.target, stepData.fallbackTarget);
            
            if (!element) {
                setShowBubble(true);
                return;
            }
            
            if (stepData.action === 'click') {
                const success = openContextMenu(element);
                
                if (success) {
                    let attempts = 0;
                    const maxAttempts = 10;
                    const attemptInterval = 200;
                    
                    const tryFocus = () => {
                        attempts++;
                        const menuElement = focusContextMenu();
                        if (menuElement) {
                            const menuRectData = getContextMenuRect();
                            if (menuRectData) {
                                setMenuRect(menuRectData);
                            }
                            setTimeout(() => {
                                setShowBubble(true);
                                updateTarget();
                            }, 300);
                        } else if (attempts < maxAttempts) {
                            setTimeout(tryFocus, attemptInterval);
                        } else {
                            setShowBubble(true);
                            setTimeout(() => {
                                updateTarget();
                            }, 500);
                        }
                    };
                    
                    setTimeout(tryFocus, 300);
                } else {
                    setShowBubble(true);
                    setTimeout(() => {
                        updateTarget();
                    }, 500);
                }
                
                setIsActionExecuted(true);
                
                const delay = stepData.actionDelay || 800;
                setTimeout(() => {
                    updateTarget();
                }, delay);
            }
        };
        
        const timer = setTimeout(executeAction, 600);
        return () => clearTimeout(timer);
    }, [isOpen, currentStep, stepData, isActionExecuted, hasAction]);

    /**
     * Calcule la position de la bulle avec position forcée possible
     */
    const calculateBubblePosition = useCallback((rect, forcePosition) => {
        if (!rect) return { top: window.innerHeight / 2 - 125, left: window.innerWidth / 2 - 190, arrow: 'bottom' };
        
        const bubbleWidth = 380;
        const bubbleHeight = 250;
        const padding = 20;
        const gap = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (forcePosition) {
            switch (forcePosition) {
                case 'right':
                    const rightSpace = viewportWidth - rect.right - gap - padding;
                    if (rightSpace > bubbleWidth) {
                        return {
                            top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                            left: rect.right + gap,
                            arrow: 'left'
                        };
                    }
                    const bottomSpace = viewportHeight - rect.bottom - gap - padding;
                    if (bottomSpace > bubbleHeight) {
                        return {
                            top: Math.min(viewportHeight - bubbleHeight - padding, rect.bottom + gap),
                            left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                            arrow: 'top'
                        };
                    }
                    return {
                        top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                        left: Math.max(padding, rect.left - bubbleWidth - gap),
                        arrow: 'right'
                    };
                case 'top':
                    const topSpaceAvailable = rect.top - padding - gap;
                    if (topSpaceAvailable < bubbleHeight) {
                        return {
                            top: padding,
                            left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                            arrow: 'bottom'
                        };
                    }
                    return {
                        top: Math.max(padding, rect.top - bubbleHeight - gap),
                        left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                        arrow: 'bottom'
                    };
                case 'bottom':
                default:
                    return {
                        top: Math.min(viewportHeight - bubbleHeight - padding, rect.bottom + gap),
                        left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                        arrow: 'top'
                    };
            }
        }
        
        const positions = [];
        
        const bottomSpaceCalc = viewportHeight - rect.bottom - gap - padding;
        if (bottomSpaceCalc > bubbleHeight) {
            positions.push({
                name: 'bottom',
                top: Math.min(viewportHeight - bubbleHeight - padding, rect.bottom + gap),
                left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                arrow: 'top',
                priority: 1
            });
        }
        
        const topSpaceCalc = rect.top - gap - padding;
        if (topSpaceCalc > bubbleHeight) {
            positions.push({
                name: 'top',
                top: Math.max(padding, rect.top - bubbleHeight - gap),
                left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                arrow: 'bottom',
                priority: 2
            });
        }
        
        const rightSpaceCalc = viewportWidth - rect.right - gap - padding;
        if (rightSpaceCalc > bubbleWidth) {
            positions.push({
                name: 'right',
                top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                left: rect.right + gap,
                arrow: 'left',
                priority: 3
            });
        }
        
        const leftSpaceCalc = rect.left - gap - padding;
        if (leftSpaceCalc > bubbleWidth) {
            positions.push({
                name: 'left',
                top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                left: rect.left - bubbleWidth - gap,
                arrow: 'right',
                priority: 4
            });
        }
        
        if (positions.length === 0) {
            return {
                top: viewportHeight / 2 - bubbleHeight / 2,
                left: viewportWidth / 2 - bubbleWidth / 2,
                arrow: 'bottom'
            };
        }
        
        positions.sort((a, b) => a.priority - b.priority);
        const bestPos = positions[0];
        
        return {
            top: Math.max(padding, Math.min(bestPos.top, viewportHeight - bubbleHeight - padding)),
            left: Math.max(padding, Math.min(bestPos.left, viewportWidth - bubbleWidth - padding)),
            arrow: bestPos.arrow
        };
    }, []);

    const updateTarget = useCallback(() => {
        if (!stepData?.target) {
            return;
        }
        
        const element = findElement(stepData.target, stepData.fallbackTarget);
        if (element) {
            const wasScrolled = scrollToElement(element);
            const delay = wasScrolled ? 400 : 0;
            
            setTimeout(() => {
                const rect = getElementRect(element);
                setTargetRect(rect);
                
                if (rect) {
                    const pos = calculateBubblePosition(rect, stepData.position);
                    setBubblePosition(pos);
                }
            }, delay);
        } else {
            setTargetRect(null);
            setBubblePosition({
                top: window.innerHeight / 2 - 125,
                left: window.innerWidth / 2 - 190,
                arrow: 'bottom'
            });
        }
    }, [stepData, calculateBubblePosition, currentStep]);

    // Mise à jour initiale
    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            return;
        }
        
        const timer = setTimeout(() => {
            updateTarget();
            setIsVisible(true);
            
            if (hasAfterShow) {
                setTimeout(() => {
                    stepData.afterShow();
                }, 600);
            }
        }, 400);
        
        return () => clearTimeout(timer);
    }, [isOpen, currentStep, updateTarget, hasAfterShow, stepData]);

    // Mise à jour au resize
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
    }, [stepData, currentStep]);

    if (!isOpen || !stepData) return null;

    const handleNext = () => {
        handleLeave();
        
        if (isLastStep) {
            onComplete?.();
        } else {
            onNext?.();
            
            const nextStep = steps[currentStep + 1];
            if (nextStep?.afterShow && typeof nextStep.afterShow === 'function') {
                setTimeout(() => {
                    nextStep.afterShow();
                }, 600);
            }
        }
    };

    const handleSkip = () => {
        handleLeave();
        if (pageId) {
            localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
        }
        onComplete?.();
    };

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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } : {};

    const bubbleStyle = {
        position: 'fixed',
        top: bubblePosition.top,
        left: bubblePosition.left,
        width: '380px',
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
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const arrowStyle = {
        position: 'absolute',
        width: 0,
        height: 0,
        borderStyle: 'solid',
        pointerEvents: 'none',
    };

    const getArrowStyles = () => {
        const colors = {
            border: 'var(--accent)',
            background: 'var(--bg-secondary)',
        };
        
        const arrowOffset = '50%';
        
        switch (bubblePosition.arrow) {
            case 'top':
                return {
                    ...arrowStyle,
                    bottom: '100%',
                    left: arrowOffset,
                    transform: 'translateX(-50%)',
                    borderWidth: '0 12px 14px 12px',
                    borderColor: `transparent transparent ${colors.border} transparent`,
                };
            case 'bottom':
                return {
                    ...arrowStyle,
                    top: '100%',
                    left: arrowOffset,
                    transform: 'translateX(-50%)',
                    borderWidth: '14px 12px 0 12px',
                    borderColor: `${colors.border} transparent transparent transparent`,
                };
            case 'left':
                return {
                    ...arrowStyle,
                    right: '100%',
                    top: arrowOffset,
                    transform: 'translateY(-50%)',
                    borderWidth: '12px 14px 12px 0',
                    borderColor: `transparent ${colors.border} transparent transparent`,
                };
            case 'right':
                return {
                    ...arrowStyle,
                    left: '100%',
                    top: arrowOffset,
                    transform: 'translateY(-50%)',
                    borderWidth: '12px 0 12px 14px',
                    borderColor: `transparent transparent transparent ${colors.border}`,
                };
            default:
                return {};
        }
    };

    const arrowStyles = getArrowStyles();

    const shouldShowBubble = showBubble;

    useEffect(() => {
        if (isOpen) {
            window.__tutorialUpdateTarget = updateTarget
            
            return () => {
                delete window.__tutorialUpdateTarget
            }
        }
    }, [isOpen, updateTarget])

    return createPortal(
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 100000,
                    animation: 'fadeIn 0.3s ease',
                    pointerEvents: 'auto',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleNext();
                    }
                }}
            />

            {targetRect && (
                <>
                    <div style={highlightStyle}>
                        <div style={{
                            position: 'absolute',
                            inset: -4,
                            borderRadius: '16px',
                            border: '2px solid var(--accent)',
                            opacity: 0.3,
                            animation: 'borderPulse 2s ease-in-out infinite',
                            pointerEvents: 'none',
                        }} />
                    </div>
                    
                    <div style={{
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
                        opacity: 0.6,
                    }} />
                    
                    <div style={{
                        position: 'fixed',
                        bottom: window.innerHeight - targetRect.bottom - 10,
                        right: window.innerWidth - targetRect.right - 10,
                        width: 16,
                        height: 16,
                        borderRight: '3px solid var(--accent)',
                        borderBottom: '3px solid var(--accent)',
                        borderRadius: '0 0 4px 0',
                        pointerEvents: 'none',
                        zIndex: 100001,
                        opacity: 0.6,
                    }} />
                </>
            )}

            {shouldShowBubble && (
                <div style={bubbleStyle} ref={bubbleRef}>
                    <div style={arrowStyles} />
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--accent-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            flexShrink: 0,
                        }}>
                            {stepData.icon || '📖'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                                fontWeight: 600, 
                                fontSize: 15, 
                                marginBottom: 4,
                                color: 'var(--accent)',
                            }}>
                                {stepData.title}
                            </div>
                            <div style={{ 
                                fontSize: 13, 
                                color: 'var(--text-secondary)', 
                                lineHeight: 1.6,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                            }}>
                                {stepData.description}
                            </div>
                            {stepData.hint && (
                                <div style={{
                                    marginTop: 6,
                                    padding: '4px 10px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 11,
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexShrink: 0,
                                }}>
                                    <i className="ti ti-bulb" style={{ color: 'var(--warning)' }} />
                                    <span style={{ 
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}>
                                        {stepData.hint}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        marginTop: 'auto',
                        paddingTop: 12,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {steps.map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: index <= currentStep ? 'var(--accent)' : 'var(--bg-tertiary)',
                                        transition: 'background 0.3s ease',
                                    }}
                                />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                className="btn-secondary btn-sm"
                                onClick={handleSkip}
                                style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                                {t('tutorialSkip') || 'Passer'}
                            </button>
                            <button
                                className="btn-primary btn-sm"
                                onClick={handleNext}
                                style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                {isLastStep ? (t('tutorialFinish') || 'Terminer') : (t('tutorialNext') || 'Suivant')}
                                <i className={`ti ${isLastStep ? 'ti-check' : 'ti-arrow-right'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes highlightPulse {
                    0%, 100% { 
                        box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.15), 0 0 30px rgba(124,111,247,0.2);
                    }
                    50% { 
                        box-shadow: 0 0 0 4px var(--accent), 0 0 0 8px rgba(124,111,247,0.25), 0 0 50px rgba(124,111,247,0.35);
                    }
                }
                @keyframes borderPulse {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.03); }
                }
                @keyframes bubbleAppear {
                    from { 
                        opacity: 0; 
                        transform: scale(0.95) translateY(10px);
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .tutorial-highlight {
                    animation: tutorialPulse 1.5s ease-in-out infinite !important;
                    box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.2), 0 0 30px rgba(124,111,247,0.3) !important;
                    border-color: var(--accent) !important;
                    z-index: 100003 !important;
                    position: relative;
                }
                @keyframes tutorialPulse {
                    0%, 100% { 
                        box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgba(124,111,247,0.2), 0 0 30px rgba(124,111,247,0.3);
                    }
                    50% { 
                        box-shadow: 0 0 0 5px var(--accent), 0 0 0 10px rgba(124,111,247,0.3), 0 0 50px rgba(124,111,247,0.4);
                    }
                }
            `}</style>
        </>,
        document.body
    );
}