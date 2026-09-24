// src/features/options/sections/AudioSection/AdvancedAudioSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { setNoiseSuppressionMode } from '@core/services/AudioMixerService'
import OptionRow from '../../OptionRow'
import CollapsibleSection from '../../CollapsibleSection'

export default function AdvancedAudioSection({ store, addToast }) {
  const { t } = useLanguage()

  return (
    <CollapsibleSection
      title={t('advancedAudioOptions')}
      icon="ti-settings"
    >
      <OptionRow
        label={t('noiseSuppressionMode')}
        sub={t('noiseSuppressionModeDesc')}
      >
        <select
          value={store.noiseSuppressionMode || 'auto'}
          onChange={async (e) => {
            const mode = e.target.value
            await store.updateNoiseSuppressionMode(mode)
            setNoiseSuppressionMode(mode)
            addToast(
              t('noiseSuppressionModeChanged').replace('{mode}', mode),
              'info'
            )
          }}
          style={{ width: 140, fontSize: 12 }}
        >
          <option value="auto">{t('noiseSuppressionModeAuto')}</option>
          <option value="worklet">{t('noiseSuppressionModeWorklet')}</option>
          <option value="filter">{t('noiseSuppressionModeFilter')}</option>
          <option value="off">{t('noiseSuppressionModeOff')}</option>
        </select>
      </OptionRow>

      <div
        style={{
          padding: '10px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          marginTop: 4,
        }}
      >
        <i
          className="ti ti-info-circle"
          style={{ marginRight: 6, color: 'var(--accent)' }}
        />
        <strong>{t('advancedMode')}</strong> : {t('advancedModeDesc')}
        <br />

        <button
          onClick={() =>
            window.electronAPI?.openExternal('https://vb-audio.com/Cable/')
          }
          style={{
            color: 'var(--accent)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: 4,
            display: 'inline-block',
            fontSize: 12,
            padding: 0,
          }}
        >
          <i className="ti ti-download" /> {t('downloadVBCable')}
        </button>
        <br />

        <button
          onClick={() =>
            window.electronAPI?.openExternal(
              'https://vb-audio.com/Voicemeeter/banana.htm'
            )
          }
          style={{
            color: 'var(--accent)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: 2,
            display: 'inline-block',
            fontSize: 12,
            padding: 0,
          }}
        >
          <i className="ti ti-download" /> {t('downloadVoiceMeeter')}
        </button>
        <br />

        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          💡 {t('advancedModeTip')}
        </span>
      </div>
    </CollapsibleSection>
  )
}