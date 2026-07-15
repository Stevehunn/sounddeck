import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '../i18n'
import { Howl } from 'howler'
import EditorTimeline from '../components/editor/EditorTimeline'
import EditorToolbar from '../components/editor/EditorToolbar'
import EditorEffectsPanel from '../components/editor/EditorEffectsPanel'
import { generateWaveformData } from '../utils/waveformGenerator'

// Liste d'emojis pour l'export
const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

export default function Editor({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(10)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [waveformData, setWaveformData] = useState({})
  const [clipDurations, setClipDurations] = useState({})
  const [snapEnabled, setSnapEnabled] = useState(true)
  
  // État pour le modal d'export
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportName, setExportName] = useState('')
  const [exportEmoji, setExportEmoji] = useState('🔊')
  const [exportImage, setExportImage] = useState(null)
  const [exportProfiles, setExportProfiles] = useState(['all'])
  const [exportAddToLibrary, setExportAddToLibrary] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Références
  const audioRef = useRef(null)
  const animationRef = useRef(null)
  const projectRef = useRef(store.editorProject)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const allHowlsRef = useRef([])
  const isPlayingRef = useRef(false)
  const loopRegionRef = useRef(store.editorLoopRegion)
  const playAllClipsRef = useRef(null)

  // ✅ Garder une ref à jour de la zone de boucle (lue dans des closures d'animation)
  useEffect(() => {
    loopRegionRef.current = store.editorLoopRegion
  }, [store.editorLoopRegion])

  // Mettre à jour la référence du projet
  useEffect(() => {
    projectRef.current = store.editorProject
  }, [store.editorProject])

  // ✅ Calculer la durée TOTALE dynamique en fonction des clips
  useEffect(() => {
    const calculateTotalDuration = async () => {
      const project = store.editorProject
      if (!project || !project.tracks) return

      let maxDuration = 10
      const newClipDurations = { ...clipDurations }

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          // Si on n'a pas encore la durée du clip, on la charge
          if (!newClipDurations[clip.id] && clip.path) {
            try {
              const fileUrl = clip.path.startsWith('file://') 
                ? clip.path 
                : 'file:///' + clip.path.replace(/\\/g, '/')
              
              const audio = new Audio()
              audio.src = fileUrl
              
              const duration = await new Promise((resolve) => {
                audio.addEventListener('loadedmetadata', () => {
                  resolve(audio.duration)
                })
                audio.addEventListener('error', () => {
                  resolve(3) // Durée par défaut en cas d'erreur
                })
                // Si le chargement prend trop de temps
                setTimeout(() => resolve(3), 3000)
              })
              
              newClipDurations[clip.id] = duration
              // Mettre à jour la durée du clip dans le store
              if (duration > 0 && clip.duration !== duration) {
                store.updateClip(track.id, clip.id, { duration })
              }
            } catch (e) {
              console.warn('Erreur chargement durée:', e)
              newClipDurations[clip.id] = clip.duration || 3
            }
          }

          // Calculer la fin du clip
          const clipDuration = newClipDurations[clip.id] || clip.duration || 3
          const end = clip.start + clipDuration
          if (end > maxDuration) maxDuration = end
        }
      }

      setClipDurations(newClipDurations)
      // Ajouter 2 secondes de marge
      const newTotal = Math.max(maxDuration + 2, 10)
      setTotalDuration(newTotal)
    }

    calculateTotalDuration()
  }, [store.editorProject?.tracks])

  // Charger les waveforms des clips
  useEffect(() => {
    const loadWaveforms = async () => {
      const project = store.editorProject
      if (!project || !project.tracks) return

      setIsLoading(true)
      const newWaveformData = {}

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (clip.path && !waveformData[clip.id]) {
            try {
              const data = await generateWaveformData(clip.path, 200)
              if (data) {
                newWaveformData[clip.id] = data
              }
            } catch (e) {
              console.warn('Erreur génération waveform:', e)
            }
          }
        }
      }

      setWaveformData(prev => ({ ...prev, ...newWaveformData }))
      setIsLoading(false)
    }

    loadWaveforms()
  }, [store.editorProject?.tracks])

  // Nettoyer l'animation et l'audio
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current.unload()
      }
      // Nettoyer tous les howls
      allHowlsRef.current.forEach(item => {
        if (item.howl) {
          if (item.howl.playing()) item.howl.stop()
          item.howl.unload()
        }
      })
      allHowlsRef.current = []
    }
  }, [])

  // Créer un projet automatiquement si inexistant
  useEffect(() => {
    const project = store.editorProject
    if (!project || !project.id) {
      store.createEditorProject('Nouveau projet')
    }
  }, [])

  // ─── GESTION DU PROJET ──────────────────────────────────────────────────────

  const handleAddTrack = async () => {
    await store.addTrack()
    addToast(tr('editorTrackAdded'), 'success')
  }

  const handleRemoveTrack = async (trackId) => {
    await store.removeTrack(trackId)
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
    addToast(tr('editorTrackRemoved'), 'info')
  }

  const handleAddClip = async (trackId, soundId) => {
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) {
      addToast(tr('editorSoundNotFound'), 'error')
      return
    }

    const track = store.editorProject.tracks.find(t => t.id === trackId)
    let start = 0
    if (track && track.clips.length > 0) {
      const lastClip = track.clips.reduce((max, clip) => 
        clip.start + clip.duration > max.start + max.duration ? clip : max
      )
      start = lastClip.start + lastClip.duration + 0.5
    }

    // Durée par défaut : 3 secondes, sera mise à jour après chargement
    const clip = await store.addClipToTrack(trackId, soundId, start, 3)
    if (clip) {
      addToast(`"${sound.name}" ${tr('editorClipAdded')}`, 'success')
      setSelectedClipId(clip.id)
      setSelectedTrackId(trackId)
    }
  }

  const handleRemoveClip = async (trackId, clipId) => {
    await store.removeClip(trackId, clipId)
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
    }
    addToast(tr('editorClipRemoved'), 'info')
  }

  const handleClipSelect = (clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }

  // ─── LECTURE CORRIGÉE ──────────────────────────────────────────────────────

  // ✅ Fonction pour arrêter complètement la lecture
  const stopPlayback = useCallback(() => {
    // Arrêter tous les howls
    allHowlsRef.current.forEach(item => {
      if (item.howl) {
        if (item.howl.playing()) item.howl.stop()
        item.howl.unload()
      }
    })
    allHowlsRef.current = []

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    startTimeRef.current = 0
    pausedTimeRef.current = 0
    isPlayingRef.current = false
  }, [])

  // ✅ Fonction pour mettre en pause
  const pausePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      // Mettre en pause tous les howls
      allHowlsRef.current.forEach(item => {
        if (item.howl && item.howl.playing()) {
          item.howl.pause()
        }
      })
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      setIsPaused(true)
      setIsPlaying(false)
      pausedTimeRef.current = currentTime
      isPlayingRef.current = false
    }
  }, [currentTime])

  // ✅ Fonction pour reprendre la lecture — relance simplement playAllClips à la position
  // où on s'est arrêté (pausedTimeRef), au lieu de juste "play()" les howls existants
  // qui ignoraient un éventuel déplacement du curseur pendant la pause.
  const resumePlayback = useCallback(() => {
    if (isPaused) {
      playAllClipsRef.current?.(pausedTimeRef.current)
    }
  }, [isPaused])

  // ✅ Lecture de tous les clips en parallèle (startAt permet de démarrer ailleurs qu'à 0, utilisé par la boucle)
  const playAllClips = useCallback((startAt = 0) => {
    const project = store.editorProject
    if (!project || project.tracks.length === 0) {
      addToast(tr('editorNoTracks'), 'info')
      return
    }

    // Vérifier s'il y a des clips
    let hasClips = false
    project.tracks.forEach(track => {
      if (track.clips.length > 0) hasClips = true
    })

    if (!hasClips) {
      addToast(tr('editorNoClips'), 'info')
      return
    }

    // Arrêter toute lecture en cours
    stopPlayback()

    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    setCurrentTime(startAt)
    startTimeRef.current = Date.now() - startAt * 1000
    pausedTimeRef.current = 0

    // Créer et démarrer tous les clips
    const howls = []
    project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const fileUrl = clip.path.startsWith('file://') 
          ? clip.path 
          : 'file:///' + clip.path.replace(/\\/g, '/')

        // Récupérer la durée réelle du clip
        const clipDuration = clipDurations[clip.id] || clip.duration || 3

        // Appliquer les effets
        let volume = 1.0
        let speed = 1.0

        clip.effects?.forEach(effect => {
          if (effect.enabled) {
            switch (effect.type) {
              case 'volume':
                volume = effect.params.value || 1.0
                break
              case 'speed':
                speed = effect.params.value || 1.0
                break
            }
          }
        })

        const howl = new Howl({
          src: [fileUrl],
          volume: volume * (store.volume / 100),
          rate: speed,
          html5: true,
          onloaderror: (id, err) => {
            console.error('Erreur lecture clip:', clip.name, err)
          }
        })

        howls.push({
          howl,
          clip,
          startOffset: clip.start,
          started: false,
          duration: clipDuration
        })
      })
    })

    allHowlsRef.current = howls

    // Fonction pour démarrer les clips à leur moment
    const startClipsAtTime = (time) => {
      howls.forEach(item => {
        if (!item.started && time >= item.startOffset) {
          try {
            item.howl.play()
            const seekTime = Math.min(time - item.startOffset, item.duration)
            if (seekTime > 0) {
              item.howl.seek(seekTime)
            }
            item.started = true
          } catch (e) {
            console.warn('Erreur démarrage clip:', e)
          }
        }
      })
    }

    // Animation de progression
    const updateProgress = () => {
      if (!isPlayingRef.current) {
        return
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const current = Math.min(elapsed, totalDuration)

      // Démarrer les clips qui doivent commencer
      startClipsAtTime(current)

      // Mettre à jour le temps
      setCurrentTime(current)

      // Émettre l'événement pour la timeline
      window.dispatchEvent(new CustomEvent('clip-progress', { 
        detail: { current, duration: totalDuration } 
      }))

      // Zone de boucle : on relance la lecture au début de la boucle
      const loop = loopRegionRef.current
      if (loop?.enabled && current >= loop.end) {
        stopPlayback()
        playAllClips(loop.start)
        return
      }

      // Vérifier si on a atteint la fin
      if (current >= totalDuration) {
        stopPlayback()
        return
      }

      animationRef.current = requestAnimationFrame(updateProgress)
    }

    // Démarrer immédiatement les clips qui commencent à startAt
    startClipsAtTime(startAt)
    updateProgress()
  }, [store.editorProject, store.volume, totalDuration, clipDurations, addToast, tr, stopPlayback])

  // ✅ Garder une ref à jour vers playAllClips (utilisée par resumePlayback, défini plus haut dans le fichier)
  useEffect(() => {
    playAllClipsRef.current = playAllClips
  }, [playAllClips])

  // ✅ Play/Pause principal
  const handlePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback()
    } else if (isPaused) {
      resumePlayback()
    } else {
      // ✅ Si on a cliqué sur la timeline, démarrer depuis la position actuelle
      playAllClips(currentTime > 0 ? currentTime : 0)
    }
  }, [isPlaying, isPaused, currentTime, pausePlayback, resumePlayback, playAllClips])

  // ✅ Stop/Retour au début
  const handleStop = useCallback(() => {
    stopPlayback()
    setCurrentTime(0)
  }, [stopPlayback])

  // ✅ Fonction de recherche (seek)
  const handleSeek = useCallback((time) => {
    const clampedTime = Math.max(0, Math.min(totalDuration, time))
    setCurrentTime(clampedTime)
    
    // ✅ Si on est en lecture, mettre à jour le temps de départ
    if (isPlaying) {
      // Mettre à jour le temps de départ pour que la lecture continue depuis la nouvelle position
      startTimeRef.current = Date.now() - clampedTime * 1000
      
      // Si on a des howls en cours, les mettre à jour
      allHowlsRef.current.forEach(item => {
        if (item.howl && item.howl.playing()) {
          // Calculer la position dans le clip
          const clipStart = item.clip.start
          const clipDuration = clipDurations[item.clip.id] || item.clip.duration || 3
          const seekInClip = Math.max(0, Math.min(clampedTime - clipStart, clipDuration))
          if (seekInClip >= 0 && seekInClip <= clipDuration) {
            try {
              item.howl.seek(seekInClip)
            } catch (e) {
              console.warn('Erreur seek:', e)
            }
          }
        }
      })
    }
    
    // ✅ Si on est en pause, mettre à jour le temps de pause
    if (isPaused) {
      pausedTimeRef.current = clampedTime
    }
  }, [totalDuration, isPlaying, isPaused, clipDurations])

  // ✅ Trouve le clip qui se trouve réellement sous le curseur (currentTime), pas juste "sélectionné"
  // — sélectionner un clip (clic) ne déplace pas le curseur, donc s'appuyer uniquement sur
  // selectedClipId faisait échouer le split dès que le curseur n'était pas, par coïncidence,
  // au même endroit que le clip cliqué.
  const getClipUnderPlayhead = useCallback(() => {
    const project = store.editorProject
    if (!project) return null

    const isUnderPlayhead = (c) => {
      const dur = clipDurations[c.id] || c.duration || 3
      return currentTime > c.start + 0.05 && currentTime < c.start + dur - 0.05
    }

    // Priorité à la piste/clip actuellement sélectionné, s'il est bien sous le curseur
    const selectedTrack = project.tracks.find(t => t.id === selectedTrackId)
    const selectedClip = selectedTrack?.clips.find(c => c.id === selectedClipId)
    if (selectedClip && isUnderPlayhead(selectedClip)) {
      return { trackId: selectedTrackId, clip: selectedClip }
    }

    // Sinon, chercher sur toutes les pistes le clip qui couvre la position du curseur
    for (const track of project.tracks) {
      const found = track.clips.find(isUnderPlayhead)
      if (found) return { trackId: track.id, clip: found }
    }
    return null
  }, [store.editorProject, selectedTrackId, selectedClipId, currentTime, clipDurations])

  // ✅ Couper le clip sous le curseur en deux (raccourci "S")
  const handleSplit = useCallback(async () => {
    const target = getClipUnderPlayhead()
    if (!target) {
      addToast(tr('editorSplitNoClipHere'), 'info')
      return
    }
    const newClip = await store.splitClip(target.trackId, target.clip.id, currentTime, clipDurations[target.clip.id])
    if (newClip) {
      setSelectedTrackId(target.trackId)
      setSelectedClipId(target.clip.id)
      addToast(tr('editorClipSplit'), 'success')
    } else {
      addToast(tr('editorSplitOutOfRange'), 'info')
    }
  }, [getClipUnderPlayhead, currentTime, clipDurations, store, addToast, tr])

  // ✅ Raccourcis clavier de l'éditeur
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.key === ' ') {
        e.preventDefault()
        handlePlay()
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSplit()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId && selectedTrackId) {
          e.preventDefault()
          handleRemoveClip(selectedTrackId, selectedClipId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlay, handleSplit, selectedClipId, selectedTrackId])

  // ─── EXPORT ──────────────────────────────────────────────────────────────────

  const handleExportClick = () => {
    const project = store.editorProject
    if (!project || project.tracks.length === 0 || project.tracks.every(t => t.clips.length === 0)) {
      addToast(tr('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setExportEmoji('🔊')
    setExportProfiles(['all'])
    setShowExportModal(true)
  }

  const handleExportConfirm = async () => {
    if (!exportName.trim()) {
      addToast(tr('editorExportNameRequired'), 'error')
      return
    }

    if (exportAddToLibrary && exportProfiles.length === 0) {
      addToast(tr('editorExportProfileRequired'), 'error')
      return
    }

    setIsExporting(true)
    setShowExportModal(false)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (exportAddToLibrary) {
        const soundData = {
          name: exportName.trim(),
          path: '/path/to/exported/file.mp3',
          image: exportImage || null,
          emoji: exportEmoji,
          profiles: exportProfiles
        }
        await store.addSound(soundData)
        addToast(`"${exportName.trim()}" ${tr('editorExportSuccess')}`, 'success')
      } else {
        addToast(tr('editorExportFileOnlySuccess'), 'success')
      }
    } catch (e) {
      console.error('Export error:', e)
      addToast(tr('editorExportError') + ': ' + e.message, 'error')
    } finally {
      setIsExporting(false)
      setExportName('')
      setExportEmoji('🔊')
      setExportImage(null)
      setExportProfiles(['all'])
      setExportAddToLibrary(true)
    }
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setExportImage(result.path)
        addToast(tr('editorExportImageAdded'), 'success')
      }
    }
  }

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  const selectedClip = selectedClipId 
    ? store.editorProject.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === selectedClipId)
    : null

  const project = store.editorProject

  if (!project || !project.id) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        <span>{tr('editorLoading')}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>
      {/* Barre d'outils */}
      <EditorToolbar
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={handleExportClick}
        onAddTrack={handleAddTrack}
        onAddClip={handleAddClip}
        tracks={project?.tracks || []}
        sounds={store.sounds}
        lang={lang}
        tr={tr}
        isLoading={isLoading}
        isExporting={isExporting}
        onUndo={store.undoEditor}
        onRedo={store.redoEditor}
        canUndo={store.canUndoEditor}
        canRedo={store.canRedoEditor}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(prev => !prev)}
        onSplit={handleSplit}
        canSplit={!!getClipUnderPlayhead()}
        loopEnabled={store.editorLoopRegion.enabled}
        onToggleLoop={() => {
          const loop = store.editorLoopRegion
          if (loop.end <= loop.start) {
            addToast(tr('editorLoopNoRegion'), 'info')
            return
          }
          store.toggleEditorLoop()
        }}
      />

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <EditorTimeline
          tracks={project?.tracks || []}
          selectedClipId={selectedClipId}
          selectedTrackId={selectedTrackId}
          totalDuration={totalDuration}
          onClipSelect={handleClipSelect}
          onClipMove={store.moveClip}
          onClipUpdate={store.updateClip}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={store.duplicateClip}
          onClipFade={(trackId, clipId, edge, duration) => store.setClipFade(trackId, clipId, edge, duration)}
          onTrackRemove={handleRemoveTrack}
          onSeek={handleSeek}
          onTrackMute={(trackId, muted) => store.updateTrack(trackId, { muted })}
          onTrackSolo={(trackId, solo) => store.updateTrack(trackId, { solo })}
          onTrackVolume={(trackId, volume) => store.updateTrack(trackId, { volume })}
          onTrackReorder={store.reorderTracks}
          waveformData={waveformData}
          currentTime={currentTime}
          isPlaying={isPlaying || isPaused}
          clipDurations={clipDurations}
          snapEnabled={snapEnabled}
          loopRegion={store.editorLoopRegion}
          onSetLoopRegion={store.setEditorLoopRegion}
          lang={lang}
          tr={tr}
        />
      </div>

      {/* Panneau d'effets */}
      {selectedClip && (
        <EditorEffectsPanel
          clip={selectedClip}
          trackId={selectedTrackId}
          onEffectAdd={store.addEffectToClip}
          onEffectRemove={store.removeEffectFromClip}
          onEffectUpdate={store.updateEffectParam}
          onEffectToggle={(trackId, clipId, effectId, enabled) => {
            const clip = store.editorProject.tracks
              .flatMap(t => t.clips)
              .find(c => c.id === clipId)
            if (clip) {
              const effects = clip.effects.map(e => 
                e.id === effectId ? { ...e, enabled } : e
              )
              store.updateClip(trackId, clipId, { effects })
            }
          }}
          lang={lang}
          tr={tr}
        />
      )}

      {/* Modal d'export */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-package-export" style={{ color: 'var(--accent)' }} />
              {tr('editorExportTitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('soundName')} *
                </label>
                <input
                  value={exportName}
                  onChange={e => setExportName(e.target.value)}
                  placeholder={tr('editorExportNamePlaceholder')}
                  className="input-lg"
                  style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('image')}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {exportImage && (
                    <img 
                      src={`file:///${exportImage.replace(/\\/g, '/')}`} 
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} 
                      alt="Aperçu"
                    />
                  )}
                  <button 
                    className="btn-secondary btn-sm" 
                    onClick={handlePickImage}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <i className="ti ti-photo" /> {exportImage ? tr('editorImageChange') : tr('editorImageChoose')}
                  </button>
                  {exportImage && (
                    <button 
                      className="btn-ghost btn-sm" 
                      onClick={() => setExportImage(null)}
                      style={{ fontSize: 12, padding: '4px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('editorEmojiLabel')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setExportEmoji(e)}
                      style={{
                        width: 34,
                        height: 34,
                        fontSize: 16,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: `1px solid ${exportEmoji === e ? 'var(--accent)' : 'var(--border)'}`,
                        background: exportEmoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${exportAddToLibrary ? 'var(--accent)' : 'var(--border)'}`,
                background: exportAddToLibrary ? 'var(--accent-light)' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  id="exportAddToLibrary"
                  checked={exportAddToLibrary}
                  onChange={e => setExportAddToLibrary(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <label htmlFor="exportAddToLibrary" style={{ fontSize: 13, cursor: 'pointer', flex: 1 }}>
                  {tr('editorAddToLibrary')}
                </label>
              </div>

              {exportAddToLibrary && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {tr('editorProfilesLabel')} *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {store.profiles.map(p => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          border: `1px solid ${exportProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                          background: exportProfiles.includes(p.id) ? 'var(--accent-light)' : 'transparent',
                          fontSize: 12
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={exportProfiles.includes(p.id)}
                          onChange={() => {
                            setExportProfiles(prev =>
                              prev.includes(p.id)
                                ? prev.filter(id => id !== p.id)
                                : [...prev, p.id]
                            )
                          }}
                          style={{ accentColor: 'var(--accent)', width: 'auto' }}
                        />
                        <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                        {p.id === 'all' ? tr('allSounds') : p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                lineHeight: 1.6
              }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                {tr('editorExportNote')}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-lg"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {tr('cancel')}
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleExportConfirm}
                disabled={isExporting || !exportName.trim() || (exportAddToLibrary && exportProfiles.length === 0)}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {isExporting ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorExporting')}</>
                ) : (
                  <><i className="ti ti-check" /> {tr('editorExport')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-secondary)',
          padding: '20px 30px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 20 }} />
          <span>{tr('editorLoading')}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}