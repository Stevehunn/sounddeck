/**
 * @file Options page section observer.
 *
 * Keeps the active tab in sync with the viewport:
 * - **`IntersectionObserver`** — watches every section node (by `SECTIONS`
 *   order) and updates `activeSection` to the one with the highest
 *   intersection ratio (threshold 0.2 to avoid jitter).
 * - **`scrollToSection(id)`** — imperative scroll with a 800 ms "ignore
 *   observer" window (otherwise the observer would immediately revert
 *   the tab the user just clicked).
 *
 * The observer is set up ~200 ms after mount so React has time to commit
 * the section refs (the effect runs before children commit their refs).
 *
 * @see ./constants.js (`SECTIONS`)
 * @see ../Options.jsx
 */

import { useState, useRef, useEffect } from 'react'
import { SECTIONS } from '../constants'

/** Window (ms) during which the observer ignores events after a scroll. */
const SCROLL_IGNORE_MS = 800

/** Delay (ms) before the initial observer setup (wait for refs). */
const OBSERVER_SETUP_DELAY_MS = 200

/** Minimum intersection ratio to be considered "active". */
const MIN_ACTIVE_RATIO = 0.2

/**
 * Options page section observer hook.
 *
 * @returns {{
 *   activeSection: string,
 *   sectionRefs: {current: Record<string, HTMLElement>},
 *   scrollToSection: (sectionId: string) => void,
 * }}
 */
export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState('appearance')
  const sectionRefs = useRef({})
  const observerRef = useRef(null)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    const setupObserver = () => {
      const sections = SECTIONS.map((s) => sectionRefs.current[s.id]).filter(
        Boolean
      )

      if (sections.length === 0) {
        // Refs aren't committed yet → retry shortly.
        setTimeout(setupObserver, 100)
        return
      }

      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingRef.current) return

          let maxRatio = 0
          let maxId = null

          entries.forEach((entry) => {
            const ratio = entry.intersectionRatio
            if (ratio > maxRatio) {
              maxRatio = ratio
              maxId = entry.target.dataset.section
            }
          })

          if (maxId && maxRatio > MIN_ACTIVE_RATIO) {
            setActiveSection(maxId)
          }
        },
        {
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
          rootMargin: '-60px 0px -40% 0px',
        }
      )

      sections.forEach((section) => {
        if (section) observer.observe(section)
      })

      observerRef.current = observer

      return () => {
        observer.disconnect()
      }
    }

    const timer = setTimeout(setupObserver, OBSERVER_SETUP_DELAY_MS)
    return () => {
      clearTimeout(timer)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  /**
   * Scrolls to the given section and updates `activeSection` immediately.
   *
   * @param {string} sectionId
   * @returns {void}
   */
  const scrollToSection = (sectionId) => {
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      isScrollingRef.current = true
      setActiveSection(sectionId)
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })

      setTimeout(() => {
        isScrollingRef.current = false
      }, SCROLL_IGNORE_MS)
    }
  }

  return { activeSection, sectionRefs, scrollToSection }
}