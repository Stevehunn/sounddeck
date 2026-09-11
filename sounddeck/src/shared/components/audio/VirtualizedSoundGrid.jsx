// src/shared/components/audio/VirtualizedSoundGrid.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import SoundCard from '@shared/components/audio/SoundCard'

export default function VirtualizedSoundGrid({
  sounds,
  shortcuts,
  audioDevice,
  volume,
  loopEnabled,
  playLocally,
  store,
  addToast,
  lang,
  cardSize = 'medium',
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedSoundId,
  dragOverIndex,
  dropTarget,
  lazyLoading = true,
  itemsPerPage = 20
}) {
  const { t } = useLanguage()
  const [visibleSounds, setVisibleSounds] = useState([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef(null)
  const observerRef = useRef(null)
  const lastElementRef = useRef(null)

  const cardSizes = {
    small: 90,
    medium: 110,
    large: 140
  }

  // Charger les sons initiaux
  useEffect(() => {
    if (!lazyLoading) {
      setVisibleSounds(sounds)
      setHasMore(false)
      return
    }

    const initial = sounds.slice(0, itemsPerPage)
    setVisibleSounds(initial)
    setHasMore(sounds.length > itemsPerPage)
    setPage(1)
  }, [sounds, lazyLoading, itemsPerPage])

  // Charger plus de sons
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore || !lazyLoading) return

    setIsLoading(true)
    const nextPage = page + 1
    const start = page * itemsPerPage
    const end = start + itemsPerPage
    const newSounds = sounds.slice(start, end)

    if (newSounds.length === 0) {
      setHasMore(false)
      setIsLoading(false)
      return
    }

    setVisibleSounds(prev => [...prev, ...newSounds])
    setPage(nextPage)
    setIsLoading(false)
    setHasMore(end < sounds.length)
  }, [page, itemsPerPage, sounds, isLoading, hasMore, lazyLoading])

  // Observer pour le scroll infini
  useEffect(() => {
    if (!lazyLoading || !hasMore) return

    if (!lastElementRef.current) {
      if (visibleSounds.length > 0 && visibleSounds.length < sounds.length) {
        loadMore()
      }
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(lastElementRef.current)
    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lastElementRef.current, loadMore, isLoading, hasMore, lazyLoading, visibleSounds.length, sounds.length])

  // Réinitialiser quand les sons changent
  useEffect(() => {
    if (lazyLoading) {
      const initial = sounds.slice(0, itemsPerPage)
      setVisibleSounds(initial)
      setHasMore(sounds.length > itemsPerPage)
      setPage(1)
    }
  }, [sounds.length, lazyLoading, itemsPerPage])

  const cardWidth = cardSizes[cardSize] || 110

  return (
    <div ref={containerRef}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
        gap: 10,
        position: 'relative',
        zIndex: 1
      }}>
        {visibleSounds.map((s, index) => {
          const isDragging = draggedSoundId === s.id
          const isDragOver = dragOverIndex === index && !isDragging
          const isLast = index === visibleSounds.length - 1

          return (
            <div
              key={s.id}
              ref={isLast ? lastElementRef : null}
              draggable={draggable}
              onDragStart={(e) => draggable && onDragStart?.(e, s.id, index, dropTarget)}
              onDragEnd={(e) => draggable && onDragEnd?.(e)}
              onDragOver={(e) => draggable && onDragOver?.(e, index)}
              onDrop={(e) => draggable && onDrop?.(e, index, dropTarget)}
              style={{
                opacity: isDragging ? 0.3 : 1,
                transform: isDragOver ? 'scale(1.03)' : 'scale(1)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                cursor: draggable ? 'grab' : 'default',
                position: 'relative',
                zIndex: isDragging ? 10 : 1,
                boxShadow: isDragOver ? '0 0 20px rgba(124,111,247,0.3)' : 'none'
              }}
            >
              {isDragOver && (
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: 4,
                  right: 4,
                  height: 3,
                  background: 'var(--accent)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                  zIndex: 5,
                  animation: 'fadeIn 0.2s ease',
                  boxShadow: '0 0 10px var(--accent)'
                }} />
              )}
              <SoundCard
                sound={s}
                shortcut={shortcuts[s.id]}
                audioDevice={audioDevice}
                volume={volume}
                loopEnabled={loopEnabled}
                playLocally={playLocally}
                currentProfileId={store.currentProfileId}
                onToggleFavorite={store.toggleFavorite}
                onSetShortcut={store.setShortcut}
                onVolumeChange={store.updateSoundVolume}
                onPlay={store.incrementPlayCount}
                onRemoveFromProfile={async (id) => {
                  await store.removeSoundFromProfile(id, store.currentProfileId)
                  addToast?.(t('removedFromProfile'), 'info')
                }}
                onDelete={async (id) => {
                  await store.deleteSound(id)
                  addToast?.(t('deleted'), 'info')
                }}
                onRename={(id, name) => store.updateSound(id, { name })}
                onChangeImage={store.updateSoundImage}
                onChangeEmoji={store.updateSoundEmoji}
                onAddTag={async (id, tag) => {
                  await store.addTagToSound(id, tag)
                  addToast?.(`${t('tagAdded')}: #${tag}`, 'success')
                }}
                onRemoveTag={async (id, tag) => {
                  await store.removeTagFromSound(id, tag)
                  addToast?.(`${t('tagRemoved')}: #${tag}`, 'info')
                }}
                tags={store.tags[s.id] || []}
                draggable={draggable}
                lang={lang}
                onDragStart={(e) => draggable && onDragStart?.(e, s.id, index, dropTarget)}
                onDragEnd={(e) => draggable && onDragEnd?.(e)}
                layout={store.keyboardLayout || 'qwerty'}
                size={cardSize}
              />
            </div>
          )
        })}
      </div>

      {/* Indicateur de chargement */}
      {lazyLoading && isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: 'var(--text-tertiary)',
          fontSize: 12
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
          {t('loading')}
        </div>
      )}

      {/* Message de fin */}
      {lazyLoading && !hasMore && visibleSounds.length > 0 && visibleSounds.length === sounds.length && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          color: 'var(--text-tertiary)',
          fontSize: 11
        }}>
          {visibleSounds.length} {t('soundsLoaded')}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}