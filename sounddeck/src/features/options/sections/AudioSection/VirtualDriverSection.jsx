// src/features/options/sections/AudioSection/VirtualDriverSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import OptionRow from '../../OptionRow'

export default function VirtualDriverSection({
  store,
  isInstallingDriver,
  isDetecting,
  onInstallDriver,
  onDetectDevices,
}) {
  const { t } = useLanguage()

  return (
    <OptionRow label={t('virtualDriver')} sub={t('virtualDriverSub')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {store.virtualDriverInstalled ? (
            <span style={{ color: 'var(--success)', fontSize: 13 }}>
              <i className="ti ti-check" /> ✅ {t('virtualDriverDetected')}
            </span>
          ) : (
            <button
              className="btn-primary"
              onClick={onInstallDriver}
              disabled={isInstallingDriver}
              style={{ fontSize: 12 }}
            >
              {isInstallingDriver ? (
                <>
                  <i
                    className="ti ti-loader"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />{' '}
                  {t('installing')}
                </>
              ) : (
                <>
                  <i className="ti ti-download" /> {t('installVirtualDriver')}
                </>
              )}
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={onDetectDevices}
            disabled={isDetecting}
            style={{
              fontSize: 12,
              minHeight: 34,
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <i
              className={`ti ${isDetecting ? 'ti-loader' : 'ti-refresh'}`}
              style={isDetecting ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {isDetecting ? '...' : t('detect')}
          </button>
        </div>

        {!store.virtualDriverInstalled && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '8px 12px',
              borderRadius: 6,
              lineHeight: 1.6,
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{ marginRight: 4, color: 'var(--accent)' }}
            />
            {t('virtualDriverInfo')}
          </div>
        )}

        {store.virtualDriverInstalled && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--success)',
              background: 'rgba(29,158,117,0.1)',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--success)',
            }}
          >
            <i className="ti ti-check" style={{ marginRight: 4 }} />
            {t('virtualDriverSuccess')}
            <br />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              💡 {t('virtualDriverSelect')}
            </span>
          </div>
        )}
      </div>
    </OptionRow>
  )
}