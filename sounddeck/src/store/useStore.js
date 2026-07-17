import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SOUNDS } from './defaultSounds'

// ─── CONFIGURATION PAR DÉFAUT DE LA SIDEBAR ──────────────────────────────

const DEFAULT_SIDEBAR_CONFIG = {
  mode: 'default',
  items: [
    // Navigation principale
    { id: 'home', group: 'navigation', label: 'Mes sons', icon: 'ti-home', visible: true, pinned: false, order: 0, canHide: true },
    { id: 'discover', group: 'navigation', label: 'Découverte', icon: 'ti-compass', visible: true, pinned: false, order: 1, canHide: true },
    { id: 'trimmer', group: 'navigation', label: 'Rogner', icon: 'ti-cut', visible: true, pinned: false, order: 2, canHide: true },
    { id: 'editor', group: 'navigation', label: 'Éditeur', icon: 'ti-wand', visible: true, pinned: false, order: 3, canHide: true },
    { id: 'sequencer', group: 'navigation', label: 'Séquenceur', icon: 'ti-playlist', visible: true, pinned: false, order: 4, canHide: true },
    { id: 'youtube', group: 'navigation', label: 'YouTube', icon: 'ti-brand-youtube', visible: true, pinned: false, order: 5, canHide: true },
    { id: 'stats', group: 'navigation', label: 'Statistiques', icon: 'ti-chart-bar', visible: true, pinned: false, order: 6, canHide: true },
    // Actions
    { id: 'loop', group: 'actions', label: 'Répétition', icon: 'ti-repeat', visible: true, pinned: false, order: 7, canHide: false },
    { id: 'shortcuts', group: 'actions', label: 'Raccourcis', icon: 'ti-keyboard', visible: true, pinned: false, order: 8, canHide: false },
    { id: 'presentation', group: 'actions', label: 'Présentation', icon: 'ti-layout-grid', visible: true, pinned: false, order: 9, canHide: false },
    // Footer
    { id: 'guide', group: 'footer', label: 'Guide Discord', icon: 'ti-book', visible: true, pinned: false, order: 10, canHide: true },
    { id: 'options', group: 'footer', label: 'Options', icon: 'ti-settings', visible: true, pinned: false, order: 11, canHide: true },
  ]
}

export function useStore() {
  const [profiles, setProfiles] = useState([])
  const [currentProfileId, setCurrentProfileId] = useState(null)
  const [sounds, setSounds] = useState([])
  const [shortcuts, setShortcuts] = useState({})
  const [profileShortcut, setProfileShortcut] = useState('CommandOrControl+Tab')
  const [theme, setTheme] = useState('dark')
  const [customTheme, setCustomTheme] = useState(null)
  const [lang, setLang] = useState('fr')
  const [audioDevice, setAudioDevice] = useState('default')
  const [volume, setVolume] = useState(80)
  const [playLocally, setPlayLocally] = useState(true)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [loopShortcut, setLoopShortcut] = useState('')
  const [stopAllShortcut, setStopAllShortcut] = useState('')
  const [presentationShortcut, setPresentationShortcut] = useState('')
  const [loading, setLoading] = useState(true)
  const [previewVolume, setPreviewVolume] = useState(70)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const [toggleShortcutsAccelerator, setToggleShortcutsAccelerator] = useState('CommandOrControl+Shift+K')
  const [toggleWindowShortcut, setToggleWindowShortcut] = useState('CommandOrControl+Shift+S')
  const [soundOrder, setSoundOrder] = useState({})
  const [orderVersion, setOrderVersion] = useState(0)
  const [normalizationEnabled, setNormalizationEnabled] = useState(true)
  const [normalizationTarget, setNormalizationTarget] = useState(0.1)
  const [startMinimized, setStartMinimized] = useState(false)
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [virtualDriverInstalled, setVirtualDriverInstalled] = useState(false)
  const [virtualDeviceActive, setVirtualDeviceActive] = useState(false)
  const [mixerEnabled, setMixerEnabled] = useState(false)
  const [microphoneDevice, setMicrophoneDevice] = useState('default')
  const [microphoneVolume, setMicrophoneVolume] = useState(80)
  const [mixerSoundVolume, setMixerSoundVolume] = useState(100)
  const [localAudioDevice, setLocalAudioDevice] = useState('default')
  const [noiseSuppression, setNoiseSuppression] = useState(false)
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('auto')
  const [keyboardLayout, setKeyboardLayout] = useState('qwerty')
  const [lowLatencyMode, setLowLatencyMode] = useState(false)
  const [compressOnImport, setCompressOnImport] = useState(false)
  const [compressionBitrate, setCompressionBitrate] = useState(128)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)

  // ─── Étape 1 : Taille des cartes ──────────────────────────────────────────
  const [cardSize, setCardSize] = useState('medium')

  // ─── Étape 2 : Tags ──────────────────────────────────────────────────────
  const [tags, setTags] = useState({})

  // ─── Étape 7 : Performance ─────────────────────────────────────────────────
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)
  const [backupInterval, setBackupInterval] = useState(5)
  const [lazyLoadingEnabled, setLazyLoadingEnabled] = useState(true)

  // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────────────
  const [sidebarConfig, setSidebarConfig] = useState(null)
  const [sidebarEditMode, setSidebarEditMode] = useState(false)
  const [sidebarVersion, setSidebarVersion] = useState(0)

  // ─── ÉDITEUR AVANCÉ (PROJET) ──────────────────────────────────────────────
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

  // ─── ZONE DE BOUCLE DE L'ÉDITEUR ──────────────────────────────────────────
  const [editorLoopRegion, setEditorLoopRegionState] = useState({ enabled: false, start: 0, end: 0 })

  const setEditorLoopRegion = useCallback((start, end) => {
    const s = Math.max(0, Math.min(start, end))
    const e = Math.max(s + 0.1, Math.max(start, end))
    setEditorLoopRegionState(prev => ({ ...prev, start: s, end: e }))
  }, [])

  const toggleEditorLoop = useCallback(() => {
    setEditorLoopRegionState(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const clearEditorLoopRegion = useCallback(() => {
    setEditorLoopRegionState({ enabled: false, start: 0, end: 0 })
  }, [])

  // ─── Sauvegarde automatique ───────────────────────────────────────────────────
  const save = useCallback(async (key, value) => {
    await window.electronAPI.storeSet(key, value)
  }, [])

  // ─── CHARGEMENT INITIAL ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      let savedMixerEnabled = false

      try {
        const savedProfiles = await window.electronAPI.storeGet('profiles') || []
        const savedSounds = (await window.electronAPI.storeGet('sounds') || []).map(s => {
          if (s.volumeDb !== undefined) return s
          const oldVolume = s.volume ?? 100
          const newDb = Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
          return { ...s, volume: newDb, volumeDb: newDb }
        })
        const savedShortcuts = await window.electronAPI.storeGet('shortcuts') || {}
        const savedProfileShortcut = await window.electronAPI.storeGet('profileShortcut') || 'CommandOrControl+Tab'
        const savedTheme = await window.electronAPI.storeGet('theme') || 'dark'
        const savedCustomTheme = await window.electronAPI.storeGet('customTheme') || null
        const savedAudioDevice = await window.electronAPI.storeGet('audioDevice') || 'default'
        const savedVolume = await window.electronAPI.storeGet('volume') ?? 80
        const savedPlayLocally = await window.electronAPI.storeGet('playLocally') ?? true
        const savedLoopShortcut = await window.electronAPI.storeGet('loopShortcut') || ''
        const savedStopAllShortcut = await window.electronAPI.storeGet('stopAllShortcut') || ''
        const savedPresentationShortcut = await window.electronAPI.storeGet('presentationShortcut') || ''
        const savedCurrentProfileId = await window.electronAPI.storeGet('currentProfileId')
        const savedPreviewVolume = await window.electronAPI.storeGet('previewVolume') ?? 70
        const savedShortcutsEnabled = await window.electronAPI.storeGet('shortcutsEnabled') ?? true
        const savedToggleShortcutsAccelerator = await window.electronAPI.storeGet('toggleShortcutsAccelerator') || 'CommandOrControl+Shift+K'
        const savedSoundOrder = await window.electronAPI.storeGet('soundOrder') || {}
        const savedNormalizationEnabled = await window.electronAPI.storeGet('normalizationEnabled') ?? true
        const savedNormalizationTarget = await window.electronAPI.storeGet('normalizationTarget') ?? 0.2
        const savedNoiseSuppression = await window.electronAPI.storeGet('noiseSuppression') ?? false
        const savedNoiseSuppressionMode = await window.electronAPI.storeGet('noiseSuppressionMode') || 'auto'

        const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
        const userProfiles = savedProfiles.filter(p => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        const savedStartMinimized = await window.electronAPI.getStartMinimized?.() ?? false
        const savedLaunchAtStartup = await window.electronAPI.getLaunchAtStartup?.() ?? false
        setStartMinimized(savedStartMinimized)
        setLaunchAtStartup(savedLaunchAtStartup)

        const savedAudioMode = await window.electronAPI.storeGet('audioMode') || 'integrated'
        const savedVirtualDriverInstalled = await window.electronAPI.storeGet('virtualDriverInstalled') || false
        const savedVirtualDeviceActive = await window.electronAPI.storeGet('virtualDeviceActive') ?? false
        setVirtualDriverInstalled(savedVirtualDriverInstalled)
        setVirtualDeviceActive(savedVirtualDeviceActive)

        // ✅ STOCKER LA VALEUR DANS LA VARIABLE DÉCLARÉE PLUS HAUT
        savedMixerEnabled = await window.electronAPI.storeGet('mixerEnabled') ?? false
        const savedMicrophoneDevice = await window.electronAPI.storeGet('microphoneDevice') || 'default'
        const savedMicrophoneVolume = await window.electronAPI.storeGet('microphoneVolume') ?? 80
        const savedMixerSoundVolume = await window.electronAPI.storeGet('mixerSoundVolume') ?? 100
        setMixerEnabled(savedMixerEnabled)
        setMicrophoneDevice(savedMicrophoneDevice)
        setMicrophoneVolume(savedMicrophoneVolume)
        setMixerSoundVolume(savedMixerSoundVolume)

        setNoiseSuppression(savedNoiseSuppression)
        setNoiseSuppressionMode(savedNoiseSuppressionMode)

        const savedLocalAudioDevice = await window.electronAPI.storeGet('localAudioDevice') || 'default'
        setLocalAudioDevice(savedLocalAudioDevice)

        const savedLowLatencyMode = await window.electronAPI.storeGet('lowLatencyMode') ?? false
        setLowLatencyMode(savedLowLatencyMode)

        const savedCompressOnImport = await window.electronAPI.storeGet('compressOnImport') ?? false
        const savedCompressionBitrate = await window.electronAPI.storeGet('compressionBitrate') ?? 128
        setCompressOnImport(savedCompressOnImport)
        setCompressionBitrate(savedCompressionBitrate)

        const savedCardSize = await window.electronAPI.storeGet('cardSize') || 'medium'
        setCardSize(savedCardSize)

        const savedTags = await window.electronAPI.storeGet('tags') || {}
        setTags(savedTags)

        const savedAutoBackup = await window.electronAPI.storeGet('autoBackupEnabled') ?? true
        const savedBackupInterval = await window.electronAPI.storeGet('backupInterval') ?? 5
        const savedLazyLoading = await window.electronAPI.storeGet('lazyLoadingEnabled') ?? true
        setAutoBackupEnabled(savedAutoBackup)
        setBackupInterval(savedBackupInterval)
        setLazyLoadingEnabled(savedLazyLoading)

        // ─── LANGUE ────────────────────────────────────────────────────────────
        const savedLang = await window.electronAPI.storeGet('lang')
        let defaultLang = savedLang || 'fr'

        if (!savedLang) {
          try {
            const systemLang = await window.electronAPI.getSystemLanguage?.()
            if (systemLang) {
              defaultLang = systemLang
              console.log(`🌐 Langue système détectée: ${defaultLang}`)
              await window.electronAPI.storeSet('lang', defaultLang)
            }
          } catch (e) {
            console.warn('⚠️ Erreur récupération langue système:', e)
          }
        }
        setLang(defaultLang)

        // ─── LAYOUT CLAVIER ──────────────────────────────────────────────────
        const savedKeyboardLayout = await window.electronAPI.storeGet('keyboardLayout')
        let defaultLayout = savedKeyboardLayout || 'qwerty'

        if (!savedKeyboardLayout) {
          try {
            const systemLayout = await window.electronAPI.getSystemKeyboardLayout?.()
            if (systemLayout) {
              defaultLayout = systemLayout
              console.log(`⌨️ Layout clavier système détecté: ${defaultLayout}`)
              await window.electronAPI.storeSet('keyboardLayout', defaultLayout)
            }
          } catch (e) {
            console.warn('⚠️ Erreur récupération layout clavier:', e)
          }
        }
        setKeyboardLayout(defaultLayout)

        setProfiles(allProfiles)

        // ✅ AJOUT DES SONS PAR DÉFAUT SI AUCUN SON N'EXISTE
        let finalSounds = savedSounds
        if (savedSounds.length === 0) {
          console.log('🔊 Aucun son trouvé, ajout des sons par défaut...')
          
          const defaultSoundsWithPaths = DEFAULT_SOUNDS.map((sound, index) => ({
            id: `default_${sound.id || index}`,
            name: sound.name,
            emoji: sound.emoji,
            path: `default-sounds/${sound.file}`,
            profiles: ['all'],
            favorites: [],
            tags: sound.tags || [],
            volume: 0,
            volumeDb: 0,
            playCount: 0,
            createdAt: Date.now() + index,
            isDefault: true
          }))
          
          finalSounds = defaultSoundsWithPaths
          await save('sounds', finalSounds)
        }
        
        setSounds(finalSounds)
        setShortcuts(savedShortcuts)

        // ═════════Nettoyage des raccourcis orphelins════════════════════════════
        const soundIds = new Set(finalSounds.map(s => s.id))
        const cleanedShortcuts = { ...savedShortcuts }
        let hasChanges = false
        Object.keys(cleanedShortcuts).forEach(id => {
          if (!soundIds.has(id)) {
            delete cleanedShortcuts[id]
            hasChanges = true
          }
        })
        if (hasChanges) {
          setShortcuts(cleanedShortcuts)
          await window.electronAPI.storeSet('shortcuts', cleanedShortcuts)
          await window.electronAPI.updateShortcuts(cleanedShortcuts)
          console.log('✅ Raccourcis orphelins nettoyés au chargement')
        }
        // ═══════════════════════════════════════════════════════════════════════

        setProfileShortcut(savedProfileShortcut)
        setTheme(savedTheme)
        if (savedCustomTheme) setCustomTheme(savedCustomTheme)
        setAudioDevice(savedAudioDevice)
        setVolume(savedVolume)
        setPlayLocally(savedPlayLocally)
        setLoopShortcut(savedLoopShortcut)
        setStopAllShortcut(savedStopAllShortcut)
        setPresentationShortcut(savedPresentationShortcut)
        setCurrentProfileId(savedCurrentProfileId || 'all')
        setPreviewVolume(savedPreviewVolume)
        setShortcutsEnabled(savedShortcutsEnabled)
        setToggleShortcutsAccelerator(savedToggleShortcutsAccelerator)
        setSoundOrder(savedSoundOrder)
        setNormalizationEnabled(savedNormalizationEnabled)
        setNormalizationTarget(savedNormalizationTarget)

        const savedToggleWindowShortcut = await window.electronAPI.storeGet('toggleWindowShortcut') || 'CommandOrControl+Shift+S'
        setToggleWindowShortcut(savedToggleWindowShortcut)

        // ─── CHARGEMENT DU PROJET ÉDITEUR ──────────────────────────────────
        const savedEditorProject = await window.electronAPI.storeGet('editorProject')
        if (savedEditorProject) {
          setEditorProject(savedEditorProject)
        }

        const savedSelectedClipId = await window.electronAPI.storeGet('selectedClipId')
        if (savedSelectedClipId) {
          setSelectedClipId(savedSelectedClipId)
        }

        // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────
        let savedSidebarConfig = await window.electronAPI.storeGet('sidebarConfig')
        
        if (savedSidebarConfig) {
          const existingProfileIds = (savedSidebarConfig.items || [])
            .filter(item => item.id && item.id.startsWith('profile-'))
            .map(item => item.id.replace('profile-', ''))
          
          let items = [...(savedSidebarConfig.items || [])]
          
          allProfiles.forEach(profile => {
            const profileId = `profile-${profile.id}`
            const existingIndex = items.findIndex(item => item.id === profileId)
            
            if (existingIndex === -1) {
              items.push({
                id: profileId,
                group: 'profiles',
                label: profile.name,
                icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
                visible: true,
                pinned: false,
                order: items.length,
                canHide: profile.id !== 'all',
                isProfile: true,
                isDefaultProfile: profile.id === 'all'
              })
            } else {
              items[existingIndex].label = profile.name
            }
          })
          
          const currentProfileIds = new Set(allProfiles.map(p => `profile-${p.id}`))
          items = items.filter(item => {
            if (item.id.startsWith('profile-')) {
              return currentProfileIds.has(item.id)
            }
            return true
          })
          
          savedSidebarConfig = {
            ...savedSidebarConfig,
            items
          }
          
          setSidebarConfig(savedSidebarConfig)
        } else {
          const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]
          
          allProfiles.forEach(profile => {
            defaultItems.push({
              id: `profile-${profile.id}`,
              group: 'profiles',
              label: profile.name,
              icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
              visible: true,
              pinned: false,
              order: defaultItems.length,
              canHide: profile.id !== 'all',
              isProfile: true,
              isDefaultProfile: profile.id === 'all'
            })
          })
          
          const defaultConfig = {
            mode: 'default',
            items: defaultItems,
            sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
          }
          
          setSidebarConfig(defaultConfig)
          await window.electronAPI.storeSet('sidebarConfig', defaultConfig)
        }
        
        setSidebarVersion(prev => prev + 1)

      } catch (e) {
        console.error('Erreur chargement store:', e)
        setProfiles([{ id: 'all', name: 'Tous les sons', isDefault: true }])
        setCurrentProfileId('all')
      } finally {
        // ✅ VÉRIFICATION FINALE: Synchronisation du mixeur
        try {
        const { getMixerFullState, isMixerActive, stopMixer } = await import('../utils/audioMixer')
        const fullState = getMixerFullState()
        const isActive = isMixerActive()
        
        if (!savedMixerEnabled && isActive) {
          await stopMixer()
        } else if (savedMixerEnabled && !isActive) {
          // On va laisser initMixerOnStartup le gérer
        }
      } catch (e) {}

      setLoading(false)
    }
  }
  loadData()
  }, [])

  // ─── HISTORIQUE UNDO/REDO DE L'ÉDITEUR ──────────────────────────────────────
  const editorUndoStack = useRef([])
  const editorRedoStack = useRef([])
  const EDITOR_HISTORY_LIMIT = 50
  const [canUndoEditor, setCanUndoEditor] = useState(false)
  const [canRedoEditor, setCanRedoEditor] = useState(false)

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

  // ─── SYNC PROFILS VERS SIDEBAR ──────────────────────────────────────────────

  const syncProfilesToSidebar = useCallback(async (profileList) => {
    const currentConfig = sidebarConfig || DEFAULT_SIDEBAR_CONFIG
    
    const allProfiles = [{ id: 'all', name: 'Tous les sons', isDefault: true }, ...(profileList || [])]
    
    let newItems = [...(currentConfig.items || [])]
    
    allProfiles.forEach(profile => {
      const profileId = `profile-${profile.id}`
      const existingIndex = newItems.findIndex(item => item.id === profileId)
      
      if (existingIndex === -1) {
        newItems.push({
          id: profileId,
          group: 'profiles',
          label: profile.name,
          icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
          visible: true,
          pinned: false,
          order: newItems.length,
          canHide: profile.id !== 'all',
          isProfile: true,
          isDefaultProfile: profile.id === 'all'
        })
      } else {
        newItems[existingIndex].label = profile.name
      }
    })
    
    const currentProfileIds = new Set(allProfiles.map(p => `profile-${p.id}`))
    newItems = newItems.filter(item => {
      if (item.id.startsWith('profile-')) {
        return currentProfileIds.has(item.id)
      }
      return true
    })
    
    const updatedConfig = {
      ...currentConfig,
      items: newItems
    }
    
    setSidebarConfig(updatedConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', updatedConfig)
    
    return updatedConfig
  }, [sidebarConfig, save])

  // ─── Sauvegarde périphérique audio local ───────────────────────────────────
  const updateLocalAudioDevice = useCallback(async (deviceId) => {
    setLocalAudioDevice(deviceId)
    await save('localAudioDevice', deviceId)
  }, [save])

  // ─── Profils ──────────────────────────────────────────────────────────────────
  const createProfile = useCallback(async (name) => {
    const newProfile = { id: uuidv4(), name, isDefault: false }
    const updated = [...profiles, newProfile]
    setProfiles(updated)
    const userProfiles = updated.filter(p => p.id !== 'all')
    await save('profiles', userProfiles)
    
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
    
    return newProfile
  }, [profiles, save, syncProfilesToSidebar])

  const deleteProfile = useCallback(async (profileId) => {
    if (profileId === 'all') return
    const updated = profiles.filter(p => p.id !== profileId)
    setProfiles(updated)
    const updatedSounds = sounds.map(s => ({
      ...s,
      profiles: s.profiles.filter(pid => pid !== profileId)
    }))
    setSounds(updatedSounds)
    const updatedOrder = { ...soundOrder }
    delete updatedOrder[profileId]
    setSoundOrder(updatedOrder)
    await save('profiles', updated.filter(p => p.id !== 'all'))
    await save('sounds', updatedSounds)
    await save('soundOrder', updatedOrder)
    if (currentProfileId === profileId) setCurrentProfileId('all')
    
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
  }, [profiles, sounds, currentProfileId, save, soundOrder, syncProfilesToSidebar])

  const renameProfile = useCallback(async (profileId, newName) => {
    const updated = profiles.map(p => p.id === profileId ? { ...p, name: newName } : p)
    setProfiles(updated)
    await save('profiles', updated.filter(p => p.id !== 'all'))
    
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
  }, [profiles, save, syncProfilesToSidebar])

  const switchProfile = useCallback(async (profileId) => {
    setCurrentProfileId(profileId)
    await save('currentProfileId', profileId)
  }, [save])

  const switchToNextProfile = useCallback(async () => {
    const idx = profiles.findIndex(p => p.id === currentProfileId)
    const next = profiles[(idx + 1) % profiles.length]
    await switchProfile(next.id)
  }, [profiles, currentProfileId, switchProfile])

  const reorderProfiles = useCallback(async (startIndex, endIndex) => {
    const userProfiles = profiles.filter(p => p.id !== 'all')

    if (startIndex < 0 || startIndex >= userProfiles.length ||
        endIndex < 0 || endIndex >= userProfiles.length) {
      console.warn('Indices invalides pour reorderProfiles:', startIndex, endIndex)
      return false
    }

    const reordered = [...userProfiles]
    const [removed] = reordered.splice(startIndex, 1)
    reordered.splice(endIndex, 0, removed)

    const allProfile = profiles.find(p => p.id === 'all')
    const newProfiles = [allProfile, ...reordered]

    setProfiles(newProfiles)
    await save('profiles', reordered)
    
    await syncProfilesToSidebar(reordered)
    
    return true
  }, [profiles, save, syncProfilesToSidebar])

  // ─── Sons ─────────────────────────────────────────────────────────────────────
  const normalizePath = (p) => p ? p.replace(/\\/g, '/') : p

  const addSound = useCallback(async (soundData) => {
    const newSound = {
      id: uuidv4(),
      name: soundData.name,
      path: normalizePath(soundData.path),
      image: normalizePath(soundData.image) || null,
      emoji: soundData.emoji || '🔊',
      favorites: [],
      profiles: soundData.profiles || ['all'],
      volume: 0,
      volumeDb: 0,
      createdAt: Date.now()
    }
    const updated = [...sounds, newSound]
    setSounds(updated)
    await save('sounds', updated)
    const updatedOrder = { ...soundOrder }
    const targetProfiles = newSound.profiles || ['all']
    targetProfiles.forEach(pid => {
      if (!updatedOrder[pid]) {
        updatedOrder[pid] = []
      }
      if (!updatedOrder[pid].includes(newSound.id)) {
        updatedOrder[pid].push(newSound.id)
      }
    })
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
    return newSound
  }, [sounds, save, soundOrder])

  const deleteSound = useCallback(async (soundId) => {
    const sound = sounds.find(s => s.id === soundId)
    if (sound) {
      await window.electronAPI.deleteSoundFile(sound.path)
    }
    const updated = sounds.filter(s => s.id !== soundId)
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    Object.keys(updatedOrder).forEach(profileId => {
      if (updatedOrder[profileId]) {
        updatedOrder[profileId] = updatedOrder[profileId].filter(id => id !== soundId)
      }
    })
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    const updatedShortcuts = { ...shortcuts }
    delete updatedShortcuts[soundId]
    setShortcuts(updatedShortcuts)
    await save('shortcuts', updatedShortcuts)
    await window.electronAPI.updateShortcuts(updatedShortcuts)
    setOrderVersion(prev => prev + 1)
  }, [sounds, shortcuts, save, soundOrder])

  const updateSound = useCallback(async (soundId, changes) => {
    const updated = sounds.map(s => s.id === soundId ? { ...s, ...changes } : s)
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const incrementPlayCount = useCallback(async (soundId) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, playCount: (s.playCount || 0) + 1, lastPlayed: Date.now() } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const updateSoundVolume = useCallback(async (soundId, volumeDb) => {
    const clampedDb = Math.max(-24, Math.min(24, volumeDb))
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, volume: clampedDb, volumeDb: clampedDb } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const toggleFavorite = useCallback(async (soundId) => {
    const profileId = currentProfileId || 'all'
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      const isFav = s.favorites?.includes(profileId) || false
      return {
        ...s,
        favorites: isFav
          ? s.favorites.filter(id => id !== profileId)
          : [...(s.favorites || []), profileId]
      }
    })
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, currentProfileId, save])

  const addSoundToProfile = useCallback(async (soundId, profileId) => {
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      const profiles = s.profiles.includes(profileId)
        ? s.profiles
        : [...s.profiles, profileId]
      return { ...s, profiles }
    })
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    if (!updatedOrder[profileId]) {
      updatedOrder[profileId] = []
    }
    if (!updatedOrder[profileId].includes(soundId)) {
      updatedOrder[profileId].push(soundId)
    }
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
  }, [sounds, save, soundOrder])

  const removeSoundFromProfile = useCallback(async (soundId, profileId) => {
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      return { ...s, profiles: s.profiles.filter(pid => pid !== profileId) }
    })
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    if (updatedOrder[profileId]) {
      updatedOrder[profileId] = updatedOrder[profileId].filter(id => id !== soundId)
    }
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
  }, [sounds, save, soundOrder])

  const reorderSounds = useCallback(async (startIndex, endIndex) => {
    const profileId = currentProfileId || 'all'
    const currentOrder = soundOrder[profileId] || []

    const profileSounds = profileId === 'all'
      ? sounds
      : sounds.filter(s => s.profiles.includes(profileId))

    let orderedIds = currentOrder.length === profileSounds.length
      ? currentOrder
      : profileSounds.map(s => s.id)

    if (startIndex < 0 || startIndex >= orderedIds.length ||
        endIndex < 0 || endIndex >= orderedIds.length) {
      console.warn('Indices invalides pour reorderSounds:', startIndex, endIndex)
      return false
    }

    const [removed] = orderedIds.splice(startIndex, 1)
    orderedIds.splice(endIndex, 0, removed)

    const updatedOrder = { ...soundOrder, [profileId]: orderedIds }
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
    return true
  }, [sounds, currentProfileId, soundOrder, save])

  // ─── FONCTION MONITORING ──────────────────────────────────────────────────
  const toggleMonitoring = useCallback(async () => {
    const newState = !monitoringEnabled
    setMonitoringEnabled(newState)
    await save('monitoringEnabled', newState)
    
    try {
      const { setMonitoring } = await import('../utils/audioMixer')
      setMonitoring(newState)
      console.log(`🎤 Monitoring ${newState ? 'activé' : 'désactivé'}`)
    } catch (e) {
      console.warn('Erreur mise à jour monitoring:', e)
    }
    
    return newState
  }, [monitoringEnabled, save])

  // ─── Compression audio ──────────────────────────────────────────────────────
  const updateCompressOnImport = useCallback(async (enabled) => {
    setCompressOnImport(enabled)
    await save('compressOnImport', enabled)
  }, [save])

  const updateCompressionBitrate = useCallback(async (bitrate) => {
    setCompressionBitrate(bitrate)
    await save('compressionBitrate', bitrate)
  }, [save])

  // ─── Raccourcis ───────────────────────────────────────────────────────────────
  const setShortcut = useCallback(async (soundId, accelerator) => {
    const updated = { ...shortcuts, [soundId]: accelerator }
    setShortcuts(updated)
    await save('shortcuts', updated)
    await window.electronAPI.updateShortcuts(updated)
  }, [shortcuts, save])

  const clearShortcut = useCallback(async (soundId) => {
    const updated = { ...shortcuts }
    delete updated[soundId]
    setShortcuts(updated)
    await save('shortcuts', updated)
    await window.electronAPI.updateShortcuts(updated)
  }, [shortcuts, save])

  const updateProfileShortcut = useCallback(async (accelerator) => {
    setProfileShortcut(accelerator)
    await save('profileShortcut', accelerator)
    await window.electronAPI.updateProfileShortcut(accelerator)
  }, [save])

  const toggleLoop = useCallback(() => {
    setLoopEnabled(prev => !prev)
  }, [])

  const updatePresentationShortcut = useCallback(async (accelerator) => {
    setPresentationShortcut(accelerator)
    await save('presentationShortcut', accelerator)
    await window.electronAPI.updatePresentationShortcut(accelerator)
  }, [save])

  const updateStopAllShortcut = useCallback(async (accelerator) => {
    setStopAllShortcut(accelerator)
    await save('stopAllShortcut', accelerator)
    await window.electronAPI.updateStopAllShortcut(accelerator)
  }, [save])

  const updateLoopShortcut = useCallback(async (accelerator) => {
    setLoopShortcut(accelerator)
    await save('loopShortcut', accelerator)
    await window.electronAPI.updateLoopShortcut(accelerator)
  }, [save])

  const toggleGlobalShortcuts = useCallback(async () => {
    const newState = await window.electronAPI.toggleGlobalShortcuts()
    setShortcutsEnabled(newState)
    return newState
  }, [])

  const updateToggleShortcutsAccelerator = useCallback(async (accelerator) => {
    setToggleShortcutsAccelerator(accelerator)
    await save('toggleShortcutsAccelerator', accelerator)
    await window.electronAPI.updateToggleShortcutsAccelerator(accelerator)
  }, [save])

  const updateToggleWindowShortcut = useCallback(async (accelerator) => {
    setToggleWindowShortcut(accelerator)
    await save('toggleWindowShortcut', accelerator)
    await window.electronAPI.updateToggleWindowShortcut?.(accelerator)
  }, [save])

  // ─── Nettoyage des raccourcis orphelins ──────────────────────────────────────
  const cleanupOrphanShortcuts = useCallback(async () => {
    const soundIds = new Set(sounds.map(s => s.id))
    const updatedShortcuts = { ...shortcuts }
    let hasChanges = false

    Object.keys(updatedShortcuts).forEach(id => {
      if (!soundIds.has(id)) {
        console.log(`🗑️ Suppression du raccourci orphelin pour l'ID: ${id}`)
        delete updatedShortcuts[id]
        hasChanges = true
      }
    })

    if (hasChanges) {
      setShortcuts(updatedShortcuts)
      await save('shortcuts', updatedShortcuts)
      await window.electronAPI.updateShortcuts(updatedShortcuts)
      console.log('✅ Raccourcis orphelins nettoyés')
    }
    return hasChanges
  }, [sounds, shortcuts, save])

  // ─── Options ──────────────────────────────────────────────────────────────────
  const updateLang = useCallback(async (newLang) => {
    setLang(newLang)
    await save('lang', newLang)
    await window.electronAPI.storeSetLang?.(newLang)
  }, [save])

  const updateTheme = useCallback(async (newTheme) => {
    setTheme(newTheme)
    await save('theme', newTheme)
  }, [save])

  const updateCustomTheme = useCallback(async (colors) => {
    setCustomTheme(colors)
    setTheme('custom')
    await save('customTheme', colors)
    await save('theme', 'custom')
  }, [save])

  const updateAudioDevice = useCallback(async (deviceId) => {
    setAudioDevice(deviceId)
    await save('audioDevice', deviceId)
  }, [save])

  const updateVolume = useCallback(async (val) => {
    setVolume(val)
    await save('volume', val)
  }, [save])

  const updatePlayLocally = useCallback(async (val) => {
    setPlayLocally(val)
    await save('playLocally', val)
  }, [save])

  const updatePreviewVolume = useCallback(async (val) => {
    setPreviewVolume(val)
    await save('previewVolume', val)
  }, [save])

  const updateKeyboardLayout = useCallback(async (layout) => {
    setKeyboardLayout(layout)
    await save('keyboardLayout', layout)
  }, [save])

  // ─── Étape 1 : Mise à jour de la taille des cartes ─────────────────────
  const updateCardSize = useCallback(async (size) => {
    setCardSize(size)
    await save('cardSize', size)
  }, [save])

  // ─── Étape 2 : Gestion des tags ──────────────────────────────────────────
  const addTagToSound = useCallback(async (soundId, tag) => {
    const currentTags = tags[soundId] || []
    if (currentTags.includes(tag)) return
    const updated = { ...tags, [soundId]: [...currentTags, tag] }
    setTags(updated)
    await save('tags', updated)
  }, [tags, save])

  const removeTagFromSound = useCallback(async (soundId, tag) => {
    const currentTags = tags[soundId] || []
    const updated = { ...tags, [soundId]: currentTags.filter(t => t !== tag) }
    if (updated[soundId].length === 0) delete updated[soundId]
    setTags(updated)
    await save('tags', updated)
  }, [tags, save])

  const getSoundTags = useCallback((soundId) => {
    return tags[soundId] || []
  }, [tags])

  // ─── Étape 7 : Performance ──────────────────────────────────────────────
  const updateAutoBackupEnabled = useCallback(async (enabled) => {
    setAutoBackupEnabled(enabled)
    await save('autoBackupEnabled', enabled)
  }, [save])

  const updateBackupInterval = useCallback(async (interval) => {
    setBackupInterval(interval)
    await save('backupInterval', interval)
  }, [save])

  const updateLazyLoadingEnabled = useCallback(async (enabled) => {
    setLazyLoadingEnabled(enabled)
    await save('lazyLoadingEnabled', enabled)
  }, [save])

  // ─── Audio Mode ──────────────────────────────────────────────────────────────
  const updateVirtualDriverInstalled = useCallback(async (installed) => {
    setVirtualDriverInstalled(installed)
    await save('virtualDriverInstalled', installed)
  }, [save])

  const updateVirtualDeviceActive = useCallback(async (active) => {
    setVirtualDeviceActive(active)
    await save('virtualDeviceActive', active)
  }, [save])

  // ─── Normalisation ──────────────────────────────────────────────────────────
  const updateNormalizationEnabled = useCallback(async (enabled) => {
    setNormalizationEnabled(enabled)
    await save('normalizationEnabled', enabled)
  }, [save])

  const updateNormalizationTarget = useCallback(async (target) => {
    setNormalizationTarget(target)
    await save('normalizationTarget', target)
  }, [save])

  const resetGainCache = useCallback(async () => {
    const { gainCache } = await import('../utils/audio')
    Object.keys(gainCache).forEach(key => delete gainCache[key])
    console.log('🧹 Cache des gains vidé')
  }, [])

  // ─── MIXEUR ──────────────────────────────────────────────────────────────────
  const updateMixerEnabled = useCallback(async (enabled) => {
    setMixerEnabled(enabled)
    await save('mixerEnabled', enabled)
    
    if (enabled) {
      try {
        const { initAudioMixer, resumeAudioContext, setStoreRef } = await import('../utils/audioMixer')
        
        setStoreRef({
          playLocally: playLocally,
          monitoringEnabled: monitoringEnabled,
          audioDevice: audioDevice,
          mixerSoundVolume: mixerSoundVolume,
          localAudioDevice: localAudioDevice,
          mixerEnabled: true
        })
        
        const mixedStream = await initAudioMixer(microphoneDevice || 'default', audioDevice || 'default')
        
        if (mixedStream) {
          resumeAudioContext()
          return { success: true, message: 'mixerActivated' }
        } else {
          setMixerEnabled(false)
          await save('mixerEnabled', false)
          return { success: false, message: 'mixerActivationError' }
        }
      } catch (e) {
        console.error('Erreur activation mixeur:', e)
        setMixerEnabled(false)
        await save('mixerEnabled', false)
        return { success: false, message: 'error', error: e.message }
      }
    } else {
      const { stopMixer } = await import('../utils/audioMixer')
      await stopMixer()
      return { success: true, message: 'mixerDeactivated' }
    }
  }, [save, microphoneDevice, audioDevice, playLocally, monitoringEnabled, mixerSoundVolume, localAudioDevice])

  const updateMicrophoneDevice = useCallback(async (deviceId) => {
    setMicrophoneDevice(deviceId)
    await save('microphoneDevice', deviceId)
  }, [save])

  const updateMicrophoneVolume = useCallback(async (volume) => {
    setMicrophoneVolume(volume)
    await save('microphoneVolume', volume)
  }, [save])

  const updateMixerSoundVolume = useCallback(async (volume) => {
    setMixerSoundVolume(volume)
    await save('mixerSoundVolume', volume)
  }, [save])

  const updateLowLatencyMode = useCallback(async (enabled) => {
    setLowLatencyMode(enabled)
    await save('lowLatencyMode', enabled)
  }, [save])

  const updateNoiseSuppression = useCallback(async (enabled) => {
    setNoiseSuppression(enabled)
    await save('noiseSuppression', enabled)
  }, [save])

  const updateNoiseSuppressionMode = useCallback(async (mode) => {
    setNoiseSuppressionMode(mode)
    await save('noiseSuppressionMode', mode)
  }, [save])

  // Dans la fonction initMixerOnStartup - REMPLACER complètement
  const initMixerOnStartup = useCallback(async () => {
    try {
      const { getMixerFullState, isMixerActive, stopMixer, initAudioMixer, resumeAudioContext, connectMixerToOutput, setNoiseSuppressionMode, setStoreRef } = await import('../utils/audioMixer')
      
      setStoreRef({
        playLocally: playLocally,
        monitoringEnabled: monitoringEnabled,
        audioDevice: audioDevice,
        mixerSoundVolume: mixerSoundVolume,
        localAudioDevice: localAudioDevice,
        mixerEnabled: mixerEnabled
      })
      
      const fullState = getMixerFullState()
      const isActive = isMixerActive()
      
      if (!mixerEnabled && isActive) {
        await stopMixer()
        return true
      }
      
      if (mixerEnabled && !isActive) {
        const mixedStream = await initAudioMixer(microphoneDevice || 'default', audioDevice || 'default')
        
        if (mixedStream) {
          resumeAudioContext()
          connectMixerToOutput(audioDevice || 'default')
          
          if (noiseSuppressionMode && noiseSuppressionMode !== 'off') {
            try {
              setNoiseSuppressionMode(noiseSuppressionMode)
            } catch (e) {}
          }
          
          return true
        } else {
          setMixerEnabled(false)
          await save('mixerEnabled', false)
          return false
        }
      }
      
      return true
      
    } catch (e) {
      try {
        const { stopMixer } = await import('../utils/audioMixer')
        await stopMixer()
      } catch (_) {}
      setMixerEnabled(false)
      await save('mixerEnabled', false)
      return false
    }
  }, [mixerEnabled, microphoneDevice, audioDevice, noiseSuppressionMode, save, playLocally, monitoringEnabled, mixerSoundVolume, localAudioDevice])

    const updateMicrophoneDeviceId = useCallback(async (deviceId) => {
      if (deviceId && deviceId !== 'default') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const audioInputs = devices.filter(d => d.kind === 'audioinput')
          const deviceExists = audioInputs.some(d => d.deviceId === deviceId)

          if (!deviceExists) {
            console.warn(`⚠️ Périphérique ${deviceId} non trouvé, utilisation du périphérique par défaut`)
          deviceId = 'default'
        }
      } catch (e) {
        console.warn('⚠️ Erreur lors de l\'énumération des périphériques:', e)
        deviceId = 'default'
      }
    }

    setMicrophoneDevice(deviceId)
    await save('microphoneDevice', deviceId)
  }, [save])

  // ─── Image et Emoji des sons ──────────────────────────────────────────────
  const updateSoundImage = useCallback(async (soundId, imagePath) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, image: normalizePath(imagePath) } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const updateSoundEmoji = useCallback(async (soundId, emoji) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, emoji } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────────────

  const resetSidebarConfig = useCallback(async () => {
    const allProfiles = profiles || []
    const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]
    
    allProfiles.forEach(profile => {
      defaultItems.push({
        id: `profile-${profile.id}`,
        group: 'profiles',
        label: profile.name,
        icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
        visible: true,
        pinned: false,
        order: defaultItems.length,
        canHide: profile.id !== 'all',
        isProfile: true,
        isDefaultProfile: profile.id === 'all'
      })
    })
    
    const defaultConfig = {
      mode: 'default',
      items: defaultItems,
      sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer']
    }
    
    setSidebarConfig(defaultConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', defaultConfig)
  }, [profiles, save])

  const updateSidebarConfig = useCallback(async (newConfig) => {
    setSidebarConfig(newConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', newConfig)
  }, [save])

  const toggleSidebarEditMode = useCallback(() => {
    setSidebarEditMode(prev => !prev)
  }, [])

  // ─── ÉDITEUR AVANCÉ ──────────────────────────────────────────────────────────

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

  const addTrack = useCallback(async () => {
    const newTrack = {
      id: `track-${Date.now()}`,
      name: `Piste ${editorProject.tracks.length + 1}`,
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

  const updateTrack = useCallback(async (trackId, updates) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, ...updates }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const reorderTracks = useCallback(async (startIndex, endIndex) => {
    const tracks = [...editorProject.tracks]
    if (startIndex < 0 || startIndex >= tracks.length || endIndex < 0 || endIndex >= tracks.length) {
      return
    }
    const [moved] = tracks.splice(startIndex, 1)
    tracks.splice(endIndex, 0, moved)
    const updated = {
      ...editorProject,
      tracks,
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const removeTrack = useCallback(async (trackId) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.filter(t => t.id !== trackId),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const addClipToTrack = useCallback(async (trackId, soundId, start = 0, duration = 3) => {
    const sound = sounds.find(s => s.id === soundId)
    if (!sound) {
      console.warn('Son non trouvé:', soundId)
      return null
    }

    const fileExists = await window.electronAPI.fileExists?.(sound.path)
    if (!fileExists && sound.path) {
      console.warn('Fichier son introuvable:', sound.path)
    }

    const newClip = {
      id: `clip-${Date.now()}`,
      soundId: sound.id,
      name: sound.name,
      path: sound.path,
      start: start,
      duration: duration,
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
          return { ...track, clips: [...track.clips, newClip] }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return newClip
  }, [editorProject, sounds, commitEditorProject])

  const addClipFromFile = useCallback(async (trackId, filePath, start = 0) => {
    const fileName = filePath.split(/[\\/]/).pop() || 'audio'
    const newClip = {
      id: `clip-${Date.now()}`,
      soundId: null,
      name: fileName,
      path: filePath,
      start: start,
      duration: 3,
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
          return { ...track, clips: [...track.clips, newClip] }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
    return newClip
  }, [editorProject, commitEditorProject])

  const updateClip = useCallback(async (trackId, clipId, updates, options = {}) => {
    const updated = {
      ...editorProject,
      tracks: editorProject.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return { ...clip, ...updates }
              }
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
          return {
            ...track,
            clips: track.clips.filter(clip => clip.id !== clipId)
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    await commitEditorProject(updated)
  }, [editorProject, commitEditorProject])

  const moveClip = useCallback(async (trackId, clipId, newStart, newTrackId = null, options = {}) => {
    let clipToMove = null
    let sourceTrack = null

    const updatedTracks = editorProject.tracks.map(track => {
      if (track.id === trackId) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          clipToMove = { ...clip }
          sourceTrack = track
          return {
            ...track,
            clips: track.clips.filter(c => c.id !== clipId)
          }
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
    if (!track) return

    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return

    const newClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: clip.start + clip.duration + 0.5
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
  }, [editorProject, commitEditorProject])

  const splitClip = useCallback(async (trackId, clipId, atTime, knownDuration) => {
    const track = editorProject.tracks.find(t => t.id === trackId)
    if (!track) return null

    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null

    const clipDuration = knownDuration || clip.duration || 3
    const splitOffset = atTime - clip.start

    if (splitOffset <= 0.05 || splitOffset >= clipDuration - 0.05) {
      return null
    }

    const firstPart = {
      ...clip,
      duration: splitOffset,
      fadeOut: 0
    }

    const secondPart = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: clip.start + splitOffset,
      duration: clipDuration - splitOffset,
      offset: (clip.offset || 0) + splitOffset,
      fadeIn: 0,
      effects: clip.effects.map(e => ({ ...e, id: `effect-${Date.now()}-${e.id}` }))
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
                return {
                  ...clip,
                  effects: [...clip.effects, effect]
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
                return {
                  ...clip,
                  effects: clip.effects.filter(e => e.id !== effectId)
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
                  effects: clip.effects.map(effect => {
                    if (effect.id === effectId) {
                      return {
                        ...effect,
                        params: { ...effect.params, [param]: value }
                      }
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

  const setClipFade = useCallback(async (trackId, clipId, edge, duration) => {
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'
    const track = editorProject.tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    const existing = clip.effects.find(e => e.type === effectType)
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
                effects: c.effects.map(e => e.id === existing.id
                  ? { ...e, enabled: roundedDuration > 0, params: { ...e.params, duration: roundedDuration } }
                  : e
                )
              }
            }
            if (roundedDuration <= 0) return c
            return {
              ...c,
              effects: [...c.effects, {
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

  const exportProjectToLibrary = useCallback(async (name) => {
    console.log('Export du projet vers la bibliothèque:', name)
  }, [])

  // ─── Sons ordonnés selon le profil ──────────────────────────────────────────
  const orderedSounds = useMemo(() => {
    const profileId = currentProfileId || 'all'
    const profileSounds = profileId === 'all'
      ? sounds
      : sounds.filter(s => s.profiles.includes(profileId))

    const order = soundOrder[profileId] || []

    if (order.length === 0 || order.length !== profileSounds.length) {
      return profileSounds
    }

    const soundMap = {}
    profileSounds.forEach(s => { soundMap[s.id] = s })

    const ordered = order
      .filter(id => soundMap[id])
      .map(id => soundMap[id])

    const missing = profileSounds.filter(s => !order.includes(s.id))
    return [...ordered, ...missing]
  }, [sounds, soundOrder, currentProfileId, orderVersion])

  const favoriteSounds = useMemo(() => {
    return orderedSounds.filter(s => s.favorites?.includes(currentProfileId) || false)
  }, [orderedSounds, currentProfileId])

  return {
    // ─── État ──────────────────────────────────────────────────────────────────
    profiles,
    currentProfileId,
    sounds,
    currentSounds: orderedSounds,
    favoriteSounds,
    shortcuts,
    profileShortcut,
    theme,
    customTheme,
    lang,
    audioDevice,
    volume,
    playLocally,
    loading,
    previewVolume,
    shortcutsEnabled,
    toggleShortcutsAccelerator,
    toggleWindowShortcut,
    soundOrder,
    normalizationEnabled,
    normalizationTarget,
    virtualDriverInstalled,
    virtualDeviceActive,
    mixerEnabled,
    microphoneDevice,
    microphoneVolume,
    mixerSoundVolume,
    localAudioDevice,
    noiseSuppression,
    noiseSuppressionMode,
    keyboardLayout,
    loopEnabled,
    loopShortcut,
    stopAllShortcut,
    presentationShortcut,
    startMinimized,
    launchAtStartup,

    // ─── Étape 1 : Taille des cartes ────────────────────────────────────────
    cardSize,
    updateCardSize,

    // ─── Étape 2 : Tags ─────────────────────────────────────────────────────
    tags,
    addTagToSound,
    removeTagFromSound,
    getSoundTags,

    // ─── Étape 7 : Performance ──────────────────────────────────────────────
    autoBackupEnabled,
    backupInterval,
    lazyLoadingEnabled,
    updateAutoBackupEnabled,
    updateBackupInterval,
    updateLazyLoadingEnabled,

    // ─── Sidebar ──────────────────────────────────────────────────────────────
    sidebarConfig,
    sidebarEditMode,
    sidebarVersion,
    DEFAULT_SIDEBAR_CONFIG,
    resetSidebarConfig,
    updateSidebarConfig,
    toggleSidebarEditMode,
    syncProfilesToSidebar,

    // ─── Profils ──────────────────────────────────────────────────────────────
    createProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
    switchToNextProfile,
    reorderProfiles,

    // ─── Sons ─────────────────────────────────────────────────────────────────
    addSound,
    deleteSound,
    updateSound,
    updateSoundVolume,
    incrementPlayCount,
    toggleFavorite,
    addSoundToProfile,
    removeSoundFromProfile,
    reorderSounds,
    updateSoundImage,
    updateSoundEmoji,
    monitoringEnabled,
    toggleMonitoring,

    // ─── Raccourcis ──────────────────────────────────────────────────────────
    setShortcut,
    clearShortcut,
    updateProfileShortcut,
    toggleLoop,
    updateLoopShortcut,
    updateStopAllShortcut,
    updatePresentationShortcut,
    toggleGlobalShortcuts,
    updateToggleShortcutsAccelerator,
    updateToggleWindowShortcut,
    cleanupOrphanShortcuts,

    // ─── Options ──────────────────────────────────────────────────────────────
    updateLang,
    updateTheme,
    updateCustomTheme,
    updateAudioDevice,
    updateVolume,
    updatePlayLocally,
    updatePreviewVolume,
    updateKeyboardLayout,
    updateVirtualDriverInstalled,
    updateVirtualDeviceActive,

    // ─── Normalisation ────────────────────────────────────────────────────────
    updateNormalizationEnabled,
    updateNormalizationTarget,
    resetGainCache,

    // ─── Mixer ────────────────────────────────────────────────────────────────
    updateMixerEnabled,
    updateMicrophoneDeviceId,
    updateMicrophoneVolume,
    updateMixerSoundVolume,
    updateNoiseSuppression,
    updateNoiseSuppressionMode,
    initMixerOnStartup,

    // ─── Démarrage ────────────────────────────────────────────────────────────
    setStartMinimized: (val) => { setStartMinimized(val); save('startMinimized', val) },
    setLaunchAtStartup: (val) => { setLaunchAtStartup(val); save('launchAtStartup', val) },

    // ─── Périphérique audio local ────────────────────────────────────────────
    updateLocalAudioDevice,

    // ─── Mode basse latence ──────────────────────────────────────────────────
    lowLatencyMode,
    updateLowLatencyMode,

    lazyLoadingEnabled,
    updateLazyLoadingEnabled,

    // Compression audio
    compressOnImport,
    compressionBitrate,
    updateCompressOnImport,
    updateCompressionBitrate,

    // ─── ÉDITEUR AVANCÉ ──────────────────────────────────────────────────────
    editorProject,
    selectedClipId,
    setSelectedClipId,
    createEditorProject,
    addTrack,
    updateTrack,
    reorderTracks,
    removeTrack,
    addClipToTrack,
    addClipFromFile,
    updateClip,
    removeClip,
    moveClip,
    duplicateClip,
    splitClip,
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    setClipFade,
    exportProjectToLibrary,

    // Undo/Redo
    undoEditor,
    redoEditor,
    canUndoEditor,
    canRedoEditor,
    pushEditorHistoryCheckpoint,

    // Zone de boucle
    editorLoopRegion,
    setEditorLoopRegion,
    toggleEditorLoop,
    clearEditorLoopRegion,
  }
}