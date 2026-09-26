// src/features/options/sections/AudioSection/MixerSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  changeMicrophone,
  setSoundVolume,
} from '@core/services/AudioMixerService'
import OptionRow from '../../OptionRow'
import Toggle from '../../Toggle'

export default function MixerSection({
  store,
  addToast,
  microphones,
  isMicrophoneTesting,
  onTestMicrophone,
}) {
  const { t } = useLanguage()

  return (
    <>
      <OptionRow label={t('mixerEnable')} sub={t('mixerEnableDesc')}>
        <Toggle
          value={store.mixerEnabled}
          onChange={async (val) => {
            const result = await store.updateMixerEnabled(val)
            if (result) {
              if (result.success) {
                addToast(t(result.message), 'success')
              } else {
                addToast('❌ ' + (result.error || t(result.message)), 'error')
              }
            }
          }}
        />
      </OptionRow>

      {store.mixerEnabled && (
        <>
          <OptionRow label={t('microphone')} sub={t('microphoneSelect')}>
            <select
              value={store.microphoneDevice}
              onChange={async (e) => {
                const deviceId = e.target.value
                await store.updateMicrophoneDeviceId(deviceId)
                try {
                  await changeMicrophone(deviceId)
                  addToast('✅ ' + t('microphoneChanged'), 'success')
                } catch (err) {
                  console.error('Erreur changement micro:', err)
                }
              }}
              style={{ width: 220, fontSize: 12 }}
            >
              <option value="default">{t('microphoneDefault')}</option>
              {microphones.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${t('microphoneLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          <OptionRow
            label={t('mixerSoundVolume')}
            sub={`${store.mixerSoundVolume}%`}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={store.mixerSoundVolume}
              onChange={async (e) => {
                const val = Number(e.target.value)
                await store.updateMixerSoundVolume(val)
                setSoundVolume(val / 100)
              }}
              style={{ width: 140, accentColor: 'var(--accent)' }}
            />
          </OptionRow>

          <OptionRow label={t('monitoring')} sub={t('monitoringDesc')}>
            <Toggle
              value={store.monitoringEnabled || false}
              onChange={async (val) => {
                const newState = await store.toggleMonitoring(val)
                addToast(
                  newState ? t('monitoringEnabled') : t('monitoringDisabled'),
                  'info'
                )
              }}
            />
          </OptionRow>

          <OptionRow label={t('testMicrophone')} sub="">
            <button
              className="btn-secondary"
              onClick={onTestMicrophone}
              style={{
                fontSize: 12,
                minHeight: 34,
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                borderColor: isMicrophoneTesting ? 'var(--success)' : undefined,
                background: isMicrophoneTesting
                  ? 'rgba(29,158,117,0.15)'
                  : undefined,
                color: isMicrophoneTesting ? 'var(--success)' : undefined,
              }}
            >
              <i
                className={`ti ${
                  isMicrophoneTesting ? 'ti-microphone-2' : 'ti-mic'
                }`}
                style={
                  isMicrophoneTesting
                    ? { animation: 'pulse 0.6s ease infinite' }
                    : {}
                }
              />
              {isMicrophoneTesting ? t('micTesting') : t('test')}
            </button>
          </OptionRow>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '8px 12px',
              borderRadius: 6,
              lineHeight: 1.6,
              border: `1px solid ${
                store.monitoringEnabled ? 'var(--warning)' : 'var(--success)'
              }`,
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{
                marginRight: 4,
                color: store.monitoringEnabled
                  ? 'var(--warning)'
                  : 'var(--success)',
              }}
            />
            <strong>{t('mixerActive')}</strong> : {t('mixerActiveDesc')}
            <br />
            {store.monitoringEnabled && (
              <span style={{ color: 'var(--warning)', fontSize: 10 }}>
                ⚠️ {t('monitoringWarning')}
              </span>
            )}
            <span style={{ fontSize: 10 }}>{t('mixerDiscordTip')}</span>
          </div>
        </>
      )}
    </>
  )
}