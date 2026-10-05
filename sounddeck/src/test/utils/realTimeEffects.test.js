// src/test/utils/realTimeEffects.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@shared/utils/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));

import {
  applyEffectsToBuffer,
  applyVolumeEffect,
  applyFadeInEffect,
  applyFadeOutEffect,
  applySpeedEffect,
  applyEchoEffect,
  applyReverbEffect,
  normalizeBuffer,
  getCachedEffectBuffer,
  setCachedEffectBuffer,
  clearEffectCache,
} from "@shared/utils/realTimeEffects";

// ─── MOCK AudioBuffer / AudioContext ───────────────────────────────────
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

class MockAudioContext {
  constructor() {
    this.state = "running";
  }
  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

const makeBuffer = ({
  channels = 1,
  length = 100,
  sampleRate = 44100,
  fill = 0.5,
} = {}) => {
  const buf = new MockAudioBuffer(channels, length, sampleRate);
  for (let c = 0; c < channels; c++) {
    buf._channels[c].fill(fill);
  }
  return buf;
};

beforeEach(() => {
  global.window.AudioContext = MockAudioContext;
  global.window.webkitAudioContext = MockAudioContext;
  clearEffectCache();
});

// ═══════════════════════════════════════════════════════════════════════
// applyEffectsToBuffer
// ═══════════════════════════════════════════════════════════════════════
describe("applyEffectsToBuffer", () => {
  it("retourne null/undefined tel quel", () => {
    expect(
      applyEffectsToBuffer(null, [
        { type: "volume", enabled: true, params: {} },
      ]),
    ).toBeNull();
    expect(applyEffectsToBuffer(undefined, [])).toBeUndefined();
  });

  it("retourne le buffer tel quel si effects est vide", () => {
    const buf = makeBuffer();
    expect(applyEffectsToBuffer(buf, [])).toBe(buf);
  });

  it("retourne le buffer tel quel si aucun effet actif", () => {
    const buf = makeBuffer();
    const effects = [{ type: "volume", enabled: false, params: { value: 2 } }];
    expect(applyEffectsToBuffer(buf, effects)).toBe(buf);
  });

  it("applique un seul effet volume", () => {
    const buf = makeBuffer({ fill: 0.3 });
    const effects = [{ type: "volume", enabled: true, params: { value: 2 } }];
    const result = applyEffectsToBuffer(buf, effects);
    expect(result).not.toBe(buf);
  });

  it("applique plusieurs effets en chaîne", () => {
    const buf = makeBuffer({ fill: 0.5, length: 1000 });
    const effects = [
      { type: "volume", enabled: true, params: { value: 0.5 } },
      { type: "fadeIn", enabled: true, params: { duration: 0.01 } },
      { type: "fadeOut", enabled: true, params: { duration: 0.01 } },
    ];
    const result = applyEffectsToBuffer(buf, effects);
    expect(result).toBeDefined();
    expect(result.numberOfChannels).toBe(1);
  });

  it("ignore un type inconnu sans crash", () => {
    const buf = makeBuffer();
    const effects = [{ type: "unknown-effect", enabled: true, params: {} }];
    const result = applyEffectsToBuffer(buf, effects);
    expect(result).toBeDefined();
  });

  it("retourne le buffer original en cas d'erreur", () => {
    // Force createBuffer à throw
    class BrokenCtx extends MockAudioContext {
      createBuffer() {
        throw new Error("boom");
      }
    }
    global.window.AudioContext = BrokenCtx;

    const buf = makeBuffer();
    const effects = [{ type: "volume", enabled: true, params: { value: 2 } }];
    expect(applyEffectsToBuffer(buf, effects)).toBe(buf);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applyVolumeEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applyVolumeEffect", () => {
  it("retourne le buffer tel quel si volume ≈ 1", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyVolumeEffect(buf, 1, ctx)).toBe(buf);
    expect(applyVolumeEffect(buf, 1.0005, ctx)).toBe(buf);
  });

  it("amplifie si volume > 1", () => {
    const buf = makeBuffer({ fill: 0.3 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, 2, ctx);
    expect(result.getChannelData(0)[0]).toBeCloseTo(0.6, 5);
  });

  it("atténue si volume < 1", () => {
    const buf = makeBuffer({ fill: 0.8 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, 0.5, ctx);
    expect(result.getChannelData(0)[0]).toBeCloseTo(0.4, 5);
  });

  it("clamp à 0 (volume négatif)", () => {
    const buf = makeBuffer({ fill: 0.5 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, -1, ctx);
    expect(result.getChannelData(0)[0]).toBe(0);
  });

  it("clamp à 5 max", () => {
    const buf = makeBuffer({ fill: 0.5 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, 100, ctx);
    expect(result.getChannelData(0)[0]).toBeCloseTo(1, 5); // 0.5*5=2.5 clampé à 1
  });

  it("clippe les valeurs > 1 dans le buffer", () => {
    const buf = makeBuffer({ fill: 0.9 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, 2, ctx);
    expect(result.getChannelData(0)[0]).toBe(1);
  });

  it("gère les buffers multi-canaux", () => {
    const buf = makeBuffer({ channels: 2, fill: 0.5 });
    const ctx = new MockAudioContext();
    const result = applyVolumeEffect(buf, 2, ctx);
    expect(result.numberOfChannels).toBe(2);
    expect(result.getChannelData(0)[0]).toBeCloseTo(1, 5);
    expect(result.getChannelData(1)[0]).toBeCloseTo(1, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applyFadeInEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applyFadeInEffect", () => {
  it("retourne le buffer si duration <= 0.05", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyFadeInEffect(buf, 0.01, ctx)).toBe(buf);
    expect(applyFadeInEffect(buf, 0, ctx)).toBe(buf);
  });

  it("applique un fade progressif", () => {
    // ✅ duration > 0.05 (sinon le code retourne le buffer tel quel)
    //    length=4410, sampleRate=44100 → 0.1s de buffer
    //    duration=0.09 → 3969 samples de fade (90% du buffer)
    const buf = makeBuffer({ fill: 1, length: 4410, sampleRate: 44100 });
    const ctx = new MockAudioContext();
    const result = applyFadeInEffect(buf, 0.09, ctx);
    const data = result.getChannelData(0);
    // Début très atténué
    expect(data[0]).toBeCloseTo(0, 2);
    // Fin du fade : pleine amplitude
    expect(data[data.length - 1]).toBeCloseTo(1, 2);
  });

  it("gère fadeSamples > length (fade sur tout le buffer)", () => {
    const buf = makeBuffer({ fill: 1, length: 100 });
    const ctx = new MockAudioContext();
    // duration=10 → 441000 samples > length=100 → branche "fade total"
    const result = applyFadeInEffect(buf, 10, ctx);
    const data = result.getChannelData(0);
    expect(data[0]).toBeCloseTo(0, 3);
    // ⚠️ Le code utilise i/length (pas i/(length-1)) → le dernier
    //    sample vaut (99/100)² = 0.9801, pas 1.
    expect(data[99]).toBeCloseTo(0.98, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applyFadeOutEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applyFadeOutEffect", () => {
  it("retourne le buffer si duration <= 0.05", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyFadeOutEffect(buf, 0.01, ctx)).toBe(buf);
  });

  it("applique un fade out progressif", () => {
    // ✅ duration > 0.05 (sinon retour buffer tel quel)
    const buf = makeBuffer({ fill: 1, length: 4410, sampleRate: 44100 });
    const ctx = new MockAudioContext();
    const result = applyFadeOutEffect(buf, 0.09, ctx);
    const data = result.getChannelData(0);
    // Début intact
    expect(data[0]).toBeCloseTo(1, 2);
    // Fin très atténuée
    expect(data[data.length - 1]).toBeCloseTo(0, 2);
  });

  it("gère fadeSamples > length", () => {
    const buf = makeBuffer({ fill: 1, length: 100 });
    const ctx = new MockAudioContext();
    const result = applyFadeOutEffect(buf, 10, ctx);
    const data = result.getChannelData(0);
    expect(data[0]).toBeCloseTo(1, 3);
    expect(data[99]).toBeCloseTo(0, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applySpeedEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applySpeedEffect", () => {
  it("retourne le buffer si speed === 1", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applySpeedEffect(buf, 1, ctx)).toBe(buf);
  });

  it("réduit la longueur si speed > 1", () => {
    const buf = makeBuffer({ length: 1000 });
    const ctx = new MockAudioContext();
    const result = applySpeedEffect(buf, 2, ctx);
    expect(result.length).toBe(500);
  });

  it("augmente la longueur si speed < 1", () => {
    const buf = makeBuffer({ length: 1000 });
    const ctx = new MockAudioContext();
    const result = applySpeedEffect(buf, 0.5, ctx);
    expect(result.length).toBe(2000);
  });

  it("clamp à 0.1 minimum", () => {
    const buf = makeBuffer({ length: 100 });
    const ctx = new MockAudioContext();
    const result = applySpeedEffect(buf, 0.001, ctx);
    expect(result.length).toBe(1000); // 100 / 0.1
  });

  it("clamp à 4 maximum", () => {
    const buf = makeBuffer({ length: 1000 });
    const ctx = new MockAudioContext();
    const result = applySpeedEffect(buf, 100, ctx);
    expect(result.length).toBe(250); // 1000 / 4
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applyEchoEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applyEchoEffect", () => {
  it("retourne le buffer si mix <= 0", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyEchoEffect(buf, 0.3, 0.5, 0, ctx)).toBe(buf);
  });

  it("allonge le buffer de delaySamples", () => {
    const buf = makeBuffer({ length: 4410, sampleRate: 44100 });
    const ctx = new MockAudioContext();
    const result = applyEchoEffect(buf, 0.1, 0.5, 0.5, ctx);
    // delay 0.1s * 44100 = 4410 échantillons en plus
    expect(result.length).toBe(4410 + 4410);
  });

  it("clamp delay entre 0.05 et 3", () => {
    const buf = makeBuffer({ length: 100, sampleRate: 1000 });
    const ctx = new MockAudioContext();
    const result = applyEchoEffect(buf, 100, 0.5, 0.5, ctx);
    // delay clampé à 3s → 3000 échantillons
    expect(result.length).toBe(100 + 3000);
  });

  it("applique le decay", () => {
    const buf = makeBuffer({ fill: 1, length: 100, sampleRate: 1000 });
    const ctx = new MockAudioContext();
    const result = applyEchoEffect(buf, 0.05, 0.5, 0.5, ctx);
    const data = result.getChannelData(0);
    // La première copie est atténuée par mix + decay
    expect(data[50]).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// applyReverbEffect
// ═══════════════════════════════════════════════════════════════════════
describe("applyReverbEffect", () => {
  it("retourne le buffer si mix <= 0", () => {
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyReverbEffect(buf, 0.5, 0, ctx)).toBe(buf);
  });

  it("retourne le buffer si mix <= 0", () => {
    // ⚠️ Le code clamp roomSize à 0.05 minimum → il ne renvoie le
    //    buffer early QUE si mix <= 0 (ou roomSize non testable = 0).
    const buf = makeBuffer();
    const ctx = new MockAudioContext();
    expect(applyReverbEffect(buf, 0.5, 0, ctx)).toBe(buf);
  });

  it("roomSize=0 est clampé à 0.05 et produit un nouveau buffer", () => {
    const buf = makeBuffer({ length: 1000 });
    const ctx = new MockAudioContext();
    const result = applyReverbEffect(buf, 0, 0.5, ctx);
    // Le clamp Math.max(0.05, ...) fait que la reverb s'applique
    expect(result).not.toBe(buf);
  });

  it("applique reverb sans crash", () => {
    const buf = makeBuffer({ fill: 0.5, length: 1000 });
    const ctx = new MockAudioContext();
    const result = applyReverbEffect(buf, 0.5, 0.3, ctx);
    expect(result.length).toBe(1000);
    expect(result.numberOfChannels).toBe(1);
  });

  it("clippe les valeurs après reverb", () => {
    const buf = makeBuffer({ fill: 0.9, length: 1000 });
    const ctx = new MockAudioContext();
    const result = applyReverbEffect(buf, 1, 0.9, ctx);
    const data = result.getChannelData(0);
    for (let i = 0; i < 100; i++) {
      expect(Math.abs(data[i])).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// normalizeBuffer
// ═══════════════════════════════════════════════════════════════════════
describe("normalizeBuffer", () => {
  it("retourne le buffer si maxPeak = 0", () => {
    const buf = makeBuffer({ fill: 0 });
    const ctx = new MockAudioContext();
    expect(normalizeBuffer(buf, ctx)).toBe(buf);
  });

  it("retourne le buffer si peak dans [0.1, 0.95]", () => {
    const buf = makeBuffer({ fill: 0.5 });
    const ctx = new MockAudioContext();
    expect(normalizeBuffer(buf, ctx)).toBe(buf);
  });

  it("réduit si peak > 0.95", () => {
    const buf = makeBuffer({ fill: 1.5 }); // > 0.95
    const ctx = new MockAudioContext();
    const result = normalizeBuffer(buf, ctx);
    expect(result).not.toBe(buf);
    expect(result.getChannelData(0)[0]).toBeCloseTo(0.95, 2);
  });

  it("amplifie si peak < 0.1", () => {
    const buf = makeBuffer({ fill: 0.05 });
    const ctx = new MockAudioContext();
    const result = normalizeBuffer(buf, ctx);
    expect(result).not.toBe(buf);
    // gain = min(0.3/0.05, 5) = 5 → 0.05*5 = 0.25
    expect(result.getChannelData(0)[0]).toBeCloseTo(0.25, 2);
  });

  it("clippe si amplification dépasse 1", () => {
    const buf = makeBuffer({ fill: 0.09 });
    const ctx = new MockAudioContext();
    const result = normalizeBuffer(buf, ctx);
    expect(result.getChannelData(0)[0]).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════
describe("cache d'effets", () => {
  it("retourne null si pas en cache", () => {
    expect(getCachedEffectBuffer("clip1", 0)).toBeNull();
  });

  it("stocke et récupère un buffer", () => {
    const buf = makeBuffer();
    setCachedEffectBuffer("clip1", buf, 0);
    expect(getCachedEffectBuffer("clip1", 0)).toBe(buf);
  });

  it("cache différencie les versions", () => {
    const buf1 = makeBuffer({ fill: 0.3 });
    const buf2 = makeBuffer({ fill: 0.6 });
    setCachedEffectBuffer("clip1", buf1, 0);
    setCachedEffectBuffer("clip1", buf2, 1);
    expect(getCachedEffectBuffer("clip1", 0)).toBe(buf1);
    expect(getCachedEffectBuffer("clip1", 1)).toBe(buf2);
  });

  it("clearEffectCache(clipId) efface uniquement ce clip", () => {
    setCachedEffectBuffer("clip1", makeBuffer(), 0);
    setCachedEffectBuffer("clip2", makeBuffer(), 0);
    clearEffectCache("clip1");
    expect(getCachedEffectBuffer("clip1", 0)).toBeNull();
    expect(getCachedEffectBuffer("clip2", 0)).not.toBeNull();
  });

  it("clearEffectCache() efface tout", () => {
    setCachedEffectBuffer("clip1", makeBuffer(), 0);
    setCachedEffectBuffer("clip2", makeBuffer(), 0);
    clearEffectCache();
    expect(getCachedEffectBuffer("clip1", 0)).toBeNull();
    expect(getCachedEffectBuffer("clip2", 0)).toBeNull();
  });

  it("évince quand > 100 entrées", () => {
    for (let i = 0; i < 120; i++) {
      setCachedEffectBuffer(`clip${i}`, makeBuffer(), 0);
    }
    // Les 50 premiers doivent être évincés (garde les 50 derniers)
    expect(getCachedEffectBuffer("clip0", 0)).toBeNull();
    expect(getCachedEffectBuffer("clip119", 0)).not.toBeNull();
  });
});
