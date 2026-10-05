// src/test/utils/mixdown.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@shared/utils/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("@shared/utils/wavEncoder", () => ({
  audioBufferToWav: vi.fn(() => new ArrayBuffer(44)),
}));

vi.mock("@shared/utils/fileExport", () => ({
  saveAudioBuffer: vi
    .fn()
    .mockResolvedValue({ success: true, path: "/out.wav" }),
}));

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: vi.fn((p) => `file://${p}`),
}));

import { mixdownProject, exportMixdown } from "@shared/utils/mixdown";
import { saveAudioBuffer } from "@shared/utils/fileExport";

// ─── MOCKS AUDIO ───────────────────────────────────────────────────────
class MockAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channels = Array.from(
      { length: channels },
      () => new Float32Array(length),
    );
  }
  getChannelData(ch) {
    return this._channels[ch];
  }
}

class MockOfflineAudioContext {
  constructor(channels, length, sampleRate) {
    this.destination = { __type: "destination" };
    this._sources = [];
    this._sampleRate = sampleRate;
    this._length = length;
  }
  createBufferSource() {
    const src = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
    this._sources.push(src);
    return src;
  }
  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
    };
  }
  decodeAudioData() {
    return Promise.resolve(new MockAudioBuffer(1, 1000, 44100));
  }
  startRendering() {
    return Promise.resolve(
      new MockAudioBuffer(2, this._length, this._sampleRate),
    );
  }
}

const makeProject = (overrides = {}) => ({
  tracks: [
    {
      id: "t1",
      volume: 1,
      muted: false,
      solo: false,
      clips: [
        {
          id: "c1",
          name: "Clip 1",
          path: "/sounds/a.mp3",
          start: 0,
          duration: 2,
        },
      ],
    },
  ],
  ...overrides,
});

const clipDurations = { c1: 2 };

beforeEach(() => {
  global.window.OfflineAudioContext = MockOfflineAudioContext;
  global.window.AudioContext = MockOfflineAudioContext;
  global.window.webkitAudioContext = MockOfflineAudioContext;
  saveAudioBuffer
    .mockReset()
    .mockResolvedValue({ success: true, path: "/out.wav" });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
  });
});

// ═══════════════════════════════════════════════════════════════════════
// mixdownProject
// ═══════════════════════════════════════════════════════════════════════
describe("mixdownProject", () => {
  it("throw si project est null", async () => {
    await expect(mixdownProject(null, {})).rejects.toThrow("Projet vide");
  });

  it("throw si tracks est vide", async () => {
    await expect(mixdownProject({ tracks: [] }, {})).rejects.toThrow(
      "Projet vide",
    );
  });

  it("throw si aucun clip dans la sélection", async () => {
    const project = { tracks: [{ id: "t1", clips: [] }] };
    await expect(mixdownProject(project, {})).rejects.toThrow();
  });

  it("mixdown un clip simple", async () => {
    const project = makeProject();
    const result = await mixdownProject(project, clipDurations);
    expect(result).toBeDefined();
    expect(result.numberOfChannels).toBe(2);
  });

  it("appelle onProgress pour chaque clip", async () => {
    const onProgress = vi.fn();
    await mixdownProject(makeProject(), clipDurations, 44100, onProgress);
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("skip les clips mute", async () => {
    const project = makeProject({
      tracks: [
        {
          id: "t1",
          muted: true,
          clips: [{ id: "c1", path: "/sounds/a.mp3", start: 0, duration: 2 }],
        },
      ],
    });
    const onProgress = vi.fn();
    const result = await mixdownProject(
      project,
      clipDurations,
      44100,
      onProgress,
    );
    expect(result).toBeDefined();
  });

  it("respecte le solo : skip les autres pistes", async () => {
    const project = {
      tracks: [
        {
          id: "t1",
          solo: true,
          clips: [{ id: "c1", path: "/a.mp3", start: 0, duration: 2 }],
        },
        {
          id: "t2",
          solo: false,
          clips: [{ id: "c2", path: "/b.mp3", start: 0, duration: 2 }],
        },
      ],
    };
    const result = await mixdownProject(project, { c1: 2, c2: 2 });
    expect(result).toBeDefined();
  });

  it("gère exportStart > 0", async () => {
    const project = makeProject();
    const result = await mixdownProject(
      project,
      clipDurations,
      44100,
      null,
      1,
      3,
    );
    expect(result).toBeDefined();
  });

  it("skip les clips hors de la plage export", async () => {
    const project = makeProject({
      tracks: [
        {
          id: "t1",
          clips: [
            // c1 : ENTIÈREMENT dans [5, 8] → gardé
            { id: "c1", path: "/a.mp3", start: 5, duration: 2 },
            // c2 : ENTIÈREMENT après exportEnd → skip
            { id: "c2", path: "/b.mp3", start: 10, duration: 1 },
          ],
        },
      ],
    });
    const onProgress = vi.fn();
    const result = await mixdownProject(
      project,
      { c1: 2, c2: 1 },
      44100,
      onProgress,
      5,
      8,
    );
    expect(result).toBeDefined();
    // ✅ c1 doit être traité (au moins une progress)
    expect(onProgress).toHaveBeenCalled();
  });

  it("throw si tous les clips sont hors de la plage export", async () => {
    const project = makeProject({
      tracks: [
        {
          id: "t1",
          clips: [
            { id: "c1", path: "/a.mp3", start: 0, duration: 1 },
            { id: "c2", path: "/b.mp3", start: 100, duration: 1 },
          ],
        },
      ],
    });
    await expect(
      mixdownProject(project, { c1: 1, c2: 1 }, 44100, null, 5, 8),
    ).rejects.toThrow("Aucun clip à mixer dans la sélection");
  });

  it("gère erreur de fetch (clip skip silencieux)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const project = makeProject();
    const result = await mixdownProject(project, clipDurations);
    expect(result).toBeDefined();
  });

  it("gère erreur startRendering", async () => {
    class BrokenOffline extends MockOfflineAudioContext {
      startRendering() {
        return Promise.reject(new Error("render fail"));
      }
    }
    global.window.OfflineAudioContext = BrokenOffline;
    await expect(mixdownProject(makeProject(), clipDurations)).rejects.toThrow(
      "Erreur lors du rendu audio",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// exportMixdown
// ═══════════════════════════════════════════════════════════════════════
describe("exportMixdown", () => {
  const buffer = new MockAudioBuffer(2, 1000, 44100);

  it("retourne success=false sans outputPath", async () => {
    const result = await exportMixdown(buffer, "wav", 192, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("manquant");
  });

  it("exporte en WAV directement", async () => {
    saveAudioBuffer.mockResolvedValue({ success: true, path: "/out.wav" });
    const result = await exportMixdown(buffer, "wav", 192, "/out.wav");
    expect(result.success).toBe(true);
    expect(result.path).toBe("/out.wav");
  });

  it("exporte MP3 via convertAudio", async () => {
    global.window.electronAPI = {
      convertAudio: vi.fn().mockResolvedValue({ success: true, size: 5000 }),
      deleteSoundFile: vi.fn().mockResolvedValue(undefined),
    };
    saveAudioBuffer.mockResolvedValue({ success: true, path: "/tmp.wav" });
    const result = await exportMixdown(buffer, "mp3", 192, "/out.mp3");
    expect(result.success).toBe(true);
    expect(result.format).toBe("mp3");
  });

  it("fallback en WAV si conversion MP3 échoue", async () => {
    global.window.electronAPI = {
      convertAudio: vi.fn().mockResolvedValue({ success: false }),
      deleteSoundFile: vi.fn(),
    };
    saveAudioBuffer.mockResolvedValue({ success: true, path: "/tmp.wav" });
    const result = await exportMixdown(buffer, "mp3", 192, "/out.mp3");
    expect(result.success).toBe(true);
    expect(result.format).toBe("wav");
  });

  it("fallback en WAV si convertAudio throw", async () => {
    global.window.electronAPI = {
      convertAudio: vi.fn().mockRejectedValue(new Error("crash")),
      deleteSoundFile: vi.fn(),
    };
    saveAudioBuffer.mockResolvedValue({ success: true, path: "/x.wav" });
    const result = await exportMixdown(buffer, "mp3", 192, "/out.mp3");
    expect(result.success).toBe(true);
  });

  it("appelle onProgress", async () => {
    const onProgress = vi.fn();
    await exportMixdown(buffer, "wav", 192, "/out.wav", onProgress);
    expect(onProgress).toHaveBeenCalledWith(0.1);
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it("retourne erreur si tout échoue", async () => {
    // Force saveAudioBuffer à throw ET le fallback
    saveAudioBuffer.mockRejectedValue(new Error("disk full"));
    global.window.electronAPI = null;
    const result = await exportMixdown(buffer, "wav", 192, "/out.wav");
    expect(result.success).toBe(false);
  });
});
