// src/plugins/youtube/YouTube.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { detectPlatform, getSpotifyTrack, getSoundCloudTrack, sanitizeFilename } from '@shared/utils/platformImport'
import { Howl } from 'howler'
import useConfirm from '@shared/hooks/useConfirm'
import LoadingOverlay from '@shared/components/ui/LoadingOverlay'
import { DeleteButton } from '@shared/components/ui'
import { buildFileUrl } from '@shared/utils/fileUrl'
import EmojiPicker from '@shared/components/ui/EmojiPicker'

import {
  mockFetchVideoInfo,
  mockDownloadAudio,
  mockSaveSound,
  isYoutubeTutorialActive,
  getTutorialState,
  getMockVideoInfo,
  setTutorialStep,
} from './tutorialSteps'

// ✅ ÉTAT GLOBAL POUR YT-DLP
let globalYtdlpStatus = null
let globalCheckDone = false
let globalCheckPromise = null
let globalCheckStarted = false

// ✅ ÉTAT GLOBAL POUR LES DONNÉES DE LA VIDÉO
let globalVideoInfo = null
let globalStep = 'url'
let globalSoundName = ''
let globalEnd = 0
let globalDownloadedPath = null
let globalPlatform = null

export default function YouTube({ store, addToast }) {
    const { t, currentLang } = useLanguage()
    const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })

    // ─── ÉTATS ──────────────────────────────────────────────────────────────────
    const [ytdlpStatus, setYtdlpStatus] = useState(() => {
        if (globalCheckDone) {
            return globalYtdlpStatus ?? 'missing'
        }
        return 'checking'
    })
    const [forceRender, setForceRender] = useState(0)
    const [resetKey, setResetKey] = useState(0)
    const [downloading, setDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [downloadStatus, setDownloadStatus] = useState('')
    const [url, setUrl] = useState('')
    const [videoInfo, setVideoInfo] = useState(globalVideoInfo)
    const [loadingInfo, setLoadingInfo] = useState(false)
    const [start, setStart] = useState(0)
    const [end, setEnd] = useState(globalEnd)
    const [soundName, setSoundName] = useState(globalSoundName)
    const [targetProfiles, setTargetProfiles] = useState([])
    const [emoji, setEmoji] = useState('🎵')
    const [step, setStep] = useState(globalStep)
    const [downloadedPath, setDownloadedPath] = useState(globalDownloadedPath)
    const [importing, setImporting] = useState(false)
    const [platform, setPlatform] = useState(globalPlatform)
    const [customImage, setCustomImage] = useState(null)
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
    const [previewHowl, setPreviewHowl] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)
    const [toastShown, setToastShown] = useState(false)
    const [useThumbnail, setUseThumbnail] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    // ─── REFS ──────────────────────────────────────────────────────────────────
    const isMounted = useRef(true)
    const fetchingRef = useRef(false)
    const initDone = useRef(false)
    const progressIntervalRef = useRef(null)
    const savingRef = useRef(false)
    const hasCompletedSave = useRef(false)
    const hideProgressTimeoutRef = useRef(null)
    const resetTimerRef = useRef(null)
    const isProcessingRef = useRef(false)
    const forceUpdateListenersRef = useRef([])
    const tRef = useRef(t)
    useEffect(() => { tRef.current = t }, [t])

    const isTutorialMode = useCallback(() => {
        return isYoutubeTutorialActive()
    }, [])

    const effectiveStatus = globalCheckDone ? (globalYtdlpStatus ?? 'missing') : ytdlpStatus

    const getFinalImage = useCallback(() => {
        if (useThumbnail && videoInfo?.thumbnail) {
            return videoInfo.thumbnail
        }
        return customImage || null
    }, [useThumbnail, videoInfo, customImage])

    // ─── SURVEILLANCE DU CHANGEMENT DE STEP ──────────────────────────────────
    useEffect(() => {
        if (step === 'save' && showProgress && !toastShown) {
            setShowProgress(false)
            setIsProcessing(false)
            setToastShown(true)
            addToast('✅ ' + tRef.current('ytAudioReady'), 'success')
        }
    }, [step, showProgress, toastShown, addToast])

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    useEffect(() => {
        if (step !== 'save') return
        if (targetProfiles.length > 0) return

        const userProfiles = store.profiles.filter(p => p.id !== 'all')
        if (userProfiles.length === 0) return

        if (isTutorialMode()) {
            setTargetProfiles(userProfiles.map(p => p.id))
            return
        }

        const currentId = store.currentProfileId
        if (currentId && currentId !== 'all' && userProfiles.some(p => p.id === currentId)) {
            setTargetProfiles([currentId])
        } else {
            setTargetProfiles([userProfiles[0].id])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, store.profiles.length, store.currentProfileId])

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
            setResetKey(prev => prev + 1)

            globalStep = 'url'
            globalVideoInfo = null
            globalSoundName = ''
            globalEnd = 0
            globalDownloadedPath = null
            globalPlatform = null

            hasCompletedSave.current = false
            savingRef.current = false
            isProcessingRef.current = false
            fetchingRef.current = false
        }

        window.addEventListener('youtube-force-reset', handleForceReset)
        return () => window.removeEventListener('youtube-force-reset', handleForceReset)
    }, [])

    // ─── VÉRIFICATION DE yt-dlp ──────────────────────────────────────────────
    const checkYtdlp = useCallback(async () => {
        if (isTutorialMode()) {
            globalYtdlpStatus = 'available'
            globalCheckDone = true
            setYtdlpStatus('available')
            return 'available'
        }

        if (globalCheckDone) {
            if (ytdlpStatus !== globalYtdlpStatus) {
                setYtdlpStatus(globalYtdlpStatus ?? 'missing')
            }
            return globalYtdlpStatus
        }

        if (globalCheckPromise) {
            try {
                await globalCheckPromise
                if (ytdlpStatus !== globalYtdlpStatus) {
                    setYtdlpStatus(globalYtdlpStatus ?? 'missing')
                }
                return globalYtdlpStatus
            } catch (error) {
                console.error('❌ [YouTube] Erreur dans la promesse existante:', error)
                setYtdlpStatus('missing')
                return 'missing'
            }
        }

        globalCheckPromise = (async () => {
            try {
                const result = await window.electronAPI.checkYtdlp()
                globalYtdlpStatus = result?.available ? 'available' : 'missing'
                globalCheckDone = true
                setYtdlpStatus(globalYtdlpStatus)
                forceUpdateListenersRef.current.forEach(listener => {
                    try { listener() } catch (e) {}
                })
                return globalYtdlpStatus
            } catch (error) {
                console.error('❌ [YouTube] Erreur checkYtdlp:', error)
                globalYtdlpStatus = 'missing'
                globalCheckDone = true
                setYtdlpStatus('missing')
                throw error
            } finally {
                globalCheckPromise = null
            }
        })()

        try {
            await globalCheckPromise
            return globalYtdlpStatus
        } catch (error) {
            return 'missing'
        }
    }, [ytdlpStatus, isTutorialMode])

    // ─── INITIALISATION ──────────────────────────────────────────────────────
    useEffect(() => {
        if (initDone.current) return

        initDone.current = true
        hasCompletedSave.current = false

        const listener = () => {
            setForceRender(prev => prev + 1)
            if (globalCheckDone) {
                setYtdlpStatus(globalYtdlpStatus ?? 'missing')
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

            setTimeout(() => {
                setForceRender(prev => prev + 1)
            }, 100)
        }

        if (globalVideoInfo && !isTutorialMode()) {
            setVideoInfo(globalVideoInfo)
            setSoundName(globalSoundName)
            setEnd(globalEnd)
            setStep(globalStep)
            setPlatform(globalPlatform)
        }
        if (globalDownloadedPath && !isTutorialMode()) {
            setDownloadedPath(globalDownloadedPath)
            setStep(globalStep)
        }

        if (globalCheckDone) {
            setYtdlpStatus(globalYtdlpStatus ?? 'missing')
        } else if (!globalCheckStarted && !isTutorialMode()) {
            globalCheckStarted = true
            checkYtdlp()
        } else if (isTutorialMode()) {
            globalYtdlpStatus = 'available'
            globalCheckDone = true
            setYtdlpStatus('available')
        }

        return () => {
            const list = forceUpdateListenersRef.current
            const index = list.indexOf(listener)
            if (index > -1) {
                list.splice(index, 1)
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
            }
            if (hideProgressTimeoutRef.current) {
                clearTimeout(hideProgressTimeoutRef.current)
                hideProgressTimeoutRef.current = null
            }
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current)
                resetTimerRef.current = null
            }
        }
    }, [checkYtdlp, isTutorialMode])

    // ─── NETTOYAGE PREVIEW ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (previewHowl) {
                previewHowl.stop()
                previewHowl.unload()
            }
        }
    }, [previewHowl])

    // ─── SIMULATION DE PROGRESSION ──────────────────────────────────────────
    const startProgressSimulation = useCallback(() => {
        setShowProgress(true)
        setDownloadProgress(0)
        setDownloadStatus(t('ytAudioDownloading'))

        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
        }

        let progress = 0
        progressIntervalRef.current = setInterval(() => {
            if (progress < 30) {
                progress += 5 + Math.random() * 3
            } else if (progress < 60) {
                progress += 3 + Math.random() * 2
            } else if (progress < 85) {
                progress += 1 + Math.random() * 1.5
            } else if (progress < 95) {
                progress += 0.5 + Math.random() * 0.5
            } else {
                progress = 95
            }

            if (progress > 95) progress = 95
            setDownloadProgress(Math.min(95, progress))

            if (progress < 30) {
                setDownloadStatus(t('ytAudioDownloading'))
            } else if (progress < 60) {
                setDownloadStatus(t('extractingAudio'))
            } else if (progress < 85) {
                setDownloadStatus(t('convertingToMp3'))
            } else {
                setDownloadStatus(t('finalizing'))
            }
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
                globalYtdlpStatus = 'available'
                globalCheckDone = true
                setYtdlpStatus('available')
                addToast('✅ ' + t('ytdlpInstalled'), 'success')
            } else {
                addToast('❌ ' + t('ytdlpInstallError') + (result?.error || t('unknownError')), 'error')
            }
        } catch (error) {
            setDownloading(false)
            addToast('❌ ' + t('ytdlpInstallError') + error.message, 'error')
        }
    }

    // ─── RÉCUPÉRATION DES INFOS ──────────────────────────────────────────────
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
                globalPlatform = detected

                if (detected === 'spotify') {
                    result = await getSpotifyTrack(url.trim())
                } else if (detected === 'soundcloud') {
                    result = await getSoundCloudTrack(url.trim())
                } else {
                    result = await window.electronAPI.youtubeInfo(url.trim())
                }
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
                    id: data.id || Date.now().toString()
                }

                globalVideoInfo = info
                globalSoundName = info.title?.slice(0, 50) || ''
                globalEnd = info.duration || 0
                globalStep = 'trim'
                globalPlatform = info.platform || 'youtube'

                setVideoInfo(info)
                setSoundName(globalSoundName)
                setEnd(globalEnd)
                setStep('trim')
                setPlatform(globalPlatform)

                if (isTutorialMode()) {
                    setTutorialStep('trim')
                    setTimeout(() => {
                        setForceRender(prev => prev + 1)
                    }, 100)
                }

                addToast(`✅ ${t('platformDetected').replace('{platform}', info.platform || t('platformYoutube'))}`, 'success')
            } else {
                addToast('❌ ' + t('ytFetchError') + (result?.error || t('unknownError')), 'error')
            }
        } catch (error) {
            console.error('❌ [YouTube] Erreur handleFetchInfo:', error)
            addToast('❌ ' + t('ytFetchError') + error.message, 'error')
        }

        setLoadingInfo(false)
        fetchingRef.current = false
        setIsProcessing(false)
    }, [url, addToast, t, isTutorialMode])

    // ─── PRÉVISUALISATION ─────────────────────────────────────────────────────
    const togglePreview = (filePath) => {
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
                    addToast('❌ ' + t('error'), 'error')
                    setIsPreviewPlaying(false)
                    setPreviewHowl(null)
                }
            })

            setPreviewHowl(howl)
            setIsPreviewPlaying(true)
            howl.play()
        } catch (error) {
            console.error('❌ [YouTube] Erreur togglePreview:', error)
            addToast('❌ ' + t('error'), 'error')
        }
    }

    // ─── TÉLÉCHARGEMENT ──────────────────────────────────────────────────────
    const handleDownloadAudio = useCallback(async () => {
        const currentVideoInfo = videoInfo || globalVideoInfo
        const currentPlatform = platform || globalPlatform

        if (!currentVideoInfo) {
            addToast(t('ytFetchError'), 'error')
            return
        }

        if (isProcessingRef.current) {
            return
        }

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
                setTimeout(() => {
                    setForceRender(prev => prev + 1)
                }, 100)
            } else {
                const soundsDir = await window.electronAPI.getSoundsDir()
                const safeName = sanitizeFilename(soundName || currentVideoInfo.title || 'audio') + '_' + Date.now() + '.mp3'
                const outputPath = `${soundsDir}/${safeName}`

                if (currentPlatform === 'spotify') {
                    result = await window.electronAPI.downloadPlatformTrack({
                        platform: 'spotify',
                        url: `https://open.spotify.com/track/${currentVideoInfo.id}`,
                        trackId: currentVideoInfo.id,
                        outputPath: outputPath,
                        title: currentVideoInfo.title,
                        artist: currentVideoInfo.uploader
                    })
                } else if (currentPlatform === 'soundcloud') {
                    result = await window.electronAPI.downloadPlatformTrack({
                        platform: 'soundcloud',
                        url: `https://soundcloud.com/${currentVideoInfo.uploader || 'artist'}/${currentVideoInfo.id}`,
                        trackId: currentVideoInfo.id,
                        outputPath: outputPath,
                        title: currentVideoInfo.title,
                        artist: currentVideoInfo.uploader
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
                globalDownloadedPath = result.path
                globalStep = 'save'

                setDownloadedPath(result.path)
                setStep('save')

                if (isTutorialMode()) {
                    setTutorialStep('save')
                    setTimeout(() => {
                        setForceRender(prev => prev + 1)
                    }, 100)
                }
            } else {
                setShowProgress(false)
                setIsProcessing(false)
                addToast('❌ ' + t('ytDownloadError') + (result?.error || t('unknownError')), 'error')
            }
        } catch (error) {
            console.error('❌ [YouTube] Erreur téléchargement:', error)
            stopProgressSimulation()
            setShowProgress(false)
            isProcessingRef.current = false
            setImporting(false)
            setIsProcessing(false)
            addToast('❌ ' + t('ytDownloadError') + error.message, 'error')
        }
    }, [videoInfo, platform, soundName, start, end, addToast, t, startProgressSimulation, stopProgressSimulation, isTutorialMode])

    // ─── SAUVEGARDE ──────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (savingRef.current || hasCompletedSave.current) {
            return
        }

        const currentSoundName = soundName || globalSoundName
        const currentDownloadedPath = downloadedPath || globalDownloadedPath
        const finalImage = getFinalImage()

        if (!currentSoundName.trim()) {
            addToast(t('editorNameRequired'), 'error')
            return
        }

        if (!currentDownloadedPath) {
            addToast(t('ytDownloadError'), 'error')
            return
        }

        if (targetProfiles.length === 0) {
            addToast(t('editorProfileRequired') || 'Sélectionnez au moins un profil', 'error')
            return
        }

        const existingSound = store.sounds.find(s => s.name.toLowerCase() === currentSoundName.trim().toLowerCase())
        if (existingSound && !isTutorialMode()) {
            const confirmed = await confirm({
                title: t('soundExists'),
                message: t('soundExistsConfirm').replace('{name}', currentSoundName.trim()),
                type: 'warning'
            })
            if (!confirmed) {
                return
            }
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
            step: globalStep,
            videoInfo: globalVideoInfo,
            soundName: globalSoundName,
            end: globalEnd,
            downloadedPath: globalDownloadedPath,
            platform: globalPlatform,
        }

        // Reset immédiat des globals (avant le await)
        globalStep = 'url'
        globalVideoInfo = null
        globalSoundName = ''
        globalEnd = 0
        globalDownloadedPath = null
        globalPlatform = null

        try {
            if (isTutorialMode()) {
                await mockSaveSound()
            } else {
                let imageToSave = finalImage

                if (useThumbnail && videoInfo?.thumbnail) {
                    try {
                        if (window.electronAPI.downloadThumbnail) {
                            const result = await window.electronAPI.downloadThumbnail(videoInfo.thumbnail, currentSoundName)
                            if (result?.success) {
                                imageToSave = result.path
                            } else {
                                imageToSave = videoInfo.thumbnail
                            }
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
                    profiles: targetProfiles
                })
            }

            clearInterval(saveInterval)

            // Toast de succès
            addToast(`✅ "${currentSoundName.trim()}" ${t('ytSoundAdded')}`, 'success')

            // Reset des states locaux (les globals sont déjà reset)
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

            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current)
            }
            resetTimerRef.current = setTimeout(() => {
                resetTimerRef.current = null
                savingRef.current = false
                hasCompletedSave.current = false
            }, 500)

        } catch (error) {
            console.error('❌ [YouTube] Erreur sauvegarde:', error)
            clearInterval(saveInterval)

            globalStep = savedGlobals.step
            globalVideoInfo = savedGlobals.videoInfo
            globalSoundName = savedGlobals.soundName
            globalEnd = savedGlobals.end
            globalDownloadedPath = savedGlobals.downloadedPath
            globalPlatform = savedGlobals.platform

            savingRef.current = false
            hasCompletedSave.current = false
            setIsProcessing(false)
            setShowProgress(false)
            setDownloadProgress(0)
            setDownloadStatus('')
            addToast('❌ ' + t('error') + ': ' + error.message, 'error')
        }
    }, [soundName, downloadedPath, getFinalImage, useThumbnail, videoInfo, targetProfiles, store, addToast, t, confirm, previewHowl, emoji, isTutorialMode])

    // ─── FORMATAGE ────────────────────────────────────────────────────────────
    const fmt = (s) => {
        if (!s || isNaN(s)) return '0:00'
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    // ─── RENDU ────────────────────────────────────────────────────────────────────

    const currentStep = step || globalStep
    const currentVideoInfo = videoInfo || globalVideoInfo
    const currentDownloadedPath = downloadedPath || globalDownloadedPath
    const finalImage = getFinalImage()

    if (effectiveStatus === 'checking') {
        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <PageHeader title={t('youtubeTitle')} sub={t('youtubeSub')} />
                </div>
                <LoadingOverlay visible={true} message={t('ytdlpChecking')} />
            </>
        )
    }

    if (effectiveStatus === 'missing' && !isTutorialMode()) {
        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <PageHeader title={t('youtubeTitle')} sub={t('youtubeSub')} />
                    <div className="flex-center" style={{ flex: 1, padding: 40 }}>
                        <div style={{ maxWidth: 480, textAlign: 'center' }}>
                            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
                            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t('ytdlpRequired')}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
                                {t('ytdlpDesc')}
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                                <button
                                    className="btn-primary btn-lg"
                                    onClick={handleInstallYtdlp}
                                    disabled={downloading}
                                    style={{ borderRadius: 'var(--radius-md)', padding: '10px 24px' }}
                                >
                                    {downloading
                                        ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('installing')}</>
                                        : <><i className="ti ti-download" /> {t('installYtdlp')}</>}
                                </button>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', lineHeight: 1.6, textAlign: 'left' }}>
                                <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
                                {t('ytdlpManual')}
                            </div>
                        </div>
                    </div>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    <ConfirmWrapper />
                </div>
                <LoadingOverlay visible={isProcessing || downloading} message={downloading ? t('installing') : t('processing')} />
            </>
        )
    }

    if (currentStep === 'url') {
        return (
            <>
                <div key={resetKey} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <PageHeader title={t('youtubeTitle')} sub={isTutorialMode() ? '🎬 ' + t('tutorialMode') + ' - ' + t('pasteUrl') : t('pasteUrl')} />
                    <div className="flex-center" style={{ flex: 1, padding: 40 }}>
                        <div style={{ width: '100%', maxWidth: 560 }}>
                            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>▶️</div>
                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
                                {isTutorialMode() ? '🔗 ' + t('ytUrlPlaceholder') : t('pasteUrl')}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <input
                                    data-testid="youtube-url-input"
                                    className="youtube-url-input"
                                    value={isTutorialMode() ? 'https://www.youtube.com/watch?v=a5uQMwRMHcs' : url}
                                    onChange={e => !isTutorialMode() && setUrl(e.target.value)}
                                    placeholder={t('ytUrlPlaceholder')}
                                    style={{ flex: 1, fontSize: 13, borderRadius: 'var(--radius-md)' }}
                                    autoFocus
                                    disabled={isTutorialMode()}
                                />
                                <button
                                    data-testid="youtube-load-button"
                                    className="youtube-load-button btn-primary btn-lg"
                                    onClick={handleFetchInfo}
                                    disabled={isTutorialMode() ? false : (!url.trim() || loadingInfo)}
                                    style={{ flexShrink: 0, borderRadius: 'var(--radius-md)', minWidth: 120 }}
                                >
                                    {loadingInfo
                                        ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('loading2')}</>
                                        : <><i className="ti ti-search" /> {t('load')}</>}
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <i className="ti ti-shield-check" style={{ marginRight: 4, color: 'var(--success)' }} />
                                {isTutorialMode() ? '🎬 ' + t('tutorialMode') + ' - ' + t('ytUrlNote') : t('ytUrlNote')}
                            </div>
                        </div>
                    </div>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
                <LoadingOverlay visible={isProcessing || loadingInfo} message={loadingInfo ? t('loading2') : t('processing')} />
            </>
        )
    }

    if (currentStep === 'trim') {
        const info = currentVideoInfo
        if (!info) {
            globalStep = 'url'
            setStep('url')
            return null
        }

        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <PageHeader
                        title={t('selectPortion')}
                        sub={`${isTutorialMode() ? '🎬 ' + t('tutorialMode') + ' - ' : ''}${info?.title?.slice(0, 60) || '...'}`}
                        onBack={() => {
                            if (!isTutorialMode()) {
                                globalStep = 'url'
                                setStep('url')
                            } else {
                                setTutorialStep('url')
                                globalStep = 'url'
                                setStep('url')
                            }
                        }}
                    />
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                        {info?.thumbnail && (
                            <div className="option-row" style={{ marginBottom: 24, padding: 16, borderRadius: 'var(--radius-md)' }}>
                                <img
                                    src={info.thumbnail}
                                    alt={t('videoThumbnail')}
                                    style={{ width: 140, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                                    onError={(e) => { e.target.style.display = 'none' }}
                                />
                                <div style={{ flex: 1, padding: '0 12px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>
                                        {info.title}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                        <i className="ti ti-user" style={{ marginRight: 4 }} />
                                        {info.uploader || t('unknownArtist')}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <i className="ti ti-clock" />
                                        {t('ytTrimTotalDuration')} {fmt(info.duration)}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t('ytTrimTitle')}
                            </div>
                            <div data-testid="youtube-trim-controls" className="youtube-trim-controls" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {t('ytTrimDuration')} <strong style={{ color: 'var(--accent)' }}>{fmt(end - start)}</strong>
                                    </span>
                                    <button
                                        className="btn-ghost btn-sm"
                                        onClick={() => { setStart(0); setEnd(info?.duration || 0) }}
                                        style={{ borderRadius: 'var(--radius-sm)' }}
                                    >
                                        <i className="ti ti-refresh" /> {t('ytTrimSelectAll')}
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                                            {t('start')} : {fmt(start)}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max={info?.duration || 0}
                                            step="0.5"
                                            value={start}
                                            onChange={e => setStart(Math.min(Number(e.target.value), end - 1))}
                                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                                            {t('end')} : {fmt(end)}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max={info?.duration || 0}
                                            step="0.5"
                                            value={end}
                                            onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('ytPreciseStart')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={info?.duration}
                                        step="0.5"
                                        value={start}
                                        onChange={e => setStart(Math.max(0, Math.min(Number(e.target.value), end - 1)))}
                                        className="input-sm"
                                        style={{ borderRadius: 'var(--radius-sm)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('ytPreciseEnd')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={info?.duration}
                                        step="0.5"
                                        value={end}
                                        onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                                        className="input-sm"
                                        style={{ borderRadius: 'var(--radius-sm)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                            <button
                                className="btn-secondary btn-lg"
                                onClick={() => {
                                    if (!isTutorialMode()) {
                                        globalStep = 'url'
                                        setStep('url')
                                    } else {
                                        setTutorialStep('url')
                                        globalStep = 'url'
                                        setStep('url')
                                    }
                                }}
                                style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}
                            >
                                <i className="ti ti-arrow-left" /> {t('ytBack')}
                            </button>
                            <button
                                data-testid="youtube-download-button"
                                className="youtube-download-button btn-primary btn-lg"
                                onClick={handleDownloadAudio}
                                disabled={importing || !info}
                                style={{ borderRadius: 'var(--radius-md)', minWidth: 180 }}
                            >
                                {importing
                                    ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('ytDownloading')}</>
                                    : <><i className="ti ti-download" /> {t('downloadAudio')}</>}
                            </button>
                        </div>
                    </div>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    <ConfirmWrapper />
                </div>

                {showProgress && (
                    <div className="modal-overlay" style={{ zIndex: 100000 }}>
                        <div className="modal" style={{ width: 420, textAlign: 'center' }}>
                            <div className="modal-title" style={{ justifyContent: 'center' }}>
                                <i className="ti ti-download" style={{ color: downloadProgress >= 100 ? 'var(--success)' : 'var(--accent)' }} />
                                {downloadProgress >= 100 ? t('downloadComplete') : t('downloadInProgress')}
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <div style={{
                                    fontSize: 48,
                                    marginBottom: 16,
                                    color: downloadProgress >= 100 ? 'var(--success)' : 'var(--accent)'
                                }}>
                                    {downloadProgress >= 100 ? (
                                        <i className="ti ti-check" style={{ color: 'var(--success)' }} />
                                    ) : (
                                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                                    )}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                                    {downloadStatus}
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: 8,
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    marginBottom: 8
                                }}>
                                    <div style={{
                                        width: `${downloadProgress}%`,
                                        height: '100%',
                                        background: downloadProgress >= 100 ? 'var(--success)' : 'var(--accent)',
                                        borderRadius: 4,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    {Math.round(downloadProgress)}%
                                </div>
                                {downloadProgress < 100 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                                        {t('pleaseWait')}
                                    </div>
                                )}
                                {downloadProgress >= 100 && (
                                    <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 8 }}>
                                        ✅ {t('preparingAudio')}
                                    </div>
                                )}
                            </div>
                            <style>{`
                                @keyframes spin {
                                    from { transform: rotate(0deg); }
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    </div>
                )}

                <LoadingOverlay visible={isProcessing && !showProgress} message={importing ? t('ytAudioDownloading') : t('processing')} />
            </>
        )
    }

    if (currentStep === 'save') {
        const info = currentVideoInfo
        const currentPath = currentDownloadedPath

        if (!info || !currentPath) {
            if (!savingRef.current) {
                globalStep = 'url'
                setStep('url')
            }
            return null
        }

        const userProfiles = store.profiles.filter(p => p.id !== 'all')
        const noProfilesSelected = targetProfiles.length === 0
        const noUserProfiles = userProfiles.length === 0

        return (
            <>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <PageHeader
                        title={isTutorialMode() ? '🎬 ' + t('tutorialMode') + ' - ' + t('configSound') : t('configSound')}
                        sub={t('ytSaveSubtitle')}
                        onBack={() => {
                            if (!savingRef.current) {
                                if (!isTutorialMode()) {
                                    globalStep = 'trim'
                                    setStep('trim')
                                } else {
                                    setTutorialStep('trim')
                                    globalStep = 'trim'
                                    setStep('trim')
                                }
                            }
                        }}
                    />
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                        <div style={{ maxWidth: 560, margin: '0 auto' }}>
                            <div className="option-row" style={{ borderColor: 'var(--success)', marginBottom: 20, padding: '12px 16px', background: 'rgba(29,158,117,0.1)', borderRadius: 'var(--radius-md)' }}>
                                <i className="ti ti-check" style={{ color: 'var(--success)', fontSize: 20 }} />
                                <div style={{ flex: 1, padding: '0 8px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{t('ytSuccessTitle')}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('ytSuccessSource')} {info?.title?.slice(0, 50)}</div>
                                </div>
                            </div>

                            {currentPath && (
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {t('editorPreview')}
                                        </div>
                                        <button onClick={() => togglePreview(currentPath)} className={`btn-${isPreviewPlaying ? 'danger' : 'secondary'} btn-sm`} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-sm)' }}>
                                            <i className={`ti ${isPreviewPlaying ? 'ti-player-stop' : 'ti-player-play'}`} />
                                            {isPreviewPlaying ? t('stop') : t('listen')}
                                        </button>
                                    </div>
                                    <div style={{ width: '100%', height: 60, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: 11 }}>
                                        <span>🎵 {t('ytAudioReady')}</span>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t('soundName')}
                                </label>
                                <input
                                    data-testid="youtube-save-controls"
                                    className="youtube-save-controls"
                                    value={soundName}
                                    onChange={e => setSoundName(e.target.value)}
                                    placeholder={t('ytSoundNamePlaceholder')}
                                    style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t('image')}
                                </label>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    marginBottom: 10
                                }}>
                                    <div style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 8,
                                        background: 'var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 24,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        border: '1px solid var(--border)'
                                    }}>
                                        {finalImage ? (
                                            <img
                                                src={buildFileUrl(finalImage)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none' }}
                                            />
                                        ) : (
                                            emoji
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {finalImage ? t('customImage') : t('noImageSelected')}
                                        </div>
                                        {useThumbnail && videoInfo?.thumbnail && (
                                            <div style={{ fontSize: 11, color: 'var(--accent)' }}>
                                                <i className="ti ti-photo" /> {t('youtubeThumbnail')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {videoInfo?.thumbnail && (
                                        <button
                                            className={`btn-${useThumbnail ? 'primary' : 'secondary'} btn-sm`}
                                            onClick={() => {
                                                setUseThumbnail(!useThumbnail)
                                                if (!useThumbnail) {
                                                    setCustomImage(null)
                                                }
                                            }}
                                            style={{
                                                fontSize: 12,
                                                padding: '6px 14px',
                                                borderRadius: 'var(--radius-sm)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <i className="ti ti-photo" />
                                            {useThumbnail ? t('thumbnailActive') : t('useThumbnail')}
                                        </button>
                                    )}

                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={async () => {
                                            const imgPath = await window.electronAPI.openImageDialog()
                                            if (imgPath) {
                                                const result = await window.electronAPI.importImageFile(imgPath)
                                                if (result.success) {
                                                    setCustomImage(result.path)
                                                    setUseThumbnail(false)
                                                    addToast(t('ytImageAdded'), 'success')
                                                }
                                            }
                                        }}
                                        style={{
                                            fontSize: 12,
                                            padding: '6px 14px',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <i className="ti ti-upload" />
                                        {customImage ? t('ytImageChange') : t('ytImageAdd')}
                                    </button>

                                    {(customImage || useThumbnail) && (
                                        <DeleteButton
                                            onDelete={() => {
                                                setCustomImage(null)
                                                setUseThumbnail(false)
                                            }}
                                            itemName={t('image')}
                                            confirmTitle={t('deleteImageConfirm')}
                                            confirmMessage={t('deleteImageMessage')}
                                            label={t('delete')}
                                            variant="ghost-danger"
                                            size="sm"
                                            icon="ti-trash"
                                            showLabel={true}
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t('editorEmojiLabel')}
                                </label>
                                <button
                                    data-testid="youtube-emoji-picker-button"
                                    onClick={() => setShowEmojiPicker(true)}
                                    className="btn-secondary"
                                    style={{
                                    minWidth: 60,
                                    minHeight: 44,
                                    justifyContent: 'center',
                                    fontSize: 24,
                                    borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    {emoji || '🎵'}
                                </button>

                                <EmojiPicker
                                    isOpen={showEmojiPicker}
                                    onClose={() => setShowEmojiPicker(false)}
                                    currentEmoji={emoji}
                                    onSelect={(newEmoji) => {
                                    setEmoji(newEmoji)
                                    setShowEmojiPicker(false)
                                    }}
                                    onManageClick={() => window.__navigateTo?.('emoji')}
                                />
                                </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t('ytProfilesLabel')}
                                </label>

                                {noUserProfiles ? (
                                    <div style={{
                                        padding: '10px 12px',
                                        background: 'rgba(239,159,39,0.1)',
                                        border: '1px solid var(--warning)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 12,
                                        color: 'var(--warning)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}>
                                        <i className="ti ti-alert-triangle" />
                                        <span>
                                            {t('ytNoUserProfile') || 'Créez un profil depuis la page "Mes sons" avant d\'ajouter un son.'}
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {userProfiles.map(p => {
                                            const isChecked = targetProfiles.includes(p.id)
                                            return (
                                                <label
                                                    key={p.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '7px 10px',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        fontSize: 13,
                                                        border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                                                        background: isChecked ? 'var(--accent-light)' : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            setTargetProfiles(prev =>
                                                                prev.includes(p.id)
                                                                    ? prev.filter(x => x !== p.id)
                                                                    : [...prev, p.id]
                                                            )
                                                        }}
                                                        style={{ accentColor: 'var(--accent)', width: 'auto' }}
                                                    />
                                                    <i className="ti ti-user" style={{ color: 'var(--text-secondary)' }} />
                                                    {p.name}
                                                </label>
                                            )
                                        })}

                                        {noProfilesSelected && (
                                            <div style={{
                                                fontSize: 11,
                                                color: 'var(--danger)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '4px 8px'
                                            }}>
                                                <i className="ti ti-alert-triangle" />
                                                {t('editorProfileRequired') || 'Sélectionnez au moins un profil'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button className="btn-secondary btn-lg" onClick={() => {
                                    if (!savingRef.current) {
                                        if (!isTutorialMode()) {
                                            globalStep = 'trim'
                                            setStep('trim')
                                        } else {
                                            setTutorialStep('trim')
                                            globalStep = 'trim'
                                            setStep('trim')
                                        }
                                    }
                                }} style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}>
                                    <i className="ti ti-arrow-left" /> {t('ytBack')}
                                </button>
                                <button
                                    data-testid="youtube-save-button"
                                    className="youtube-save-button btn-primary btn-lg"
                                    onClick={handleSave}
                                    disabled={
                                        isProcessing ||
                                        !soundName.trim() ||
                                        !currentPath ||
                                        savingRef.current ||
                                        noProfilesSelected ||
                                        noUserProfiles
                                    }
                                    style={{ borderRadius: 'var(--radius-md)', minWidth: 200 }}
                                >
                                    {isProcessing
                                        ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('saving')}</>
                                        : <><i className="ti ti-check" /> {t('addToLibrary')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <ConfirmWrapper />
                </div>

                {showProgress && (
                    <div className="modal-overlay" style={{ zIndex: 100000 }}>
                        <div className="modal" style={{ width: 420, textAlign: 'center' }}>
                            <div className="modal-title" style={{ justifyContent: 'center' }}>
                                <i className="ti ti-save" style={{ color: downloadProgress >= 90 ? 'var(--success)' : 'var(--accent)' }} />
                                {t('saving')}
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <div style={{
                                    fontSize: 48,
                                    marginBottom: 16,
                                    color: downloadProgress >= 90 ? 'var(--success)' : 'var(--accent)'
                                }}>
                                    {downloadProgress >= 90 ? (
                                        <i className="ti ti-check" style={{ color: 'var(--success)' }} />
                                    ) : (
                                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                                    )}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                                    {downloadStatus}
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: 8,
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    marginBottom: 8
                                }}>
                                    <div style={{
                                        width: `${downloadProgress}%`,
                                        height: '100%',
                                        background: downloadProgress >= 90 ? 'var(--success)' : 'var(--accent)',
                                        borderRadius: 4,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    {Math.round(downloadProgress)}%
                                </div>
                                {downloadProgress < 90 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                                        {t('pleaseWait')}
                                    </div>
                                )}
                            </div>
                            <style>{`
                                @keyframes spin {
                                    from { transform: rotate(0deg); }
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    </div>
                )}

                <LoadingOverlay visible={isProcessing && !showProgress} message={t('saving')} />
            </>
        )
    }

    return null
}

// ─── PAGE HEADER ────────────────────────────────────────────────────────────────
function PageHeader({ title, sub, onBack }) {
    return (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {onBack && (
                <button className="btn-ghost" onClick={onBack} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <i className="ti ti-arrow-left" />
                </button>
            )}
            <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
            </div>
        </div>
    )
}