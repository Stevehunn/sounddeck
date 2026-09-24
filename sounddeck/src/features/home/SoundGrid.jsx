// src/features/home/SoundGrid.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import SoundCard from '@shared/components/audio/SoundCard'

const CARD_SIZES = {
  small: 90,
  medium: 110,
  large: 140,
}

export default function SoundGrid({
  sounds,
  shortcuts,
  audioDevice,
  volume,
  loopEnabled,
  playLocally,
  store,
  addToast,
  gridRef,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedSoundId,
  dragOverIndex,
  dropTarget,
  onDelete,
  testId,
}) {
  const { t } = useLanguage()
  const cardSize = store.cardSize || 'medium'

  return (
    <div
      ref={gridRef}
      data-testid={testId || 'sound-grid'}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_SIZES[cardSize]}px, 1fr))`,
        gap: 10,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {sounds.map((s, index) => {
        const isDragging = draggedSoundId === s.id
        const isDragOver = dragOverIndex === index && !isDragging

        return (
          <div
            key={s.id}
            draggable={draggable}
            onDragStart={(e) => draggable && onDragStart(e, s.id, index, dropTarget)}
            onDragEnd={(e) => draggable && onDragEnd(e)}
            onDragOver={(e) => draggable && onDragOver(e, index)}
            onDrop={(e) => draggable && onDrop(e, index, dropTarget)}
            style={{
              opacity: isDragging ? 0.3 : 1,
              transform: isDragOver ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              cursor: draggable ? 'grab' : 'default',
              position: 'relative',
              zIndex: isDragging ? 10 : 1,
              boxShadow: isDragOver ? '0 0 20px rgba(124,111,247,0.3)' : 'none',
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
                boxShadow: '0 0 10px var(--accent)',
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
                addToast(t('removedFromProfile'), 'info')
              }}
              onDelete={onDelete}
              onRename={(id, name) => store.updateSound(id, { name })}
              onChangeImage={store.updateSoundImage}
              onChangeEmoji={store.updateSoundEmoji}
              onAddTag={async (id, tag) => {
                await store.addTagToSound(id, tag)
                addToast(`${t('tagAdded')}: #${tag}`, 'success')
              }}
              onRemoveTag={async (id, tag) => {
                await store.removeTagFromSound(id, tag)
                addToast(`${t('tagRemoved')}: #${tag}`, 'info')
              }}
              tags={store.tags[s.id] || []}
              draggable={draggable}
              layout={store.keyboardLayout || 'qwerty'}
              size={cardSize}
            />
          </div>
        )
      })}
    </div>
  )
}