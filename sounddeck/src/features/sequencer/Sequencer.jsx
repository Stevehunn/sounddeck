// src/features/sequencer/Sequencer.jsx
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

export default function Sequencer({ store, addToast }) {
  const { t } = useLanguage()
  const playlists = usePlaylists()
  const [popupEnabled, setPopupEnabledState] = useState(true)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

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
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    setPopupTheme(store.theme || 'dark', store.customTheme || null)
  }, [store.theme, store.customTheme, settingsLoaded])

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
    } catch { /* noop */ }
  }, [popupEnabled, addToast, t])

  const handleOpenConfig = useCallback(() => setShowConfigModal(true), [])

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
      } catch { /* noop */ }
      setShowConfigModal(false)
    },
    [addToast, t]
  )

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