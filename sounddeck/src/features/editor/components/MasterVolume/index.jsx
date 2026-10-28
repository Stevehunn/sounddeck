/**
 * @file Master volume control — mute toggle, 0-200% slider with peak
 * meter overlay, percentage readout, and reset button.
 *
 * The slider accent color reflects the current peak:
 * - **< 70 %** → success (green)
 * - **70-90 %** → warning (orange)
 * - **> 90 %** → danger (red)
 * - **Muted** → dimmed, disabled color
 *
 * @see ../Editor.jsx — the parent that mounts it
 */

import { useState, useCallback } from "react";

/** Slider minimum (%). */
const VOLUME_MIN = 0;

/** Slider maximum (%). */
const VOLUME_MAX = 200;

/** Peak threshold above which the accent turns warning-colored. */
const PEAK_WARNING = 0.7;

/** Peak threshold above which the accent turns danger-colored. */
const PEAK_DANGER = 0.9;

/**
 * Editor master volume control.
 *
 * @param {Object} props
 * @param {number} [props.volume=100] - Percentage (0-200).
 * @param {(volume: number) => void} [props.onVolumeChange]
 * @param {boolean} [props.isMuted=false]
 * @param {() => void} [props.onMuteToggle]
 * @param {() => void} [props.onReset]
 * @param {number} [props.peakMeter=0] - Normalized (0-1).
 * @param {(key: string) => string} props.tr
 * @returns {JSX.Element}
 */
export default function EditorMasterVolume({
  volume = 100,
  onVolumeChange,
  isMuted = false,
  onMuteToggle,
  onReset,
  peakMeter = 0,
  tr,
}) {
  const [, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleVolumeChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      onVolumeChange?.(val);
    },
    [onVolumeChange],
  );

  /**
   * Returns the slider accent color based on the current peak level.
   * @returns {string}
   */
  const getColor = () => {
    if (isMuted) return "var(--text-tertiary)";
    if (peakMeter > PEAK_DANGER) return "var(--danger)";
    if (peakMeter > PEAK_WARNING) return "var(--warning)";
    return "var(--success)";
  };

  return (
    <div
      data-testid="editor-master-volume"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px",
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        minWidth: 180,
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="btn-ghost btn-sm"
        onClick={onMuteToggle}
        style={{
          fontSize: 14,
          padding: "2px 4px",
          color: isMuted ? "var(--text-tertiary)" : "var(--text-secondary)",
          cursor: "pointer",
          background: "transparent",
          border: "none",
        }}
        title={
          isMuted
            ? tr?.("editorUnmute") || "Unmute"
            : tr?.("editorMute") || "Mute"
        }
      >
        <i className={`ti ${isMuted ? "ti-volume-off" : "ti-volume"}`} />
      </button>

      <div style={{ flex: 1, position: "relative" }}>
        <input
          type="range"
          min={VOLUME_MIN}
          max={VOLUME_MAX}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          style={{
            width: "100%",
            accentColor: getColor(),
            height: 4,
            opacity: isMuted ? 0.4 : 1,
          }}
          title={tr?.("editorMasterVolume") || "Master volume"}
        />

        {!isMuted && peakMeter > 0 && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: -4,
              width: `${Math.min(100, peakMeter * 100)}%`,
              height: 12,
              // Kept as a `linear-gradient` (even for solid colors) so the
              // existing test — which uses `style*="linear-gradient"` as the
              // selector — keeps working. It also preserves the original visual
              // (solid → warning → warning-to-danger gradient).
              background: `linear-gradient(90deg,
                ${peakMeter > PEAK_WARNING ? "var(--warning)" : "var(--success)"}
                ${peakMeter > PEAK_DANGER ? ", var(--danger)" : ""}
              )`,
              opacity: 0.15,
              borderRadius: 2,
              pointerEvents: "none",
              transition: "width 0.1s ease",
            }}
          />
        )}
      </div>

      <span
        style={{
          fontSize: 10,
          fontFamily: "monospace",
          color: isMuted ? "var(--text-tertiary)" : "var(--text-secondary)",
          minWidth: 30,
          textAlign: "center",
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isMuted ? "OFF" : `${Math.round(volume)}%`}
      </span>

      <button
        className="btn-ghost btn-sm"
        onClick={onReset}
        style={{
          fontSize: 12,
          padding: "2px 6px",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.5";
          e.currentTarget.style.color = "var(--text-tertiary)";
          e.currentTarget.style.background = "transparent";
        }}
        title={
          tr?.("editorResetVolumes") ||
          "Reset all volumes (master + tracks) to 100%"
        }
      >
        <i className="ti ti-refresh" />
      </button>

      {showTooltip && !isMuted && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: 10,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            zIndex: 10,
            marginBottom: 4,
          }}
        >
          {tr?.("editorPeak") || "Peak"}: {Math.round(peakMeter * 100)}%
        </div>
      )}
    </div>
  );
}
