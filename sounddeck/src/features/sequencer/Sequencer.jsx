// src/features/sequencer/Sequencer.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { usePlaylists } from './hooks/usePlaylists'
import SequencerSidebar from './components/SequencerSidebar'
import PlaylistEditor from './components/PlaylistEditor'
import EmptyState from './components/EmptyState'

export default function Sequencer({ store, addToast, lang = 'fr' }) {
  const { t } = useLanguage()
  const playlists = usePlaylists()
  const handleDeletePlaylist = async (id) => {
    await playlists.deletePlaylist(id)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <SequencerSidebar
        playlists={playlists.playlists}
        activePlaylistId={playlists.activePlaylistId}
        onCreatePlaylist={playlists.createPlaylist}
        onSelectPlaylist={playlists.selectPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
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
            onSaveItems={playlists.savePlaylistItems}
            addToast={addToast}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}