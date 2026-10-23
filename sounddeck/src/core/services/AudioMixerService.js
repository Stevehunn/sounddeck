/**
 * @file Audio mixer — combines microphone + sound playback into one stream.
 *
 * When enabled, this service:
 * - Opens an `AudioContext` with `latencyHint: 'interactive'`.
 * - Creates a `MediaStreamDestination` (the "mixed" stream that Discord
 *   will consume as input).
 * - Routes microphone (optionally through a noise-suppression chain) and
 *   sound playback into that destination.
 * - Optionally mirrors the mix to a local device (self-hear).
 *
 * ## Signal chain
 *
 * ```
 * mic source ─► [noise chain] ─► micGain ─┐
 *                                         ├─► masterGain ─► destination
 * sound sources ───────────────► soundGain┘
 *
 * (destination).stream ─► <audio> ─► setSinkId(output)   // Discord
 *                └─────► monitoring chain ─► setSinkId(local)  // self-hear
 * ```
 *
 * ## Noise suppression
 *
 * Three modes are supported:
 * - `worklet` — AudioWorkletNode (best quality, requires `noise-suppression.js`)
 * - `filter` — biquad lowpass + dynamics compressor (fallback)
 * - `off` — passthrough
 *
 * `auto` prefers `worklet` and falls back to `filter`.
 *
 * @see @core/store/hooks/useMixer.js
 * @see src/shared/components/settings/OBSControl.jsx
 */
import { translate } from "@shared/utils/translator";

let audioContext = null;
let microphoneSource = null;
let microphoneGain = null;
let soundGain = null;
let masterGain = null;
let destination = null;
let isInitialized = false;
let currentDeviceId = null;
let isMicrophoneMuted = false;
let audioElement = null;
let localAudioElement = null;

// Default false to match the store (useMixer + useSettings both default false)
let lowLatencyMode = false;

// Reference to the raw mic stream (needed to stop its tracks)
let rawMicStream = null;

// Noise reduction state (custom Web Audio processing)
let noiseSuppressionEnabled = false;
let noiseFilter = null;
let noiseCompressor = null;
let noiseWorkletNode = null;
let workletLoaded = false;
let noiseSuppressionMode = "off";

// Monitoring (self-hear) — via MediaStreamDestination + setSinkId(localDevice)
let monitoringEnabled = false;
let monitoringGain = null;
let monitoringDestination = null;
let monitoringAudioElement = null;

// Store reference
let storeRef = null;

// "Max voice quality" mode (browser DSP disabled)
let highQualityMicMode = true;

// Init promise (StrictMode double-init guard)
let initPromise = null;

// Mixer state (reactive snapshot for UI consumers)
export const mixerState = {
  isRunning: false,
  microphoneLevel: 1.0,
  soundLevel: 1.0,
  microphoneDeviceId: null,
  stream: null,
  isMicrophoneConnected: false,
  noiseSuppression: false,
  noiseSuppressionMode: "off",
  lowLatencyMode: false,
  isWarmup: false,
  monitoringEnabled: false,
  highQualityMicMode: true,
};

// ─── SET STORE REF ────────────────────────────────────────────────────

/**
 * Sets the store reference used for device lookups and local config.
 * @param {Object} store
 * @returns {void}
 */
export function setStoreRef(store) {
  storeRef = store;
  window.__mixerStoreRef = { current: store };
}

// ─── STOP MIC STREAM ──────────────────────────────────────────────────

async function stopMicStream() {
  if (microphoneSource) {
    try {
      microphoneSource.disconnect();
    } catch {
      // Ignore.
    }
    microphoneSource = null;
  }
  if (rawMicStream) {
    try {
      rawMicStream.getTracks().forEach((t) => t.stop());
    } catch {
      // Ignore.
    }
    rawMicStream = null;
  }
}

// ─── WARMUP ───────────────────────────────────────────────────────────

/**
 * Warms up the AudioContext (resumes suspended state, plays a silent
 * buffer to unlock the audio pipeline). Called once at app boot.
 *
 * @returns {Promise<void>}
 */
export async function warmupAudioContext() {
  if (mixerState.isWarmup) return;
  mixerState.isWarmup = true;

  try {
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const buffer = ctx.createBuffer(1, 1, 44100);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => source.disconnect();

    setTimeout(async () => {
      await ctx.close();
      mixerState.isWarmup = false;
    }, 100);
  } catch {
    mixerState.isWarmup = false;
  }
}

// ─── MIXER INIT ───────────────────────────────────────────────────────

/**
 * Initializes the mixer.
 *
 * Creates the AudioContext, gain nodes, and `MediaStreamDestination`,
 * then opens the microphone and wires the output device.
 *
 * Idempotent: concurrent calls return the same promise.
 *
 * @param {string} [microphoneDeviceId='default']
 * @param {string} [outputDeviceId='default']
 * @returns {Promise<MediaStream|null>}
 */
export async function initAudioMixer(
  microphoneDeviceId = "default",
  outputDeviceId = "default",
) {
  if (initPromise) {
    return initPromise;
  }

  if (isInitialized && audioContext && audioContext.state === "running") {
    return destination?.stream || null;
  }

  initPromise = (async () => {
    try {
      await stopMicStream();
      cleanupMonitoring();

      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close();
      }

      if (audioElement) {
        audioElement.pause();
        audioElement.srcObject = null;
        audioElement = null;
      }

      if (localAudioElement) {
        localAudioElement.pause();
        localAudioElement.srcObject = null;
        localAudioElement = null;
      }

      // Reset worklet state (the module must be reloaded on the new context)
      workletLoaded = false;
      noiseWorkletNode = null;
      noiseFilter = null;
      noiseCompressor = null;

      // Sync lowLatencyMode from store (if available)
      if (storeRef?.lowLatencyMode !== undefined) {
        lowLatencyMode = !!storeRef.lowLatencyMode;
        mixerState.lowLatencyMode = lowLatencyMode;
        console.log(
          "🎛️ [mixer] lowLatencyMode synced from store:",
          lowLatencyMode,
        );
      }

      // Sync noiseSuppressionMode from store (if available)
      if (
        storeRef?.noiseSuppressionMode !== undefined &&
        storeRef.noiseSuppressionMode !== noiseSuppressionMode
      ) {
        noiseSuppressionMode = storeRef.noiseSuppressionMode;
        noiseSuppressionEnabled = noiseSuppressionMode !== "off";
        mixerState.noiseSuppressionMode = noiseSuppressionMode;
        mixerState.noiseSuppression = noiseSuppressionEnabled;
      }

      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: "interactive",
      });

      if (import.meta.env?.DEV) {
        console.log("🎛️ [mixer] sampleRate:", audioContext.sampleRate);
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (
        noiseSuppressionEnabled &&
        noiseSuppressionMode !== "off" &&
        noiseSuppressionMode !== "filter"
      ) {
        await loadNoiseSuppressionWorklet();
      }

      microphoneGain = audioContext.createGain();
      microphoneGain.gain.value = 1.0;
      microphoneGain.gain.setValueAtTime(1.0, audioContext.currentTime);

      soundGain = audioContext.createGain();
      soundGain.gain.value = 1.0;
      soundGain.gain.setValueAtTime(1.0, audioContext.currentTime);

      masterGain = audioContext.createGain();
      masterGain.gain.value = 1.0;
      masterGain.gain.setValueAtTime(1.0, audioContext.currentTime);

      destination = audioContext.createMediaStreamDestination();

      microphoneGain.connect(masterGain);
      soundGain.connect(masterGain);
      masterGain.connect(destination);

      const success = await initMicrophone(microphoneDeviceId);

      isInitialized = true;
      mixerState.isRunning = true;
      mixerState.stream = destination.stream;
      mixerState.isMicrophoneConnected = success;
      mixerState.noiseSuppression = noiseSuppressionEnabled;
      mixerState.noiseSuppressionMode = noiseSuppressionMode;
      mixerState.lowLatencyMode = lowLatencyMode;
      mixerState.monitoringEnabled = monitoringEnabled;
      mixerState.highQualityMicMode = highQualityMicMode;

      const deviceToUse = outputDeviceId || storeRef?.audioDevice || "default";
      connectMixerToOutput(deviceToUse);

      return destination.stream;
    } catch (e) {
      console.error("❌ Mixer init error:", e);
      isInitialized = false;
      mixerState.isRunning = false;
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

// ─── CONNECT MIXER TO OUTPUT ──────────────────────────────────────────

/**
 * Routes the mixed stream to the given output device (via an `<audio>`
 * element + `setSinkId`). Reuses the existing element if possible.
 *
 * @param {string} deviceId
 * @returns {boolean} `true` on success.
 */
export function connectMixerToOutput(deviceId) {
  if (!destination || !destination.stream) {
    console.warn("⚠️ [mixer] connectMixerToOutput: no destination");
    return false;
  }

  try {
    const deviceToUse = deviceId || storeRef?.audioDevice || "default";

    if (audioElement && audioElement.srcObject === destination.stream) {
      if (deviceToUse && deviceToUse !== "default") {
        audioElement.setSinkId(deviceToUse).catch((e) => {
          console.warn("⚠️ [mixer] setSinkId failed:", deviceToUse, e);
        });
      }
      if (audioElement.paused) {
        audioElement.play().catch((e) => {
          console.warn("⚠️ [mixer] play() failed (existing):", e);
        });
      }
      return true;
    }

    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.srcObject = null;
      } catch {
        // Ignore.
      }
      audioElement = null;
    }

    audioElement = new Audio();
    audioElement.srcObject = destination.stream;

    if (deviceToUse && deviceToUse !== "default") {
      audioElement.setSinkId(deviceToUse).catch((e) => {
        console.warn("⚠️ [mixer] setSinkId failed:", deviceToUse, e);
      });
    }

    audioElement
      .play()
      .then(() => {
        console.log("✅ [mixer] audioElement routes to:", deviceToUse);
      })
      .catch((e) => {
        console.warn("⚠️ [mixer] play() failed (new):", e);
      });

    return true;
  } catch (e) {
    console.error("❌ [mixer] connectMixerToOutput error:", e);
    return false;
  }
}

// ─── PRECONNECT ───────────────────────────────────────────────────────

/**
 * Preconnects the mixer output element (before the user presses play).
 * @returns {boolean}
 */
export function preconnectMixer() {
  if (!destination || !destination.stream) return false;

  try {
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement = null;
    }

    audioElement = new Audio();
    audioElement.srcObject = destination.stream;

    if (audioElement.readyState >= 2) {
      audioElement.play().catch(() => {});
    }

    return true;
  } catch {
    return false;
  }
}

// ─── LOAD AUDIOWORKLET ────────────────────────────────────────────────

async function loadNoiseSuppressionWorklet() {
  if (workletLoaded) return true;

  try {
    if (!audioContext || !audioContext.audioWorklet) {
      return false;
    }

    const baseUrl = window.location.origin;
    const workletUrl = `${baseUrl}/noise-suppression.js`;

    await audioContext.audioWorklet.addModule(workletUrl);
    workletLoaded = true;
    return true;
  } catch {
    workletLoaded = false;
    return false;
  }
}

// ─── LOW LATENCY MODE ─────────────────────────────────────────────────

/**
 * Enables or disables low-latency mode (bypasses the noise chain).
 * @param {boolean} enabled
 * @returns {void}
 */
export function setLowLatencyMode(enabled) {
  lowLatencyMode = enabled;
  mixerState.lowLatencyMode = enabled;

  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection();
  }
}

/**
 * Returns the current low-latency mode status.
 * @returns {{enabled: boolean, supported: boolean, latencyReduction: string}}
 */
export function getLowLatencyStatus() {
  return {
    enabled: lowLatencyMode,
    supported: true,
    latencyReduction: lowLatencyMode ? "~20-40ms" : "0",
  };
}

// ─── HIGH-QUALITY MIC MODE ────────────────────────────────────────────

/**
 * Enables/disables "max voice quality" mode (disables browser DSP).
 * @param {boolean} enabled
 * @returns {void}
 */
export function setHighQualityMicMode(enabled) {
  highQualityMicMode = !!enabled;
  mixerState.highQualityMicMode = highQualityMicMode;

  if (isInitialized && currentDeviceId !== null) {
    initMicrophone(currentDeviceId).catch(() => {});
  }
}

/**
 * Returns the current high-quality mic mode status.
 * @returns {{enabled: boolean, description: string}}
 */
export function getHighQualityMicStatus() {
  return {
    enabled: highQualityMicMode,
    description: highQualityMicMode
      ? translate("micDspDisabled")
      : translate("micDspEnabled"),
  };
}

// ─── RECONFIGURE MIC CONNECTION ───────────────────────────────────────

function reconfigureMicrophoneConnection() {
  try {
    if (!microphoneSource || !microphoneGain) return;

    try {
      microphoneSource.disconnect();
    } catch {
      // Ignore.
    }
    if (noiseWorkletNode) {
      try {
        noiseWorkletNode.disconnect();
      } catch {
        // Ignore.
      }
      noiseWorkletNode = null;
    }
    if (noiseFilter) {
      try {
        noiseFilter.disconnect();
      } catch {
        // Ignore.
      }
      noiseFilter = null;
    }
    if (noiseCompressor) {
      try {
        noiseCompressor.disconnect();
      } catch {
        // Ignore.
      }
      noiseCompressor = null;
    }

    if (
      lowLatencyMode ||
      !noiseSuppressionEnabled ||
      noiseSuppressionMode === "off"
    ) {
      microphoneSource.connect(microphoneGain);
      console.log("🎤 [mixer] Mic routing: direct (lowLatency or no-DSP)");
    } else if (noiseSuppressionEnabled && noiseSuppressionMode !== "off") {
      if (workletLoaded && noiseSuppressionMode !== "filter") {
        try {
          noiseWorkletNode = new AudioWorkletNode(
            audioContext,
            "noise-suppression",
          );
          microphoneSource.connect(noiseWorkletNode);
          noiseWorkletNode.connect(microphoneGain);
          console.log("🎤 [mixer] Mic routing: WORKLET");
          return;
        } catch (e) {
          console.warn(
            "⚠️ [mixer] AudioWorkletNode creation failed:",
            e.message,
          );
          noiseWorkletNode = null;
        }
      }

      noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 4000;
      noiseFilter.Q.value = 0.7;

      noiseCompressor = audioContext.createDynamicsCompressor();
      noiseCompressor.threshold.value = -30;
      noiseCompressor.knee.value = 40;
      noiseCompressor.ratio.value = 12;
      noiseCompressor.attack.value = 0.001;
      noiseCompressor.release.value = 0.1;

      microphoneSource.connect(noiseFilter);
      noiseFilter.connect(noiseCompressor);
      noiseCompressor.connect(microphoneGain);
    }
  } catch {
    // Last-resort fallback: direct connect
    try {
      if (microphoneSource && microphoneGain) {
        microphoneSource.disconnect();
        microphoneSource.connect(microphoneGain);
      }
    } catch {
      // Ignore.
    }
  }
}

// ─── MICROPHONE INIT ──────────────────────────────────────────────────

async function initMicrophone(deviceId) {
  try {
    await stopMicStream();

    if (noiseWorkletNode) {
      try {
        noiseWorkletNode.disconnect();
      } catch {
        // Ignore.
      }
      noiseWorkletNode = null;
    }
    if (noiseFilter) {
      try {
        noiseFilter.disconnect();
      } catch {
        // Ignore.
      }
      noiseFilter = null;
    }
    if (noiseCompressor) {
      try {
        noiseCompressor.disconnect();
      } catch {
        // Ignore.
      }
      noiseCompressor = null;
    }
    let actualDeviceId = deviceId;
    if (deviceId && deviceId !== "default") {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        const deviceExists = audioInputs.some((d) => d.deviceId === deviceId);

        if (!deviceExists) {
          actualDeviceId = "default";
        }
      } catch {
        actualDeviceId = "default";
      }
    }

    const constraints = {
      audio: {
        deviceId:
          actualDeviceId && actualDeviceId !== "default"
            ? { exact: actualDeviceId }
            : undefined,
        echoCancellation: !highQualityMicMode,
        noiseSuppression: !highQualityMicMode,
        autoGainControl: !highQualityMicMode,
      },
    };

    if (import.meta.env?.DEV) {
      console.log("🎤 [mixer] getUserMedia constraints:", {
        highQualityMicMode,
        echoCancellation: constraints.audio.echoCancellation,
        noiseSuppression: constraints.audio.noiseSuppression,
        autoGainControl: constraints.audio.autoGainControl,
      });
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!stream.getAudioTracks().length) {
      return false;
    }

    rawMicStream = stream;

    const track = stream.getAudioTracks()[0];
    const settings = track.getSettings?.() || {};
    if (import.meta.env?.DEV) {
      console.log("🎤 [mixer] Native mic:", {
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
      });
    }

    microphoneSource = audioContext.createMediaStreamSource(stream);

    // Smart routing: direct OR worklet OR filter
    reconfigureMicrophoneConnection();

    currentDeviceId = actualDeviceId;
    mixerState.microphoneDeviceId = actualDeviceId;
    mixerState.isMicrophoneConnected = true;

    return true;
  } catch (e) {
    console.error("❌ [mixer] Mic init error:", e);
    mixerState.isMicrophoneConnected = false;
    return false;
  }
}

// ─── MONITORING CLEANUP ───────────────────────────────────────────────

function cleanupMonitoring() {
  if (monitoringAudioElement) {
    try {
      monitoringAudioElement.pause();
      monitoringAudioElement.srcObject = null;
    } catch {
      // Ignore.
    }
    monitoringAudioElement = null;
  }
  if (monitoringGain) {
    try {
      monitoringGain.disconnect();
    } catch {
      // Ignore.
    }
    monitoringGain = null;
  }
  monitoringDestination = null;
}

// ─── MONITORING API ───────────────────────────────────────────────────

/**
 * Toggles self-monitoring (hear your own mic + sounds in headphones).
 * @param {boolean} enabled
 * @returns {void}
 */
export function setMonitoring(enabled) {
  monitoringEnabled = enabled;
  mixerState.monitoringEnabled = enabled;

  if (!audioContext || !masterGain) {
    return;
  }

  try {
    if (enabled) {
      if (!monitoringGain) {
        monitoringGain = audioContext.createGain();
        monitoringGain.gain.value = 0.3;

        monitoringDestination = audioContext.createMediaStreamDestination();
        masterGain.connect(monitoringGain);
        monitoringGain.connect(monitoringDestination);

        monitoringAudioElement = new Audio();
        monitoringAudioElement.srcObject = monitoringDestination.stream;

        const localDevice = storeRef?.localAudioDevice || "default";
        if (localDevice && localDevice !== "default") {
          monitoringAudioElement
            .setSinkId(localDevice)
            .then(() => {
              console.log("✅ [monitoring] setSinkId →", localDevice);
            })
            .catch((e) => {
              console.warn("⚠️ [monitoring] setSinkId failed:", localDevice, e);
            });
        } else {
          console.warn(
            '⚠️ [monitoring] localAudioDevice = "default" → risk of duplicate if system default is CABLE Input. Configure headphones in Options → Audio.',
          );
        }

        monitoringAudioElement
          .play()
          .then(() => {
            console.log("✅ [monitoring] audioElement play OK");
          })
          .catch((e) => {
            console.warn("⚠️ [monitoring] play() failed:", e);
          });
      }
    } else {
      cleanupMonitoring();
    }
  } catch (e) {
    console.error("❌ [monitoring] Error:", e);
  }
}

/**
 * Returns a debug snapshot of the monitoring state.
 * @returns {Object}
 */
export function getMonitoringStatus() {
  return {
    enabled: monitoringEnabled,
    gainValue: monitoringGain?.gain?.value || 0,
    hasDestination: !!monitoringDestination,
    hasAudioElement: !!monitoringAudioElement,
    audioElementPaused: monitoringAudioElement?.paused ?? null,
  };
}

// ─── PUBLIC API ───────────────────────────────────────────────────────

/**
 * Enables/disables noise suppression on the microphone.
 * @param {boolean} enabled
 * @returns {void}
 */
export function setNoiseSuppression(enabled) {
  noiseSuppressionEnabled = enabled;
  mixerState.noiseSuppression = enabled;

  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection();
  }
}

/**
 * Changes the noise suppression mode (loads the worklet if needed).
 *
 * @param {'auto'|'worklet'|'filter'|'off'} mode
 * @returns {Promise<boolean>}
 */
export async function setNoiseSuppressionMode(mode) {
  const validModes = ["auto", "worklet", "filter", "off"];
  if (!validModes.includes(mode)) {
    mode = "off";
  }

  noiseSuppressionMode = mode;
  mixerState.noiseSuppressionMode = mode;

  if (mode === "off") {
    noiseSuppressionEnabled = false;
    mixerState.noiseSuppression = false;
  } else {
    noiseSuppressionEnabled = true;
    mixerState.noiseSuppression = true;

    if (mode !== "filter" && !workletLoaded && audioContext?.audioWorklet) {
      await loadNoiseSuppressionWorklet();
    }
  }

  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection();
  }

  return true;
}

/**
 * Returns the current noise-suppression state (including the actual
 * routing method in use).
 * @returns {Object}
 */
export function getNoiseSuppressionStatus() {
  return {
    enabled: noiseSuppressionEnabled,
    mode: noiseSuppressionMode,
    workletAvailable: workletLoaded && !!audioContext?.audioWorklet,
    workletLoaded,
    lowLatencyMode,
    activeMethod: lowLatencyMode
      ? "none (lowLatencyMode bypass)"
      : !noiseSuppressionEnabled
        ? "none"
        : workletLoaded && noiseSuppressionMode !== "filter"
          ? "worklet"
          : "filter",
  };
}

// ─── SOUND PLAYBACK IN MIXER ──────────────────────────────────────────

/**
 * Plays an `AudioBuffer` through the mixer (into `soundGain`).
 *
 * @param {AudioBuffer} audioBuffer
 * @param {number} [volume=1.0]
 * @param {number} [offset=0] - Start position (seconds).
 * @returns {AudioBufferSourceNode|null}
 */
export function playSoundInMixer(audioBuffer, volume = 1.0, offset = 0) {
  if (!isInitialized || !audioContext || !destination) {
    return null;
  }

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const gain = audioContext.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(soundGain);

    const safeOffset = Math.max(
      0,
      Math.min(offset, audioBuffer.duration - 0.01),
    );
    source.start(0, safeOffset);

    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.log("[AudioMixerService][playSoundInMixer]", {
        receivedOffset: offset,
        safeOffset,
        bufferDuration: audioBuffer.duration,
      });
    }

    return source;
  } catch {
    return null;
  }
}

/**
 * Fetches and decodes an audio file into an `AudioBuffer`.
 *
 * @param {string} fileUrl
 * @returns {Promise<AudioBuffer|null>}
 */
export async function loadAudioBuffer(fileUrl) {
  if (!audioContext) {
    return null;
  }

  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch {
    return null;
  }
}

// ─── CONTROLS ─────────────────────────────────────────────────────────

/**
 * Sets the microphone volume (0-1).
 * @param {number} volume
 * @returns {void}
 */
export function setMicrophoneVolume(volume) {
  if (!microphoneGain) return;
  const clampedVolume = Math.max(0, Math.min(1, volume));
  microphoneGain.gain.value = clampedVolume;
  mixerState.microphoneLevel = clampedVolume;
}

/**
 * Sets the sound volume in the mix (0-1).
 * @param {number} volume
 * @returns {void}
 */
export function setSoundVolume(volume) {
  if (!soundGain) return;
  const clampedVolume = Math.max(0, Math.min(1, volume));
  soundGain.gain.value = clampedVolume;
  mixerState.soundLevel = clampedVolume;
}

/**
 * Returns the mixed `MediaStream`, or `null`.
 * @returns {MediaStream|null}
 */
export function getMixedStream() {
  return destination ? destination.stream : null;
}

/**
 * Returns `true` if the mixer is initialized and running.
 * @returns {boolean}
 */
export function isMixerActive() {
  return isInitialized && audioContext && audioContext.state === "running";
}

/**
 * Resumes the AudioContext if suspended.
 * @returns {void}
 */
export function resumeAudioContext() {
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
}

/**
 * Returns the current `AudioContext.currentTime`, or `0`.
 * @returns {number}
 */
export function getAudioContextTime() {
  if (!audioContext || audioContext.state === "closed") return 0;
  return audioContext.currentTime || 0;
}

/**
 * Suspends the AudioContext.
 * @returns {void}
 */
export function suspendAudioContext() {
  if (audioContext && audioContext.state === "running") {
    audioContext.suspend().catch(() => {});
  }
}

/**
 * Toggles microphone mute. Returns the new muted state.
 * @returns {boolean|undefined}
 */
export function toggleMicrophoneMute() {
  if (!microphoneGain) return;
  isMicrophoneMuted = !isMicrophoneMuted;
  microphoneGain.gain.value = isMicrophoneMuted
    ? 0
    : mixerState.microphoneLevel || 1.0;
  return isMicrophoneMuted;
}

/**
 * Opens the microphone briefly to check it works.
 *
 * Returns an object with a `stop()` method that must be called to release
 * the temporary stream and context.
 *
 * @param {string} [deviceId='default']
 * @returns {Promise<Object>}
 */
export async function testMicrophoneOnce(deviceId = "default") {
  let tempContext = null;
  let tempStream = null;

  try {
    tempContext = new (window.AudioContext || window.webkitAudioContext)();
    if (tempContext.state === "suspended") {
      await tempContext.resume();
    }

    const constraints = {
      audio: {
        deviceId:
          deviceId && deviceId !== "default" ? { exact: deviceId } : undefined,
        echoCancellation: !highQualityMicMode,
        noiseSuppression: !highQualityMicMode,
        autoGainControl: !highQualityMicMode,
      },
    };

    tempStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!tempStream.getAudioTracks().length) {
      throw new Error("No audio track");
    }

    const source = tempContext.createMediaStreamSource(tempStream);
    const gain = tempContext.createGain();
    gain.gain.value = 0.3;
    source.connect(gain);
    gain.connect(tempContext.destination);

    const deviceName = tempStream.getAudioTracks()[0]?.label || "Microphone";

    return {
      success: true,
      deviceName,
      stream: tempStream,
      context: tempContext,
      stop: () => {
        try {
          if (tempStream) {
            tempStream.getTracks().forEach((track) => track.stop());
            tempStream = null;
          }
          if (tempContext && tempContext.state !== "closed") {
            tempContext.close();
            tempContext = null;
          }
        } catch {
          // Ignore.
        }
      },
    };
  } catch (e) {
    if (tempStream) {
      tempStream.getTracks().forEach((track) => track.stop());
    }
    if (tempContext && tempContext.state !== "closed") {
      try {
        await tempContext.close();
      } catch {
        // Ignore.
      }
    }
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Returns the current microphone status.
 * @returns {Object}
 */
export function getMicrophoneStatus() {
  return {
    isConnected: mixerState.isMicrophoneConnected,
    deviceId: currentDeviceId,
    audioContextState: audioContext?.state || "closed",
    gainValue: microphoneGain?.gain?.value || 0,
    noiseSuppression: noiseSuppressionEnabled,
    noiseMode: noiseSuppressionMode,
    activeMethod: getNoiseSuppressionStatus().activeMethod,
    lowLatencyMode,
    monitoring: monitoringEnabled,
    highQualityMicMode,
  };
}

/**
 * Returns a stats snapshot of the mixer.
 * @returns {Object}
 */
export function getMixerStats() {
  return {
    isInitialized,
    isRunning: mixerState.isRunning,
    isMicrophoneConnected: mixerState.isMicrophoneConnected,
    audioContextState: audioContext?.state || "closed",
    audioContextSampleRate: audioContext?.sampleRate || 0,
    microphoneGain: microphoneGain?.gain?.value || 0,
    soundGain: soundGain?.gain?.value || 0,
    masterGain: masterGain?.gain?.value || 0,
    hasStream: !!destination?.stream,
    streamActive: destination?.stream?.active || false,
    tracksCount: destination?.stream?.getAudioTracks().length || 0,
    audioElementActive: !!audioElement,
    noiseSuppression: noiseSuppressionEnabled,
    noiseMode: noiseSuppressionMode,
    workletAvailable: workletLoaded,
    activeMethod: getNoiseSuppressionStatus().activeMethod,
    lowLatencyMode,
    monitoring: monitoringEnabled,
    highQualityMicMode,
    monitoringHasDestination: !!monitoringDestination,
    monitoringHasAudioElement: !!monitoringAudioElement,
  };
}

/**
 * Returns a full debug snapshot of the mixer state (everything you'd need
 * to diagnose a "no sound" issue).
 * @returns {Object}
 */
export function getMixerFullState() {
  return {
    isInitialized,
    isRunning: mixerState.isRunning,
    isMicrophoneConnected: mixerState.isMicrophoneConnected,
    audioContextState: audioContext?.state || "closed",
    audioContextSampleRate: audioContext?.sampleRate || 0,
    audioContextExists: !!audioContext,
    destinationExists: !!destination,
    destinationStream: !!destination?.stream,
    streamActive: destination?.stream?.active || false,
    audioElementExists: !!audioElement,
    audioElementSrcObject: audioElement?.srcObject ? "exists" : "null",
    audioElementPaused: audioElement?.paused ?? null,
    localAudioElementExists: !!localAudioElement,
    microphoneSourceExists: !!microphoneSource,
    rawMicStreamExists: !!rawMicStream,
    microphoneGainExists: !!microphoneGain,
    soundGainExists: !!soundGain,
    masterGainExists: !!masterGain,
    monitoringEnabled,
    monitoringHasDestination: !!monitoringDestination,
    monitoringHasAudioElement: !!monitoringAudioElement,
    lowLatencyMode,
    noiseSuppressionEnabled,
    noiseSuppressionMode,
    noiseActiveMethod: getNoiseSuppressionStatus().activeMethod,
    workletLoaded,
    highQualityMicMode,
    storeRefExists: !!storeRef,
    storeRefMixerEnabled: storeRef?.mixerEnabled,
    storeRefAudioDevice: storeRef?.audioDevice,
    storeRefLocalAudioDevice: storeRef?.localAudioDevice,
    storeRefPlayLocally: storeRef?.playLocally,
    storeRefLowLatencyMode: storeRef?.lowLatencyMode,
  };
}

/**
 * Changes the microphone device (re-initializes the source).
 *
 * @param {string} deviceId
 * @returns {Promise<boolean>}
 */
export async function changeMicrophone(deviceId) {
  if (!isInitialized) {
    return false;
  }
  return await initMicrophone(deviceId);
}

/**
 * Changes the output device (re-routes the mixed stream).
 * @param {string} deviceId
 * @returns {boolean}
 */
export function changeOutputDevice(deviceId) {
  return connectMixerToOutput(deviceId);
}

// ─── STOP MIXER ───────────────────────────────────────────────────────

/**
 * Tears down the mixer: disconnects every node, stops the mic stream,
 * closes the AudioContext.
 * @returns {Promise<void>}
 */
export async function stopMixer() {
  try {
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement = null;
    }

    if (localAudioElement) {
      localAudioElement.pause();
      localAudioElement.srcObject = null;
      localAudioElement = null;
    }

    cleanupMonitoring();
    monitoringEnabled = false;
    mixerState.monitoringEnabled = false;

    if (noiseWorkletNode) {
      try {
        noiseWorkletNode.disconnect();
      } catch {
        // Ignore.
      }
      noiseWorkletNode = null;
    }
    if (noiseFilter) {
      try {
        noiseFilter.disconnect();
      } catch {
        // Ignore.
      }
      noiseFilter = null;
    }
    if (noiseCompressor) {
      try {
        noiseCompressor.disconnect();
      } catch {
        // Ignore.
      }
      noiseCompressor = null;
    }
    workletLoaded = false;

    await stopMicStream();

    if (microphoneGain) {
      try {
        microphoneGain.disconnect();
      } catch {
        // Ignore.
      }
      microphoneGain = null;
    }

    if (soundGain) {
      try {
        soundGain.disconnect();
      } catch {
        // Ignore.
      }
      soundGain = null;
    }

    if (masterGain) {
      try {
        masterGain.disconnect();
      } catch {
        // Ignore.
      }
      masterGain = null;
    }

    if (destination) {
      try {
        if (destination.stream) {
          destination.stream.getTracks().forEach((track) => track.stop());
        }
      } catch {
        // Ignore.
      }
      destination = null;
    }

    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
    audioContext = null;

    isInitialized = false;
    mixerState.isRunning = false;
    mixerState.stream = null;
    mixerState.isMicrophoneConnected = false;
    mixerState.monitoringEnabled = false;
  } catch (e) {
    console.error("❌ Mixer stop error:", e);
  }
}

/**
 * Returns the list of audio input devices.
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function getAudioInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}

/**
 * Returns `true` if the mixer is fully operational.
 * @returns {boolean}
 */
export function isMixerOperational() {
  if (!isInitialized) return false;
  if (!audioContext) return false;
  if (audioContext.state !== "running") return false;
  if (!destination || !destination.stream) return false;
  if (!microphoneGain || !soundGain || !masterGain) return false;
  return true;
}

/**
 * Attempts to repair the mixer: resumes the context, re-wires the gain
 * chain, re-applies monitoring, and reconnects the output.
 *
 * @returns {boolean} `true` if the mixer ended up operational.
 */
export function repairMixer() {
  if (!isInitialized) {
    return false;
  }

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    try {
      if (microphoneGain && masterGain) {
        try {
          microphoneGain.disconnect();
        } catch {
          // Ignore.
        }
        microphoneGain.connect(masterGain);
      }
      if (soundGain && masterGain) {
        try {
          soundGain.disconnect();
        } catch {
          // Ignore.
        }
        soundGain.connect(masterGain);
      }
      if (masterGain && destination) {
        try {
          masterGain.disconnect();
        } catch {
          // Ignore.
        }
        masterGain.connect(destination);
      }
    } catch {
      // Ignore — one bad disconnect shouldn't abort the whole repair.
    }

    if (monitoringEnabled) {
      setMonitoring(true);
    }

    connectMixerToOutput(storeRef?.audioDevice || "default");

    return isMixerOperational();
  } catch {
    return false;
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────

export default {
  initAudioMixer,
  warmupAudioContext,
  setLowLatencyMode,
  getLowLatencyStatus,
  setHighQualityMicMode,
  getHighQualityMicStatus,
  changeMicrophone,
  changeOutputDevice,
  connectMixerToOutput,
  preconnectMixer,
  playSoundInMixer,
  loadAudioBuffer,
  setMicrophoneVolume,
  setSoundVolume,
  getMixedStream,
  isMixerActive,
  resumeAudioContext,
  getAudioContextTime,
  suspendAudioContext,
  stopMixer,
  getAudioInputDevices,
  getMicrophoneStatus,
  getMixerStats,
  getMixerFullState,
  toggleMicrophoneMute,
  testMicrophoneOnce,
  setNoiseSuppression,
  setNoiseSuppressionMode,
  getNoiseSuppressionStatus,
  isMixerOperational,
  repairMixer,
  mixerState,
  setMonitoring,
  getMonitoringStatus,
  setStoreRef,
};
