/**
 * @file Tutorial orchestrator.
 *
 * A thin wrapper around `TutorialOverlay` that:
 *
 * 1. **Resolves the tutorial steps** for a given `pageId` (from the big
 *    `TUTORIALS` map, each entry being a factory that takes `t`).
 * 2. **Wires page-specific side effects**:
 *    - `youtube` — calls `startYoutubeTutorial()` on mount and
 *      `finishYoutubeTutorial()` on complete/skip, with a small delay to
 *      let the plugin reset its state before unmount.
 *    - `presentation` — calls `cleanupTutorialFavorites(store)` on
 *      complete/skip to restore the favorites the tutorial temporarily
 *      added.
 * 3. **Persists completion** (`sounddeck-tutorial-<pageId>-done` in
 *    `appStorage`), so the app can decide whether to auto-launch the
 *    tutorial on future visits.
 * 4. **Renders a loading placeholder** for the first 500 ms (so the
 *    underlying page has time to mount and register its DOM targets).
 *
 * @see ./TutorialOverlay.jsx — actual rendering + positioning
 * @see @features/<page>/tutorialSteps.js — the step definitions per page
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import TutorialOverlay from "./TutorialOverlay";
import { setItem } from "@shared/utils/appStorage";

import { TUTORIAL_STEPS as HomeSteps } from "@features/home/tutorialSteps";
import { TUTORIAL_STEPS as EditorSteps } from "@features/editor/tutorialSteps";
import { TUTORIAL_STEPS as SequencerSteps } from "@features/sequencer/tutorialSteps";
import { TUTORIAL_STEPS as TrimmerSteps } from "@features/trimmer/tutorialSteps";
import { TUTORIAL_STEPS as OptionsSteps } from "@features/options/tutorialSteps";
import { TUTORIAL_STEPS as StatsSteps } from "@features/stats/tutorialSteps";
import {
  TUTORIAL_STEPS as PresentationSteps,
  cleanupTutorialFavorites,
} from "@features/presentation/tutorialSteps";
import { TUTORIAL_STEPS as EmojiPageSteps } from "@features/emoji/tutorialSteps";

import { TUTORIAL_STEPS as DiscoverSteps } from "@plugins/myinstants/tutorialSteps";
import {
  TUTORIAL_STEPS as YoutubeSteps,
  startYoutubeTutorial,
  cleanupYoutubeTutorial,
  finishYoutubeTutorial,
} from "@plugins/youtube/tutorialSteps";
import { TUTORIAL_STEPS as EmojiDiscoverSteps } from "@plugins/emoji/tutorialSteps";

// Re-export `cleanupYoutubeTutorial` so tree-shakers keep it alive
// (it's used by the youtube plugin during teardown).
void cleanupYoutubeTutorial;

/**
 * Map of `pageId` → step factory. Each factory takes `t` and returns an
 * array of step objects (`{ target, title, description, hint?, icon?,
 * position?, onShow?, onLeave?, afterNextStep?, afterNextStepDelay? }`).
 *
 * `guide` maps to `null` because the Guide page doesn't have a tutorial.
 *
 * @type {Record<string, ((t: (key: string) => string) => Array<Object>) | null>}
 */
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
  "emoji-discover": EmojiDiscoverSteps,
  guide: null,
};

/**
 * Persists the "tutorial done" flags for a given page.
 *
 * Two keys are set:
 * - `sounddeck-tutorial-<pageId>-done` — per-page
 * - `sounddeck-tutorial-done` — global "at least one tutorial seen"
 *
 * Both are fire-and-forget: any storage error is silently ignored, as
 * this is purely a UX optimization (worst case: tutorial re-opens).
 *
 * @param {string} pageId
 * @returns {void}
 */
function markTutorialDone(pageId) {
  try {
    setItem(`sounddeck-tutorial-${pageId}-done`, true).catch(() => {});
    setItem("sounddeck-tutorial-done", true).catch(() => {});
  } catch {
    // Silent — storage failures shouldn't block the tutorial flow
  }
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 *
 * @param {number} [ms=50]
 * @returns {Promise<void>}
 */
const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tutorial orchestrator component.
 *
 * @param {Object} props
 * @param {string} props.pageId - The page the tutorial belongs to
 *   (e.g. `'home'`, `'editor'`, `'youtube'`).
 * @param {() => void} props.onComplete - Called when the user finishes
 *   or skips the tutorial. The parent is expected to hide the modal.
 * @returns {JSX.Element}
 */
export default function Tutorial({ pageId, onComplete }) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const startCalledRef = useRef(false);

  const steps = TUTORIALS[pageId] ? TUTORIALS[pageId](t) : [];
  const hasSteps = steps && steps.length > 0;

  // youtube-specific: call the plugin's start hook exactly once
  useLayoutEffect(() => {
    if (pageId === "youtube" && !startCalledRef.current) {
      startYoutubeTutorial();
      startCalledRef.current = true;
    }
  }, [pageId]);

  // Wait 500 ms before showing the first step, so the underlying page
  // has time to mount and register its DOM targets.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [pageId]);

  /**
   * Advances to the next step, or completes the tutorial if this was
   * the last step. Handles the presentation / youtube teardown.
   *
   * @returns {Promise<void>}
   */
  const handleNext = useCallback(async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (pageId === "presentation") {
        const store = window.__storeRef?.current;
        cleanupTutorialFavorites(store);
      }
      if (pageId === "youtube") {
        finishYoutubeTutorial();
        // Let the `youtube-force-reset` event propagate before the
        // component unmounts (avoids a race in the youtube plugin).
        await tick(80);
      }
      markTutorialDone(pageId);
      onComplete();
    }
  }, [currentStep, steps.length, pageId, onComplete]);

  /**
   * Skips the entire tutorial. Runs the same teardown as `handleNext`
   * when it's the last step.
   *
   * @returns {Promise<void>}
   */
  const handleSkip = useCallback(async () => {
    if (pageId === "presentation") {
      const store = window.__storeRef?.current;
      cleanupTutorialFavorites(store);
    }
    if (pageId === "youtube") {
      finishYoutubeTutorial();
      await tick(80);
    }
    markTutorialDone(pageId);
    onComplete();
  }, [pageId, onComplete]);

  if (!isReady) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div
          className="modal"
          style={{ maxWidth: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-title">
            <i
              className="ti ti-loader"
              style={{ animation: "spin 1s linear infinite" }}
            />
            {t("loading")}
          </div>
        </div>
      </div>
    );
  }

  if (!hasSteps) {
    return (
      <div className="modal-overlay" onClick={onComplete}>
        <div
          className="modal"
          style={{ maxWidth: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-title">
            <i
              className="ti ti-info-circle"
              style={{ color: "var(--warning)" }}
            />
            {t("tutorialNotFound")}
          </div>
          <div className="modal-actions">
            <button className="btn-primary btn-lg" onClick={onComplete}>
              {t("close")}
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