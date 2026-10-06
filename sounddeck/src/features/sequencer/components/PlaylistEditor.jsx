// src/features/sequencer/components/PlaylistEditor.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import PlaylistHeader from './PlaylistHeader'
import PlaylistItemsList from './PlaylistItemsList'
import PlaylistProgressBar from './PlaylistProgressBar'
import AddSoundModal from './AddSoundModal'
import { useSequencePlayer } from '../hooks/useSequencePlayer'
import { uuid } from '@shared/utils/uuid'

export default function PlaylistEditor({
  playlist,
  sounds,
  audioDevice,
  volume,
  cardSize = 'medium',
  onSaveItems,
  addToast,
}) {
  const { t } = useLanguage()
  const [items, setItems] = useState(playlist.items || [])
  const [showAddSound, setShowAddSound] = useState(false)
  const [loopPlaylist, setLoopPlaylist] = useState(playlist.loop || false)

  const itemsRef = useRef(items)
  const playlistIdRef = useRef(playlist.id)

  useEffect(() => {
    playlistIdRef.current = playlist.id
  }, [playlist.id])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const player = useSequencePlayer({
    items,
    itemsRef,
    sounds,
    audioDevice,
    volume,
    loopPlaylist,
    cardSize,
  })

  const saveItemsOnly = async (updatedItems) => {
    setItems(updatedItems)
    if (onSaveItems) {
      await onSaveItems(playlistIdRef.current, updatedItems)
    }
  }

  const saveItems = async (updatedItems, loop = loopPlaylist) => {
    setItems(updatedItems)
    await onSaveItems(playlistIdRef.current, updatedItems, loop)
  }

  const updateItem = (idx, changes) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, ...changes } : item
    )
    saveItemsOnly(updated)
  }

  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx)
    saveItemsOnly(updated)
  }

  const addSounds = (soundIds) => {
    const newItems = soundIds.map((id) => ({
      id: uuid(),
      soundId: id,
      delay: 0,
    }))
    const updated = [...items, ...newItems]
    saveItems(updated)
    setShowAddSound(false)
  }

  const handleStart = () => {
    if (items.length === 0) {
      addToast(t('emptyPlaylist'), 'error')
      return
    }
    player.start()
  }

  const handleToggleLoop = () => {
    const next = !loopPlaylist
    setLoopPlaylist(next)
    saveItems(items, next)
  }

  const totalDelay = useMemo(
    () => items.reduce((acc, item) => acc + (item.delay || 0), 0),
    [items]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <PlaylistHeader
        playlist={playlist}
        itemsCount={items.length}
        totalDelay={totalDelay}
        playing={player.playing}
        loopPlaylist={loopPlaylist}
        onToggleLoop={handleToggleLoop}
        onAddSounds={() => setShowAddSound(true)}
        onStart={handleStart}
        onStop={player.stop}
        onPrev={player.goPrev}
        onNext={player.goNext}
      />

      <PlaylistProgressBar
        playing={player.playing}
        currentProgress={player.currentProgress}
        currentIdx={player.currentIdx}
        items={items}
        sounds={sounds}
      />

      {player.playing && (
        <div className="sequencer-shortcuts">
          <i className="ti ti-keyboard" />
          <span>{t('activeShortcuts')} :</span>
          <kbd>←</kbd>
          <span>{t('previous')}</span>
          <kbd>→</kbd>
          <span>{t('next')}</span>
          <kbd>{t('stop_seq')}</kbd>
          <span>{t('stopAll')}</span>
        </div>
      )}

      <PlaylistItemsList
        items={items}
        sounds={sounds}
        playing={player.playing}
        currentIdx={player.currentIdx}
        currentProgress={player.currentProgress}
        onSaveItemsOnly={saveItemsOnly}
        onUpdateItem={updateItem}
        onRemove={removeItem}
        onAddSounds={() => setShowAddSound(true)}
      />

      {showAddSound && (
        <AddSoundModal
          sounds={sounds}
          existingIds={items.map((i) => i.soundId)}
          onAdd={addSounds}
          onClose={() => setShowAddSound(false)}
        />
      )}
    </div>
  )
}