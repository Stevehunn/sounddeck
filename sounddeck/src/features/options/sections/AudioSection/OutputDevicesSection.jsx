// src/features/options/sections/AudioSection/OutputDevicesSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import OptionRow from '../../OptionRow'
import Toggle from '../../Toggle'

export default function OutputDevicesSection({ store, addToast, audioDevices }) {
  const { t } = useLanguage()

  return (
    <>
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
    </>
  )
}