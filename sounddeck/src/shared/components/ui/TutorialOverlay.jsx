// src/shared/components/ui/TutorialOverlay.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@core/i18n/LanguageContext';

/**
 * Trouve un élément DOM avec gestion des composants React
 * ✅ NE CRÉE PAS D'ÉLÉMENT FACTICE - retourne null si non trouvé
 */
function findElement(selector, fallbackSelector) {
    console.log('🔍 [Tutorial] Recherche de l\'élément cible...');
    
    if (typeof selector === 'function') {
        try {
            const result = selector();
            if (result) {
                if (result.offsetParent !== null || result.getClientRects().length > 0) {
                    console.log('✅ [Tutorial] Élément trouvé par fonction');
                    return result;
                }
                console.log('⚠️ [Tutorial] Élément trouvé mais non visible');
            }
        } catch (e) {
            console.warn('⚠️ [Tutorial] Erreur dans la fonction selector:', e);
        }
    }
    
    if (typeof selector === 'string') {
        try {
            const el = document.querySelector(selector);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                console.log('✅ [Tutorial] Élément trouvé par sélecteur:', selector);
                return el;
            }
        } catch (e) {}
    }
    
    if (fallbackSelector) {
        console.log('🔍 [Tutorial] Tentative fallback...');
        
        if (typeof fallbackSelector === 'function') {
            try {
                const result = fallbackSelector();
                if (result && (result.offsetParent !== null || result.getClientRects().length > 0)) {
                    console.log('✅ [Tutorial] Élément trouvé par fallback fonction');
                    return result;
                }
            } catch (e) {}
        }
        
        try {
            const el = document.querySelector(fallbackSelector);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                console.log('✅ [Tutorial] Élément trouvé par fallback sélecteur');
                return el;
            }
        } catch (e) {}
    }
    
    try {
        const allTestIds = document.querySelectorAll('[data-testid]');
        for (const el of allTestIds) {
            if (el.offsetParent !== null) {
                console.log('✅ [Tutorial] Élément trouvé par data-testid:', el.dataset.testid);
                return el;
            }
        }
    } catch (e) {}
    
    console.log('❌ [Tutorial] Aucun élément trouvé');
    return null;
}

/**
 * Calcule la position d'un élément pour le surlignage
 */
function getElementRect(element) {
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    console.log('📐 [getElementRect] Rect:', {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
    });
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
    console.log('🔍 [getContextMenuRect] Recherche du menu contextuel...');
    
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
                console.log(`  📐 Vérification du sélecteur "${selector}":`, {
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity
                });
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    const rect = menu.getBoundingClientRect();
                    console.log('✅ [getContextMenuRect] Menu trouvé:', {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        bottom: rect.bottom,
                        right: rect.right
                    });
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
        } catch (e) {
            console.warn(`  ⚠️ Erreur avec le sélecteur "${selector}":`, e);
        }
    }
    
    console.log('❌ [getContextMenuRect] Aucun menu trouvé');
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
    if (!element) {
        console.log('❌ [openContextMenu] Élément null');
        return false;
    }
    
    console.log('🖱️ [openContextMenu] Tentative d\'ouverture du menu sur:', element);
    
    try {
        element.click();
        console.log('  ✅ click() exécuté');
        
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
            button: 0,
        });
        element.dispatchEvent(clickEvent);
        console.log('  ✅ MouseEvent dispatché');
        
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
        console.log('  ✅ mousedown/mouseup dispatchés');
        
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
            console.log('  ✅ Clic avec position réaliste');
        } catch (e) {}
        
        console.log('✅ [openContextMenu] Menu ouvert avec succès');
        return true;
        
    } catch (e) {
        console.error('❌ [openContextMenu] Erreur:', e);
        return false;
    }
}

/**
 * Met le focus sur le menu contextuel
 */
function focusContextMenu() {
    console.log('🔍 [Tutorial] Recherche du menu contextuel pour le focus...');
    
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
                    console.log('✅ [Tutorial] Menu contextuel trouvé et visible:', menu);
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
    
    console.log('❌ [Tutorial] Aucun menu contextuel trouvé');
    return null;
}

export default function TutorialOverlay({ 
    steps, 
    currentStep, 
    onNext, 
    onSkip, 
    onComplete,
    isOpen,
    pageId = '' // ✅ Ajout de pageId en paramètre avec valeur par défaut
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

    console.log('📌 [TutorialOverlay] Étape actuelle:', currentStep, stepData?.id, 'hasAction:', hasAction, 'hasAfterShow:', hasAfterShow);

    // ✅ Réinitialiser à chaque changement d'étape
    useEffect(() => {
        setIsActionExecuted(false);
        setShowBubble(true);
        setMenuRect(null);
    }, [currentStep]);

    // ✅ Exécuter l'action de l'étape
    useEffect(() => {
        console.log('🔍 [TutorialOverlay] useEffect action - isOpen:', isOpen, 'hasAction:', hasAction, 'isActionExecuted:', isActionExecuted);
        
        if (!isOpen) {
            console.log('  ⏭️ isOpen est false');
            return;
        }
        
        if (!hasAction) {
            console.log('  ⏭️ Pas d\'action dans stepData');
            setShowBubble(true);
            return;
        }
        
        if (isActionExecuted) {
            console.log('  ⏭️ Action déjà exécutée');
            return;
        }
        
        console.log('🎬 [TutorialOverlay] Exécution de l\'action pour l\'étape:', stepData.id);
        
        const executeAction = () => {
            console.log('🔍 [TutorialOverlay] Recherche de l\'élément cible...');
            const element = findElement(stepData.target, stepData.fallbackTarget);
            
            if (!element) {
                console.log('❌ [Tutorial] Élément non trouvé');
                setShowBubble(true);
                return;
            }
            
            if (stepData.action === 'click') {
                console.log('🖱️ [Tutorial] Ouverture du menu contextuel sur:', element);
                const success = openContextMenu(element);
                
                if (success) {
                    console.log('✅ [Tutorial] Menu contextuel ouvert avec succès');
                    
                    let attempts = 0;
                    const maxAttempts = 10;
                    const attemptInterval = 200;
                    
                    const tryFocus = () => {
                        attempts++;
                        console.log(`🔍 [Tutorial] Tentative de focus ${attempts}/${maxAttempts}...`);
                        const menuElement = focusContextMenu();
                        if (menuElement) {
                            console.log('✅ [Tutorial] Menu contextuel focusé');
                            const menuRectData = getContextMenuRect();
                            if (menuRectData) {
                                setMenuRect(menuRectData);
                                console.log('📐 [Tutorial] Menu détecté:', menuRectData);
                            }
                            setTimeout(() => {
                                setShowBubble(true);
                                console.log('🔄 [Tutorial] Recalcul de la position après ouverture du menu');
                                updateTarget();
                            }, 300);
                        } else if (attempts < maxAttempts) {
                            setTimeout(tryFocus, attemptInterval);
                        } else {
                            console.log('❌ [Tutorial] Impossible de trouver le menu contextuel');
                            setShowBubble(true);
                            setTimeout(() => {
                                updateTarget();
                            }, 500);
                        }
                    };
                    
                    setTimeout(tryFocus, 300);
                } else {
                    console.log('⚠️ [Tutorial] Échec de l\'ouverture du menu');
                    setShowBubble(true);
                    setTimeout(() => {
                        updateTarget();
                    }, 500);
                }
                
                setIsActionExecuted(true);
                
                const delay = stepData.actionDelay || 800;
                console.log(`⏳ [Tutorial] Attente de ${delay}ms pour la mise à jour...`);
                setTimeout(() => {
                    console.log('🔄 [Tutorial] Mise à jour de la cible après clic');
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
        console.log('📐 [calculateBubblePosition] Début du calcul');
        console.log('  📐 rect cible:', rect);
        console.log('  📐 forcePosition:', forcePosition);
        
        if (!rect) return { top: window.innerHeight / 2 - 125, left: window.innerWidth / 2 - 190, arrow: 'bottom' };
        
        const bubbleWidth = 380;
        const bubbleHeight = 250;
        const padding = 20;
        const gap = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        console.log('  📐 Viewport:', { viewportWidth, viewportHeight });
        console.log('  📐 Paramètres:', { bubbleWidth, bubbleHeight, padding, gap });
        
        // ✅ Si une position est forcée, l'utiliser en priorité
        if (forcePosition) {
            console.log(`  📐 Position forcée: ${forcePosition}`);
            switch (forcePosition) {
                case 'right':
                    // Position à droite de l'élément
                    const rightSpace = viewportWidth - rect.right - gap - padding;
                    if (rightSpace > bubbleWidth) {
                        return {
                            top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                            left: rect.right + gap,
                            arrow: 'left'
                        };
                    }
                    // Fallback: position en bas
                    const bottomSpace = viewportHeight - rect.bottom - gap - padding;
                    if (bottomSpace > bubbleHeight) {
                        return {
                            top: Math.min(viewportHeight - bubbleHeight - padding, rect.bottom + gap),
                            left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                            arrow: 'top'
                        };
                    }
                    // Fallback: position à gauche
                    return {
                        top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                        left: Math.max(padding, rect.left - bubbleWidth - gap),
                        arrow: 'right'
                    };
                case 'top':
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
        
        // Liste des positions possibles (calcul automatique)
        const positions = [];
        
        // Position en bas
        const bottomSpace = viewportHeight - rect.bottom - gap - padding;
        if (bottomSpace > bubbleHeight) {
            positions.push({
                name: 'bottom',
                top: Math.min(viewportHeight - bubbleHeight - padding, rect.bottom + gap),
                left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                arrow: 'top',
                priority: 1
            });
            console.log('  ✅ Position "bottom" ajoutée');
        }
        
        // Position en haut
        const topSpace = rect.top - gap - padding;
        if (topSpace > bubbleHeight) {
            positions.push({
                name: 'top',
                top: Math.max(padding, rect.top - bubbleHeight - gap),
                left: Math.max(padding, Math.min(rect.centerX - bubbleWidth / 2, viewportWidth - bubbleWidth - padding)),
                arrow: 'bottom',
                priority: 2
            });
            console.log('  ✅ Position "top" ajoutée');
        }
        
        // Position à droite
        const rightSpace = viewportWidth - rect.right - gap - padding;
        if (rightSpace > bubbleWidth) {
            positions.push({
                name: 'right',
                top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                left: rect.right + gap,
                arrow: 'left',
                priority: 3
            });
            console.log('  ✅ Position "right" ajoutée');
        }
        
        // Position à gauche
        const leftSpace = rect.left - gap - padding;
        if (leftSpace > bubbleWidth) {
            positions.push({
                name: 'left',
                top: Math.max(padding, Math.min(rect.centerY - bubbleHeight / 2, viewportHeight - bubbleHeight - padding)),
                left: rect.left - bubbleWidth - gap,
                arrow: 'right',
                priority: 4
            });
            console.log('  ✅ Position "left" ajoutée');
        }
        
        console.log('  📐 Positions possibles:', positions.length);
        
        // Si aucune position n'est disponible, position centrale
        if (positions.length === 0) {
            console.log('⚠️ [Tutorial] Aucune position disponible, utilisation d\'une position centrale');
            return {
                top: viewportHeight / 2 - bubbleHeight / 2,
                left: viewportWidth / 2 - bubbleWidth / 2,
                arrow: 'bottom'
            };
        }
        
        // Trier par priorité
        positions.sort((a, b) => a.priority - b.priority);
        const bestPos = positions[0];
        console.log('  📐 Meilleure position choisie:', bestPos);
        
        return {
            top: Math.max(padding, Math.min(bestPos.top, viewportHeight - bubbleHeight - padding)),
            left: Math.max(padding, Math.min(bestPos.left, viewportWidth - bubbleWidth - padding)),
            arrow: bestPos.arrow
        };
    }, []);

    const updateTarget = useCallback(() => {
        console.log('🔄 [updateTarget] Début mise à jour');
        
        if (!stepData?.target) {
            console.log('⚠️ [Tutorial] Pas de target pour l\'étape', currentStep);
            return;
        }
        
        console.log('🔍 [Tutorial] Recherche de la cible pour l\'étape', currentStep);
        
        const element = findElement(stepData.target, stepData.fallbackTarget);
        if (element) {
            console.log('✅ [Tutorial] Élément trouvé:', element);
            
            const wasScrolled = scrollToElement(element);
            const delay = wasScrolled ? 400 : 0;
            
            setTimeout(() => {
                const rect = getElementRect(element);
                setTargetRect(rect);
                
                if (rect) {
                    // ✅ Passer la position forcée si définie
                    const pos = calculateBubblePosition(rect, stepData.position);
                    console.log('📐 [updateTarget] Position finale de la bulle:', pos);
                    setBubblePosition(pos);
                }
            }, delay);
            
        } else {
            console.log('❌ [Tutorial] Élément NON trouvé pour l\'étape', currentStep);
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
            
            // ✅ Exécuter afterShow si présent
            if (hasAfterShow) {
                console.log('🎬 [Tutorial] Exécution de afterShow pour l\'étape', currentStep);
                setTimeout(() => {
                    stepData.afterShow();
                }, 500);
            }
        }, 300);
        
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

    // ✅ Fonction pour fermer le menu si onLeave est défini
    const handleLeave = useCallback(() => {
        if (stepData?.onLeave && typeof stepData.onLeave === 'function') {
            console.log('🔚 [Tutorial] Exécution de onLeave pour l\'étape', currentStep);
            stepData.onLeave();
        }
    }, [stepData, currentStep]);

    if (!isOpen || !stepData) return null;

    const handleNext = () => {
        // ✅ Appeler onLeave avant de passer à l'étape suivante
        handleLeave();
        
        if (isLastStep) {
            onComplete?.();
        } else {
            onNext?.();
            
            const nextStep = steps[currentStep + 1];
            if (nextStep?.afterShow && typeof nextStep.afterShow === 'function') {
                console.log('🎬 [Tutorial] Exécution de afterShow pour l\'étape suivante', currentStep + 1);
                setTimeout(() => {
                    nextStep.afterShow();
                }, 600);
            }
        }
    };

    const handleSkip = () => {
        // ✅ Appeler onLeave avant de passer
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