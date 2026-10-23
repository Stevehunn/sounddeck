/**
 * @file One row in the playlist items list — draggable, editable delay,
 * delete button, active/progress indicators.
 *
 * @see ./PlaylistItemsList.jsx (parent)
 */

import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'

/**
 * One playlist item.
 *
 * @param {Object} props
 * @param {Object} props.item - `{id, soundId, delay}`.
 * @param {number} props.idx
 * @param {Object|null} props.sound - The matching sound (or `null` if deleted).
 * @param {boolean} props.isActive - Currently playing.
 * @param {boolean} props.isDragOver - Show the drop indicator.
 * @param {{ratio: number, current: number, duration: number}|null} props.currentProgress
 * @param {(e: React.DragEvent, idx: number) => void} props.onDragStart
 * @param {(e: React.DragEvent) => void} props.onDragEnd
 * @param {(e: React.DragEvent, idx: number) => void} props.onDragOver
 * @param {(e: React.DragEvent) => void} props.onDragLeave
 * @param {(e: React.DragEvent, idx: number) => void} props.onDrop
 * @param {(idx: number, changes: Object) => void} props.onUpdateItem
 * @param {(idx: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
export default function PlaylistItem({
  item,
  idx,
  sound,
  isActive,
  isDragOver,
  currentProgress,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onUpdateItem,
  onRemove,
}) {
  const { t } = useLanguage()

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, idx)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, idx)}
      className={`sequencer-item ${isActive ? 'active' : ''} ${
        isDragOver ? 'drag-over' : ''
      }`}
      data-testid={`playlist-item-${item.id}`}
      style={{
        borderRadius: 'var(--radius-md)',
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        transition:
          'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
        cursor: 'grab',
        border: isDragOver
          ? '2px solid var(--accent)'
          : '1px solid var(--border)',
        background: isDragOver
          ? 'rgba(124,111,247,0.08)'
          : isActive
            ? 'var(--accent-light)'
            : 'var(--bg-secondary)',
        boxShadow: isDragOver ? '0 0 20px rgba(124,111,247,0.15)' : 'none',
        position: 'relative',
        zIndex: isDragOver ? 10 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        marginBottom: 6,
      }}
    >
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: 4,
            right: 4,
            height: 3,
            background: 'var(--accent)',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 5,
            animation: 'slideIn 0.2s ease',
            boxShadow: '0 0 10px var(--accent)',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-tertiary)',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <i className="ti ti-grip-vertical" style={{ opacity: 0.4 }} />
        <span
          style={{
            minWidth: 20,
            textAlign: 'center',
            fontWeight: 600,
            color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
          }}
        >
          {idx + 1}
        </span>
      </div>

      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {sound?.image ? (
          <img
            src={buildFileUrl(sound.image)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          sound?.emoji || '🔊'
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          }}
        >
          {sound?.name || (
            <span style={{ color: 'var(--danger)', fontSize: 12 }}>
              {t('editorNoSound')}
            </span>
          )}
        </div>
        {isActive && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <i
                className="ti ti-volume"
                style={{ animation: 'pulse 1s ease infinite' }}
              />{' '}
              {t('playing')}
            </div>
            {currentProgress && (
              <div className="progress-bar" style={{ height: 3 }}>
                <div className="track">
                  <div
                    className="fill accent"
                    style={{ width: `${currentProgress.ratio * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <i
          className="ti ti-clock"
          style={{ fontSize: 13, color: 'var(--text-tertiary)' }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: 'var(--text-tertiary)',
              marginBottom: 1,
            }}
          >
            {t('delayAfter')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={item.delay || 0}
              onChange={(e) =>
                onUpdateItem(idx, {
                  delay: Math.max(0, Number(e.target.value)),
                })
              }
              className="input-sm"
              style={{
                width: 55,
                textAlign: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              s
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onRemove(idx)}
        style={{
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: 14,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(224, 82, 82, 0.1)'
          e.currentTarget.style.color = 'var(--danger)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-tertiary)'
        }}
        title={t('delete')}
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  )
}