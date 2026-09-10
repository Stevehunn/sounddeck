// src/plugins/youtube/tutorialMockData.js

// ✅ Données mock pour le tutoriel YouTube
export const MOCK_VIDEO_INFO = {
  id: 'a5uQMwRMHcs',
  title: 'SoundDeck - Tutoriel complet',
  duration: 300, // 5 minutes
  thumbnail: 'https://i.ytimg.com/vi/a5uQMwRMHcs/maxresdefault.jpg',
  uploader: 'SoundDeck Official',
  platform: 'youtube',
  url: 'https://www.youtube.com/watch?v=a5uQMwRMHcs'
}

// ✅ Données mock pour le téléchargement
export const MOCK_DOWNLOAD_RESULT = {
  success: true,
  path: 'C:/Users/.../SoundDeck/sounds/SoundDeck_Tutoriel_complet_1234567890.mp3',
  name: 'SoundDeck - Tutoriel complet'
}

// ✅ État mock pour simuler les étapes du tutoriel
export const TUTORIAL_MOCK_STATE = {
  step: 'url',
  videoInfo: null,
  downloadedPath: null,
  soundName: '',
  start: 0,
  end: 0,
  platform: null,
  useThumbnail: false,
  customImage: null,
  emoji: '🎵'
}

// ✅ Fonction pour simuler la récupération des infos
export const mockFetchVideoInfo = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { ...MOCK_VIDEO_INFO }
      })
    }, 300) // Simuler un délai réseau
  })
}

// ✅ Fonction pour simuler le téléchargement
export const mockDownloadAudio = (url, start, end, title) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        path: `C:/Users/.../SoundDeck/sounds/${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.mp3`,
        name: title
      })
    }, 500) // Simuler un téléchargement
  })
}

// ✅ Fonction pour obtenir la durée simulée
export const getMockDuration = () => MOCK_VIDEO_INFO.duration