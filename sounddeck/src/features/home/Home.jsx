// src/features/home/Home.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import SoundCard from '@shared/components/audio/SoundCard'
import AudioTrimmer from '@shared/components/audio/AudioTrimmer'
import ProfileManagerModal from '@shared/components/modals/ProfileManagerModal'
import { DeleteButton } from '@shared/components/ui'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useNetwork } from '@shared/contexts'
import { playSound, stopAllSounds, stopSound } from '@core/services/AudioService'
import useConfirm from '@shared/hooks/useConfirm'
import { buildFileUrl } from '@shared/utils/fileUrl'
import EmojiPicker from '@shared/components/ui/EmojiPicker'
import { DEFAULT_EMOJIS } from '@shared/constants/emojis'
import { compressFileIfNeeded } from '@shared/utils/fileCompression'


function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Home({ store, addToast, loopEnabled }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const { showNoConnection, ensureOnline } = useNetwork()
  const playLocally = store.playLocally
  const [showAll, setShowAll] = useState(false)
  const [showAllOther, setShowAllOther] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showProfileManager, setShowProfileManager] = useState(false)
  const [sortBy, setSortBy] = useState('custom')
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [importSuccess, setImportSuccess] = useState(0)
  const [localSearch, setLocalSearch] = useState('')
  const [columns, setColumns] = useState(6)
  const gridRef = useRef(null)
  const favoritesGridRef = useRef(null)

  const searchTerm = localSearch

  const [draggedSoundId, setDraggedSoundId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragSource, setDragSource] = useState(null)

  const { currentSounds, favoriteSounds, shortcuts, audioDevice, volume, sounds, currentProfileId } = store

  const soundsOutsideProfile = currentProfileId !== 'all'
    ? sounds.filter(s => !s.profiles.includes(currentProfileId))
    : []

  const favoriteSoundsForProfile = currentSounds.filter(s => s.favorites?.includes(currentProfileId) || false)

  useEffect(() => {
    const resetDragOver = () => setDragOver(false)

    window.addEventListener('dragend', resetDragOver)
    window.addEventListener('drop', resetDragOver)
    window.addEventListener('dragleave', (e) => {
      // relatedTarget === null = l'utilisateur a quitté la fenêtre
      if (!e.relatedTarget) resetDragOver()
    })

    return () => {
      window.removeEventListener('dragend', resetDragOver)
      window.removeEventListener('drop', resetDragOver)
    }
  }, [])


  useEffect(() => {
    const calculateColumns = () => {
      if (!gridRef.current) return
      const containerWidth = gridRef.current.offsetWidth

      const cardSizes = {
        small: 90,
        medium: 110,
        large: 140
      }
      const cardWidth = cardSizes[store.cardSize || 'medium'] + 10
      const nbColumns = Math.max(2, Math.floor(containerWidth / cardWidth))
      setColumns(nbColumns)
    }

    calculateColumns()
    window.addEventListener('resize', calculateColumns)
    return () => window.removeEventListener('resize', calculateColumns)
  }, [store.cardSize])

  const filtered = searchTerm
    ? currentSounds.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(searchTerm.toLowerCase())
        const tagMatch = (store.tags[s.id] || []).some(t =>
          t.toLowerCase().includes(searchTerm.toLowerCase())
        )
        return nameMatch || tagMatch
      })
    : currentSounds

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === 'custom') return 0
    if (sortBy === 'popular') return (b.playCount || 0) - (a.playCount || 0)
    if (sortBy === 'recent') return (b.lastPlayed || 0) - (a.lastPlayed || 0)
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })

  const itemsPerPage = columns * 2
  const displayed = showAll ? sortedFiltered : sortedFiltered.slice(0, itemsPerPage)
  const displayedOther = showAllOther ? soundsOutsideProfile : soundsOutsideProfile.slice(0, itemsPerPage)

  const findGlobalIndex = (soundId) => {
    return currentSounds.findIndex(s => s.id === soundId)
  }

  const getOrderedFavorites = () => {
    return currentSounds.filter(s => s.favorites?.includes(currentProfileId) || false)
  }

  const handleDragStart = (e, soundId, index, source) => {
    if (sortBy !== 'custom') {
      addToast(t('dragDropCustomOnly'), 'info')
      e.preventDefault()
      return
    }
    setDraggedSoundId(soundId)
    setDragOverIndex(index)
    setIsDragging(true)
    setDragSource(source)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${soundId}|${index}|${source}`)
    setTimeout(() => {
      if (e.target) {
        e.target.style.opacity = '0.4'
      }
    }, 0)
  }

  const handleDragEnd = (e) => {
    if (e.target) {
      e.target.style.opacity = '1'
    }
    setDraggedSoundId(null)
    setDragOverIndex(null)
    setIsDragging(false)
    setDragSource(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (!isDragging) return
    setDragOverIndex(index)
  }

  const handleDrop = async (e, dropIndex, targetSource) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSoundId) return

    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    const [sourceId, sourceIndex, sourceType] = data.split('|')

    if (sourceId !== draggedSoundId) return

    const startIndex = parseInt(sourceIndex)
    const endIndex = dropIndex

    if (startIndex === endIndex && sourceType === targetSource) {
      setDraggedSoundId(null)
      setDragOverIndex(null)
      setIsDragging(false)
      setDragSource(null)
      return
    }

    const allSounds = currentSounds

    let globalStartIndex = findGlobalIndex(sourceId)
    if (globalStartIndex === -1) {
      setDraggedSoundId(null)
      setDragOverIndex(null)
      setIsDragging(false)
      setDragSource(null)
      return
    }

    let globalEndIndex
    if (targetSource === 'favorites') {
      const orderedFavorites = getOrderedFavorites()
      if (endIndex < orderedFavorites.length) {
        const targetSoundId = orderedFavorites[endIndex]?.id
        if (targetSoundId) {
          globalEndIndex = findGlobalIndex(targetSoundId)
        } else {
          const lastFavorite = orderedFavorites[orderedFavorites.length - 1]
          globalEndIndex = lastFavorite ? findGlobalIndex(lastFavorite.id) + 1 : 0
        }
      } else {
        const lastFavorite = orderedFavorites[orderedFavorites.length - 1]
        globalEndIndex = lastFavorite ? findGlobalIndex(lastFavorite.id) + 1 : 0
      }
    } else {
      globalEndIndex = endIndex
    }

    if (globalEndIndex < 0) globalEndIndex = 0
    if (globalEndIndex > allSounds.length) globalEndIndex = allSounds.length

    await store.reorderSounds(globalStartIndex, globalEndIndex)

    setDraggedSoundId(null)
    setDragOverIndex(null)
    setIsDragging(false)
    setDragSource(null)
    addToast(t('soundMoved'), 'success')
  }

  const handleMainDrop = async (e, dropIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSoundId) return

    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    const [sourceId, sourceIndex, sourceType] = data.split('|')

    if (sourceId !== draggedSoundId) return

    const startIndex = parseInt(sourceIndex)
    const endIndex = dropIndex

    if (startIndex === endIndex && sourceType === 'profile') {
      setDraggedSoundId(null)
      setDragOverIndex(null)
      setIsDragging(false)
      setDragSource(null)
      return
    }

    await store.reorderSounds(startIndex, endIndex)

    setDraggedSoundId(null)
    setDragOverIndex(null)
    setIsDragging(false)
    setDragSource(null)
    addToast(t('soundMoved'), 'success')
  }

  const handleImportFiles = async (filePaths) => {
    setTotalFiles(filePaths.length)
    setImportProgress(0)
    let count = 0

    const compressOnImport = store.compressOnImport || false
    const compressionBitrate = store.compressionBitrate || 128

    for (let i = 0; i < filePaths.length; i++) {
      const fp = filePaths[i]
      let result = await window.electronAPI.importSoundFile(fp)

      if (result.success) {
        const comp = await compressFileIfNeeded(result.path, {
          enabled: compressOnImport,
          bitrate: compressionBitrate,
          onWarning: (msg) => console.warn('⚠️ Compression:', msg),
        })
        result.path = comp.path
        result.compressed = comp.compressed
        result.originalSize = comp.originalSize
        result.compressedSize = comp.compressedSize
        result.compressionRatio = comp.compressionRatio
      }

      if (result.success) {
        await store.addSound({
          name: result.name,
          path: result.path,
          emoji: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
          profiles: [currentProfileId],
          compressed: result.compressed || false,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize
        })
        count++
      }
      setImportProgress(i + 1)
    }

    if (count > 0) {
      const msg = compressOnImport
        ? `${count} ${t('sounds')} ${t('importedAndCompressed')}`
        : `${count} ${t('sounds')} ${t('imported')}`
      addToast(msg, 'success')
    }
    setShowImport(false)
    setImportProgress(0)
    setTotalFiles(0)
  }

  const handleOpenDialog = async () => {
    const paths = await window.electronAPI.openFileDialog()
    if (paths.length) await handleImportFiles(paths)
  }

  const handleDropFiles = async (e) => {
    e.preventDefault()
    setDragOver(false)
    setShowImport(false)

    if (draggedSoundId) {
      return
    }

    const dtFiles = [...(e.dataTransfer?.files || [])]
    const dtItems = [...(e.dataTransfer?.items || [])]
    const allFiles = dtFiles.length > 0
      ? dtFiles
      : dtItems.filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)

    const hasAnyItem = dtFiles.length > 0 || dtItems.some(i => i.kind === 'file')
    if (!allFiles.length) {
      if (hasAnyItem) {
        addToast(t('unsupportedFormat'), 'error')
      }
      return
    }

    setImporting(true)
    setImportSuccess(0)

    const audioFiles = allFiles.filter(f => {
      if (!f) return false
      const nameMatch = f.name && f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i)
      const typeMatch = f.type && f.type.startsWith('audio/')
      return nameMatch || typeMatch
    })

    if (!audioFiles.length) {
      const names = allFiles.map(f => f.name).join(', ')
      addToast(`${t('unsupportedFormat')} : ${names}`, 'error')
      return
    }

    let imported = 0
    const compressOnImport = store.compressOnImport || false
    const compressionBitrate = store.compressionBitrate || 128

    for (const file of audioFiles) {
      try {
        let result = null

        if (file.path && file.path.length > 2) {
          result = await window.electronAPI.importSoundFile(file.path)
        } else {
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = () => reject(new Error(t('readError')))
            reader.readAsArrayBuffer(file)
          })
          result = await window.electronAPI.writeDroppedFile(file.name, arrayBuffer)
        }

        if (result.success) {
          const comp = await compressFileIfNeeded(result.path, {
            enabled: compressOnImport,
            bitrate: compressionBitrate,
            onWarning: (msg) => console.warn('⚠️ Compression:', msg),
          })
          result.path = comp.path

          await store.addSound({
            name: result.name,
            path: result.path,
            emoji: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
            profiles: [currentProfileId]
          })
          imported++
        } else {
          addToast(`${t('errorFor')} ${file.name} : ${result?.error || t('unknown')}`, 'error')
        }
      } catch (err) {
        console.error('Drop import error:', err)
        addToast(`${t('cannotImport')} ${file.name}`, 'error')
      }
    }

    setImporting(false)
    if (imported > 0) {
      setImportSuccess(imported)
      const msg = compressOnImport
        ? `${imported} ${t('sounds')} ${t('importedAndCompressed')}`
        : `${imported} ${t('sounds')} ${t('importedSuccessfully')}`
      addToast(msg, 'success')
      setTimeout(() => setImportSuccess(0), 3000)
    }
  }

  const currentProfile = store.profiles.find(p => p.id === currentProfileId)

  const handleDeleteSound = useCallback(async (soundId) => {
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) return

    const confirmed = await confirm({
      title: t('confirmDeleteSound') || 'Confirmer la suppression du son',
      message: (t('confirmDeleteSoundMessage') || `Voulez-vous vraiment supprimer définitivement le son "{name}" ?`).replace('{name}', sound.name),
      type: 'danger',
      confirmText: t('menuDelete') || 'Supprimer définitivement',
      cancelText: t('cancel') || 'Annuler'
    })

    if (confirmed) {
      await store.deleteSound(soundId)
      addToast(`"${sound.name}" ${t('deleted')}`, 'info')
    }
  }, [store, confirm, addToast, t])

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{currentProfile?.id === 'all' ? t('allSounds') : currentProfile?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{currentSounds.length} {t('sounds')}</div>
            {searchTerm && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                <i className="ti ti-search" style={{ fontSize: 10 }} /> {t('resultsFor')} "{searchTerm}" ({filtered.length})
              </div>
            )}
          </div>
          <select
            data-testid="sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input-sm"
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="custom">{t('sortCustom')}</option>
            <option value="default">{t('sortDefault')}</option>
            <option value="popular">{t('sortPopular')}</option>
            <option value="recent">{t('sortRecent')}</option>
            <option value="alpha">{t('sortAlpha')}</option>
          </select>
          <input
            data-testid="search-input"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder={t('search')}
            className="input-sm"
            style={{ width: 160, minWidth: 120 }}
          />

          <button
            data-testid="add-sound-button"
            className="btn-primary btn-sm"
            onClick={() => setShowImport(true)}
            style={{ minHeight: 34 }}
          >
            <i className="ti ti-plus" /> {t('addSound')}
          </button>

          {currentProfileId !== 'all' && (
            <button className="btn-secondary btn-sm" onClick={() => setShowProfileManager(true)} style={{ minHeight: 34 }}>
              <i className="ti ti-settings" /> {t('manageProfile')}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: importing ? 'hidden' : 'auto', padding: '16px 20px', position: 'relative' }}
          onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
          onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
          onDragLeave={e => {
            // Ne pas retirer l'overlay si on passe sur un enfant
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
          }}
          onDrop={handleDropFiles}>

          {dragOver && (
            <div className="drop-overlay">
              <i className="ti ti-music-plus" style={{ fontSize: 48, color: 'var(--accent)' }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{t('dropToImport')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>MP3, WAV, OGG, FLAC, M4A</div>
            </div>
          )}

          {importing && (
            <div className="import-overlay">
              <i className="ti ti-loader" style={{ fontSize: 40, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{t('importing')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {totalFiles > 0 ? `${importProgress} / ${totalFiles} fichiers` : t('importingFiles')}
              </div>
              {totalFiles > 0 && (
                <div style={{ width: 200, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(importProgress / totalFiles) * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>
          )}

          {importSuccess > 0 && !importing && (
            <div className="success-overlay">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-check" style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>
                {importSuccess} {t('sounds')} {t('added')} !
              </div>
            </div>
          )}

          {filtered.length === 0 && soundsOutsideProfile.length === 0 && !importing && (
            <div className="drop-zone" onClick={() => setShowImport(true)} style={{ cursor: 'pointer' }}>
              <i className="ti ti-music-plus" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{t('noSoundsForProfile')}</div>
              <div style={{ fontSize: 12 }}>{t('dropHere')}</div>
            </div>
          )}

          {favoriteSoundsForProfile.length > 0 && (
            <Section
              title={t('favorites')}
              icon="ti-star-filled"
              iconColor="var(--warning)"
              count={favoriteSoundsForProfile.length}
              testId="favorites-section"
            >
              <SoundGrid
                sounds={favoriteSoundsForProfile}
                shortcuts={shortcuts}
                audioDevice={audioDevice}
                volume={volume}
                loopEnabled={loopEnabled}
                playLocally={playLocally}
                store={store}
                addToast={addToast}
                gridRef={favoritesGridRef}
                draggable={sortBy === 'custom'}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggedSoundId={draggedSoundId}
                dragOverIndex={dragOverIndex}
                dropTarget="favorites"
                onDelete={handleDeleteSound}
                testId="favorites-grid"
              />
            </Section>
          )}

          {filtered.length > 0 && (
            <Section
              title={t('profileSounds')}
              icon="ti-music"
              count={filtered.length}
              testId="profile-sounds-section"
            >
              <SoundGrid
                sounds={displayed}
                shortcuts={shortcuts}
                audioDevice={audioDevice}
                volume={volume}
                loopEnabled={loopEnabled}
                playLocally={playLocally}
                store={store}
                addToast={addToast}
                gridRef={gridRef}
                draggable={sortBy === 'custom'}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleMainDrop}
                draggedSoundId={draggedSoundId}
                dragOverIndex={dragOverIndex}
                dropTarget="profile"
                onDelete={handleDeleteSound}
                testId="profile-sounds-grid"
              />
              {filtered.length > itemsPerPage && (
                <button className="btn-secondary btn-sm" onClick={() => setShowAll(!showAll)} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                  <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                  {showAll ? t('showLess') : `${t('showMore')} ${filtered.length - itemsPerPage}`}
                </button>
              )}
            </Section>
          )}

          {soundsOutsideProfile.length > 0 && (
            <Section
              title={t('otherSounds')}
              icon="ti-circle-plus"
              iconColor="var(--text-tertiary)"
              count={soundsOutsideProfile.length}
              muted
              testId="other-sounds-section"
            >
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                {t('clickToAdd')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {displayedOther.map(s => (
                  <OutsideCard
                    key={s.id}
                    sound={s}
                    onAdd={async () => {
                      await store.addSoundToProfile(s.id, currentProfileId)
                      addToast(`"${s.name}" ${t('addedToProfile')}`, 'success')
                    }}
                  />
                ))}
              </div>
              {soundsOutsideProfile.length > itemsPerPage && (
                <button className="btn-secondary btn-sm" onClick={() => setShowAllOther(!showAllOther)} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                  <i className={`ti ${showAllOther ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                  {showAllOther ? t('showLess') : `${t('showMore')} ${soundsOutsideProfile.length - itemsPerPage}`}
                </button>
              )}
            </Section>
          )}
        </div>

        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
            onOpenDialog={handleOpenDialog}
            onDrop={handleDropFiles}
            dragOver={dragOver}
            setDragOver={setDragOver}
            currentProfileId={currentProfileId}
            store={store}
            onManualAdd={async (name, filePath, imagePath, emoji) => {
              const comp = await compressFileIfNeeded(filePath, {
                enabled: store.compressOnImport,
                bitrate: store.compressionBitrate || 128,
                onWarning: (msg) => console.warn('⚠️ Compression:', msg),
              })
              const finalPath = comp.path

              await store.addSound({
                name,
                path: finalPath,
                image: imagePath || null,
                emoji: emoji || '🔊',
                profiles: [currentProfileId]
              })
              addToast(`"${name}" ${t('added')}`, 'success')
              setShowImport(false)
            }}
            onUrlImport={async (url, name) => {
              const online = await ensureOnline()
              if (!online) return

              const safeName = name.replace(/\s+/g, '_') + '_' + Date.now() + '.mp3'
              let result = await window.electronAPI.downloadSoundUrl(url, safeName)

              if (!result.success && result.isNetworkError) {
                showNoConnection()
                return
              }
              
              if (result.success) {
                const comp = await compressFileIfNeeded(result.path, {
                  enabled: store.compressOnImport,
                  bitrate: store.compressionBitrate || 128,
                  onWarning: (msg) => console.warn('⚠️ Compression:', msg),
                })
                result.path = comp.path
              
              }

              if (result.success) {
                await store.addSound({ name, path: result.path, emoji: '🔊', profiles: [currentProfileId] })
                addToast(`"${name}" ${t('downloaded')}`, 'success')
              } else {
                addToast(`${t('error')} : ${result.error}`, 'error')
              }
              setShowImport(false)
            }}
          />
        )}

        {showProfileManager && (
          <ProfileManagerModal
            profileId={currentProfileId}
            profileName={currentProfile?.name || t('profile')}
            sounds={currentSounds}
            store={store}
            onClose={() => setShowProfileManager(false)}
            addToast={addToast}
          />
        )}

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmWrapper />
    </>
  )
}

function Section({ title, icon, iconColor, count, muted, children, testId }) {
  return (
    <section
      data-testid={testId || 'section'}
      style={{ marginBottom: 24 }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <i className={`ti ${icon}`} style={{ color: iconColor || 'inherit' }} />
        {title}
        {count != null && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({count})</span>}
      </div>
      {children}
    </section>
  )
}

function SoundGrid({
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
  testId
}) {
  const { t } = useLanguage()
  const cardSize = store.cardSize || 'medium'

  const cardSizes = {
    small: 90,
    medium: 110,
    large: 140
  }

  return (
    <div
      ref={gridRef}
      data-testid={testId || 'sound-grid'}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardSizes[cardSize]}px, 1fr))`,
        gap: 10,
        position: 'relative',
        zIndex: 1
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
              onRemoveFromProfile={async (id) => { await store.removeSoundFromProfile(id, store.currentProfileId); addToast(t('removedFromProfile'), 'info') }}
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

function OutsideCard({ sound, onAdd}) {
  const { t } = useLanguage()
  const imageUrl = buildFileUrl(sound.image)
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, opacity: 0.75 }}>
      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 6, overflow: 'hidden' }}>
        {imageUrl ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sound.emoji}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{sound.name}</div>
      <button
        data-testid={`add-other-sound-${sound.id}`}
        onClick={onAdd}
        className="btn-primary btn-sm"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <i className="ti ti-circle-plus" /> {t('addToProfile')}
      </button>
    </div>
  )
}

function ImportModal({ onClose, onOpenDialog, onDrop, dragOver, setDragOver, onUrlImport, onManualAdd, store }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('file')
  const [url, setUrl] = useState('')
  const [urlName, setUrlName] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [manualImage, setManualImage] = useState(null)
  const [manualEmoji, setManualEmoji] = useState('🔊')
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [compressOnImport, setCompressOnImport] = useState(store?.compressOnImport || false)
  const [compressionBitrate, setCompressionBitrate] = useState(store?.compressionBitrate || 128)
  // ✅ NOUVEAU : picker emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

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
    ['file', 'ti-upload', t('tabDrop')],
    ['manual', 'ti-settings', t('tabManual')],
    ['url', 'ti-link', t('tabUrl')],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title"><i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} /> {t('addSoundTitle')}</div>

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
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
              onDrop={onDrop}
              onClick={onOpenDialog}
              style={{ cursor: 'pointer', padding: '32px' }}
            >
              <i className="ti ti-upload" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: dragOver ? 'var(--accent)' : 'var(--text-primary)' }}>
                {dragOver ? t('releaseToImport') : t('dropFiles')}
              </div>
              <div style={{ fontSize: 12, marginBottom: 12 }}>MP3, WAV, OGG, FLAC, M4A</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <i className="ti ti-folder-open" /> {t('orBrowse')}
              </div>
            </div>

            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginTop: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={compressOnImport}
                  onChange={e => setCompressOnImport(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                <label style={{ fontSize: 12, cursor: 'pointer' }}>
                  <i className="ti ti-file-zip" style={{ marginRight: 4 }} />
                  {t('compressOnImport')}
                </label>
              </div>

              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('compressionBitrate')}:
                  </span>
                  <select
                    value={compressionBitrate}
                    onChange={e => setCompressionBitrate(Number(e.target.value))}
                    style={{ width: 120, fontSize: 12 }}
                  >
                    <option value="64">64 kbps</option>
                    <option value="96">96 kbps</option>
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                  </select>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    ({t('compressOnImportDesc')})
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary btn-lg" onClick={onClose}>{t('close')}</button>
            </div>
          </>
        )}

        {tab === 'manual' && !showTrimmer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('soundName')}</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('audioFile')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={manualFile ? manualFile.name : ''} placeholder={t('noFile')} style={{ flex: 1 }} />
                <button className="btn-secondary btn-sm" onClick={handlePickFile}><i className="ti ti-folder-open" /> {t('browse')}</button>
              </div>
            </div>

            {manualFile && (
              <button className="btn-secondary btn-sm" onClick={() => setShowTrimmer(true)} style={{ justifyContent: 'center' }}>
                <i className="ti ti-cut" /> {t('trimAudio')}
              </button>
            )}

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('image')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {manualImage && (
                  <img src={buildFileUrl(manualImage)}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <input readOnly value={manualImage ? t('imageSelected') : ''} placeholder={t('noImage')} style={{ flex: 1 }} />
                <button className="btn-secondary btn-sm" onClick={handlePickImage}><i className="ti ti-photo" /> {t('image')}</button>
                {manualImage && <button className="btn-ghost btn-sm" onClick={() => setManualImage(null)}><i className="ti ti-x" /></button>}
              </div>
            </div>

            {/* ✅ NOUVEAU : picker emoji (remplace la liste inline) */}
            {!manualImage && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('emojiLabel')}</label>
                <button
                  data-testid="import-modal-emoji-picker-button"
                  onClick={() => setShowEmojiPicker(true)}
                  className="btn-secondary"
                  style={{
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    fontSize: 28,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {manualEmoji || '🔊'}
                </button>
                <EmojiPicker
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  currentEmoji={manualEmoji}
                  onSelect={(e) => {
                    setManualEmoji(e)
                    setShowEmojiPicker(false)
                  }}
                  onManageClick={() => window.__navigateTo?.('emoji')}
                />
              </div>
            )}

            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={compressOnImport}
                  onChange={e => setCompressOnImport(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                <label style={{ fontSize: 12, cursor: 'pointer' }}>
                  <i className="ti ti-file-zip" style={{ marginRight: 4 }} />
                  {t('compressOnImport')}
                </label>
              </div>

              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('compressionBitrate')}:
                  </span>
                  <select
                    value={compressionBitrate}
                    onChange={e => setCompressionBitrate(Number(e.target.value))}
                    style={{ width: 120, fontSize: 12 }}
                  >
                    <option value="64">64 kbps</option>
                    <option value="96">96 kbps</option>
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                  </select>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary btn-lg" onClick={onClose}>{t('cancel')}</button>
              <button className="btn-primary btn-lg" onClick={() => handleManualAdd(null)} disabled={!manualFile || !manualName}>
                <i className="ti ti-check" /> {t('add')}
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
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('soundName')}</label>
              <input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('urlLabel')}</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t('urlPlaceholder')} />
            </div>

            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={compressOnImport}
                  onChange={e => setCompressOnImport(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                <label style={{ fontSize: 12, cursor: 'pointer' }}>
                  <i className="ti ti-file-zip" style={{ marginRight: 4 }} />
                  {t('compressOnImport')}
                </label>
              </div>

              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('compressionBitrate')}:
                  </span>
                  <select
                    value={compressionBitrate}
                    onChange={e => setCompressionBitrate(Number(e.target.value))}
                    style={{ width: 120, fontSize: 12 }}
                  >
                    <option value="64">64 kbps</option>
                    <option value="96">96 kbps</option>
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
              <strong>{t('supportedLinks')} :</strong> {t('urlInfo')}<br/>
              <strong>⚠️ Google Drive :</strong> {t('urlWarning')}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary btn-lg" onClick={onClose}>{t('cancel')}</button>
              <button className="btn-primary btn-lg" onClick={() => url && urlName && onUrlImport(url, urlName)} disabled={!url || !urlName}>
                <i className="ti ti-download" /> {t('download')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}