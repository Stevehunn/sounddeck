// src/shared/components/ui/Tutorial.jsx
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@core/i18n/LanguageContext';
import TutorialOverlay from './TutorialOverlay';

import { TUTORIAL_STEPS as HomeSteps } from '@features/home/tutorialSteps';
import { TUTORIAL_STEPS as EditorSteps } from '@features/editor/tutorialSteps';
import { TUTORIAL_STEPS as SequencerSteps } from '@features/sequencer/tutorialSteps';
import { TUTORIAL_STEPS as TrimmerSteps } from '@features/trimmer/tutorialSteps';
import { TUTORIAL_STEPS as OptionsSteps } from '@features/options/tutorialSteps';
import { TUTORIAL_STEPS as StatsSteps } from '@features/stats/tutorialSteps';
import { TUTORIAL_STEPS as PresentationSteps, cleanupTutorialFavorites } from '@features/presentation/tutorialSteps';

import { TUTORIAL_STEPS as DiscoverSteps } from '@plugins/myinstants/tutorialSteps';
import { 
  TUTORIAL_STEPS as YoutubeSteps, 
  startYoutubeTutorial, 
  cleanupYoutubeTutorial,
  finishYoutubeTutorial
} from '@plugins/youtube/tutorialSteps';

const TUTORIALS = {
  home: HomeSteps,
  editor: EditorSteps,
  sequencer: SequencerSteps,
  trimmer: TrimmerSteps,
  options: OptionsSteps,
  stats: StatsSteps,
  presentation: PresentationSteps,
  discover: DiscoverSteps,
  youtube: YoutubeSteps,
  guide: null,
};

export default function Tutorial({ pageId, onComplete }) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const startCalledRef = useRef(false);
  
  const steps = TUTORIALS[pageId] ? TUTORIALS[pageId](t) : [];
  const hasSteps = steps && steps.length > 0;

  // ✅ useLayoutEffect : UNIQUEMENT pour le démarrage - PAS de cleanup ici !
  useLayoutEffect(() => {
    if (pageId === 'youtube' && !startCalledRef.current) {
      console.log('📖 [Tutorial] useLayoutEffect - Activation du mode tutoriel YouTube')
      startYoutubeTutorial();
      startCalledRef.current = true;
    }
    // ⚠️ PAS de return () => {} ici : React StrictMode déclencherait le cleanup
    // immédiatement après le mount, ce qui désactiverait le mode tutoriel.
  }, [pageId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [pageId]);

  const handleNext = useCallback(() => {
    console.log('📌 [Tutorial] handleNext appelé - currentStep:', currentStep)
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Fin du tutoriel
      if (pageId === 'presentation') {
        const store = window.__storeRef?.current;
        cleanupTutorialFavorites(store);
      }
      if (pageId === 'youtube') {
        console.log('📖 [Tutorial] Fin du tutoriel YouTube')
        // ✅ Désactive les flags + dispatch reset sur le composant YouTube
        finishYoutubeTutorial();
      }
      localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
      onComplete();
    }
  }, [currentStep, steps.length, pageId, onComplete]);

  const handleSkip = useCallback(() => {
    if (pageId === 'presentation') {
      const store = window.__storeRef?.current;
      cleanupTutorialFavorites(store);
    }
    if (pageId === 'youtube') {
      console.log('📖 [Tutorial] Skip du tutoriel YouTube')
      finishYoutubeTutorial();
    }
    localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
    onComplete();
  }, [pageId, onComplete]);

  if (!isReady) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            {t('loading')}
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (!hasSteps) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">
            <i className="ti ti-info-circle" style={{ color: 'var(--warning)' }} />
            {t('tutorialNotFound')}
          </div>
          <div className="modal-actions">
            <button className="btn-primary btn-lg" onClick={onComplete}>
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TutorialOverlay
      steps={steps}
      currentStep={currentStep}
      onNext={handleNext}
      onSkip={handleSkip}
      onComplete={onComplete}
      isOpen={true}
      pageId={pageId}
    />
  );
}