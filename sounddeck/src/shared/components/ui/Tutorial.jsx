// src/shared/components/ui/Tutorial.jsx
import { useState, useEffect } from 'react';
import { useLanguage } from '@core/i18n/LanguageContext';
import TutorialOverlay from './TutorialOverlay';

// ✅ Importer les tutoriels des pages core
import { TUTORIAL_STEPS as HomeSteps } from '@features/home/tutorialSteps';
import { TUTORIAL_STEPS as EditorSteps } from '@features/editor/tutorialSteps';
import { TUTORIAL_STEPS as SequencerSteps } from '@features/sequencer/tutorialSteps';
import { TUTORIAL_STEPS as TrimmerSteps } from '@features/trimmer/tutorialSteps';
import { TUTORIAL_STEPS as OptionsSteps } from '@features/options/tutorialSteps';
import { TUTORIAL_STEPS as StatsSteps } from '@features/stats/tutorialSteps';
import { TUTORIAL_STEPS as PresentationSteps } from '@features/presentation/tutorialSteps';

// ✅ Importer les tutoriels des plugins
import { TUTORIAL_STEPS as DiscoverSteps } from '@plugins/myinstants/tutorialSteps';
import { TUTORIAL_STEPS as YoutubeSteps } from '@plugins/youtube/tutorialSteps';

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
  
  const steps = TUTORIALS[pageId] ? TUTORIALS[pageId](t) : [];
  const hasSteps = steps && steps.length > 0;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`sounddeck-tutorial-${pageId}-done`, 'true');
    onComplete();
  };

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
    />
  );
}