/**
 * @file Floating volume panel for a SoundCard.
 *
 * Opens as a portal next to the card when the user clicks "Volume" in the
 * context menu. Shows:
 * - The sound name (truncated)
 * - The current volume in dB (−24 to +24, step 0.5)
 * - A slider for live adjustment
 * - A "Reset to 0 dB" button
 * - A "Close" button
 *
 * **Controlled component**: it doesn't own any local state — the parent
 * (`SoundCard/index.jsx`) owns `localVolume` and passes `volume` down. This
 * keeps the display in sync with the parent's canonical state without a
 * `setState-in-effect` sync (see React 19 rule).
 *
 * Commit vs live update:
 * - `onChange(val)` is called on every slider move (updates the parent's
 *   `localVolume` so the slider stays responsive).
 * - `onCommit(val)` is called on `mouseup`/`touchend` (writes to the store).
 *   This avoids spamming `store.updateSoundVolume()` 60 times per drag.
 *
 * Closes on outside click (mousedown anywhere except `#volume-panel`).
 *
 * @see ./index.jsx — parent (positioning + integration)
 */

import { useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

/**
 * Floating volume panel.
 *
 * @param {Object} props
 * @param {number} props.volume - Current volume in dB (−24 to +24).
 * @param {(v: number) => void} props.onChange - Called on every slider move.
 * @param {(v: number) => void} props.onCommit - Called on slider release.
 * @param {() => void} props.onClose - Close the panel.
 * @param {() => void} [props.onDragStart] - Called when the user grabs the slider.
 * @param {() => void} [props.onDragEnd] - Called when the user releases the slider.
 * @param {string} [props.soundName] - Sound name (shown in the header).
 * @param {{top: number, left: number}} [props.position] - Absolute position.
 * @returns {JSX.Element}
 */
export default function VolumePanel({
  volume,
  onChange,
  onCommit,
  onClose,
  onDragStart,
  onDragEnd,
  soundName,
  position,
}) {
  const { t } = useLanguage()

  const handleSliderChange = (e) => {
    const newVal = parseFloat(e.target.value)
    if (!isNaN(newVal)) {
      onChange(newVal)
    }
  }

  const handleSliderMouseUp = (e) => {
    // Read the current value from the slider (avoids stale `volume` if the
    // parent's re-render was batched with the last `onChange`).
    const val = parseFloat(e?.target?.value)
    onCommit(isNaN(val) ? volume : val)
    if (onDragEnd) onDragEnd()
  }

  const handleSliderMouseDown = () => {
    if (onDragStart) onDragStart()
  }

  const resetToZero = () => {
    onChange(0)
    onCommit(0)
  }

  // Close on outside click (mousedown anywhere except the panel).
  useEffect(() => {
    const handleClickOutside = (e) => {
      const panel = document.getElementById('volume-panel')
      if (panel && !panel.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      id="volume-panel"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: position?.top || '50%',
        left: position?.left || '50%',
        transform: position?.top ? 'none' : 'translate(-50%, -50%)',
        zIndex: 99999,
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        width: 320,
        maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            {soundName?.charAt(0)?.toUpperCase() || '🔊'}
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {t('menuVolume')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {soundName || ''}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 4,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* dB value */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 16,
          padding: '8px 0',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color:
              volume === 0
                ? 'var(--accent)'
                : volume > 0
                  ? 'var(--success)'
                  : 'var(--danger)',
          }}
        >
          {volume > 0 ? '+' : ''}
          {volume}
        </span>
        <span
          style={{ fontSize: 16, color: 'var(--text-tertiary)', marginLeft: 4 }}
        >
          dB
        </span>
      </div>

      {/* Slider */}
      <div style={{ padding: '4px 0' }}>
        <input
          type="range"
          min="-24"
          max="24"
          step="0.5"
          value={volume}
          onChange={handleSliderChange}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          onTouchStart={handleSliderMouseDown}
          onTouchEnd={handleSliderMouseUp}
          style={{
            width: '100%',
            accentColor: 'var(--accent)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            height: 6,
          }}
        />
      </div>

      {/* Ticks */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          marginBottom: 16,
        }}
      >
        <span>-24 dB</span>
        <span
          style={{
            color: volume === 0 ? 'var(--accent)' : 'var(--text-tertiary)',
            fontWeight: volume === 0 ? 600 : 400,
            background:
              volume === 0 ? 'var(--accent-light)' : 'transparent',
            padding: '1px 8px',
            borderRadius: 10,
            fontSize: 9,
          }}
        >
          ▸ 0 dB {t('volumeDefault')}
        </span>
        <span>+24 dB</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            resetToZero()
          }}
          style={{
            flex: 1,
            background:
              volume === 0 ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            border: `1px solid ${
              volume === 0 ? 'var(--accent)' : 'var(--border)'
            }`,
            borderRadius: 'var(--radius-md)',
            color: volume === 0 ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (volume !== 0) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }
          }}
          onMouseLeave={(e) => {
            if (volume !== 0) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
            }
          }}
          title={t('volumeReset')}
        >
          <i className="ti ti-refresh" style={{ fontSize: 14 }} />
          <span>{t('reset')}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
        >
          <i className="ti ti-check" /> {t('volumePanelClose')}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}