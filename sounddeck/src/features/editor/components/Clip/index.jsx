/**
 * @file Individual clip rendered on the timeline.
 *
 * A clip is a visual block representing a sound segment placed at a
 * given position on a track. This component:
 * - Renders the clip body (background, name, duration, loop overlay).
 * - Handles drag (mouse) to move the clip on the timeline.
 * - Delegates fade handles, resize handles, actions, and waveform overlay
 *   to sibling sub-components (`ClipFadeHandles`, `ClipResizeHandles`,
 *   `ClipActions`, `ClipWaveform`).
 * - Draws the playhead cursor while the timeline is playing.
 * - Shows a vertical snap guide while dragging (when snap targets are
 *   detected by `computeSnapTarget`).
 *
 * ## Drag mechanics
 *
 * Mouse movement is throttled via `requestAnimationFrame`. The drag
 * tracks the accumulated pixel delta (not the current `clientX`), so
 * re-renders during drag don't reset the cursor reference.
 * `snapUtils.computeSnapTarget` is called on every frame to compute the
 * snapped start — unless `Alt` is held (temporary snap disable) or
 * `snapEnabled` is `false`.
 *
 * ## Loop overlay
 *
 * When a clip loop is active (`loopState.clips[id].enabled`), a colored
 * overlay extends from the clip's right edge to the loop end position,
 * with a "LOOP" badge and cycle/duration info. The badge and cycle
 * counts are localized independently of the visual `'LOOP'` abbreviation.
 *
 * @see ./ClipActions.jsx
 * @see ./ClipFadeHandles.jsx
 * @see ./ClipResizeHandles.jsx
 * @see ./ClipWaveform.jsx
 * @see ../../utils/snapUtils.js
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ClipWaveform from "./ClipWaveform";
import ClipFadeHandles from "./ClipFadeHandles";
import ClipActions from "./ClipActions";
import { computeSnapTarget } from "../../utils/snapUtils";

/** Drag sensitivity factor (1.0 = raw pixel-to-time conversion). */
const DRAG_SENSITIVITY = 1.0;

/** Minimum rendered clip width (px). */
const MIN_CLIP_WIDTH_PX = 20;

/** Width of the playhead cursor (px). */
const PLAYHEAD_WIDTH_PX = 2;

/** Threshold above which a drag is considered "moved" (px). */
const DRAG_MOVE_THRESHOLD_PX = 1;

/** Vertical margins of the clip body (px). */
const CLIP_BODY_TOP_PX = 4;
const CLIP_BODY_BOTTOM_PX = 4;

/** Border radius of the clip body (px). */
const CLIP_BORDER_RADIUS_PX = 6;

/** z-index values. */
const Z_INDEX_DRAGGING = 10;
const Z_INDEX_SELECTED = 3;
const Z_INDEX_NORMAL = 2;

/** Offset of the loop overlay badge above the clip (px). */
const LOOP_BADGE_OFFSET_PX = 24;

/** Background opacity for the clip (selected vs normal). */
const CLIP_OPACITY_SELECTED = 0.35;
const CLIP_OPACITY_NORMAL = 0.15;

/**
 * A single clip on the timeline.
 *
 * @param {Object} props
 * @param {{id: string, name?: string, fadeIn?: number, fadeOut?: number}} props.clip
 * @param {Object} props.layout - `{start, duration, pixelsPerSecond, totalDuration?, snapEnabled}`
 * @param {Object} props.state - `{isSelected, isPlaying, currentTime, loopState?}`
 * @param {Object} props.handlers - `{onSelect, onMove, onRemove, onDuplicate, onFade, onContextMenu, onPlayClip, onStopClip, onCopyClip, onCutClip}`
 * @param {Object} props.ui - `{trackId, trackColor, waveformData, tr}`
 * @param {Object} [props.snapContext] - `{allClips, markers, playhead, totalDuration}`
 * @returns {JSX.Element}
 */
export default function EditorClip({
  clip,
  layout,
  state,
  handlers,
  ui,
  snapContext,
}) {
  const {
    start,
    duration,
    pixelsPerSecond,
    totalDuration = 10,
    snapEnabled,
  } = layout;

  const { isSelected, isPlaying, currentTime, loopState = {} } = state;

  const {
    onSelect,
    onMove,
    onRemove,
    onDuplicate,
    onFade,
    onContextMenu,
    onPlayClip,
    onStopClip,
    onCopyClip,
    onCutClip,
  } = handlers;

  const { trackId, trackColor, waveformData, tr } = ui;

  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [localStart, setLocalStart] = useState(start);
  const [snapGuide, setSnapGuide] = useState(null);

  const clipRef = useRef(null);
  const clipContainerRef = useRef(null);
  const dragStartClipId = useRef(null);
  const frameIdRef = useRef(null);
  const dragStartTimeRef = useRef(start);
  const accumulatedDeltaRef = useRef(0);
  const lastClientXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  const clipWidth = Math.max(duration * pixelsPerSecond, MIN_CLIP_WIDTH_PX);
  const clipLeft = localStart * pixelsPerSecond;

  // ─── LOOP STATE ──────────────────────────────────────────────────────
  const isClipLooping =
    (clip?.id && loopState?.clips?.[clip.id]?.enabled) || false;
  const clipLoopData = clip?.id ? loopState?.clips?.[clip.id] : null;

  const loopColor = clipLoopData?.arrowColor || "#22c55e";
  const loopEnd = clipLoopData?.end || totalDuration;
  const loopMode = clipLoopData?.loopMode || "endOfTrack";

  const clipEndPosition = clipWidth;
  const loopEndRelativePosition = Math.max(
    0,
    (loopEnd - start) * pixelsPerSecond,
  );
  const loopWidth = Math.max(0, loopEndRelativePosition - clipEndPosition);

  const totalCycles = clipLoopData?.totalCycles || 1;

  // Sync local start with the prop when the user isn't dragging.
  useEffect(() => {
    dragStartTimeRef.current = start;
    if (!isDragging && localStart !== start) {
      setLocalStart(start);
    }
  }, [start, isDragging, localStart]);

  // Track whether the current clip is the one being played.
  useEffect(() => {
    setIsClipPlaying(
      isPlaying && currentTime >= start && currentTime <= start + duration,
    );
  }, [isPlaying, currentTime, start, duration]);

  const playheadPosition = Math.max(
    0,
    Math.min(
      (currentTime - start) * pixelsPerSecond,
      clipWidth - PLAYHEAD_WIDTH_PX,
    ),
  );

  // ─── HANDLERS ────────────────────────────────────────────────────────

  /**
   * Opens the context menu at the cursor position.
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onContextMenu) {
        onContextMenu(e, clip.id, trackId);
      }
    },
    [clip.id, trackId, onContextMenu],
  );

  /**
   * Starts a drag on the clip (or forwards the click to the action buttons
   * if they were hit).
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;

    const target = e.target;
    const isActionButton =
      target.closest?.(".delete-button") ||
      target.closest?.("[data-action]") ||
      target.closest?.("button");

    if (isActionButton) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    onSelect?.(clip.id);
    dragStartClipId.current = clip.id;
    setIsDragging(true);
    isDraggingRef.current = true;
    lastClientXRef.current = e.clientX;
    accumulatedDeltaRef.current = 0;
    hasMovedRef.current = false;
    dragStartTimeRef.current = start;

    e.stopPropagation();
    e.preventDefault();
  };

  /**
   * Handles the throttled drag (rAF).
   *
   * @param {MouseEvent} e
   * @returns {void}
   */
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return;

      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }

      frameIdRef.current = requestAnimationFrame(() => {
        const deltaPixels = e.clientX - lastClientXRef.current;
        lastClientXRef.current = e.clientX;

        accumulatedDeltaRef.current += deltaPixels;

        const totalDeltaSeconds =
          (accumulatedDeltaRef.current / pixelsPerSecond) * DRAG_SENSITIVITY;

        let newStart = Math.max(
          0,
          dragStartTimeRef.current + totalDeltaSeconds,
        );

        // Alt held → temporarily disable snap.
        const snapActive = snapEnabled && !e.altKey;

        if (snapActive && snapContext) {
          const result = computeSnapTarget({
            proposedStart: newStart,
            clipDuration: duration,
            clipId: clip.id,
            allClips: snapContext.allClips,
            markers: snapContext.markers,
            playhead: snapContext.playhead,
            totalDuration: snapContext.totalDuration,
            pixelsPerSecond,
          });

          newStart = result.start;

          if (result.snappedTo !== null) {
            setSnapGuide(result.snappedTo);
          } else {
            setSnapGuide(null);
          }
        } else {
          setSnapGuide(null);
        }

        if (Math.abs(accumulatedDeltaRef.current) > DRAG_MOVE_THRESHOLD_PX) {
          hasMovedRef.current = true;
        }

        setLocalStart(newStart);
        frameIdRef.current = null;
      });
    },
    [pixelsPerSecond, snapEnabled, snapContext, duration, clip.id],
  );

  /**
   * Commits the drag (if the clip actually moved) and resets the state.
   *
   * @returns {void}
   */
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    const finalStart = localStart;

    if (hasMovedRef.current && onMove && dragStartClipId.current) {
      onMove(dragStartClipId.current, finalStart, null, { skipHistory: true });
    }

    setIsDragging(false);
    isDraggingRef.current = false;
    dragStartClipId.current = null;
    accumulatedDeltaRef.current = 0;
    hasMovedRef.current = false;
    setSnapGuide(null);
  }, [localStart, onMove]);

  // Attach global drag listeners while dragging.
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * Mixes the track color with the current background at a low opacity.
   *
   * @param {string} baseColor
   * @returns {string} A `color-mix(...)` CSS value.
   */
  const getClipColor = (baseColor) => {
    const opacity = isSelected ? CLIP_OPACITY_SELECTED : CLIP_OPACITY_NORMAL;
    return `color-mix(in srgb, ${baseColor} ${opacity * 100}%, var(--bg-secondary))`;
  };

  /**
   * Plays the current clip only (solo preview).
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handlePlay = (e) => {
    e?.stopPropagation?.();
    onPlayClip?.(clip, trackId);
  };

  /**
   * Stops the current clip.
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleStop = (e) => {
    e?.stopPropagation?.();
    onStopClip?.(clip.id);
  };

  /**
   * Forwards the duplicate intent to the parent (skips if any arg is
   * missing).
   *
   * @param {string} clipId
   * @param {string} tid
   * @returns {void}
   */
  const handleDuplicate = (clipId, tid) => {
    if (onDuplicate && clipId && tid) {
      onDuplicate(clipId, tid);
    }
  };

  /**
   * Forwards the removal intent to the parent (skips if any arg is
   * missing).
   *
   * @param {string} tid
   * @param {string} clipId
   * @returns {void}
   */
  const handleRemove = (tid, clipId) => {
    if (onRemove && clipId && tid) {
      onRemove(tid, clipId);
    }
  };

  /**
   * Forwards the copy intent to the parent.
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleCopy = (e) => {
    e?.stopPropagation?.();
    onCopyClip?.(clip);
  };

  /**
   * Forwards the cut intent to the parent.
   *
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const handleCut = (e) => {
    e?.stopPropagation?.();
    onCutClip?.(clip);
  };

  // ─── LOOP OVERLAY ────────────────────────────────────────────────────

  const renderLoopOverlay = useMemo(() => {
    if (!isClipLooping) return null;
    if (loopWidth <= 0) return null;

    const loopStart = clipWidth;

    return (
      <div
        ref={clipContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: loopStart,
          width: loopWidth,
          height: "100%",
          pointerEvents: "none",
          zIndex: 5,
          background: `linear-gradient(90deg, ${loopColor}15, ${loopColor}05)`,
          borderLeft: `2px dashed ${loopColor}50`,
          borderRight: `2px solid ${loopColor}`,
          borderRadius: "0 4px 4px 0",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -2,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: loopColor,
              opacity: 0.9,
              textShadow: `0 0 20px ${loopColor}60, 0 0 40px ${loopColor}30`,
              lineHeight: 1,
            }}
          >
            ]
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            right: -2,
            bottom: 4,
            fontSize: 7,
            fontWeight: 600,
            color: loopColor,
            opacity: 0.7,
            background: "rgba(0,0,0,0.8)",
            padding: "2px 8px",
            borderRadius: 3,
            border: `1px solid ${loopColor}40`,
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {tr?.("editorClipLoopEnd") || "END"}{" "}
          {(loopWidth / pixelsPerSecond).toFixed(1)}s
        </div>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: loopWidth,
            height: 2,
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `repeating-linear-gradient(90deg, ${loopColor}, ${loopColor} 6px, transparent 6px, transparent 12px)`,
              opacity: 0.4,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderLeft: `6px solid ${loopColor}`,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              opacity: 0.6,
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: -LOOP_BADGE_OFFSET_PX,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 8,
            fontWeight: 600,
            color: loopColor,
            background: "rgba(0,0,0,0.9)",
            padding: "2px 12px",
            borderRadius: 4,
            border: `1px solid ${loopColor}`,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <span>🔁 {tr?.("editorClipLoop") || "LOOP"}</span>
          {loopMode === "cycles" && totalCycles > 1 && (
            <span
              style={{
                fontSize: 7,
                opacity: 0.7,
                background: "rgba(255,255,255,0.1)",
                padding: "0 6px",
                borderRadius: 2,
              }}
            >
              {totalCycles}x
            </span>
          )}
          {loopMode === "manualDuration" && (
            <span
              style={{ fontSize: 7, opacity: 0.7, fontFamily: "monospace" }}
            >
              {(loopWidth / pixelsPerSecond).toFixed(1)}s
            </span>
          )}
          <span
            style={{
              fontSize: 7,
              opacity: 0.5,
              fontFamily: "monospace",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              paddingLeft: 6,
            }}
          >
            +{(loopWidth / pixelsPerSecond).toFixed(1)}s
          </span>
        </div>
      </div>
    );
  }, [
    isClipLooping,
    loopWidth,
    clipWidth,
    loopColor,
    loopMode,
    totalCycles,
    pixelsPerSecond,
  ]);

  // ─── RENDER ─────────────────────────────────────────────────────────

  return (
    <div
      ref={clipRef}
      data-testid="editor-clip"
      data-clip-id={clip.id}
      data-track-id={trackId}
      className="editor-clip-wrapper"
      style={{
        position: "absolute",
        top: CLIP_BODY_TOP_PX,
        bottom: CLIP_BODY_BOTTOM_PX,
        left: clipLeft,
        width: clipWidth,
        minWidth: 10,
        background: getClipColor(trackColor),
        border: `2px solid ${
          isSelected
            ? "var(--accent)"
            : isClipLooping
              ? "var(--success)"
              : trackColor
        }`,
        borderRadius: CLIP_BORDER_RADIUS_PX,
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging
          ? "none"
          : "border-color 0.15s, box-shadow 0.15s, left 0.05s ease",
        boxShadow: isSelected
          ? "0 0 20px rgba(124,111,247,0.3)"
          : isClipLooping
            ? "0 0 15px rgba(34,197,94,0.2)"
            : "none",
        zIndex: isDragging
          ? Z_INDEX_DRAGGING
          : isSelected
            ? Z_INDEX_SELECTED
            : Z_INDEX_NORMAL,
        opacity: isDragging ? 0.8 : 1,
        overflow: "visible",
        userSelect: "none",
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Snap guide (only during a drag with a detected snap target) */}
      {snapGuide !== null && (
        <div
          style={{
            position: "absolute",
            top: -8,
            bottom: -8,
            left: snapGuide * pixelsPerSecond - clipLeft,
            width: 2,
            background: "var(--warning)",
            zIndex: 20,
            pointerEvents: "none",
            boxShadow: "0 0 12px var(--warning), 0 0 4px var(--warning)",
            transform: "translateX(-1px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "6px solid var(--warning)",
            }}
          />
        </div>
      )}

      {renderLoopOverlay}

      {/* Loop badge on the clip itself */}
      {isClipLooping && (
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 4,
            zIndex: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(0,0,0,0.8)",
            padding: "1px 8px 1px 4px",
            borderRadius: 3,
            pointerEvents: "none",
            border: `1px solid ${loopColor}40`,
          }}
        >
          <span style={{ fontSize: 10 }}>🔁</span>
          <span
            style={{ fontSize: 7, fontWeight: 600, color: "var(--success)" }}
          >
            {tr?.("editorClipLoop") || "LOOP"}
          </span>
          {loopMode === "cycles" && totalCycles > 1 && (
            <span
              style={{
                fontSize: 7,
                color: "var(--text-tertiary)",
                opacity: 0.7,
              }}
            >
              {totalCycles}x
            </span>
          )}
          <span
            style={{
              fontSize: 7,
              color: "var(--text-tertiary)",
              opacity: 0.5,
              fontFamily: "monospace",
            }}
          >
            → {loopEnd.toFixed(1)}s
          </span>
        </div>
      )}

      <ClipWaveform
        waveformData={waveformData}
        trackColor={trackColor}
        duration={duration}
      />

      {/* Clip name + duration label */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 6,
          right: 6,
          fontSize: 9,
          fontWeight: 500,
          color: "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}
      >
        {clip.name || "Clip"}
        <span
          style={{
            marginLeft: 4,
            fontSize: 8,
            opacity: 0.6,
            color: "var(--text-tertiary)",
          }}
        >
          {duration.toFixed(1)}s
        </span>
        {isClipLooping && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 7,
              color: "var(--success)",
              opacity: 0.8,
            }}
          >
            🔁
          </span>
        )}
        {isClipLooping && loopMode === "cycles" && totalCycles > 1 && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 7,
              color: "var(--text-tertiary)",
              opacity: 0.6,
            }}
          >
            {totalCycles}x
          </span>
        )}
      </div>

      {/* Quick-action buttons (play/stop, copy, cut) on hover */}
      {isHovering && (
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 4,
            display: "flex",
            gap: 2,
            zIndex: 7,
            pointerEvents: "auto",
          }}
        >
          {isClipPlaying ? (
            <button
              onClick={handleStop}
              style={{
                padding: "2px 5px",
                fontSize: 10,
                color: "var(--warning)",
                background: "rgba(0,0,0,0.6)",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
              }}
              title={tr?.("editorClipTooltipStop") || "Arrêter"}
            >
              <i className="ti ti-player-stop" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              style={{
                padding: "2px 5px",
                fontSize: 10,
                color: "var(--success)",
                background: "rgba(0,0,0,0.6)",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
              }}
              title={tr?.("editorClipTooltipPlay") || "Jouer le clip"}
            >
              <i className="ti ti-player-play" />
            </button>
          )}

          <button
            onClick={handleCopy}
            style={{
              padding: "2px 5px",
              fontSize: 10,
              color: "var(--text-secondary)",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
            title={tr?.("editorClipTooltipCopy") || "Copier"}
          >
            <i className="ti ti-copy" />
          </button>

          <button
            onClick={handleCut}
            style={{
              padding: "2px 5px",
              fontSize: 10,
              color: "var(--warning)",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
            title={tr?.("editorClipTooltipCut") || "Couper"}
          >
            <i className="ti ti-cut" />
          </button>
        </div>
      )}

      <ClipFadeHandles
        clip={clip}
        trackId={trackId}
        isSelected={isSelected}
        isHovering={isHovering}
        onFade={onFade}
        pixelsPerSecond={pixelsPerSecond}
      />

      <ClipActions
        isSelected={isSelected}
        isHovering={isHovering}
        clipId={clip.id}
        trackId={trackId}
        onDuplicate={handleDuplicate}
        onRemove={handleRemove}
        tr={tr}
      />

      {/* Playhead cursor (only while playing AND inside the clip) */}
      {isPlaying && currentTime >= start && currentTime <= start + duration && (
        <div
          style={{
            position: "absolute",
            left: playheadPosition,
            top: 0,
            bottom: 0,
            width: PLAYHEAD_WIDTH_PX,
            background: isClipPlaying
              ? "var(--accent)"
              : "rgba(124,111,247,0.4)",
            zIndex: 4,
            boxShadow: isClipPlaying
              ? "0 0 10px rgba(124,111,247,0.5)"
              : "none",
            pointerEvents: "none",
            transition: isClipPlaying ? "none" : "left 0.05s ease",
          }}
        />
      )}
    </div>
  );
}
