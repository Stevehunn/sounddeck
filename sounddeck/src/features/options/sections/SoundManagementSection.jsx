// src/features/options/sections/SoundManagementSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import Section from '../Section'
import OptionRow from '../OptionRow'
import Toggle from '../Toggle'

export default function SoundManagementSection({ sectionRef, store, addToast }) {
  const { t } = useLanguage()

  return (
    <Section
      ref={sectionRef}
      id="soundManagement"
      title={t('soundManagement')}
      icon="ti-music"
    >
      <OptionRow label={t('normalization')} sub={t('normalizationDesc')}>
        <Toggle
          value={store.normalizationEnabled}
          onChange={store.updateNormalizationEnabled}
        />
      </OptionRow>

      {store.normalizationEnabled && (
        <>
          <OptionRow
            label={t('normalizationTarget')}
            sub={t('normalizationTargetDesc')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <input
                type="range"
                min="0.02"
                max="1.0"
                step="0.005"
                value={store.normalizationTarget}
                onChange={(e) =>
                  store.updateNormalizationTarget(Number(e.target.value))
                }
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <span style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                minWidth: 70,
                fontFamily: 'monospace',
                fontWeight: 600,
                background: 'var(--bg-tertiary)',
                padding: '2px 10px',
                borderRadius: 4,
              }}>
                {Math.round(-20 * Math.log10(store.normalizationTarget))} dB
              </span>
            </div>
          </OptionRow>

          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginTop: 4,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-tertiary)',
              marginBottom: 4,
            }}>
              <span>{t('normalizationLabelLow')}</span>
              <span>{t('normalizationLabelMedium')}</span>
              <span>{t('normalizationLabelHigh')}</span>
            </div>
            <div style={{
              display: 'flex',
              gap: 2,
              height: 6,
              background: 'var(--bg-secondary)',
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${(store.normalizationTarget / 1.0) * 100}%`,
                background: `linear-gradient(90deg, ${
                  store.normalizationTarget < 0.2
                    ? 'var(--danger)'
                    : store.normalizationTarget < 0.4
                      ? 'var(--warning)'
                      : 'var(--success)'
                })`,
                borderRadius: 3,
                transition: 'width 0.2s ease, background 0.3s ease',
              }} />

              <div style={{
                position: 'absolute',
                top: -2,
                left: '20%',
                width: 2,
                height: 10,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 1,
                zIndex: 2,
              }} />
              <div style={{
                position: 'absolute',
                top: 10,
                left: '20%',
                transform: 'translateX(-50%)',
                fontSize: 7,
                color: 'rgba(255,255,255,0.2)',
                zIndex: 2,
                whiteSpace: 'nowrap',
              }}>
                {t('normalizationDefaultLabel')}
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: 'var(--text-tertiary)',
              marginTop: 6,
            }}>
              <span style={{ color: store.normalizationTarget < 0.2 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                -34 dB
              </span>
              <span style={{ color: Math.abs(store.normalizationTarget - 0.2) < 0.01 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                -14 dB
              </span>
              <span style={{ color: store.normalizationTarget > 0.7 ? 'var(--success)' : 'var(--text-tertiary)' }}>
                0 dB
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginTop: 8,
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            lineHeight: 1.6,
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            <strong>{t('normalizationAdvice')}</strong>
            {store.normalizationTarget < 0.15 && ` ${t('normalizationAdviceLow')}`}
            {store.normalizationTarget >= 0.15 && store.normalizationTarget < 0.3 && ` ${t('normalizationAdviceMedium')}`}
            {store.normalizationTarget >= 0.3 && store.normalizationTarget < 0.6 && ` ${t('normalizationAdviceModerate')}`}
            {store.normalizationTarget >= 0.6 && ` ${t('normalizationAdviceHigh')}`}
          </div>
        </>
      )}

      <OptionRow label={t('reanalyzeGains')} sub={t('reanalyzeGainsDesc')}>
        <button
          className="btn-secondary"
          onClick={async () => {
            await store.resetGainCache?.()
            addToast(t('gainCacheCleared'), 'info')
          }}
          style={{
            fontSize: 12,
            minHeight: 34,
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <i className="ti ti-refresh" /> {t('reanalyzeGains')}
        </button>
      </OptionRow>
    </Section>
  )
}