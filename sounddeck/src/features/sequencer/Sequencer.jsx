/**
 * @file Sequencer page — build and play playlists of sounds.
 *
 * Two-column layout:
 * - **Left sidebar** (`SequencerSidebar`) — playlist list, create/delete,
 *   sound popup toggle + config button.
 * - **Main panel** (`PlaylistEditor` when a playlist is selected, else
 *   `EmptyState`).
 *
 * On mount, loads the sound-popup preference (enabled + position) from
 * the store and initializes `SoundPopupService` accordingly. Both values
 * are persisted as soon as the user changes them.
 *
 * @see ./hooks/usePlaylists.js — playlist persistence
 * @see ./hooks/useSequencePlayer.js — playback engine
 * @see @core/services/SoundPopupService.js
 */

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { usePlaylists } from './hooks/usePlaylists'
import SequencerSidebar from './components/SequencerSidebar'
import PlaylistEditor from './components/PlaylistEditor'
import EmptyState from './components/EmptyState'
import SoundPopupConfigModal from './components/SoundPopupConfigModal'
import {
  initSoundPopup,
  setPopupEnabled,
  setPopupPosition,
  setPopupTheme,
  getPopupPosition,
} from '@core/services/SoundPopupService'

const STORE_KEY_ENABLED = 'soundPopupEnabled'
const STORE_KEY_POSITION = 'soundPopupPosition'

/**
 * Sequencer page.
 *
 * @param {Object} props
 * @param {Object} props.store - App store.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
export default function Sequencer({ store, addToast }) {
  const { t } = useLanguage()
  const playlists = usePlaylists()
  const [popupEnabled, setPopupEnabledState] = useState(true)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Load persisted popup settings once, then init SoundPopupService.
  // Deps are intentionally empty: we only want to run this once on mount,
  // even if the user updates the theme/size afterward (handled in the
  // next effect).
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [enabled, position] = await Promise.all([
          window.electronAPI.storeGet(STORE_KEY_ENABLED),
          window.electronAPI.storeGet(STORE_KEY_POSITION),
        ])
        if (!mounted) return
        const e = enabled === undefined || enabled === null ? true : !!enabled
        const p = typeof position === 'string' ? position : 'top-right'

        setPopupEnabledState(e)

        initSoundPopup({
          enabled: e,
          position: p,
          size: store.cardSize || 'medium',
          theme: store.theme || 'dark',
          customTheme: store.customTheme || null,
        })
      } catch {
        if (mounted) {
          initSoundPopup({ enabled: true, position: 'top-right' })
        }
      } finally {
        if (mounted) setSettingsLoaded(true)
      }
    }
    load()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the popup theme in sync when the user changes it in the store.
  useEffect(() => {
    if (!settingsLoaded) return
    setPopupTheme(store.theme || 'dark', store.customTheme || null)
  }, [store.theme, store.customTheme, settingsLoaded])

  /**
   * Toggles the sound popup on/off.
   * @returns {Promise<void>}
   */
  const handleToggleSoundPopup = useCallback(async () => {
    const next = !popupEnabled
    setPopupEnabledState(next)
    setPopupEnabled(next)
    try {
      await window.electronAPI.storeSet(STORE_KEY_ENABLED, next)
      addToast?.(
        next ? t('soundPopupEnabledToast') : t('soundPopupDisabledToast'),
        'info'
      )
    } catch {
      // Silent — UI already reflects the optimistic update.
    }
  }, [popupEnabled, addToast, t])

  const handleOpenConfig = useCallback(() => setShowConfigModal(true), [])

  /**
   * Validates a new popup position: persists it, re-enables the popup,
   * closes the config modal.
   *
   * @param {string} position
   * @returns {Promise<void>}
   */
  const handleValidatePosition = useCallback(
    async (position) => {
      setPopupPosition(position)
      setPopupEnabledState(true)
      setPopupEnabled(true)
      try {
        await Promise.all([
          window.electronAPI.storeSet(STORE_KEY_POSITION, position),
          window.electronAPI.storeSet(STORE_KEY_ENABLED, true),
        ])
        addToast?.(t('soundPopupPositionSaved'), 'success')
      } catch {
        // Silent — UI already reflects the change.
      }
      setShowConfigModal(false)
    },
    [addToast, t]
  )

  /**
   * Deletes a playlist by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  const handleDeletePlaylist = async (id) => {
    await playlists.deletePlaylist(id)
  }

  if (!settingsLoaded) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        <i
          className="ti ti-loader"
          style={{ animation: 'spin 1s linear infinite', marginRight: 8 }}
        />
        {t('loading')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <SequencerSidebar
        playlists={playlists.playlists}
        activePlaylistId={playlists.activePlaylistId}
        onCreatePlaylist={playlists.createPlaylist}
        onSelectPlaylist={playlists.selectPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        soundPopupEnabled={popupEnabled}
        onToggleSoundPopup={handleToggleSoundPopup}
        onOpenSoundPopupConfig={handleOpenConfig}
      />

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {playlists.activePlaylist ? (
          <PlaylistEditor
            key={playlists.activePlaylist.id}
            playlist={playlists.activePlaylist}
            sounds={store.sounds}
            audioDevice={store.audioDevice}
            volume={store.volume}
            cardSize={store.cardSize || 'medium'}
            onSaveItems={playlists.savePlaylistItems}
            addToast={addToast}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {showConfigModal && (
        <SoundPopupConfigModal
          initialPosition={getPopupPosition()}
          cardSize={store.cardSize || 'medium'}
          theme={store.theme || 'dark'}
          customTheme={store.customTheme || null}
          onValidate={handleValidatePosition}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  )
}