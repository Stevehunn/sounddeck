/**
 * @file Horizontal scroll synchronization across the timeline.
 *
 * Three surfaces need to stay aligned:
 * 1. **Clips container** — the source of truth (native scroll).
 * 2. **Ruler inner** — translated via `transform` (no native scrollbar).
 * 3. **Loop strip inner** — same as ruler.
 *
 * The hook exposes refs for the three containers plus two handlers:
 * - `handleClipsScroll` — listens on the clips container's `scroll` event
 *   and writes the new `scrollLeft` to the ruler and loop containers.
 * - `handleRulerWheel` — wheel on the ruler scrolls the clips container
 *   (unless Ctrl/Meta is held, which is reserved for zoom).
 *
 * @see ../Timeline/index.jsx
 * @see ./useTimelineClickHandlers.js
 */

import { useState, useRef, useCallback } from 'react'

/**
 * Timeline horizontal scroll synchronization.
 *
 * @returns {{
 *   scrollLeft: number,
 *   clipsContainerRef: React.MutableRefObject<HTMLElement|null>,
 *   rulerContainerRef: React.MutableRefObject<HTMLElement|null>,
 *   rulerInnerRef: React.MutableRefObject<HTMLElement|null>,
 *   loopContainerRef: React.MutableRefObject<HTMLElement|null>,
 *   handleClipsScroll: (e: React.UIEvent<HTMLElement>) => void,
 *   handleRulerWheel: (e: React.WheelEvent<HTMLElement>) => void,
 * }}
 */
export function useTimelineScroll() {
  const [scrollLeft, setScrollLeft] = useState(0)

  const rulerInnerRef = useRef(null)
  const loopContainerRef = useRef(null)
  const clipsContainerRef = useRef(null)
  const rulerContainerRef = useRef(null)

  const handleClipsScroll = useCallback((e) => {
    const sl = e.currentTarget.scrollLeft
    setScrollLeft(sl)

    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(-${sl}px)`
    }
    if (loopContainerRef.current) {
      loopContainerRef.current.style.transform = `translateX(-${sl}px)`
    }
  }, [])

  /**
   * Wheel handler on the ruler: scrolls the clips container unless
   * Ctrl/Meta is held (reserved for the zoom handler).
   *
   * @param {React.WheelEvent} e
   * @returns {void}
   */
  const handleRulerWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) return
    if (clipsContainerRef.current) {
      clipsContainerRef.current.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }, [])

  return {
    scrollLeft,
    clipsContainerRef,
    rulerContainerRef,
    rulerInnerRef,
    loopContainerRef,
    handleClipsScroll,
    handleRulerWheel,
  }
}

export default useTimelineScroll