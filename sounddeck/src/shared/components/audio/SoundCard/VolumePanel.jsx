// src/shared/components/audio/SoundCard/VolumePanel.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

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
  const [localVolume, setLocalVolume] = useState(volume)

  useEffect(() => {
    setLocalVolume(volume)
  }, [volume])

  const handleSliderChange = (e) => {
    const newVal = parseFloat(e.target.value)
    if (!isNaN(newVal)) {
      setLocalVolume(newVal)
      onChange(newVal)
    }
  }

  const handleSliderMouseUp = () => {
    onCommit(localVolume)
    if (onDragEnd) onDragEnd()
  }

  const handleSliderMouseDown = () => {
    if (onDragStart) onDragStart()
  }

  const resetToZero = () => {
    setLocalVolume(0)
    onChange(0)
    onCommit(0)
  }

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

      {/* Valeur dB */}
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
              localVolume === 0
                ? 'var(--accent)'
                : localVolume > 0
                  ? 'var(--success)'
                  : 'var(--danger)',
          }}
        >
          {localVolume > 0 ? '+' : ''}
          {localVolume}
        </span>
        <span style={{ fontSize: 16, color: 'var(--text-tertiary)', marginLeft: 4 }}>
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
          value={localVolume}
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

      {/* Graduations */}
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
            color: localVolume === 0 ? 'var(--accent)' : 'var(--text-tertiary)',
            fontWeight: localVolume === 0 ? 600 : 400,
            background: localVolume === 0 ? 'var(--accent-light)' : 'transparent',
            padding: '1px 8px',
            borderRadius: 10,
            fontSize: 9,
          }}
        >
          ▸ 0 dB {t('volumeDefault')}
        </span>
        <span>+24 dB</span>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            resetToZero()
          }}
          style={{
            flex: 1,
            background:
              localVolume === 0 ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            border: `1px solid ${
              localVolume === 0 ? 'var(--accent)' : 'var(--border)'
            }`,
            borderRadius: 'var(--radius-md)',
            color:
              localVolume === 0 ? 'var(--accent)' : 'var(--text-secondary)',
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
            if (localVolume !== 0) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }
          }}
          onMouseLeave={(e) => {
            if (localVolume !== 0) {
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