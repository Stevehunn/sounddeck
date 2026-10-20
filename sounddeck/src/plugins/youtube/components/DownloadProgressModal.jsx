/**
 * @file Modal showing progress during audio download / save operations.
 *
 * Reused for two different flows:
 * 1. **Download** — from `handleDownloadAudio()` in `YouTube.jsx`.
 *    Shows a simulated progress bar (0 → 95%) that reaches 100% when
 *    yt-dlp/ffmpeg finish.
 * 2. **Save** — from `handleSave()`. Shows progress while adding the
 *    sound to the store (including downloading the YouTube thumbnail).
 *
 * Behavior:
 * - 0-99%: animated spinner + "downloadInProgress" title + `pleaseWait` hint
 * - 100%: green checkmark + "downloadComplete" title + `preparingAudio` hint
 *
 * The modal is non-dismissible (no close button, no backdrop click).
 *
 * @see ../YouTube.jsx — parent (`handleDownloadAudio`, `handleSave`)
 */

/**
 * Download / save progress modal.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is shown.
 * @param {number} props.progress - Progress percentage (0-100).
 * @param {string} props.status - Human-readable status line.
 * @param {(key: string) => string} props.t - i18n function.
 * @returns {JSX.Element|null}
 */
export default function DownloadProgressModal({
  visible,
  progress,
  status,
  t,
}) {
  if (!visible) return null

  const isComplete = progress >= 100

  return (
    <div className="modal-overlay" style={{ zIndex: 100000 }}>
      <div className="modal" style={{ width: 420, textAlign: 'center' }}>
        <div className="modal-title" style={{ justifyContent: 'center' }}>
          <i
            className="ti ti-download"
            style={{ color: isComplete ? 'var(--success)' : 'var(--accent)' }}
          />
          {isComplete ? t('downloadComplete') : t('downloadInProgress')}
        </div>
        <div style={{ padding: '20px 0' }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
            color: isComplete ? 'var(--success)' : 'var(--accent)',
          }}>
            {isComplete ? (
              <i className="ti ti-check" style={{ color: 'var(--success)' }} />
            ) : (
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {status}
          </div>
          <div style={{
            width: '100%',
            height: 8,
            background: 'var(--bg-tertiary)',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: isComplete ? 'var(--success)' : 'var(--accent)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {Math.round(progress)}%
          </div>
          {!isComplete && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              {t('pleaseWait')}
            </div>
          )}
          {isComplete && (
            <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 8 }}>
              ✅ {t('preparingAudio')}
            </div>
          )}
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}