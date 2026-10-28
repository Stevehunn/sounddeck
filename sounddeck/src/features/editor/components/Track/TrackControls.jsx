/**
 * @file Per-track mute / solo / volume controls.
 *
 * Renders three elements in a row:
 * - **Mute** — toggles `track.muted`, dims the icon when active.
 * - **Solo** — toggles `track.solo`, green when active.
 * - **Volume** — 0-200% range slider (values are divided by 100 to
 *   produce a 0-2 gain for the audio graph).
 *
 * @see ./index.jsx
 * @see ./TrackHeader.jsx
 */

import { memo } from 'react'

/**
 * Track mute / solo / volume controls.
 *
 * @param {Object} props
 * @param {{id: string, muted?: boolean, solo?: boolean, volume?: number}} props.track
 * @param {string} props.trackColor - Slider accent color.
 * @param {(trackId: string, muted: boolean) => void} [props.onTrackMute]
 * @param {(trackId: string, solo: boolean) => void} [props.onTrackSolo]
 * @param {(trackId: string, volume: number) => void} [props.onTrackVolume]
 * @param {(key: string) => string} props.tr
 * @returns {JSX.Element}
 */
const TrackControls = memo(function TrackControls({
  track,
  trackColor,
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  tr,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
      }}
    >
      <button
        className="btn-ghost btn-sm"
        onClick={() => onTrackMute?.(track.id, !track.muted)}
        style={{
          padding: '2px 4px',
          fontSize: 12,
          color: track.muted ? 'var(--danger)' : 'var(--text-tertiary)',
          borderRadius: 3,
          minWidth: 20,
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: track.muted ? 'rgba(224, 82, 82, 0.1)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!track.muted) {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }
        }}
        onMouseLeave={(e) => {
          if (!track.muted) {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }
        }}
        title={tr?.('editorMute')}
      >
        <i className={`ti ${track.muted ? 'ti-volume-3' : 'ti-volume'}`} />
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={() => onTrackSolo?.(track.id, !track.solo)}
        style={{
          padding: '2px 4px',
          fontSize: 12,
          color: track.solo ? 'var(--success)' : 'var(--text-tertiary)',
          borderRadius: 3,
          minWidth: 20,
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: track.solo ? 'rgba(29, 158, 117, 0.1)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!track.solo) {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }
        }}
        onMouseLeave={(e) => {
          if (!track.solo) {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }
        }}
        title={tr?.('editorSolo')}
      >
        <i className="ti ti-headphones" />
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: 40,
        }}
      >
        <input
          type="range"
          min="0"
          max="200"
          value={track.volume !== undefined ? track.volume * 100 : 100}
          onChange={(e) =>
            onTrackVolume?.(track.id, parseFloat(e.target.value) / 100)
          }
          style={{
            width: '100%',
            height: 3,
            accentColor: trackColor,
            cursor: 'pointer',
            background: 'transparent',
          }}
          title={tr?.('editorTrackVolume') || 'Track volume'}
        />
      </div>
    </div>
  )
})

TrackControls.displayName = 'TrackControls'

export default TrackControls