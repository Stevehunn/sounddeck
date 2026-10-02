// src/test/core/services/AudioMixerService.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// MOCKS AUDIO
// ═══════════════════════════════════════════════════════════════════════

function createGainNode(initialValue = 1) {
  return {
    gain: {
      value: initialValue,
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMediaStreamDestination() {
  const track = { stop: vi.fn(), kind: "audio", id: "mock-track" };
  const stream = {
    active: true,
    id: "mock-mixed-stream",
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
  };
  return {
    stream,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

class MockAudioContext {
  constructor() {
    this.state = "running";
    this.sampleRate = 44100;
    this.currentTime = 0;
    this._closeHandlers = [];

    this.audioWorklet = {
      addModule: vi.fn().mockResolvedValue(undefined),
    };

    this.createGain = vi.fn(() => createGainNode());
    this.createMediaStreamDestination = vi.fn(() =>
      createMediaStreamDestination(),
    );
    this.createMediaStreamSource = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    this.createBufferSource = vi.fn(() => ({
      buffer: null,
      loop: false,
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
    }));
    this.createBuffer = vi.fn(() => ({ duration: 0.1 }));
    this.createBiquadFilter = vi.fn(() => ({
      type: "lowpass",
      frequency: { value: 350 },
      Q: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    this.createDynamicsCompressor = vi.fn(() => ({
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    this.resume = vi.fn().mockResolvedValue(undefined);
    this.suspend = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn().mockResolvedValue(undefined);
    this.decodeAudioData = vi.fn().mockResolvedValue({
      duration: 10,
      length: 441000,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MOCKS MEDIA
// ═══════════════════════════════════════════════════════════════════════

function createMockMicStream(overrides = {}) {
  const track = {
    stop: vi.fn(),
    kind: "audio",
    label: "Mock Microphone",
    getSettings: vi.fn(() => ({
      sampleRate: 48000,
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    })),
  };
  return {
    active: true,
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
    ...overrides,
  };
}

// Mock global Audio
const audioElementInstances = [];
class MockAudio {
  constructor(src) {
    this.srcObject = null;
    this.paused = true;
    this.readyState = 2;
    this.src = src || "";
    this.play = vi.fn(() => {
      this.paused = false;
      return Promise.resolve();
    });
    this.pause = vi.fn(() => {
      this.paused = true;
    });
    this.setSinkId = vi.fn(() => Promise.resolve());
    audioElementInstances.push(this);
  }
}

// Mock AudioWorkletNode
class MockAudioWorkletNode {
  constructor() {
    this.connect = vi.fn();
    this.disconnect = vi.fn();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe("AudioMixerService", () => {
  let Mixer;
  let storeRef;
  let mockMicStream;
  let userMediaMock;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    audioElementInstances.length = 0;

    // Globals audio
    global.AudioContext = MockAudioContext;
    global.webkitAudioContext = MockAudioContext;
    global.AudioWorkletNode = MockAudioWorkletNode;
    global.Audio = MockAudio;
    window.Audio = MockAudio;

    // Mock navigator.mediaDevices
    mockMicStream = createMockMicStream();
    userMediaMock = vi.fn().mockResolvedValue(mockMicStream);

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: userMediaMock,
        enumerateDevices: vi.fn().mockResolvedValue([
          { deviceId: "default", kind: "audioinput", label: "Default Mic" },
          { deviceId: "mic-1", kind: "audioinput", label: "USB Mic" },
          { deviceId: "default", kind: "audiooutput", label: "Default Out" },
          { deviceId: "headphones", kind: "audiooutput", label: "Headphones" },
        ]),
      },
      configurable: true,
    });

    // Mock window.location.origin pour le worklet
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:5173" },
      writable: true,
      configurable: true,
    });

    storeRef = {
      mixerEnabled: true,
      audioDevice: "default",
      localAudioDevice: "headphones",
      lowLatencyMode: false,
      noiseSuppressionMode: "off",
      playLocally: true,
    };

    Mixer = await import("@core/services/AudioMixerService");
    Mixer.setStoreRef(storeRef);
  });

  afterEach(async () => {
    // Cleanup entre tests
    try {
      await Mixer.stopMixer();
    } catch (e) {}
    delete window.__mixerStoreRef;
  });

  // ════════════════════════════════════════════════════════════════════
  // setStoreRef
  // ════════════════════════════════════════════════════════════════════

  describe("setStoreRef", () => {
    it("devrait définir la référence", () => {
      Mixer.setStoreRef({ custom: true });
      expect(window.__mixerStoreRef.current).toEqual({ custom: true });
    });

    it("devrait accepter null", () => {
      expect(() => Mixer.setStoreRef(null)).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // mixerState
  // ════════════════════════════════════════════════════════════════════

  describe("mixerState", () => {
    it("devrait exposer les valeurs initiales", () => {
      expect(Mixer.mixerState.isRunning).toBe(false);
      expect(Mixer.mixerState.microphoneLevel).toBe(1.0);
      expect(Mixer.mixerState.soundLevel).toBe(1.0);
      expect(Mixer.mixerState.isMicrophoneConnected).toBe(false);
      expect(Mixer.mixerState.lowLatencyMode).toBe(false);
      expect(Mixer.mixerState.noiseSuppressionMode).toBe("off");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // warmupAudioContext
  // ════════════════════════════════════════════════════════════════════

  describe("warmupAudioContext", () => {
    it("devrait créer un AudioContext temporaire", async () => {
      await Mixer.warmupAudioContext();
      // Ne throw pas = OK
      expect(true).toBe(true);
    });

    it("ne devrait pas throw si AudioContext absent", async () => {
      global.AudioContext = undefined;
      global.webkitAudioContext = undefined;
      await expect(Mixer.warmupAudioContext()).resolves.not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // initAudioMixer
  // ════════════════════════════════════════════════════════════════════

  describe("initAudioMixer", () => {
    it("devrait retourner le stream mais marquer isMicrophoneConnected=false si getUserMedia échoue", async () => {
      userMediaMock.mockRejectedValueOnce(new Error("permission denied"));
      const stream = await Mixer.initAudioMixer("default", "default");

      // ⚠️ initAudioMixer retourne TOUJOURS le stream (le stream est créé avant)
      expect(stream).not.toBeNull();
      expect(Mixer.mixerState.isRunning).toBe(true);
      // Mais le micro n'est pas connecté
      expect(Mixer.mixerState.isMicrophoneConnected).toBe(false);
    });

    it("devrait retourner un MediaStream en succès", async () => {
      const stream = await Mixer.initAudioMixer("default", "default");
      expect(stream).toBeDefined();
      expect(stream).not.toBeNull();
      expect(Mixer.mixerState.isRunning).toBe(true);
      expect(Mixer.mixerState.isMicrophoneConnected).toBe(true);
    });

    it("devrait appeler getUserMedia", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(userMediaMock).toHaveBeenCalled();
    });

    it("devrait être idempotent (2e appel retourne le même stream)", async () => {
      const s1 = await Mixer.initAudioMixer("default", "default");
      const s2 = await Mixer.initAudioMixer("default", "default");
      expect(s1).toBe(s2);
    });

    it("devrait gérer plusieurs appels concurrents (initPromise)", async () => {
      const p1 = Mixer.initAudioMixer("default", "default");
      const p2 = Mixer.initAudioMixer("default", "default");
      const [s1, s2] = await Promise.all([p1, p2]);
      expect(s1).toBe(s2);
      expect(userMediaMock).toHaveBeenCalledTimes(1);
    });

    it("devrait marquer isMicrophoneConnected=false si aucune piste audio", async () => {
      userMediaMock.mockResolvedValueOnce({
        getTracks: () => [],
        getAudioTracks: () => [],
      });
      const stream = await Mixer.initAudioMixer("default", "default");

      // ⚠️ Le stream est retourné même si initMicrophone échoue
      expect(stream).not.toBeNull();
      expect(Mixer.mixerState.isMicrophoneConnected).toBe(false);
    });

    it('devrait fallback à "default" si deviceId inconnu', async () => {
      await Mixer.initAudioMixer("unknown-device", "default");

      const constraints = userMediaMock.mock.calls[0][0];
      expect(constraints.audio.deviceId).toBeUndefined();
    });

    it("devrait utiliser { exact } si deviceId valide", async () => {
      await Mixer.initAudioMixer("mic-1", "default");

      const constraints = userMediaMock.mock.calls[0][0];
      expect(constraints.audio.deviceId).toEqual({ exact: "mic-1" });
    });

    it("devrait activer noiseSuppression au boot si mode != off", async () => {
      storeRef.noiseSuppressionMode = "filter";
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.mixerState.noiseSuppression).toBe(true);
    });

    it("devrait synchroniser lowLatencyMode depuis le store", async () => {
      storeRef.lowLatencyMode = true;
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.mixerState.lowLatencyMode).toBe(true);
    });

    it("devrait connecter le mixer à la sortie", async () => {
      await Mixer.initAudioMixer("default", "headphones");
      expect(audioElementInstances.length).toBeGreaterThan(0);
      const lastAudio = audioElementInstances[audioElementInstances.length - 1];
      expect(lastAudio.setSinkId).toHaveBeenCalledWith("headphones");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // connectMixerToOutput
  // ════════════════════════════════════════════════════════════════════

  describe("connectMixerToOutput", () => {
    it("devrait retourner false si pas de destination", () => {
      expect(Mixer.connectMixerToOutput("default")).toBe(false);
    });

    it("devrait créer un Audio element via initAudioMixer", async () => {
      await Mixer.initAudioMixer("default", "headphones");

      // L'audio element est créé automatiquement par initAudioMixer
      expect(audioElementInstances.length).toBeGreaterThanOrEqual(1);
    });

    it("devrait appeler setSinkId sur l'element existant si device != default", async () => {
      await Mixer.initAudioMixer("default", "default");
      const audio = audioElementInstances[0];
      expect(audio).toBeDefined();

      Mixer.connectMixerToOutput("headphones");

      // ⚠️ La source réutilise l'element existant → setSinkId dessus
      expect(audio.setSinkId).toHaveBeenCalledWith("headphones");
    });

    it("ne devrait PAS appeler setSinkId si device = default", async () => {
      await Mixer.initAudioMixer("default", "default");
      const audio = audioElementInstances[0];

      // Reset le compteur pour n'avoir que le 2e appel
      audio.setSinkId.mockClear();

      Mixer.connectMixerToOutput("default");

      expect(audio.setSinkId).not.toHaveBeenCalled();
    });

    it("devrait réutiliser l'audio element existant", async () => {
      await Mixer.initAudioMixer("default", "default");
      const firstCount = audioElementInstances.length;

      Mixer.connectMixerToOutput("default");

      expect(audioElementInstances.length).toBe(firstCount);
    });

    it("devrait fallback au storeRef.audioDevice si deviceId null", async () => {
      await Mixer.initAudioMixer("default", "default");
      storeRef.audioDevice = "headphones";

      const audio = audioElementInstances[0];
      audio.setSinkId.mockClear();

      Mixer.connectMixerToOutput(null);

      expect(audio.setSinkId).toHaveBeenCalledWith("headphones");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // preconnectMixer
  // ════════════════════════════════════════════════════════════════════

  describe("preconnectMixer", () => {
    it("devrait retourner false si pas de destination", () => {
      expect(Mixer.preconnectMixer()).toBe(false);
    });

    it("devrait créer un Audio element après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      audioElementInstances.length = 0;

      const result = Mixer.preconnectMixer();
      expect(result).toBe(true);
      expect(audioElementInstances.length).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Low Latency Mode
  // ════════════════════════════════════════════════════════════════════

  describe("setLowLatencyMode", () => {
    it("devrait mettre à jour mixerState", () => {
      Mixer.setLowLatencyMode(true);
      expect(Mixer.mixerState.lowLatencyMode).toBe(true);
    });

    it("devrait reconfigurer la connexion micro si initialized", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(() => Mixer.setLowLatencyMode(true)).not.toThrow();
    });
  });

  describe("getLowLatencyStatus", () => {
    it("devrait retourner { enabled, supported, latencyReduction }", () => {
      const status = Mixer.getLowLatencyStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("supported", true);
      expect(status).toHaveProperty("latencyReduction");
    });

    it("devrait indiquer ~20-40ms si activé", () => {
      Mixer.setLowLatencyMode(true);
      expect(Mixer.getLowLatencyStatus().latencyReduction).toBe("~20-40ms");
    });

    it("devrait indiquer 0 si désactivé", () => {
      Mixer.setLowLatencyMode(false);
      expect(Mixer.getLowLatencyStatus().latencyReduction).toBe("0");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // High Quality Mic Mode
  // ════════════════════════════════════════════════════════════════════

  describe("setHighQualityMicMode", () => {
    it("devrait basculer mixerState", () => {
      Mixer.setHighQualityMicMode(false);
      expect(Mixer.mixerState.highQualityMicMode).toBe(false);
    });

    it("devrait réinit le micro si déjà initialisé", async () => {
      await Mixer.initAudioMixer("default", "default");
      const callsBefore = userMediaMock.mock.calls.length;

      Mixer.setHighQualityMicMode(false);

      // L'appel est async (fire & forget)
      await new Promise((r) => setTimeout(r, 10));
      expect(userMediaMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe("getHighQualityMicStatus", () => {
    it("devrait retourner enabled + description", () => {
      const status = Mixer.getHighQualityMicStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("description");
    });

    it('description devrait contenir "DSP navigateur désactivé" si enabled', () => {
      Mixer.setHighQualityMicMode(true);
      expect(Mixer.getHighQualityMicStatus().description).toContain(
        "DSP navigateur désactivé",
      );
    });

    it('description devrait contenir "DSP navigateur activé" si disabled', () => {
      Mixer.setHighQualityMicMode(false);
      expect(Mixer.getHighQualityMicStatus().description).toContain(
        "DSP navigateur activé",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Noise Suppression
  // ════════════════════════════════════════════════════════════════════

  describe("setNoiseSuppression", () => {
    it("devrait mettre à jour mixerState", () => {
      Mixer.setNoiseSuppression(true);
      expect(Mixer.mixerState.noiseSuppression).toBe(true);
    });

    it("ne devrait pas throw sans initialization", () => {
      expect(() => Mixer.setNoiseSuppression(true)).not.toThrow();
    });
  });

  describe("setNoiseSuppressionMode", () => {
    it("devrait accepter les modes valides", async () => {
      await Mixer.setNoiseSuppressionMode("auto");
      expect(Mixer.mixerState.noiseSuppressionMode).toBe("auto");
    });

    it('devrait fallback à "off" pour un mode invalide', async () => {
      await Mixer.setNoiseSuppressionMode("invalid-mode");
      expect(Mixer.mixerState.noiseSuppressionMode).toBe("off");
    });

    it('mode "off" devrait désactiver noiseSuppression', async () => {
      await Mixer.setNoiseSuppressionMode("off");
      expect(Mixer.mixerState.noiseSuppression).toBe(false);
    });

    it('mode "auto" devrait activer noiseSuppression', async () => {
      await Mixer.setNoiseSuppressionMode("auto");
      expect(Mixer.mixerState.noiseSuppression).toBe(true);
    });

    it('mode "filter" devrait activer noiseSuppression', async () => {
      await Mixer.setNoiseSuppressionMode("filter");
      expect(Mixer.mixerState.noiseSuppression).toBe(true);
    });

    it("devrait retourner true", async () => {
      const result = await Mixer.setNoiseSuppressionMode("off");
      expect(result).toBe(true);
    });
  });

  describe("getNoiseSuppressionStatus", () => {
    it("devrait retourner tous les champs", () => {
      const status = Mixer.getNoiseSuppressionStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("mode");
      expect(status).toHaveProperty("workletAvailable");
      expect(status).toHaveProperty("workletLoaded");
      expect(status).toHaveProperty("lowLatencyMode");
      expect(status).toHaveProperty("activeMethod");
    });

    it('activeMethod devrait être "none (lowLatencyMode bypass)" si lowLatency', async () => {
      Mixer.setLowLatencyMode(true);
      expect(Mixer.getNoiseSuppressionStatus().activeMethod).toBe(
        "none (lowLatencyMode bypass)",
      );
    });

    it('activeMethod devrait être "none" si disabled', () => {
      Mixer.setLowLatencyMode(false);
      Mixer.setNoiseSuppression(false);
      expect(Mixer.getNoiseSuppressionStatus().activeMethod).toBe("none");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Monitoring
  // ════════════════════════════════════════════════════════════════════

  describe("setMonitoring", () => {
    it("devrait mettre à jour mixerState", () => {
      Mixer.setMonitoring(true);
      expect(Mixer.mixerState.monitoringEnabled).toBe(true);
    });

    it("ne devrait pas throw sans initialization", () => {
      expect(() => Mixer.setMonitoring(true)).not.toThrow();
    });

    it("devrait créer un monitoringGain après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setMonitoring(true);

      const status = Mixer.getMonitoringStatus();
      expect(status.enabled).toBe(true);
      expect(status.hasDestination).toBe(true);
    });

    it("devrait cleanup au setMonitoring(false)", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setMonitoring(true);
      Mixer.setMonitoring(false);

      const status = Mixer.getMonitoringStatus();
      expect(status.enabled).toBe(false);
    });
  });

  describe("getMonitoringStatus", () => {
    it("devrait retourner les champs", () => {
      const status = Mixer.getMonitoringStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("gainValue");
      expect(status).toHaveProperty("hasDestination");
      expect(status).toHaveProperty("hasAudioElement");
      expect(status).toHaveProperty("audioElementPaused");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Volume controls
  // ════════════════════════════════════════════════════════════════════

  describe("setMicrophoneVolume", () => {
    it("ne devrait pas throw sans microphoneGain", () => {
      expect(() => Mixer.setMicrophoneVolume(0.5)).not.toThrow();
    });

    it("devrait clamper entre 0 et 1", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setMicrophoneVolume(2.0);
      expect(Mixer.mixerState.microphoneLevel).toBe(1);
      Mixer.setMicrophoneVolume(-1);
      expect(Mixer.mixerState.microphoneLevel).toBe(0);
    });

    it("devrait mettre à jour mixerState", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setMicrophoneVolume(0.5);
      expect(Mixer.mixerState.microphoneLevel).toBe(0.5);
    });
  });

  describe("setSoundVolume", () => {
    it("ne devrait pas throw sans soundGain", () => {
      expect(() => Mixer.setSoundVolume(0.5)).not.toThrow();
    });

    it("devrait clamper entre 0 et 1", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setSoundVolume(2.0);
      expect(Mixer.mixerState.soundLevel).toBe(1);
      Mixer.setSoundVolume(-1);
      expect(Mixer.mixerState.soundLevel).toBe(0);
    });
  });

  describe("toggleMicrophoneMute", () => {
    it("ne devrait pas throw sans microphoneGain", () => {
      expect(() => Mixer.toggleMicrophoneMute()).not.toThrow();
    });

    it("devrait basculer l'état mute", async () => {
      await Mixer.initAudioMixer("default", "default");
      const muted = Mixer.toggleMicrophoneMute();
      expect(muted).toBe(true);
      const unmuted = Mixer.toggleMicrophoneMute();
      expect(unmuted).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getMixedStream / isMixerActive
  // ════════════════════════════════════════════════════════════════════

  describe("getMixedStream", () => {
    it("devrait retourner null avant init", () => {
      expect(Mixer.getMixedStream()).toBeNull();
    });

    it("devrait retourner un stream après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.getMixedStream()).not.toBeNull();
    });
  });

  describe("isMixerActive", () => {
    it("devrait retourner false avant init", () => {
      expect(Mixer.isMixerActive()).toBe(false);
    });

    it("devrait retourner true après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.isMixerActive()).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // AudioContext controls
  // ════════════════════════════════════════════════════════════════════

  describe("resumeAudioContext", () => {
    it("ne devrait pas throw si pas d'audioContext", () => {
      expect(() => Mixer.resumeAudioContext()).not.toThrow();
    });

    it("ne devrait pas throw si state != suspended", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(() => Mixer.resumeAudioContext()).not.toThrow();
    });
  });

  describe("suspendAudioContext", () => {
    it("ne devrait pas throw si pas d'audioContext", () => {
      expect(() => Mixer.suspendAudioContext()).not.toThrow();
    });

    it("devrait suspendre si running", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(() => Mixer.suspendAudioContext()).not.toThrow();
    });
  });

  describe("getAudioContextTime", () => {
    it("devrait retourner 0 avant init", () => {
      expect(Mixer.getAudioContextTime()).toBe(0);
    });

    it("devrait retourner currentTime après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(typeof Mixer.getAudioContextTime()).toBe("number");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // playSoundInMixer
  // ════════════════════════════════════════════════════════════════════

  describe("playSoundInMixer", () => {
    it("devrait retourner null si pas initialisé", () => {
      const buffer = { duration: 10 };
      expect(Mixer.playSoundInMixer(buffer, 1.0, 0)).toBeNull();
    });

    it("devrait retourner une source après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      const buffer = { duration: 10 };
      const source = Mixer.playSoundInMixer(buffer, 1.0, 0);
      expect(source).not.toBeNull();
    });

    it("devrait clamper l'offset", async () => {
      await Mixer.initAudioMixer("default", "default");
      const buffer = { duration: 10 };
      expect(() => Mixer.playSoundInMixer(buffer, 1.0, 20)).not.toThrow();
      expect(() => Mixer.playSoundInMixer(buffer, 1.0, -5)).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // loadAudioBuffer
  // ════════════════════════════════════════════════════════════════════

  describe("loadAudioBuffer", () => {
    it("devrait retourner null si pas d'audioContext", async () => {
      const result = await Mixer.loadAudioBuffer("http://x/audio.mp3");
      expect(result).toBeNull();
    });

    it("devrait fetch + decode après init", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      });

      await Mixer.initAudioMixer("default", "default");
      const buffer = await Mixer.loadAudioBuffer("http://x/audio.mp3");
      expect(buffer).not.toBeNull();
      expect(global.fetch).toHaveBeenCalled();
    });

    it("devrait retourner null si fetch 404", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await Mixer.initAudioMixer("default", "default");
      const buffer = await Mixer.loadAudioBuffer("http://x/missing.mp3");
      expect(buffer).toBeNull();
    });

    it("devrait retourner null si fetch throw", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network"));

      await Mixer.initAudioMixer("default", "default");
      const buffer = await Mixer.loadAudioBuffer("http://x/audio.mp3");
      expect(buffer).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Status queries
  // ════════════════════════════════════════════════════════════════════

  describe("getMicrophoneStatus", () => {
    it("devrait retourner tous les champs", () => {
      const status = Mixer.getMicrophoneStatus();
      expect(status).toHaveProperty("isConnected");
      expect(status).toHaveProperty("deviceId");
      expect(status).toHaveProperty("audioContextState");
      expect(status).toHaveProperty("gainValue");
      expect(status).toHaveProperty("noiseSuppression");
      expect(status).toHaveProperty("noiseMode");
      expect(status).toHaveProperty("activeMethod");
      expect(status).toHaveProperty("lowLatencyMode");
      expect(status).toHaveProperty("monitoring");
      expect(status).toHaveProperty("highQualityMicMode");
    });
  });

  describe("getMixerStats", () => {
    it("devrait retourner tous les champs", () => {
      const stats = Mixer.getMixerStats();
      expect(stats).toHaveProperty("isInitialized");
      expect(stats).toHaveProperty("isRunning");
      expect(stats).toHaveProperty("isMicrophoneConnected");
      expect(stats).toHaveProperty("audioContextState");
      expect(stats).toHaveProperty("microphoneGain");
      expect(stats).toHaveProperty("soundGain");
      expect(stats).toHaveProperty("masterGain");
      expect(stats).toHaveProperty("hasStream");
      expect(stats).toHaveProperty("streamActive");
      expect(stats).toHaveProperty("tracksCount");
      expect(stats).toHaveProperty("audioElementActive");
      expect(stats).toHaveProperty("noiseSuppression");
      expect(stats).toHaveProperty("noiseMode");
      expect(stats).toHaveProperty("workletAvailable");
      expect(stats).toHaveProperty("activeMethod");
    });

    it("devrait indiquer isInitialized=false par défaut", () => {
      expect(Mixer.getMixerStats().isInitialized).toBe(false);
    });
  });

  describe("getMixerFullState", () => {
    it("devrait retourner un objet complet", () => {
      const state = Mixer.getMixerFullState();
      expect(state).toHaveProperty("isInitialized");
      expect(state).toHaveProperty("audioContextExists");
      expect(state).toHaveProperty("destinationExists");
      expect(state).toHaveProperty("microphoneSourceExists");
      expect(state).toHaveProperty("storeRefExists");
      expect(state.storeRefExists).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // changeMicrophone / changeOutputDevice
  // ════════════════════════════════════════════════════════════════════

  describe("changeMicrophone", () => {
    it("devrait retourner false si pas initialisé", async () => {
      const result = await Mixer.changeMicrophone("mic-1");
      expect(result).toBe(false);
    });

    it("devrait réinit le micro après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      const result = await Mixer.changeMicrophone("mic-1");
      expect(result).toBe(true);
    });
  });

  describe("changeOutputDevice", () => {
    it("devrait retourner false si pas de destination", () => {
      expect(Mixer.changeOutputDevice("headphones")).toBe(false);
    });

    it("devrait reconnecter après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      const result = Mixer.changeOutputDevice("headphones");
      expect(result).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // stopMixer
  // ════════════════════════════════════════════════════════════════════

  describe("stopMixer", () => {
    it("ne devrait pas throw si pas initialisé", async () => {
      await expect(Mixer.stopMixer()).resolves.not.toThrow();
    });

    it("devrait reset mixerState", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.mixerState.isRunning).toBe(true);

      await Mixer.stopMixer();

      expect(Mixer.mixerState.isRunning).toBe(false);
      expect(Mixer.mixerState.isMicrophoneConnected).toBe(false);
      expect(Mixer.mixerState.stream).toBeNull();
    });

    it("devrait stopper le rawMicStream", async () => {
      await Mixer.initAudioMixer("default", "default");
      const rawTrack = mockMicStream.getTracks()[0];

      await Mixer.stopMixer();

      expect(rawTrack.stop).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getAudioInputDevices
  // ════════════════════════════════════════════════════════════════════

  describe("getAudioInputDevices", () => {
    it("devrait filtrer les audioinput", async () => {
      const devices = await Mixer.getAudioInputDevices();
      expect(devices.length).toBe(2);
      expect(devices.every((d) => d.kind === "audioinput")).toBe(true);
    });

    it("devrait retourner [] si enumerateDevices throw", async () => {
      navigator.mediaDevices.enumerateDevices.mockRejectedValueOnce(
        new Error("boom"),
      );
      const devices = await Mixer.getAudioInputDevices();
      expect(devices).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // isMixerOperational / repairMixer
  // ════════════════════════════════════════════════════════════════════

  describe("isMixerOperational", () => {
    it("devrait retourner false avant init", () => {
      expect(Mixer.isMixerOperational()).toBe(false);
    });

    it("devrait retourner true après init réussie", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.isMixerOperational()).toBe(true);
    });
  });

  describe("repairMixer", () => {
    it("devrait retourner false si pas initialisé", () => {
      expect(Mixer.repairMixer()).toBe(false);
    });

    it("devrait retourner true après init", async () => {
      await Mixer.initAudioMixer("default", "default");
      expect(Mixer.repairMixer()).toBe(true);
    });

    it("devrait reconnecter le monitoring si actif", async () => {
      await Mixer.initAudioMixer("default", "default");
      Mixer.setMonitoring(true);

      expect(() => Mixer.repairMixer()).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // testMicrophoneOnce
  // ════════════════════════════════════════════════════════════════════

  describe("testMicrophoneOnce", () => {
    it("devrait retourner success=true avec stream", async () => {
      const result = await Mixer.testMicrophoneOnce("default");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("stream");
      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("stop");
    });

    it("devrait retourner success=false si getUserMedia throw", async () => {
      userMediaMock.mockRejectedValueOnce(new Error("mic error"));
      const result = await Mixer.testMicrophoneOnce("default");
      expect(result.success).toBe(false);
      expect(result.error).toBe("mic error");
    });

    it("devrait retourner success=false si aucune piste", async () => {
      userMediaMock.mockResolvedValueOnce({
        getTracks: () => [],
        getAudioTracks: () => [],
      });
      const result = await Mixer.testMicrophoneOnce("default");
      expect(result.success).toBe(false);
    });

    it("stop() devrait tout nettoyer", async () => {
      const result = await Mixer.testMicrophoneOnce("default");
      expect(() => result.stop()).not.toThrow();
    });

    it("devrait utiliser { exact } si device != default", async () => {
      await Mixer.testMicrophoneOnce("mic-1");
      const constraints = userMediaMock.mock.calls[0][0];
      expect(constraints.audio.deviceId).toEqual({ exact: "mic-1" });
    });
  });
});
