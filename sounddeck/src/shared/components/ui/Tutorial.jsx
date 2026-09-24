// src/shared/components/ui/Tutorial.jsx
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import TutorialOverlay from './TutorialOverlay'
import { setItem } from '@shared/utils/appStorage'

import { TUTORIAL_STEPS as HomeSteps } from '@features/home/tutorialSteps'
import { TUTORIAL_STEPS as EditorSteps } from '@features/editor/tutorialSteps'
import { TUTORIAL_STEPS as SequencerSteps } from '@features/sequencer/tutorialSteps'
import { TUTORIAL_STEPS as TrimmerSteps } from '@features/trimmer/tutorialSteps'
import { TUTORIAL_STEPS as OptionsSteps } from '@features/options/tutorialSteps'
import { TUTORIAL_STEPS as StatsSteps } from '@features/stats/tutorialSteps'
import { TUTORIAL_STEPS as PresentationSteps, cleanupTutorialFavorites } from '@features/presentation/tutorialSteps'
import { TUTORIAL_STEPS as EmojiPageSteps } from '@features/emoji/tutorialSteps'

import { TUTORIAL_STEPS as DiscoverSteps } from '@plugins/myinstants/tutorialSteps'
import { TUTORIAL_STEPS as YoutubeSteps, startYoutubeTutorial, cleanupYoutubeTutorial, finishYoutubeTutorial } from '@plugins/youtube/tutorialSteps'
import { TUTORIAL_STEPS as EmojiDiscoverSteps } from '@plugins/emoji/tutorialSteps'

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
  emoji: EmojiPageSteps,
  'emoji-discover': EmojiDiscoverSteps,
  guide: null,
}

function markTutorialDone(pageId) {
  try {
    setItem(`sounddeck-tutorial-${pageId}-done`, true).catch(() => {})
    setItem('sounddeck-tutorial-done', true).catch(() => {})
  } catch (e) {
    // silencieux
  }
}

const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Tutorial({ pageId, onComplete }) {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const startCalledRef = useRef(false)

  const steps = TUTORIALS[pageId] ? TUTORIALS[pageId](t) : []
  const hasSteps = steps && steps.length > 0

  useLayoutEffect(() => {
    if (pageId === 'youtube' && !startCalledRef.current) {
      startYoutubeTutorial()
      startCalledRef.current = true
    }
  }, [pageId])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [pageId])

  const handleNext = useCallback(async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      if (pageId === 'presentation') {
        const store = window.__storeRef?.current
        cleanupTutorialFavorites(store)
      }
      if (pageId === 'youtube') {
        finishYoutubeTutorial()
        // ✅ FIX 33 : laisser le temps au youtube-force-reset d'être traité
        // avant que le composant ne soit démonté
        await tick(80)
      }
      markTutorialDone(pageId)
      onComplete()
    }
  }, [currentStep, steps.length, pageId, onComplete])

  const handleSkip = useCallback(async () => {
    if (pageId === 'presentation') {
      const store = window.__storeRef?.current
      cleanupTutorialFavorites(store)
    }
    if (pageId === 'youtube') {
      finishYoutubeTutorial()
      await tick(80)
    }
    markTutorialDone(pageId)
    onComplete()
  }, [pageId, onComplete])

  if (!isReady) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            {t('loading')}
          </div>
        </div>
      </div>
    )
  }

  if (!hasSteps) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
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
    )
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
  )
}