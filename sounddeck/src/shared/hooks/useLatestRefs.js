/**
 * @file "Latest ref" hooks — stable refs that always hold the latest value.
 *
 * Useful when you need to read a prop/state from inside a stable callback
 * (event listener, `setTimeout`, `setInterval`, …) without re-creating the
 * callback on every render.
 *
 * Two flavors:
 * - **`useLatestRef(value)`** — a single ref, updated after every render.
 * - **`useLatestRefs({ a, b, c })`** — an object of refs, one per key.
 *
 * Both update their `.current` inside a `useEffect` (after commit), which
 * is the canonical "latest ref" pattern from the React docs:
 * https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
 *
 * @see @shared/hooks/index.js (re-exports)
 */

import { useRef, useEffect, useMemo } from 'react'

/**
 * Returns a ref whose `.current` is always the latest `value`.
 *
 * The ref is updated after each render (in a `useEffect`), so callbacks
 * invoked between commit and the next effect see the value from the
 * previous render — which is almost always what you want for event
 * listeners and timers.
 *
 * @template T
 * @param {T} value
 * @returns {{current: T}}
 */
export function useLatestRef(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

/**
 * Returns an object of refs, one per key of `values`, kept up to date.
 *
 * The ref map is created once (per set of keys) and reused across renders.
 * Values are synced in a `useEffect` after each commit.
 *
 * @example
 *   const refs = useLatestRefs({
 *     sounds: store.sounds,
 *     volume: store.volume,
 *     onPlay: handlePlay,
 *   })
 *   // read: refs.sounds.current, refs.volume.current, refs.onPlay.current
 *
 * @param {Record<string, any>} values
 * @returns {Record<string, {current: any}>}
 */
export function useLatestRefs(values) {
  // Stable signature of the key set — a simple string that the `useMemo`
  // dep array can reference directly (ESLint rejects `Object.keys(...)`
  // inline in the dep list).
  const keysSignature = Object.keys(values).join('|')

  // Stable "map" of refs — one per key. Rebuilt only when the set of keys
  // changes (added/removed keys), not when values change.
  const refsMap = useMemo(() => {
    const map = {}
    for (const key of Object.keys(values)) {
      map[key] = { current: values[key] }
    }
    return map
    // `values` is intentionally omitted — the map only depends on the key
    // SET (captured by `keysSignature`), and values are synced in the
    // effect below. Adding `values` here would rebuild the map on every
    // render, defeating the point of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature])

  // Sync all refs after every commit. Intentionally no deps array:
  // we want this to run on EVERY render so `.current` stays fresh.
  useEffect(() => {
    for (const key of Object.keys(values)) {
      if (refsMap[key]) {
        // Justification for the lint disable below: `refsMap[key]` is a
        // plain mutable holder `{ current: ... }` created inside a
        // `useMemo` (not a React ref). `react-hooks/immutability` flags
        // this because it can't distinguish "mutating a useMemo output"
        // from "mutating props/state". Mutating these holders is the
        // entire purpose of this hook.
        // eslint-disable-next-line react-hooks/immutability
        refsMap[key].current = values[key]
      }
    }
  })

  return refsMap
}

export default useLatestRefs