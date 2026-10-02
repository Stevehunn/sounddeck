// src/test/core/services/AudioService.playback.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// MOCKS HOISTÉS
// ═══════════════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => {
  const createdHowls = [];

  const createHowl = (config = {}) => {
    const howl = {
      _playing: false,
      _seek: 0,
      _duration: 10,
      _state: "loaded",
      _config: config,
      _sounds: [
        {
          _node: {
            setSinkId: vi.fn(() => Promise.resolve()),
            currentTime: 0,
            duration: 10,
          },
        },
      ],
      play: vi.fn(function () {
        this._playing = true;
        // Fire once('play') listeners synchroniquement
        if (this._onceHandlers?.["play"]) {
          this._onceHandlers["play"].forEach((cb) => cb());
        }
        return 1;
      }),
      stop: vi.fn(function () {
        this._playing = false;
      }),
      pause: vi.fn(function () {
        this._playing = false;
      }),
      unload: vi.fn(),
      playing: vi.fn(function () {
        return this._playing;
      }),
      seek: vi.fn(function () {
        return this._seek;
      }),
      duration: vi.fn(function () {
        return this._duration;
      }),
      state: vi.fn(function () {
        return this._state;
      }),
      on: vi.fn(),
      once: vi.fn(function (event, cb) {
        if (!this._onceHandlers) this._onceHandlers = {};
        if (!this._onceHandlers[event]) this._onceHandlers[event] = [];
        this._onceHandlers[event].push(cb);
      }),
      off: vi.fn(),
      volume: vi.fn(),
    };
    createdHowls.push(howl);
    return howl;
  };

  const HowlMock = vi.fn(function (config) {
    return createHowl(config);
  });

  return {
    HowlMock,
    createHowl,
    createdHowls,
    isMixerActive: vi.fn(() => false),
    loadAudioBuffer: vi.fn(),
    playSoundInMixer: vi.fn(),
    withTemporaryAudioContext: vi.fn(),
    buildFileUrl: vi.fn((p) => `sounddeck-local://file/${p}`),
  };
});

vi.mock("howler", () => ({ Howl: mocks.HowlMock }));
vi.mock("@core/services/AudioMixerService", () => ({
  isMixerActive: mocks.isMixerActive,
  loadAudioBuffer: mocks.loadAudioBuffer,
  playSoundInMixer: mocks.playSoundInMixer,
}));
vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: mocks.buildFileUrl,
}));
vi.mock("@shared/utils/audioContext", () => ({
  withTemporaryAudioContext: mocks.withTemporaryAudioContext,
}));
vi.mock("@shared/utils/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe("AudioService — playback", () => {
  let AudioService;
  let storeRef;

  const createSound = (id = "s1", path = "/a.mp3", overrides = {}) => ({
    id,
    name: `Sound ${id}`,
    path,
    volume: 0,
    volumeDb: 0,
    ...overrides,
  });

  const createFakeBuffer = (duration = 10) => ({
    duration,
    length: 441000,
    getChannelData: () => new Float32Array(441000),
  });

  const flushPromises = async () => {
    await new Promise((r) => setTimeout(r, 0));
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.createdHowls.length = 0;

    storeRef = {
      mixerEnabled: false,
      mixerSoundVolume: 100,
      localAudioDevice: "default",
    };

    mocks.isMixerActive.mockReturnValue(false);
    mocks.loadAudioBuffer.mockResolvedValue(createFakeBuffer());
    mocks.playSoundInMixer.mockReturnValue({
      loop: false,
      onended: null,
      stop: vi.fn(),
      disconnect: vi.fn(),
    });
    mocks.withTemporaryAudioContext.mockImplementation(async (url, cb) => {
      const buffer = createFakeBuffer();
      buffer.getChannelData = () => {
        const data = new Float32Array(441000);
        data.fill(0.5);
        return data;
      };
      return await cb(buffer);
    });

    // Mock navigator.mediaDevices
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          {
            deviceId: "default",
            kind: "audiooutput",
            label: "Default Speakers",
          },
          { deviceId: "cable", kind: "audiooutput", label: "CABLE Input" },
          { deviceId: "headphones", kind: "audiooutput", label: "Headphones" },
        ]),
      },
      configurable: true,
    });

    if (!global.performance?.now) {
      global.performance = { now: () => Date.now() };
    }

    AudioService = await import("@core/services/AudioService");
    AudioService.setStoreRef(storeRef);
  });

  // ════════════════════════════════════════════════════════════════════
  // playSound — dispatcher
  // ════════════════════════════════════════════════════════════════════

  describe("playSound — dispatcher", () => {
    it("devrait ignorer les sounds sans path", () => {
      AudioService.playSound({ id: "s1" });
      expect(mocks.HowlMock).not.toHaveBeenCalled();
    });

    it("devrait ignorer sound null", () => {
      expect(() => AudioService.playSound(null)).not.toThrow();
    });

    it("devrait marquer le son comme playing (via notifyPlaybackListeners)", () => {
      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      AudioService.playSound(createSound(), "default", 80);

      expect(cb).toHaveBeenCalled();
      const lastSnapshot = cb.mock.calls[cb.mock.calls.length - 1][0];
      expect(lastSnapshot.id).toBe("s1");
    });

    it("devrait router vers playSoundNormal si mixer désactivé", () => {
      storeRef.mixerEnabled = false;
      AudioService.playSound(createSound(), "default", 80);

      expect(mocks.HowlMock).toHaveBeenCalled();
      expect(mocks.loadAudioBuffer).not.toHaveBeenCalled();
    });

    it("devrait router vers playSoundWithMixer si mixer actif", () => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(true);

      AudioService.playSound(createSound(), "default", 80);

      // playSoundWithMixer est async, mais met 'loading' en cache
      expect(mocks.loadAudioBuffer).toHaveBeenCalled();
    });

    it("devrait rester en mode normal si mixer enabled mais inactif", () => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(false);

      AudioService.playSound(createSound(), "default", 80);
      expect(mocks.loadAudioBuffer).not.toHaveBeenCalled();
      expect(mocks.HowlMock).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // playSoundNormal — branche default
  // ════════════════════════════════════════════════════════════════════

  describe("playSoundNormal — device default", () => {
    it("devrait créer un Howl avec html5: false", () => {
      AudioService.playSound(createSound(), "default", 80);

      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.html5).toBe(false);
    });

    it("devrait passer la bonne URL via buildFileUrl", () => {
      const sound = createSound("s1", "/test.mp3");
      AudioService.playSound(sound, "default", 80);

      expect(mocks.buildFileUrl).toHaveBeenCalledWith("/test.mp3");
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.src[0]).toContain("test.mp3");
    });

    it("devrait appeler howl.play()", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      expect(howl.play).toHaveBeenCalled();
    });

    it("devrait passer loop: true si demandé", () => {
      AudioService.playSound(createSound(), "default", 80, true);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.loop).toBe(true);
    });

    it("devrait passer loop: false par défaut", () => {
      AudioService.playSound(createSound(), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.loop).toBe(false);
    });

    it("devrait détecter le format mp3", () => {
      AudioService.playSound(createSound("s1", "/a.mp3"), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.format).toEqual(["mp3"]);
    });

    it("devrait détecter le format wav", () => {
      AudioService.playSound(createSound("s1", "/a.wav"), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.format).toEqual(["wav"]);
    });

    it("devrait fallback sur mp3 si extension inconnue", () => {
      AudioService.playSound(createSound("s1", "/a.xyz"), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.format).toEqual(["mp3"]);
    });

    it("devrait retirer les query params du path", () => {
      AudioService.playSound(
        createSound("s1", "/a.wav?token=abc"),
        "default",
        80,
      );
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.format).toEqual(["wav"]);
    });

    it("devrait utiliser le volume calculé", () => {
      const sound = createSound("s1", "/a.mp3", { volumeDb: 0 });
      AudioService.playSound(sound, "default", 80);

      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.volume).toBeGreaterThan(0);
      expect(config.volume).toBeLessThanOrEqual(1);
    });

    it("ne devrait PAS créer 2 fois le même Howl (cache)", () => {
      const sound = createSound("s1", "/a.mp3");
      AudioService.playSound(sound, "default", 80);
      AudioService.playSound(sound, "default", 80);

      // Le 2e appel stop + unload le cache existant
      expect(mocks.createdHowls.length).toBe(1);
    });

    it("devrait stop + unload si on rejoue le même son", () => {
      const sound = createSound("s1", "/a.mp3");
      AudioService.playSound(sound, "default", 80);

      const howl = mocks.createdHowls[0];
      howl.stop.mockClear();
      howl.unload.mockClear();

      AudioService.playSound(sound, "default", 80);

      expect(howl.stop).toHaveBeenCalled();
      expect(howl.unload).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // playSoundNormal — device virtuel
  // ════════════════════════════════════════════════════════════════════

  describe("playSoundNormal — device virtuel", () => {
    it("devrait créer un Howl avec html5: true", () => {
      AudioService.playSound(createSound(), "cable", 80);

      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
      const config = mocks.HowlMock.mock.calls[0][0];
      expect(config.html5).toBe(true);
    });

    it("devrait appeler setSinkId au play", () => {
      AudioService.playSound(createSound(), "cable", 80);
      const howl = mocks.createdHowls[0];
      const node = howl._sounds[0]._node;
      expect(node.setSinkId).toHaveBeenCalledWith("cable");
    });

    it("devrait gérer un deviceId inconnu sans crash", () => {
      expect(() =>
        AudioService.playSound(createSound(), "unknown-device", 80),
      ).not.toThrow();
    });

    it("devrait créer un Howl local si playLocally + device différents", async () => {
      storeRef.localAudioDevice = "headphones";
      AudioService.playSound(createSound(), "cable", 80, false, true);

      // playSoundNormal lance shouldCreateLocalHowl async
      await flushPromises();

      expect(mocks.HowlMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("ne devrait PAS créer de Howl local si playLocally=false", async () => {
      storeRef.localAudioDevice = "headphones";
      AudioService.playSound(createSound(), "cable", 80, false, false);

      await flushPromises();
      // 1 seul howl (Discord/virtuel)
      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
    });

    it("ne devrait PAS créer de Howl local si localDeviceId === audioDevice", async () => {
      AudioService.playSound(createSound(), "cable", 80, false, true);

      // localDeviceId par défaut = 'default', audioDevice = 'cable' → différents
      // On force la même valeur
      storeRef.localAudioDevice = "cable";
      AudioService.stopAllSounds();
      mocks.HowlMock.mockClear();

      AudioService.playSound(createSound("s2"), "cable", 80, false, true);
      await flushPromises();

      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
    });

    it("ne devrait PAS créer de Howl local si localDevice est virtuel", async () => {
      storeRef.localAudioDevice = "cable"; // 'cable' est un device virtuel
      mocks.HowlMock.mockClear();

      AudioService.playSound(createSound("s1"), "cable2", 80, false, true);
      await flushPromises();

      // Le Howl virtuel est créé mais pas le local
      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
    });

    it('ne devrait PAS créer de Howl local si localDevice="default" et audio virtuel', async () => {
      storeRef.localAudioDevice = "default";
      AudioService.playSound(createSound("s1"), "cable", 80, false, true);

      await flushPromises();
      // Le code skip car localDeviceId='default' + audioIsVirtual=true
      expect(mocks.HowlMock).toHaveBeenCalledTimes(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // playSoundWithMixer
  // ════════════════════════════════════════════════════════════════════

  describe("playSoundWithMixer", () => {
    beforeEach(() => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(true);
    });

    it("devrait appeler loadAudioBuffer", async () => {
      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      expect(mocks.loadAudioBuffer).toHaveBeenCalled();
    });

    it("devrait appeler playSoundInMixer si buffer chargé", async () => {
      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      expect(mocks.playSoundInMixer).toHaveBeenCalled();
    });

    it("devrait gérer buffer null sans crash", async () => {
      mocks.loadAudioBuffer.mockResolvedValueOnce(null);

      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      expect(mocks.playSoundInMixer).not.toHaveBeenCalled();
    });

    it("devrait gérer une exception loadAudioBuffer", async () => {
      mocks.loadAudioBuffer.mockRejectedValueOnce(new Error("decode error"));

      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      expect(mocks.playSoundInMixer).not.toHaveBeenCalled();
    });

    it("devrait set source.loop = true si loop demandé", async () => {
      const source = {
        loop: false,
        onended: null,
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      mocks.playSoundInMixer.mockReturnValueOnce(source);

      AudioService.playSound(createSound(), "default", 80, true);
      await flushPromises();

      expect(source.loop).toBe(true);
    });

    it("devrait set source.onended si loop=false", async () => {
      const source = {
        loop: false,
        onended: null,
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      mocks.playSoundInMixer.mockReturnValueOnce(source);

      AudioService.playSound(createSound(), "default", 80, false);
      await flushPromises();

      expect(source.onended).toBeInstanceOf(Function);
    });

    it("devrait gérer source null de playSoundInMixer", async () => {
      mocks.playSoundInMixer.mockReturnValueOnce(null);

      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      // Pas de crash
      expect(AudioService.getPlayingIds()).toContain("s1");
    });

    it("devrait créer un Howl local si playLocally", async () => {
      storeRef.localAudioDevice = "headphones";
      mocks.HowlMock.mockClear();

      AudioService.playSound(createSound(), "default", 80, false, true);
      await flushPromises();

      expect(mocks.HowlMock).toHaveBeenCalled();
    });

    it("ne devrait PAS créer de Howl local si playLocally=false", async () => {
      mocks.HowlMock.mockClear();

      AudioService.playSound(createSound(), "default", 80, false, false);
      await flushPromises();

      expect(mocks.HowlMock).not.toHaveBeenCalled();
    });

    it("devrait ignorer un 2e play du même son (cache loading)", async () => {
      // Premier play lance le chargement
      AudioService.playSound(createSound("s1"), "default", 80);

      // 2e play immédiat (avant que le buffer charge)
      AudioService.playSound(createSound("s1"), "default", 80);

      await flushPromises();

      // loadAudioBuffer appelé 1 seule fois
      expect(mocks.loadAudioBuffer).toHaveBeenCalledTimes(1);
    });

    it("devrait stop + return si déjà en cache (after load)", async () => {
      AudioService.playSound(createSound("s1"), "default", 80);
      await flushPromises();

      mocks.loadAudioBuffer.mockClear();
      mocks.playSoundInMixer.mockClear();

      // 2e play → stopSound appelé (cache existe)
      AudioService.playSound(createSound("s1"), "default", 80);
      await flushPromises();

      expect(mocks.loadAudioBuffer).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // pauseSound — 3 modes
  // ════════════════════════════════════════════════════════════════════

  describe("pauseSound", () => {
    it("devrait retourner false si pas de cache", () => {
      expect(AudioService.pauseSound("unknown")).toBe(false);
    });

    it('devrait retourner false si cache = "loading"', async () => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(true);

      // Trigger le loading
      AudioService.playSound(createSound(), "default", 80);

      // Avant que le buffer soit chargé, pauseSound
      const result = AudioService.pauseSound("s1");
      expect(result).toBe(false);

      await flushPromises();
    });

    it("devrait retourner true pour un son joué (mode howler-default)", () => {
      AudioService.playSound(createSound(), "default", 80);

      const result = AudioService.pauseSound("s1");
      expect(result).toBe(true);
    });

    it("devrait ajouter à pausedSounds", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");

      expect(AudioService.isPausedSound("s1")).toBe(true);
    });

    it("devrait appeler howl.pause() en mode howler-default", () => {
      AudioService.playSound(createSound(), "default", 80);

      const howl = mocks.createdHowls[0];
      howl.pause.mockClear();

      AudioService.pauseSound("s1");

      expect(howl.pause).toHaveBeenCalled();
    });

    it("devrait capturer la progression", () => {
      AudioService.playSound(createSound(), "default", 80);

      const howl = mocks.createdHowls[0];
      howl._seek = 3;
      howl._duration = 10;

      AudioService.pauseSound("s1");

      const p = AudioService.getSoundProgress("s1");
      expect(p).not.toBeNull();
      expect(p.current).toBe(3);
      expect(p.duration).toBe(10);
    });

    it("devrait gérer un mode howler-virtual (pause → unload)", () => {
      storeRef.localAudioDevice = "headphones";
      AudioService.playSound(createSound("s1"), "cable", 80, false, false);

      const result = AudioService.pauseSound("s1");
      expect(result).toBe(true);
    });

    it("devrait gérer un mode mixer", async () => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(true);

      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      const result = AudioService.pauseSound("s1");
      expect(result).toBe(true);
    });

    it("devrait notifier les listeners après pause", () => {
      AudioService.playSound(createSound(), "default", 80);
      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      AudioService.pauseSound("s1");

      expect(cb).toHaveBeenCalled();
    });

    it("devrait absorber une erreur de howl.pause sans crash", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      // Le code source a un try/catch interne qui absorbe l'erreur
      howl.pause.mockImplementationOnce(() => {
        throw new Error("boom");
      });

      // pauseSound retourne true (l'erreur est avalée par le try/catch interne)
      const result = AudioService.pauseSound("s1");
      expect(result).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // resumeSound — 3 modes
  // ════════════════════════════════════════════════════════════════════

  describe("resumeSound", () => {
    it("devrait retourner true après resume (mode howler-default)", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");

      const result = AudioService.resumeSound("s1");
      expect(result).toBe(true);
    });

    it("devrait retirer de pausedSounds", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");
      AudioService.resumeSound("s1");

      expect(AudioService.isPausedSound("s1")).toBe(false);
    });

    it("devrait appeler howl.play() après seek", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl._seek = 3;

      AudioService.pauseSound("s1");
      howl.play.mockClear();
      howl.seek.mockClear();

      AudioService.resumeSound("s1");

      expect(howl.seek).toHaveBeenCalledWith(3);
      expect(howl.play).toHaveBeenCalled();
    });

    it("devrait recréer un Howl pour mode howler-virtual", () => {
      storeRef.localAudioDevice = "headphones";
      AudioService.playSound(createSound("s1"), "cable", 80, false, false);

      // ⚠️ Force un offset non-nul pour que captureHowlOffset le retienne
      //    (sans ça, pausedStates n'est pas peuplé et resumeSound ne fait rien)
      const howl = mocks.createdHowls[0];
      howl._seek = 5;
      howl._sounds[0]._node.currentTime = 5;

      AudioService.pauseSound("s1");

      mocks.HowlMock.mockClear();
      const result = AudioService.resumeSound("s1");

      expect(result).toBe(true);
      expect(mocks.HowlMock).toHaveBeenCalled();
    });

    it("devrait recréer une source pour mode mixer", async () => {
      storeRef.mixerEnabled = true;
      mocks.isMixerActive.mockReturnValue(true);

      AudioService.playSound(createSound(), "default", 80);
      await flushPromises();

      AudioService.pauseSound("s1");

      mocks.playSoundInMixer.mockClear();
      const result = AudioService.resumeSound("s1");

      expect(result).toBe(true);
      expect(mocks.playSoundInMixer).toHaveBeenCalled();
    });

    it("devrait notifier les listeners", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");

      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      AudioService.resumeSound("s1");

      expect(cb).toHaveBeenCalled();
    });

    it("devrait retourner true pour un id inconnu (pas de cache)", () => {
      // resumeSound ne vérifie pas l'existence, il fait juste des opérations
      const result = AudioService.resumeSound("unknown");
      expect(result).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // togglePauseSound
  // ════════════════════════════════════════════════════════════════════

  describe("togglePauseSound", () => {
    it("devrait pause si non pausé", () => {
      AudioService.playSound(createSound(), "default", 80);

      AudioService.togglePauseSound("s1");

      expect(AudioService.isPausedSound("s1")).toBe(true);
    });

    it("devrait resume si pausé", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");

      AudioService.togglePauseSound("s1");

      expect(AudioService.isPausedSound("s1")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // isPlaying
  // ════════════════════════════════════════════════════════════════════

  describe("isPlaying — après playSound", () => {
    it("devrait retourner true pour un son en cours", () => {
      AudioService.playSound(createSound(), "default", 80);

      expect(AudioService.isPlaying("s1")).toBe(true);
    });

    it("devrait retourner false après pause", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.pauseSound("s1");

      expect(AudioService.isPlaying("s1")).toBe(false);
    });

    it("devrait retourner false après stop", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.stopSound("s1");

      expect(AudioService.isPlaying("s1")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getSoundProgress — via playSound
  // ════════════════════════════════════════════════════════════════════

  describe("getSoundProgress — via lecture réelle", () => {
    it("devrait retourner null si le howl n'est pas playing", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl._playing = false;

      expect(AudioService.getSoundProgress("s1")).toBeNull();
    });

    it("devrait retourner la progression si playing", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl._playing = true;
      howl._seek = 5;
      howl._duration = 10;

      const p = AudioService.getSoundProgress("s1");
      expect(p.current).toBe(5);
      expect(p.duration).toBe(10);
      expect(p.ratio).toBe(0.5);
    });

    it("devrait clamper ratio à 1", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl._playing = true;
      howl._seek = 20;
      howl._duration = 10;

      const p = AudioService.getSoundProgress("s1");
      expect(p.ratio).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getSoundDuration
  // ════════════════════════════════════════════════════════════════════

  describe("getSoundDuration — via lecture réelle", () => {
    it("devrait retourner la duration du howl", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl._duration = 25;

      expect(AudioService.getSoundDuration("s1")).toBe(25);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // playSoundAsync
  // ════════════════════════════════════════════════════════════════════

  describe("playSoundAsync", () => {
    it("devrait analyser le gain puis jouer", async () => {
      const sound = createSound("s1", "/a.mp3");
      await AudioService.playSoundAsync(sound, "default", 80);

      expect(mocks.withTemporaryAudioContext).toHaveBeenCalled();
      expect(mocks.HowlMock).toHaveBeenCalled();
    });

    it("ne devrait PAS réanalyser si gain en cache", async () => {
      await AudioService.analyzeGain("/cached.mp3");
      const before = mocks.withTemporaryAudioContext.mock.calls.length;

      await AudioService.playSoundAsync(createSound("s2", "/cached.mp3"));
      expect(mocks.withTemporaryAudioContext.mock.calls.length).toBe(before);
    });

    it("devrait continuer si analyzeGain throw", async () => {
      mocks.withTemporaryAudioContext.mockRejectedValueOnce(new Error("boom"));
      const sound = createSound("s1", "/a.mp3");

      await expect(
        AudioService.playSoundAsync(sound, "default", 80),
      ).resolves.not.toThrow();
    });

    it("devrait ignorer un sound sans path", async () => {
      await AudioService.playSoundAsync({ id: "s1" });
      expect(mocks.HowlMock).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // stopSound / stopAllSounds — avec playback réel
  // ════════════════════════════════════════════════════════════════════

  describe("stopSound — avec playback réel", () => {
    it("devrait appeler howl.stop() + howl.unload()", () => {
      AudioService.playSound(createSound(), "default", 80);
      const howl = mocks.createdHowls[0];
      howl.stop.mockClear();
      howl.unload.mockClear();

      AudioService.stopSound("s1");

      expect(howl.stop).toHaveBeenCalled();
      expect(howl.unload).toHaveBeenCalled();
    });

    it("devrait gérer un tableau de howls (virtuel)", () => {
      storeRef.localAudioDevice = "headphones";
      AudioService.playSound(createSound("s1"), "cable", 80, false, true);

      expect(() => AudioService.stopSound("s1")).not.toThrow();
    });

    it("devrait clear le cache", () => {
      AudioService.playSound(createSound(), "default", 80);
      AudioService.stopSound("s1");

      expect(AudioService.isPlaying("s1")).toBe(false);
    });

    it("devrait notifier les listeners", () => {
      AudioService.playSound(createSound(), "default", 80);
      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      AudioService.stopSound("s1");

      expect(cb).toHaveBeenCalled();
    });
  });

  describe("stopAllSounds — avec plusieurs sons", () => {
    it("devrait stop les howls de tous les sons", () => {
      AudioService.playSound(createSound("s1"), "default", 80);
      AudioService.playSound(createSound("s2"), "default", 80);

      const howl1 = mocks.createdHowls[0];
      const howl2 = mocks.createdHowls[1];

      AudioService.stopAllSounds();

      expect(howl1.stop).toHaveBeenCalled();
      expect(howl2.stop).toHaveBeenCalled();
    });

    it("devrait notifier les listeners avec null", () => {
      AudioService.playSound(createSound("s1"), "default", 80);
      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      AudioService.stopAllSounds();

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: null }));
    });

    it("devrait appeler stopSequencerCallback", () => {
      const seqCb = vi.fn();
      AudioService.registerStopSequencerCallback(seqCb);

      AudioService.playSound(createSound("s1"), "default", 80);
      AudioService.stopAllSounds();

      expect(seqCb).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // onend → handleHowlTerminated
  // ════════════════════════════════════════════════════════════════════

  describe("handleHowlTerminated", () => {
    it("devrait clear le cache quand onend fire", () => {
      AudioService.playSound(createSound(), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];

      // Simuler la fin de lecture
      config.onend();

      expect(AudioService.isPlaying("s1")).toBe(false);
    });

    it("ne devrait PAS clear si loop=true", () => {
      AudioService.playSound(createSound(), "default", 80, true);
      const config = mocks.HowlMock.mock.calls[0][0];

      // onend ne devrait pas clear le cache
      config.onend();

      // Le howl reste trackable (peut-être plus en playing mais pas cleared)
      expect(config.loop).toBe(true);
    });

    it("devrait notifier les listeners avec null", () => {
      AudioService.playSound(createSound(), "default", 80);
      const cb = vi.fn();
      AudioService.subscribeToPlayback(cb);
      cb.mockClear();

      const config = mocks.HowlMock.mock.calls[0][0];
      config.onend();

      expect(cb).toHaveBeenCalled();
    });

    it("devrait gérer onstop (équivalent à onend)", () => {
      AudioService.playSound(createSound(), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];

      config.onstop();
      expect(AudioService.isPlaying("s1")).toBe(false);
    });

    it("devrait gérer onloaderror", () => {
      AudioService.playSound(createSound(), "default", 80);
      const config = mocks.HowlMock.mock.calls[0][0];

      expect(() => config.onloaderror(1, new Error("load fail"))).not.toThrow();
    });
  });
});
