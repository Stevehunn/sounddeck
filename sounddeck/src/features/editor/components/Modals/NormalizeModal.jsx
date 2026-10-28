/**
 * @file Normalize modal (Peak vs RMS, target level, max gain).
 *
 * Presents three controls:
 * - **Method** — Peak (avoids clipping) or RMS (consistent perceived volume).
 * - **Target level** — final peak/RMS target in `[0.5, 1]`.
 * - **Max gain** — the gain ceiling in `[1, 20]` (to avoid blowing up
 *   silent clips).
 *
 * The actual normalization is delegated to the parent via
 * `onNormalize(clipId, {method, target, maxGain, outputFormat})`.
 *
 * The "estimated gain" preview is intentionally a **fake placeholder**
 * (`1.00x`) — real per-clip analysis runs on the main thread and would
 * block the modal open. A future iteration may run a worker-based
 * analysis; for now, the value is static.
 *
 * @see ../Editor.jsx — the caller
 * @see @shared/utils/normalizeUtils.js — the actual normalization
 */

import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

/** Target range (perceptual). */
const TARGET_MIN = 0.5
const TARGET_MAX = 1.0
const TARGET_DEFAULT = 0.95

/** Max gain range (linear). */
const MAX_GAIN_MIN = 1
const MAX_GAIN_MAX = 20
const MAX_GAIN_DEFAULT = 10

/** Peak preview placeholder (see @file note). */
const PREVIEW_GAIN_PLACEHOLDER = 1.0

/**
 * Normalize modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {{id: string, name: string, path: string}|null} props.clip
 * @param {string|null} props.trackId
 * @param {() => void} props.onClose
 * @param {(clipId: string, options: {method: 'peak'|'rms', target: number, maxGain: number, outputFormat: 'wav'}) => Promise<void>} props.onNormalize
 * @param {(key: string) => string} props.tr - i18n translator.
 * @returns {JSX.Element|null}
 */
export default function NormalizeModal({
  isOpen,
  clip,
  trackId,
  onClose,
  onNormalize,
  tr,
}) {
  const { t } = useLanguage()
  const [method, setMethod] = useState('peak')
  const [target, setTarget] = useState(TARGET_DEFAULT)
  const [maxGain, setMaxGain] = useState(MAX_GAIN_DEFAULT)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewGain, setPreviewGain] = useState(null)

  // Recompute the preview when the modal opens or the target/method
  // changes. Currently a placeholder (see @file note).
  useEffect(() => {
    if (isOpen && clip) {
      setPreviewGain(PREVIEW_GAIN_PLACEHOLDER)
    }
  }, [isOpen, clip, target, method])

  /**
   * Forwards the normalization to the parent and closes on success.
   * @returns {Promise<void>}
   */
  const handleNormalize = async () => {
    setIsProcessing(true)
    try {
      await onNormalize(clip.id, {
        method,
        target,
        maxGain,
        outputFormat: 'wav',
      })
      onClose()
    } catch (e) {
      console.error('Normalization error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !clip) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-wave" style={{ color: 'var(--accent)' }} />
          {tr('editorNormalize') || 'Normalize'}
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              fontWeight: 400,
              marginLeft: 8,
            }}
          >
            {clip.name}
          </span>
        </div>

        {/* Method (Peak / RMS) */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            {tr('editorNormalizeMethod') || 'Normalization method'}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setMethod('peak')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${
                  method === 'peak'
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                background:
                  method === 'peak'
                    ? 'var(--accent-light)'
                    : 'var(--bg-tertiary)',
                color:
                  method === 'peak'
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                flex: 1,
              }}
            >
              Peak
              <div
                style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
              >
                {tr('editorNormalizePeakDesc') || 'Avoids clipping'}
              </div>
            </button>
            <button
              onClick={() => setMethod('rms')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${
                  method === 'rms' ? 'var(--accent)' : 'var(--border)'
                }`,
                background:
                  method === 'rms'
                    ? 'var(--accent-light)'
                    : 'var(--bg-tertiary)',
                color:
                  method === 'rms'
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                flex: 1,
              }}
            >
              RMS
              <div
                style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
              >
                {tr('editorNormalizeRmsDesc') ||
                  'Consistent perceived volume'}
              </div>
            </button>
          </div>
        </div>

        {/* Target level */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4,
            }}
          >
            {tr('editorNormalizeTarget') || 'Target level'}:{' '}
            {Math.round(target * 100)}% (
            {Math.round(20 * Math.log10(target) * 10) / 10} dB)
          </label>
          <input
            type="range"
            min={TARGET_MIN}
            max={TARGET_MAX}
            step={0.01}
            value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-tertiary)',
            }}
          >
            <span>-6 dB</span>
            <span>0 dB</span>
          </div>
        </div>

        {/* Max gain */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4,
            }}
          >
            {tr('editorNormalizeMaxGain') || 'Max gain'}: {maxGain}x (
            {Math.round(20 * Math.log10(maxGain) * 10) / 10} dB)
          </label>
          <input
            type="range"
            min={MAX_GAIN_MIN}
            max={MAX_GAIN_MAX}
            step={0.5}
            value={maxGain}
            onChange={(e) => setMaxGain(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-tertiary)',
            }}
          >
            <span>0 dB</span>
            <span>+26 dB</span>
          </div>
        </div>

        {/* Estimated gain */}
        {previewGain !== null && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{ marginRight: 4, color: 'var(--accent)' }}
            />
            {tr('editorNormalizeEstimatedGain') || 'Estimated gain'}:{' '}
            <strong>{previewGain.toFixed(2)}x</strong>
            {previewGain > 2 && (
              <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                ⚠️{' '}
                {tr('editorNormalizeHighGainWarning') || 'High amplification'}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="modal-actions"
          style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
        >
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              borderRadius: 'var(--radius-md)',
              minHeight: 40,
              minWidth: 120,
              padding: '8px 24px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {tr('cancel') || 'Cancel'}
          </button>
          <button
            className="btn-primary"
            onClick={handleNormalize}
            disabled={isProcessing}
            style={{
              borderRadius: 'var(--radius-md)',
              minHeight: 40,
              minWidth: 140,
              padding: '8px 24px',
              background: 'var(--accent)',
              color: 'white',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isProcessing ? (
              <>
                <i
                  className="ti ti-loader"
                  style={{ animation: 'spin 1s linear infinite' }}
                />{' '}
                {tr('editorNormalizing') || 'Normalizing...'}
              </>
            ) : (
              <>
                <i className="ti ti-wave" />{' '}
                {tr('editorNormalize') || 'Normalize'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}