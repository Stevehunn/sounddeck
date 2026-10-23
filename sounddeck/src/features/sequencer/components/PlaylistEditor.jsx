/**
 * @file Playlist editor — header + progress + item list + add modal.
 *
 * Owns the local `items` state (mirrored from the playlist prop) and
 * delegates playback to `useSequencePlayer`. Every mutation is persisted
 * immediately via `onSaveItems(playlistId, items, loop?)`.
 *
 * The `itemsRef` and `playlistIdRef` refs are kept in sync so async
 * callbacks (e.g. the sequence player's recursive `playFrom`) always see
 * the latest state without re-creating dependencies.
 *
 * @see ./PlaylistHeader.jsx
 * @see ./PlaylistProgressBar.jsx
 * @see ./PlaylistItemsList.jsx
 * @see ../hooks/useSequencePlayer.js
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import PlaylistHeader from './PlaylistHeader'
import PlaylistItemsList from './PlaylistItemsList'
import PlaylistProgressBar from './PlaylistProgressBar'
import AddSoundModal from './AddSoundModal'
import { useSequencePlayer } from '../hooks/useSequencePlayer'
import { uuid } from '@shared/utils/uuid'

/**
 * Playlist editor.
 *
 * @param {Object} props
 * @param {Object} props.playlist - The playlist being edited.
 * @param {Array<Object>} props.sounds - All sounds in the library.
 * @param {string} props.audioDevice
 * @param {number} props.volume
 * @param {'small'|'medium'|'large'} [props.cardSize='medium']
 * @param {(playlistId: string, items: Array, loop?: boolean) => Promise<void>} props.onSaveItems
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
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

  /**
   * Saves only the items (loop flag unchanged).
   * @param {Array<Object>} updatedItems
   * @returns {Promise<void>}
   */
  const saveItemsOnly = async (updatedItems) => {
    setItems(updatedItems)
    if (onSaveItems) {
      await onSaveItems(playlistIdRef.current, updatedItems)
    }
  }

  /**
   * Saves items + loop flag.
   * @param {Array<Object>} updatedItems
   * @param {boolean} [loop=loopPlaylist]
   * @returns {Promise<void>}
   */
  const saveItems = async (updatedItems, loop = loopPlaylist) => {
    setItems(updatedItems)
    await onSaveItems(playlistIdRef.current, updatedItems, loop)
  }

  /**
   * Updates one item (by index).
   * @param {number} idx
   * @param {Object} changes
   * @returns {void}
   */
  const updateItem = (idx, changes) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, ...changes } : item
    )
    saveItemsOnly(updated)
  }

  /**
   * Removes one item (by index).
   * @param {number} idx
   * @returns {void}
   */
  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx)
    saveItemsOnly(updated)
  }

  /**
   * Appends one item per sound ID with a 0s delay.
   * @param {string[]} soundIds
   * @returns {void}
   */
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

  /**
   * Starts playback (or shows an error toast if the playlist is empty).
   * @returns {void}
   */
  const handleStart = () => {
    if (items.length === 0) {
      addToast(t('emptyPlaylist'), 'error')
      return
    }
    player.start()
  }

  /**
   * Toggles the playlist loop flag (persists it).
   * @returns {void}
   */
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