// src/features/home/Home.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import ProfileManagerModal from '@shared/components/modals/ProfileManagerModal'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useNetwork } from '@shared/contexts'
import useConfirm from '@shared/hooks/useConfirm'
import { compressFileIfNeeded } from '@shared/utils/fileCompression'

import Section from './Section'
import OutsideCard from './OutsideCard'
import SoundGrid from './SoundGrid'
import ImportModal from './ImportModal'
import { useHomeImport } from './useHomeImport'

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
  const [localSearch, setLocalSearch] = useState('')
  const [columns, setColumns] = useState(6)
  const gridRef = useRef(null)
  const favoritesGridRef = useRef(null)

  const searchTerm = localSearch

  const [draggedSoundId, setDraggedSoundId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragSource, setDragSource] = useState(null)

  const {
    currentSounds,
    favoriteSounds,
    shortcuts,
    audioDevice,
    volume,
    sounds,
    currentProfileId,
  } = store

  const {
    isImporting,
    importProgress,
    totalFiles,
    importSuccess,
    importFromPaths,
    importFromDrop,
  } = useHomeImport({ store, addToast, currentProfileId, t })

  const soundsOutsideProfile = currentProfileId !== 'all'
    ? sounds.filter(s => !s.profiles.includes(currentProfileId))
    : []

  const favoriteSoundsForProfile = currentSounds.filter(
    s => s.favorites?.includes(currentProfileId) || false
  )

  useEffect(() => {
    const resetDragOver = () => setDragOver(false)

    window.addEventListener('dragend', resetDragOver)
    window.addEventListener('drop', resetDragOver)
    window.addEventListener('dragleave', (e) => {
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

      const cardSizes = { small: 90, medium: 110, large: 140 }
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
  const displayedOther = showAllOther
    ? soundsOutsideProfile
    : soundsOutsideProfile.slice(0, itemsPerPage)

  const findGlobalIndex = (soundId) => {
    return currentSounds.findIndex(s => s.id === soundId)
  }

  const getOrderedFavorites = () => {
    return currentSounds.filter(s => s.favorites?.includes(currentProfileId) || false)
  }

  // ─── DRAG & DROP (réorganisation) ───────────────────────────────────

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
      if (e.target) e.target.style.opacity = '0.4'
    }, 0)
  }

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1'
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
    if (globalEndIndex > currentSounds.length) globalEndIndex = currentSounds.length

    const ok = await store.reorderSounds(globalStartIndex, globalEndIndex)

    setDraggedSoundId(null)
    setDragOverIndex(null)
    setIsDragging(false)
    if (ok) addToast(t('soundMoved'), 'success')
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

    const ok = await store.reorderSounds(startIndex, endIndex)

    setDraggedSoundId(null)
    setDragOverIndex(null)
    setIsDragging(false)
    if (ok) addToast(t('soundMoved'), 'success')
  }

  // ─── IMPORT ─────────────────────────────────────────────────────────

  const handleOpenDialog = async () => {
    const paths = await window.electronAPI.openFileDialog()
    if (paths.length) {
      await importFromPaths(paths)
      setShowImport(false)
    }
  }

  const handleDropFiles = async (e) => {
    e.preventDefault()
    setDragOver(false)
    setShowImport(false)

    if (draggedSoundId) return

    await importFromDrop(e.dataTransfer)
  }

  const handleDeleteSound = useCallback(async (soundId) => {
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) return

    const confirmed = await confirm({
      title: t('confirmDeleteSound') || 'Confirmer la suppression du son',
      message: t('confirmDeleteSoundMessage', { name: sound.name }) ||
        `Voulez-vous vraiment supprimer définitivement le son "${sound.name}" ?`,
      type: 'danger',
      confirmText: t('menuDelete') || 'Supprimer définitivement',
      cancelText: t('cancel') || 'Annuler',
    })

    if (confirmed) {
      await store.deleteSound(soundId)
      addToast(`"${sound.name}" ${t('deleted')}`, 'info')
    }
  }, [store, confirm, addToast, t])

  const currentProfile = store.profiles.find(p => p.id === currentProfileId)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {currentProfile?.id === 'all' ? t('allSounds') : currentProfile?.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {currentSounds.length} {t('sounds')}
            </div>
            {searchTerm && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                <i className="ti ti-search" style={{ fontSize: 10 }} />{' '}
                {t('resultsFor')} "{searchTerm}" ({filtered.length})
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
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowProfileManager(true)}
              style={{ minHeight: 34 }}
            >
              <i className="ti ti-settings" /> {t('manageProfile')}
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: isImporting ? 'hidden' : 'auto',
            padding: '16px 20px',
            position: 'relative',
          }}
          onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
          onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
          }}
          onDrop={handleDropFiles}
        >
          {dragOver && (
            <div className="drop-overlay">
              <i className="ti ti-music-plus" style={{ fontSize: 48, color: 'var(--accent)' }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
                {t('dropToImport')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                MP3, WAV, OGG, FLAC, M4A
              </div>
            </div>
          )}

          {isImporting && (
            <div className="import-overlay">
              <i className="ti ti-loader" style={{
                fontSize: 40,
                color: 'var(--accent)',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
                {t('importing')}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {totalFiles > 0
                  ? `${importProgress} / ${totalFiles} fichiers`
                  : t('importingFiles')}
              </div>
              {totalFiles > 0 && (
                <div style={{
                  width: 200,
                  height: 4,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(importProgress / totalFiles) * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              )}
            </div>
          )}

          {importSuccess > 0 && !isImporting && (
            <div className="success-overlay">
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <i className="ti ti-check" style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>
                {importSuccess} {t('sounds')} {t('added')} !
              </div>
            </div>
          )}

          {filtered.length === 0 && soundsOutsideProfile.length === 0 && !isImporting && (
            <div
              className="drop-zone"
              onClick={() => setShowImport(true)}
              style={{ cursor: 'pointer' }}
            >
              <i className="ti ti-music-plus" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {t('noSoundsForProfile')}
              </div>
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
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setShowAll(!showAll)}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                >
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 10,
              }}>
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
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setShowAllOther(!showAllOther)}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                >
                  <i className={`ti ${showAllOther ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                  {showAllOther
                    ? t('showLess')
                    : `${t('showMore')} ${soundsOutsideProfile.length - itemsPerPage}`}
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
              })
              const finalPath = comp.path

              await store.addSound({
                name,
                path: finalPath,
                image: imagePath || null,
                emoji: emoji || '🔊',
                profiles: [currentProfileId],
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
                })
                result.path = comp.path
              }

              if (result.success) {
                await store.addSound({
                  name,
                  path: result.path,
                  emoji: '🔊',
                  profiles: [currentProfileId],
                })
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