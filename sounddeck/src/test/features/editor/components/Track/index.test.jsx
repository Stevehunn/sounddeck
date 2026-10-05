// src/test/features/editor/components/Track/index.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@features/editor/components/Clip", () => ({
  default: ({ clip, layout, state, handlers, ui, snapContext }) => (
    <div
      data-testid={`clip-${clip.id}`}
      data-selected={state.isSelected}
      data-track-id={ui.trackId}
      data-track-color={ui.trackColor}
      data-start={layout.start}
      data-duration={layout.duration}
      data-snap={layout.snapEnabled}
    />
  ),
}));

vi.mock("@features/editor/utils/trackColors", () => ({
  TRACK_COLORS: ["#aaa", "#bbb", "#ccc"],
  getTrackColor: vi.fn((i) => ["#aaa", "#bbb", "#ccc"][i] || "#default"),
}));

import EditorTrack from "@features/editor/components/Track/index";
import { getTrackColor } from "@features/editor/utils/trackColors";

const makeTrack = (overrides = {}) => ({
  id: "t1",
  name: "Piste 1",
  clips: [],
  ...overrides,
});

const makeClip = (id, overrides = {}) => ({
  id,
  start: 0,
  duration: 3,
  ...overrides,
});

const defaultProps = (overrides = {}) => ({
  track: makeTrack(),
  trackIndex: 0,
  totalDuration: 60,
  pixelsPerSecond: 50,
  selectedClipId: null,
  selectedTrackId: null,
  clipDurations: {},
  snapEnabled: true,
  snapContext: {},
  tr: (k) => k,
  loopState: {},
  ...overrides,
});

describe("EditorTrack (index)", () => {
  describe("Rendu", () => {
    it("affiche 0 clip si vide", () => {
      const { container } = render(<EditorTrack {...defaultProps()} />);
      expect(container.querySelector('[data-testid^="clip-"]')).toBeNull();
    });

    it("affiche un EditorClip par clip", () => {
      const track = makeTrack({
        clips: [makeClip("c1"), makeClip("c2"), makeClip("c3")],
      });
      render(<EditorTrack {...defaultProps({ track })} />);
      expect(screen.getByTestId("clip-c1")).toBeInTheDocument();
      expect(screen.getByTestId("clip-c2")).toBeInTheDocument();
      expect(screen.getByTestId("clip-c3")).toBeInTheDocument();
    });

    it("passe le trackId au clip", () => {
      const track = makeTrack({ id: "track-X", clips: [makeClip("c1")] });
      render(<EditorTrack {...defaultProps({ track })} />);
      expect(screen.getByTestId("clip-c1").getAttribute("data-track-id")).toBe(
        "track-X",
      );
    });

    it("utilise clipDurations si fourni", () => {
      const track = makeTrack({ clips: [makeClip("c1", { duration: 3 })] });
      render(
        <EditorTrack
          {...defaultProps({ track, clipDurations: { c1: 7.5 } })}
        />,
      );
      expect(screen.getByTestId("clip-c1").getAttribute("data-duration")).toBe(
        "7.5",
      );
    });

    it("fallback sur clip.duration si clipDurations absent", () => {
      const track = makeTrack({ clips: [makeClip("c1", { duration: 5 })] });
      render(<EditorTrack {...defaultProps({ track })} />);
      expect(screen.getByTestId("clip-c1").getAttribute("data-duration")).toBe(
        "5",
      );
    });

    it("fallback duration = 3 par défaut", () => {
      const track = makeTrack({ clips: [{ id: "c1", start: 0 }] });
      render(<EditorTrack {...defaultProps({ track })} />);
      expect(screen.getByTestId("clip-c1").getAttribute("data-duration")).toBe(
        "3",
      );
    });

    it("passe le start du clip", () => {
      const track = makeTrack({ clips: [makeClip("c1", { start: 12.5 })] });
      render(<EditorTrack {...defaultProps({ track })} />);
      expect(screen.getByTestId("clip-c1").getAttribute("data-start")).toBe(
        "12.5",
      );
    });

    it("passe snapEnabled", () => {
      const track = makeTrack({ clips: [makeClip("c1")] });
      render(<EditorTrack {...defaultProps({ track, snapEnabled: false })} />);
      expect(screen.getByTestId("clip-c1").getAttribute("data-snap")).toBe(
        "false",
      );
    });
  });

  describe("Couleurs", () => {
    it("utilise getTrackColor si trackColor absent", () => {
      const track = makeTrack({ clips: [makeClip("c1")] });
      render(<EditorTrack {...defaultProps({ track, trackIndex: 1 })} />);
      expect(getTrackColor).toHaveBeenCalledWith(1);
    });

    it("utilise trackColor si fourni (prioritaire)", () => {
      const track = makeTrack({ clips: [makeClip("c1")] });
      render(
        <EditorTrack
          {...defaultProps({ track, trackColor: "#123456", trackIndex: 0 })}
        />,
      );
      expect(
        screen.getByTestId("clip-c1").getAttribute("data-track-color"),
      ).toBe("#123456");
    });
  });

  describe("Sélection", () => {
    it("passe isSelected=true si selectedClipId matche", () => {
      const track = makeTrack({ clips: [makeClip("c1")] });
      render(
        <EditorTrack {...defaultProps({ track, selectedClipId: "c1" })} />,
      );
      expect(screen.getByTestId("clip-c1").getAttribute("data-selected")).toBe(
        "true",
      );
    });

    it("passe isSelected=false sinon", () => {
      const track = makeTrack({ clips: [makeClip("c1")] });
      render(
        <EditorTrack {...defaultProps({ track, selectedClipId: "other" })} />,
      );
      expect(screen.getByTestId("clip-c1").getAttribute("data-selected")).toBe(
        "false",
      );
    });
  });

  describe("Style du track", () => {
    it("background accent-tint si selectedTrackId matche", () => {
      const track = makeTrack({ id: "t1" });
      const { container } = render(
        <EditorTrack {...defaultProps({ track, selectedTrackId: "t1" })} />,
      );
      const root = container.firstChild;
      // ⚠️ jsdom normalise rgba avec espaces
      expect(root.style.background).toMatch(/124,\s*111,\s*247/);
    });

    it("background transparent sinon", () => {
      const track = makeTrack({ id: "t1" });
      const { container } = render(
        <EditorTrack {...defaultProps({ track, selectedTrackId: "other" })} />,
      );
      expect(container.firstChild.style.background).toBe("transparent");
    });
  });
});
