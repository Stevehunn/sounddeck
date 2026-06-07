import { useState } from 'react'
import SoundCard from '../components/SoundCard'
import AudioTrimmer from '../components/AudioTrimmer'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

export default function Home({ store, addToast, loopEnabled }) {
  const playLocally = store.playLocally
  const [showAll, setShowAll] = useState(false)
  const [showAllOther, setShowAllOther] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [sortBy, setSortBy] = useState('default') // 'default' | 'popular' | 'recent' | 'alpha'
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(0)
  const [search, setSearch] = useState('')

  const { currentSounds, favoriteSounds, shortcuts, audioDevice, volume, sounds, currentProfileId } = store
  const soundsOutsideProfile = currentProfileId !== 'all'
    ? sounds.filter(s => !s.profiles.includes(currentProfileId))
    : []

  const baseFiltered = search
    ? currentSounds.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : currentSounds

  const filtered = [...baseFiltered].sort((a, b) => {
    if (sortBy === 'popular') return (b.playCount || 0) - (a.playCount || 0)
    if (sortBy === 'recent') return (b.lastPlayed || 0) - (a.lastPlayed || 0)
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })

  const displayed = showAll ? filtered : filtered.slice(0, 10)
  const displayedOther = showAllOther ? soundsOutsideProfile : soundsOutsideProfile.slice(0, 6)

  const handleImportFiles = async (filePaths) => {
    let count = 0
    for (const fp of filePaths) {
      const result = await window.electronAPI.importSoundFile(fp)
      if (result.success) {
        await store.addSound({ name: result.name, path: result.path, emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], profiles: [currentProfileId] })
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

    // Collecter tous les fichiers
    const dtFiles = [...(e.dataTransfer?.files || [])]
    const dtItems = [...(e.dataTransfer?.items || [])]
    const allFiles = dtFiles.length > 0
      ? dtFiles
      : dtItems.filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)

    if (!allFiles.length) {
      addToast('Aucun fichier détecté', 'error')
      return
    }

    setImporting(true)
    setImportSuccess(0)

    // Filtrer les fichiers audio
    const audioFiles = allFiles.filter(f => {
      if (!f) return false
      const nameMatch = f.name && f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i)
      const typeMatch = f.type && f.type.startsWith('audio/')
      return nameMatch || typeMatch
    })

    if (!audioFiles.length) {
      const names = allFiles.map(f => f.name).join(', ')
      addToast(`Format non supporté : ${names}`, 'error')
      return
    }

    let imported = 0
    for (const file of audioFiles) {
      try {
        // Méthode 1 : file.path disponible (Electron standard)
        if (file.path && file.path.length > 2) {
          const result = await window.electronAPI.importSoundFile(file.path)
          if (result.success) {
            await store.addSound({
              name: result.name,
              path: result.path,
              emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
              profiles: [currentProfileId]
            })
            imported++
            continue
          }
        }

        // Méthode 2 : lire le contenu via FileReader et écrire côté main
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = () => reject(new Error('Lecture impossible'))
          reader.readAsArrayBuffer(file)
        })

        const result = await window.electronAPI.writeDroppedFile(file.name, arrayBuffer)
        if (result.success) {
          await store.addSound({
            name: result.name,
            path: result.path,
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            profiles: [currentProfileId]
          })
          imported++
        } else {
          addToast(`Erreur pour ${file.name} : ${result.error}`, 'error')
        }
      } catch (err) {
        console.error('Drop import error:', err)
        addToast(`Impossible d'importer ${file.name}`, 'error')
      }
    }

    setImporting(false)
    if (imported > 0) {
      setImportSuccess(imported)
      addToast(`${imported} son(s) importé(s) avec succès`, 'success')
      setTimeout(() => setImportSuccess(0), 3000)
    }
  }

  const currentProfile = store.profiles.find(p => p.id === currentProfileId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{currentProfile?.name || 'Tous les sons'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{currentSounds.length} son(s)</div>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
          <option value="default">Plus récents</option>
          <option value="popular">Plus joués</option>
          <option value="recent">Joués récemment</option>
          <option value="alpha">Alphabétique</option>
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: 160 }} />
        <button className="btn-primary" onClick={() => setShowImport(true)}>
          <i className="ti ti-plus" /> Ajouter
        </button>
      </div>

      {/* Overlay global drag & drop sur toute la zone de contenu */}
      <div style={{ flex: 1, overflowY: importing ? 'hidden' : 'auto', padding: '16px 20px', position: 'relative' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => {
          // Ne désactiver que si on quitte vraiment la zone (pas un enfant)
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
        }}
        onDrop={handleDrop}>

        {/* Overlay drag en cours */}
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(124,111,247,0.15)',
            border: '2px dashed var(--accent)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, pointerEvents: 'none'
          }}>
            <i className="ti ti-music-plus" style={{ fontSize: 48, color: 'var(--accent)' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>Déposer pour importer</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>MP3, WAV, OGG, FLAC, M4A</div>
          </div>
        )}

        {/* Overlay import en cours */}
        {importing && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, backdropFilter: 'blur(4px)'
          }}>
            <i className="ti ti-loader" style={{ fontSize: 40, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Import en cours...</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Copie des fichiers dans SoundDeck</div>
          </div>
        )}

        {/* Overlay succès */}
        {importSuccess > 0 && !importing && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(29,158,117,0.15)',
            border: '2px solid var(--success)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-check" style={{ fontSize: 32, color: 'white' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>
              {importSuccess} son{importSuccess > 1 ? 's' : ''} ajouté{importSuccess > 1 ? 's' : ''} !
            </div>
          </div>
        )}

        {filtered.length === 0 && soundsOutsideProfile.length === 0 && !importing && (
          <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`} onClick={() => setShowImport(true)}
            style={{ cursor: 'pointer' }}>
            <i className="ti ti-music-plus" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Aucun son pour ce profil</div>
            <div style={{ fontSize: 12 }}>Glissez des fichiers audio ici ou cliquez pour ajouter</div>
          </div>
        )}

        {favoriteSounds.length > 0 && (
          <Section title="Favoris" icon="ti-star-filled" iconColor="var(--warning)" count={favoriteSounds.length}>
            <SoundGrid sounds={favoriteSounds} shortcuts={shortcuts} audioDevice={audioDevice} volume={volume} loopEnabled={loopEnabled} playLocally={playLocally} store={store} addToast={addToast} />
          </Section>
        )}

        {filtered.length > 0 && (
          <Section title="Sons du profil" icon="ti-music" count={filtered.length}>
            <SoundGrid sounds={displayed} shortcuts={shortcuts} audioDevice={audioDevice} volume={volume} loopEnabled={loopEnabled} playLocally={playLocally} store={store} addToast={addToast} />
            {filtered.length > 10 && (
              <button className="btn-secondary" onClick={() => setShowAll(!showAll)} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {showAll ? 'Réduire' : `Afficher ${filtered.length - 10} sons de plus`}
              </button>
            )}
          </Section>
        )}

        {soundsOutsideProfile.length > 0 && (
          <Section title="Autres sons (non ajoutés à ce profil)" icon="ti-circle-plus" iconColor="var(--text-tertiary)" count={soundsOutsideProfile.length} muted>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Cliquez sur <strong>Ajouter</strong> pour inclure un son dans ce profil.
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

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onOpenDialog={handleOpenDialog}
          onDrop={handleDrop}
          dragOver={dragOver}
          setDragOver={setDragOver}
          currentProfileId={currentProfileId}
          onManualAdd={async (name, filePath, imagePath, emoji) => {
            await store.addSound({ name, path: filePath, image: imagePath || null, emoji: emoji || '🔊', profiles: [currentProfileId] })
            addToast(`"${name}" ajouté`, 'success')
            setShowImport(false)
          }}
          onUrlImport={async (url, name) => {
            const safeName = name.replace(/\s+/g, '_') + '_' + Date.now() + '.mp3'
            const result = await window.electronAPI.downloadSoundUrl(url, safeName)
            if (result.success) {
              await store.addSound({ name, path: result.path, emoji: '🔊', profiles: [currentProfileId] })
              addToast(`"${name}" téléchargé`, 'success')
            } else addToast('Erreur : ' + result.error, 'error')
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

function SoundGrid({ sounds, shortcuts, audioDevice, volume, loopEnabled, playLocally, store, addToast }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
      {sounds.map(s => (
        <SoundCard key={s.id} sound={s} shortcut={shortcuts[s.id]} audioDevice={audioDevice} volume={volume}
          loopEnabled={loopEnabled}
          playLocally={playLocally}
          currentProfileId={store.currentProfileId}
          onToggleFavorite={store.toggleFavorite}
          onSetShortcut={store.setShortcut}
          onVolumeChange={store.updateSoundVolume}
          onPlay={store.incrementPlayCount}
          onRemoveFromProfile={async (id) => { await store.removeSoundFromProfile(id, store.currentProfileId); addToast('Son retiré du profil', 'info') }}
          onDelete={async (id) => { await store.deleteSound(id); addToast('Son supprimé', 'info') }}
          onRename={(id, name) => store.updateSound(id, { name })}
        />
      ))}
    </div>
  )
}

function OutsideCard({ sound, onAdd }) {
  const imageUrl = sound.image
    ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
    : null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, opacity: 0.75 }}>
      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 6, overflow: 'hidden' }}>
        {imageUrl ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sound.emoji}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{sound.name}</div>
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
  const [manualName, setManualName] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [manualImage, setManualImage] = useState(null)
  const [manualEmoji, setManualEmoji] = useState('🔊')
  const [showTrimmer, setShowTrimmer] = useState(false)

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

  const handleManualAdd = async (finalPath) => {
    await onManualAdd(manualName, finalPath || manualFile.path, manualImage, manualEmoji)
  }

  const tabs = [
    ['file', 'ti-upload', 'Glisser-déposer'],
    ['manual', 'ti-settings', 'Personnalisé'],
    ['url', 'ti-link', 'URL'],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
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
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
              onDrop={onDrop}
              onClick={onOpenDialog}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 32, textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                background: dragOver ? 'var(--accent-light)' : 'transparent',
                color: dragOver ? 'var(--accent)' : 'var(--text-tertiary)'
              }}>
              <i className="ti ti-upload" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: dragOver ? 'var(--accent)' : 'var(--text-primary)' }}>
                {dragOver ? 'Relâchez pour importer' : 'Glissez vos fichiers ici'}
              </div>
              <div style={{ fontSize: 12, marginBottom: 12 }}>MP3, WAV, OGG, FLAC, M4A</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <i className="ti ti-folder-open" /> ou cliquez pour parcourir
              </div>
            </div>
            <div className="modal-actions"><button className="btn-secondary" onClick={onClose}>Fermer</button></div>
          </>
        )}

        {tab === 'manual' && !showTrimmer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nom du son *</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fichier audio *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={manualFile ? manualFile.name : ''} placeholder="Aucun fichier" style={{ flex: 1 }} />
                <button className="btn-secondary" onClick={handlePickFile}><i className="ti ti-folder-open" /> Parcourir</button>
              </div>
            </div>

            {/* Bouton écoute + trim */}
            {manualFile && (
              <button className="btn-secondary" onClick={() => setShowTrimmer(true)} style={{ justifyContent: 'center' }}>
                <i className="ti ti-cut" /> Écouter et rogner
              </button>
            )}

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Image (optionnel)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {manualImage && (
                  <img src={`file:///${manualImage.replace(/\\/g, '/')}`}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <input readOnly value={manualImage ? 'Image sélectionnée' : ''} placeholder="Aucune image (optionnel)" style={{ flex: 1 }} />
                <button className="btn-secondary" onClick={handlePickImage}><i className="ti ti-photo" /> Image</button>
                {manualImage && <button className="btn-ghost" onClick={() => setManualImage(null)}><i className="ti ti-x" /></button>}
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
              <button className="btn-primary" onClick={() => handleManualAdd(null)} disabled={!manualFile || !manualName}>
                <i className="ti ti-check" /> Ajouter
              </button>
            </div>
          </div>
        )}

        {tab === 'manual' && showTrimmer && manualFile && (
          <AudioTrimmer
            filePath={manualFile.path}
            onConfirm={async (trimmedPath) => {
              setShowTrimmer(false)
              if (trimmedPath !== manualFile.path) {
                setManualFile({ ...manualFile, path: trimmedPath })
              }
            }}
            onCancel={() => setShowTrimmer(false)}
          />
        )}

        {tab === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Nom du son</label>
              <input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>URL du fichier audio</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://... (.mp3, .wav, lien Google Drive...)" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
              <strong>Liens supportés :</strong> URL directe (.mp3/.wav), Google Drive (lien partagé), Dropbox (?dl=1)<br/>
              <strong>⚠️ Google Drive :</strong> le fichier doit être en accès "Tout le monde avec le lien"
            </div>
            <div className="modal-actions">
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