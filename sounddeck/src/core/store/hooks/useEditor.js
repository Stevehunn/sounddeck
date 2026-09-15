// src/core/store/hooks/useEditor.js
import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { EDITOR_HISTORY_LIMIT } from '../utils/constants'

export function useEditor(save) {
  const [editorProject, setEditorProject] = useState({
    id: null,
    name: 'Nouveau projet',
    tracks: [],
    duration: 60,
    sampleRate: 44100,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })

  const [selectedClipId, setSelectedClipId] = useState(null)
  const [editorLoopRegion, setEditorLoopRegionState] = useState({
    enabled: false,
    start: 0,
    end: 10
  })

  const [canUndoEditor, setCanUndoEditor] = useState(false)
  const [canRedoEditor, setCanRedoEditor] = useState(false)

  const editorUndoStack = useRef([])
  const editorRedoStack = useRef([])

  // ─── GESTION DES PROJETS D'ÉDITION ──────────────────────────────────────────

  const [editorProjects, setEditorProjects] = useState([])
  const [recentEditorProjects, setRecentEditorProjects] = useState([])

  const loadAllEditorProjects = useCallback(async () => {
    try {
      const projects = await window.electronAPI.getAllEditorProjects?.() || []
      setEditorProjects(projects)
      return projects
    } catch (e) {
      console.error('Erreur chargement projets:', e)
      return []
    }
  }, [])

  const loadRecentEditorProjects = useCallback(async () => {
    try {
      const recent = await window.electronAPI.getRecentEditorProjects?.() || []
      setRecentEditorProjects(recent)
      return recent
    } catch (e) {
      console.error('Erreur chargement projets récents:', e)
      return []
    }
  }, [])

  const saveEditorProject = useCallback(async (projectData) => {
    try {
      const result = await window.electronAPI.saveEditorProject?.(projectData)
      if (result?.success) {
        setEditorProject(result.project)
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur sauvegarde projet:', e)
      return null
    }
  }, [loadRecentEditorProjects])

  const loadEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.loadEditorProject?.(projectId)
      if (result?.success) {
        setEditorProject(result.project)
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur chargement projet:', e)
      return null
    }
  }, [loadRecentEditorProjects])

  const deleteEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.deleteEditorProject?.(projectId)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return true
      }
      return false
    } catch (e) {
      console.error('Erreur suppression projet:', e)
      return false
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  const exportEditorProject = useCallback(async (project, filePath) => {
    try {
      const result = await window.electronAPI.exportEditorProject?.(project, filePath)
      return result
    } catch (e) {
      console.error('Erreur export projet:', e)
      return { success: false, error: e.message }
    }
  }, [])

  const importEditorProject = useCallback(async (filePath) => {
    try {
      const result = await window.electronAPI.importEditorProject?.(filePath)
      if (result?.success) {
        setEditorProject(result.project)
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur import projet:', e)
      return null
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  const renameEditorProject = useCallback(async (projectId, newName) => {
    try {
      const result = await window.electronAPI.renameEditorProject?.(projectId, newName)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        if (editorProject?.id === projectId) {
          setEditorProject(result.project)
        }
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur renommage projet:', e)
      return null
    }
  }, [editorProject, loadAllEditorProjects, loadRecentEditorProjects])

  const duplicateEditorProject = useCallback(async (projectId) => {
    try {
      const result = await window.electronAPI.duplicateEditorProject?.(projectId)
      if (result?.success) {
        await loadAllEditorProjects()
        await loadRecentEditorProjects()
        return result.project
      }
      return null
    } catch (e) {
      console.error('Erreur duplication projet:', e)
      return null
    }
  }, [loadAllEditorProjects, loadRecentEditorProjects])

  // ─── FONCTIONS EXISTANTES ──────────────────────────────────────────────────

  const setEditorLoopRegion = useCallback((start, end) => {
    const s = Math.max(0, Math.min(start, end))
    const e = Math.max(s + 0.1, Math.max(start, end))
    setEditorLoopRegionState(prev => ({ ...prev, start: s, end: e }))
  }, [])

  const toggleEditorLoop = useCallback(() => {
    setEditorLoopRegionState(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const clearEditorLoopRegion = useCallback(() => {
    setEditorLoopRegionState({ enabled: false, start: 0, end: 10 })
  }, [])

  const commitEditorProject = useCallback(async (updated, { skipHistory = false } = {}) => {
    if (!skipHistory) {
      editorUndoStack.current.push(editorProject)
      if (editorUndoStack.current.length > EDITOR_HISTORY_LIMIT) {
        editorUndoStack.current.shift()
      }
      editorRedoStack.current = []
      setCanUndoEditor(true)
      setCanRedoEditor(false)
    }
    setEditorProject(updated)
    await save('editorProject', updated)
  }, [editorProject, save])

  const pushEditorHistoryCheckpoint = useCallback(() => {
    editorUndoStack.current.push(editorProject)
    if (editorUndoStack.current.length > EDITOR_HISTORY_LIMIT) {
      editorUndoStack.current.shift()
    }
    editorRedoStack.current = []
    setCanUndoEditor(true)
    setCanRedoEditor(false)
  }, [editorProject])

  const undoEditor = useCallback(async () => {
    const previous = editorUndoStack.current.pop()
    if (!previous) return
    editorRedoStack.current.push(editorProject)
    setCanUndoEditor(editorUndoStack.current.length > 0)
    setCanRedoEditor(true)
    setEditorProject(previous)
    await save('editorProject', previous)
  }, [editorProject, save])

  const redoEditor = useCallback(async () => {
    const next = editorRedoStack.current.pop()
    if (!next) return
    editorUndoStack.current.push(editorProject)
    setCanRedoEditor(editorRedoStack.current.length > 0)
    setCanUndoEditor(true)
    setEditorProject(next)
    await save('editorProject', next)
  }, [editorProject, save])

  const createEditorProject = useCallback(async (name = 'Nouveau projet') => {
    const project = {
      id: uuidv4(),
      name,
      tracks: [],
      duration: 60,
      sampleRate: 44100,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setEditorProject(project)
    await save('editorProject', project)
    return project
  }, [save])

  const updateEditorProject = useCallback(async (project) => {
    setEditorProject(project)
    await save('editorProject', project)
    return project
  }, [save])

  const updateEditorProjectName = useCallback(async (newName) => {
    if (!newName.trim()) return false
    const updated = {
      ...editorProject,
      name: newName.trim(),
      updatedAt: Date.now()
    }
    setEditorProject(updated)
    await save('editorProject', updated)
    return true
  }, [editorProject, save])

  const saveEditorMarkers = useCallback(async (markers) => {
    const updated = {
      ...editorProject,
      markers: markers || [],
      updatedAt: Date.now()
    }
    setEditorProject(updated)
    await save('editorProject', updated)
  }, [editorProject, save])

  const getAudioDuration = useCallback(async (filePath) => {
    try {
      const fileUrl = filePath.startsWith('file://')
        ? filePath
        : 'file:///' + filePath.replace(/\\/g, '/')

      const response = await fetch(fileUrl)
      if (!response.ok) return 3

      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      await audioContext.close()
      return duration
    } catch (e) {
      return 3
    }
  }, [])

  const updateClipDurationInEditor = useCallback(async (clipId, duration) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clip-duration-updated', {
        detail: { clipId, duration }
      }))
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, duration } : clip
        )
      })),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated, { skipHistory: true })
  }, [editorProject, commitEditorProject])

  const fixAllClipDurations = useCallback(async () => {
    if (!editorProject?.tracks) return 0

    let fixedCount = 0
    let newTracks = [...editorProject.tracks]

    for (const track of newTracks) {
      for (const clip of track.clips) {
        if (clip.path) {
          try {
            const realDuration = await getAudioDuration(clip.path)
            const currentDuration = clip.duration || 3
            if (Math.abs(realDuration - currentDuration) > 0.1) {
              clip.duration = realDuration
              fixedCount++
            }
          } catch (e) {}
        }
      }
    }

    if (fixedCount > 0) {
      const updated = {
        ...editorProject,
        tracks: newTracks,
        updatedAt: Date.now()
      }
      setEditorProject(updated)
      await save('editorProject', updated)
    }
    return fixedCount
  }, [editorProject, getAudioDuration, save])

  // ─── PISTES ──────────────────────────────────────────────────────────────

  const addTrack = useCallback(async (name = null, color = null) => {
    const trackIndex = editorProject.tracks.length + 1
    const trackName = name || `Piste ${trackIndex}`
    const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`

    const newTrack = {
      id: `track-${Date.now()}`,
      name: trackName,
      color: trackColor,
      displayIndex: trackIndex,
      clips: [],
      volume: 1,
      muted: false,
      solo: false,
      effects: []
    }
    const updated = {
      ...editorProject,
      tracks: [...editorProject.tracks, newTrack],
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return newTrack
  }, [editorProject, commitEditorProject])

  const removeTrack = useCallback(async (trackId) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.filter(t => t.id !== trackId),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const renameTrack = useCallback(async (trackId, newName) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) return { ...track, name: newName }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const updateTrack = useCallback(async (trackId, updates) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) return { ...track, ...updates }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const updateTrackColor = useCallback(async (trackId, color) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) return { ...track, color }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const reorderTracks = useCallback(async (startIndex, endIndex) => {
    const tracks = [...editorProject.tracks]
    if (startIndex < 0 || startIndex >= tracks.length || endIndex < 0 || endIndex >= tracks.length) return
    const [moved] = tracks.splice(startIndex, 1)
    tracks.splice(endIndex, 0, moved)
    const updated = {
      ...editorProject,
      tracks,
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  // ─── CLIPS ──────────────────────────────────────────────────────────────

  const addClipToTrack = useCallback(async (trackId, soundId, start = null, sounds = []) => {
    const sound = sounds.find(s => s.id === soundId)
    if (!sound) return null

    const actualDuration = await getAudioDuration(sound.path)
    let actualStart = start
    const track = editorProject.tracks.find(t => t.id === trackId)

    if (track && (actualStart === null || actualStart === undefined)) {
      if (track.clips.length > 0) {
        const lastClip = track.clips.reduce((max, clip) => {
          const clipEnd = clip.start + (clip.duration || 3)
          return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
        }, { start: 0, end: 0 })
        actualStart = lastClip.end + 0.5
      } else {
        actualStart = 0
      }
    } else if (actualStart === null || actualStart === undefined) {
      actualStart = 0
    }

    const newClip = {
      id: `clip-${Date.now()}`,
      soundId: sound.id,
      name: sound.name,
      path: sound.path,
      start: actualStart,
      duration: actualDuration,
      offset: 0,
      volume: 0,
      volumeDb: 0,
      effects: [],
      fadeIn: 0,
      fadeOut: 0,
      pitch: 0,
      speed: 1
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          const clips = [...track.clips, newClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clip-duration-updated', {
        detail: { clipId: newClip.id, duration: actualDuration }
      }))
    }
    return newClip
  }, [editorProject, commitEditorProject, getAudioDuration])

  const addClipFromFile = useCallback(async (trackId, filePath, start = null) => {
    const fileName = filePath.split(/[\\/]/).pop() || 'audio'
    const actualDuration = await getAudioDuration(filePath)
    let actualStart = start
    const track = editorProject.tracks.find(t => t.id === trackId)

    if (track && (actualStart === null || actualStart === undefined)) {
      if (track.clips.length > 0) {
        const lastClip = track.clips.reduce((max, clip) => {
          const clipEnd = clip.start + (clip.duration || 3)
          return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
        }, { start: 0, end: 0 })
        actualStart = lastClip.end + 0.5
      } else {
        actualStart = 0
      }
    } else if (actualStart === null || actualStart === undefined) {
      actualStart = 0
    }

    const newClip = {
      id: `clip-${Date.now()}`,
      soundId: null,
      name: fileName,
      path: filePath,
      start: actualStart,
      duration: actualDuration,
      offset: 0,
      volume: 0,
      volumeDb: 0,
      effects: [],
      fadeIn: 0,
      fadeOut: 0,
      pitch: 0,
      speed: 1,
      isExternal: true
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          const clips = [...track.clips, newClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clip-duration-updated', {
        detail: { clipId: newClip.id, duration: actualDuration }
      }))
    }
    return newClip
  }, [editorProject, commitEditorProject, getAudioDuration])

  const updateClip = useCallback(async (trackId, clipId, updates, options = {}) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) return { ...clip, ...updates }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated, options)
  }, [editorProject, commitEditorProject])

  const removeClip = useCallback(async (trackId, clipId) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, clips: track.clips.filter(clip => clip.id !== clipId) }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const moveClip = useCallback(async (trackId, clipId, newStart, newTrackId = null, options = {}) => {
    let clipToMove = null
    const updatedTracks = editorProject.tracks.map(track => {
      if (track.id === trackId) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          clipToMove = { ...clip }
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        }
      }
      return track
    })

    if (!clipToMove) return
    clipToMove.start = newStart

    const targetTrackId = newTrackId || trackId
    const finalTracks = updatedTracks.map(track => {
      if (track.id === targetTrackId) {
        const clips = [...track.clips, clipToMove]
        clips.sort((a, b) => a.start - b.start)
        return { ...track, clips }
      }
      return track
    })

    const updated = {
      ...editorProject,
      tracks: finalTracks,
      updatedAt: Date.now()
    }
    await commitEditorProject(updated, options)
  }, [editorProject, commitEditorProject])

  const duplicateClip = useCallback(async (trackId, clipId) => {
    const track = editorProject.tracks.find(t => t.id === trackId)
    if (!track) return null
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null

    const newClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: clip.start + clip.duration + 0.5,
      effects: (clip.effects || []).map(e => ({ ...e, id: `effect-${Date.now()}-${e.id || Math.random().toString(36).slice(2, 6)}` }))
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(t => {
        if (t.id === trackId) {
          const clips = [...t.clips, newClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...t, clips }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return newClip
  }, [editorProject, commitEditorProject])

  const splitClip = useCallback(async (trackId, clipId, atTime, knownDuration) => {
    const track = editorProject.tracks.find(t => t.id === trackId)
    if (!track) return null
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null

    const clipDuration = knownDuration || clip.duration || 3
    const splitOffset = atTime - clip.start

    if (splitOffset <= 0.05 || splitOffset >= clipDuration - 0.05) return null

    const firstPart = { ...clip, duration: splitOffset, fadeOut: 0 }
    const secondPart = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: clip.start + splitOffset,
      duration: clipDuration - splitOffset,
      offset: (clip.offset || 0) + splitOffset,
      fadeIn: 0,
      effects: (clip.effects || []).map(e => ({ ...e, id: `effect-${Date.now()}-${e.id || Math.random().toString(36).slice(2, 6)}` }))
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(t => {
        if (t.id === trackId) {
          const clips = t.clips.map(c => c.id === clipId ? firstPart : c)
          clips.push(secondPart)
          clips.sort((a, b) => a.start - b.start)
          return { ...t, clips }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return secondPart
  }, [editorProject, commitEditorProject])

  // ─── EFFETS ─────────────────────────────────────────────────────────────

  const addEffectToClip = useCallback(async (trackId, clipId, effectType, params = {}) => {
    const effect = {
      id: `effect-${Date.now()}`,
      type: effectType,
      params: params,
      enabled: true
    }

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return { ...clip, effects: [...(clip.effects || []), effect] }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return effect
  }, [editorProject, commitEditorProject])

  const removeEffectFromClip = useCallback(async (trackId, clipId, effectId) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return { ...clip, effects: (clip.effects || []).filter(e => e.id !== effectId) }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const updateEffectParam = useCallback(async (trackId, clipId, effectId, param, value) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) {
                      return { ...effect, params: { ...effect.params, [param]: value } }
                    }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const toggleEffect = useCallback(async (trackId, clipId, effectId, enabled) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) return { ...effect, enabled }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const setClipFade = useCallback(async (trackId, clipId, edge, duration) => {
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'
    const track = editorProject.tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    const existing = (clip.effects || []).find(e => e.type === effectType)
    const roundedDuration = Math.round(duration * 100) / 100

    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(t => {
        if (t.id !== trackId) return t
        return {
          ...t,
          clips: t.clips.map(c => {
            if (c.id !== clipId) return c
            if (existing) {
              return {
                ...c,
                effects: (c.effects || []).map(e => e.id === existing.id
                  ? { ...e, enabled: roundedDuration > 0, params: { ...e.params, duration: roundedDuration } }
                  : e
                )
              }
            }
            if (roundedDuration <= 0) return c
            return {
              ...c,
              effects: [...(c.effects || []), {
                id: `effect-${Date.now()}`,
                type: effectType,
                params: { duration: roundedDuration },
                enabled: true
              }]
            }
          })
        }
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const updateClipWithPath = useCallback(async (clipId, newPath) => {
    let updated = false
    const newTracks = editorProject.tracks.map(track => {
      const clips = track.clips.map(clip => {
        if (clip.id === clipId) {
          updated = true
          return { ...clip, path: newPath.replace(/\\/g, '/') }
        }
        return clip
      })
      return { ...track, clips }
    })

    if (updated) {
      const updatedProject = {
        ...editorProject,
        tracks: newTracks,
        updatedAt: Date.now()
      }
      setEditorProject(updatedProject)
      await save('editorProject', updatedProject)
      return true
    }
    return false
  }, [editorProject, save])

  // ─── RETOUR ──────────────────────────────────────────────────────────────────

  return {
    // Projet actuel
    editorProject,
    setEditorProject,
    selectedClipId,
    setSelectedClipId,
    editorLoopRegion,
    setEditorLoopRegion,
    toggleEditorLoop,
    clearEditorLoopRegion,
    canUndoEditor,
    canRedoEditor,
    commitEditorProject,
    pushEditorHistoryCheckpoint,
    undoEditor,
    redoEditor,
    createEditorProject,
    updateEditorProject,
    updateEditorProjectName,
    saveEditorMarkers,
    getAudioDuration,
    updateClipDurationInEditor,
    fixAllClipDurations,

    // ─── GESTION DES PROJETS ──────────────────────────────────────────────
    editorProjects,
    recentEditorProjects,
    loadAllEditorProjects,
    loadRecentEditorProjects,
    saveEditorProject,
    loadEditorProject,
    deleteEditorProject,
    exportEditorProject,
    importEditorProject,
    renameEditorProject,
    duplicateEditorProject,

    // ─── PISTES ──────────────────────────────────────────────────────────
    addTrack,
    removeTrack,
    renameTrack,
    updateTrack,
    updateTrackColor,
    reorderTracks,

    // ─── CLIPS ────────────────────────────────────────────────────────────
    addClipToTrack,
    addClipFromFile,
    updateClip,
    removeClip,
    moveClip,
    duplicateClip,
    splitClip,

    // ─── EFFETS ──────────────────────────────────────────────────────────
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
    updateClipWithPath,
  }
}