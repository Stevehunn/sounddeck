import { useState, useRef } from 'react'
import SoundCard from '../components/SoundCard'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

export default function Home({ store, addToast }) {
  const [showAll, setShowAll] = useState(false)
  const [showAllOther, setShowAllOther] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')

  const { currentSounds, favoriteSounds, shortcuts, audioDevice, volume, sounds, currentProfileId } = store

  // Sons qui ne sont PAS dans le profil actuel (seulement si on n'est pas sur "Tous les sons")
  const soundsOutsideProfile = currentProfileId !== 'all'
    ? sounds.filter(s => !s.profiles.includes(currentProfileId))
    : []

  const filtered = search
    ? currentSounds.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : currentSounds

  const displayed = showAll ? filtered : filtered.slice(0, 10)
  const displayedOther = showAllOther ? soundsOutsideProfile : soundsOutsideProfile.slice(0, 6)

  const handleImportFiles = async (filePaths) => {
    let count = 0
    for (const fp of filePaths) {
      const result = await window.electronAPI.importSoundFile(fp)
      if (result.success) {
        await store.addSound({
          name: result.name,
          path: result.path,
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          profiles: [currentProfileId]
        })
        count++
      }
    }
    if (count > 0) addToast(`${count} son(s) importé(s)`, 'success')
    setShowImport(false)
  }

  const handleOpenDialog = async () => {
    const paths = await window.electronAPI.openFileDialog()
    if (paths.length) await handleImportFiles(paths)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files].filter(f =>
      ['audio/mpeg','audio/wav','audio/ogg','audio/flac','audio/mp4','audio/x-m4a'].includes(f.type) || f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)
    )
    if (!files.length) { addToast('Aucun fichier audio détecté', 'error'); return }
    await handleImportFiles(files.map(f => f.path))
  }

  const currentProfile = store.profiles.find(p => p.id === currentProfileId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{currentProfile?.name || 'Tous les sons'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{currentSounds.length} son(s)</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: 180 }} />
        <button className="btn-primary" onClick={() => setShowImport(true)}>
          <i className="ti ti-plus" /> Ajouter
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Zone drag & drop vide */}
        {filtered.length === 0 && soundsOutsideProfile.length === 0 && (
          <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`} onClick={() => setShowImport(true)}>
            <i className="ti ti-music-plus" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Aucun son pour ce profil</div>
            <div style={{ fontSize: 12 }}>Glissez des fichiers audio ici ou cliquez pour ajouter</div>
          </div>
        )}

        {/* Favoris */}
        {favoriteSounds.length > 0 && (
          <Section title="Favoris" icon="ti-star-filled" iconColor="var(--warning)" count={favoriteSounds.length}>
            <SoundGrid sounds={favoriteSounds} shortcuts={shortcuts} audioDevice={audioDevice} volume={volume} store={store} addToast={addToast} />
          </Section>
        )}

        {/* Sons du profil */}
        {filtered.length > 0 && (
          <Section title="Sons du profil" icon="ti-music" count={filtered.length}>
            <SoundGrid sounds={displayed} shortcuts={shortcuts} audioDevice={audioDevice} volume={volume} store={store} addToast={addToast} />
            {filtered.length > 10 && (
              <button className="btn-secondary" onClick={() => setShowAll(!showAll)} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {showAll ? 'Réduire' : `Afficher ${filtered.length - 10} sons de plus`}
              </button>
            )}
          </Section>
        )}

        {/* Sons hors profil */}
        {soundsOutsideProfile.length > 0 && (
          <Section
            title="Autres sons (non ajoutés à ce profil)"
            icon="ti-circle-plus"
            iconColor="var(--text-tertiary)"
            count={soundsOutsideProfile.length}
            muted
          >
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Cliquez sur <i className="ti ti-circle-plus" /> pour ajouter rapidement un son à ce profil.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {displayedOther.map(s => (
                <OutsideCard key={s.id} sound={s} onAdd={async () => {
                  await store.addSoundToProfile(s.id, currentProfileId)
                  addToast(`"${s.name}" ajouté au profil`, 'success')
                }} />
              ))}
            </div>
            {soundsOutsideProfile.length > 6 && (
              <button className="btn-secondary" onClick={() => setShowAllOther(!showAllOther)} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                <i className={`ti ${showAllOther ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {showAllOther ? 'Réduire' : `Voir ${soundsOutsideProfile.length - 6} autres sons`}
              </button>
            )}
          </Section>
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onOpenDialog={handleOpenDialog}
          onDrop={handleDrop}
          dragOver={dragOver}
          setDragOver={setDragOver}
          currentProfileId={currentProfileId}
          onUrlImport={async (url, name) => {
            const safeName = (name.replace(/\s+/g,'_') + '.mp3')
            const result = await window.electronAPI.downloadSoundUrl(url, safeName)
            if (result.success) {
              await store.addSound({ name, path: result.path, emoji: '🔊', profiles: [currentProfileId] })
              addToast(`"${name}" téléchargé`, 'success')
            } else {
              addToast('Erreur de téléchargement : ' + result.error, 'error')
            }
            setShowImport(false)
          }}
          onManualAdd={async (name, filePath, imagePath, emoji) => {
            await store.addSound({ name, path: filePath, image: imagePath || null, emoji: emoji || '🔊', profiles: [currentProfileId] })
            addToast(`"${name}" ajouté`, 'success')
            setShowImport(false)
          }}
        />
      )}
    </div>
  )
}

function Section({ title, icon, iconColor, count, muted, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className={`ti ${icon}`} style={{ color: iconColor || 'inherit' }} />
        {title}
        {count != null && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({count})</span>}
      </div>
      {children}
    </section>
  )
}

function SoundGrid({ sounds, shortcuts, audioDevice, volume, store, addToast }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
      {sounds.map(s => (
        <SoundCard key={s.id} sound={s} shortcut={shortcuts[s.id]} audioDevice={audioDevice} volume={volume}
          currentProfileId={store.currentProfileId}
          onToggleFavorite={store.toggleFavorite}
          onSetShortcut={store.setShortcut}
          onVolumeChange={store.updateSoundVolume}
          onRemoveFromProfile={async (id) => {
            await store.removeSoundFromProfile(id, store.currentProfileId)
            addToast('Son retiré du profil', 'info')
          }}
          onDelete={async (id) => { await store.deleteSound(id); addToast('Son supprimé définitivement', 'info') }}
          onRename={(id, name) => store.updateSound(id, { name })}
        />
      ))}
    </div>
  )
}

function OutsideCard({ sound, onAdd }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, opacity: 0.7, position: 'relative' }}>
      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 6 }}>
        {sound.image ? <img src={`file:///${sound.image.replace(/\\/g,'/')}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : sound.emoji}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{sound.name}</div>
      <button onClick={onAdd} className="btn-primary" style={{ width: '100%', padding: '4px 0', justifyContent: 'center', fontSize: 11 }}>
        <i className="ti ti-circle-plus" /> Ajouter
      </button>
    </div>
  )
}

function ImportModal({ onClose, onOpenDialog, onDrop, dragOver, setDragOver, onUrlImport, onManualAdd }) {
  const [tab, setTab] = useState('file')
  const [url, setUrl] = useState('')
  const [urlName, setUrlName] = useState('')
  // Onglet manuel
  const [manualName, setManualName] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [manualImage, setManualImage] = useState(null)
  const [manualEmoji, setManualEmoji] = useState('🔊')

  const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

  const handlePickFile = async () => {
    const paths = await window.electronAPI.openFileDialog()
    if (paths[0]) {
      const result = await window.electronAPI.importSoundFile(paths[0])
      if (result.success) { setManualFile(result); if (!manualName) setManualName(result.name) }
    }
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) setManualImage(result.path)
    }
  }

  const handleManualAdd = async () => {
    if (!manualFile || !manualName) return
    await onManualAdd(manualName, manualFile.path, manualImage, manualEmoji)
  }

  const tabs = [
    ['file', 'ti-upload', 'Glisser-déposer'],
    ['manual', 'ti-settings', 'Personnalisé'],
    ['url', 'ti-link', 'URL'],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title"><i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} /> Ajouter un son</div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 4 }}>
          {tabs.map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 12,
              background: tab === id ? 'var(--bg-secondary)' : 'transparent',
              color: tab === id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: tab === id ? 500 : 400, cursor: 'pointer'
            }}>
              <i className={`ti ${icon}`} style={{ marginRight: 4 }} />{label}
            </button>
          ))}
        </div>

        {tab === 'file' && (
          <>
            <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop} onClick={onOpenDialog}>
              <i className="ti ti-upload" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Glissez vos fichiers ici</div>
              <div style={{ fontSize: 12 }}>ou cliquez pour parcourir · MP3, WAV, OGG, FLAC</div>
            </div>
            <div className="modal-actions"><button className="btn-secondary" onClick={onClose}>Fermer</button></div>
          </>
        )}

        {tab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nom du son *</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fichier audio *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={manualFile ? manualFile.name : ''} placeholder="Aucun fichier sélectionné" style={{ flex: 1 }} />
                <button className="btn-secondary" onClick={handlePickFile} style={{ flexShrink: 0 }}>
                  <i className="ti ti-folder-open" /> Parcourir
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Image (optionnel)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {manualImage && (
                  <img src={`file:///${manualImage.replace(/\\/g,'/')}`}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <input readOnly value={manualImage ? 'Image sélectionnée' : ''} placeholder="Aucune image (optionnel)" style={{ flex: 1 }} />
                <button className="btn-secondary" onClick={handlePickImage} style={{ flexShrink: 0 }}>
                  <i className="ti ti-photo" /> Image
                </button>
                {manualImage && <button className="btn-ghost" onClick={() => setManualImage(null)} style={{ flexShrink: 0 }}><i className="ti ti-x" /></button>}
              </div>
            </div>
            {!manualImage && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Emoji (si pas d'image)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setManualEmoji(e)}
                      style={{ width: 34, height: 34, fontSize: 18, borderRadius: 6, border: `1px solid ${manualEmoji === e ? 'var(--accent)' : 'var(--border)'}`, background: manualEmoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)', cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleManualAdd} disabled={!manualFile || !manualName}>
                <i className="ti ti-check" /> Ajouter
              </button>
            </div>
          </div>
        )}

        {tab === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nom du son</label>
              <input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL directe (.mp3, .wav...)</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={() => url && urlName && onUrlImport(url, urlName)} disabled={!url || !urlName}>
                <i className="ti ti-download" /> Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}