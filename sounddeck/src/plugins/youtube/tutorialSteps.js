// src/plugins/youtube/tutorialSteps.js

const MOCK_VIDEO_INFO = {
  id: 'a5uQMwRMHcs',
  title: 'SoundDeck - Tutoriel complet',
  duration: 300,
  thumbnail: 'https://i.ytimg.com/vi/a5uQMwRMHcs/maxresdefault.jpg',
  uploader: 'SoundDeck Official',
  platform: 'youtube',
  url: 'https://www.youtube.com/watch?v=a5uQMwRMHcs'
}

export const startYoutubeTutorial = () => {
  window.__youtubeTutorialActive = true
  window.__youtubeTutorialStartedAt = Date.now()
  window.__youtubeTutorialState = {
    videoInfo: { ...MOCK_VIDEO_INFO },
    downloadedPath: null,
    soundName: MOCK_VIDEO_INFO.title,
    start: 0,
    end: MOCK_VIDEO_INFO.duration,
    step: 'url',
    useThumbnail: false,
    customImage: null,
    emoji: '🎵',
    targetProfiles: ['all']
  }
  window.__isTutorialMode = true
  window.__tutorialPageId = 'youtube'
}

export const deactivateYoutubeTutorialMode = () => {
  window.__youtubeTutorialActive = false
  window.__youtubeTutorialStartedAt = null
  window.__youtubeTutorialState = null
  window.__isTutorialMode = false
  window.__tutorialPageId = null
}

export const finishYoutubeTutorial = () => {
  deactivateYoutubeTutorialMode()
  window.dispatchEvent(new CustomEvent('youtube-force-reset', { 
    detail: { timestamp: Date.now() } 
  }))
}

export const forceResetYoutubeComponent = () => {
  deactivateYoutubeTutorialMode()
  window.dispatchEvent(new CustomEvent('youtube-force-reset', { 
    detail: { timestamp: Date.now() } 
  }))
}

export const cleanupYoutubeTutorial = () => {
  const startedAt = window.__youtubeTutorialStartedAt || 0
  const elapsed = Date.now() - startedAt
  
  if (elapsed < 500 && window.__youtubeTutorialActive) {
    return
  }
  
  finishYoutubeTutorial()
}

export const isYoutubeTutorialActive = () => window.__youtubeTutorialActive === true

export const getTutorialState = () => window.__youtubeTutorialState || {
  videoInfo: { ...MOCK_VIDEO_INFO },
  downloadedPath: null,
  soundName: MOCK_VIDEO_INFO.title,
  start: 0,
  end: MOCK_VIDEO_INFO.duration,
  step: 'url',
  useThumbnail: false,
  customImage: null,
  emoji: '🎵',
  targetProfiles: ['all']
}

export const getMockVideoInfo = () => ({ ...MOCK_VIDEO_INFO })
export const getTutorialStep = () => window.__youtubeTutorialState?.step || 'url'

export const setTutorialStep = (step) => {
  if (window.__youtubeTutorialState) {
    window.__youtubeTutorialState.step = step
  }
}

export const mockFetchVideoInfo = () => new Promise((resolve) => {
  setTimeout(() => resolve({ success: true, data: { ...MOCK_VIDEO_INFO } }), 300)
})

export const mockDownloadAudio = (url, start, end, title) => new Promise((resolve) => {
  setTimeout(() => resolve({
    success: true,
    path: `C:/Users/.../SoundDeck/sounds/${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.mp3`,
    name: title
  }), 500)
})

export const mockSaveSound = () => new Promise((resolve) => {
  setTimeout(() => resolve({ success: true, message: 'Son sauvegardé avec succès' }), 400)
})

export const clickLoadButton = () => {
  const btn = document.querySelector('[data-testid="youtube-load-button"]') ||
              document.querySelector('.youtube-load-button')
  if (btn) { btn.click(); return true }
  return false
}

export const clickDownloadButton = () => {
  const btn = document.querySelector('[data-testid="youtube-download-button"]') ||
              document.querySelector('.youtube-download-button')
  if (btn) { btn.click(); return true }
  return false
}

export const clickSaveButton = () => {
  const btn = document.querySelector('[data-testid="youtube-save-button"]') ||
              document.querySelector('.youtube-save-button')
  if (btn) { btn.click(); return true }
  return false
}

// ✅ TUTORIAL STEPS — plus de texte en dur, uniquement des clés i18n
export const TUTORIAL_STEPS = (t) => {
  const steps = [
    {
      id: 'youtube-1',
      title: t('tutorialYoutubeStep1Title'),
      description: t('tutorialYoutubeStep1Desc'),
      icon: '📋',
      target: '[data-testid="youtube-url-input"], .youtube-url-input',
      fallbackTarget: '.youtube-container input[type="text"]',
      hint: t('tutorialYoutubeStep1Hint'),
      position: 'bottom',
    },
    {
      id: 'youtube-2',
      title: t('tutorialYoutubeStep2Title'),
      description: t('tutorialYoutubeStep2Desc'),
      icon: '🔄',
      target: '[data-testid="youtube-load-button"], .youtube-load-button',
      fallbackTarget: '.youtube-container button:has(.ti-search)',
      hint: t('tutorialYoutubeStep2Hint'),
      position: 'bottom',
      afterNextStep: () => clickLoadButton(),
      afterNextStepDelay: 1200,
    },
    {
      id: 'youtube-3',
      title: t('tutorialYoutubeStep3Title'),
      description: t('tutorialYoutubeStep3Desc'),
      icon: '✂️',
      target: '[data-testid="youtube-trim-controls"], .youtube-trim-controls',
      fallbackTarget: '.youtube-container input[type="range"]',
      hint: t('tutorialYoutubeStep3Hint'),
      position: 'bottom',
    },
    {
      id: 'youtube-4',
      title: t('tutorialYoutubeStep4Title'),
      description: t('tutorialYoutubeStep4Desc'),
      icon: '⬇️',
      target: '[data-testid="youtube-download-button"], .youtube-download-button',
      fallbackTarget: '.youtube-container button:has(.ti-download)',
      hint: t('tutorialYoutubeStep4Hint'),
      position: 'bottom',
      afterNextStep: () => clickDownloadButton(),
      afterNextStepDelay: 1500,
    },
    {
      id: 'youtube-5',
      title: t('tutorialYoutubeStep5Title'),
      description: t('tutorialYoutubeStep5Desc'),
      icon: '⚙️',
      target: '[data-testid="youtube-save-controls"], .youtube-save-controls',
      fallbackTarget: '.youtube-container .option-row',
      hint: t('tutorialYoutubeStep5Hint'),
      position: 'bottom',
    },
    {
      id: 'youtube-6',
      title: t('tutorialYoutubeStep6Title'),
      description: t('tutorialYoutubeStep6Desc'),
      icon: '📚',
      target: '[data-testid="youtube-save-button"], .youtube-save-button',
      fallbackTarget: '.youtube-container button:has(.ti-check)',
      hint: t('tutorialYoutubeStep6Hint'),
      position: 'bottom',
      afterNextStep: () => clickSaveButton(),
      afterNextStepDelay: 1200,
    },
  ]
  return steps
}