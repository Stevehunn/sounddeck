// src/features/options/Options.jsx
import { useState, useEffect, useRef, forwardRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { useLanguage } from '@core/i18n/LanguageContext'
import { LANGUAGES } from '@core/i18n/locales'
import { DeleteButton } from '@shared/components/ui'
import ShortcutRecorder from '@shared/components/settings/ShortcutRecorder'
import CustomThemeEditor from '@shared/components/ui/CustomThemeEditor'
import SidebarEditor from '@shared/components/navigation/SidebarEditor'
import OBSControl from '@shared/components/settings/OBSControl'
import BackupSettings from '@shared/components/settings/BackupSettings'
import PluginInstaller from '@shared/components/settings/PluginInstaller'
import KeyboardVisualizer from '@shared/components/settings/KeyboardVisualizer'
import FeedbackModal from '@shared/components/modals/FeedbackModal'
import { 
  getMicrophoneStatus, 
  getMixerStats, 
  testMicrophoneOnce, 
  connectMixerToOutput,
  setLowLatencyMode,
  changeMicrophone,
  setMicrophoneVolume,
  setSoundVolume,
  setNoiseSuppressionMode,
  initAudioMixer,
  resumeAudioContext,
  setStoreRef,
  stopMixer,
  isMixerActive,
  getMixerFullState,
  repairMixer
} from '@core/services/AudioMixerService'
import { initBackupManager, stopAutoBackup, startAutoBackup } from '@shared/utils/backupManager'
import useConfirm from '@shared/hooks/useConfirm'

const SECTIONS = [
  { id: 'appearance', icon: 'ti-palette', labelKey: 'optionsAppearance' },
  { id: 'audio', icon: 'ti-volume', labelKey: 'optionsAudio' },
  { id: 'shortcuts', icon: 'ti-keyboard', labelKey: 'optionsShortcuts' },
  { id: 'soundManagement', icon: 'ti-music', labelKey: 'soundManagement' },
  { id: 'plugins', icon: 'ti-puzzle', labelKey: 'optionsPlugins' },
  { id: 'integrations', icon: 'ti-plug', labelKey: 'integrations' },
  { id: 'advanced', icon: 'ti-gauge', labelKey: 'advancedOptions' },
  { id: 'backup', icon: 'ti-cloud', labelKey: 'optionsBackup' },
  { id: 'profiles', icon: 'ti-users', labelKey: 'optionsProfiles' },
]

const Section = forwardRef(({ title, icon, children, id }, ref) => {
  return (
    <div ref={ref} data-section={id} style={{ marginBottom: 32, scrollMarginTop: 80 }}>
      <div style={{ 
        fontSize: 13, 
        fontWeight: 600, 
        color: 'var(--accent)', 
        marginBottom: 12, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border)'
      }}>
        <i className={`ti ${icon}`} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
})

Section.displayName = 'Section'

// ─── COMPOSANT POUR SECTION RÉDUCTIBLE ──────────────────────────────────

function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { t } = useLanguage()
  
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      marginTop: 6,
      background: 'var(--bg-secondary)'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg-tertiary)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          gap: 8
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${icon}`} style={{ color: 'var(--accent)' }} />
          {title}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
            {isOpen ? '▼' : '▶'}
          </span>
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
          {isOpen ? t('collapseHide') : t('collapseShow')}
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  )
}


export default function Options({ store, addToast }) {
  const { t, currentLang, changeLanguage, version: langVersion } = useLanguage()
  const [, setLangVersion] = useState(0)
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [activeSection, setActiveSection] = useState('appearance')
  const [audioDevices, setAudioDevices] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [microphones, setMicrophones] = useState([])
  const [isInstallingDriver, setIsInstallingDriver] = useState(false)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const [showPluginInstaller, setShowPluginInstaller] = useState(false)
  const [plugins, setPlugins] = useState([])
  const [advancedAudioOpen, setAdvancedAudioOpen] = useState(false)
  const micTestRef = useRef(null)
  const sectionRefs = useRef({})
  const observerRef = useRef(null)
  const isScrollingRef = useRef(false)

  // ─── CHARGEMENT DES PLUGINS ────────────────────────────────────────────────
  const loadPlugins = useCallback(async () => {
    try {
      const installed = await window.electronAPI.getInstalledPlugins?.() || []
      setPlugins(installed)
    } catch (e) {
      console.warn('Erreur chargement plugins:', e)
    }
  }, [])

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  useEffect(() => {
    return () => {
      if (micTestRef.current) {
        micTestRef.current.stop()
        micTestRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const detectDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter(d => d.kind === 'audiooutput')
        const inputs = devices.filter(d => d.kind === 'audioinput')
        setAudioDevices(outputs)
        setMicrophones(inputs)

        const hasVirtualDevice = outputs.some(d => {
          const label = d.label.toLowerCase()
          return label.includes('cable') || 
                 label.includes('virtual') || 
                 label.includes('scream') ||
                 label.includes('voicemeeter') ||
                 label.includes('vb-audio')
        })
        
        if (hasVirtualDevice && !store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(true)
          addToast('🔊 ' + t('virtualDriverDetected'), 'success')
        } else if (!hasVirtualDevice && store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(false)
        }
      } catch (e) {
        console.warn('Erreur détection périphériques:', e)
      }
    }
    
    detectDevices()
  }, [])

  useEffect(() => {
    const setupObserver = () => {
      const sections = SECTIONS.map(s => sectionRefs.current[s.id]).filter(Boolean)
      
      if (sections.length === 0) {
        setTimeout(setupObserver, 100)
        return
      }

      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingRef.current) return

          let maxRatio = 0
          let maxId = null

          entries.forEach(entry => {
            const ratio = entry.intersectionRatio
            if (ratio > maxRatio) {
              maxRatio = ratio
              maxId = entry.target.dataset.section
            }
          })

          if (maxId && maxRatio > 0.2) {
            setActiveSection(maxId)
          }
        },
        {
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
          rootMargin: '-60px 0px -40% 0px'
        }
      )

      sections.forEach(section => {
        if (section) observer.observe(section)
      })

      observerRef.current = observer

      return () => {
        observer.disconnect()
      }
    }

    const timer = setTimeout(setupObserver, 200)
    return () => {
      clearTimeout(timer)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    const syncMixer = async () => {
      try {
        const isActive = isMixerActive()
        
        if (!store.mixerEnabled && isActive) {
          await stopMixer()
          addToast('🔄 ' + t('mixerResynced'), 'info')
        }
      } catch (e) {
        // Silencieux
      }
    }
    
    syncMixer()
  }, [])

  const scrollToSection = (sectionId) => {
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      isScrollingRef.current = true
      setActiveSection(sectionId)
      
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      setTimeout(() => {
        isScrollingRef.current = false
      }, 800)
    }
  }

  const handleInstallDriver = async () => {
    setIsInstallingDriver(true)
    try {
      addToast('📦 ' + t('downloadingDriver'), 'info')
      const result = await window.electronAPI.installVirtualDriver()
      if (result.success) {
        if (result.warning) {
          addToast('⚠️ ' + result.warning, 'info')
        } else {
          addToast('✅ ' + t('driverInstalled'), 'success')
        }
        setTimeout(async () => {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const outputs = devices.filter(d => d.kind === 'audiooutput')
          setAudioDevices(outputs)
          const hasVirtualDevice = outputs.some(d => {
            const label = d.label.toLowerCase()
            return label.includes('cable') || label.includes('vb-audio')
          })
          if (hasVirtualDevice) {
            store.updateVirtualDriverInstalled?.(true)
          }
        }, 3000)
      } else {
        addToast('❌ ' + t('installError') + ': ' + (result.error || t('unknown')), 'error')
      }
    } catch (e) {
      addToast('❌ ' + t('error') + ': ' + e.message, 'error')
    }
    setIsInstallingDriver(false)
  }

  const handleDetectDevices = async () => {
    setIsDetecting(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioDevices(outputs)
      
      const hasVirtualDevice = outputs.some(d => {
        const label = d.label.toLowerCase()
        return label.includes('cable') || 
               label.includes('virtual') || 
               label.includes('scream') ||
               label.includes('voicemeeter') ||
               label.includes('vb-audio')
      })
      
      if (hasVirtualDevice) {
        store.updateVirtualDriverInstalled?.(true)
        addToast('✅ ' + t('virtualDriverDetected'), 'success')
      } else {
        store.updateVirtualDriverInstalled?.(false)
        addToast(t('virtualDriverNotDetected'), 'info')
      }
    } catch (e) {
      addToast(t('detectError'), 'error')
    }
    setIsDetecting(false)
  }

  const testMicrophone = async () => {
    if (micTestRef.current) {
      micTestRef.current.stop()
      micTestRef.current = null
      setIsMicrophoneTesting(false)
      addToast('🔇 ' + t('micTestStopped'), 'info')
      return
    }

    try {
      setIsMicrophoneTesting(true)
      addToast('🎤 ' + t('micTestInProgress'), 'info')
      
      const deviceId = store.microphoneDevice || 'default'
      const result = await testMicrophoneOnce(deviceId)
      
      if (result.success) {
        micTestRef.current = {
          stop: result.stop,
          stream: result.stream,
          context: result.context
        }
        
        addToast(`✅ ${t('microphoneConnected')}`, 'success')
        
        setTimeout(() => {
          if (micTestRef.current) {
            micTestRef.current.stop()
            micTestRef.current = null
            setIsMicrophoneTesting(false)
            addToast('🔇 ' + t('micTestFinished'), 'info')
          }
        }, 3000)
        
      } else {
        setIsMicrophoneTesting(false)
        addToast(`❌ ${t('microphoneTestError')}: ${result.error || t('microphoneNotConnected')}`, 'error')
      }
    } catch (e) {
      setIsMicrophoneTesting(false)
      addToast('❌ ' + t('error') + ': ' + e.message, 'error')
    }
  }

  const handleResetSidebar = useCallback(async () => {
    const confirmed = await confirm({
      title: t('sidebarEditorReset'),
      message: t('sidebarEditorResetConfirm'),
      type: 'warning'
    })
    if (!confirmed) return
    
    await store.resetSidebarConfig()
    addToast(t('sidebarEditorResetSuccess'), 'success')
  }, [store, t, addToast, confirm])

  const handleClearLogs = useCallback(async () => {
    try {
      await window.electronAPI.storeDelete('errorLogs')
      addToast(t('logsCleared'), 'info')
    } catch (e) {
      addToast('❌ ' + e.message, 'error')
    }
  }, [t, addToast])

  // ✅ Nouveau : export via IPC (contourne le blocage will-download)
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

  const handlePluginUninstall = useCallback(async (plugin) => {
    const result = await window.electronAPI.uninstallPlugin?.(plugin.id)
    if (result?.success) {
      addToast(t('pluginsUninstallSuccess').replace('{name}', plugin.name), 'info')
      await loadPlugins()
    } else {
      addToast(t('pluginsUninstallError') + ': ' + (result?.error || ''), 'error')
    }
  }, [t, addToast, loadPlugins])

  const handleDeleteBackup = useCallback(async (index) => {
    try {
      const { deleteBackup } = await import('../../shared/utils/backupManager.js')
      const result = await deleteBackup(index)
      if (result.success) {
        addToast('✅ ' + t('backupDeleted'), 'success')
        const event = new CustomEvent('refresh-backups')
        window.dispatchEvent(event)
      } else {
        addToast('❌ ' + t('error') + ': ' + result.error, 'error')
      }
    } catch (e) {
      addToast('❌ ' + t('error') + ': ' + e.message, 'error')
    }
  }, [addToast, t])

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border)', 
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        zIndex: 10
      }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
          <i className="ti ti-settings" style={{ color: 'var(--accent)', marginRight: 6 }} />
          {t('optionsTitle')}
        </div>
        
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SECTIONS.map(section => (
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
                gap: 4
              }}
              onMouseEnter={e => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* ============================ */}
        {/* SECTION 1 : APPARENCE */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['appearance'] = el}
          id="appearance"
          title={t('optionsAppearance')} 
          icon="ti-palette"
        >
          <OptionRow label={t('language')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LANGUAGES.map(l => (
                <button 
                  key={l.code}
                  onClick={async () => {
                    await store.updateLang(l.code)
                    await changeLanguage(l.code)
                    setLangVersion(prev => prev + 1)
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${currentLang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                    background: currentLang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: currentLang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: currentLang === l.code ? 600 : 400
                  }}
                >
                  <span style={{ fontSize: 16 }}>{l.flag}</span>
                  {l.label}
                  {currentLang === l.code && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>

          <OptionRow label={t('theme')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { val: 'dark', label: t('themeDark'), color: '#7C6FF7' },
                { val: 'light', label: t('themeLight'), color: '#534AB7' },
                { val: 'dark-blue', label: t('themeBlue'), color: '#2f81f7' },
                { val: 'custom', label: t('themeCustom'), color: '#a855f7' },
              ].map(({ val, label, color }) => (
                <button key={val} onClick={() => store.updateTheme(val)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${store.theme === val ? color : 'var(--border)'}`,
                    background: store.theme === val ? `${color}22` : 'var(--bg-tertiary)',
                    color: store.theme === val ? color : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: store.theme === val ? 600 : 400
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                  {store.theme === val && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>

          {store.theme === 'custom' && (
            <CustomThemeEditor
              current={store.customTheme}
              onSave={async (colors) => {
                await store.updateCustomTheme(colors)
                addToast(t('toastCustomThemeApplied'), 'success')
              }}
            />
          )}

          <OptionRow label={t('cardSize')} sub={t('cardSizeDesc')}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { val: 'small', label: t('cardSizeSmall'), icon: 'ti-layout-grid' },
                { val: 'medium', label: t('cardSizeMedium'), icon: 'ti-layout-grid' },
                { val: 'large', label: t('cardSizeLarge'), icon: 'ti-layout-grid' },
              ].map(({ val, label, icon }) => (
                <button
                  key={val}
                  onClick={() => store.updateCardSize(val)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${store.cardSize === val ? 'var(--accent)' : 'var(--border)'}`,
                    background: store.cardSize === val ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: store.cardSize === val ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: store.cardSize === val ? 600 : 400,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (store.cardSize !== val) {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (store.cardSize !== val) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  <i className={icon} style={{ fontSize: 14 }} />
                  {label}
                  {store.cardSize === val && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>

          <OptionRow label={t('sidebarCustomization')} sub={t('sidebarCustomizationDesc')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {store.sidebarConfig?.mode === 'custom' 
                  ? `🎨 ${t('sidebarCustomized')}` 
                  : `📋 ${t('sidebarDefault')}`}
              </span>
              <button
                className="btn-secondary btn-sm"
                onClick={store.toggleSidebarEditMode}
                style={{
                  fontSize: 12,
                  minHeight: 34,
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderColor: store.sidebarEditMode ? 'var(--accent)' : 'var(--border)',
                  background: store.sidebarEditMode ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: store.sidebarEditMode ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              >
                <i className={`ti ${store.sidebarEditMode ? 'ti-edit' : 'ti-edit'}`} />
                {store.sidebarEditMode ? t('sidebarEditorClose') : t('sidebarEditorOpen')}
              </button>
              {store.sidebarConfig?.mode === 'custom' && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={handleResetSidebar}
                  style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
                >
                  <i className="ti ti-refresh" /> {t('sidebarEditorReset')}
                </button>
              )}
            </div>
          </OptionRow>

          {store.sidebarEditMode && (
            <SidebarEditor
              key={store.sidebarVersion}
              config={store.sidebarConfig}
              onSave={async (config) => {
                await store.updateSidebarConfig(config)
                store.toggleSidebarEditMode()
                addToast(t('sidebarEditorSaved'), 'success')
              }}
              onCancel={store.toggleSidebarEditMode}
              onReset={handleResetSidebar}
              lang={store.lang}
              profiles={store.profiles}
            />
          )}
        </Section>

        {/* ============================ */}
        {/* SECTION 2 : AUDIO */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['audio'] = el}
          id="audio"
          title={t('optionsAudio')} 
          icon="ti-volume"
        >
          {/* ─── PÉRIPHÉRIQUES DE SORTIE ────────────────────────────────────────── */}
          <OptionRow label={t('outputDevice')} sub={t('outputDeviceDesc')}>
            <select value={store.audioDevice} onChange={e => store.updateAudioDevice(e.target.value)}
              style={{ width: 220, fontSize: 12 }}>
              <option value="default">{t('outputDeviceDefault')}</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${t('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          {/* Périphérique local */}
          <OptionRow label={t('localOutputDevice')} sub={t('localOutputDeviceDesc')}>
            <select 
              value={store.localAudioDevice || 'default'} 
              onChange={async (e) => {
                const deviceId = e.target.value
                await store.updateLocalAudioDevice(deviceId)
                addToast(t('localOutputDeviceChanged').replace('{device}', deviceId === 'default' ? t('localOutputDeviceDefault') : deviceId), 'info')
              }}
              style={{ width: 220, fontSize: 12 }}
            >
              <option value="default">{t('localOutputDeviceDefault')}</option>
              {audioDevices.map(d => (
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

          {/* ─── PILOTE VIRTUEL (VB-CABLE) ────────────────────────────────────────── */}
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
                    onClick={handleInstallDriver}
                    disabled={isInstallingDriver}
                    style={{ fontSize: 12 }}
                  >
                    {isInstallingDriver ? (
                      <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('installing')}</>
                    ) : (
                      <><i className="ti ti-download" /> {t('installVirtualDriver')}</>
                    )}
                  </button>
                )}
                <button 
                  className="btn-secondary" 
                  onClick={handleDetectDevices} 
                  disabled={isDetecting} 
                  style={{ 
                    fontSize: 12, 
                    minHeight: 34, 
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <i className={`ti ${isDetecting ? 'ti-loader' : 'ti-refresh'}`} 
                    style={isDetecting ? { animation: 'spin 1s linear infinite' } : {}} />
                  {isDetecting ? '...' : t('detect')}
                </button>
              </div>
              
              {!store.virtualDriverInstalled && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 6, lineHeight: 1.6 }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                  {t('virtualDriverInfo')}
                </div>
              )}
              
              {store.virtualDriverInstalled && (
                <div style={{ fontSize: 11, color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--success)' }}>
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

          {/* ─── MIXEUR ────────────────────────────────────────────────────────────── */}
          <OptionRow label={t('mixerEnable')} sub={t('mixerEnableDesc')}>
            <Toggle value={store.mixerEnabled} onChange={async (val) => {
              const result = await store.updateMixerEnabled(val)
              if (result) {
                if (result.success) {
                  addToast(t(result.message), 'success')
                } else {
                  addToast('❌ ' + (result.error || t(result.message)), 'error')
                }
              }
            }} />
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
              {/* Microphone */}
              <OptionRow label={t('microphone')} sub={t('microphoneSelect')}>
                <select value={store.microphoneDevice} onChange={async (e) => {
                  const deviceId = e.target.value
                  await store.updateMicrophoneDeviceId(deviceId)
                  try {
                    await changeMicrophone(deviceId)
                    addToast('✅ ' + t('microphoneChanged'), 'success')
                  } catch (err) {
                    console.error('Erreur changement micro:', err)
                  }
                }} style={{ width: 220, fontSize: 12 }}>
                  <option value="default">{t('microphoneDefault')}</option>
                  {microphones.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `${t('microphoneLabel')} ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </OptionRow>

              {/* Volume micro */}
              <OptionRow label={t('microphoneVolume')} sub={`${store.microphoneVolume}%`}>
                <input type="range" min="0" max="100" value={store.microphoneVolume}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    await store.updateMicrophoneVolume(val)
                    setMicrophoneVolume(val / 100)
                  }}
                  style={{ width: 140, accentColor: 'var(--accent)' }} />
              </OptionRow>

              {/* Volume sons */}
              <OptionRow label={t('mixerSoundVolume')} sub={`${store.mixerSoundVolume}%`}>
                <input type="range" min="0" max="100" value={store.mixerSoundVolume}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    await store.updateMixerSoundVolume(val)
                    setSoundVolume(val / 100)
                  }}
                  style={{ width: 140, accentColor: 'var(--accent)' }} />
              </OptionRow>

              {/* Monitoring */}
              <OptionRow label={t('monitoring')} sub={t('monitoringDesc')}>
                <Toggle 
                  value={store.monitoringEnabled || false} 
                  onChange={async (val) => {
                    await store.toggleMonitoring()
                    addToast(val ? t('monitoringEnabled') : t('monitoringDisabled'), 'info')
                  }} 
                />
              </OptionRow>

              {/* Test micro */}
              <OptionRow label={t('testMicrophone')} sub="">
                <button 
                  className="btn-secondary" 
                  onClick={testMicrophone} 
                  style={{ 
                    fontSize: 12,
                    minHeight: 34, 
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-md)',
                    borderColor: isMicrophoneTesting ? 'var(--success)' : undefined,
                    background: isMicrophoneTesting ? 'rgba(29,158,117,0.15)' : undefined,
                    color: isMicrophoneTesting ? 'var(--success)' : undefined
                  }}
                >
                  <i className={`ti ${isMicrophoneTesting ? 'ti-microphone-2' : 'ti-mic'}`} 
                    style={isMicrophoneTesting ? { animation: 'pulse 0.6s ease infinite' } : {}} />
                  {isMicrophoneTesting ? t('micTesting') : t('test')}
                </button>
              </OptionRow>

              {/* Statut mixeur */}
              <div style={{ 
                fontSize: 11, 
                color: 'var(--text-tertiary)', 
                background: 'var(--bg-tertiary)', 
                padding: '8px 12px', 
                borderRadius: 6, 
                lineHeight: 1.6, 
                border: `1px solid ${store.monitoringEnabled ? 'var(--warning)' : 'var(--success)'}` 
              }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4, color: store.monitoringEnabled ? 'var(--warning)' : 'var(--success)' }} />
                <strong>{t('mixerActive')}</strong> : {t('mixerActiveDesc')}
                <br />
                {store.monitoringEnabled && (
                  <span style={{ color: 'var(--warning)', fontSize: 10 }}>
                    ⚠️ {t('monitoringWarning')}
                  </span>
                )}
                <span style={{ fontSize: 10 }}>
                  {t('mixerDiscordTip')}
                </span>
              </div>
            </>
          )}

          {/* ─── SECTION AVANCÉE RÉDUCTIBLE ────────────────────────────────── */}
          <CollapsibleSection 
            title={t('advancedAudioOptions')} 
            icon="ti-settings"
            defaultOpen={advancedAudioOpen}
          >
            {/* Réduction de bruit */}
            <OptionRow label={t('noiseSuppressionMode')} sub={t('noiseSuppressionModeDesc')}>
              <select 
                value={store.noiseSuppressionMode || 'auto'} 
                onChange={async (e) => {
                  const mode = e.target.value
                  await store.updateNoiseSuppressionMode(mode)
                  setNoiseSuppressionMode(mode)
                  addToast(t('noiseSuppressionModeChanged').replace('{mode}', mode), 'info')
                }}
                style={{ width: 140, fontSize: 12 }}
              >
                <option value="auto">{t('noiseSuppressionModeAuto')}</option>
                <option value="worklet">{t('noiseSuppressionModeWorklet')}</option>
                <option value="filter">{t('noiseSuppressionModeFilter')}</option>
                <option value="off">{t('noiseSuppressionModeOff')}</option>
              </select>
            </OptionRow>

            {/* Mode avancé (VB-Cable + VoiceMeeter) */}
            <div style={{ 
              padding: '10px 12px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-md)', 
              fontSize: 12, 
              color: 'var(--text-secondary)', 
              lineHeight: 1.8, 
              marginTop: 4 
            }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              <strong>{t('advancedMode')}</strong> : {t('advancedModeDesc')}
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> {t('downloadVBCable')}
              </button>
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Voicemeeter/banana.htm')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 2, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> {t('downloadVoiceMeeter')}
              </button>
              <br />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                💡 {t('advancedModeTip')}
              </span>
            </div>
          </CollapsibleSection>
        </Section>

        {/* ============================ */}
        {/* SECTION 3 : RACCOURCIS CLAVIER */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['shortcuts'] = el}
          id="shortcuts"
          title={t('optionsShortcuts')} 
          icon="ti-keyboard"
        >
          <OptionRow label={t('keyboardLayout')} sub={t('keyboardLayoutDesc')}>
            <select 
              value={store.keyboardLayout || 'qwerty'} 
              onChange={async (e) => {
                const layout = e.target.value
                await store.updateKeyboardLayout(layout)
                addToast(`${t('keyboardLayoutChanged')}: ${layout === 'azerty' ? 'AZERTY' : 'QWERTY'}`, 'info')
              }}
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="qwerty">QWERTY</option>
              <option value="azerty">AZERTY</option>
            </select>
          </OptionRow>

          <KeyboardVisualizer 
            shortcuts={store.shortcuts} 
            layout={store.keyboardLayout || 'qwerty'} 
            lang={store.lang}
          />

          <OptionRow label={t('switchProfile')} sub={t('switchProfileDesc')}>
            <ShortcutRecorder
              value={store.profileShortcut}
              onSave={async (acc) => { await store.updateProfileShortcut(acc); addToast(`${t('toastShortcutSet')} ${acc}`, 'success') }}
              onClear={() => store.updateProfileShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={t('toggleLoop')} sub={t('toggleLoopDesc')}>
            <ShortcutRecorder
              value={store.loopShortcut}
              onSave={async (acc) => { await store.updateLoopShortcut(acc); addToast(`${t('toastShortcutLoop')} ${acc}`, 'success') }}
              onClear={() => store.updateLoopShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={t('stopAllShortcut')} sub={t('stopAllDesc')}>
            <ShortcutRecorder
              value={store.stopAllShortcut}
              onSave={async (acc) => { await store.updateStopAllShortcut(acc); addToast(`${t('toastShortcutStop')} ${acc}`, 'success') }}
              onClear={() => store.updateStopAllShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={t('presentationShortcut')} sub={t('presentationDesc')}>
            <ShortcutRecorder
              value={store.presentationShortcut}
              onSave={async (acc) => { await store.updatePresentationShortcut(acc); addToast(`${t('toastShortcutPresentation')} ${acc}`, 'success') }}
              onClear={() => store.updatePresentationShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          
          <OptionRow label={t('toggleShortcuts')} sub={t('toggleShortcutsDesc')}>
            <ShortcutRecorder
              value={store.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'}
              onSave={async (acc) => { 
                await store.updateToggleShortcutsAccelerator(acc)
                addToast(`${t('toggleShortcutSet')} ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleShortcutsAccelerator('')
                addToast(t('toggleShortcutRemoved'), 'info')
              }}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>

          <OptionRow label={t('toggleWindowShortcut')} sub={t('toggleWindowShortcutDesc')}>
            <ShortcutRecorder
              value={store.toggleWindowShortcut || 'CommandOrControl+Shift+S'}
              onSave={async (acc) => { 
                await store.updateToggleWindowShortcut(acc)
                addToast(`${t('toggleWindowShortcutSet')} ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleWindowShortcut('')
                addToast(t('toggleWindowShortcutRemoved'), 'info')
              }}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>

          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {t('shortcutsPerSoundNote')}
          </div>
        </Section>

        {/* ============================ */}
        {/* SECTION 4 : GESTION DES SONS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['soundManagement'] = el}
          id="soundManagement"
          title={t('soundManagement')} 
          icon="ti-music"
        >
          <OptionRow label={t('normalization')} sub={t('normalizationDesc')}>
            <Toggle value={store.normalizationEnabled} onChange={store.updateNormalizationEnabled} />
          </OptionRow>

          {store.normalizationEnabled && (
            <>
              <OptionRow label={t('normalizationTarget')} sub={t('normalizationTargetDesc')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <input 
                    type="range" 
                    min="0.02"
                    max="1.0"
                    step="0.005" 
                    value={store.normalizationTarget}
                    onChange={e => store.updateNormalizationTarget(Number(e.target.value))}
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
                    borderRadius: 4
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
                marginTop: 4
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: 10, 
                  color: 'var(--text-tertiary)',
                  marginBottom: 4
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
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${(store.normalizationTarget / 1.0) * 100}%`,
                    background: `linear-gradient(90deg, 
                      ${store.normalizationTarget < 0.2 ? 'var(--danger)' : 
                        store.normalizationTarget < 0.4 ? 'var(--warning)' : 
                        'var(--success)'}
                    )`,
                    borderRadius: 3,
                    transition: 'width 0.2s ease, background 0.3s ease'
                  }} />
                  
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    left: '20%',
                    width: 2,
                    height: 10,
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 1,
                    zIndex: 2
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: '20%',
                    transform: 'translateX(-50%)',
                    fontSize: 7,
                    color: 'rgba(255,255,255,0.2)',
                    zIndex: 2,
                    whiteSpace: 'nowrap'
                  }}>
                    {t('normalizationDefaultLabel')}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: 9, 
                  color: 'var(--text-tertiary)',
                  marginTop: 6
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
                lineHeight: 1.6
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
                borderRadius: 'var(--radius-md)'
              }}
            >
              <i className="ti ti-refresh" /> {t('reanalyzeGains')}
            </button>
          </OptionRow>
        </Section>

        {/* ============================ */}
        {/* SECTION 5 : PLUGINS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['plugins'] = el}
          id="plugins"
          title={t('optionsPlugins')} 
          icon="ti-puzzle"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="option-row" style={{ padding: '12px 14px' }}>
              <div>
                <div className="label">{t('pluginsInstall')}</div>
                <div className="sub">{t('pluginsInstallDesc')}</div>
              </div>
              <button 
                className="btn-primary btn-sm"
                onClick={() => setShowPluginInstaller(true)}
                style={{ minHeight: 34, padding: '6px 16px' }}
              >
                <i className="ti ti-plus" /> {t('pluginsInstallBtn')}
              </button>
            </div>

            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '8px 14px', 
                background: 'var(--bg-tertiary)',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{t('pluginsInstalledTitle')}</span>
                <span>{plugins.length} {t('pluginsCount')}</span>
              </div>

              {plugins.length === 0 && (
                <div style={{ 
                  padding: '24px', 
                  textAlign: 'center', 
                  color: 'var(--text-tertiary)',
                  fontSize: 13
                }}>
                  <i className="ti ti-puzzle" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                  {t('pluginsNoPluginsInstalled')}
                  <br />
                  <span style={{ fontSize: 11 }}>
                    {t('pluginsInstallDesc2')}
                  </span>
                </div>
              )}

              {plugins.map(plugin => (
                <div 
                  key={plugin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}>
                      🧩
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {plugin.name}
                        <span style={{ 
                          fontSize: 10, 
                          color: 'var(--text-tertiary)',
                          marginLeft: 8,
                          fontWeight: 400
                        }}>
                          v{plugin.version}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: 11, 
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center'
                      }}>
                        <span>{t('pluginsBy')} {plugin.author || t('pluginsUnknownAuthor')}</span>
                        {plugin.pages > 0 && (
                          <span>
                            <i className="ti ti-files" style={{ fontSize: 10 }} />
                            {plugin.pages} {t('pluginsPages')}
                          </span>
                        )}
                        <span style={{ 
                          fontSize: 9, 
                          color: 'var(--success)',
                          background: 'rgba(29,158,117,0.1)',
                          padding: '1px 8px',
                          borderRadius: 10
                        }}>
                          <i className="ti ti-check" /> {t('pluginsActivated')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        window.location.reload()
                      }}
                      style={{ 
                        fontSize: 11, 
                        padding: '4px 8px',
                        color: 'var(--text-tertiary)'
                      }}
                      title={t('pluginsReloadTooltip')}
                    >
                      <i className="ti ti-refresh" />
                    </button>
                    
                    <DeleteButton
                      onDelete={() => handlePluginUninstall(plugin)}
                      confirmTitle={t('pluginsUninstall')}
                      confirmMessage={t('pluginsUninstallConfirm').replace('{name}', plugin.name)}
                      itemName={plugin.name}
                      size="sm"
                      variant="ghost-danger"
                      icon="ti-trash"
                      showLabel={false}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              fontSize: 11, 
              color: 'var(--text-tertiary)',
              padding: '10px 14px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              lineHeight: 1.6,
              border: '1px solid var(--border)'
            }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
              <strong>{t('pluginsWhereToFind')}</strong>
              <br />
              {t('pluginsDescription')}
              <br />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {t('pluginsCommunityTip')}
              </span>
            </div>
          </div>

          {showPluginInstaller && (
            <PluginInstaller
              onClose={() => setShowPluginInstaller(false)}
              addToast={addToast}
              lang={currentLang}
              onInstall={(result) => {
                loadPlugins()
              }}
            />
          )}
        </Section>

        {/* ============================ */}
        {/* SECTION 6 : INTÉGRATIONS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['integrations'] = el}
          id="integrations"
          title={t('integrations')} 
          icon="ti-plug"
        >
          <OBSControl lang={currentLang} />
        </Section>

        {/* ============================ */}
        {/* SECTION 7 : AVANCÉ */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['advanced'] = el}
          id="advanced"
          title={t('advancedOptions')} 
          icon="ti-gauge"
        >
          <OptionRow label={t('compressOnImport')} sub={t('compressOnImportDesc')}>
            <Toggle 
              value={store.compressOnImport || false}
              onChange={async (val) => {
                await store.updateCompressOnImport(val)
                addToast(val ? t('compressOnImportEnabled') : t('compressOnImportDisabled'), 'info')
              }}
            />
          </OptionRow>

          {store.compressOnImport && (
            <OptionRow label={t('compressionBitrate')} sub={t('compressionBitrateDesc')}>
              <select 
                value={store.compressionBitrate || 128}
                onChange={async (e) => {
                  const val = Number(e.target.value)
                  await store.updateCompressionBitrate(val)
                }}
                style={{ width: 140, fontSize: 12 }}
              >
                <option value="64">64 kbps</option>
                <option value="96">96 kbps</option>
                <option value="128">128 kbps {t('compressionBitrateRecommended')}</option>
                <option value="192">192 kbps</option>
                <option value="256">256 kbps</option>
              </select>
            </OptionRow>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          <OptionRow label={t('errorLogs')} sub={t('errorLogsDesc')}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn-secondary btn-sm"
                onClick={handleExportLogs}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                <i className="ti ti-file-text" /> {t('exportLogs')}
              </button>
              <DeleteButton
                onDelete={handleClearLogs}
                confirmTitle={t('clearLogs')}
                confirmMessage={t('clearLogsConfirm')}
                size="sm"
                variant="ghost-danger"
                icon="ti-trash"
                showLabel={true}
                deleteLabel={t('clearLogs')}
              />
            </div>
          </OptionRow>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          <OptionRow label={t('feedback')} sub={t('feedbackDesc')}>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                import('@shared/components/modals/FeedbackModal').then(module => {
                  const Modal = module.default
                  const container = document.createElement('div')
                  container.style.position = 'fixed'
                  container.style.inset = '0'
                  container.style.zIndex = '10000'
                  document.body.appendChild(container)
                  
                  const root = createRoot(container)
                  root.render(
                    <Modal
                      onClose={() => {
                        root.unmount()
                        container.remove()
                      }}
                      lang={currentLang}
                      store={store}
                      onSubmit={async (feedback) => {
                        console.log('📤 Feedback reçu:', feedback)
                      }}
                    />
                  )
                }).catch(err => {
                  console.error('Erreur chargement FeedbackModal:', err)
                })
              }}
              style={{ fontSize: 12, minHeight: 34 }}
            >
              <i className="ti ti-message" /> {t('feedbackSend')}
            </button>
          </OptionRow>
        </Section>

        {/* ============================ */}
        {/* SECTION 8 : SAUVEGARDE */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['backup'] = el}
          id="backup"
          title={t('optionsBackup')} 
          icon="ti-cloud"
        >
          <OptionRow label={t('autoBackup')} sub={t('autoBackupDesc')}>
            <Toggle 
              value={store.autoBackupEnabled || false}
              onChange={async (val) => {
                await store.updateAutoBackupEnabled(val)
                if (val) {
                  initBackupManager(store)
                  addToast(t('autoBackupEnabled'), 'success')
                } else {
                  stopAutoBackup()
                  addToast(t('autoBackupDisabled'), 'info')
                }
              }}
            />
          </OptionRow>

          <OptionRow label={t('backupInterval')} sub={t('backupIntervalDesc')}>
            <select 
              value={store.backupInterval || 5}
              onChange={async (e) => {
                const val = Number(e.target.value)
                await store.updateBackupInterval(val)
                if (store.autoBackupEnabled) {
                  stopAutoBackup()
                  startAutoBackup(store)
                }
                addToast(`${t('backupIntervalChanged')} ${val} ${t('minutes')}`, 'info')
              }}
              style={{ width: 120, fontSize: 12 }}
            >
              <option value="1">1 {t('minute')}</option>
              <option value="5">5 {t('minutes')}</option>
              <option value="15">15 {t('minutes')}</option>
              <option value="30">30 {t('minutes')}</option>
              <option value="60">60 {t('minutes')}</option>
            </select>
          </OptionRow>

          <BackupSettings store={store} addToast={addToast} lang={currentLang} />

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('exportSectionLabel')}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t('configOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('configOnlyDesc')}</div>
              </div>
              <button 
                className="btn-secondary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  const r = await window.electronAPI.exportConfig()
                  if (r.success) addToast(t('toastConfigExported'), 'success')
                  else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-download" /> {t('exportLabel')}
              </button>
            </div>

            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📦</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t('fullArchive')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('fullArchiveDesc')}</div>
              </div>
              <button 
                className="btn-primary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  addToast(t('toastArchiveCreating'), 'info')
                  const r = await window.electronAPI.exportFull()
                  if (r.success) addToast(`${t('archiveCreated')} · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-package" /> {t('exportLabel')}
              </button>
            </div>

            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>🎵</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t('soundsOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('soundsOnlyDesc')}</div>
              </div>
              <button 
                className="btn-secondary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  addToast(t('toastSoundsCompressing'), 'info')
                  const r = await window.electronAPI.exportSoundsOnly()
                  if (r.success) addToast(`${r.sizeMb} Mo ${t('exported')} ✓`, 'success')
                  else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-music" /> {t('exportLabel')}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('importSectionLabel')}
          </div>
          
          <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>📥</div>
            <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t('importBackup')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('importBackupDesc')}</div>
            </div>
            <button 
              className="btn-primary" 
              style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
              onClick={async () => {
                const r = await window.electronAPI.importBackup()
                if (r.success) {
                  if (r.type === 'json') addToast(`${t('configImported')} ✓ — ${t('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
                  else if (r.type === 'full') addToast(`${t('archiveImported')} · ${r.importedSounds} ${t('sounds')} ✓ — ${t('restartRequired')}`, 'success')
                  else if (r.type === 'sounds-only') addToast(`${r.importedSounds} ${t('sounds')} ${t('imported')} ✓`, 'success')
                } else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
              }}
            >
              <i className="ti ti-upload" /> {t('importLabel')}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {t('restartNote')}
          </div>
        </Section>

        {/* ============================ */}
        {/* SECTION 9 : PROFILS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['profiles'] = el}
          id="profiles"
          title={t('optionsProfiles')} 
          icon="ti-users"
        >
          {store.profiles.map(p => (
            <div key={p.id} className="option-row" style={{ padding: '10px 14px' }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13, padding: '0 10px' }}>{p.id === 'all' ? t('allSounds') : p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 8 }}>
                {store.sounds.filter(s => s.profiles?.includes(p.id)).length} {t('sounds')}
              </span>
              <button
                className="btn-secondary btn-sm"
                style={{ padding: '4px 12px', minHeight: 28 }}
                onClick={async () => {
                  addToast(t('toastProfileExporting'), 'info')
                  const r = await window.electronAPI.exportProfile(p.id)
                  if (r.success) addToast(`${t('profileExported')} "${p.name}" · ${r.soundCount} ${t('sounds')} · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-package-export" /> {t('exportProfile')}
              </button>
              {!p.isDefault && (
                <DeleteButton
                  onDelete={async () => {
                    await store.deleteProfile(p.id)
                    addToast(t('profileDeleted'), 'info')
                  }}
                  confirmTitle={t('confirmDeleteProfile')}
                  confirmMessage={t('confirmDeleteProfileMessage')}
                  itemName={p.name}
                  size="sm"
                  variant="ghost-danger"
                  icon="ti-trash"
                  showLabel={false}
                />
              )}
            </div>
          ))}
          <button 
            className="btn-secondary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12, padding: '6px 12px', minHeight: 34 }}
            onClick={async () => {
              const r = await window.electronAPI.importProfile()
              if (r.success) addToast(`${t('profileImported')} "${r.profileName}" · ${r.soundCount} ${t('sounds')} ✓ — ${t('restartRequired')}`, 'success')
              else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-package-import" /> {t('importProfile')}
          </button>
        </Section>

      </div>
      <ConfirmWrapper />
    </div>
  )
}

function OptionRow({ label, sub, children }) {
  const { t } = useLanguage()
  return (
    <div className="option-row">
      <div>
        <div className="label">{label}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div className={`toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)}>
      <div className="knob" />
    </div>
  )
}