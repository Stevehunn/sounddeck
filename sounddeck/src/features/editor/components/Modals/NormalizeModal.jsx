// src/features/editor/components/Modals/NormalizeModal.jsx
import React, { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function NormalizeModal({
  isOpen,
  clip,
  trackId,
  onClose,
  onNormalize,
  tr
}) {
  const { t } = useLanguage()
  const [method, setMethod] = useState('peak')
  const [target, setTarget] = useState(0.95)
  const [maxGain, setMaxGain] = useState(10)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewGain, setPreviewGain] = useState(null)

  useEffect(() => {
    if (isOpen && clip) {
      analyzeClip()
    }
  }, [isOpen, clip, target, method])

  const analyzeClip = async () => {
    setPreviewGain(1.0)
  }

  const handleNormalize = async () => {
    setIsProcessing(true)
    try {
      await onNormalize(clip.id, {
        method,
        target,
        maxGain,
        outputFormat: 'wav'
      })
      onClose()
    } catch (e) {
      console.error('Erreur normalisation:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !clip) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-wave" style={{ color: 'var(--accent)' }} />
          {tr('editorNormalize') || 'Normaliser'}
          <span style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            marginLeft: 8
          }}>
            {clip.name}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            {tr('editorNormalizeMethod') || 'Méthode de normalisation'}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setMethod('peak')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${method === 'peak' ? 'var(--accent)' : 'var(--border)'}`,
                background: method === 'peak' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: method === 'peak' ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                flex: 1
              }}
            >
              Peak
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {tr('editorNormalizePeakDesc') || 'Évite l\'écrêtage'}
              </div>
            </button>
            <button
              onClick={() => setMethod('rms')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${method === 'rms' ? 'var(--accent)' : 'var(--border)'}`,
                background: method === 'rms' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: method === 'rms' ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                flex: 1
              }}
            >
              RMS
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {tr('editorNormalizeRmsDesc') || 'Volume perçu homogène'}
              </div>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {tr('editorNormalizeTarget') || 'Niveau cible'}: {Math.round(target * 100)}% ({Math.round(20 * Math.log10(target) * 10) / 10} dB)
          </label>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={target}
            onChange={e => setTarget(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
            <span>-6 dB</span>
            <span>0 dB</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {tr('editorNormalizeMaxGain') || 'Gain maximum'}: {maxGain}x ({Math.round(20 * Math.log10(maxGain) * 10) / 10} dB)
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={maxGain}
            onChange={e => setMaxGain(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
            <span>0 dB</span>
            <span>+26 dB</span>
          </div>
        </div>

        {previewGain !== null && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
            fontSize: 12,
            color: 'var(--text-secondary)'
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {tr('editorNormalizeEstimatedGain') || 'Gain estimé'}: <strong>{previewGain.toFixed(2)}x</strong>
            {previewGain > 2 && (
              <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                ⚠️ {tr('editorNormalizeHighGainWarning') || 'Forte amplification'}
              </span>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
              gap: 6
            }}
          >
            {tr('cancel') || 'Annuler'}
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
              gap: 6
            }}
          >
            {isProcessing ? (
              <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorNormalizing') || 'Normalisation...'}</>
            ) : (
              <><i className="ti ti-wave" /> {tr('editorNormalize') || 'Normaliser'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}