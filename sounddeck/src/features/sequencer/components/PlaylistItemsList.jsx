/**
 * @file Playlist items list — drag & drop reordering, empty state.
 *
 * Drag state is tracked locally (`dragOverIdx`); the actual reorder is
 * delegated to `onSaveItemsOnly` (parent) so it's persisted immediately.
 *
 * @see ./PlaylistItem.jsx
 * @see ./PlaylistEditor.jsx
 */

import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import PlaylistItem from './PlaylistItem'

/**
 * Playlist items list.
 *
 * @param {Object} props
 * @param {Array<Object>} props.items
 * @param {Array<Object>} props.sounds
 * @param {boolean} props.playing
 * @param {number} props.currentIdx
 * @param {Object|null} props.currentProgress
 * @param {(items: Array) => void} props.onSaveItemsOnly
 * @param {(idx: number, changes: Object) => void} props.onUpdateItem
 * @param {(idx: number) => void} props.onRemove
 * @param {() => void} props.onAddSounds
 * @returns {JSX.Element}
 */
export default function PlaylistItemsList({
  items,
  sounds,
  playing,
  currentIdx,
  currentProgress,
  onSaveItemsOnly,
  onUpdateItem,
  onRemove,
  onAddSounds,
}) {
  const { t } = useLanguage()
  const [dragOverIdx, setDragOverIdx] = useState(null)

  /**
   * Starts dragging an item (adds opacity + class for visual feedback).
   * @param {React.DragEvent} e
   * @param {number} idx
   * @returns {void}
   */
  const handleDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    e.stopPropagation()
    setTimeout(() => {
      if (e.target) {
        e.target.style.opacity = '0.4'
        e.target.classList.add('dragging')
      }
    }, 0)
  }

  /**
   * Clears the drag state and resets the visual feedback.
   * @param {React.DragEvent} e
   * @returns {void}
   */
  const handleDragEnd = (e) => {
    if (e.target) {
      e.target.style.opacity = '1'
      e.target.classList.remove('dragging')
    }
    setDragOverIdx(null)
  }

  /**
   * Highlights the drop target.
   * @param {React.DragEvent} e
   * @param {number} idx
   * @returns {void}
   */
  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  /**
   * Clears the drop highlight.
   * @returns {void}
   */
  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  /**
   * Reorders the items: moves the dragged item to `toIdx` and persists.
   * @param {React.DragEvent} e
   * @param {number} toIdx
   * @returns {void}
   */
  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    e.stopPropagation()

    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(fromIdx) || fromIdx === toIdx) {
      setDragOverIdx(null)
      return
    }

    const updated = [...items]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setDragOverIdx(null)

    onSaveItemsOnly(updated)
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 40,
          color: 'var(--text-tertiary)',
        }}
      >
        <i
          className="ti ti-music-plus"
          style={{ fontSize: 36, display: 'block', marginBottom: 10 }}
        />
        <div style={{ fontWeight: 500, marginBottom: 6 }}>
          {t('emptyPlaylist')}
        </div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>{t('addSounds')}</div>
        <button
          className="btn-primary btn-lg"
          onClick={onAddSounds}
          style={{
            borderRadius: 'var(--radius-md)',
            minHeight: 40,
            padding: '8px 24px',
          }}
        >
          <i className="ti ti-plus" /> {t('addSounds')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
      {items.map((item, idx) => {
        const sound = sounds.find((s) => s.id === item.soundId)
        const isActive = currentIdx === idx && playing

        return (
          <PlaylistItem
            key={item.id}
            item={item}
            idx={idx}
            sound={sound}
            isActive={isActive}
            isDragOver={dragOverIdx === idx}
            currentProgress={currentProgress}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onUpdateItem={onUpdateItem}
            onRemove={onRemove}
          />
        )
      })}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}