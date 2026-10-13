// src/features/options/sections/AudioSection/index.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { setLowLatencyMode } from '@core/services/AudioMixerService'
import Section from '../../Section'
import OptionRow from '../../OptionRow'
import Toggle from '../../Toggle'
import QuickSetupSection from './QuickSetupSection'
import OutputDevicesSection from './OutputDevicesSection'
import VirtualDriverSection from './VirtualDriverSection'
import MixerSection from './MixerSection'
import AdvancedAudioSection from './AdvancedAudioSection'

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

  return (
    <Section
      ref={sectionRef}
      id="audio"
      title={t('optionsAudio')}
      icon="ti-volume"
    >
      {/* Configuration rapide (auto Discord) */}
      <QuickSetupSection store={store} addToast={addToast} />

      <OutputDevicesSection
        store={store}
        addToast={addToast}
        audioDevices={audioDevices}
      />

      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

      <VirtualDriverSection
        store={store}
        isInstallingDriver={isInstallingDriver}
        isDetecting={isDetecting}
        onInstallDriver={onInstallDriver}
        onDetectDevices={onDetectDevices}
      />

      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

      <MixerSection
        store={store}
        addToast={addToast}
        microphones={microphones}
        isMicrophoneTesting={isMicrophoneTesting}
        onTestMicrophone={onTestMicrophone}
      />

      <OptionRow label={t('lowLatencyMode')} sub={t('lowLatencyModeDesc')}>
        <Toggle
          value={store.lowLatencyMode || false}
          onChange={async (val) => {
            await store.updateLowLatencyMode(val)
            setLowLatencyMode(val)
            addToast(
              val ? t('lowLatencyActivated') : t('lowLatencyDeactivated'),
              'info'
            )
          }}
        />
      </OptionRow>

      <AdvancedAudioSection store={store} addToast={addToast} />
    </Section>
  )
}