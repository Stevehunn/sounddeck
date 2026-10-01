import { describe, it, expect, vi, beforeEach } from "vitest";
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

const t = (k) => k;

describe("youtube/tutorialSteps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete window.__youtubeTutorialActive;
    delete window.__youtubeTutorialStartedAt;
    delete window.__youtubeTutorialState;
    delete window.__isTutorialMode;
    delete window.__tutorialPageId;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startYoutubeTutorial", () => {
    it("devrait activer le flag", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialActive).toBe(true);
    });

    it("devrait définir startedAt", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialStartedAt).toBeGreaterThan(0);
    });

    it("devrait initialiser le state", () => {
      startYoutubeTutorial();
      expect(window.__youtubeTutorialState).toBeDefined();
      expect(window.__youtubeTutorialState.step).toBe("url");
      expect(window.__youtubeTutorialState.emoji).toBe("🎵");
    });

    it("devrait définir isTutorialMode", () => {
      startYoutubeTutorial();
      expect(window.__isTutorialMode).toBe(true);
      expect(window.__tutorialPageId).toBe("youtube");
    });

    it("devrait dispatcher youtube-force-reset", () => {
      const spy = vi.fn();
      window.addEventListener("youtube-force-reset", spy);
      startYoutubeTutorial();
      expect(spy).toHaveBeenCalled();
      window.removeEventListener("youtube-force-reset", spy);
    });
  });

  describe("deactivateYoutubeTutorialMode", () => {
    it("devrait remettre tous les flags à off", () => {
      startYoutubeTutorial();
      deactivateYoutubeTutorialMode();
      expect(window.__youtubeTutorialActive).toBe(false);
      expect(window.__youtubeTutorialStartedAt).toBeNull();
      expect(window.__youtubeTutorialState).toBeNull();
      expect(window.__isTutorialMode).toBe(false);
      expect(window.__tutorialPageId).toBeNull();
    });
  });

  describe("isYoutubeTutorialActive", () => {
    it("devrait retourner true/false", () => {
      expect(isYoutubeTutorialActive()).toBe(false);
      startYoutubeTutorial();
      expect(isYoutubeTutorialActive()).toBe(true);
    });
  });

  describe("getMockVideoInfo", () => {
    it("devrait retourner une copie du mock", () => {
      const a = getMockVideoInfo();
      const b = getMockVideoInfo();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("devrait contenir les champs essentiels", () => {
      const info = getMockVideoInfo();
      expect(info.id).toBeTruthy();
      expect(info.title).toBeTruthy();
      expect(info.duration).toBe(300);
      expect(info.uploader).toBeTruthy();
      expect(info.platform).toBe("youtube");
    });
  });

  describe("getTutorialState", () => {
    it("devrait retourner le state par défaut si aucun", () => {
      const state = getTutorialState();
      expect(state.step).toBe("url");
      expect(state.soundName).toBeTruthy();
    });

    it("devrait retourner le state courant si présent", () => {
      startYoutubeTutorial();
      setTutorialStep("trim");
      expect(getTutorialState().step).toBe("trim");
    });
  });

  describe("getTutorialStep / setTutorialStep", () => {
    it('devrait retourner "url" par défaut', () => {
      expect(getTutorialStep()).toBe("url");
    });

    it("setTutorialStep devrait modifier le step", () => {
      startYoutubeTutorial();
      setTutorialStep("save");
      expect(getTutorialStep()).toBe("save");
    });

    it("setTutorialStep sans state actif → pas de crash", () => {
      expect(() => setTutorialStep("trim")).not.toThrow();
    });
  });

  describe("finishYoutubeTutorial / forceResetYoutubeComponent", () => {
    it("devrait désactiver et dispatcher", () => {
      startYoutubeTutorial();
      const spy = vi.fn();
      window.addEventListener("youtube-force-reset", spy);

      finishYoutubeTutorial();

      expect(window.__youtubeTutorialActive).toBe(false);
      expect(spy).toHaveBeenCalled();

      window.removeEventListener("youtube-force-reset", spy);
    });

    it("forceReset devrait désactiver aussi", () => {
      startYoutubeTutorial();
      forceResetYoutubeComponent();
      expect(window.__youtubeTutorialActive).toBe(false);
    });
  });

  describe("cleanupYoutubeTutorial", () => {
    it("devrait ignorer si moins de 500ms depuis le début", () => {
      startYoutubeTutorial();
      cleanupYoutubeTutorial();
      // Toujours actif (délai < 500ms)
      expect(window.__youtubeTutorialActive).toBe(true);
    });

    it("devrait finish si > 500ms", () => {
      startYoutubeTutorial();
      window.__youtubeTutorialStartedAt = Date.now() - 1000;
      cleanupYoutubeTutorial();
      expect(window.__youtubeTutorialActive).toBe(false);
    });
  });

  describe("mockFetchVideoInfo", () => {
    it("devrait résoudre après 300ms", async () => {
      const promise = mockFetchVideoInfo();
      vi.advanceTimersByTime(300);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data.title).toBeTruthy();
    });
  });

  describe("mockDownloadAudio", () => {
    it("devrait résoudre avec un path", async () => {
      const promise = mockDownloadAudio("url", 0, 10, "My Test");
      vi.advanceTimersByTime(500);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.path).toContain("My_Test");
      expect(result.name).toBe("My Test");
    });
  });

  describe("mockSaveSound", () => {
    it("devrait résoudre success", async () => {
      const promise = mockSaveSound();
      vi.advanceTimersByTime(400);
      const result = await promise;
      expect(result.success).toBe(true);
    });
  });

  describe("TUTORIAL_STEPS", () => {
    it("devrait retourner 6 étapes", () => {
      const steps = TUTORIAL_STEPS(t);
      expect(steps).toHaveLength(6);
    });

    it("chaque étape devrait avoir id, title, description, target", () => {
      for (const step of TUTORIAL_STEPS(t)) {
        expect(step.id).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.target).toBeTruthy();
        expect(step.icon).toBeTruthy();
      }
    });

    it("les ids devraient être uniques", () => {
      const ids = TUTORIAL_STEPS(t).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("clickWithRetry helpers", () => {
    it("clickLoadButton devrait résoudre false si pas de bouton", async () => {
      const promise = clickLoadButton();
      vi.advanceTimersByTime(3000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickDownloadButton devrait résoudre false si pas de bouton", async () => {
      const promise = clickDownloadButton();
      vi.advanceTimersByTime(4000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickSaveButton devrait résoudre false si pas de bouton", async () => {
      const promise = clickSaveButton();
      vi.advanceTimersByTime(4000);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("clickLoadButton devrait cliquer si le bouton existe", async () => {
      const btn = document.createElement("button");
      btn.setAttribute("data-testid", "youtube-load-button");
      btn.click = vi.fn();

      // ⚠️ jsdom ne calcule pas offsetParent → on le force pour simuler un élément visible
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
