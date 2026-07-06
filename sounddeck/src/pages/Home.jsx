import { useState, useEffect, useRef } from 'react'
import SoundCard from '../components/SoundCard'
import AudioTrimmer from '../components/AudioTrimmer'
import ProfileManagerModal from '../components/ProfileManagerModal'
import VoiceControl from '../components/VoiceControl'
import AIGenerator from '../components/AIGenerator'
import { useTranslation } from '../i18n'
import { playSound, stopAllSounds, stopSound } from '../utils/audio'
import { analyzeAudio } from '../utils/aiTagging'
import { compressAudio, formatSize } from '../utils/audioConverter'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

export default function Home({ store, addToast, loopEnabled, lang = 'fr', globalSearch = '' }) {
  const tr = useTranslation(lang)
  const playLocally = store.playLocally
  const [showAll, setShowAll] = useState(false)
  const [showAllOther, setShowAllOther] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showProfileManager, setShowProfileManager] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [sortBy, setSortBy] = useState('custom')
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [importSuccess, setImportSuccess] = useState(0)
  const [localSearch, setLocalSearch] = useState('')
  const [columns, setColumns] = useState(6)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const gridRef = useRef(null)
  const favoritesGridRef = useRef(null)

  const searchTerm = globalSearch || localSearch

  const [draggedSoundId, setDraggedSoundId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragSource, setDragSource] = useState(null)

  const { currentSounds, favoriteSounds, shortcuts, audioDevice, volume, sounds, currentProfileId } = store

  const soundsOutsideProfile = currentProfileId !== 'all'
    ? sounds.filter(s => !s.profiles.includes(currentProfileId))
    : []

  const favoriteSoundsForProfile = currentSounds.filter(s => s.favorites?.includes(currentProfileId) || false)

  // Calculer les colonnes en fonction de la taille des cartes
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

  // Filtrer les sons avec recherche par tags
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

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragStart = (e, soundId, index, source) => {
    if (sortBy !== 'custom') {
      addToast('Le drag and drop est disponible uniquement en tri "Personnalisé"', 'info')
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
    addToast(tr('soundMoved'), 'success')
  }

  const handleMainDrop = async (e, dropIndex) => {
    e.preventDefault()
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
    addToast(tr('soundMoved'), 'success')
  }

  // ─── Import ──────────────────────────────────────────────────────────────
  const handleImportFiles = async (filePaths) => {
    setTotalFiles(filePaths.length)
    setImportProgress(0)
    let count = 0
    
    const compressOnImport = store.compressOnImport || false
    const compressionBitrate = store.compressionBitrate || 128
    
    for (let i = 0; i < filePaths.length; i++) {
      const fp = filePaths[i]
      let result = await window.electronAPI.importSoundFile(fp)
      
      // Si la compression est activée, compresser le fichier
      if (result.success && compressOnImport) {
        try {
          const originalPath = result.path
          const ext = originalPath.split('.').pop() || 'mp3'
          const compressedPath = originalPath.replace(`.${ext}`, `_compressed.${ext}`)
          
          const compressionResult = await compressAudio(originalPath, compressedPath, {
            bitrate: compressionBitrate,
            format: ext === 'mp3' ? 'mp3' : 'aac'
          })
          
          if (compressionResult.success) {
            // Remplacer le fichier original par le fichier compressé
            result.path = compressedPath
            result.compressed = true
            result.originalSize = compressionResult.originalSize
            result.compressedSize = compressionResult.size
            result.compressionRatio = compressionResult.ratio
            
            // Supprimer le fichier original
            await window.electronAPI.deleteSoundFile(originalPath)
            
            console.log(`✅ Fichier compressé: ${formatSize(compressionResult.originalSize)} → ${formatSize(compressionResult.size)} (${Math.round((1 - compressionResult.ratio) * 100)}% réduction)`)
          } else {
            console.warn('⚠️ Compression échouée, utilisation du fichier original:', compressionResult.error)
          }
        } catch (e) {
          console.warn('⚠️ Erreur compression:', e)
        }
      }
      
      if (result.success) {
        await store.addSound({ 
          name: result.name, 
          path: result.path, 
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], 
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
        ? `${count} ${tr('sounds')} ${tr('importedAndCompressed')}`
        : `${count} ${tr('sounds')} ${tr('imported')}`
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

    const dtFiles = [...(e.dataTransfer?.files || [])]
    const dtItems = [...(e.dataTransfer?.items || [])]
    const allFiles = dtFiles.length > 0
      ? dtFiles
      : dtItems.filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)

    if (!allFiles.length) {
      addToast(tr('noFileDetected'), 'error')
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
      addToast(`${tr('unsupportedFormat')} : ${names}`, 'error')
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
            reader.onerror = () => reject(new Error(tr('readError')))
            reader.readAsArrayBuffer(file)
          })
          result = await window.electronAPI.writeDroppedFile(file.name, arrayBuffer)
        }
        
        if (result.success) {
          // Compression si activée
          if (compressOnImport) {
            try {
              const originalPath = result.path
              const ext = originalPath.split('.').pop() || 'mp3'
              const compressedPath = originalPath.replace(`.${ext}`, `_compressed.${ext}`)
              
              const compressionResult = await compressAudio(originalPath, compressedPath, {
                bitrate: compressionBitrate,
                format: ext === 'mp3' ? 'mp3' : 'aac'
              })
              
              if (compressionResult.success) {
                result.path = compressedPath
                await window.electronAPI.deleteSoundFile(originalPath)
                console.log(`✅ Fichier compressé: ${formatSize(compressionResult.originalSize)} → ${formatSize(compressionResult.size)}`)
              }
            } catch (e) {
              console.warn('⚠️ Erreur compression:', e)
            }
          }
          
          await store.addSound({
            name: result.name,
            path: result.path,
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            profiles: [currentProfileId]
          })
          imported++
        } else {
          addToast(`${tr('errorFor')} ${file.name} : ${result?.error || tr('unknown')}`, 'error')
        }
      } catch (err) {
        console.error('Drop import error:', err)
        addToast(`${tr('cannotImport')} ${file.name}`, 'error')
      }
    }

    setImporting(false)
    if (imported > 0) {
      setImportSuccess(imported)
      const msg = compressOnImport
        ? `${imported} ${tr('sounds')} ${tr('importedAndCompressed')}`
        : `${imported} ${tr('sounds')} ${tr('importedSuccessfully')}`
      addToast(msg, 'success')
      setTimeout(() => setImportSuccess(0), 3000)
    }
  }

  // ─── Analyse IA ──────────────────────────────────────────────────────────
  const handleAnalyzeSounds = async () => {
    setIsAnalyzing(true)
    const soundsToAnalyze = currentSounds.slice(0, 10)
    
    let analyzed = 0
    for (const sound of soundsToAnalyze) {
      try {
        const tags = await analyzeAudio(sound.path)
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await store.addTagToSound(sound.id, tag.tag)
          }
        }
        analyzed++
      } catch (e) {
        console.error('Erreur analyse:', e)
      }
    }
    
    setIsAnalyzing(false)
    addToast(`${analyzed} ${tr('sounds')} ${tr('autoTagSuccess')}`, 'success')
  }

  // ─── Commandes vocales ──────────────────────────────────────────────────
  const handleVoiceCommand = (text) => {
    const words = text.split(' ')
    for (const word of words) {
      const found = currentSounds.find(s => 
        s.name.toLowerCase().includes(word) || 
        (store.tags[s.id] || []).some(t => t === word)
      )
      if (found) {
        playSound(found, audioDevice, volume, loopEnabled, playLocally)
        addToast(`🎤 "${found.name}" ${tr('played')}`, 'success')
        return
      }
    }
    
    if (text.includes('stop') || text.includes('arrête')) {
      stopAllSounds()
      addToast('🔇 ' + tr('toastAllStopped'), 'info')
      return
    }
    
    if (text.includes('loop') || text.includes('répète')) {
      store.toggleLoop()
      addToast(`🔄 ${tr('loop')} ${loopEnabled ? tr('toastLoopOff') : tr('toastLoopOn')}`, 'info')
      return
    }
    
    addToast(`❓ ${tr('commandNotRecognized')}: "${text}"`, 'warning')
  }

  const currentProfile = store.profiles.find(p => p.id === currentProfileId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{currentProfile?.id === 'all' ? tr('allSounds') : currentProfile?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{currentSounds.length} {tr('sounds')}</div>
          {searchTerm && (
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
              <i className="ti ti-search" style={{ fontSize: 10 }} /> {tr('resultsFor')} "{searchTerm}" ({filtered.length})
            </div>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-sm" style={{ width: 'auto', minWidth: 120 }}>
          <option value="custom">{tr('sortCustom')}</option>
          <option value="default">{tr('sortDefault')}</option>
          <option value="popular">{tr('sortPopular')}</option>
          <option value="recent">{tr('sortRecent')}</option>
          <option value="alpha">{tr('sortAlpha')}</option>
        </select>
        <input 
          value={localSearch} 
          onChange={e => setLocalSearch(e.target.value)} 
          placeholder={tr('search')} 
          className="input-sm"
          style={{ width: 160, minWidth: 120 }} 
        />
        
        <VoiceControl 
          store={store}
          onCommand={handleVoiceCommand}
          lang={lang}
        />
        
        <button 
          className="btn-secondary btn-sm"
          onClick={handleAnalyzeSounds}
          disabled={isAnalyzing}
          style={{ minHeight: 34 }}
        >
          {isAnalyzing ? (
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('analyzing')}</>
          ) : (
            <><i className="ti ti-wand" /> {tr('autoTag')}</>
          )}
        </button>
        
        <button 
          className="btn-secondary btn-sm"
          onClick={() => setShowAIGenerator(true)}
          style={{ minHeight: 34 }}
        >
          <i className="ti ti-wand" /> {tr('aiGenerator')}
        </button>
        
        <button className="btn-primary btn-sm" onClick={() => setShowImport(true)} style={{ minHeight: 34 }}>
          <i className="ti ti-plus" /> {tr('addSound')}
        </button>
        
        {currentProfileId !== 'all' && (
          <button className="btn-secondary btn-sm" onClick={() => setShowProfileManager(true)} style={{ minHeight: 34 }}>
            <i className="ti ti-settings" /> {tr('manageProfile')}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: importing ? 'hidden' : 'auto', padding: '16px 20px', position: 'relative' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
        }}
        onDrop={handleDropFiles}>

        {dragOver && (
          <div className="drop-overlay">
            <i className="ti ti-music-plus" style={{ fontSize: 48, color: 'var(--accent)' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{tr('dropToImport')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>MP3, WAV, OGG, FLAC, M4A</div>
          </div>
        )}

        {importing && (
          <div className="import-overlay">
            <i className="ti ti-loader" style={{ fontSize: 40, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{tr('importing')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {totalFiles > 0 ? `${importProgress} / ${totalFiles} fichiers` : tr('importingFiles')}
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
              {importSuccess} {tr('sounds')} {tr('added')} !
            </div>
          </div>
        )}

        {filtered.length === 0 && soundsOutsideProfile.length === 0 && !importing && (
          <div className="drop-zone" onClick={() => setShowImport(true)} style={{ cursor: 'pointer' }}>
            <i className="ti ti-music-plus" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{tr('noSoundsForProfile')}</div>
            <div style={{ fontSize: 12 }}>{tr('dropHere')}</div>
          </div>
        )}

        {favoriteSoundsForProfile.length > 0 && (
          <Section title={tr('favorites')} icon="ti-star-filled" iconColor="var(--warning)" count={favoriteSoundsForProfile.length}>
            <SoundGrid 
              sounds={favoriteSoundsForProfile} 
              shortcuts={shortcuts} 
              audioDevice={audioDevice} 
              volume={volume} 
              loopEnabled={loopEnabled} 
              playLocally={playLocally} 
              store={store} 
              addToast={addToast} 
              lang={lang}
              gridRef={favoritesGridRef}
              draggable={sortBy === 'custom'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              draggedSoundId={draggedSoundId}
              dragOverIndex={dragOverIndex}
              dropTarget="favorites"
            />
          </Section>
        )}

        {filtered.length > 0 && (
          <Section title={tr('profileSounds')} icon="ti-music" count={filtered.length}>
            <SoundGrid 
              sounds={displayed} 
              shortcuts={shortcuts} 
              audioDevice={audioDevice} 
              volume={volume} 
              loopEnabled={loopEnabled} 
              playLocally={playLocally} 
              store={store} 
              addToast={addToast} 
              lang={lang}
              gridRef={gridRef}
              draggable={sortBy === 'custom'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleMainDrop}
              draggedSoundId={draggedSoundId}
              dragOverIndex={dragOverIndex}
              dropTarget="profile"
            />
            {filtered.length > itemsPerPage && (
              <button className="btn-secondary btn-sm" onClick={() => setShowAll(!showAll)} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {showAll ? tr('showLess') : `${tr('showMore')} ${filtered.length - itemsPerPage}`}
              </button>
            )}
          </Section>
        )}

        {soundsOutsideProfile.length > 0 && (
          <Section title={tr('otherSounds')} icon="ti-circle-plus" iconColor="var(--text-tertiary)" count={soundsOutsideProfile.length} muted>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              {tr('clickToAdd')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {displayedOther.map(s => (
                <OutsideCard key={s.id} sound={s} onAdd={async () => {
                  await store.addSoundToProfile(s.id, currentProfileId)
                  addToast(`"${s.name}" ${tr('addedToProfile')}`, 'success')
                }} lang={lang} />
              ))}
            </div>
            {soundsOutsideProfile.length > itemsPerPage && (
              <button className="btn-secondary btn-sm" onClick={() => setShowAllOther(!showAllOther)} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                <i className={`ti ${showAllOther ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                {showAllOther ? tr('showLess') : `${tr('showMore')} ${soundsOutsideProfile.length - itemsPerPage}`}
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
            let finalPath = filePath
            const compressOnImport = store.compressOnImport || false
            
            // Compression si activée
            if (compressOnImport) {
              try {
                const ext = filePath.split('.').pop() || 'mp3'
                const compressedPath = filePath.replace(`.${ext}`, `_compressed.${ext}`)
                const compressionResult = await compressAudio(filePath, compressedPath, {
                  bitrate: store.compressionBitrate || 128,
                  format: ext === 'mp3' ? 'mp3' : 'aac'
                })
                if (compressionResult.success) {
                  finalPath = compressedPath
                  await window.electronAPI.deleteSoundFile(filePath)
                }
              } catch (e) {
                console.warn('⚠️ Erreur compression:', e)
              }
            }
            
            await store.addSound({ 
              name, 
              path: finalPath, 
              image: imagePath || null, 
              emoji: emoji || '🔊', 
              profiles: [currentProfileId] 
            })
            addToast(`"${name}" ${tr('added')}`, 'success')
            setShowImport(false)
          }}
          onUrlImport={async (url, name) => {
            const safeName = name.replace(/\s+/g, '_') + '_' + Date.now() + '.mp3'
            let result = await window.electronAPI.downloadSoundUrl(url, safeName)
            
            // Compression si activée
            if (result.success && store.compressOnImport) {
              try {
                const ext = result.path.split('.').pop() || 'mp3'
                const compressedPath = result.path.replace(`.${ext}`, `_compressed.${ext}`)
                const compressionResult = await compressAudio(result.path, compressedPath, {
                  bitrate: store.compressionBitrate || 128,
                  format: ext === 'mp3' ? 'mp3' : 'aac'
                })
                if (compressionResult.success) {
                  result.path = compressedPath
                  await window.electronAPI.deleteSoundFile(result.path.replace(`_compressed.${ext}`, `.${ext}`))
                }
              } catch (e) {
                console.warn('⚠️ Erreur compression:', e)
              }
            }
            
            if (result.success) {
              await store.addSound({ name, path: result.path, emoji: '🔊', profiles: [currentProfileId] })
              addToast(`"${name}" ${tr('downloaded')}`, 'success')
            } else addToast(`${tr('error')} : ${result.error}`, 'error')
            setShowImport(false)
          }}
          lang={lang}
        />
      )}

      {showProfileManager && (
        <ProfileManagerModal
          profileId={currentProfileId}
          profileName={currentProfile?.name || 'Profil'}
          sounds={currentSounds}
          store={store}
          onClose={() => setShowProfileManager(false)}
          addToast={addToast}
          lang={lang}
        />
      )}

      {showAIGenerator && (
        <AIGenerator
          store={store}
          onAddSound={() => {
            addToast(tr('soundGenerated'), 'success')
          }}
          onClose={() => setShowAIGenerator(false)}
          lang={lang}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────────────

function Section({ title, icon, iconColor, count, muted, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
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

function SoundGrid({ sounds, shortcuts, audioDevice, volume, loopEnabled, playLocally, store, addToast, lang, gridRef, draggable, onDragStart, onDragEnd, onDragOver, onDrop, draggedSoundId, dragOverIndex, dropTarget }) {
  const tr = useTranslation(lang || 'fr')
  const cardSize = store.cardSize || 'medium'
  
  const cardSizes = {
    small: 90,
    medium: 110,
    large: 140
  }
  
  return (
    <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${cardSizes[cardSize]}px, 1fr))`, gap: 10, position: 'relative', zIndex: 1 }}>
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
              onRemoveFromProfile={async (id) => { await store.removeSoundFromProfile(id, store.currentProfileId); addToast(tr('removedFromProfile'), 'info') }}
              onDelete={async (id) => { await store.deleteSound(id); addToast(tr('deleted'), 'info') }}
              onRename={(id, name) => store.updateSound(id, { name })}
              onChangeImage={store.updateSoundImage}
              onChangeEmoji={store.updateSoundEmoji}
              onAddTag={async (id, tag) => {
                await store.addTagToSound(id, tag)
                addToast(`${tr('tagAdded')}: #${tag}`, 'success')
              }}
              onRemoveTag={async (id, tag) => {
                await store.removeTagFromSound(id, tag)
                addToast(`${tr('tagRemoved')}: #${tag}`, 'info')
              }}
              tags={store.tags[s.id] || []}
              draggable={draggable}
              lang={lang}
              onDragStart={(e) => draggable && onDragStart(e, s.id, index, dropTarget)}
              onDragEnd={(e) => draggable && onDragEnd(e)}
              layout={store.keyboardLayout || 'qwerty'}
              size={cardSize}
            />
          </div>
        )
      })}
    </div>
  )
}

function OutsideCard({ sound, onAdd, lang }) {
  const tr = useTranslation(lang || 'fr')
  const imageUrl = sound.image
    ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
    : null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, opacity: 0.75 }}>
      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 6, overflow: 'hidden' }}>
        {imageUrl ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sound.emoji}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{sound.name}</div>
      <button onClick={onAdd} className="btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
        <i className="ti ti-circle-plus" /> {tr('addToProfile')}
      </button>
    </div>
  )
}

function ImportModal({ onClose, onOpenDialog, onDrop, dragOver, setDragOver, onUrlImport, onManualAdd, store, lang }) {
  const tr = useTranslation(lang || 'fr')
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
    ['file', 'ti-upload', tr('tabDrop')],
    ['manual', 'ti-settings', tr('tabManual')],
    ['url', 'ti-link', tr('tabUrl')],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title"><i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} /> {tr('addSoundTitle')}</div>

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
                {dragOver ? tr('releaseToImport') : tr('dropFiles')}
              </div>
              <div style={{ fontSize: 12, marginBottom: 12 }}>MP3, WAV, OGG, FLAC, M4A</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <i className="ti ti-folder-open" /> {tr('orBrowse')}
              </div>
            </div>

            {/* Option de compression - visible dans tous les onglets */}
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
                  {tr('compressOnImport')}
                </label>
              </div>
              
              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {tr('compressionBitrate')}:
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
                    ({tr('compressOnImportDesc')})
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary btn-lg" onClick={onClose}>{tr('close')}</button>
            </div>
          </>
        )}

        {tab === 'manual' && !showTrimmer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('soundName')}</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('audioFile')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={manualFile ? manualFile.name : ''} placeholder={tr('noFile')} style={{ flex: 1 }} />
                <button className="btn-secondary btn-sm" onClick={handlePickFile}><i className="ti ti-folder-open" /> {tr('browse')}</button>
              </div>
            </div>

            {manualFile && (
              <button className="btn-secondary btn-sm" onClick={() => setShowTrimmer(true)} style={{ justifyContent: 'center' }}>
                <i className="ti ti-cut" /> {tr('trimAudio')}
              </button>
            )}

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('image')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {manualImage && (
                  <img src={`file:///${manualImage.replace(/\\/g, '/')}`}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <input readOnly value={manualImage ? tr('imageSelected') : ''} placeholder={tr('noImage')} style={{ flex: 1 }} />
                <button className="btn-secondary btn-sm" onClick={handlePickImage}><i className="ti ti-photo" /> {tr('image')}</button>
                {manualImage && <button className="btn-ghost btn-sm" onClick={() => setManualImage(null)}><i className="ti ti-x" /></button>}
              </div>
            </div>

            {!manualImage && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{tr('emojiLabel')}</label>
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

            {/* Compression dans l'onglet Manuel */}
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
                  {tr('compressOnImport')}
                </label>
              </div>
              
              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {tr('compressionBitrate')}:
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
              <button className="btn-secondary btn-lg" onClick={onClose}>{tr('cancel')}</button>
              <button className="btn-primary btn-lg" onClick={() => handleManualAdd(null)} disabled={!manualFile || !manualName}>
                <i className="ti ti-check" /> {tr('add')}
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
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('soundName')}</label>
              <input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="Ex: Airhorn" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('urlLabel')}</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder={tr('urlPlaceholder')} />
            </div>

            {/* Compression dans l'onglet URL */}
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
                  {tr('compressOnImport')}
                </label>
              </div>
              
              {compressOnImport && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {tr('compressionBitrate')}:
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
              <strong>{tr('supportedLinks')} :</strong> {tr('urlInfo')}<br/>
              <strong>⚠️ Google Drive :</strong> {tr('urlWarning')}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary btn-lg" onClick={onClose}>{tr('cancel')}</button>
              <button className="btn-primary btn-lg" onClick={() => url && urlName && onUrlImport(url, urlName)} disabled={!url || !urlName}>
                <i className="ti ti-download" /> {tr('download')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}