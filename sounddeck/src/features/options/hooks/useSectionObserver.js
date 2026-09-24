// src/features/options/hooks/useSectionObserver.js
import { useState, useRef, useEffect } from 'react'
import { SECTIONS } from '../constants'

export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState('appearance')
  const sectionRefs = useRef({})
  const observerRef = useRef(null)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    const setupObserver = () => {
      const sections = SECTIONS
        .map((s) => sectionRefs.current[s.id])
        .filter(Boolean)

      if (sections.length === 0) {
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

          if (maxId && maxRatio > 0.2) {
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

    const timer = setTimeout(setupObserver, 200)
    return () => {
      clearTimeout(timer)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const scrollToSection = (sectionId) => {
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      isScrollingRef.current = true
      setActiveSection(sectionId)
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })

      setTimeout(() => {
        isScrollingRef.current = false
      }, 800)
    }
  }

  return { activeSection, sectionRefs, scrollToSection }
}