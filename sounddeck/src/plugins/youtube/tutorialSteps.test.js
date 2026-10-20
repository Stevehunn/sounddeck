/**
 * @file Tests for the YouTube plugin tutorial steps + tutorial-mode helpers.
 *
 * Covers:
 * - **Lifecycle flags**: `startYoutubeTutorial` / `deactivateYoutubeTutorialMode`
 *   / `finishYoutubeTutorial` / `forceResetYoutubeComponent` / `cleanupYoutubeTutorial`
 * - **Query helpers**: `isYoutubeTutorialActive`, `getTutorialState`,
 *   `getMockVideoInfo`, `getTutorialStep`, `setTutorialStep`
 * - **Mocks**: `mockFetchVideoInfo`, `mockDownloadAudio`, `mockSaveSound`
 * - **Click retry helpers**: `clickLoadButton`, `clickDownloadButton`,
 *   `clickSaveButton` (via `clickWithRetry`)
 * - **Steps**: `TUTORIAL_STEPS` (count, shape, unique IDs, action wiring)
 *
 * All timeouts are simulated via `vi.useFakeTimers()` / `vi.advanceTimersByTime`.
 *
 * @see ./tutorialSteps.js — the module under test
 * @see ./YouTube.jsx — main consumer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startYoutubeTutorial,
  deactivateYoutubeTutorialMode,
  finishYoutubeTutorial,
  forceResetYoutubeComponent,
  cleanupYoutubeTutorial,
  isYoutubeTutorialActive,
  getTutorialState,
  getMockVideoInfo,
  getTutorialStep,
  setTutorialStep,
  mockFetchVideoInfo,
  mockDownloadAudio,
  mockSaveSound,
  clickLoadButton,
  clickDownloadButton,
  clickSaveButton,
  TUTORIAL_STEPS,
} from "./tutorialSteps";

/** Identity i18n function for tests. */
const t = (k) => k;

describe("youtube/tutorialSteps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset every global the module touches
    delete window.__youtubeTutorialActive;
    delete window.__youtubeTutorialStartedAt;
    delete window.__youtubeTutorialState;
    delete window.__isTutorialMode;
    delete window.__tutorialPageId;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ════════════════════════════════════════════════════════════════════
  // startYoutubeTutorial
  // ════════════════════════════════════════════════════════════════════

  describe("startYoutubeTutorial", () => {
    it("should set the active flag", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialActive).toBe(true);
    });

    it("should set startedAt to a positive timestamp", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialStartedAt).toBeGreaterThan(0);
    });

    it("should initialize the state object", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialState).toBeDefined();
      expect(window.__youtubeTutorialState.step).toBe("url");
      expect(window.__youtubeTutorialState.emoji).toBe("🎵");
    });

    it("should set isTutorialMode + tutorialPageId", () => {
      startYoutubeTutorial();
      expect(window.__isTutorialMode).toBe(true);
      expect(window.__tutorialPageId).toBe("youtube");
    });

    it("should dispatch youtube-force-reset", () => {
      const spy = vi.fn();
      window.addEventListener("youtube-force-reset", spy);
      startYoutubeTutorial();
      expect(spy).toHaveBeenCalled();
      window.removeEventListener("youtube-force-reset", spy);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // deactivateYoutubeTutorialMode
  // ════════════════════════════════════════════════════════════════════

  describe("deactivateYoutubeTutorialMode", () => {
    it("should reset every global flag", () => {
      startYoutubeTutorial();
      deactivateYoutubeTutorialMode();
      expect(window.__youtubeTutorialActive).toBe(false);
      expect(window.__youtubeTutorialStartedAt).toBeNull();
      expect(window.__youtubeTutorialState).toBeNull();
      expect(window.__isTutorialMode).toBe(false);
      expect(window.__tutorialPageId).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // isYoutubeTutorialActive
  // ════════════════════════════════════════════════════════════════════

  describe("isYoutubeTutorialActive", () => {
    it("should return true/false depending on state", () => {
      expect(isYoutubeTutorialActive()).toBe(false);
      startYoutubeTutorial();
      expect(isYoutubeTutorialActive()).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getMockVideoInfo
  // ════════════════════════════════════════════════════════════════════

  describe("getMockVideoInfo", () => {
    it("should return a fresh copy (not the shared constant)", () => {
      const a = getMockVideoInfo();
      const b = getMockVideoInfo();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("should contain the essential fields", () => {
      const info = getMockVideoInfo();
      expect(info.id).toBeTruthy();
      expect(info.title).toBeTruthy();
      expect(info.duration).toBe(300);
      expect(info.uploader).toBeTruthy();
      expect(info.platform).toBe("youtube");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getTutorialState
  // ════════════════════════════════════════════════════════════════════

  describe("getTutorialState", () => {
    it("should return the default state when none exists", () => {
      const state = getTutorialState();
      expect(state.step).toBe("url");
      expect(state.soundName).toBeTruthy();
    });

    it("should return the current state if present", () => {
      startYoutubeTutorial();
      setTutorialStep("trim");
      expect(getTutorialState().step).toBe("trim");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getTutorialStep / setTutorialStep
  // ════════════════════════════════════════════════════════════════════

  describe("getTutorialStep / setTutorialStep", () => {
    it('should default to "url"', () => {
      expect(getTutorialStep()).toBe("url");
    });

    it("setTutorialStep should update the step", () => {
      startYoutubeTutorial();
      setTutorialStep("save");
      expect(getTutorialStep()).toBe("save");
    });

    it("setTutorialStep without active state should not throw", () => {
      expect(() => setTutorialStep("trim")).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // finishYoutubeTutorial / forceResetYoutubeComponent
  // ════════════════════════════════════════════════════════════════════

  describe("finishYoutubeTutorial / forceResetYoutubeComponent", () => {
    it("finishYoutubeTutorial should deactivate + dispatch reset", () => {
      startYoutubeTutorial();
      const spy = vi.fn();
      window.addEventListener("youtube-force-reset", spy);

      finishYoutubeTutorial();

      expect(window.__youtubeTutorialActive).toBe(false);
      expect(spy).toHaveBeenCalled();

      window.removeEventListener("youtube-force-reset", spy);
    });

    it("forceResetYoutubeComponent should also deactivate", () => {
      startYoutubeTutorial();
      forceResetYoutubeComponent();
      expect(window.__youtubeTutorialActive).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // cleanupYoutubeTutorial
  // ════════════════════════════════════════════════════════════════════

  describe("cleanupYoutubeTutorial", () => {
    it("should skip if < 500ms have elapsed (StrictMode guard)", () => {
      startYoutubeTutorial();
      cleanupYoutubeTutorial();
      // Still active (elapsed < 500ms)
      expect(window.__youtubeTutorialActive).toBe(true);
    });

    it("should finish if > 500ms have elapsed", () => {
      startYoutubeTutorial();
      window.__youtubeTutorialStartedAt = Date.now() - 1000;
      cleanupYoutubeTutorial();
      expect(window.__youtubeTutorialActive).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // mock* helpers
  // ════════════════════════════════════════════════════════════════════

  describe("mockFetchVideoInfo", () => {
    it("should resolve after 300ms", async () => {
      const promise = mockFetchVideoInfo();
      vi.advanceTimersByTime(300);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data.title).toBeTruthy();
    });
  });

  describe("mockDownloadAudio", () => {
    it("should resolve with a fake path", async () => {
      const promise = mockDownloadAudio("url", 0, 10, "My Test");
      vi.advanceTimersByTime(500);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.path).toContain("My_Test");
      expect(result.name).toBe("My Test");
    });
  });

  describe("mockSaveSound", () => {
    it("should resolve with success", async () => {
      const promise = mockSaveSound();
      vi.advanceTimersByTime(400);
      const result = await promise;
      expect(result.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // TUTORIAL_STEPS
  // ════════════════════════════════════════════════════════════════════

  describe("TUTORIAL_STEPS", () => {
    it("should return 6 steps", () => {
      const steps = TUTORIAL_STEPS(t);
      expect(steps).toHaveLength(6);
    });

    it("each step should have id, title, description, target, icon", () => {
      for (const step of TUTORIAL_STEPS(t)) {
        expect(step.id).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.target).toBeTruthy();
        expect(step.icon).toBeTruthy();
      }
    });

    it("step IDs should be unique", () => {
      const ids = TUTORIAL_STEPS(t).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("steps 2, 4, 6 should have afterNextStep + afterNextStepDelay", () => {
      const steps = TUTORIAL_STEPS(t);
      for (const id of ["youtube-2", "youtube-4", "youtube-6"]) {
        const step = steps.find((s) => s.id === id);
        expect(typeof step.afterNextStep).toBe("function");
        expect(step.afterNextStepDelay).toBeGreaterThan(0);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // clickWithRetry helpers
  // ════════════════════════════════════════════════════════════════════

  describe("clickWithRetry helpers", () => {
    it("clickLoadButton should resolve false if the button isn't found", async () => {
      const promise = clickLoadButton();
      vi.advanceTimersByTime(3000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickDownloadButton should resolve false if the button isn't found", async () => {
      const promise = clickDownloadButton();
      vi.advanceTimersByTime(4000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickSaveButton should resolve false if the button isn't found", async () => {
      const promise = clickSaveButton();
      vi.advanceTimersByTime(4000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickLoadButton should click if the button exists", async () => {
      const btn = document.createElement("button");
      btn.setAttribute("data-testid", "youtube-load-button");
      btn.click = vi.fn();

      // jsdom doesn't compute offsetParent → force it to simulate visibility
      Object.defineProperty(btn, "offsetParent", {
        get: () => document.body,
        configurable: true,
      });

      document.body.appendChild(btn);

      const promise = clickLoadButton();
      await vi.advanceTimersByTimeAsync(300);
      const result = await promise;

      expect(result).toBe(true);
      expect(btn.click).toHaveBeenCalled();

      document.body.removeChild(btn);
    });
  });
});