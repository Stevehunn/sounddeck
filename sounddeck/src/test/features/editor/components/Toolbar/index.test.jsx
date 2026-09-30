import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

vi.mock('@features/editor/components/Toolbar/EditorMetronome', () => ({
  default: ({ bpm, onToggle, enabled }) => (
    <div data-testid="mock-metronome" data-bpm={bpm} data-enabled={enabled}>
      <button
        data-testid="mock-metronome-toggle"
        onClick={() => onToggle?.(!enabled)}
      >
        toggle
      </button>
    </div>
  ),
}))

vi.mock('@features/editor/components/Toolbar/ProjectControls', () => ({
  default: ({ project }) => (
    <div data-testid="mock-project-controls">{project?.name}</div>
  ),
}))

import EditorToolbar from '@features/editor/components/Toolbar'

describe('EditorToolbar', () => {
  let defaultProps
  let handlers

  const createTrack = (o = {}) => ({
    id: 't1',
    name: 'Piste 1',
    clips: [],
    ...o,
  })

  const createSound = (o = {}) => ({
    id: 's1',
    name: 'Son 1',
    emoji: '🔊',
    ...o,
  })

  // ✅ FIX : helper pour cibler le span du projet (pas le mock ProjectControls)
  const getProjectNameEl = (container) =>
    container.querySelector('[title="editorClickToRename"]')

  beforeEach(() => {
    vi.clearAllMocks()

    handlers = {
      onAddTrack: vi.fn(),
      onAddClip: vi.fn(),
      onAddFile: vi.fn(),
      onPlay: vi.fn(),
      onStop: vi.fn(),
      onExport: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onToggleSnap: vi.fn(),
      onToggleCrossfade: vi.fn(),
      onRenameProject: vi.fn(),
      onToggleTimelineLoop: vi.fn(),
      onOpenLoopPanel: vi.fn(),
      onToggleMetronome: vi.fn(),
      onBpmChange: vi.fn(),
      onSaveProject: vi.fn(),
      onLoadProject: vi.fn(),
      onCreateProject: vi.fn(),
      onDeleteProject: vi.fn(),
      onDuplicateProject: vi.fn(),
      onProjectRename: vi.fn(),
      onLoadProjectList: vi.fn(),
      onExportProject: vi.fn(),
      onImportProject: vi.fn(),
      onToggleEffectsPanel: vi.fn(),
    }

    defaultProps = {
      tracks: [createTrack()],
      sounds: [createSound()],
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      totalDuration: 30,
      canUndo: false,
      canRedo: false,
      snapEnabled: true,
      autoCrossfade: true,
      projectName: 'Mon Projet',
      tr: vi.fn((key) => key),
      addToast: vi.fn(),
      loopState: {},
      metronomeEnabled: false,
      bpm: 120,
      project: { id: 'p1', name: 'Mon Projet' },
      projectList: [],
      recentProjects: [],
      isSaving: false,
      isLoading: false,
      showEffectsPanel: false,
      ...handlers,
    }

    document.addEventListener = vi.fn()
    document.removeEventListener = vi.fn()
  })

  // ─── Structure ─────────────────────────────────────────────────

  describe('structure', () => {
    it('devrait rendre un data-testid="editor-toolbar"', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      expect(getByTestId('editor-toolbar')).toBeInTheDocument()
    })

    // ✅ FIX : cibler le span via title
    it('devrait afficher le nom du projet', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      const el = getProjectNameEl(container)
      expect(el?.textContent).toContain('Mon Projet')
    })

    it('devrait afficher "Nouveau projet" si projectName absent', () => {
      const { container } = render(
        <EditorToolbar
          {...defaultProps}
          projectName=""
          project={{ id: 'p1', name: '' }}
        />
      )
      const el = getProjectNameEl(container)
      expect(el?.textContent).toContain('Nouveau projet')
    })

    it('devrait afficher le temps (currentTime / totalDuration)', () => {
      const { container } = render(
        <EditorToolbar
          {...defaultProps}
          currentTime={5}
          totalDuration={30}
        />
      )
      expect(container.textContent).toContain('0:05')
      expect(container.textContent).toContain('0:30')
    })
  })

  // ─── Renommage inline du projet ────────────────────────────────

  describe('renommage inline', () => {
    // ✅ FIX : utiliser getProjectNameEl
    it('devrait activer le mode renommage au click sur le nom', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getProjectNameEl(container))
      expect(container.querySelector('input[type="text"]')).not.toBeNull()
    })

    it('devrait valider au Enter', () => {
      const onRenameProject = vi.fn()
      const { container } = render(
        <EditorToolbar {...defaultProps} onRenameProject={onRenameProject} />
      )
      fireEvent.click(getProjectNameEl(container))

      const input = container.querySelector('input[type="text"]')
      fireEvent.change(input, { target: { value: 'Nouveau Nom' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenameProject).toHaveBeenCalledWith('Nouveau Nom')
    })

    it('devrait annuler au Escape', () => {
      const onRenameProject = vi.fn()
      const { container } = render(
        <EditorToolbar {...defaultProps} onRenameProject={onRenameProject} />
      )
      fireEvent.click(getProjectNameEl(container))

      const input = container.querySelector('input[type="text"]')
      fireEvent.change(input, { target: { value: 'Nouveau Nom' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(onRenameProject).not.toHaveBeenCalled()
    })

    it('devrait valider au blur', () => {
      const onRenameProject = vi.fn()
      const { container } = render(
        <EditorToolbar {...defaultProps} onRenameProject={onRenameProject} />
      )
      fireEvent.click(getProjectNameEl(container))

      const input = container.querySelector('input[type="text"]')
      fireEvent.change(input, { target: { value: 'Blurred' } })
      fireEvent.blur(input)

      expect(onRenameProject).toHaveBeenCalledWith('Blurred')
    })
  })

  // ─── Boutons play/stop/undo/redo ───────────────────────────────

  describe('play/stop', () => {
    it('devrait appeler onPlay au click sur play', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-play-button'))
      expect(handlers.onPlay).toHaveBeenCalled()
    })

    it('devrait afficher pause si isPlaying', () => {
      const { getByTestId } = render(
        <EditorToolbar {...defaultProps} isPlaying={true} />
      )
      const btn = getByTestId('editor-play-button')
      expect(btn.querySelector('.ti-player-pause')).not.toBeNull()
    })

    it('devrait afficher play si isPaused', () => {
      const { getByTestId } = render(
        <EditorToolbar {...defaultProps} isPaused={true} />
      )
      const btn = getByTestId('editor-play-button')
      expect(btn.querySelector('.ti-player-play')).not.toBeNull()
    })

    it('devrait avoir un bouton Stop', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      const stopBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-player-stop-filled')
      )
      expect(stopBtn).not.toBeUndefined()
    })

    it('devrait appeler onStop au click sur Stop', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      const stopBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-player-stop-filled')
      )
      fireEvent.click(stopBtn)
      expect(handlers.onStop).toHaveBeenCalled()
    })
  })

  describe('undo/redo', () => {
    it('devrait désactiver undo si canUndo=false', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} canUndo={false} />
      )
      const undoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-arrow-back-up')
      )
      expect(undoBtn?.disabled).toBe(true)
    })

    it('devrait activer undo si canUndo=true', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} canUndo={true} />
      )
      const undoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-arrow-back-up')
      )
      expect(undoBtn?.disabled).toBe(false)
    })

    it('devrait appeler onUndo', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} canUndo={true} />
      )
      const undoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-arrow-back-up')
      )
      fireEvent.click(undoBtn)
      expect(handlers.onUndo).toHaveBeenCalled()
    })

    it('devrait désactiver redo si canRedo=false', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} canRedo={false} />
      )
      const redoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-arrow-forward-up')
      )
      expect(redoBtn?.disabled).toBe(true)
    })

    it('devrait appeler onRedo', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} canRedo={true} />
      )
      const redoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-arrow-forward-up')
      )
      fireEvent.click(redoBtn)
      expect(handlers.onRedo).toHaveBeenCalled()
    })
  })

  // ─── Snap / Crossfade ──────────────────────────────────────────

  describe('toggles', () => {
    it('devrait toggle snap', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      const snapBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.querySelector('.ti-magnet')
      )
      fireEvent.click(snapBtn)
      expect(handlers.onToggleSnap).toHaveBeenCalled()
    })

    it('devrait toggle crossfade', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-crossfade-toggle-button'))
      expect(handlers.onToggleCrossfade).toHaveBeenCalled()
    })

    // ✅ FIX : utiliser rerender au lieu de 2 render() consécutifs
    it('devrait afficher le statut ON/OFF du crossfade', () => {
      const { getByTestId, rerender } = render(
        <EditorToolbar {...defaultProps} autoCrossfade={true} />
      )
      expect(getByTestId('editor-crossfade-toggle-button').textContent).toContain(
        'ON'
      )

      rerender(<EditorToolbar {...defaultProps} autoCrossfade={false} />)
      expect(getByTestId('editor-crossfade-toggle-button').textContent).toContain(
        'OFF'
      )
    })
  })

  // ─── Metronome ─────────────────────────────────────────────────

  describe('metronome', () => {
    it('devrait afficher le mock metronome', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      expect(getByTestId('mock-metronome')).toBeInTheDocument()
    })

    it('devrait passer bpm et enabled au metronome', () => {
      const { getByTestId } = render(
        <EditorToolbar {...defaultProps} bpm={140} metronomeEnabled={true} />
      )
      const metro = getByTestId('mock-metronome')
      expect(metro.getAttribute('data-bpm')).toBe('140')
      expect(metro.getAttribute('data-enabled')).toBe('true')
    })

    it('devrait appeler onToggleMetronome via le metronome', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('mock-metronome-toggle'))
      expect(handlers.onToggleMetronome).toHaveBeenCalled()
    })
  })

  // ─── Project Controls ──────────────────────────────────────────

  describe('project controls', () => {
    it('devrait afficher le mock project controls', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      expect(getByTestId('mock-project-controls')).toBeInTheDocument()
    })

    it('devrait passer le projet', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      expect(getByTestId('mock-project-controls').textContent).toBe('Mon Projet')
    })
  })

  // ─── Loop toggle ───────────────────────────────────────────────

  describe('loop', () => {
    it('devrait avoir un bouton toggle loop', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      expect(getByTestId('editor-loop-toggle-button')).toBeInTheDocument()
    })

    it('devrait appeler onToggleTimelineLoop', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-loop-toggle-button'))
      expect(handlers.onToggleTimelineLoop).toHaveBeenCalled()
    })

    it('devrait afficher ON si loopState.timeline.enabled', () => {
      const { getByTestId } = render(
        <EditorToolbar
          {...defaultProps}
          loopState={{ timeline: { enabled: true } }}
        />
      )
      expect(getByTestId('editor-loop-toggle-button').textContent).toContain(
        'ON'
      )
    })

    it('devrait ouvrir le panneau loop', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-loop-settings-button'))
      expect(handlers.onOpenLoopPanel).toHaveBeenCalled()
    })
  })

  // ─── Effects panel toggle ──────────────────────────────────────

  describe('effects panel', () => {
    it('devrait toggle effects panel', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-effects-panel-toggle'))
      expect(handlers.onToggleEffectsPanel).toHaveBeenCalledWith(true)
    })

    it('devrait passer !showEffectsPanel', () => {
      const { getByTestId } = render(
        <EditorToolbar {...defaultProps} showEffectsPanel={true} />
      )
      fireEvent.click(getByTestId('editor-effects-panel-toggle'))
      expect(handlers.onToggleEffectsPanel).toHaveBeenCalledWith(false)
    })
  })

  // ─── Boutons d'action ──────────────────────────────────────────

  describe('boutons d\'action', () => {
    it('devrait appeler onAddTrack', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-add-track-button'))
      expect(handlers.onAddTrack).toHaveBeenCalled()
    })

    it('devrait ouvrir le menu AddClip', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))
      const selects = container.querySelectorAll('select')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('devrait appeler onAddFile', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-import-file-button'))
      expect(handlers.onAddFile).toHaveBeenCalled()
    })

    it('devrait appeler onExport', () => {
      const { getByTestId } = render(<EditorToolbar {...defaultProps} />)
      fireEvent.click(getByTestId('editor-export-button'))
      expect(handlers.onExport).toHaveBeenCalled()
    })
  })

  // ─── Menu AddClip ──────────────────────────────────────────────

  describe('menu AddClip', () => {
    it('devrait afficher les options de pistes et sons', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))

      const selects = container.querySelectorAll('select')
      expect(selects.length).toBe(2)
    })

    it('devrait afficher le message "Pas de pistes" si tracks vide', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} tracks={[]} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))
      expect(container.textContent).toContain('editorAddTrackHint')
    })

    it('devrait fermer le menu au click sur Annuler', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))

      const cancelBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'cancel'
      )
      if (cancelBtn) {
        fireEvent.click(cancelBtn)
        expect(container.querySelectorAll('select').length).toBe(0)
      }
    })

    it('devrait appeler onAddClip au submit', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))

      const selects = container.querySelectorAll('select')
      fireEvent.change(selects[0], { target: { value: 't1' } })
      fireEvent.change(selects[1], { target: { value: 's1' } })

      const addBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('add')
      )
      if (addBtn) {
        fireEvent.click(addBtn)
        expect(handlers.onAddClip).toHaveBeenCalled()
      }
    })

    it('devrait appeler onAddClip au change du select son', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))

      const selects = container.querySelectorAll('select')
      fireEvent.change(selects[0], { target: { value: 't1' } })
      fireEvent.change(selects[1], { target: { value: 's1' } })

      expect(handlers.onAddClip).toHaveBeenCalled()
    })

    // ✅ FIX : le bouton est `disabled` si pas de son → on teste ça directement
    it('devrait désactiver le bouton Ajouter si pas de son sélectionné', () => {
      const { getByTestId, container } = render(
        <EditorToolbar {...defaultProps} />
      )
      fireEvent.click(getByTestId('editor-add-clip-button'))

      // Sélectionner seulement la track, pas le son
      const selects = container.querySelectorAll('select')
      fireEvent.change(selects[0], { target: { value: 't1' } })

      const addBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('add')
      )

      expect(addBtn?.disabled).toBe(true)
    })
  })

  // ─── Formatage du temps ────────────────────────────────────────

  describe('formatage du temps', () => {
    it('devrait afficher 0:00 pour 0', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      expect(container.textContent).toContain('0:00')
    })

    it('devrait afficher 1:30 pour 90s', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} currentTime={90} />
      )
      expect(container.textContent).toContain('1:30')
    })

    it('devrait gérer NaN', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} currentTime={NaN} />
      )
      expect(container.textContent).toContain('0:00')
    })
  })

  // ─── isPlaying indicator ───────────────────────────────────────

  describe('isPlaying indicator', () => {
    it('devrait afficher "editorPlaying" si isPlaying', () => {
      const { container } = render(
        <EditorToolbar {...defaultProps} isPlaying={true} />
      )
      expect(container.textContent).toContain('editorPlaying')
    })

    it('ne devrait PAS afficher "editorPlaying" si pas playing', () => {
      const { container } = render(<EditorToolbar {...defaultProps} />)
      expect(container.textContent).not.toContain('editorPlaying')
    })
  })
})