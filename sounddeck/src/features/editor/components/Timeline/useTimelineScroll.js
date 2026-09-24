// src/features/editor/components/Timeline/useTimelineScroll.js
import { useState, useRef, useCallback } from 'react'

/**
 * Sync le scroll horizontal entre :
 *  - la zone clips (source)
 *  - le ruler (via transform)
 *  - la loop strip (via transform)
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
   * Wheel handler sur le ruler : scroll la zone clips
   * (sauf si Ctrl/Meta pour laisser passer le zoom).
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