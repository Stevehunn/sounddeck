// src/plugins/youtube/YouTube.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useNetwork } from '@shared/contexts'
import {
  detectPlatform,
  getSpotifyTrack,
  getSoundCloudTrack,
  sanitizeFilename,
} from '@shared/utils/platformImport'
import { Howl } from 'howler'
import useConfirm from '@shared/hooks/useConfirm'
import LoadingOverlay from '@shared/components/ui/LoadingOverlay'

import {
  mockFetchVideoInfo,
  mockDownloadAudio,
  mockSaveSound,
  isYoutubeTutorialActive,
  getTutorialState,
  getMockVideoInfo,
  setTutorialStep,
} from './tutorialSteps'

import UrlStep from './components/UrlStep'
import TrimStep from './components/TrimStep'
import SaveStep from './components/SaveStep'
import { CheckingView, MissingYtdlpView } from './components/StatusViews'
import DownloadProgressModal from './components/DownloadProgressModal'

// État partagé entre instances, regroupé dans un objet unique
const youtubeModuleState = {
  ytdlpStatus: null,
  checkDone: false,
  checkPromise: null,
  checkStarted: false,
  videoInfo: null,
  step: 'url',
  soundName: '',
  end: 0,
  downloadedPath: null,
  platform: null,
}

export default function YouTube({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const { showNoConnection, ensureOnline } = useNetwork()

  // ─── ÉTATS ──────────────────────────────────────────────────────────────
  const [ytdlpStatus, setYtdlpStatus] = useState(() =>
    youtubeModuleState.checkDone ? youtubeModuleState.ytdlpStatus ?? 'missing' : 'checking'
  )
  const [forceRender, setForceRender] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState(youtubeModuleState.videoInfo)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(youtubeModuleState.end)
  const [soundName, setSoundName] = useState(youtubeModuleState.soundName)
  const [targetProfiles, setTargetProfiles] = useState([])
  const [emoji, setEmoji] = useState('🎵')
  const [step, setStep] = useState(youtubeModuleState.step)
  const [downloadedPath, setDownloadedPath] = useState(youtubeModuleState.downloadedPath)
  const [importing, setImporting] = useState(false)
  const [platform, setPlatform] = useState(youtubeModuleState.platform)
  const [customImage, setCustomImage] = useState(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewHowl, setPreviewHowl] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [toastShown, setToastShown] = useState(false)
  const [useThumbnail, setUseThumbnail] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // ─── REFS ──────────────────────────────────────────────────────────────
  const isMounted = useRef(true)
  const fetchingRef = useRef(false)
  const initDone = useRef(false)
  const progressIntervalRef = useRef(null)
  const savingRef = useRef(false)
  const hasCompletedSave = useRef(false)
  const resetTimerRef = useRef(null)
  const isProcessingRef = useRef(false)
  const forceUpdateListenersRef = useRef([])

  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])

  const isTutorialMode = useCallback(() => isYoutubeTutorialActive(), [])

  const effectiveStatus = youtubeModuleState.checkDone
    ? youtubeModuleState.ytdlpStatus ?? 'missing'
    : ytdlpStatus

  const getFinalImage = useCallback(() => {
    if (useThumbnail && videoInfo?.thumbnail) return videoInfo.thumbnail
    return customImage || null
  }, [useThumbnail, videoInfo, customImage])

  // ─── SURVEILLANCE DU CHANGEMENT DE STEP ────────────────────────────────
  useEffect(() => {
    if (step === 'save' && showProgress && !toastShown) {
      setShowProgress(false)
      setIsProcessing(false)
      setToastShown(true)
      addToast(tRef.current('ytAudioReady'), 'success')
    }
  }, [step, showProgress, toastShown, addToast])

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Auto-sélection des profils à l'étape save
  useEffect(() => {
    if (step !== 'save') return
    if (targetProfiles.length > 0) return

    const userProfiles = store.profiles.filter((p) => p.id !== 'all')

    if (userProfiles.length === 0) {
      setTargetProfiles(['all'])
      return
    }

    if (isTutorialMode()) {
      setTargetProfiles(userProfiles.map((p) => p.id))
      return
    }

    const currentId = store.currentProfileId
    if (currentId && currentId !== 'all' && userProfiles.some((p) => p.id === currentId)) {
      setTargetProfiles([currentId])
    } else {
      setTargetProfiles([userProfiles[0].id])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, store.profiles.length, store.currentProfileId])

  // Reset sur événement global
  useEffect(() => {
    const handleForceReset = () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }

      setUrl('')
      setVideoInfo(null)
      setDownloadedPath(null)
      setStep('url')
      setSoundName('')
      setStart(0)
      setEnd(0)
      setTargetProfiles([])
      setPlatform(null)
      setCustomImage(null)
      setUseThumbnail(false)
      setShowProgress(false)
      setIsProcessing(false)
      setImporting(false)
      setDownloadProgress(0)
      setDownloadStatus('')
      setToastShown(false)
      setLoadingInfo(false)
      setResetKey((prev) => prev + 1)

      youtubeModuleState.step = 'url'
      youtubeModuleState.videoInfo = null
      youtubeModuleState.soundName = ''
      youtubeModuleState.end = 0
      youtubeModuleState.downloadedPath = null
      youtubeModuleState.platform = null

      hasCompletedSave.current = false
      savingRef.current = false
      isProcessingRef.current = false
      fetchingRef.current = false
    }

    window.addEventListener('youtube-force-reset', handleForceReset)
    return () => window.removeEventListener('youtube-force-reset', handleForceReset)
  }, [])

  // ─── VÉRIFICATION DE yt-dlp ───────────────────────────────────────────
  const checkYtdlp = useCallback(async () => {
    if (isTutorialMode()) {
      youtubeModuleState.ytdlpStatus = 'available'
      youtubeModuleState.checkDone = true
      setYtdlpStatus('available')
      return 'available'
    }

    if (youtubeModuleState.checkDone) {
      if (ytdlpStatus !== youtubeModuleState.ytdlpStatus) {
        setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
      }
      return youtubeModuleState.ytdlpStatus
    }

    if (youtubeModuleState.checkPromise) {
      try {
        await youtubeModuleState.checkPromise
        if (ytdlpStatus !== youtubeModuleState.ytdlpStatus) {
          setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
        }
        return youtubeModuleState.ytdlpStatus
      } catch (error) {
        console.error('❌ [YouTube] Erreur dans la promesse existante:', error)
        setYtdlpStatus('missing')
        return 'missing'
      }
    }

    youtubeModuleState.checkPromise = (async () => {
      try {
        const result = await window.electronAPI.checkYtdlp()
        youtubeModuleState.ytdlpStatus = result?.available ? 'available' : 'missing'
        youtubeModuleState.checkDone = true
        setYtdlpStatus(youtubeModuleState.ytdlpStatus)
        forceUpdateListenersRef.current.forEach((listener) => {
          try { listener() } catch (e) {}
        })
        return youtubeModuleState.ytdlpStatus
      } catch (error) {
        console.error('❌ [YouTube] Erreur checkYtdlp:', error)
        youtubeModuleState.ytdlpStatus = 'missing'
        youtubeModuleState.checkDone = true
        setYtdlpStatus('missing')
        throw error
      } finally {
        youtubeModuleState.checkPromise = null
      }
    })()

    try {
      await youtubeModuleState.checkPromise
      return youtubeModuleState.ytdlpStatus
    } catch (error) {
      return 'missing'
    }
  }, [ytdlpStatus, isTutorialMode])

  // ─── INITIALISATION ───────────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    hasCompletedSave.current = false

    const listener = () => {
      setForceRender((prev) => prev + 1)
      if (youtubeModuleState.checkDone) {
        setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
      }
    }
    forceUpdateListenersRef.current.push(listener)

    if (isTutorialMode()) {
      const mockInfo = getMockVideoInfo()
      const tutorialState = getTutorialState()

      if (mockInfo) {
        setVideoInfo(mockInfo)
        setSoundName(mockInfo.title || '')
        setEnd(mockInfo.duration || 0)
        setStep(tutorialState.step || 'url')
      }

      setTimeout(() => setForceRender((prev) => prev + 1), 100)
    }

    if (youtubeModuleState.videoInfo && !isTutorialMode()) {
      setVideoInfo(youtubeModuleState.videoInfo)
      setSoundName(youtubeModuleState.soundName)
      setEnd(youtubeModuleState.end)
      setStep(youtubeModuleState.step)
      setPlatform(youtubeModuleState.platform)
    }
    if (youtubeModuleState.downloadedPath && !isTutorialMode()) {
      setDownloadedPath(youtubeModuleState.downloadedPath)
      setStep(youtubeModuleState.step)
    }

    if (youtubeModuleState.checkDone) {
      setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
    } else if (!youtubeModuleState.checkStarted && !isTutorialMode()) {
      youtubeModuleState.checkStarted = true
      checkYtdlp()
    } else if (isTutorialMode()) {
      youtubeModuleState.ytdlpStatus = 'available'
      youtubeModuleState.checkDone = true
      setYtdlpStatus('available')
    }

    return () => {
      const list = forceUpdateListenersRef.current
      const index = list.indexOf(listener)
      if (index > -1) list.splice(index, 1)

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }
  }, [checkYtdlp, isTutorialMode])

  // Nettoyage preview
  useEffect(() => {
    return () => {
      if (previewHowl) {
        previewHowl.stop()
        previewHowl.unload()
      }
    }
  }, [previewHowl])

  // ─── SIMULATION DE PROGRESSION ────────────────────────────────────────
  const startProgressSimulation = useCallback(() => {
    setShowProgress(true)
    setDownloadProgress(0)
    setDownloadStatus(t('ytAudioDownloading'))

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

    let progress = 0
    progressIntervalRef.current = setInterval(() => {
      if (progress < 30) progress += 5 + Math.random() * 3
      else if (progress < 60) progress += 3 + Math.random() * 2
      else if (progress < 85) progress += 1 + Math.random() * 1.5
      else if (progress < 95) progress += 0.5 + Math.random() * 0.5
      else progress = 95

      if (progress > 95) progress = 95
      setDownloadProgress(Math.min(95, progress))

      if (progress < 30) setDownloadStatus(t('ytAudioDownloading'))
      else if (progress < 60) setDownloadStatus(t('extractingAudio'))
      else if (progress < 85) setDownloadStatus(t('convertingToMp3'))
      else setDownloadStatus(t('finalizing'))
    }, 300)
  }, [t])

  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // ─── INSTALLATION YT-DLP ──────────────────────────────────────────────
  const handleInstallYtdlp = async () => {
    setDownloading(true)
    addToast(t('ytdlpDownloading'), 'info')

    try {
      const result = await window.electronAPI.downloadYtdlp()
      setDownloading(false)
      if (result?.success) {
        youtubeModuleState.ytdlpStatus = 'available'
        youtubeModuleState.checkDone = true
        setYtdlpStatus('available')
        addToast(t('ytdlpInstalled'), 'success')
      } else {
        if (result?.isNetworkError) {
          const online = await ensureOnline()
          if (!online) return
        }
        addToast(
          t('ytdlpInstallError', { detail: result?.error || t('unknownError') }),
          'error'
        )
      }
    } catch (error) {
      setDownloading(false)
      if (error?.isNetworkError) {
        const online = await ensureOnline()
        if (!online) return
      }
      addToast(t('ytdlpInstallError', { detail: error.message }), 'error')
    }
  }

  // ─── RÉCUPÉRATION DES INFOS ───────────────────────────────────────────
  const handleFetchInfo = useCallback(async () => {
    if (fetchingRef.current) return

    if (!url?.trim() && !isTutorialMode()) {
      addToast(t('pasteUrl'), 'warning')
      return
    }

    fetchingRef.current = true
    setLoadingInfo(true)
    setVideoInfo(null)
    setIsProcessing(true)
    setUseThumbnail(false)
    setCustomImage(null)

    try {
      let result

      if (isTutorialMode()) {
        result = await mockFetchVideoInfo()
        setTutorialStep('trim')
      } else {
        const detected = detectPlatform(url.trim())
        setPlatform(detected)
        youtubeModuleState.platform = detected

        if (detected === 'spotify') {
          result = await getSpotifyTrack(url.trim())
        } else if (detected === 'soundcloud') {
          result = await getSoundCloudTrack(url.trim())
        } else {
          result = await window.electronAPI.youtubeInfo(url.trim())
        }
      }

      if (!result?.success && result?.isNetworkError) {
        const online = await ensureOnline()
        setLoadingInfo(false)
        fetchingRef.current = false
        setIsProcessing(false)
        if (!online) return
        addToast(t('ytFetchError', { detail: result?.error || t('unknownError') }), 'error')
        return
      }

      if (result?.success) {
        const data = result.data || result
        const info = {
          title: data.title || t('unknownTitle'),
          duration: data.duration || 0,
          thumbnail: data.thumbnail || data.cover || null,
          uploader: data.uploader || data.artist || t('unknownArtist'),
          url: isTutorialMode() ? 'https://www.youtube.com/watch?v=a5uQMwRMHcs' : url.trim(),
          platform: data.platform || 'youtube',
          id: data.id || Date.now().toString(),
        }

        youtubeModuleState.videoInfo = info
        youtubeModuleState.soundName = info.title?.slice(0, 50) || ''
        youtubeModuleState.end = info.duration || 0
        youtubeModuleState.step = 'trim'
        youtubeModuleState.platform = info.platform || 'youtube'

        setVideoInfo(info)
        setSoundName(youtubeModuleState.soundName)
        setEnd(youtubeModuleState.end)
        setStep('trim')
        setPlatform(youtubeModuleState.platform)

        if (isTutorialMode()) {
          setTutorialStep('trim')
          setTimeout(() => setForceRender((prev) => prev + 1), 100)
        }

        addToast(
          t('platformDetected', { platform: info.platform || t('platformYoutube') }),
          'success'
        )
      } else {
        addToast(t('ytFetchError', { detail: result?.error || t('unknownError') }), 'error')
      }
    } catch (error) {
      console.error('❌ [YouTube] Erreur handleFetchInfo:', error)
      if (error?.isNetworkError) {
        const online = await ensureOnline()
        setLoadingInfo(false)
        fetchingRef.current = false
        setIsProcessing(false)
        if (!online) return
      }
      addToast(t('ytFetchError', { detail: error.message }), 'error')
    }

    setLoadingInfo(false)
    fetchingRef.current = false
    setIsProcessing(false)
  }, [url, addToast, t, isTutorialMode, ensureOnline])

  // ─── PRÉVISUALISATION ─────────────────────────────────────────────────
  const togglePreview = useCallback((filePath) => {
    if (!filePath) return

    if (previewHowl && isPreviewPlaying) {
      previewHowl.stop()
      previewHowl.unload()
      setPreviewHowl(null)
      setIsPreviewPlaying(false)
      return
    }

    try {
      const howl = new Howl({
        src: [filePath],
        html5: true,
        volume: 0.5,
        onend: () => {
          setIsPreviewPlaying(false)
          setPreviewHowl(null)
        },
        onloaderror: () => {
          addToast(t('ytPreviewError'), 'error')
          setIsPreviewPlaying(false)
          setPreviewHowl(null)
        },
      })

      setPreviewHowl(howl)
      setIsPreviewPlaying(true)
      howl.play()
    } catch (error) {
      console.error('❌ [YouTube] Erreur togglePreview:', error)
      addToast(t('ytPreviewError'), 'error')
    }
  }, [previewHowl, isPreviewPlaying, addToast, t])

  // ─── TÉLÉCHARGEMENT ───────────────────────────────────────────────────
  const handleDownloadAudio = useCallback(async () => {
    const currentVideoInfo = videoInfo || youtubeModuleState.videoInfo
    const currentPlatform = platform || youtubeModuleState.platform

    if (!currentVideoInfo) {
      addToast(t('ytFetchError', { detail: t('unknownError') }), 'error')
      return
    }

    if (isProcessingRef.current) return

    setToastShown(false)
    isProcessingRef.current = true
    setImporting(true)
    setIsProcessing(true)
    startProgressSimulation()

    try {
      let result

      if (isTutorialMode()) {
        result = await mockDownloadAudio(
          currentVideoInfo.url,
          start,
          end > 0 ? end : currentVideoInfo.duration || 0,
          soundName || currentVideoInfo.title
        )
        setTutorialStep('save')
        setTimeout(() => setForceRender((prev) => prev + 1), 100)
      } else {
        const soundsDir = await window.electronAPI.getSoundsDir()
        const safeName =
          sanitizeFilename(soundName || currentVideoInfo.title || 'audio') +
          '_' +
          Date.now() +
          '.mp3'
        const outputPath = `${soundsDir}/${safeName}`

        if (currentPlatform === 'spotify') {
          result = await window.electronAPI.downloadPlatformTrack({
            platform: 'spotify',
            url: `https://open.spotify.com/track/${currentVideoInfo.id}`,
            trackId: currentVideoInfo.id,
            outputPath,
            title: currentVideoInfo.title,
            artist: currentVideoInfo.uploader,
          })
        } else if (currentPlatform === 'soundcloud') {
          result = await window.electronAPI.downloadPlatformTrack({
            platform: 'soundcloud',
            url: `https://soundcloud.com/${currentVideoInfo.uploader || 'artist'}/${currentVideoInfo.id}`,
            trackId: currentVideoInfo.id,
            outputPath,
            title: currentVideoInfo.title,
            artist: currentVideoInfo.uploader,
          })
        } else {
          result = await window.electronAPI.youtubeDownload(
            currentVideoInfo.url,
            start,
            end > 0 ? end : currentVideoInfo.duration || 0,
            currentVideoInfo.title
          )
        }
      }

      stopProgressSimulation()

      setShowProgress(true)
      setDownloadProgress(100)
      setDownloadStatus('✅ ' + t('downloadComplete'))

      isProcessingRef.current = false
      setImporting(false)

      if (result?.success) {
        youtubeModuleState.downloadedPath = result.path
        youtubeModuleState.step = 'save'

        setDownloadedPath(result.path)
        setStep('save')

        if (isTutorialMode()) {
          setTutorialStep('save')
          setTimeout(() => setForceRender((prev) => prev + 1), 100)
        }
      } else {
        setShowProgress(false)
        setIsProcessing(false)
        if (result?.isNetworkError) {
          const online = await ensureOnline()
          if (!online) return
        }
        addToast(t('ytDownloadError', { detail: result?.error || t('unknownError') }), 'error')
      }
    } catch (error) {
      console.error('❌ [YouTube] Erreur téléchargement:', error)
      stopProgressSimulation()
      setShowProgress(false)
      isProcessingRef.current = false
      setImporting(false)
      setIsProcessing(false)
      if (error?.isNetworkError) {
        const online = await ensureOnline()
        if (!online) return
      }
      addToast(t('ytDownloadError', { detail: error.message }), 'error')
    }
  }, [
    videoInfo, platform, soundName, start, end,
    addToast, t, startProgressSimulation, stopProgressSimulation,
    isTutorialMode, ensureOnline,
  ])

  // ─── SAUVEGARDE ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (savingRef.current || hasCompletedSave.current) return

    const currentSoundName = soundName || youtubeModuleState.soundName
    const currentDownloadedPath = downloadedPath || youtubeModuleState.downloadedPath
    const finalImage = getFinalImage()

    if (!currentSoundName.trim()) {
      addToast(t('editorNameRequired'), 'error')
      return
    }
    if (!currentDownloadedPath) {
      addToast(t('ytDownloadError', { detail: t('unknownError') }), 'error')
      return
    }
    if (targetProfiles.length === 0) {
      addToast(t('editorProfileRequired') || 'Sélectionnez au moins un profil', 'error')
      return
    }

    const existingSound = store.sounds.find(
      (s) => s.name.toLowerCase() === currentSoundName.trim().toLowerCase()
    )
    if (existingSound && !isTutorialMode()) {
      const confirmed = await confirm({
        title: t('soundExists'),
        message: t('soundExistsConfirm').replace('{name}', currentSoundName.trim()),
        type: 'warning',
      })
      if (!confirmed) return
    }

    savingRef.current = true
    hasCompletedSave.current = true
    setIsProcessing(true)
    setShowProgress(true)
    setDownloadProgress(0)
    setDownloadStatus(t('saving'))

    let saveProgress = 0
    const saveInterval = setInterval(() => {
      if (saveProgress < 90) {
        saveProgress += 5 + Math.random() * 3
        if (saveProgress > 90) saveProgress = 90
        setDownloadProgress(saveProgress)
      }
    }, 200)

    const savedGlobals = {
      step: youtubeModuleState.step,
      videoInfo: youtubeModuleState.videoInfo,
      soundName: youtubeModuleState.soundName,
      end: youtubeModuleState.end,
      downloadedPath: youtubeModuleState.downloadedPath,
      platform: youtubeModuleState.platform,
    }

    youtubeModuleState.step = 'url'
    youtubeModuleState.videoInfo = null
    youtubeModuleState.soundName = ''
    youtubeModuleState.end = 0
    youtubeModuleState.downloadedPath = null
    youtubeModuleState.platform = null

    try {
      if (isTutorialMode()) {
        await mockSaveSound()
      } else {
        let imageToSave = finalImage

        if (useThumbnail && videoInfo?.thumbnail) {
          try {
            if (window.electronAPI.downloadThumbnail) {
              const result = await window.electronAPI.downloadThumbnail(
                videoInfo.thumbnail,
                currentSoundName
              )
              imageToSave = result?.success ? result.path : videoInfo.thumbnail
            } else {
              imageToSave = videoInfo.thumbnail
            }
          } catch (e) {
            console.warn('⚠️ Erreur téléchargement miniature:', e.message)
            imageToSave = videoInfo.thumbnail
          }
        }

        await store.addSound({
          name: currentSoundName.trim(),
          path: currentDownloadedPath,
          emoji,
          image: imageToSave || null,
          profiles: targetProfiles,
        })
      }

      clearInterval(saveInterval)

      addToast(t('ytSoundAdded', { name: currentSoundName.trim() }), 'success')

      setUrl('')
      setVideoInfo(null)
      setDownloadedPath(null)
      setStep('url')
      setSoundName('')
      setStart(0)
      setEnd(0)
      setTargetProfiles([])
      setPlatform(null)
      setCustomImage(null)
      setUseThumbnail(false)
      setToastShown(false)
      setShowProgress(false)
      setIsProcessing(false)
      setDownloadProgress(0)
      setDownloadStatus('')

      if (previewHowl) {
        previewHowl.stop()
        previewHowl.unload()
        setPreviewHowl(null)
        setIsPreviewPlaying(false)
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null
        savingRef.current = false
        hasCompletedSave.current = false
      }, 500)
    } catch (error) {
      console.error('❌ [YouTube] Erreur sauvegarde:', error)
      clearInterval(saveInterval)

      youtubeModuleState.step = savedGlobals.step
      youtubeModuleState.videoInfo = savedGlobals.videoInfo
      youtubeModuleState.soundName = savedGlobals.soundName
      youtubeModuleState.end = savedGlobals.end
      youtubeModuleState.downloadedPath = savedGlobals.downloadedPath
      youtubeModuleState.platform = savedGlobals.platform

      savingRef.current = false
      hasCompletedSave.current = false
      setIsProcessing(false)
      setShowProgress(false)
      setDownloadProgress(0)
      setDownloadStatus('')
      addToast(t('ytSaveError', { detail: error.message }), 'error')
    }
  }, [
    soundName, downloadedPath, getFinalImage, useThumbnail, videoInfo,
    targetProfiles, store, addToast, t, confirm, previewHowl, emoji, isTutorialMode,
  ])

  // ─── PICK IMAGE ────────────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setCustomImage(result.path)
        setUseThumbnail(false)
        addToast(t('ytImageAdded'), 'success')
      }
    }
  }, [addToast, t])

  // ─── RENDU ────────────────────────────────────────────────────────────
  const currentStep = step || youtubeModuleState.step
  const currentVideoInfo = videoInfo || youtubeModuleState.videoInfo
  const currentDownloadedPath = downloadedPath || youtubeModuleState.downloadedPath
  const finalImage = getFinalImage()

  if (effectiveStatus === 'checking') {
    return (
      <>
        <CheckingView />
        <LoadingOverlay visible={true} message={t('ytdlpChecking')} />
      </>
    )
  }

  if (effectiveStatus === 'missing' && !isTutorialMode()) {
    return (
      <>
        <MissingYtdlpView onInstall={handleInstallYtdlp} downloading={downloading} />
        <ConfirmWrapper />
        <LoadingOverlay
          visible={isProcessing || downloading}
          message={downloading ? t('installing') : t('processing')}
        />
      </>
    )
  }

  if (currentStep === 'url') {
    return (
      <>
        <UrlStep
          resetKey={resetKey}
          isTutorialMode={isTutorialMode()}
          url={url}
          setUrl={setUrl}
          loadingInfo={loadingInfo}
          onFetchInfo={handleFetchInfo}
        />
        <LoadingOverlay
          visible={isProcessing || loadingInfo}
          message={loadingInfo ? t('loading2') : t('processing')}
        />
      </>
    )
  }

  if (currentStep === 'trim') {
    const info = currentVideoInfo
    if (!info) {
      youtubeModuleState.step = 'url'
      setStep('url')
      return null
    }

    return (
      <>
        <TrimStep
          info={info}
          isTutorialMode={isTutorialMode()}
          start={start}
          end={end}
          setStart={setStart}
          setEnd={setEnd}
          importing={importing}
          onBack={() => {
            setTutorialStep(isTutorialMode() ? 'url' : undefined)
            youtubeModuleState.step = 'url'
            setStep('url')
          }}
          onDownload={handleDownloadAudio}
        />
        <DownloadProgressModal
          visible={showProgress}
          progress={downloadProgress}
          status={downloadStatus}
          t={t}
        />
        <LoadingOverlay
          visible={isProcessing && !showProgress}
          message={importing ? t('ytAudioDownloading') : t('processing')}
        />
      </>
    )
  }

  if (currentStep === 'save') {
    const info = currentVideoInfo
    const currentPath = currentDownloadedPath

    if (!info || !currentPath) {
      if (!savingRef.current) {
        youtubeModuleState.step = 'url'
        setStep('url')
      }
      return null
    }

    const availableProfiles = store.profiles || []
    const noProfilesSelected = targetProfiles.length === 0
    const noUserProfiles = availableProfiles.length === 0

    return (
      <>
        <SaveStep
          info={info}
          currentPath={currentPath}
          isTutorialMode={isTutorialMode()}
          soundName={soundName}
          setSoundName={setSoundName}
          emoji={emoji}
          setEmoji={setEmoji}
          customImage={customImage}
          setCustomImage={setCustomImage}
          useThumbnail={useThumbnail}
          setUseThumbnail={setUseThumbnail}
          finalImage={finalImage}
          videoInfo={videoInfo}
          targetProfiles={targetProfiles}
          setTargetProfiles={setTargetProfiles}
          availableProfiles={availableProfiles}
          noProfilesSelected={noProfilesSelected}
          noUserProfiles={noUserProfiles}
          isPreviewPlaying={isPreviewPlaying}
          togglePreview={togglePreview}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          isProcessing={isProcessing}
          savingRef={savingRef.current}
          onBack={() => {
            if (!savingRef.current) {
              setTutorialStep(isTutorialMode() ? 'trim' : undefined)
              youtubeModuleState.step = 'trim'
              setStep('trim')
            }
          }}
          onSave={handleSave}
          onPickImage={handlePickImage}
          addToast={addToast}
        />
        <DownloadProgressModal
          visible={showProgress}
          progress={downloadProgress}
          status={downloadStatus}
          t={t}
        />
        <LoadingOverlay visible={isProcessing && !showProgress} message={t('saving')} />
        <ConfirmWrapper />
      </>
    )
  }

  return null
}