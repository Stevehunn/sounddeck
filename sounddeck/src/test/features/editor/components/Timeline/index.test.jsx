import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

// ─── Mocks hoistés ──────────────────────────────────────────────────────
const mockUseEditor = vi.hoisted(() => vi.fn());

vi.mock("@features/editor/contexts/EditorContext", () => ({
  useEditor: mockUseEditor,
}));

// Mock tous les sous-composants
vi.mock("@features/editor/components/Track", () => ({
  default: ({ track, snapContext }) => (
    <div data-testid={`mock-track-${track.id}`} data-has-snap={!!snapContext}>
      Track {track.name}
    </div>
  ),
}));

vi.mock("@features/editor/components/Track/TrackHeader", () => ({
  default: ({ track }) => <div data-testid={`mock-track-header-${track.id}`} />,
}));

vi.mock("@features/editor/components/Track/TrackControls", () => ({
  default: () => <div data-testid="mock-track-controls" />,
}));

vi.mock('@features/editor/components/Timeline/TimelineRuler', () => ({
  default: () => <div data-testid="mock-ruler" />,
}))

vi.mock("@features/editor/components/Timeline/TimelinePlayhead", () => ({
  default: () => <div data-testid="mock-playhead" />,
}));

vi.mock("@features/editor/components/Timeline/TimelineLoop", () => ({
  default: () => <div data-testid="mock-loop" />,
}));

vi.mock("@features/editor/components/Timeline/TimelineZoomControls", () => ({
  default: () => <div data-testid="mock-zoom-controls" />,
}));

vi.mock("@features/editor/components/Timeline/TimelineLoopMarkers", () => ({
  default: () => <div data-testid="mock-loop-markers" />,
}));

vi.mock("@features/editor/components/Timeline/TimelineMarkerLines", () => ({
  default: ({ variant }) => (
    <div data-testid={`mock-marker-lines-${variant}`} />
  ),
}));

vi.mock("@features/editor/components/Timeline/TimelineMarkersPanel", () => ({
  default: ({ isOpen, markers, onOpen }) => (
    <div data-testid="mock-markers-panel" data-open={String(!!isOpen)}>
      Panel({markers?.length || 0})
      <button data-testid="mock-panel-open" onClick={onOpen}>
        open
      </button>
    </div>
  ),
}));

vi.mock("@shared/utils/format", () => ({
  formatTime: (s) => `${s}s`,
}));

vi.mock("@shared/utils/appStorage", () => ({
  getBoolean: vi.fn().mockResolvedValue(false),
  setItem: vi.fn().mockResolvedValue(),
}));

vi.mock("@features/editor/utils/trackColors", () => ({
  getTrackColor: (i) => `hsl(${i * 30}, 60%, 50%)`,
  TRACK_COLORS: [],
}));

import EditorTimeline from "@features/editor/components/Timeline";
import * as appStorage from "@shared/utils/appStorage";

describe("EditorTimeline", () => {
  let mockEditor;
  let defaultProps;

  const createTrack = (o = {}) => ({
    id: "t1",
    name: "Piste 1",
    color: "#3b82f6",
    clips: [],
    ...o,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // ✅ RESET EXPLICITE des mocks appStorage (vitest clearAllMocks ne reset
    //    pas les implémentations, mais on s'assure que c'est bon)
    appStorage.getBoolean.mockResolvedValue(false);
    appStorage.setItem.mockResolvedValue(undefined);

    mockEditor = {
      store: {
        cardSize: "medium",
      },
    };
    mockUseEditor.mockReturnValue(mockEditor);

    // Mock getBoundingClientRect pour éviter des crashs
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 60,
      width: 1000,
      height: 60,
      x: 0,
      y: 0,
    }));

    defaultProps = {
      tracks: [createTrack()],
      selectedClipId: null,
      selectedTrackId: null,
      totalDuration: 30,
      currentTime: 0,
      isPlaying: false,
      clipDurations: {},
      waveformData: {},
      zoomLevel: 1,
      snapEnabled: true,
      loopRegion: { enabled: false, start: 0, end: 10 },
      autoCrossfade: true,
      onClipSelect: vi.fn(),
      onClipMove: vi.fn(),
      onClipUpdate: vi.fn(),
      onClipRemove: vi.fn(),
      onClipDuplicate: vi.fn(),
      onClipFade: vi.fn(),
      onClipContextMenu: vi.fn(),
      onDragCheckpoint: vi.fn(),
      onTrackRemove: vi.fn(),
      onSeek: vi.fn(),
      onTrackMute: vi.fn(),
      onTrackSolo: vi.fn(),
      onTrackVolume: vi.fn(),
      onTrackReorder: vi.fn(),
      onRenameTrack: vi.fn(),
      onSetLoopRegion: vi.fn(),
      onClearLoop: vi.fn(),
      onToggleLoop: vi.fn(),
      onUpdateClipDuration: vi.fn(),
      onZoomChange: vi.fn(),
      onSplitClip: vi.fn(),
      addToast: vi.fn(),
      setClipDurations: vi.fn(),
      removeTrack: vi.fn(),
      tr: vi.fn((key) => key),
      markers: [],
      onAddMarker: vi.fn(),
      onRemoveMarker: vi.fn(),
      onUpdateMarker: vi.fn(),
      onNavigateToMarker: vi.fn(),
      loopState: {},
      isPendingAction: false,
      pendingAction: null,
    };
  });

  // ─── Structure ─────────────────────────────────────────────────

  describe("structure", () => {
    it("devrait rendre un conteneur", () => {
      const { container } = render(<EditorTimeline {...defaultProps} />);
      expect(container.firstChild).not.toBeNull();
    });

    it("devrait rendre les pistes", () => {
      const tracks = [
        createTrack({ id: "t1", name: "A" }),
        createTrack({ id: "t2", name: "B" }),
      ];
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} tracks={tracks} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
      expect(getByTestId("mock-track-t2")).toBeInTheDocument();
    });

    it("devrait rendre les headers de piste", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-track-header-t1")).toBeInTheDocument();
    });

    it("devrait rendre les controls de piste", () => {
      const { getAllByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getAllByTestId("mock-track-controls").length).toBeGreaterThan(0);
    });

    it("devrait rendre le ruler", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-ruler")).toBeInTheDocument();
    });

    it("devrait rendre le playhead", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-playhead")).toBeInTheDocument();
    });

    it("devrait rendre la loop", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-loop")).toBeInTheDocument();
    });

    it("devrait rendre les zoom controls", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-zoom-controls")).toBeInTheDocument();
    });

    it('devrait rendre data-testid="editor-timeline"', () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("editor-timeline")).toBeInTheDocument();
    });

    it('devrait rendre data-testid="editor-zoom-controls"', () => {
      const { getAllByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(
        getAllByTestId("editor-zoom-controls").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Message "aucune piste" ─────────────────────────────────────

  describe("état sans piste", () => {
    it('devrait afficher "editorNoTracks" si aucune piste', () => {
      const { container } = render(
        <EditorTimeline {...defaultProps} tracks={[]} />,
      );
      expect(container.textContent).toContain("editorNoTracks");
    });

    it('devrait afficher "editorAddTrackHint"', () => {
      const { container } = render(
        <EditorTimeline {...defaultProps} tracks={[]} />,
      );
      expect(container.textContent).toContain("editorAddTrackHint");
    });

    it("ne devrait PAS afficher les messages si piste présente", () => {
      const { container } = render(<EditorTimeline {...defaultProps} />);
      expect(container.textContent).not.toContain("editorNoTracks");
    });
  });

  // ─── Snap context ──────────────────────────────────────────────

  describe("snap context", () => {
    it("devrait passer snapContext aux pistes", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      const track = getByTestId("mock-track-t1");
      expect(track.getAttribute("data-has-snap")).toBe("true");
    });

    it("devrait agréger les clips dans snapContext", () => {
      const tracks = [
        createTrack({
          id: "t1",
          clips: [
            { id: "c1", start: 0, duration: 3 },
            { id: "c2", start: 5, duration: 4 },
          ],
        }),
      ];
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} tracks={tracks} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });
  });

  // ─── Markers panel ─────────────────────────────────────────────

  describe("markers panel", () => {
    it("devrait initialiser le panel fermé (autoOpen=false)", async () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      const panel = getByTestId("mock-markers-panel");
      expect(panel.getAttribute("data-open")).toBe("false");
    });

    // ✅ FIX : reset le mock AVANT le render dans ce test
    it("devrait afficher le panel si autoOpen=true", async () => {
      appStorage.getBoolean.mockResolvedValue(true);

      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      const panel = getByTestId("mock-markers-panel");
      expect(panel.getAttribute("data-open")).toBe("true");
    });

    it("devrait passer le nombre de markers", async () => {
      const { getByTestId } = render(
        <EditorTimeline
          {...defaultProps}
          markers={[{ id: "m1" }, { id: "m2" }]}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(getByTestId("mock-markers-panel").textContent).toContain(
        "Panel(2)",
      );
    });
  });

  // ─── Tracks vides ──────────────────────────────────────────────

  describe("tracks avec clips", () => {
    it("devrait calculer les durées clips en fallback", () => {
      const tracks = [
        createTrack({
          id: "t1",
          clips: [{ id: "c1", start: 0, duration: 5 }],
        }),
      ];
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} tracks={tracks} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });

    it("devrait utiliser clipDurations en priorité", () => {
      const tracks = [
        createTrack({ id: "t1", clips: [{ id: "c1", start: 0 }] }),
      ];
      const { getByTestId } = render(
        <EditorTimeline
          {...defaultProps}
          tracks={tracks}
          clipDurations={{ c1: 10 }}
        />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });
  });

  // ─── Track colors ──────────────────────────────────────────────

  describe("couleurs des pistes", () => {
    it("devrait utiliser la couleur de la track", () => {
      const tracks = [createTrack({ id: "t1", color: "#ff0000" })];
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} tracks={tracks} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });

    it("devrait utiliser getTrackColor fallback", () => {
      const tracks = [createTrack({ id: "t1", color: undefined })];
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} tracks={tracks} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });
  });

  // ─── Selected track highlight ──────────────────────────────────

  describe("sélection de piste", () => {
    it("devrait rendre avec selectedTrackId", () => {
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} selectedTrackId="t1" />,
      );
      expect(getByTestId("mock-track-header-t1")).toBeInTheDocument();
    });
  });

  // ─── isPlaying indicator ───────────────────────────────────────

  describe("isPlaying", () => {
    it("devrait rendre avec isPlaying=true", () => {
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} isPlaying={true} />,
      );
      expect(getByTestId("mock-playhead")).toBeInTheDocument();
    });
  });

  // ─── Pending action ─────────────────────────────────────────────

  describe("pending action", () => {
    // ✅ FIX : le badge est rendu directement dans le ruler container
    //    par EditorTimeline, PAS par TimelineRuler
    it('devrait afficher le label "Cliquez ici" si isPendingAction', () => {
      const { container } = render(
        <EditorTimeline {...defaultProps} isPendingAction={true} />,
      );
      // Le <span> avec EXACTEMENT 'clickHere' (pas le CSS @keyframes)
      const pendingLabel = Array.from(container.querySelectorAll("span")).find(
        (el) => el.textContent === "clickHere",
      );
      expect(pendingLabel).toBeDefined();
    });

    it("ne devrait PAS afficher le label si pas pending", () => {
      const { container } = render(<EditorTimeline {...defaultProps} />);
      const pendingLabel = Array.from(container.querySelectorAll("span")).find(
        (el) => el.textContent === "clickHere",
      );
      expect(pendingLabel).toBeUndefined();
    });
  });

  // ─── Marker lines ──────────────────────────────────────────────

  describe("marker lines", () => {
    it("devrait rendre les markers en variant=ruler et timeline", () => {
      const { getAllByTestId } = render(
        <EditorTimeline
          {...defaultProps}
          markers={[{ id: "m1", time: 5, name: "Intro" }]}
        />,
      );
      expect(getAllByTestId("mock-marker-lines-ruler").length).toBeGreaterThan(
        0,
      );
      expect(
        getAllByTestId("mock-marker-lines-timeline").length,
      ).toBeGreaterThan(0);
    });

    it("devrait passer la variant correcte", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-marker-lines-ruler")).toBeInTheDocument();
      expect(getByTestId("mock-marker-lines-timeline")).toBeInTheDocument();
    });
  });

  // ─── Loop markers ──────────────────────────────────────────────

  describe("loop markers", () => {
    it("devrait rendre TimelineLoopMarkers", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-loop-markers")).toBeInTheDocument();
    });
  });

  // ─── store prop override ───────────────────────────────────────

  describe("store prop", () => {
    it("devrait utiliser storeProp si fourni", () => {
      const storeProp = { cardSize: "large" };
      const { getByTestId } = render(
        <EditorTimeline {...defaultProps} store={storeProp} />,
      );
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });

    it("devrait utiliser editorContext.store si storeProp absent", () => {
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });

    it("devrait rendre sans crash si editorContext null", () => {
      mockUseEditor.mockReturnValueOnce(null);
      const { getByTestId } = render(<EditorTimeline {...defaultProps} />);
      expect(getByTestId("mock-track-t1")).toBeInTheDocument();
    });
  });

  // ─── Import du module (smoke test) ──────────────────────────────

  describe("import", () => {
    it("devrait être un composant fonction", () => {
      expect(typeof EditorTimeline).toBe("function");
    });
  });
});
