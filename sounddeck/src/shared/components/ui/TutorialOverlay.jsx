// src/shared/components/ui/TutorialOverlay.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@core/i18n/LanguageContext';

/**
 * Trouve un élément DOM avec gestion des composants React
 * Attend que l'élément soit visible et interactif
 */
function findElement(selector, fallbackSelector) {
  console.log('🔍 [Tutorial] Recherche de l\'élément cible...');
  
  // Si c'est une fonction, l'exécuter
  if (typeof selector === 'function') {
    try {
      const result = selector();
      if (result) {
        // Vérifier que l'élément est visible
        if (result.offsetParent !== null || result.getClientRects().length > 0) {
          console.log('✅ [Tutorial] Élément trouvé par fonction');
          return result;
        }
        console.log('⚠️ [Tutorial] Élément trouvé mais non visible, tentative de fallback');
      }
    } catch (e) {
      console.warn('⚠️ [Tutorial] Erreur dans la fonction selector:', e);
    }
  }
  
  // Si c'est une chaîne, chercher avec querySelector
  if (typeof selector === 'string') {
    try {
      const el = document.querySelector(selector);
      if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
        console.log('✅ [Tutorial] Élément trouvé par sélecteur:', selector);
        return el;
      }
    } catch (e) {}
  }
  
  // Fallback
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
  
  // Dernier recours: chercher dans tout le DOM un élément avec data-testid
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
 * Ouvre le menu contextuel en trouvant et affichant le menu
 */
function openContextMenu(element) {
  if (!element) {
    console.log('❌ [openContextMenu] Élément null');
    return false;
  }
  
  console.log('🖱️ [openContextMenu] Tentative d\'ouverture du menu sur:', element);
  
  try {
    // ✅ Méthode 1: click() standard
    element.click();
    console.log('  ✅ click() exécuté');
    
    // ✅ Méthode 2: MouseEvent avec bubbles
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
    
    // ✅ Méthode 3: mousedown + mouseup
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
    
    console.log('✅ [openContextMenu] Menu ouvert avec succès');
    return true;
    
  } catch (e) {
    console.error('❌ [openContextMenu] Erreur:', e);
    return false;
  }
}

export default function TutorialOverlay({ 
  steps, 
  currentStep, 
  onNext, 
  onSkip, 
  onComplete,
  isOpen 
}) {
  const { t } = useLanguage();
  const [targetRect, setTargetRect] = useState(null);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0, arrow: 'bottom' });
  const [isVisible, setIsVisible] = useState(false);
  const [isActionExecuted, setIsActionExecuted] = useState(false);
  const overlayRef = useRef(null);
  const bubbleRef = useRef(null);
  const rafRef = useRef(null);
  const stepData = steps[currentStep] || steps[0];
  const isLastStep = currentStep === steps.length - 1;

  console.log('📌 [TutorialOverlay] Étape actuelle:', currentStep, stepData?.id, 'action:', stepData?.action, 'isActionExecuted:', isActionExecuted);

  // ✅ Réinitialiser isActionExecuted à chaque changement d'étape
  useEffect(() => {
    setIsActionExecuted(false);
  }, [currentStep]);

  // ✅ Exécuter l'action de l'étape
  useEffect(() => {
    console.log('🔍 [TutorialOverlay] useEffect action - isOpen:', isOpen, 'hasAction:', !!stepData?.action, 'isActionExecuted:', isActionExecuted);
    
    if (!isOpen) {
      console.log('  ⏭️ isOpen est false');
      return;
    }
    
    if (!stepData?.action) {
      console.log('  ⏭️ Pas d\'action dans stepData');
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
        return;
      }
      
      if (stepData.action === 'click') {
        console.log('🖱️ [Tutorial] Ouverture du menu contextuel sur:', element);
        const success = openContextMenu(element);
        
        if (success) {
          console.log('✅ [Tutorial] Menu contextuel ouvert avec succès');
        } else {
          console.log('⚠️ [Tutorial] Échec de l\'ouverture du menu');
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
  }, [isOpen, currentStep, stepData, isActionExecuted]);

  /**
   * Calcule la position de la bulle en s'assurant qu'elle reste visible
   */
  const calculateBubblePosition = useCallback((rect) => {
    if (!rect) return { top: 0, left: 0, arrow: 'bottom' };
    
    const bubbleWidth = 380;
    const bubbleHeight = 240;
    const padding = 16;
    const gap = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Liste des positions possibles
    const positions = [
      { 
        name: 'bottom', 
        top: rect.bottom + gap, 
        left: rect.centerX - bubbleWidth / 2,
        arrow: 'top',
        available: (rect.bottom + gap + bubbleHeight) < viewportHeight - padding
      },
      { 
        name: 'top', 
        top: rect.top - bubbleHeight - gap, 
        left: rect.centerX - bubbleWidth / 2,
        arrow: 'bottom',
        available: (rect.top - bubbleHeight - gap) > padding
      },
      { 
        name: 'right', 
        top: rect.centerY - bubbleHeight / 2, 
        left: rect.right + gap,
        arrow: 'left',
        available: (rect.right + gap + bubbleWidth) < viewportWidth - padding
      },
      { 
        name: 'left', 
        top: rect.centerY - bubbleHeight / 2, 
        left: rect.left - bubbleWidth - gap,
        arrow: 'right',
        available: (rect.left - bubbleWidth - gap) > padding
      }
    ];
    
    // Trouver la meilleure position disponible
    let bestPos = positions.find(p => p.available) || positions[0];
    
    // Ajuster la position horizontale pour ne pas sortir de l'écran
    let left = Math.max(padding, Math.min(bestPos.left, viewportWidth - bubbleWidth - padding));
    
    // Ajuster la position verticale pour ne pas sortir de l'écran
    let top = Math.max(padding, Math.min(bestPos.top, viewportHeight - bubbleHeight - padding));
    
    // Si l'élément est très proche du bord, centrer la bulle verticalement
    if (rect.top < bubbleHeight + gap * 2 && rect.bottom > viewportHeight - bubbleHeight - gap * 2) {
      top = viewportHeight / 2 - bubbleHeight / 2;
      if (rect.centerX < viewportWidth / 2) {
        bestPos.arrow = 'left';
        left = rect.right + gap;
      } else {
        bestPos.arrow = 'right';
        left = rect.left - bubbleWidth - gap;
      }
      left = Math.max(padding, Math.min(left, viewportWidth - bubbleWidth - padding));
    }
    
    // Si l'élément est très proche des bords horizontaux, centrer la bulle horizontalement
    if (rect.left < bubbleWidth / 2 || rect.right > viewportWidth - bubbleWidth / 2) {
      left = viewportWidth / 2 - bubbleWidth / 2;
      if (rect.centerY < viewportHeight / 2) {
        bestPos.arrow = 'top';
        top = rect.bottom + gap;
      } else {
        bestPos.arrow = 'bottom';
        top = rect.top - bubbleHeight - gap;
      }
      top = Math.max(padding, Math.min(top, viewportHeight - bubbleHeight - padding));
    }
    
    // Ajustement final pour la flèche
    let arrow = bestPos.arrow;
    if (top + bubbleHeight > viewportHeight - padding * 2) {
      arrow = 'bottom';
    }
    if (top < padding * 2) {
      arrow = 'top';
    }
    
    console.log('📐 [Tutorial] Position calculée:', { top, left, arrow });
    
    return { top, left, arrow };
  }, []);

  const updateTarget = useCallback(() => {
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
          const pos = calculateBubblePosition(rect);
          setBubblePosition(pos);
        }
      }, delay);
      
    } else {
      console.log('❌ [Tutorial] Élément NON trouvé pour l\'étape', currentStep);
      setTimeout(updateTarget, 500);
    }
  }, [stepData, calculateBubblePosition, currentStep]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    
    const timer = setTimeout(() => {
      updateTarget();
      setIsVisible(true);
    }, 300);
    
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

  if (!isOpen || !stepData) return null;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onNext?.();
    }
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
              onClick={onSkip}
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
      `}</style>
    </>,
    document.body
  );
}