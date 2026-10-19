/**
 * @file React hook tracking all currently playing sounds.
 *
 * AudioService owns the sound lifecycle — this hook only *reflects* its
 * state. It subscribes to the AudioService playback events and polls the
 * progress of each playing sound on a fixed interval.
 *
 * Lifecycle (managed by AudioService, not this hook):
 * - **Add** → `playSound()` → `markSoundPlaying()`
 * - **Remove** → `stopSound()`, `onend`, `onstop`, `onloaderror` → `markSoundStopped()`
 * - **Clear** → `stopAllSounds()`, `setCurrentPlayingSound(null)`
 *
 * Progress polling only runs while at least one sound is playing, so idle
 * apps don't wake up every 100ms.
 *
 * @see @core/services/AudioService.js
 */

import { useState, useEffect, useCallback } from "react";
import {
  subscribeToPlayback,
  getSoundProgress,
  isPausedSound,
  togglePauseSound,
  stopSound,
} from "@core/services/AudioService";

/** Interval at which we poll playback progress, in milliseconds. */
const PROGRESS_POLL_MS = 100;

/**
 * Minimum duration (in seconds) for a progress bar to be displayed. Sounds
 * shorter than this don't get a progress bar (it would just flash).
 */
const MIN_DURATION_FOR_BAR = 2;

/**
 * Tracks every currently playing sound, including its progress and pause
 * state.
 *
 * Returns both the full list (`playingSounds`) and a "last sound" shortcut
 * (`sound`, `progress`, `isPaused`) for backward compatibility with code
 * that only ever cared about one sound at a time.
 *
 * @param {Array<{id: string, name: string}>} sounds
 *   Full list of sounds from the store. Used to resolve the sound metadata
 *   for each playing sound ID.
 *
 * @returns {{
 *   sound: object|null,
 *   progress: object|null,
 *   isPaused: boolean,
 *   playingSounds: Array<{
 *     id: string,
 *     sound: object,
 *     progress: object|null,
 *     isPaused: boolean,
 *   }>,
 *   togglePause: (id: string) => void,
 *   stop: (id: string) => void,
 * }}
 */
export function useCurrentPlaying(sounds) {
  const [playingIds, setPlayingIds] = useState([]);
  const [stateById, setStateById] = useState({});

  // ─── Subscribe to AudioService playback events ──────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToPlayback((snapshot) => {
      const ids = snapshot.playingIds || (snapshot.id ? [snapshot.id] : []);
      setPlayingIds(ids);
      // Clear the per-sound state when nothing is playing anymore
      if (ids.length === 0) setStateById({});
    });
    return unsubscribe;
  }, []);

  // ─── Poll progress + pause state for each playing sound ─────────────
  useEffect(() => {
    if (playingIds.length === 0) return;

    const tick = () => {
      const updates = {};
      for (const id of playingIds) {
        const paused = isPausedSound(id);
        const p = getSoundProgress(id);
        const showProgress = p && p.duration > MIN_DURATION_FOR_BAR ? p : null;
        updates[id] = { progress: showProgress, isPaused: paused };
      }
      setStateById(updates);
    };

    tick();
    const interval = setInterval(tick, PROGRESS_POLL_MS);
    return () => clearInterval(interval);
  }, [playingIds]);

  // ─── Enriched list (most recent first) ──────────────────────────────
  // `sounds` is a prop, so it's always fresh — no need for a ref.
  const playingSounds = playingIds
    .slice()
    .reverse()
    .map((id) => {
      const sound = sounds?.find((s) => s.id === id);
      if (!sound) return null;
      const s = stateById[id] || { progress: null, isPaused: false };
      return {
        id,
        sound,
        progress: s.progress,
        isPaused: s.isPaused,
      };
    })
    .filter(Boolean);

  // Backward compat: expose the most recently started sound directly
  const last = playingSounds[0] || null;

  const togglePause = useCallback((id) => togglePauseSound(id), []);
  const stop = useCallback((id) => stopSound(id), []);

  return {
    // Backward compat (last sound)
    sound: last?.sound || null,
    progress: last?.progress || null,
    isPaused: last?.isPaused || false,
    // New API (full list)
    playingSounds,
    togglePause,
    stop,
  };
}

export default useCurrentPlaying;
