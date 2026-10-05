// src/test/features/editor/contexts/EditorContext.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── MOCKS : tous les hooks internes ───────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@features/editor/contexts/hooks/useEditorCore', () => ({
  useEditorCore: vi.fn(() => ({
    project: { tracks: [], markers: [] },
    setProject: vi.fn(),
    selectedClipId: null,
    setSelectedClipId: vi.fn(),
    selectedTrackId: null,
    setSelectedTrackId: vi.fn(),
    currentTime: 0,
    setCurrentTime: vi.fn(),
    isPlaying: false,
    setIsPlaying: vi.fn(),
    isPaused: false,
    setIsPaused: vi.fn(),
    isPlayingRef: { current: false },
    isPausedRef: { current: false },
    currentTimeRef: { current: 0 },
    stopAtTime: null,
    setStopAtTime: vi.fn(),
    soloPlayClipId: null,
    setSoloPlayClipId: vi.fn(),
    masterGain: 1,
    setMasterGain: vi.fn(),
    zoomLevel: 1,
    setZoomLevel: vi.fn(),
    snapEnabled: true,
    setSnapEnabled: vi.fn(),
    autoCrossfade: false,
    setAutoCrossfade: vi.fn(),
    clipDurations: {},
    setClipDurations: vi.fn(),
    waveformData: {},
    setWaveformData: vi.fn(),
    isDurationsLoaded: true,
    totalDuration: 60,
    isInitialized: true,
    isLoading: false,
    isDirty: false,
    isAutoSaving: false,
    canUndoEditor: false,
    canRedoEditor: false,
    undoEditor: vi.fn(),
    redoEditor: vi.fn(),
    pushEditorHistoryCheckpoint: vi.fn(),
    updateEditorProjectName: vi.fn(),
    reorderTracks: vi.fn(),
    loadProject: vi.fn(),
    commitProject: vi.fn(),
    loopState: {},
    setLoopState: vi.fn(),
    loopRegion: null,
    actionOverlay: { type: null },
    storeRef: { current: {} },
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorAudioPlayback', () => ({
  useEditorAudioPlayback: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    togglePlay: vi.fn(),
    playClipOnly: vi.fn(),
    audioSourcesRef: { current: [] },
    audioContextRef: { current: null },
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorTracks', () => ({
  useEditorTracks: vi.fn(() => ({
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    renameTrack: vi.fn(),
    muteTrack: vi.fn(),
    soloTrack: vi.fn(),
    setTrackVolume: vi.fn(),
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorClips', () => ({
  useEditorClips: vi.fn(() => ({
    addClip: vi.fn(),
    addClipFromFile: vi.fn(),
    removeClip: vi.fn(),
    updateClip: vi.fn(),
    duplicateClip: vi.fn(),
    moveClip: vi.fn(),
    splitClip: vi.fn(),
    selectClip: vi.fn(),
    deselectClip: vi.fn(),
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorEffects', () => ({
  useEditorEffects: vi.fn(() => ({
    addEffectToClip: vi.fn(),
    removeEffectFromClip: vi.fn(),
    updateEffectParam: vi.fn(),
    toggleEffect: vi.fn(),
    setClipFade: vi.fn(),
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorLoops', () => ({
  useEditorLoops: vi.fn(() => ({
    toggleClipLoop: vi.fn(),
    updateClipLoopOptions: vi.fn(),
    setTimelineLoop: vi.fn(),
    toggleTimelineLoop: vi.fn(),
    setLoopRegion: vi.fn(),
    toggleLoop: vi.fn(),
    clearLoop: vi.fn(),
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorOverlay', () => ({
  useEditorOverlay: vi.fn(() => ({
    cancelActionOverlay: vi.fn(),
    executeActionOverlay: vi.fn(),
    activateLoopManualClick: vi.fn(),
    activateTimelineLoopManualClick: vi.fn(),
    activateSplitManualClick: vi.fn(),
  })),
}))

vi.mock('@features/editor/contexts/hooks/useEditorMarkers', () => ({
  useEditorMarkers: vi.fn(() => ({
    addMarker: vi.fn(),
    removeMarker: vi.fn(),
    updateMarker: vi.fn(),
    navigateToMarker: vi.fn(),
  })),
}))

import { EditorProvider, useEditor } from '@features/editor/contexts/EditorContext'

// ─── HELPERS ───────────────────────────────────────────────────────────
const TestConsumer = () => {
  const ctx = useEditor()
  return (
    <div data-testid="consumer">
      <div data-testid="has-project">{ctx.project ? 'yes' : 'no'}</div>
      <div data-testid="tracks-count">{ctx.tracks.length}</div>
      <div data-testid="zoom">{ctx.zoomLevel}</div>
      <div data-testid="snap">{String(ctx.snapEnabled)}</div>
      <div data-testid="total">{ctx.totalDuration}</div>
      <div data-testid="is-overlay">{String(ctx.isActionOverlayActive)}</div>
      <div data-testid="has-play">{typeof ctx.play}</div>
      <div data-testid="has-addTrack">{typeof ctx.addTrack}</div>
      <div data-testid="has-addClip">{typeof ctx.addClip}</div>
    </div>
  )
}

const defaultProps = (overrides = {}) => ({
  store: { sounds: [], profiles: [{ id: 'all', name: 'All' }] },
  addToast: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  ...overrides,
})

const renderWithProvider = (props = {}) => {
  return render(
    <EditorProvider {...defaultProps(props)}>
      <TestConsumer />
    </EditorProvider>
  )
}

describe('EditorContext', () => {
  describe('Rendu', () => {
    it('fournit le projet au consumer', () => {
      renderWithProvider()
      expect(screen.getByTestId('has-project').textContent).toBe('yes')
    })

    it('expose tracks (vide si project.tracks absent)', () => {
      renderWithProvider()
      expect(screen.getByTestId('tracks-count').textContent).toBe('0')
    })

    it('expose zoomLevel', () => {
      renderWithProvider()
      expect(screen.getByTestId('zoom').textContent).toBe('1')
    })

    it('expose snapEnabled', () => {
      renderWithProvider()
      expect(screen.getByTestId('snap').textContent).toBe('true')
    })

    it('expose totalDuration', () => {
      renderWithProvider()
      expect(screen.getByTestId('total').textContent).toBe('60')
    })
  })

  describe('Fonctions', () => {
    it('expose play (useEditorAudioPlayback)', () => {
      renderWithProvider()
      expect(screen.getByTestId('has-play').textContent).toBe('function')
    })

    it('expose addTrack (useEditorTracks)', () => {
      renderWithProvider()
      expect(screen.getByTestId('has-addTrack').textContent).toBe('function')
    })

    it('expose addClip (useEditorClips)', () => {
      renderWithProvider()
      expect(screen.getByTestId('has-addClip').textContent).toBe('function')
    })
  })

  describe('ActionOverlay', () => {
    it('isActionOverlayActive=false si actionOverlay.type=null', () => {
      renderWithProvider()
      expect(screen.getByTestId('is-overlay').textContent).toBe('false')
    })
  })

  describe('useEditor hors Provider', () => {
    it('throw une erreur explicite', () => {
      // Capture l'erreur console React
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => render(<TestConsumer />)).toThrow(
        /useEditor must be used within EditorProvider/
      )

      spy.mockRestore()
    })
  })
})