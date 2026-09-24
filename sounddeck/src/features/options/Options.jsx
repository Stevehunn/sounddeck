// src/features/options/Options.jsx
import { useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  stopMixer,
  isMixerActive,
} from '@core/services/AudioMixerService'
import useConfirm from '@shared/hooks/useConfirm'
import { clearAllErrorLogs } from '@shared/utils/errorHandler'
import { logWarn } from '@shared/utils/logger'
import { useEffect } from 'react'

import { SECTIONS } from './constants'
import { useSectionObserver } from './hooks/useSectionObserver'
import { useAudioDevices } from './hooks/useAudioDevices'
import { usePluginsManagement } from './hooks/usePluginsManagement'

import AppearanceSection from './sections/AppearanceSection'
import AudioSection from './sections/AudioSection'
import ShortcutsSection from './sections/ShortcutsSection'
import SoundManagementSection from './sections/SoundManagementSection'
import PluginsSection from './sections/PluginsSection'
import IntegrationsSection from './sections/IntegrationsSection'
import AdvancedSection from './sections/AdvancedSection'
import BackupSection from './sections/BackupSection'
import ProfilesSection from './sections/ProfilesSection'

export default function Options({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })

  const { activeSection, sectionRefs, scrollToSection } = useSectionObserver()

  const {
    audioDevices,
    microphones,
    isDetecting,
    isInstallingDriver,
    isMicrophoneTesting,
    handleInstallDriver,
    handleDetectDevices,
    testMicrophone,
  } = useAudioDevices({ store, addToast })

  const {
    plugins,
    disabledPlugins,
    loadPlugins,
    handlePluginUninstall,
    handlePluginEnable,
  } = usePluginsManagement({ addToast })

  // Sync mixer : si mixerEnabled est false mais l'AudioContext tourne, on stop
  useEffect(() => {
    const syncMixer = async () => {
      try {
        const isActive = isMixerActive()
        if (!store.mixerEnabled && isActive) {
          await stopMixer()
          addToast('🔄 ' + t('mixerResynced'), 'info')
        }
      } catch (e) {
        logWarn('Options', 'Erreur sync mixer', e)
      }
    }
    syncMixer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResetSidebar = useCallback(async () => {
    const confirmed = await confirm({
      title: t('sidebarEditorReset'),
      message: t('sidebarEditorResetConfirm'),
      type: 'warning',
    })
    if (!confirmed) return

    await store.resetSidebarConfig()
    addToast(t('sidebarEditorResetSuccess'), 'success')
  }, [store, t, addToast, confirm])

  const handleClearLogs = useCallback(async () => {
    try {
      await clearAllErrorLogs()
      addToast(t('logsCleared'), 'info')
    } catch (e) {
      addToast('❌ ' + e.message, 'error')
    }
  }, [t, addToast])

  const handleExportLogs = useCallback(async () => {
    try {
      const raw = await window.electronAPI.storeGet('errorLogs')
      const logs = Array.isArray(raw) ? raw : []

      if (logs.length === 0) {
        addToast(t('noErrorLogs'), 'info')
        return
      }

      const json = JSON.stringify(logs, null, 2)
      const r = await window.electronAPI.exportJsonFile(
        json,
        `sounddeck-error-logs-${new Date().toISOString().slice(0, 10)}.json`,
        t('errorLogs') || 'Exporter les logs d\'erreur'
      )

      if (r?.success) {
        addToast(t('logsExported') || 'Logs exportés ✓', 'success')
      } else if (!r?.canceled) {
        addToast('❌ ' + (r?.error || t('error')), 'error')
      }
    } catch (e) {
      addToast('❌ ' + e.message, 'error')
    }
  }, [t, addToast])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header avec tabs */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        zIndex: 10,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          <i className="ti ti-settings" style={{ color: 'var(--accent)', marginRight: 6 }} />
          {t('optionsTitle')}
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                cursor: 'pointer',
                border: `1px solid ${activeSection === section.id ? 'var(--accent)' : 'var(--border)'}`,
                background: activeSection === section.id ? 'var(--accent-light)' : 'transparent',
                color: activeSection === section.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeSection === section.id ? 500 : 400,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <i className={`ti ${section.icon}`} style={{ fontSize: 13 }} />
              {t(section.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <AppearanceSection
          sectionRef={(el) => (sectionRefs.current['appearance'] = el)}
          store={store}
          addToast={addToast}
          onResetSidebar={handleResetSidebar}
        />

        <AudioSection
          sectionRef={(el) => (sectionRefs.current['audio'] = el)}
          store={store}
          addToast={addToast}
          audioDevices={audioDevices}
          microphones={microphones}
          isDetecting={isDetecting}
          isInstallingDriver={isInstallingDriver}
          isMicrophoneTesting={isMicrophoneTesting}
          onInstallDriver={handleInstallDriver}
          onDetectDevices={handleDetectDevices}
          onTestMicrophone={testMicrophone}
        />

        <ShortcutsSection
          sectionRef={(el) => (sectionRefs.current['shortcuts'] = el)}
          store={store}
          addToast={addToast}
        />

        <SoundManagementSection
          sectionRef={(el) => (sectionRefs.current['soundManagement'] = el)}
          store={store}
          addToast={addToast}
        />

        <PluginsSection
          sectionRef={(el) => (sectionRefs.current['plugins'] = el)}
          plugins={plugins}
          disabledPlugins={disabledPlugins}
          loadPlugins={loadPlugins}
          onUninstallPlugin={handlePluginUninstall}
          onEnablePlugin={handlePluginEnable}
          addToast={addToast}
        />

        <IntegrationsSection
          sectionRef={(el) => (sectionRefs.current['integrations'] = el)}
        />

        <AdvancedSection
          sectionRef={(el) => (sectionRefs.current['advanced'] = el)}
          store={store}
          addToast={addToast}
          onClearLogs={handleClearLogs}
          onExportLogs={handleExportLogs}
        />

        <BackupSection
          sectionRef={(el) => (sectionRefs.current['backup'] = el)}
          store={store}
          addToast={addToast}
        />

        <ProfilesSection
          sectionRef={(el) => (sectionRefs.current['profiles'] = el)}
          store={store}
          addToast={addToast}
        />
      </div>

      <ConfirmWrapper />
    </div>
  )
}