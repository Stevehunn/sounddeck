/**
 * @file YouTube Import plugin page.
 *
 * Three-step flow:
 * 1. **URL** (`UrlStep`) → user pastes a YouTube / Spotify / SoundCloud URL
 * 2. **Trim** (`TrimStep`) → user picks a portion of the audio
 * 3. **Save** (`SaveStep`) → user configures name, image, emoji, profiles
 *
 * The component uses a **module-scope state object** (`youtubeModuleState`)
 * to persist the current step / video info / downloaded path across
 * mounts. This means navigating away and back preserves the user's place
 * in the flow (and avoids re-downloading when the user changes something
 * in another tab).
 *
 * **Tutorial mode**: when `isYoutubeTutorialActive()` is true, every
 * network and file operation is replaced by a mock (see
 * `./tutorialSteps.js`). The page then runs entirely on fake data to
 * demo the flow to new users. The tutorial start/finish is controlled
 * from the global `Tutorial.jsx`.
 *
 * **Auto-update of the yt-dlp status**: if the user installs yt-dlp from
 * another tab, `youtubeModuleState.checkDone` + `forceUpdateListeners`
 * let this component refresh its status without a reload.
 *
 * **Detect platform**: `detectPlatform()` from `platformImport.js` picks
 * the right fetcher (`youtubeInfo` / `getSpotifyTrack` /
 * `getSoundCloudTrack`), so the flow works for all three platforms.
 *
 * @see ./tutorialSteps.js — mock helpers for tutorial mode
 * @see ./components/UrlStep.jsx, ./components/TrimStep.jsx, ./components/SaveStep.jsx
 * @see ./components/StatusViews.jsx — CheckingView, MissingYtdlpView
 * @see ./components/DownloadProgressModal.jsx — progress modal
 * @see @shared/utils/platformImport.js — detectPlatform + fetchers
 */

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
import { logWarn, logError } from '@shared/utils/logger'

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

/**
 * Module-scope state — persists across mounts so the user's place in
 * the flow isn't lost when they navigate away and back.
 *
 * @type {{
 *   ytdlpStatus: 'available' | 'missing' | null,
 *   checkDone: boolean,
 *   checkPromise: Promise<string> | null,
 *   checkStarted: boolean,
 *   videoInfo: Object | null,
 *   step: 'url' | 'trim' | 'save',
 *   soundName: string,
 *   end: number,
 *   downloadedPath: string | null,
 *   platform: 'youtube' | 'spotify' | 'soundcloud' | null,
 * }}
 */
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

/** How long the 100% state of the progress modal is shown, in ms. */
const PROGRESS_CLOSE_DELAY = 500

/**
 * YouTube Import page.
 *
 * @param {Object} props
 * @param {{
 *   sounds: Array,
 *   profiles: Array<{ id: string, name: string, isDefault?: boolean }>,
 *   currentProfileId: string,
 *   addSound: (data: Object) => Promise<void>
 * }} props.store - App store.
 * @param {(msg: string, type?: string) => void} [props.addToast]
 * @returns {JSX.Element|null}
 */
export default function YouTube({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const { ensureOnline } = useNetwork()

  // ─── INITIAL STATE ─────────────────────────────────────────────────
  // Computed once via `useState` initializers so no `setState` runs
  // synchronously in a mount effect (React 19 rule).
  const [ytdlpStatus, setYtdlpStatus] = useState(() => {
    if (isYoutubeTutorialActive()) return 'available'
    return youtubeModuleState.checkDone
      ? youtubeModuleState.ytdlpStatus ?? 'missing'
      : 'checking'
  })
  // Ignore the value, only keep the setter (used to force re-renders)
  const [, setForceRender] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [url, setUrl] = useState('')

  const [videoInfo, setVideoInfo] = useState(() => {
    if (isYoutubeTutorialActive()) return getMockVideoInfo()
    return youtubeModuleState.videoInfo
  })
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(() => {
    if (isYoutubeTutorialActive()) {
      return getMockVideoInfo().duration || 0
    }
    return youtubeModuleState.end
  })
  const [soundName, setSoundName] = useState(() => {
    if (isYoutubeTutorialActive()) {
      return getMockVideoInfo().title || ''
    }
    return youtubeModuleState.soundName
  })
  const [targetProfiles, setTargetProfiles] = useState(() => {
    // Only auto-init if we're already on the 'save' step (e.g. remount)
    const isTutorial = isYoutubeTutorialActive()
    const initialStep = isTutorial
      ? getTutorialState().step
      : youtubeModuleState.step
    if (initialStep !== 'save') return []

    const userProfiles = store.profiles.filter((p) => p.id !== 'all')
    if (userProfiles.length === 0) return ['all']
    if (isTutorial) return userProfiles.map((p) => p.id)
    const currentId = store.currentProfileId
    if (
      currentId &&
      currentId !== 'all' &&
      userProfiles.some((p) => p.id === currentId)
    ) {
      return [currentId]
    }
    return [userProfiles[0].id]
  })
  const [emoji, setEmoji] = useState('🎵')
  const [step, setStep] = useState(() => {
    if (isYoutubeTutorialActive()) {
      return getTutorialState().step || 'url'
    }
    return youtubeModuleState.step
  })
  const [downloadedPath, setDownloadedPath] = useState(
    youtubeModuleState.downloadedPath,
  )
  const [importing, setImporting] = useState(false)
  const [platform, setPlatform] = useState(youtubeModuleState.platform)
  const [customImage, setCustomImage] = useState(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewHowl, setPreviewHowl] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [useThumbnail, setUseThumbnail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // ─── REFS ──────────────────────────────────────────────────────────
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
  useEffect(() => {
    tRef.current = t
  }, [t])

  // ─── HELPERS ───────────────────────────────────────────────────────
  /**
   * Returns whether tutorial mode is currently active.
   *
   * @returns {boolean}
   */
  const isTutorialMode = useCallback(() => isYoutubeTutorialActive(), [])

  /**
   * Resolves the final image for the sound being saved:
   * - YouTube thumbnail if `useThumbnail` is on
   * - Custom image otherwise
   *
   * @returns {string|null}
   */
  const getFinalImage = useCallback(() => {
    if (useThumbnail && videoInfo?.thumbnail) return videoInfo.thumbnail
    return customImage || null
  }, [useThumbnail, videoInfo, customImage])

  /**
   * Initializes `targetProfiles` from the current store state when the
   * user transitions to the 'save' step (or when remounting on that
   * step).
   *
   * Priority:
   * 1. All user profiles in tutorial mode
   * 2. Current profile if it's a user profile
   * 3. First user profile
   * 4. Fallback: `['all']` if no user profiles exist
   *
   * No-op if `targetProfiles` is already populated.
   *
   * @returns {void}
   */
  const initializeTargetProfiles = useCallback(() => {
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
    if (
      currentId &&
      currentId !== 'all' &&
      userProfiles.some((p) => p.id === currentId)
    ) {
      setTargetProfiles([currentId])
    } else {
      setTargetProfiles([userProfiles[0].id])
    }
  }, [
    store.profiles,
    store.currentProfileId,
    isTutorialMode,
    targetProfiles,
  ])

  // ─── MOUNT EFFECTS ─────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (step !== 'save') return
    if (targetProfiles.length > 0) return
    // Defer via setTimeout so the setState inside `initializeTargetProfiles`
    // doesn't run synchronously in the effect body.
    const timer = setTimeout(initializeTargetProfiles, 0)
    return () => clearTimeout(timer)
  }, [step, targetProfiles.length, initializeTargetProfiles])

  // ─── RESET EVENT ───────────────────────────────────────────────────
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
      setIsSaving(false)
    }

    window.addEventListener('youtube-force-reset', handleForceReset)
    return () =>
      window.removeEventListener('youtube-force-reset', handleForceReset)
  }, [])

  // ─── YT-DLP STATUS ─────────────────────────────────────────────────
  /**
   * Checks whether yt-dlp is installed and returns its status.
   *
   * Deduplicated: multiple concurrent calls share the same in-flight
   * promise (`youtubeModuleState.checkPromise`). Once a check succeeds
   * (`checkDone = true`), subsequent calls return the cached result.
   *
   * In tutorial mode, always returns `'available'` (no real check).
   *
   * @returns {Promise<'available' | 'missing'>}
   */
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
        logError('YouTube', 'Error in existing promise', error)
        setYtdlpStatus('missing')
        return 'missing'
      }
    }

    youtubeModuleState.checkPromise = (async () => {
      try {
        const result = await window.electronAPI.checkYtdlp()
        youtubeModuleState.ytdlpStatus = result?.available
          ? 'available'
          : 'missing'
        youtubeModuleState.checkDone = true
        setYtdlpStatus(youtubeModuleState.ytdlpStatus)
        forceUpdateListenersRef.current.forEach((listener) => {
          try {
            listener()
          } catch {
            /* noop — listener errors are non-fatal */
          }
        })
        return youtubeModuleState.ytdlpStatus
      } catch (error) {
        logError('YouTube', 'Error in checkYtdlp', error)
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
    } catch {
      return 'missing'
    }
  }, [ytdlpStatus, isTutorialMode])

  // ─── INIT EFFECT (run once) ────────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    hasCompletedSave.current = false

    // Capture the ref's value in a local variable so cleanup doesn't
    // read `forceUpdateListenersRef.current` (which may have changed).
    const listenersRef = forceUpdateListenersRef.current

    const listener = () => {
      setForceRender((prev) => prev + 1)
      if (youtubeModuleState.checkDone) {
        setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
      }
    }
    listenersRef.push(listener)

    // Defer all sync setState / init calls via setTimeout(0) so they
    // don't run synchronously inside the effect body.
    const initTimer = setTimeout(() => {
      if (isTutorialMode()) {
        youtubeModuleState.ytdlpStatus = 'available'
        youtubeModuleState.checkDone = true
        setYtdlpStatus('available')
        // Trigger re-render in case tutorial mock info needs to be shown
        setForceRender((prev) => prev + 1)
      } else if (youtubeModuleState.checkDone) {
        setYtdlpStatus(youtubeModuleState.ytdlpStatus ?? 'missing')
      } else if (!youtubeModuleState.checkStarted) {
        youtubeModuleState.checkStarted = true
        checkYtdlp()
      }
    }, 0)

    return () => {
      clearTimeout(initTimer)
      const idx = listenersRef.indexOf(listener)
      if (idx > -1) listenersRef.splice(idx, 1)
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

  // ─── PREVIEW CLEANUP ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewHowl) {
        previewHowl.stop()
        previewHowl.unload()
      }
    }
  }, [previewHowl])

  // ─── PROGRESS SIMULATION ───────────────────────────────────────────
  /**
   * Starts the simulated progress bar (0 → 95%) for the download step.
   *
   * The real progress is unknown (yt-dlp doesn't report granular
   * progress), so we simulate it with a decelerating curve and jump to
   * 100% when the actual download finishes.
   *
   * The status label changes as the simulation progresses
   * (downloading → extracting → converting → finalizing).
   *
   * @returns {void}
   */
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

  /**
   * Stops the simulated progress interval (idempotent).
   *
   * @returns {void}
   */
  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // ─── HANDLERS ──────────────────────────────────────────────────────
  /**
   * Installs yt-dlp via `electronAPI.downloadYtdlp()`.
   *
   * Shows toasts on success / failure. On network error, falls back to
   * `ensureOnline()` to display the network banner.
   *
   * @returns {Promise<void>}
   */
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
          t('ytdlpInstallError', {
            detail: result?.error || t('unknownError'),
          }),
          'error',
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

  /**
   * Fetches video info for the current URL.
   *
   * Detects the platform (YouTube / Spotify / SoundCloud), calls the
   * matching IPC method, and advances to the 'trim' step on success.
   *
   * In tutorial mode, uses `mockFetchVideoInfo()`.
   *
   * @returns {Promise<void>}
   */
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
        addToast(
          t('ytFetchError', { detail: result?.error || t('unknownError') }),
          'error',
        )
        return
      }

      if (result?.success) {
        const data = result.data || result
        const info = {
          title: data.title || t('unknownTitle'),
          duration: data.duration || 0,
          thumbnail: data.thumbnail || data.cover || null,
          uploader: data.uploader || data.artist || t('unknownArtist'),
          url: isTutorialMode()
            ? 'https://www.youtube.com/watch?v=a5uQMwRMHcs'
            : url.trim(),
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
          t('platformDetected', {
            platform: info.platform || t('platformYoutube'),
          }),
          'success',
        )
      } else {
        addToast(
          t('ytFetchError', { detail: result?.error || t('unknownError') }),
          'error',
        )
      }
    } catch (error) {
      logError('YouTube', 'Error in handleFetchInfo', error)
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

  /**
   * Toggles audio preview for the downloaded file.
   *
   * A single `<Howl>` instance is reused; toggling again stops it.
   *
   * @param {string} filePath - Path to the local MP3.
   * @returns {void}
   */
  const togglePreview = useCallback(
    (filePath) => {
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
        logError('YouTube', 'Error in togglePreview', error)
        addToast(t('ytPreviewError'), 'error')
      }
    },
    [previewHowl, isPreviewPlaying, addToast, t],
  )

  /**
   * Downloads the audio for the current video (or the selected portion).
   *
   * On success: advances to the 'save' step, initializes target profiles,
   * then (after a short delay) closes the progress modal and shows the
   * "audio ready" toast.
   *
   * In tutorial mode, uses `mockDownloadAudio()`.
   *
   * @returns {Promise<void>}
   */
  const handleDownloadAudio = useCallback(async () => {
    const currentVideoInfo = videoInfo || youtubeModuleState.videoInfo
    const currentPlatform = platform || youtubeModuleState.platform

    if (!currentVideoInfo) {
      addToast(t('ytFetchError', { detail: t('unknownError') }), 'error')
      return
    }

    if (isProcessingRef.current) return

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
          soundName || currentVideoInfo.title,
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
            currentVideoInfo.title,
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
        initializeTargetProfiles()

        // Show 100% for a moment, then close the progress modal + toast.
        setTimeout(() => {
          setShowProgress(false)
          setIsProcessing(false)
          addToast(tRef.current('ytAudioReady'), 'success')
        }, PROGRESS_CLOSE_DELAY)

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
        addToast(
          t('ytDownloadError', {
            detail: result?.error || t('unknownError'),
          }),
          'error',
        )
      }
    } catch (error) {
      logError('YouTube', 'Error downloading audio', error)
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
    videoInfo,
    platform,
    soundName,
    start,
    end,
    addToast,
    t,
    startProgressSimulation,
    stopProgressSimulation,
    isTutorialMode,
    ensureOnline,
    initializeTargetProfiles,
  ])

  /**
   * Saves the sound to the library.
   *
   * Sequence:
   * 1. Validate name / path / profiles.
   * 2. If a sound with the same name exists, ask for confirmation.
   * 3. Download the thumbnail if `useThumbnail` is on.
   * 4. Call `store.addSound()`.
   * 5. Show progress + success toast, reset state.
   *
   * `savingRef` + `hasCompletedSave` act as double-click guards.
   *
   * @returns {Promise<void>}
   */
  const handleSave = useCallback(async () => {
    if (savingRef.current || hasCompletedSave.current) return

    const currentSoundName = soundName || youtubeModuleState.soundName
    const currentDownloadedPath =
      downloadedPath || youtubeModuleState.downloadedPath
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
      addToast(
        t('editorProfileRequired') || 'Select at least one profile',
        'error',
      )
      return
    }

    const existingSound = store.sounds.find(
      (s) =>
        s.name.toLowerCase() === currentSoundName.trim().toLowerCase(),
    )
    if (existingSound && !isTutorialMode()) {
      const confirmed = await confirm({
        title: t('soundExists'),
        message: t('soundExistsConfirm').replace(
          '{name}',
          currentSoundName.trim(),
        ),
        type: 'warning',
      })
      if (!confirmed) return
    }

    savingRef.current = true
    hasCompletedSave.current = true
    setIsSaving(true)
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

    // Snapshot the module state so we can roll back on error
    const savedGlobals = {
      step: youtubeModuleState.step,
      videoInfo: youtubeModuleState.videoInfo,
      soundName: youtubeModuleState.soundName,
      end: youtubeModuleState.end,
      downloadedPath: youtubeModuleState.downloadedPath,
      platform: youtubeModuleState.platform,
    }

    // Reset module state optimistically (so a nav-away is safe)
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
                currentSoundName,
              )
              imageToSave = result?.success
                ? result.path
                : videoInfo.thumbnail
            } else {
              imageToSave = videoInfo.thumbnail
            }
          } catch (e) {
            logWarn('YouTube', 'Error downloading thumbnail', e)
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

      addToast(
        t('ytSoundAdded', { name: currentSoundName.trim() }),
        'success',
      )

      // Reset local state back to the URL step
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
        setIsSaving(false)
      }, 500)
    } catch (error) {
      logError('YouTube', 'Error saving', error)
      clearInterval(saveInterval)

      // Roll back module state so the user can retry
      youtubeModuleState.step = savedGlobals.step
      youtubeModuleState.videoInfo = savedGlobals.videoInfo
      youtubeModuleState.soundName = savedGlobals.soundName
      youtubeModuleState.end = savedGlobals.end
      youtubeModuleState.downloadedPath = savedGlobals.downloadedPath
      youtubeModuleState.platform = savedGlobals.platform

      savingRef.current = false
      hasCompletedSave.current = false
      setIsSaving(false)
      setIsProcessing(false)
      setShowProgress(false)
      setDownloadProgress(0)
      setDownloadStatus('')
      addToast(t('ytSaveError', { detail: error.message }), 'error')
    }
  }, [
    soundName,
    downloadedPath,
    getFinalImage,
    useThumbnail,
    videoInfo,
    targetProfiles,
    store,
    addToast,
    t,
    confirm,
    previewHowl,
    emoji,
    isTutorialMode,
  ])

  /**
   * Opens the native image picker, imports the selected image into the
   * app's images directory, and sets it as the custom image.
   *
   * @returns {Promise<void>}
   */
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

  // ─── RENDER ────────────────────────────────────────────────────────
  const currentStep = step || youtubeModuleState.step
  const currentVideoInfo = videoInfo || youtubeModuleState.videoInfo
  const currentDownloadedPath =
    downloadedPath || youtubeModuleState.downloadedPath
  const finalImage = getFinalImage()

  // ─── GUARD: reset module state if steps have no data ──────────────
  // Handles edge cases where the user reaches 'trim' or 'save' without
  // the required data (e.g. after a hard reset from another tab).
  // Moving this out of the render body satisfies `react-hooks/immutability`.
  useEffect(() => {
    const hasVideo =
      videoInfo || youtubeModuleState.videoInfo
    const hasDownloaded =
      downloadedPath || youtubeModuleState.downloadedPath

    if (step === 'trim' && !hasVideo) {
      youtubeModuleState.step = 'url'
      // Defer setState out of the effect body (React 19 rule)
      setTimeout(() => setStep('url'), 0)
    } else if (step === 'save' && (!hasVideo || !hasDownloaded)) {
      if (!savingRef.current) {
        youtubeModuleState.step = 'url'
        setTimeout(() => setStep('url'), 0)
      }
    }
  }, [step, videoInfo, downloadedPath])

  if (ytdlpStatus === 'checking') {
    return (
      <>
        <CheckingView />
        <LoadingOverlay visible={true} message={t('ytdlpChecking')} />
      </>
    )
  }

  if (ytdlpStatus === 'missing' && !isTutorialMode()) {
    return (
      <>
        <MissingYtdlpView
          onInstall={handleInstallYtdlp}
          downloading={downloading}
        />
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
    // The effect above already handles the "no data" case
    if (!info) return null
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

    // The effect above already handles the "no data" case
    if (!info || !currentPath) return null
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
          savingRef={isSaving}
          onBack={() => {
            if (!isSaving) {
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
        <LoadingOverlay
          visible={isProcessing && !showProgress}
          message={t('saving')}
        />
        <ConfirmWrapper />
      </>
    )
  }

  return null
}