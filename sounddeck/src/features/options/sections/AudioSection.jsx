// src/features/options/sections/AudioSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  setLowLatencyMode,
  changeMicrophone,
  setMicrophoneVolume,
  setSoundVolume,
  setNoiseSuppressionMode,
} from '@core/services/AudioMixerService'
import Section from '../Section'
import OptionRow from '../OptionRow'
import Toggle from '../Toggle'
import CollapsibleSection from '../CollapsibleSection'

export default function AudioSection({
  sectionRef,
  store,
  addToast,
  audioDevices,
  microphones,
  isDetecting,
  isInstallingDriver,
  isMicrophoneTesting,
  onInstallDriver,
  onDetectDevices,
  onTestMicrophone,
}) {
  const { t } = useLanguage()
  const [advancedAudioOpen, setAdvancedAudioOpen] = useState(false)

  return (
    <Section ref={sectionRef} id="audio" title={t('optionsAudio')} icon="ti-volume">
      {/* Périphériques de sortie */}
      <OptionRow label={t('outputDevice')} sub={t('outputDeviceDesc')}>
        <select
          value={store.audioDevice}
          onChange={(e) => store.updateAudioDevice(e.target.value)}
          style={{ width: 220, fontSize: 12 }}
        >
          <option value="default">{t('outputDeviceDefault')}</option>
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${t('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </OptionRow>

      <OptionRow label={t('localOutputDevice')} sub={t('localOutputDeviceDesc')}>
        <select
          value={store.localAudioDevice || 'default'}
          onChange={async (e) => {
            const deviceId = e.target.value
            await store.updateLocalAudioDevice(deviceId)
            addToast(
              t('localOutputDeviceChanged').replace(
                '{device}',
                deviceId === 'default' ? t('localOutputDeviceDefault') : deviceId
              ),
              'info'
            )
          }}
          style={{ width: 220, fontSize: 12 }}
        >
          <option value="default">{t('localOutputDeviceDefault')}</option>
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${t('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </OptionRow>

      <OptionRow label={t('playLocally')} sub={t('playLocallyDesc')}>
        <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
      </OptionRow>

      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

      {/* Pilote virtuel (VB-Cable) */}
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
                    <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />{' '}
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
              style={{ fontSize: 12, minHeight: 34, padding: '6px 16px', borderRadius: 'var(--radius-md)' }}
            >
              <i
                className={`ti ${isDetecting ? 'ti-loader' : 'ti-refresh'}`}
                style={isDetecting ? { animation: 'spin 1s linear infinite' } : {}}
              />
              {isDetecting ? '...' : t('detect')}
            </button>
          </div>

          {!store.virtualDriverInstalled && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '8px 12px',
              borderRadius: 6,
              lineHeight: 1.6,
            }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
              {t('virtualDriverInfo')}
            </div>
          )}

          {store.virtualDriverInstalled && (
            <div style={{
              fontSize: 11,
              color: 'var(--success)',
              background: 'rgba(29,158,117,0.1)',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--success)',
            }}>
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

      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

      {/* Mixeur */}
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

      <OptionRow label={t('lowLatencyMode')} sub={t('lowLatencyModeDesc')}>
        <Toggle
          value={store.lowLatencyMode || false}
          onChange={async (val) => {
            await store.updateLowLatencyMode(val)
            setLowLatencyMode(val)
            addToast(val ? t('lowLatencyActivated') : t('lowLatencyDeactivated'), 'info')
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

          <OptionRow label={t('microphoneVolume')} sub={`${store.microphoneVolume}%`}>
            <input
              type="range"
              min="0"
              max="100"
              value={store.microphoneVolume}
              onChange={async (e) => {
                const val = Number(e.target.value)
                await store.updateMicrophoneVolume(val)
                setMicrophoneVolume(val / 100)
              }}
              style={{ width: 140, accentColor: 'var(--accent)' }}
            />
          </OptionRow>

          <OptionRow label={t('mixerSoundVolume')} sub={`${store.mixerSoundVolume}%`}>
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
                background: isMicrophoneTesting ? 'rgba(29,158,117,0.15)' : undefined,
                color: isMicrophoneTesting ? 'var(--success)' : undefined,
              }}
            >
              <i
                className={`ti ${isMicrophoneTesting ? 'ti-microphone-2' : 'ti-mic'}`}
                style={isMicrophoneTesting ? { animation: 'pulse 0.6s ease infinite' } : {}}
              />
              {isMicrophoneTesting ? t('micTesting') : t('test')}
            </button>
          </OptionRow>

          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)',
            padding: '8px 12px',
            borderRadius: 6,
            lineHeight: 1.6,
            border: `1px solid ${store.monitoringEnabled ? 'var(--warning)' : 'var(--success)'}`,
          }}>
            <i
              className="ti ti-info-circle"
              style={{
                marginRight: 4,
                color: store.monitoringEnabled ? 'var(--warning)' : 'var(--success)',
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

      {/* Section avancée */}
      <CollapsibleSection
        title={t('advancedAudioOptions')}
        icon="ti-settings"
        defaultOpen={advancedAudioOpen}
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

        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          marginTop: 4,
        }}>
          <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
          <strong>{t('advancedMode')}</strong> : {t('advancedModeDesc')}
          <br />
          <button
            onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
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
              window.electronAPI?.openExternal('https://vb-audio.com/Voicemeeter/banana.htm')
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
    </Section>
  )
}