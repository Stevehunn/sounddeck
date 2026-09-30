import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Mocks hoistés ──────────────────────────────────────────────────────
const mockGetSharedAudioContext = vi.hoisted(() => vi.fn());
const mockLoadAudioBufferShared = vi.hoisted(() => vi.fn());

vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("@shared/utils/audioContext", () => ({
  getSharedAudioContext: mockGetSharedAudioContext,
  loadAudioBuffer: mockLoadAudioBufferShared,
}));

import {
  useEditorAudioPlayback,
  computeLoopTiming,
  isClipInZone,
  findOverlappingPreviousClip,
} from "@features/editor/contexts/hooks/useEditorAudioPlayback";

// ═══════════════════════════════════════════════════════════════════════
// MOCKS AUDIO
// ═══════════════════════════════════════════════════════════════════════

function createMockAudioContext() {
  const sources = [];
  const gainNodes = [];

  return {
    state: "running",
    sampleRate: 44100,
    currentTime: 0,
    destination: { name: "destination" },
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => {
      const gainNode = {
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gainNodes.push(gainNode);
      return gainNode;
    }),
    _sources: sources,
    _gainNodes: gainNodes,
  };
}

function createMockAudioBuffer(duration = 3) {
  return {
    duration,
    sampleRate: 44100,
    length: Math.floor(duration * 44100),
    numberOfChannels: 2,
    getChannelData: vi.fn(() => new Float32Array(100)),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS PURS — computeLoopTiming
// ═══════════════════════════════════════════════════════════════════════

describe("computeLoopTiming", () => {
  it("devrait retourner loopTime=globalTime si timelineLoop désactivée", () => {
    const res = computeLoopTiming(5, { enabled: false });
    expect(res).toEqual({
      loopTime: 5,
      isInLoopZone: false,
      currentCycle: -1,
    });
  });

  it("devrait retourner isInLoopZone=false si timelineLoop absent", () => {
    const res = computeLoopTiming(5, null);
    expect(res.isInLoopZone).toBe(false);
    expect(res.loopTime).toBe(5);
  });

  it("devrait être DANS la zone au début du loop", () => {
    const loop = {
      enabled: true,
      start: 2,
      end: 8,
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    const res = computeLoopTiming(2, loop);
    expect(res.isInLoopZone).toBe(true);
    expect(res.loopTime).toBe(2);
    expect(res.currentCycle).toBe(0);
  });

  it("devrait être DANS la zone au milieu (manualDuration)", () => {
    const loop = {
      enabled: true,
      start: 2,
      end: 8,
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    // globalTime = 7 → elapsed = 5 → positionInCycle = 5 % 6 = 5
    const res = computeLoopTiming(7, loop);
    expect(res.isInLoopZone).toBe(true);
    expect(res.currentCycle).toBe(0);
    expect(res.loopTime).toBe(7);
  });

  it("devrait être HORS zone si elapsed < 0", () => {
    const loop = {
      enabled: true,
      start: 5,
      end: 10,
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    const res = computeLoopTiming(3, loop);
    expect(res.isInLoopZone).toBe(false);
    expect(res.loopTime).toBe(3);
    expect(res.currentCycle).toBe(-1);
  });

  it("devrait être HORS zone si elapsed >= maxLoopDuration", () => {
    const loop = {
      enabled: true,
      start: 0,
      end: 5,
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    const res = computeLoopTiming(10, loop);
    expect(res.isInLoopZone).toBe(false);
  });

  it('devrait calculer maxLoopDuration avec mode "cycles"', () => {
    const loop = {
      enabled: true,
      start: 0,
      end: 4,
      durationMode: "cycles",
      cycleCount: 3,
    };
    // loopTotalDuration = 4, cycles = 3 → maxLoopDuration = 12
    const res = computeLoopTiming(11, loop);
    expect(res.isInLoopZone).toBe(true);

    const res2 = computeLoopTiming(12, loop);
    expect(res2.isInLoopZone).toBe(false);
  });

  it("devrait calculer currentCycle correctement (mode cycles)", () => {
    const loop = {
      enabled: true,
      start: 0,
      end: 4,
      durationMode: "cycles",
      cycleCount: 3,
    };
    // globalTime = 9 → elapsed = 9, positionInCycle = 9 % 4 = 1, cycle = 2
    const res = computeLoopTiming(9, loop);
    expect(res.isInLoopZone).toBe(true);
    expect(res.currentCycle).toBe(2);
    expect(res.loopTime).toBe(1);
  });

  it("devrait utiliser 10 par défaut pour manualDuration", () => {
    const loop = {
      enabled: true,
      start: 0,
      end: 5,
      durationMode: "manualDuration",
    };
    const res = computeLoopTiming(11, loop);
    // maxLoopDuration défaut = 10 → 11 > 10 → hors zone
    expect(res.isInLoopZone).toBe(false);
  });

  it("devrait utiliser 3 par défaut pour cycleCount", () => {
    const loop = {
      enabled: true,
      start: 0,
      end: 4,
      durationMode: "cycles",
    };
    // maxLoopDuration = 4 * 3 = 12
    const res = computeLoopTiming(11, loop);
    expect(res.isInLoopZone).toBe(true);
  });

  it("devrait utiliser end=10 par défaut si absent", () => {
    const loop = {
      enabled: true,
      start: 0,
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    // loopTotalDuration = 10 - 0 = 10
    const res = computeLoopTiming(5, loop);
    expect(res.isInLoopZone).toBe(true);
  });

  it("devrait gérer loopTotalDuration minimum de 0.1", () => {
    const loop = {
      enabled: true,
      start: 5,
      end: 5, // → 0 → mais forcé à 0.1
      durationMode: "manualDuration",
      manualDuration: 10,
    };
    const res = computeLoopTiming(5, loop);
    expect(res.isInLoopZone).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS PURS — isClipInZone
// ═══════════════════════════════════════════════════════════════════════

describe("isClipInZone", () => {
  it("devrait retourner true si le clip chevauche le début", () => {
    expect(isClipInZone(0, 5, 2, 10)).toBe(true);
  });

  it("devrait retourner true si le clip chevauche la fin", () => {
    expect(isClipInZone(8, 15, 0, 10)).toBe(true);
  });

  it("devrait retourner true si le clip englobe la zone", () => {
    expect(isClipInZone(0, 20, 5, 10)).toBe(true);
  });

  it("devrait retourner true si le clip est entièrement dans la zone", () => {
    expect(isClipInZone(3, 7, 0, 10)).toBe(true);
  });

  it("devrait retourner false si le clip est avant la zone", () => {
    expect(isClipInZone(0, 3, 5, 10)).toBe(false);
  });

  it("devrait retourner false si le clip est après la zone", () => {
    expect(isClipInZone(12, 15, 0, 10)).toBe(false);
  });

  it("devrait retourner true pour un point exact à loopStart", () => {
    expect(isClipInZone(5, 5, 5, 10)).toBe(true);
  });

  it("devrait retourner true pour un clip qui finit à loopEnd", () => {
    expect(isClipInZone(5, 10, 0, 10)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS PURS — findOverlappingPreviousClip
// ═══════════════════════════════════════════════════════════════════════

describe("findOverlappingPreviousClip", () => {
  const createClip = (o = {}) => ({ id: "c1", start: 0, duration: 3, ...o });

  it("devrait retourner null si projet vide", () => {
    expect(findOverlappingPreviousClip(createClip(), null, {})).toBeNull();
    expect(findOverlappingPreviousClip(createClip(), {}, {})).toBeNull();
  });

  it("devrait retourner null si aucune track", () => {
    expect(
      findOverlappingPreviousClip(createClip(), { tracks: [] }, {}),
    ).toBeNull();
  });

  it("devrait ignorer les tracks muted", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          muted: true,
          clips: [createClip({ id: "prev", start: 0, duration: 5 })],
        },
      ],
    };
    const clip = createClip({ id: "curr", start: 3, duration: 3 });
    expect(findOverlappingPreviousClip(clip, project, {})).toBeNull();
  });

  it("devrait ignorer le clip lui-même", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [createClip({ id: "same", start: 0, duration: 5 })],
        },
      ],
    };
    const clip = createClip({ id: "same", start: 0, duration: 5 });
    expect(findOverlappingPreviousClip(clip, project, {})).toBeNull();
  });

  it("devrait trouver un clip qui finit APRÈS le début du clip courant", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [createClip({ id: "prev", start: 0, duration: 5 })],
        },
      ],
    };
    const clip = createClip({ id: "curr", start: 3, duration: 3 });
    const res = findOverlappingPreviousClip(clip, project, {});
    expect(res).not.toBeNull();
    expect(res.clip.id).toBe("prev");
    expect(res.track.id).toBe("t1");
  });

  it("devrait ignorer un clip qui finit AVANT le début du clip courant", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [createClip({ id: "prev", start: 0, duration: 2 })],
        },
      ],
    };
    // clip courant commence à 3, prev finit à 2 → pas de chevauchement
    const clip = createClip({ id: "curr", start: 3, duration: 3 });
    expect(findOverlappingPreviousClip(clip, project, {})).toBeNull();
  });

  it("devrait prendre le clip avec start le plus élevé en cas de matchs multiples", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [
            createClip({ id: "old", start: 0, duration: 6 }),
            createClip({ id: "recent", start: 2, duration: 6 }),
          ],
        },
      ],
    };
    const clip = createClip({ id: "curr", start: 4, duration: 3 });
    const res = findOverlappingPreviousClip(clip, project, {});
    expect(res.clip.id).toBe("recent");
  });

  it("devrait utiliser clipDurations en priorité", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [createClip({ id: "prev", start: 0, duration: 2 })],
        },
      ],
    };
    const clip = createClip({ id: "curr", start: 4, duration: 2 });
    // Sans clipDurations : pas de chevauchement
    expect(findOverlappingPreviousClip(clip, project, {})).toBeNull();
    // Avec clipDurations.pag = 6 → prev finit à 6 > 4 → chevauchement
    const res = findOverlappingPreviousClip(clip, project, { prev: 6 });
    expect(res).not.toBeNull();
  });

  it("devrait ignorer un clip postérieur au clip courant (c.start >= clip.start)", () => {
    const project = {
      tracks: [
        {
          id: "t1",
          clips: [createClip({ id: "later", start: 10, duration: 3 })],
        },
      ],
    };
    const clip = createClip({ id: "curr", start: 3, duration: 3 });
    expect(findOverlappingPreviousClip(clip, project, {})).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// HOOK useEditorAudioPlayback
// ═══════════════════════════════════════════════════════════════════════

describe("useEditorAudioPlayback", () => {
  let core;
  let mockCtx;
  let rafCallbacks;

  const createClip = (o = {}) => ({
    id: "c1",
    name: "Clip",
    path: "/a.mp3",
    start: 0,
    duration: 3,
    offset: 0,
    volume: 0,
    effects: [],
    ...o,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];

    // RAF : no-op (stocke juste les callbacks sans les exécuter)
    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    global.cancelAnimationFrame = vi.fn((id) => {
      if (id > 0) rafCallbacks[id - 1] = null;
    });

    mockCtx = createMockAudioContext();
    mockGetSharedAudioContext.mockReturnValue(mockCtx);
    mockLoadAudioBufferShared.mockResolvedValue(createMockAudioBuffer(3));

    core = {
      projectRef: {
        current: {
          id: "p-1",
          tracks: [
            { id: "t1", name: "Track 1", clips: [], volume: 1, muted: false },
          ],
        },
      },
      clipDurationsRef: { current: {} },
      totalDurationRef: { current: 10 },
      autoCrossfadeRef: { current: false },
      loopStateRef: {
        current: { clips: {}, tracks: {}, timeline: { enabled: false } },
      },
      soloPlayClipIdRef: { current: null },
      currentTimeRef: { current: 0 },
      isPlayingRef: { current: false },
      isPausedRef: { current: false },
      masterGainRef: { current: 1 },
      stopAtTimeRef: { current: null },
      setCurrentTime: vi.fn((t) => {
        core.currentTimeRef.current = t;
      }),
      setIsPlaying: vi.fn((v) => {
        core.isPlayingRef.current = v;
      }),
      setIsPaused: vi.fn((v) => {
        core.isPausedRef.current = v;
      }),
      setStopAtTime: vi.fn((v) => {
        core.stopAtTimeRef.current = v;
      }),
      setSoloPlayClipId: vi.fn((v) => {
        core.soloPlayClipIdRef.current = v;
      }),
      masterGain: 1,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = () => renderHook(() => useEditorAudioPlayback(core));

  // ─── Structure ─────────────────────────────────────────────────────

  describe("structure de retour", () => {
    it("devrait exposer toutes les méthodes", () => {
      const { result } = render();

      expect(result.current.audioContextRef).toBeDefined();
      expect(result.current.audioSourcesRef).toBeDefined();
      expect(result.current.animationRef).toBeDefined();
      expect(typeof result.current.loadAudioBuffer).toBe("function");
      expect(typeof result.current.playClip).toBe("function");
      expect(typeof result.current.startPlaybackLoop).toBe("function");
      expect(typeof result.current.play).toBe("function");
      expect(typeof result.current.playClipOnly).toBe("function");
      expect(typeof result.current.resume).toBe("function");
      expect(typeof result.current.pause).toBe("function");
      expect(typeof result.current.stop).toBe("function");
      expect(typeof result.current.seek).toBe("function");
      expect(typeof result.current.togglePlay).toBe("function");
      expect(typeof result.current.updateMasterGain).toBe("function");
      expect(typeof result.current.updateTrackVolume).toBe("function");
    });
  });

  // ─── loadAudioBuffer ───────────────────────────────────────────────

  describe("loadAudioBuffer", () => {
    it("devrait déléguer à loadAudioBufferShared", async () => {
      const { result } = render();

      let buffer;
      await act(async () => {
        buffer = await result.current.loadAudioBuffer("/test.mp3");
      });

      expect(mockLoadAudioBufferShared).toHaveBeenCalledWith("/test.mp3");
      expect(buffer).not.toBeNull();
      expect(buffer.duration).toBe(3);
    });
  });

  // ─── play ──────────────────────────────────────────────────────────

  describe("play", () => {
    it("devrait reset currentTime à 0", async () => {
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(core.setCurrentTime).toHaveBeenCalledWith(0);
      expect(core.currentTimeRef.current).toBe(0);
    });

    it("devrait activer isPlaying et désactiver isPaused", async () => {
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
      expect(core.setIsPaused).toHaveBeenCalledWith(false);
      expect(core.isPlayingRef.current).toBe(true);
      expect(core.isPausedRef.current).toBe(false);
    });

    it("devrait reset stopAtTime", async () => {
      core.stopAtTimeRef.current = 5;
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(core.setStopAtTime).toHaveBeenCalledWith(null);
    });

    it("devrait resume le contexte si suspended", async () => {
      mockCtx.state = "suspended";
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it("ne devrait pas resume si le contexte est running", async () => {
      mockCtx.state = "running";
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(mockCtx.resume).not.toHaveBeenCalled();
    });

    it("devrait gérer les erreurs", async () => {
      mockGetSharedAudioContext.mockImplementation(() => {
        throw new Error("ctx failed");
      });
      const { result } = render();

      await act(async () => {
        await result.current.play();
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(false);
      expect(core.isPlayingRef.current).toBe(false);
    });
  });

  // ─── pause ─────────────────────────────────────────────────────────

  describe("pause", () => {
    it("devrait activer isPaused et désactiver isPlaying", () => {
      core.isPlayingRef.current = true;
      const { result } = render();

      act(() => {
        result.current.pause();
      });

      expect(core.setIsPaused).toHaveBeenCalledWith(true);
      expect(core.setIsPlaying).toHaveBeenCalledWith(false);
    });

    it("devrait cancelAnimationFrame si animationRef existe", () => {
      const { result } = render();
      result.current.animationRef.current = 123;

      act(() => {
        result.current.pause();
      });

      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it("devrait stop toutes les sources", () => {
      const { result } = render();
      const fakeSource = {
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      result.current.audioSourcesRef.current = {
        c1: {
          source: fakeSource,
          gainNode: { disconnect: vi.fn() },
        },
      };

      act(() => {
        result.current.pause();
      });

      expect(fakeSource.stop).toHaveBeenCalled();
      expect(result.current.audioSourcesRef.current).toEqual({});
    });
  });

  // ─── stop ──────────────────────────────────────────────────────────

  describe("stop", () => {
    it("devrait reset tout", () => {
      core.isPlayingRef.current = true;
      core.isPausedRef.current = true;
      const { result } = render();

      act(() => {
        result.current.stop();
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(false);
      expect(core.setIsPaused).toHaveBeenCalledWith(false);
      expect(core.setCurrentTime).toHaveBeenCalledWith(0);
      expect(core.currentTimeRef.current).toBe(0);
      expect(core.setStopAtTime).toHaveBeenCalledWith(null);
      expect(core.setSoloPlayClipId).toHaveBeenCalledWith(null);
    });

    it("devrait stop toutes les sources", () => {
      const { result } = render();
      const fakeSource = {
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      result.current.audioSourcesRef.current = {
        c1: { source: fakeSource, gainNode: { disconnect: vi.fn() } },
      };

      act(() => {
        result.current.stop();
      });

      expect(fakeSource.stop).toHaveBeenCalled();
    });
  });

  // ─── seek ──────────────────────────────────────────────────────────

  describe("seek", () => {
    it("devrait mettre à jour currentTime", () => {
      const { result } = render();

      act(() => {
        result.current.seek(5);
      });

      expect(core.setCurrentTime).toHaveBeenCalledWith(5);
      expect(core.currentTimeRef.current).toBe(5);
    });

    it("devrait clamper à 0 minimum", () => {
      const { result } = render();

      act(() => {
        result.current.seek(-10);
      });

      expect(core.currentTimeRef.current).toBe(0);
    });

    it("devrait clamper à totalDurationRef.current maximum", () => {
      core.totalDurationRef.current = 20;
      const { result } = render();

      act(() => {
        result.current.seek(100);
      });

      expect(core.currentTimeRef.current).toBe(20);
    });

    it("devrait stop toutes les sources", () => {
      const { result } = render();
      const fakeSource = {
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      result.current.audioSourcesRef.current = {
        c1: { source: fakeSource, gainNode: { disconnect: vi.fn() } },
      };

      act(() => {
        result.current.seek(5);
      });

      expect(fakeSource.stop).toHaveBeenCalled();
    });
  });

  // ─── togglePlay ────────────────────────────────────────────────────

  describe("togglePlay", () => {
    it("devrait pause si isPlaying", async () => {
      core.isPlayingRef.current = true;
      const { result } = render();

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(core.setIsPaused).toHaveBeenCalledWith(true);
      expect(core.setIsPlaying).toHaveBeenCalledWith(false);
    });

    it("devrait resume si isPaused", async () => {
      core.isPlayingRef.current = false;
      core.isPausedRef.current = true;
      const { result } = render();

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(core.setIsPaused).toHaveBeenCalledWith(false);
      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
    });

    it("devrait play si ni playing ni paused", async () => {
      const { result } = render();

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
      expect(core.setSoloPlayClipId).toHaveBeenCalledWith(null);
      expect(core.setCurrentTime).toHaveBeenCalledWith(0);
    });
  });

  // ─── resume ────────────────────────────────────────────────────────

  describe("resume", () => {
    it("devrait désactiver isPaused et activer isPlaying", async () => {
      const { result } = render();

      await act(async () => {
        await result.current.resume();
      });

      expect(core.setIsPaused).toHaveBeenCalledWith(false);
      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
    });

    it("devrait resume le contexte si suspended", async () => {
      mockCtx.state = "suspended";
      const { result } = render();

      await act(async () => {
        await result.current.resume();
      });

      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it("ne devrait pas planter si resume throw", async () => {
      mockCtx.resume.mockRejectedValue(new Error("nope"));
      const { result } = render();

      await act(async () => {
        await result.current.resume();
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
    });
  });

  // ─── playClipOnly ──────────────────────────────────────────────────

  describe("playClipOnly", () => {
    it("devrait définir soloPlayClipId", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", start: 2, duration: 3 });

      await act(async () => {
        await result.current.playClipOnly(clip, "t1");
      });

      expect(core.setSoloPlayClipId).toHaveBeenCalledWith("c1");
      expect(core.soloPlayClipIdRef.current).toBe("c1");
    });

    it("devrait setter currentTime au start du clip", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", start: 4, duration: 3 });

      await act(async () => {
        await result.current.playClipOnly(clip, "t1");
      });

      expect(core.setCurrentTime).toHaveBeenCalledWith(4);
    });

    it("devrait setter stopAtTime à start + duration", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", start: 2, duration: 3 });

      await act(async () => {
        await result.current.playClipOnly(clip, "t1");
      });

      expect(core.setStopAtTime).toHaveBeenCalledWith(5);
    });

    it("devrait utiliser clipDurationsRef pour la durée", async () => {
      core.clipDurationsRef.current = { c1: 5 };
      const { result } = render();
      const clip = createClip({ id: "c1", start: 2, duration: 3 });

      await act(async () => {
        await result.current.playClipOnly(clip, "t1");
      });

      expect(core.setStopAtTime).toHaveBeenCalledWith(7); // 2 + 5
    });

    it("devrait activer isPlaying", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", start: 0, duration: 3 });

      await act(async () => {
        await result.current.playClipOnly(clip, "t1");
      });

      expect(core.setIsPlaying).toHaveBeenCalledWith(true);
      expect(core.isPlayingRef.current).toBe(true);
    });
  });

  // ─── updateMasterGain ──────────────────────────────────────────────

  describe("updateMasterGain", () => {
    it("devrait ne rien faire si aucune source", () => {
      const { result } = render();
      expect(() => {
        act(() => {
          result.current.updateMasterGain(0.5);
        });
      }).not.toThrow();
    });

    it("devrait mettre à jour le gain de toutes les sources", () => {
      const { result } = render();
      const gainNode1 = { gain: { value: 1 } };
      const gainNode2 = { gain: { value: 1 } };
      result.current.audioSourcesRef.current = {
        c1: { source: {}, gainNode: gainNode1 },
        c2: { source: {}, gainNode: gainNode2 },
      };

      act(() => {
        result.current.updateMasterGain(0.7);
      });

      // Par défaut track volume = 1 → 1 * 0.7 = 0.7
      expect(gainNode1.gain.value).toBe(0.7);
      expect(gainNode2.gain.value).toBe(0.7);
    });

    it("devrait multiplier par le volume de la track", () => {
      const { result } = render();
      core.projectRef.current.tracks[0].volume = 0.5;
      core.projectRef.current.tracks[0].clips = [{ id: "c1" }];
      const gainNode = { gain: { value: 1 } };
      result.current.audioSourcesRef.current = {
        c1: { source: {}, gainNode },
      };

      act(() => {
        result.current.updateMasterGain(0.8);
      });

      // 0.5 * 0.8 = 0.4
      expect(gainNode.gain.value).toBe(0.4);
    });
  });

  // ─── updateTrackVolume ─────────────────────────────────────────────

  describe("updateTrackVolume", () => {
    it("devrait ne rien faire si aucune source", () => {
      const { result } = render();
      expect(() => {
        act(() => {
          result.current.updateTrackVolume("t1", 0.5);
        });
      }).not.toThrow();
    });

    it("devrait mettre à jour le gain de la track ciblée", () => {
      const { result } = render();
      core.masterGainRef.current = 1;
      core.projectRef.current.tracks[0].clips = [{ id: "c1" }];

      const gainNode = { gain: { value: 1 } };
      result.current.audioSourcesRef.current = {
        c1: { source: {}, gainNode },
      };

      act(() => {
        result.current.updateTrackVolume("t1", 0.5);
      });

      expect(gainNode.gain.value).toBe(0.5);
    });

    it("devrait multiplier par masterGainRef", () => {
      const { result } = render();
      core.masterGainRef.current = 0.8;
      core.projectRef.current.tracks[0].clips = [{ id: "c1" }];

      const gainNode = { gain: { value: 1 } };
      result.current.audioSourcesRef.current = {
        c1: { source: {}, gainNode },
      };

      act(() => {
        result.current.updateTrackVolume("t1", 0.5);
      });

      // 0.5 * 0.8 = 0.4
      expect(gainNode.gain.value).toBe(0.4);
    });

    it("ne devrait rien faire si la track ne correspond pas", () => {
      const { result } = render();
      core.projectRef.current.tracks[0].clips = [{ id: "c1" }];

      const gainNode = { gain: { value: 1 } };
      result.current.audioSourcesRef.current = {
        c1: { source: {}, gainNode },
      };

      act(() => {
        result.current.updateTrackVolume("unknown", 0.5);
      });

      expect(gainNode.gain.value).toBe(1);
    });
  });

  // ─── playClip ──────────────────────────────────────────────────────

  describe("playClip", () => {
    it("devrait ne rien faire si clip.path absent", async () => {
      const { result } = render();
      const clip = { id: "c1", name: "X", start: 0, duration: 3 };

      await act(async () => {
        await result.current.playClip(clip, {});
      });

      expect(mockLoadAudioBufferShared).not.toHaveBeenCalled();
    });

    it("devrait charger le buffer et créer une source", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", path: "/a.mp3" });
      const track = { id: "t1", volume: 1 };

      await act(async () => {
        await result.current.playClip(clip, track);
      });

      expect(mockLoadAudioBufferShared).toHaveBeenCalledWith("/a.mp3");
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it("devrait stocker la source dans audioSourcesRef", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", path: "/a.mp3" });

      await act(async () => {
        await result.current.playClip(clip, { id: "t1", volume: 1 });
      });

      expect(result.current.audioSourcesRef.current.c1).toBeDefined();
      expect(result.current.audioSourcesRef.current.c1.source).toBeDefined();
      expect(result.current.audioSourcesRef.current.c1.gainNode).toBeDefined();
    });

    it("devrait appeler source.start", async () => {
      const { result } = render();
      const clip = createClip({ id: "c1", path: "/a.mp3" });

      await act(async () => {
        await result.current.playClip(clip, { id: "t1", volume: 1 });
      });

      const source = result.current.audioSourcesRef.current.c1.source;
      expect(source.start).toHaveBeenCalled();
    });

    it("devrait retourner tôt si loadAudioBuffer retourne null", async () => {
      mockLoadAudioBufferShared.mockResolvedValue(null);
      const { result } = render();
      const clip = createClip({ id: "c1", path: "/a.mp3" });

      await act(async () => {
        await result.current.playClip(clip, { id: "t1", volume: 1 });
      });

      expect(result.current.audioSourcesRef.current.c1).toBeUndefined();
    });

    it("devrait calculer le gain à partir du volume track × masterGain", async () => {
      // ✅ On modifie le STATE (core.masterGain) AVANT le render,
      //    le useEffect au mount sync masterGainRef.current = 0.5
      core.masterGain = 0.5;
      const { result } = render();
      const clip = createClip({ id: "c1", path: "/a.mp3" });

      await act(async () => {
        await result.current.playClip(clip, { id: "t1", volume: 0.8 });
      });

      const gainNode = result.current.audioSourcesRef.current.c1.gainNode;
      // 0.8 * 0.5 = 0.4
      expect(gainNode.gain.value).toBe(0.4);
    });

    it("devrait stopper la source existante avant de rejouer", async () => {
      const { result } = render();
      const existingSource = {
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: vi.fn(),
      };
      result.current.audioSourcesRef.current = {
        c1: { source: existingSource, gainNode: { disconnect: vi.fn() } },
      };

      const clip = createClip({ id: "c1", path: "/a.mp3" });

      await act(async () => {
        await result.current.playClip(clip, { id: "t1", volume: 1 });
      });

      expect(existingSource.stop).toHaveBeenCalled();
    });
  });
});
