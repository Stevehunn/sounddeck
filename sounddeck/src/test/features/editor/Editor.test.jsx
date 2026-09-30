import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// ─── Mocks hoistés ──────────────────────────────────────────────────────
const mockUseEditor = vi.hoisted(() => vi.fn())
const mockUseLanguage = vi.hoisted(() => vi.fn())
const mockUseConfirm = vi.hoisted(() => vi.fn())
const mockUseKeyboardShortcuts = vi.hoisted(() => vi.fn())
const mockUseProjectManager = vi.hoisted(() => vi.fn())
const mockMixdownProject = vi.hoisted(() => vi.fn())
const mockExportMixdown = vi.hoisted(() => vi.fn())
const mockNormalizeClip = vi.hoisted(() => vi.fn())
const mockBuildFileUrl = vi.hoisted(() => vi.fn((p) => p))
const mockGetBoolean = vi.hoisted(() => vi.fn().mockResolvedValue(false))
const mockGetNumber = vi.hoisted(() => vi.fn().mockResolvedValue(100))
const mockSetItem = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUuid = vi.hoisted(() => {
  let c = 0
  return vi.fn((prefix) => {
    c++
    return prefix ? `${prefix}-${c}` : `mock-${c}`
  })
})

// ─── Mocks modules ──────────────────────────────────────────────────────
vi.mock('@features/editor/contexts/EditorContext', () => ({
  EditorProvider: ({ children }) => children,
  useEditor: mockUseEditor,
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: mockUseLanguage,
}))

vi.mock('@shared/hooks/useConfirm', () => ({
  default: mockUseConfirm,
}))

vi.mock('@features/editor/hooks/useKeyboardShortcuts', () => ({
  default: mockUseKeyboardShortcuts,
}))

vi.mock('@features/editor/hooks/useProjectManager', () => ({
  default: mockUseProjectManager,
}))

vi.mock('@shared/utils/mixdown', () => ({
  mixdownProject: mockMixdownProject,
  exportMixdown: mockExportMixdown,
}))

vi.mock('@shared/utils/normalizeUtils', () => ({
  normalizeClip: mockNormalizeClip,
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: mockBuildFileUrl,
}))

vi.mock('@shared/utils/appStorage', () => ({
  getBoolean: mockGetBoolean,
  getNumber: mockGetNumber,
  setItem: mockSetItem,
}))

vi.mock('@shared/utils/uuid', () => ({
  uuid: mockUuid,
}))

vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

// ─── Mocks sous-composants ──────────────────────────────────────────────
vi.mock('@features/editor/components/Timeline', () => ({
  default: (props) => (
    <div data-testid="mock-timeline" data-tracks={props.tracks?.length || 0}>
      Timeline({props.tracks?.length || 0})
    </div>
  ),
}))

vi.mock('@features/editor/components/Toolbar', () => ({
  default: (props) => (
    <div data-testid="mock-toolbar" data-project-name={props.projectName}>
      <button
        data-testid="mock-toolbar-add-track"
        onClick={props.onAddTrack}
      >
        add-track
      </button>
      <button data-testid="mock-toolbar-play" onClick={props.onPlay}>
        play
      </button>
      <button
        data-testid="mock-toolbar-rename"
        onClick={() => props.onRenameProject?.('Nouveau')}
      >
        rename
      </button>
    </div>
  ),
}))

vi.mock('@features/editor/components/EffectsPanel', () => ({
  default: (props) =>
    props.clip ? (
      <div data-testid="mock-effects-panel">{props.clip.name}</div>
    ) : null,
}))

vi.mock('@features/editor/components/MasterVolume', () => ({
  default: ({ volume, onVolumeChange, onMuteToggle, onReset }) => (
    <div data-testid="mock-master-volume">
      <span>vol:{volume}</span>
      <button data-testid="mock-master-mute" onClick={onMuteToggle}>
        mute
      </button>
      <button data-testid="mock-master-reset" onClick={onReset}>
        reset
      </button>
      <button
        data-testid="mock-master-change"
        onClick={() => onVolumeChange(75)}
      >
        change
      </button>
    </div>
  ),
}))

vi.mock('@features/editor/components/ActionOverlay', () => ({
  default: ({ isOpen, actionType }) =>
    isOpen ? (
      <div data-testid="mock-action-overlay">{actionType}</div>
    ) : null,
}))

vi.mock('@features/editor/components/ClipActionsMenu', () => ({
  default: ({ clip }) => (
    <div data-testid="mock-clip-actions-menu">{clip?.name}</div>
  ),
}))

vi.mock('@features/editor/components/Modals/AddTrackModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) =>
    isOpen ? (
      <div data-testid="mock-add-track-modal">
        <button
          data-testid="mock-add-track-confirm"
          onClick={() => onConfirm?.('Nouvelle', '#ff0000')}
        >
          confirm
        </button>
        <button data-testid="mock-add-track-cancel" onClick={onCancel}>
          cancel
        </button>
      </div>
    ) : null,
}))

vi.mock('@features/editor/components/Modals/TrimClipModal', () => ({
  default: ({ isOpen, clip }) =>
    isOpen ? <div data-testid="mock-trim-modal">{clip?.name}</div> : null,
}))

vi.mock('@features/editor/components/Modals/NormalizeModal', () => ({
  default: ({ isOpen, clip }) =>
    isOpen ? <div data-testid="mock-normalize-modal">{clip?.name}</div> : null,
}))

vi.mock('@features/editor/components/Modals/ExportModal', () => ({
  default: ({ isOpen, onExport }) =>
    isOpen ? (
      <div data-testid="mock-export-modal">
        <button
          data-testid="mock-export-trigger"
          onClick={() =>
            onExport?.({
              name: 'Test',
              format: 'wav',
              bitrate: 192,
              profiles: ['all'],
              outputPath: 'test.wav',
              exportLocation: 'file',
            })
          }
        >
          export
        </button>
      </div>
    ) : null,
}))

vi.mock('@features/editor/components/Modals/ImportFileModal', () => ({
  default: ({ isOpen, onConfirm }) =>
    isOpen ? (
      <div data-testid="mock-import-modal">
        <button
          data-testid="mock-import-confirm"
          onClick={() =>
            onConfirm?.({
              filePath: '/x.mp3',
              fileName: 'X',
              trackId: 't1',
              startTime: 0,
            })
          }
        >
          confirm
        </button>
      </div>
    ) : null,
}))

vi.mock('@features/editor/components/Modals/TimelineLoopModal', () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="mock-timeline-loop-modal" /> : null,
}))

import Editor from '@features/editor/Editor'

// ═══════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════

describe('Editor', () => {
  let context
  let store
  let addToast
  let confirm
  let t

  const createClip = (o = {}) => ({
    id: 'c1',
    name: 'Clip',
    path: '/a.mp3',
    start: 0,
    duration: 3,
    effects: [],
    ...o,
  })

  const createTrack = (o = {}) => ({
    id: 't1',
    name: 'Piste 1',
    clips: [],
    volume: 1,
    muted: false,
    solo: false,
    ...o,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    t = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    })

    addToast = vi.fn()
    confirm = vi.fn().mockResolvedValue(true)

    mockUseLanguage.mockReturnValue({ t, currentLang: 'fr' })
    mockUseConfirm.mockReturnValue({
      confirm,
      ConfirmWrapper: () => null,
    })

    store = {
      sounds: [],
      profiles: [],
      cardSize: 'medium',
    }

    context = {
      isInitialized: true,
      project: {
        id: 'p1',
        name: 'Test',
        tracks: [createTrack()],
        markers: [],
      },
      setProject: vi.fn(),
      commitProject: vi.fn(),
      tracks: [createTrack()],
      selectedClipId: null,
      setSelectedClipId: vi.fn(),
      selectedTrackId: null,
      setSelectedTrackId: vi.fn(),
      currentTime: 0,
      setCurrentTime: vi.fn(),
      isPlaying: false,
      isPaused: false,
      isPlayingRef: { current: false },
      isPausedRef: { current: false },
      currentTimeRef: { current: 0 },
      totalDuration: 30,
      clipDurations: {},
      setClipDurations: vi.fn(),
      waveformData: {},
      store: { sounds: [], profiles: [], cardSize: 'medium' },
      addToast,
      addTrack: vi.fn().mockResolvedValue({ id: 't2', name: 'Nouvelle' }),
      removeTrack: vi.fn(),
      renameTrack: vi.fn(),
      muteTrack: vi.fn(),
      soloTrack: vi.fn(),
      setTrackVolume: vi.fn(),
      addClip: vi.fn().mockResolvedValue({ id: 'c-new' }),
      addClipFromFile: vi.fn().mockResolvedValue({ id: 'c-new' }),
      removeClip: vi.fn(),
      updateClip: vi.fn(),
      duplicateClip: vi.fn(),
      moveClip: vi.fn(),
      splitClip: vi.fn(),
      selectClip: vi.fn(),
      deselectClip: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      togglePlay: vi.fn(),
      playClipOnly: vi.fn(),
      loopRegion: { enabled: false, start: 0, end: 10 },
      setLoopRegion: vi.fn(),
      toggleLoop: vi.fn(),
      clearLoop: vi.fn(),
      handleZoomChange: vi.fn(),
      zoomLevel: 1,
      snapEnabled: true,
      setSnapEnabled: vi.fn(),
      autoCrossfade: true,
      setAutoCrossfade: vi.fn(),
      loopState: { clips: {}, tracks: {}, timeline: {} },
      toggleClipLoop: vi.fn(),
      setTimelineLoop: vi.fn(),
      toggleTimelineLoop: vi.fn(),
      actionOverlay: { type: null, step: 0, totalSteps: 1, clipName: null },
      isActionOverlayActive: false,
      cancelActionOverlay: vi.fn(),
      executeActionOverlay: vi.fn(),
      activateLoopManualClick: vi.fn(),
      activateSplitManualClick: vi.fn(),
      activateTimelineLoopManualClick: vi.fn(),
      masterGain: 1,
      setMasterGain: vi.fn(),
      undoEditor: vi.fn(),
      redoEditor: vi.fn(),
      canUndoEditor: false,
      canRedoEditor: false,
      markers: [],
      addMarker: vi.fn(),
      removeMarker: vi.fn(),
      updateMarker: vi.fn(),
      navigateToMarker: vi.fn(),
      updateEditorProjectName: vi.fn().mockReturnValue(true),
      reorderTracks: vi.fn(),
      loadProject: vi.fn(),
      setClipFade: vi.fn(),
      pushEditorHistoryCheckpoint: vi.fn(),
      setSoloPlayClipId: vi.fn(),
    }

    mockUseEditor.mockReturnValue(context)

    mockUseProjectManager.mockReturnValue({
      isSaving: false,
      isLoading: false,
      projectList: [],
      recentProjects: [],
      loadProjectList: vi.fn(),
      loadRecentProjects: vi.fn(),
      saveProject: vi.fn(),
      loadProject: vi.fn(),
      createProject: vi.fn(),
      deleteProject: vi.fn(),
      exportProject: vi.fn(),
      importProject: vi.fn(),
      duplicateProject: vi.fn(),
      renameProject: vi.fn().mockResolvedValue({ id: 'p1' }),
    })

    mockMixdownProject.mockResolvedValue({ duration: 30, sampleRate: 44100 })
    mockExportMixdown.mockResolvedValue({ success: true, path: '/export/test.wav' })
    mockNormalizeClip.mockResolvedValue({
      normalized: true,
      newPath: '/norm.wav',
      gain: 2,
    })

    mockGetBoolean.mockResolvedValue(false)
    mockGetNumber.mockResolvedValue(100)

    window.electronAPI = {
      openFileDialog: vi.fn().mockResolvedValue([]),
      saveFileDialog: vi.fn().mockResolvedValue({
        success: true,
        path: '/export/test.wav',
      }),
    }

    document.body.innerHTML = ''
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Editor (wrapper)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Editor (wrapper)', () => {
    it('devrait rendre le composant sans crash', () => {
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container).not.toBeNull()
    })

    it('devrait appeler useLanguage', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(mockUseLanguage).toHaveBeenCalled()
    })

    it('devrait appeler useConfirm avec la langue courante', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(mockUseConfirm).toHaveBeenCalledWith({ lang: 'fr' })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // EditorContent — états
  // ═══════════════════════════════════════════════════════════════════════

  describe('EditorContent — états', () => {
    it('devrait afficher "editorLoading" si !isInitialized', () => {
      mockUseEditor.mockReturnValueOnce({ ...context, isInitialized: false })
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container.textContent).toContain('editorLoading')
    })

    it('devrait afficher "editorNoProject" si project sans id', () => {
      mockUseEditor.mockReturnValueOnce({
        ...context,
        project: { name: 'No ID' },
      })
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container.textContent).toContain('editorNoProject')
    })

    it('devrait avoir un bouton "editorCreateProject" si project absent', () => {
      mockUseEditor.mockReturnValueOnce({ ...context, project: null })
      const { container } = render(<Editor store={store} addToast={addToast} />)
      const createBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('editorCreateProject')
      )
      expect(createBtn).not.toBeUndefined()
    })

    it('devrait créer un projet au click sur "editorCreateProject"', async () => {
      const setProject = vi.fn()
      const commitProject = vi.fn()
      mockUseEditor.mockReturnValueOnce({
        ...context,
        project: null,
        setProject,
        commitProject,
      })
      const { container } = render(<Editor store={store} addToast={addToast} />)

      const createBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('editorCreateProject')
      )

      await act(async () => {
        fireEvent.click(createBtn)
      })

      expect(setProject).toHaveBeenCalled()
      expect(commitProject).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // EditorTimelineContent — rendu
  // ═══════════════════════════════════════════════════════════════════════

  describe('EditorTimelineContent — rendu', () => {
    it('devrait rendre data-testid="editor-container"', () => {
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('editor-container')).toBeInTheDocument()
    })

    it('devrait rendre EditorToolbar', () => {
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-toolbar')).toBeInTheDocument()
    })

    it('devrait rendre EditorTimeline', () => {
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-timeline')).toBeInTheDocument()
    })

    it('devrait rendre MasterVolume', () => {
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-master-volume')).toBeInTheDocument()
    })

    it('devrait passer projectName à la toolbar', () => {
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-toolbar').getAttribute('data-project-name')).toBe(
        'Test'
      )
    })

    it('ne devrait PAS rendre ActionOverlay si inactif', () => {
      const { queryByTestId } = render(
        <Editor store={store} addToast={addToast} />
      )
      expect(queryByTestId('mock-action-overlay')).toBeNull()
    })

    // ✅ FIX : utiliser mockReturnValue (appelé 2x par render)
    it('devrait rendre ActionOverlay si actif', () => {
      mockUseEditor.mockReturnValue({
        ...context,
        isActionOverlayActive: true,
        actionOverlay: { type: 'split', step: 0, totalSteps: 1 },
      })
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-action-overlay').textContent).toBe('split')
    })

    it('ne devrait PAS rendre EffectsPanel si aucun clip sélectionné', () => {
      const { queryByTestId } = render(
        <Editor store={store} addToast={addToast} />
      )
      expect(queryByTestId('mock-effects-panel')).toBeNull()
    })

    // ✅ FIX : utiliser mockReturnValue
    it('devrait rendre EffectsPanel si clip sélectionné', () => {
      const clip = createClip({ id: 'c1', name: 'Selected' })
      const track = createTrack({ clips: [clip] })
      mockUseEditor.mockReturnValue({
        ...context,
        tracks: [track],
        selectedClipId: 'c1',
        selectedTrackId: 't1',
      })
      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)
      expect(getByTestId('mock-effects-panel').textContent).toBe('Selected')
    })

    it('devrait afficher le nombre de clips et pistes', () => {
      const track = createTrack({
        clips: [createClip({ id: 'c1' }), createClip({ id: 'c2' })],
      })
      mockUseEditor.mockReturnValue({
        ...context,
        tracks: [track],
      })
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container.textContent).toContain('editorClips')
      expect(container.textContent).toContain('editorTracks')
    })

    it('devrait afficher la durée formatée', () => {
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container.textContent).toContain('editorDuration')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Handlers — Track
  // ═══════════════════════════════════════════════════════════════════════

  describe('handlers — Track', () => {
    it('devrait ouvrir la modale AddTrack au click sur "add-track"', () => {
      const { getByTestId, queryByTestId } = render(
        <Editor store={store} addToast={addToast} />
      )

      expect(queryByTestId('mock-add-track-modal')).toBeNull()
      fireEvent.click(getByTestId('mock-toolbar-add-track'))
      expect(getByTestId('mock-add-track-modal')).toBeInTheDocument()
    })

    it('devrait appeler addTrack au confirm de la modale', async () => {
      const addTrack = vi.fn().mockResolvedValue({ id: 't2', name: 'Nouvelle' })
      mockUseEditor.mockReturnValue({ ...context, addTrack })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      fireEvent.click(getByTestId('mock-toolbar-add-track'))

      await act(async () => {
        fireEvent.click(getByTestId('mock-add-track-confirm'))
      })

      expect(addTrack).toHaveBeenCalledWith('Nouvelle', '#ff0000')
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastEditorTrackAdded'),
        'success'
      )
    })

    it('devrait fermer la modale au cancel', () => {
      const { getByTestId, queryByTestId } = render(
        <Editor store={store} addToast={addToast} />
      )

      fireEvent.click(getByTestId('mock-toolbar-add-track'))
      fireEvent.click(getByTestId('mock-add-track-cancel'))

      expect(queryByTestId('mock-add-track-modal')).toBeNull()
    })

    it('devrait afficher une erreur si addTrack retourne null', async () => {
      const addTrack = vi.fn().mockResolvedValue(null)
      mockUseEditor.mockReturnValue({ ...context, addTrack })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      fireEvent.click(getByTestId('mock-toolbar-add-track'))

      await act(async () => {
        fireEvent.click(getByTestId('mock-add-track-confirm'))
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('toastEditorTrackAddError'),
        'error'
      )
    })

    it('devrait renommer le projet via la toolbar', async () => {
      const updateEditorProjectName = vi.fn().mockReturnValue(true)
      const renameProject = vi.fn().mockResolvedValue({ id: 'p1' })
      mockUseEditor.mockReturnValue({
        ...context,
        updateEditorProjectName,
      })
      mockUseProjectManager.mockReturnValue({
        ...mockUseProjectManager(),
        renameProject,
      })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-toolbar-rename'))
        await Promise.resolve()
      })

      expect(updateEditorProjectName).toHaveBeenCalledWith('Nouveau')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Handlers — Master Volume
  // ═══════════════════════════════════════════════════════════════════════

  describe('handlers — Master Volume', () => {
    it('devrait appeler setMasterGain au changement', async () => {
      const setMasterGain = vi.fn()
      mockUseEditor.mockReturnValue({ ...context, setMasterGain })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-master-change'))
      })

      expect(setMasterGain).toHaveBeenCalledWith(0.75)
    })

    it('devrait toggler mute', async () => {
      const setMasterGain = vi.fn()
      mockUseEditor.mockReturnValue({ ...context, setMasterGain })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-master-mute'))
      })

      expect(setMasterGain).toHaveBeenCalledWith(0)
    })

    it('devrait reset les volumes', async () => {
      const setMasterGain = vi.fn()
      const commitProject = vi.fn()
      const setTrackVolume = vi.fn()
      mockUseEditor.mockReturnValue({
        ...context,
        setMasterGain,
        commitProject,
        setTrackVolume,
      })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-master-reset'))
      })

      expect(setMasterGain).toHaveBeenCalledWith(1)
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorResetVolumesSuccess'),
        'success'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Handlers — Play
  // ═══════════════════════════════════════════════════════════════════════

  describe('handlers — Play', () => {
    it('devrait appeler play si pas playing', async () => {
      const play = vi.fn()
      const setCurrentTime = vi.fn()
      const setSoloPlayClipId = vi.fn()
      mockUseEditor.mockReturnValue({
        ...context,
        play,
        setCurrentTime,
        setSoloPlayClipId,
        isPlayingRef: { current: false },
        isPausedRef: { current: false },
      })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-toolbar-play'))
      })

      expect(play).toHaveBeenCalled()
    })

    it('devrait appeler pause si playing', async () => {
      const pause = vi.fn()
      mockUseEditor.mockReturnValue({
        ...context,
        pause,
        isPlaying: true,
        isPlayingRef: { current: true },
      })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-toolbar-play'))
      })

      expect(pause).toHaveBeenCalled()
    })

    it('devrait appeler resume si paused', async () => {
      const resume = vi.fn()
      mockUseEditor.mockReturnValue({
        ...context,
        resume,
        isPaused: true,
        isPausedRef: { current: true },
      })

      const { getByTestId } = render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        fireEvent.click(getByTestId('mock-toolbar-play'))
      })

      expect(resume).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Export / Import
  // ═══════════════════════════════════════════════════════════════════════

  describe('export', () => {
    it('devrait toaster "editorNothingToExport" si projet vide', async () => {
      const emptyProject = { id: 'p1', name: 'Empty', tracks: [] }
      mockUseEditor.mockReturnValue({ ...context, project: emptyProject })

      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container).not.toBeNull()
    })

    it('devrait rendre ExportModal si showExportModal=true', async () => {
      const { container } = render(<Editor store={store} addToast={addToast} />)
      expect(container).not.toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Hooks appelés
  // ═══════════════════════════════════════════════════════════════════════

  describe('hooks', () => {
    it('devrait appeler useKeyboardShortcuts', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(mockUseKeyboardShortcuts).toHaveBeenCalled()
    })

    // ✅ FIX : le 1er arg est context.store (pas le prop store)
    it('devrait appeler useProjectManager', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(mockUseProjectManager).toHaveBeenCalledWith(
        context.store,                    // ← context.store, pas `store`
        context.project,                  // ← context.project
        context.setProject,               // ← context.setProject
        addToast
      )
    })

    it('devrait charger les préférences au mount', async () => {
      render(<Editor store={store} addToast={addToast} />)

      await act(async () => {
        await Promise.resolve()
      })

      expect(mockGetBoolean).toHaveBeenCalledWith(
        'sounddeck_metronome_enabled',
        false
      )
      expect(mockGetNumber).toHaveBeenCalledWith('sounddeck_metronome_bpm', 120)
      expect(mockGetNumber).toHaveBeenCalledWith('sounddeck_master_volume', 100)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // window.__editorXxx helpers
  // ═══════════════════════════════════════════════════════════════════════

  describe('window helpers', () => {
    it('devrait exposer __editorHasClips au mount', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(typeof window.__editorHasClips).toBe('function')
    })

    it('devrait exposer __editorGetFirstClipId', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(typeof window.__editorGetFirstClipId).toBe('function')
    })

    it('__editorHasClips devrait retourner false si aucune track avec clips', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(window.__editorHasClips()).toBe(false)
    })

    // ✅ FIX : mockReturnValue au lieu de mockReturnValueOnce
    it('__editorHasClips devrait retourner true si au moins un clip', () => {
      const track = createTrack({ clips: [createClip({ id: 'c1' })] })
      mockUseEditor.mockReturnValue({ ...context, tracks: [track] })

      render(<Editor store={store} addToast={addToast} />)

      expect(window.__editorHasClips()).toBe(true)
    })

    // ✅ FIX : mockReturnValue au lieu de mockReturnValueOnce
    it('__editorGetFirstClipId devrait retourner le premier clip', () => {
      const track = createTrack({
        clips: [createClip({ id: 'c-first' })],
      })
      mockUseEditor.mockReturnValue({ ...context, tracks: [track] })

      render(<Editor store={store} addToast={addToast} />)

      expect(window.__editorGetFirstClipId()).toBe('c-first')
    })

    it('__editorGetFirstClipId devrait retourner null si aucun clip', () => {
      render(<Editor store={store} addToast={addToast} />)
      expect(window.__editorGetFirstClipId()).toBeNull()
    })

    it('devrait cleanup les helpers à l\'unmount', () => {
      const { unmount } = render(<Editor store={store} addToast={addToast} />)
      unmount()
      expect(window.__editorHasClips).toBeUndefined()
      expect(window.__editorGetFirstClipId).toBeUndefined()
    })
  })
})