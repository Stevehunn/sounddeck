// src/test/utils/fixtures.js

export const createSound = (overrides = {}) => ({
  id: 'sound-1',
  name: 'Test Sound',
  path: '/fake/sounds/test.mp3',
  image: null,
  emoji: '🔊',
  favorites: [],
  profiles: ['all'],
  volume: 0,
  volumeDb: 0,
  playCount: 0,
  lastPlayed: null,
  createdAt: Date.now(),
  ...overrides,
})

export const createProfile = (overrides = {}) => ({
  id: 'profile-1',
  name: 'Test Profile',
  isDefault: false,
  ...overrides,
})

export const createClip = (overrides = {}) => ({
  id: 'clip-1',
  soundId: 'sound-1',
  name: 'Test Clip',
  path: '/fake/sounds/test.mp3',
  start: 0,
  duration: 3,
  offset: 0,
  volume: 0,
  volumeDb: 0,
  effects: [],
  fadeIn: 0,
  fadeOut: 0,
  pitch: 0,
  speed: 1,
  ...overrides,
})

export const createTrack = (overrides = {}) => ({
  id: 'track-1',
  name: 'Track 1',
  color: '#3b82f6',
  clips: [],
  volume: 1,
  muted: false,
  solo: false,
  effects: [],
  ...overrides,
})

export const createProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Project',
  tracks: [],
  markers: [],
  loops: {
    clips: {},
    tracks: {},
    timeline: { enabled: false, start: 0, end: 10 },
  },
  duration: 60,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const createPlaylist = (overrides = {}) => ({
  id: 'playlist-1',
  name: 'Test Playlist',
  items: [],
  loop: false,
  createdAt: Date.now(),
  ...overrides,
})

export const createStore = (overrides = {}) => ({
  sounds: [],
  profiles: [{ id: 'all', name: 'Tous les sons', isDefault: true }],
  currentProfileId: 'all',
  shortcuts: {},
  volume: 80,
  audioDevice: 'default',
  playLocally: true,
  theme: 'dark',
  lang: 'fr',
  loading: false,
  ...overrides,
})