// Optimisation des performances avec virtualisation

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * Hook personnalisé pour la virtualisation des listes
 */
export function useVirtualization({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  scrollElement
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })

  useEffect(() => {
    if (!scrollElement) return
    
    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop)
    }
    
    scrollElement.addEventListener('scroll', handleScroll)
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [scrollElement])

  useEffect(() => {
    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    setVisibleRange({ start: startIndex, end: endIndex })
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end
  }
}

/**
 * Composant de conteneur virtualisé
 */
export function VirtualizedList({
  items,
  itemHeight,
  containerHeight = 400,
  overscan = 3,
  renderItem,
  className = '',
  style = {}
}) {
  const containerRef = useRef(null)
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex
  } = useVirtualization({
    items,
    itemHeight,
    containerHeight,
    overscan,
    scrollElement: containerRef.current
  })

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        ...style
      }}
      className={className}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={item.id || startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook pour le lazy loading des sons
 */
export function useLazyLoading(loadFunction, threshold = 0.8) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const observerRef = useRef(null)
  const lastElementRef = useRef(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    try {
      const newItems = await loadFunction(page)
      if (newItems.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...newItems])
        setPage(prev => prev + 1)
      }
    } catch (e) {
      console.error('Erreur chargement:', e)
    } finally {
      setIsLoading(false)
    }
  }, [loadFunction, page, isLoading, hasMore])

  // Observer pour le scroll infini
  useEffect(() => {
    if (!lastElementRef.current) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadMore()
        }
      },
      { threshold }
    )
    
    observer.observe(lastElementRef.current)
    observerRef.current = observer
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lastElementRef.current, loadMore, isLoading, hasMore, threshold])

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    lastElementRef,
    setItems
  }
}

/**
 * Mémorisation des calculs coûteux
 */
export function useMemoizedValue(fn, deps) {
  const cache = useRef(new Map())
  
  return useMemo(() => {
    const key = JSON.stringify(deps)
    if (cache.current.has(key)) {
      return cache.current.get(key)
    }
    const result = fn()
    cache.current.set(key, result)
    return result
  }, [fn, ...deps])
}

export default {
  useVirtualization,
  VirtualizedList,
  useLazyLoading,
  useMemoizedValue
}