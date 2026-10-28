/**
 * @file Editor playback engine (Web Audio + requestAnimationFrame loop).
 *
 * Owns the actual audio playback for the editor:
 * - Creates a shared `AudioContext` (via `@shared/utils/audioContext`).
 * - Loads and caches `AudioBuffer`s per file path.
 * - Schedules `BufferSourceNode`s with per-track gain, per-clip gain,
 *   and optional auto-crossfade.
 * - Runs a `requestAnimationFrame` loop (`startPlaybackLoop`) that:
 *   - Computes the current global time from wall-clock deltas.
 *   - Resolves the effective `loopTime` if the timeline loop is enabled.
 *   - Starts/stops clip sources as the playhead enters/exits them.
 *   - Stops on `totalDuration` or on a one-shot `stopAtTime`.
 *
 * ## Playback modes
 *
 * - **Normal** — every clip in its own time window is played.
 * - **Solo** — only one clip (`soloPlayClipId`) plays, with `stopAtTime`
 *   set to the clip's end. Used by `playClipOnly()`.
 * - **Loop (timeline)** — the timeline `loopState.timeline` restarts the
 *   playhead at `loop.start` after `loop.end`, for `cycleCount` cycles
 *   or `manualDuration` seconds.
 * - **Loop (per-clip)** — `loopState.clips[id]` repeats a single clip
 *   inside its own zone.
 *
 * ## Why wall-clock deltas
 *
 * The rAF callback fires irregularly (16ms nominal, but throttled when
 * the tab is hidden). The engine accumulates `performance.now()` deltas
 * and only advances `currentTime` by "consumed" time, so playback stays
 * in sync even after a tab switch.
 *
 * ## Crossfade
 *
 * When `autoCrossfade` is `true`, `playClip` detects an overlap with the
 * closest previous clip and applies a short crossfade via `gain` ramps
 * on both clips. Duration is capped at `CROSSFADE_MAX_DURATION`.
 *
 * @see ../useEditorCore.js — provides all the refs, setters, and state
 * @see @shared/utils/audioContext.js — `getSharedAudioContext`, `loadAudioBuffer`
 * @see @shared/utils/realTimeEffects.js — offline effects applied per clip
 */

import { useCallback, useRef, useEffect } from "react";
import {
  getSharedAudioContext,
  loadAudioBuffer as loadAudioBufferShared,
} from "@shared/utils/audioContext";
import { logWarn, logError, logInfo } from "@shared/utils/logger";

// ─── TUNABLES ────────────────────────────────────────────────────────

/** Minimum delta (s) before advancing the playhead (~60fps gate). */
const FRAME_DELTA_GATE = 0.016;

/** Minimum overlap (s) to trigger a crossfade. */
const CROSSFADE_MIN_OVERLAP = 0.05;

/** Maximum crossfade duration (s). */
const CROSSFADE_MAX_DURATION = 0.5;

/** Delay (ms) before starting the rAF loop after a play/resume. */
const PLAYBACK_START_DELAY_MS = 50;

// ─── PURE HELPERS ────────────────────────────────────────────────────

/**
 * Computes the effective loop time and cycle info for the given global
 * time and timeline loop config.
 *
 * Returns `{loopTime, isInLoopZone, currentCycle}` where:
 * - `loopTime` is what the playback engine should use to find active
 *   clips (equal to `globalTime` when not looping).
 * - `isInLoopZone` tells whether the playhead is currently "inside" the
 *   loop repetition window (`[loopStart, loopStart + maxLoopDuration]`).
 * - `currentCycle` is the 0-based cycle index inside the loop (or `-1`
 *   when not looping).
 *
 * @param {number} globalTime - Playhead position (s) since the last play.
 * @param {{enabled: boolean, start?: number, end?: number, cycleCount?: number, manualDuration?: number, durationMode?: string}|null} timelineLoop
 * @returns {{loopTime: number, isInLoopZone: boolean, currentCycle: number}}
 */
export function computeLoopTiming(globalTime, timelineLoop) {
  if (!timelineLoop?.enabled) {
    return { loopTime: globalTime, isInLoopZone: false, currentCycle: -1 };
  }

  const loopStart = timelineLoop.start || 0;
  const loopEnd = timelineLoop.end || 10;
  const loopTotalDuration = Math.max(0.1, loopEnd - loopStart);
  const cycleCount = timelineLoop.cycleCount || 3;
  const manualDuration = timelineLoop.manualDuration || 10;

  let maxLoopDuration = loopTotalDuration;
  if (timelineLoop.durationMode === "cycles") {
    maxLoopDuration = loopTotalDuration * cycleCount;
  } else if (timelineLoop.durationMode === "manualDuration") {
    maxLoopDuration = manualDuration;
  }

  const elapsed = globalTime - loopStart;
  const isInLoopZone = elapsed >= 0 && elapsed < maxLoopDuration;

  if (!isInLoopZone) {
    return { loopTime: globalTime, isInLoopZone: false, currentCycle: -1 };
  }

  const positionInCycle = elapsed % loopTotalDuration;
  const currentCycle = Math.floor(elapsed / loopTotalDuration);

  return {
    loopTime: loopStart + positionInCycle,
    isInLoopZone: true,
    currentCycle,
  };
}

/**
 * Returns `true` if a clip's `[start, end]` window overlaps the loop
 * zone `[loopStart, loopEnd]`.
 *
 * @param {number} start
 * @param {number} end
 * @param {number} loopStart
 * @param {number} loopEnd
 * @returns {boolean}
 */
export function isClipInZone(start, end, loopStart, loopEnd) {
  return (
    (start >= loopStart && start < loopEnd) ||
    (end > loopStart && end <= loopEnd) ||
    (start <= loopStart && end >= loopEnd)
  );
}

/**
 * Returns the closest previous clip that overlaps `clip.start` (used to
 * trigger crossfades). Muted tracks are skipped.
 *
 * @param {{id: string, start: number}} clip
 * @param {{tracks?: Array<{muted?: boolean, clips?: Array<Object>}>}} project
 * @param {Record<string, number>} clipDurations
 * @returns {{clip: Object, track: Object}|null}
 */
export function findOverlappingPreviousClip(clip, project, clipDurations) {
  const tracks = project?.tracks || [];
  let best = null;
  let bestTrack = null;

  for (const t of tracks) {
    if (t.muted) continue;
    for (const c of t.clips || []) {
      if (c.id === clip.id) continue;
      if (c.start >= clip.start) continue;

      const cDur = clipDurations[c.id] || c.duration || 3;
      const cEnd = c.start + cDur;

      if (cEnd > clip.start + 0.01) {
        if (!best || c.start > best.start) {
          best = c;
          bestTrack = t;
        }
      }
    }
  }

  return best ? { clip: best, track: bestTrack } : null;
}

// ─── HOOK ─────────────────────────────────────────────────────────────

/**
 * Editor playback engine hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @returns {{
 *   audioContextRef: React.MutableRefObject<AudioContext|null>,
 *   audioSourcesRef: React.MutableRefObject<Record<string, {source: AudioBufferSourceNode, gainNode: GainNode}>>,
 *   animationRef: React.MutableRefObject<number|null>,
 *   loadAudioBuffer: (filePath: string) => Promise<AudioBuffer|null>,
 *   playClip: (clip: Object, track: Object, customOffset?: number|null) => Promise<void>,
 *   startPlaybackLoop: () => void,
 *   play: () => Promise<void>,
 *   playClipOnly: (clip: Object, trackId: string) => Promise<void>,
 *   resume: () => Promise<void>,
 *   pause: () => void,
 *   stop: () => void,
 *   seek: (time: number) => void,
 *   togglePlay: () => void,
 *   updateMasterGain: (newGain: number) => void,
 *   updateTrackVolume: (trackId: string, newVolume: number) => void,
 * }}
 */
export function useEditorAudioPlayback(core) {
  const {
    projectRef,
    clipDurationsRef,
    totalDurationRef,
    autoCrossfadeRef,
    loopStateRef,
    soloPlayClipIdRef,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    masterGainRef,
    stopAtTimeRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    setSoloPlayClipId,
    masterGain,
  } = core;

  // ─── INTERNAL REFS ───────────────────────────────────────────────────
  const audioContextRef = useRef(null);
  const audioSourcesRef = useRef({});
  const animationRef = useRef(null);

  /**
   * Returns (and caches) the shared `AudioContext`.
   * @returns {AudioContext}
   */
  const getCtx = useCallback(() => {
    const ctx = getSharedAudioContext();
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  // ─── STOP A SINGLE SOURCE ────────────────────────────────────────────

  /**
   * Stops and disconnects the source associated with `clipId`.
   * No-op if no source is registered for that clip.
   *
   * @param {string} clipId
   * @returns {void}
   */
  const stopSource = useCallback((clipId) => {
    const entry = audioSourcesRef.current[clipId];
    if (!entry) return;

    if (entry.source) {
      try {
        entry.source.stop();
      } catch {
        // Already stopped — harmless.
      }
      try {
        entry.source.disconnect();
      } catch {
        // Already disconnected — harmless.
      }
      try {
        entry.source.onended = null;
      } catch {
        // Ignore.
      }
    }

    if (entry.gainNode) {
      try {
        entry.gainNode.disconnect();
      } catch {
        // Ignore.
      }
    }

    delete audioSourcesRef.current[clipId];
  }, []);

  /**
   * Stops every registered source.
   * @returns {void}
   */
  const stopAllSources = useCallback(() => {
    for (const id of Object.keys(audioSourcesRef.current)) {
      stopSource(id);
    }
  }, [stopSource]);

  // ─── LOAD BUFFER ─────────────────────────────────────────────────────

  /**
   * Loads and decodes an audio file into an `AudioBuffer`.
   * Delegates to the shared audio context util (which caches internally).
   *
   * @param {string} filePath
   * @returns {Promise<AudioBuffer|null>}
   */
  const loadAudioBuffer = useCallback(async (filePath) => {
    return await loadAudioBufferShared(filePath);
  }, []);

  // ─── GAIN UPDATES ────────────────────────────────────────────────────

  /**
   * Applies a new master gain to every currently playing source,
   * preserving per-track volume.
   *
   * @param {number} newGain - Master gain (0-1, values >1 work but may clip).
   * @returns {void}
   */
  const updateMasterGain = useCallback(
    (newGain) => {
      for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
        if (!entry?.gainNode) continue;

        let trackVolume = 1;
        if (projectRef.current?.tracks) {
          for (const track of projectRef.current.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              trackVolume = track.volume || 1;
              break;
            }
          }
        }
        entry.gainNode.gain.value = trackVolume * newGain;
      }
    },
    [projectRef],
  );

  /**
   * Applies a new volume to every playing source of a given track.
   *
   * @param {string} trackId
   * @param {number} newVolume
   * @returns {void}
   */
  const updateTrackVolume = useCallback(
    (trackId, newVolume) => {
      const masterVolume = masterGainRef.current || 1;
      for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
        if (!entry?.gainNode) continue;
        if (!projectRef.current?.tracks) continue;

        for (const track of projectRef.current.tracks) {
          if (track.id !== trackId) continue;
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            entry.gainNode.gain.value = newVolume * masterVolume;
            break;
          }
        }
      }
    },
    [projectRef, masterGainRef],
  );

  // Sync `masterGain` state → ref + live sources.
  useEffect(() => {
    masterGainRef.current = masterGain;
    updateMasterGain(masterGain);
  }, [masterGain, updateMasterGain, masterGainRef]);

  // ─── PLAY A SINGLE CLIP ──────────────────────────────────────────────

  /**
   * Loads and plays one clip. Handles optional offline effects and
   * auto-crossfade.
   *
   * @param {Object} clip - `{ id, path, start, offset?, effects?, ... }`.
   * @param {Object} track - `{ id, volume?, ... }`.
   * @param {number|null} [customOffset=null] - Start offset within the
   *   clip file (overrides the position derived from `currentTime`).
   * @returns {Promise<void>}
   */
  const playClip = useCallback(
    async (clip, track, customOffset = null) => {
      if (!clip?.path) return;

      stopSource(clip.id);

      try {
        const buffer = await loadAudioBuffer(clip.path);
        if (!buffer) return;

        const ctx = getCtx();
        if (!ctx) return;

        let sourceBuffer = buffer;

        // Apply offline effects if any are enabled.
        if (clip.effects?.length > 0) {
          const hasActive = clip.effects.some((e) => e.enabled);
          if (hasActive) {
            try {
              const { applyEffectsToBuffer } =
                await import("@shared/utils/realTimeEffects");
              const processed = applyEffectsToBuffer(
                buffer,
                clip.effects,
                ctx.sampleRate,
                true,
              );
              if (processed) sourceBuffer = processed;
            } catch (e) {
              logWarn("AudioPlayback", "Effect application error", e);
            }
          }
        }

        const source = ctx.createBufferSource();
        source.buffer = sourceBuffer;

        const gainNode = ctx.createGain();
        const trackVolume = track?.volume || 1;
        const masterVolume = masterGainRef.current || 1;
        const targetGain = trackVolume * masterVolume;
        gainNode.gain.value = targetGain;

        // ─── AUTO-CROSSFADE ────────────────────────────────────────────
        if (autoCrossfadeRef.current) {
          const prev = findOverlappingPreviousClip(
            clip,
            projectRef.current,
            clipDurationsRef.current,
          );

          if (prev) {
            const prevDur =
              clipDurationsRef.current[prev.clip.id] || prev.clip.duration || 3;
            const prevEnd = prev.clip.start + prevDur;
            const overlap = Math.max(0, prevEnd - clip.start);

            if (overlap > CROSSFADE_MIN_OVERLAP) {
              const fadeDuration = Math.min(overlap, CROSSFADE_MAX_DURATION);
              const now = ctx.currentTime;

              const prevEntry = audioSourcesRef.current[prev.clip.id];
              if (prevEntry) {
                const prevGain = prevEntry.gainNode;
                const prevTarget =
                  (prev.track?.volume || 1) * (masterGainRef.current || 1);

                prevGain.gain.cancelScheduledValues(now);
                prevGain.gain.setValueAtTime(prevTarget, now);
                prevGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
              }

              gainNode.gain.cancelScheduledValues(now);
              gainNode.gain.setValueAtTime(0, now);
              gainNode.gain.linearRampToValueAtTime(
                targetGain,
                now + fadeDuration,
              );

              if (import.meta.env.DEV) {
                logInfo(
                  "AudioPlayback",
                  `🎚️ Crossfade ${overlap.toFixed(2)}s : "${prev.clip.name}" → "${clip.name}"`,
                );
              }
            }
          }
        }

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Compute the start offset within the buffer.
        let offset = 0;
        if (customOffset !== null && customOffset !== undefined) {
          offset = Math.max(
            0,
            Math.min(customOffset, sourceBuffer.duration - 0.01),
          );
        } else {
          const clipOffset = clip.offset || 0;
          const timeInClip = Math.max(
            0,
            currentTimeRef.current - (clip.start || 0),
          );
          offset = Math.min(
            clipOffset + timeInClip,
            sourceBuffer.duration - 0.01,
          );
        }

        source.start(0, offset);
        audioSourcesRef.current[clip.id] = { source, gainNode };
        source.onended = () => {};
      } catch (e) {
        logError("AudioPlayback", `playClip error "${clip.name}"`, e);
      }
    },
    [
      loadAudioBuffer,
      stopSource,
      autoCrossfadeRef,
      masterGainRef,
      currentTimeRef,
      projectRef,
      clipDurationsRef,
      getCtx,
    ],
  );

  // ─── PLAYBACK LOOP ───────────────────────────────────────────────────

  /**
   * Starts (or restarts) the `requestAnimationFrame` playback loop.
   *
   * The loop:
   * - Accumulates wall-clock deltas (~16ms gate).
   * - Computes the effective `loopTime` via `computeLoopTiming`.
   * - Iterates every track/clip and starts/stops sources as the playhead
   *   enters/exits each clip's window.
   * - Stops on `totalDuration` or `stopAtTime` (solo clip playback).
   *
   * Calling this while a loop is already running cancels the previous one.
   *
   * @returns {void}
   */
  const startPlaybackLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    stopAllSources();

    let lastTime = performance.now();
    let accumulated = 0;
    let isLoopRunning = true;

    const playingClips = new Set();
    const clipsStartedThisCycle = new Map();
    const generalLoopClipsStarted = new Map();

    /**
     * Stops and forgets every tracker entry for `clipId`.
     * @param {string} clipId
     * @returns {void}
     */
    const stopAndForget = (clipId) => {
      stopSource(clipId);
      playingClips.delete(clipId);
      clipsStartedThisCycle.delete(clipId);
      generalLoopClipsStarted.delete(clipId);
    };

    /**
     * One frame of the playback loop.
     * @returns {void}
     */
    const loop = () => {
      if (!isPlayingRef.current || isPausedRef.current) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      accumulated += delta;

      // Skip frames that arrive too fast (< ~60fps).
      if (accumulated < FRAME_DELTA_GATE) {
        if (isLoopRunning) animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const globalTime = currentTimeRef.current + accumulated;
      accumulated = 0;

      const timelineLoop = loopStateRef.current?.timeline || {
        enabled: false,
        start: 0,
        end: 10,
        durationMode: "cycles",
        cycleCount: 3,
        manualDuration: 10,
      };
      const { loopTime, isInLoopZone, currentCycle } = computeLoopTiming(
        globalTime,
        timelineLoop,
      );
      const loopStart = timelineLoop.start || 0;
      const loopEnd = timelineLoop.end || 10;

      const tracks = projectRef.current?.tracks || [];
      const clipDurationsMap = clipDurationsRef.current;
      const soloClipId = soloPlayClipIdRef.current;
      const activeClipsThisFrame = new Set();

      // Which clips have an individual loop enabled?
      const individualLoopClips = new Set();
      for (const track of tracks) {
        for (const clip of track.clips) {
          if (loopStateRef.current?.clips?.[clip.id]?.enabled) {
            individualLoopClips.add(clip.id);
          }
        }
      }

      for (const track of tracks) {
        if (track.muted) continue;

        for (const clip of track.clips) {
          const duration = clipDurationsMap[clip.id] || clip.duration || 3;
          const start = clip.start || 0;
          const end = start + duration;
          const isClipLooping = individualLoopClips.has(clip.id);

          // Solo mode: skip everything except the solo clip.
          if (soloClipId && clip.id !== soloClipId) {
            if (playingClips.has(clip.id)) {
              stopAndForget(clip.id);
            }
            continue;
          }

          // ─── CLIP LOOP ─────────────────────────────────────────────
          if (isClipLooping) {
            const clipLoopData = loopStateRef.current.clips[clip.id];
            const clipLoopStart = clipLoopData?.start || start;
            const clipLoopEnd = clipLoopData?.end || end;

            if (globalTime >= clipLoopStart && globalTime < clipLoopEnd) {
              const elapsed = globalTime - clipLoopStart;
              const positionInClip = elapsed % duration;
              const currentClipCycle = Math.floor(elapsed / duration);
              const lastCycle = clipsStartedThisCycle.get(clip.id);

              if (lastCycle !== currentClipCycle) {
                clipsStartedThisCycle.set(clip.id, currentClipCycle);
                playClip(clip, track, positionInClip);
                playingClips.add(clip.id);
              }
              activeClipsThisFrame.add(clip.id);
            } else if (globalTime >= clipLoopEnd) {
              if (playingClips.has(clip.id)) {
                stopAndForget(clip.id);
              }
            }
            continue;
          }

          // ─── TIMELINE LOOP ─────────────────────────────────────────
          if (isInLoopZone) {
            const inZone = isClipInZone(start, end, loopStart, loopEnd);

            if (inZone) {
              if (loopTime >= start && loopTime < end) {
                const positionInClip = loopTime - start;
                const lastCycle = generalLoopClipsStarted.get(clip.id);
                if (lastCycle !== currentCycle) {
                  generalLoopClipsStarted.set(clip.id, currentCycle);
                  playClip(clip, track, positionInClip);
                  playingClips.add(clip.id);
                }
                activeClipsThisFrame.add(clip.id);
              }
            }
            continue;
          }

          // ─── NORMAL PLAYBACK ───────────────────────────────────────
          if (globalTime >= start && globalTime < end) {
            activeClipsThisFrame.add(clip.id);
            if (!playingClips.has(clip.id)) {
              const clipOffset = clip.offset || 0;
              const offset = clipOffset + (globalTime - start);
              playClip(clip, track, offset);
              playingClips.add(clip.id);
            }
          }
        }
      }

      // Stop sources whose clips are no longer active (unless still
      // covered by a loop that hasn't ended yet).
      for (const clipId of playingClips) {
        if (activeClipsThisFrame.has(clipId)) continue;
        if (individualLoopClips.has(clipId)) continue;

        let shouldContinue = false;
        if (isInLoopZone) {
          for (const track of tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (!clip) continue;
            const start = clip.start || 0;
            const duration = clipDurationsMap[clip.id] || clip.duration || 3;
            if (isClipInZone(start, start + duration, loopStart, loopEnd)) {
              const offsetInClip = (loopTime - start) % duration;
              if (offsetInClip >= 0 && offsetInClip < duration) {
                shouldContinue = true;
              }
            }
            break;
          }
        }

        if (!shouldContinue) {
          stopAndForget(clipId);
        }
      }

      // Cleanup "already started this cycle" markers from previous cycles.
      if (isInLoopZone) {
        for (const [clipId, cycle] of generalLoopClipsStarted) {
          if (cycle < currentCycle && !playingClips.has(clipId)) {
            generalLoopClipsStarted.delete(clipId);
          }
        }
      } else {
        generalLoopClipsStarted.clear();
      }

      setCurrentTime(globalTime);
      currentTimeRef.current = globalTime;

      // ─── STOP AT TIME (solo clip playback) ─────────────────────────
      const stopAt = stopAtTimeRef.current;
      if (stopAt !== null && stopAt !== undefined && globalTime >= stopAt) {
        setCurrentTime(stopAt);
        currentTimeRef.current = stopAt;
        setIsPlaying(false);
        isPlayingRef.current = false;
        setStopAtTime(null);
        stopAtTimeRef.current = null;
        setSoloPlayClipId(null);
        soloPlayClipIdRef.current = null;

        stopAllSources();
        playingClips.clear();
        clipsStartedThisCycle.clear();
        generalLoopClipsStarted.clear();
        isLoopRunning = false;
        return;
      }

      // ─── STOP AT END OF PROJECT ────────────────────────────────────
      const totalDuration = totalDurationRef.current;
      if (globalTime >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(totalDuration);
        setStopAtTime(null);
        stopAtTimeRef.current = null;
        setSoloPlayClipId(null);
        soloPlayClipIdRef.current = null;

        stopAllSources();
        playingClips.clear();
        clipsStartedThisCycle.clear();
        generalLoopClipsStarted.clear();
        isLoopRunning = false;
        return;
      }

      if (isLoopRunning) {
        animationRef.current = requestAnimationFrame(loop);
      }
    };

    animationRef.current = requestAnimationFrame(loop);
  }, [
    playClip,
    stopSource,
    stopAllSources,
    projectRef,
    clipDurationsRef,
    loopStateRef,
    soloPlayClipIdRef,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    totalDurationRef,
    stopAtTimeRef,
    setCurrentTime,
    setIsPlaying,
    setStopAtTime,
    setSoloPlayClipId,
  ]);

  // ─── CONTROLS ────────────────────────────────────────────────────────

  /**
   * Starts playback from the beginning.
   *
   * Resets `currentTime` to 0, clears any pending `stopAtTime`, resumes
   * the `AudioContext` if suspended, and starts the rAF loop after a
   * short delay (gives the browser time to schedule the first sources).
   *
   * @returns {Promise<void>}
   */
  const play = useCallback(async () => {
    setIsPaused(false);
    isPausedRef.current = false;
    setStopAtTime(null);
    stopAtTimeRef.current = null;

    stopAllSources();

    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();

      setCurrentTime(0);
      currentTimeRef.current = 0;
      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;

      setTimeout(() => startPlaybackLoop(), PLAYBACK_START_DELAY_MS);
    } catch (e) {
      logError("AudioPlayback", "play error", e);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [
    startPlaybackLoop,
    stopAllSources,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    stopAtTimeRef,
    getCtx,
  ]);

  /**
   * Plays only one clip (solo preview).
   *
   * Sets `soloPlayClipId` and a `stopAtTime` at the clip's end, so the
   * playback loop auto-stops as soon as the clip finishes.
   *
   * @param {Object} clip
   * @param {string} _trackId - Unused; kept for API symmetry with other
   *   clip methods (solo playback only needs the clip).
   * @returns {Promise<void>}
   */
  const playClipOnly = useCallback(
    // NOTE: `_trackId` is accepted for API symmetry with other clip
    // methods, but solo playback only needs the clip itself (it uses
    // `clip.id` + the `stopAtTime` mechanism).
    async (clip, _trackId) => {
      setSoloPlayClipId(clip.id);
      soloPlayClipIdRef.current = clip.id;

      const clipStart = clip.start || 0;
      const clipDuration =
        clipDurationsRef.current[clip.id] || clip.duration || 3;
      const clipEnd = clipStart + clipDuration;

      setCurrentTime(clipStart);
      currentTimeRef.current = clipStart;
      setStopAtTime(clipEnd);
      stopAtTimeRef.current = clipEnd;

      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();

        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsPaused(false);
        isPausedRef.current = false;

        setTimeout(() => startPlaybackLoop(), PLAYBACK_START_DELAY_MS);
      } catch (e) {
        logError("AudioPlayback", "playClipOnly error", e);
        setIsPlaying(false);
        isPlayingRef.current = false;
        setSoloPlayClipId(null);
        soloPlayClipIdRef.current = null;
      }
    },
    [
      startPlaybackLoop,
      clipDurationsRef,
      currentTimeRef,
      isPlayingRef,
      isPausedRef,
      soloPlayClipIdRef,
      setCurrentTime,
      setIsPlaying,
      setIsPaused,
      setSoloPlayClipId,
      setStopAtTime,
      stopAtTimeRef,
      getCtx,
    ],
  );

  /**
   * Resumes playback after a pause (restarts the rAF loop without
   * resetting `currentTime`).
   *
   * @returns {Promise<void>}
   */
  const resume = useCallback(async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    } catch (e) {
      logWarn("AudioPlayback", "resume ctx error", e);
    }

    setIsPaused(false);
    isPausedRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setTimeout(() => startPlaybackLoop(), PLAYBACK_START_DELAY_MS);
  }, [
    startPlaybackLoop,
    isPlayingRef,
    isPausedRef,
    setIsPlaying,
    setIsPaused,
    getCtx,
  ]);

  /**
   * Pauses playback (stops all sources, keeps `currentTime`).
   * @returns {void}
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    stopAllSources();
  }, [stopAllSources, isPlayingRef, isPausedRef, setIsPlaying, setIsPaused]);

  /**
   * Fully stops playback (resets `currentTime` to 0, clears solo state).
   * @returns {void}
   */
  const stop = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setStopAtTime(null);
    stopAtTimeRef.current = null;
    setSoloPlayClipId(null);
    soloPlayClipIdRef.current = null;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    stopAllSources();
  }, [
    stopAllSources,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    soloPlayClipIdRef,
    stopAtTimeRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    setSoloPlayClipId,
  ]);

  /**
   * Moves the playhead to `time` (clamped to `[0, totalDuration]`) and
   * stops every source (playback resumes from the new position on next
   * play/resume).
   *
   * @param {number} time
   * @returns {void}
   */
  const seek = useCallback(
    (time) => {
      const clamped = Math.max(0, Math.min(time, totalDurationRef.current));
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;

      stopAllSources();
    },
    [stopAllSources, totalDurationRef, currentTimeRef, setCurrentTime],
  );

  /**
   * Toggles play/pause (or restarts from 0 if idle).
   * @returns {void}
   */
  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
      return;
    }
    if (isPausedRef.current) {
      resume();
      return;
    }
    setSoloPlayClipId(null);
    soloPlayClipIdRef.current = null;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    play();
  }, [
    pause,
    resume,
    play,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    soloPlayClipIdRef,
    setCurrentTime,
    setSoloPlayClipId,
  ]);

  return {
    audioContextRef,
    audioSourcesRef,
    animationRef,
    loadAudioBuffer,
    playClip,
    startPlaybackLoop,
    play,
    playClipOnly,
    resume,
    pause,
    stop,
    seek,
    togglePlay,
    updateMasterGain,
    updateTrackVolume,
  };
}
