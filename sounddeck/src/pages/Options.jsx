import { useState, useEffect, useRef, forwardRef, useCallback } from 'react'
import ShortcutRecorder from '../components/ShortcutRecorder'
import CustomThemeEditor from '../components/CustomThemeEditor'
import SidebarEditor from '../components/SidebarEditor'
import OBSControl from '../components/OBSControl'
import TwitchAlerts from '../components/TwitchAlerts'
import BackupSettings from '../components/BackupSettings'
import PluginInstaller from '../components/PluginInstaller'
import { LANGUAGES, useTranslation } from '../i18n'
import { getMicrophoneStatus, getMixerStats, testMicrophoneOnce, connectMixerToOutput } from '../utils/audioMixer'
import KeyboardVisualizer from '../components/KeyboardVisualizer'
import FeedbackModal from '../components/FeedbackModal'
import ReactDOM from 'react-dom/client'
import useConfirm from '../hooks/useConfirm'

const SECTIONS = [
  { id: 'appearance', icon: 'ti-palette', labelKey: 'optionsAppearance' },
  { id: 'audio', icon: 'ti-volume', labelKey: 'optionsAudio' },
  { id: 'shortcuts', icon: 'ti-keyboard', labelKey: 'optionsShortcuts' },
  { id: 'soundManagement', icon: 'ti-music', labelKey: 'soundManagement' },
  { id: 'plugins', icon: 'ti-puzzle', labelKey: 'optionsPlugins' },
  { id: 'integrations', icon: 'ti-plug', labelKey: 'integrations' },
  { id: 'performance', icon: 'ti-gauge', labelKey: 'performance' },
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

export default function Options({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const { confirm, ConfirmWrapper } = useConfirm({ lang })
  const [activeSection, setActiveSection] = useState('appearance')
  const [audioDevices, setAudioDevices] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [microphones, setMicrophones] = useState([])
  const [isInstallingDriver, setIsInstallingDriver] = useState(false)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const [showPluginInstaller, setShowPluginInstaller] = useState(false)
  const [plugins, setPlugins] = useState([]) // ✅ AJOUTÉ
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
          addToast('🔊 ' + tr('virtualDriverDetected'), 'success')
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
      addToast('📦 ' + tr('downloadingDriver'), 'info')
      const result = await window.electronAPI.installVirtualDriver()
      if (result.success) {
        if (result.warning) {
          addToast('⚠️ ' + result.warning, 'info')
        } else {
          addToast('✅ ' + tr('driverInstalled'), 'success')
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
        addToast('❌ ' + tr('installError') + ': ' + (result.error || tr('unknown')), 'error')
      }
    } catch (e) {
      addToast('❌ ' + tr('error') + ': ' + e.message, 'error')
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
        addToast('✅ ' + tr('virtualDriverDetected'), 'success')
      } else {
        store.updateVirtualDriverInstalled?.(false)
        addToast(tr('virtualDriverNotDetected'), 'info')
      }
    } catch (e) {
      addToast(tr('detectError'), 'error')
    }
    setIsDetecting(false)
  }

  const testMicrophone = async () => {
    if (micTestRef.current) {
      micTestRef.current.stop()
      micTestRef.current = null
      setIsMicrophoneTesting(false)
      addToast('🔇 Test micro arrêté', 'info')
      return
    }

    try {
      setIsMicrophoneTesting(true)
      addToast('🎤 Test micro en cours (3 secondes)...', 'info')
      
      const deviceId = store.microphoneDevice || 'default'
      const result = await testMicrophoneOnce(deviceId)
      
      if (result.success) {
        micTestRef.current = {
          stop: result.stop,
          stream: result.stream,
          context: result.context
        }
        
        addToast(`✅ Micro "${result.deviceName}" fonctionne !`, 'success')
        
        setTimeout(() => {
          if (micTestRef.current) {
            micTestRef.current.stop()
            micTestRef.current = null
            setIsMicrophoneTesting(false)
            addToast('🔇 Test micro terminé', 'info')
          }
        }, 3000)
        
      } else {
        setIsMicrophoneTesting(false)
        addToast(`❌ Erreur: ${result.error || 'Micro non accessible'}`, 'error')
      }
    } catch (e) {
      setIsMicrophoneTesting(false)
      addToast('❌ Erreur lors du test: ' + e.message, 'error')
    }
  }

  const handleResetSidebar = useCallback(async () => {
    const confirmed = await confirm({
      title: tr('sidebarEditorReset'),
      message: tr('sidebarEditorResetConfirm'),
      type: 'warning'
    })
    if (!confirmed) return
    
    await store.resetSidebarConfig()
    addToast(tr('sidebarEditorResetSuccess'), 'success')
  }, [store, tr, addToast, confirm])

  const handleClearLogs = useCallback(async () => {
    const confirmed = await confirm({
      title: tr('clearLogs'),
      message: tr('clearLogsConfirm'),
      type: 'danger'
    })
    if (!confirmed) return
    
    await window.electronAPI.storeDelete('errorLogs')
    addToast(tr('logsCleared'), 'info')
  }, [confirm, tr, addToast])

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
          {tr('optionsTitle')}
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
              {tr(section.labelKey)}
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
          title={tr('optionsAppearance')} 
          icon="ti-palette"
        >
          <OptionRow label={tr('language')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => store.updateLang(l.code)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${store.lang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                    background: store.lang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: store.lang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: store.lang === l.code ? 600 : 400
                  }}
                >
                  <span style={{ fontSize: 16 }}>{l.flag}</span>
                  {l.label}
                  {store.lang === l.code && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>

          <OptionRow label={tr('theme')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { val: 'dark', label: tr('themeDark'), color: '#7C6FF7' },
                { val: 'light', label: tr('themeLight'), color: '#534AB7' },
                { val: 'dark-blue', label: tr('themeBlue'), color: '#2f81f7' },
                { val: 'custom', label: tr('themeCustom'), color: '#a855f7' },
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
                addToast(tr('toastCustomThemeApplied'), 'success')
              }}
            />
          )}

          <OptionRow label={tr('cardSize')} sub={tr('cardSizeDesc')}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { val: 'small', label: tr('cardSizeSmall'), icon: 'ti-layout-grid' },
                { val: 'medium', label: tr('cardSizeMedium'), icon: 'ti-layout-grid' },
                { val: 'large', label: tr('cardSizeLarge'), icon: 'ti-layout-grid' },
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

          <OptionRow label={tr('tutorialRestart')} sub={tr('tutorialRestartDesc')}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  localStorage.removeItem('sounddeck-tutorial-done')
                  window.location.reload()
                }}
                style={{ fontSize: 12, minHeight: 34, padding: '6px 16px', borderRadius: 'var(--radius-md)' }}
              >
                <i className="ti ti-book" /> {tr('tutorialRestart')}
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  const event = new CustomEvent('open-advanced-tutorial')
                  window.dispatchEvent(event)
                }}
                style={{ fontSize: 12, minHeight: 34, padding: '6px 16px', borderRadius: 'var(--radius-md)' }}
              >
                <i className="ti ti-rocket" /> {tr('tutorialAdvanced')}
              </button>
            </div>
          </OptionRow>

          <OptionRow label={tr('sidebarCustomization')} sub={tr('sidebarCustomizationDesc')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {store.sidebarConfig?.mode === 'custom' 
                  ? `🎨 ${tr('sidebarCustomized')}` 
                  : `📋 ${tr('sidebarDefault')}`}
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
                {store.sidebarEditMode ? tr('sidebarEditorClose') : tr('sidebarEditorOpen')}
              </button>
              {store.sidebarConfig?.mode === 'custom' && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={handleResetSidebar}
                  style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
                >
                  <i className="ti ti-refresh" /> {tr('sidebarEditorReset')}
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
                addToast(tr('sidebarEditorSaved'), 'success')
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
          title={tr('optionsAudio')} 
          icon="ti-volume"
        >
          {/* Périphériques audio - en haut */}
          <OptionRow label={tr('outputDevice')} sub={tr('outputDeviceDesc')}>
            <select value={store.audioDevice} onChange={e => store.updateAudioDevice(e.target.value)}
              style={{ width: 220, fontSize: 12 }}>
              <option value="default">{tr('outputDeviceDefault')}</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${tr('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          <OptionRow label={tr('localOutputDevice')} sub={tr('localOutputDeviceDesc')}>
            <select 
              value={store.localAudioDevice || 'default'} 
              onChange={async (e) => {
                const deviceId = e.target.value
                await store.updateLocalAudioDevice(deviceId)
                addToast(tr('localOutputDeviceChanged').replace('{device}', deviceId === 'default' ? tr('localOutputDeviceDefault') : deviceId), 'info')
              }}
              style={{ width: 220, fontSize: 12 }}
            >
              <option value="default">{tr('localOutputDeviceDefault')}</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${tr('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          <OptionRow label={tr('playLocally')} sub={tr('playLocallyDesc')}>
            <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
          </OptionRow>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          {/* Mode audio - après les périphériques */}
          <OptionRow label={tr('audioMode')} sub={tr('audioModeDesc')}>
            <select value={store.audioMode || 'simple'} onChange={e => store.updateAudioMode(e.target.value)}
              style={{ width: 180, fontSize: 12 }}>
              <option value="simple">{tr('audioModeSimple')} ✅</option>
              <option value="advanced">{tr('audioModeAdvanced')}</option>
            </select>
          </OptionRow>

          {store.audioMode === 'simple' && (
            <>
              <OptionRow label={tr('virtualDriver')} sub={tr('virtualDriverSub')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {store.virtualDriverInstalled ? (
                      <span style={{ color: 'var(--success)', fontSize: 13 }}>
                        <i className="ti ti-check" /> ✅ {tr('virtualDriverDetected')}
                      </span>
                    ) : (
                      <button 
                        className="btn-primary"
                        onClick={handleInstallDriver}
                        disabled={isInstallingDriver}
                        style={{ fontSize: 12 }}
                      >
                        {isInstallingDriver ? (
                          <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('installing')}</>
                        ) : (
                          <><i className="ti ti-download" /> {tr('installVirtualDriver')}</>
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
                      {isDetecting ? '...' : tr('detect')}
                    </button>
                  </div>
                  
                  {!store.virtualDriverInstalled && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 6, lineHeight: 1.6 }}>
                      <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                      {tr('virtualDriverInfo')}
                    </div>
                  )}
                  
                  {store.virtualDriverInstalled && (
                    <div style={{ fontSize: 11, color: 'var(--success)', background: 'rgba(29,158,117,0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--success)' }}>
                      <i className="ti ti-check" style={{ marginRight: 4 }} />
                      {tr('virtualDriverSuccess')}
                      <br />
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 6, lineHeight: 1.6, border: '1px solid var(--border)' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                    <strong>{tr('uninstallGuideTitle')}</strong>
                    <br />
                    {tr('uninstallGuideStep1')} → cherche <strong>"VB-CABLE"</strong> {tr('uninstallGuideStep2')}
                    <br />
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {tr('uninstallGuideRestart')}
                    </span>
                  </div>
                </div>
              </OptionRow>

              <OptionRow label={tr('mixerEnable')} sub={tr('mixerEnableDesc')}>
                <Toggle value={store.mixerEnabled} onChange={async (val) => {
                  await store.updateMixerEnabled(val)
                  if (val) {
                    try {
                      const { initAudioMixer, resumeAudioContext, getMixerStats, connectMixerToOutput } = await import('../utils/audioMixer')
                      const mixedStream = await initAudioMixer(store.microphoneDevice)
                      const stats = getMixerStats()
                      if (mixedStream && stats.isInitialized) {
                        resumeAudioContext()
                        connectMixerToOutput(store.audioDevice || 'default')
                        addToast('✅ ' + tr('mixerActivated'), 'success')
                      } else {
                        addToast('❌ ' + tr('mixerActivationError'), 'error')
                        store.updateMixerEnabled(false)
                      }
                    } catch (e) {
                      console.error('Erreur activation mixeur:', e)
                      addToast('❌ ' + tr('error') + ': ' + e.message, 'error')
                      store.updateMixerEnabled(false)
                    }
                  } else {
                    const { stopMixer } = await import('../utils/audioMixer')
                    await stopMixer()
                    addToast(tr('mixerDeactivated'), 'info')
                  }
                }} />
              </OptionRow>

              {store.mixerEnabled && (
                <>
                  <OptionRow label={tr('microphone')} sub={tr('microphoneSelect')}>
                    <select value={store.microphoneDevice} onChange={async (e) => {
                      const deviceId = e.target.value
                      await store.updateMicrophoneDeviceId(deviceId)
                      try {
                        const { changeMicrophone } = await import('../utils/audioMixer')
                        await changeMicrophone(deviceId)
                        addToast('✅ ' + tr('microphoneChanged'), 'success')
                      } catch (err) {
                        console.error('Erreur changement micro:', err)
                      }
                    }} style={{ width: 220, fontSize: 12 }}>
                      <option value="default">{tr('microphoneDefault')}</option>
                      {microphones.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `${tr('microphoneLabel')} ${d.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </OptionRow>

                  <OptionRow label={tr('microphoneVolume')} sub={`${store.microphoneVolume}%`}>
                    <input type="range" min="0" max="100" value={store.microphoneVolume}
                      onChange={async (e) => {
                        const val = Number(e.target.value)
                        await store.updateMicrophoneVolume(val)
                        const { setMicrophoneVolume } = await import('../utils/audioMixer')
                        setMicrophoneVolume(val / 100)
                      }}
                      style={{ width: 140, accentColor: 'var(--accent)' }} />
                  </OptionRow>

                  <OptionRow label={tr('mixerSoundVolume')} sub={`${store.mixerSoundVolume}%`}>
                    <input type="range" min="0" max="100" value={store.mixerSoundVolume}
                      onChange={async (e) => {
                        const val = Number(e.target.value)
                        await store.updateMixerSoundVolume(val)
                        const { setSoundVolume } = await import('../utils/audioMixer')
                        setSoundVolume(val / 100)
                      }}
                      style={{ width: 140, accentColor: 'var(--accent)' }} />
                  </OptionRow>

                  <OptionRow label={tr('lowLatencyMode')} sub={tr('lowLatencyModeDesc')}>
                    <Toggle 
                      value={store.lowLatencyMode || false} 
                      onChange={async (val) => {
                        await store.updateLowLatencyMode(val)
                        const { setLowLatencyMode } = await import('../utils/audioMixer')
                        setLowLatencyMode(val)
                        addToast(val ? tr('lowLatencyActivated') : tr('lowLatencyDeactivated'), 'info')
                      }} 
                    />
                  </OptionRow>

                  <OptionRow label={tr('noiseSuppressionMode')} sub={tr('noiseSuppressionModeDesc')}>
                    <select 
                      value={store.noiseSuppressionMode || 'auto'} 
                      onChange={async (e) => {
                        const mode = e.target.value
                        await store.updateNoiseSuppressionMode(mode)
                        const { setNoiseSuppressionMode } = await import('../utils/audioMixer')
                        setNoiseSuppressionMode(mode)
                        addToast(tr('noiseSuppressionModeChanged').replace('{mode}', mode), 'info')
                      }}
                      style={{ width: 140, fontSize: 12 }}
                    >
                      <option value="auto">{tr('noiseSuppressionModeAuto')}</option>
                      <option value="worklet">{tr('noiseSuppressionModeWorklet')}</option>
                      <option value="filter">{tr('noiseSuppressionModeFilter')}</option>
                      <option value="off">{tr('noiseSuppressionModeOff')}</option>
                    </select>
                  </OptionRow>

                  <OptionRow label={tr('mixerStatus')} sub={tr('mixerStatusSub')}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: 11, 
                        color: (() => {
                          try {
                            const { isMixerOperational } = require('../utils/audioMixer')
                            return isMixerOperational() ? 'var(--success)' : 'var(--danger)'
                          } catch { return 'var(--text-tertiary)' }
                        })()
                      }}>
                        <span style={{ marginLeft: 4, fontSize: 11 }}>
                          {(() => {
                            try {
                              const { isMixerOperational } = require('../utils/audioMixer')
                              return isMixerOperational() ? tr('mixerOperational') : tr('mixerNotOperational')
                            } catch { return '' }
                          })()}
                        </span>
                      </span>
                      <button 
                        className="btn-secondary" 
                        onClick={async () => {
                          try {
                            const { repairMixer, isMixerOperational } = await import('../utils/audioMixer')
                            if (!isMixerOperational()) {
                              const success = repairMixer()
                              if (success) {
                                addToast(tr('mixerRepaired'), 'success')
                              } else {
                                addToast(tr('mixerReset'), 'info')
                                const { stopMixer, initAudioMixer, connectMixerToOutput, resumeAudioContext } = await import('../utils/audioMixer')
                                await stopMixer()
                                const stream = await initAudioMixer(store.microphoneDevice || 'default')
                                if (stream) {
                                  resumeAudioContext()
                                  connectMixerToOutput(store.audioDevice || 'default')
                                  addToast(tr('mixerResetSuccess'), 'success')
                                }
                              }
                            } else {
                              addToast(tr('mixerOperational'), 'success')
                            }
                          } catch (e) {
                            addToast(tr('mixerRepairError').replace('{error}', e.message), 'error')
                          }
                        }} 
                        style={{ 
                          fontSize: 12, 
                          minHeight: 34, 
                          padding: '6px 16px',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <i className="ti ti-wrench" /> {tr('mixerRepair')}
                      </button>
                    </div>
                  </OptionRow>

                  <OptionRow label={tr('testMicrophone')} sub="">
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
                      {isMicrophoneTesting ? 'Test en cours...' : tr('test')}
                    </button>
                  </OptionRow>

                  <OptionRow label={tr('reconnectFlow')} sub={tr('reconnectFlowDesc')}>
                    <button 
                      className="btn-secondary" 
                      onClick={async () => {
                        try {
                          const { connectMixerToOutput, getMixerStats } = await import('../utils/audioMixer')
                          const stats = getMixerStats()
                          if (!stats.isInitialized) {
                            addToast('❌ ' + tr('mixerNotInitialized'), 'error')
                            return
                          }
                          const result = connectMixerToOutput(store.audioDevice || 'default')
                          if (result) addToast('✅ ' + tr('flowReconnected'), 'success')
                        } catch (e) {
                          addToast('❌ ' + tr('error') + ': ' + e.message, 'error')
                        }
                      }} 
                      style={{ 
                        fontSize: 12, 
                        minHeight: 34, 
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <i className="ti ti-plug" /> {tr('reconnect')}
                    </button>
                  </OptionRow>

                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 6, lineHeight: 1.6, border: '1px solid var(--success)' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--success)' }} />
                    <strong>{tr('mixerActive')}</strong> : {tr('mixerActiveDesc')}
                    <br />
                    <span style={{ fontSize: 10 }}>
                      {tr('mixerDiscordTip')}
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {store.audioMode === 'advanced' && (
            <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              <strong>{tr('advancedMode')}</strong> : {tr('advancedModeDesc')}
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> {tr('downloadVBCable')}
              </button>
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Voicemeeter/banana.htm')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 2, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> {tr('downloadVoiceMeeter')}
              </button>
              <br />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                💡 {tr('advancedModeTip')}
              </span>
            </div>
          )}
        </Section>

        {/* ============================ */}
        {/* SECTION 3 : RACCOURCIS CLAVIER */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['shortcuts'] = el}
          id="shortcuts"
          title={tr('optionsShortcuts')} 
          icon="ti-keyboard"
        >
          <OptionRow label={tr('keyboardLayout')} sub={tr('keyboardLayoutDesc')}>
            <select 
              value={store.keyboardLayout || 'qwerty'} 
              onChange={async (e) => {
                const layout = e.target.value
                await store.updateKeyboardLayout(layout)
                addToast(`Disposition: ${layout === 'azerty' ? 'AZERTY' : 'QWERTY'}`, 'info')
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

          <OptionRow label={tr('switchProfile')} sub={tr('switchProfileDesc')}>
            <ShortcutRecorder
              value={store.profileShortcut}
              onSave={async (acc) => { await store.updateProfileShortcut(acc); addToast(`${tr('toastShortcutSet')} ${acc}`, 'success') }}
              onClear={() => store.updateProfileShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={tr('toggleLoop')} sub={tr('toggleLoopDesc')}>
            <ShortcutRecorder
              value={store.loopShortcut}
              onSave={async (acc) => { await store.updateLoopShortcut(acc); addToast(`${tr('toastShortcutLoop')} ${acc}`, 'success') }}
              onClear={() => store.updateLoopShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={tr('stopAllShortcut')} sub={tr('stopAllDesc')}>
            <ShortcutRecorder
              value={store.stopAllShortcut}
              onSave={async (acc) => { await store.updateStopAllShortcut(acc); addToast(`${tr('toastShortcutStop')} ${acc}`, 'success') }}
              onClear={() => store.updateStopAllShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          <OptionRow label={tr('presentationShortcut')} sub={tr('presentationDesc')}>
            <ShortcutRecorder
              value={store.presentationShortcut}
              onSave={async (acc) => { await store.updatePresentationShortcut(acc); addToast(`${tr('toastShortcutPresentation')} ${acc}`, 'success') }}
              onClear={() => store.updatePresentationShortcut('')}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>
          
          <OptionRow label={tr('toggleShortcuts')} sub={tr('toggleShortcutsDesc')}>
            <ShortcutRecorder
              value={store.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'}
              onSave={async (acc) => { 
                await store.updateToggleShortcutsAccelerator(acc)
                addToast(`${tr('toggleShortcutSet')} ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleShortcutsAccelerator('')
                addToast(tr('toggleShortcutRemoved'), 'info')
              }}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>

          <OptionRow label={tr('toggleWindowShortcut')} sub={tr('toggleWindowShortcutDesc')}>
            <ShortcutRecorder
              value={store.toggleWindowShortcut || 'CommandOrControl+Shift+S'}
              onSave={async (acc) => { 
                await store.updateToggleWindowShortcut(acc)
                addToast(`${tr('toggleWindowShortcutSet')} ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleWindowShortcut('')
                addToast(tr('toggleWindowShortcutRemoved'), 'info')
              }}
              requireMod
              layout={store.keyboardLayout || 'qwerty'}
            />
          </OptionRow>

          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {tr('shortcutsPerSoundNote')}
          </div>
        </Section>

        {/* ============================ */}
        {/* SECTION 4 : GESTION DES SONS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['soundManagement'] = el}
          id="soundManagement"
          title={tr('soundManagement')} 
          icon="ti-music"
        >
          <OptionRow label={tr('compressOnImport')} sub={tr('compressOnImportDesc')}>
            <Toggle 
              value={store.compressOnImport || false}
              onChange={async (val) => {
                await store.updateCompressOnImport(val)
                addToast(val ? tr('compressOnImportEnabled') : tr('compressOnImportDisabled'), 'info')
              }}
            />
          </OptionRow>

          {store.compressOnImport && (
            <OptionRow label={tr('compressionBitrate')} sub={tr('compressionBitrateDesc')}>
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
                <option value="128">128 kbps (recommandé)</option>
                <option value="192">192 kbps</option>
                <option value="256">256 kbps</option>
              </select>
            </OptionRow>
          )}

          <OptionRow label={tr('normalization')} sub={tr('normalizationDesc')}>
            <Toggle value={store.normalizationEnabled} onChange={store.updateNormalizationEnabled} />
          </OptionRow>

          <OptionRow label={tr('reanalyzeGains')} sub={tr('reanalyzeGainsDesc')}>
            <button 
              className="btn-secondary" 
              onClick={async () => {
                await store.resetGainCache?.()
                addToast(tr('gainCacheCleared'), 'info')
              }} 
              style={{ 
                fontSize: 12, 
                minHeight: 34, 
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <i className="ti ti-refresh" /> {tr('reanalyzeGains')}
            </button>
          </OptionRow>

          {store.normalizationEnabled && (
            <>
              <OptionRow label={tr('normalizationTarget')} sub={tr('normalizationTargetDesc')}>
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
                  <span>{tr('normalizationLabelLow')}</span>
                  <span>{tr('normalizationLabelMedium')}</span>
                  <span>{tr('normalizationLabelHigh')}</span>
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
                    {tr('normalizationDefaultLabel')}
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
                <strong>{tr('normalizationAdvice')}</strong> 
                {store.normalizationTarget < 0.15 && ` ${tr('normalizationAdviceLow')}`}
                {store.normalizationTarget >= 0.15 && store.normalizationTarget < 0.3 && ` ${tr('normalizationAdviceMedium')}`}
                {store.normalizationTarget >= 0.3 && store.normalizationTarget < 0.6 && ` ${tr('normalizationAdviceModerate')}`}
                {store.normalizationTarget >= 0.6 && ` ${tr('normalizationAdviceHigh')}`}
              </div>
            </>
          )}
        </Section>

        {/* ============================ */}
        {/* SECTION PLUGINS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['plugins'] = el}
          id="plugins"
          title={tr('optionsPlugins')} 
          icon="ti-puzzle"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Bouton d'installation */}
            <div className="option-row" style={{ padding: '12px 14px' }}>
              <div>
                <div className="label">{tr('pluginsInstall')}</div>
                <div className="sub">{tr('pluginsInstallDesc')}</div>
              </div>
              <button 
                className="btn-primary btn-sm"
                onClick={() => setShowPluginInstaller(true)}
                style={{ minHeight: 34, padding: '6px 16px' }}
              >
                <i className="ti ti-plus" /> {tr('pluginsInstallBtn')}
              </button>
            </div>

            {/* Liste des plugins installés */}
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
                <span>Plugins installés</span>
                <span>{plugins.length} plugin(s)</span>
              </div>

              {plugins.length === 0 && (
                <div style={{ 
                  padding: '24px', 
                  textAlign: 'center', 
                  color: 'var(--text-tertiary)',
                  fontSize: 13
                }}>
                  <i className="ti ti-puzzle" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                  Aucun plugin installé
                  <br />
                  <span style={{ fontSize: 11 }}>
                    Installez des plugins pour ajouter des fonctionnalités à SoundDeck
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
                        <span>par {plugin.author || 'Inconnu'}</span>
                        {plugin.pages > 0 && (
                          <span>
                            <i className="ti ti-files" style={{ fontSize: 10 }} />
                            {plugin.pages} page(s)
                          </span>
                        )}
                        <span style={{ 
                          fontSize: 9, 
                          color: 'var(--success)',
                          background: 'rgba(29,158,117,0.1)',
                          padding: '1px 8px',
                          borderRadius: 10
                        }}>
                          <i className="ti ti-check" /> Activé
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        // Recharger le plugin
                        window.location.reload()
                      }}
                      style={{ 
                        fontSize: 11, 
                        padding: '4px 8px',
                        color: 'var(--text-tertiary)'
                      }}
                      title="Recharger le plugin"
                    >
                      <i className="ti ti-refresh" />
                    </button>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={async () => {
                        if (confirm(`Voulez-vous vraiment désinstaller le plugin "${plugin.name}" ?`)) {
                          const result = await window.electronAPI.uninstallPlugin?.(plugin.id)
                          if (result?.success) {
                            addToast(`Plugin "${plugin.name}" désinstallé`, 'info')
                            // Recharger la page pour mettre à jour
                            window.location.reload()
                          } else {
                            addToast(`Erreur: ${result?.error || 'Échec de la désinstallation'}`, 'error')
                          }
                        }
                      }}
                      style={{ 
                        fontSize: 11, 
                        padding: '4px 8px',
                        color: 'var(--danger)'
                      }}
                      title="Désinstaller le plugin"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Info sur les plugins */}
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
              <strong>Où trouver des plugins ?</strong>
              <br />
              Les plugins sont des fichiers <code style={{ 
                background: 'var(--bg-secondary)', 
                padding: '1px 6px', 
                borderRadius: 3,
                fontSize: 10
              }}>.sdplugin</code> qui ajoutent des fonctionnalités à SoundDeck.
              <br />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                💡 Vous pouvez créer vos propres plugins ou les télécharger depuis la communauté.
              </span>
            </div>
          </div>

          {/* Modal d'installation */}
          {showPluginInstaller && (
            <PluginInstaller
              onClose={() => setShowPluginInstaller(false)}
              addToast={addToast}
              lang={lang}
              onInstall={(result) => {
                // Recharger la liste des plugins
                loadPlugins()
              }}
            />
          )}
        </Section>

        {/* ============================ */}
        {/* SECTION 5 : INTÉGRATIONS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['integrations'] = el}
          id="integrations"
          title={tr('integrations')} 
          icon="ti-plug"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <OBSControl lang={lang} />
            <TwitchAlerts store={store} addToast={addToast} lang={lang} />
          </div>
        </Section>

        {/* ============================ */}
        {/* SECTION 6 : PERFORMANCE & FEEDBACK */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['performance'] = el}
          id="performance"
          title={tr('performance')} 
          icon="ti-gauge"
        >
          <OptionRow label={tr('feedback')} sub={tr('feedbackDesc')}>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                import('../components/FeedbackModal').then(module => {
                  const Modal = module.default
                  const container = document.createElement('div')
                  container.style.position = 'fixed'
                  container.style.inset = '0'
                  container.style.zIndex = '10000'
                  document.body.appendChild(container)
                  
                  const root = ReactDOM.createRoot(container)
                  root.render(
                    <Modal
                      onClose={() => {
                        root.unmount()
                        container.remove()
                      }}
                      lang={lang}
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
              <i className="ti ti-message" /> {tr('feedbackSend')}
            </button>
          </OptionRow>

          <OptionRow label={tr('errorLogs')} sub={tr('errorLogsDesc')}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn-secondary btn-sm"
                onClick={async () => {
                  const logs = await window.electronAPI.storeGet('errorLogs') || []
                  if (logs.length === 0) {
                    addToast('Aucun log d\'erreur', 'info')
                  } else {
                    const json = JSON.stringify(logs, null, 2)
                    const blob = new Blob([json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `error-logs-${new Date().toISOString().slice(0,10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                }}
              >
                <i className="ti ti-file-text" /> {tr('exportLogs')}
              </button>
              <button 
                className="btn-danger btn-sm"
                onClick={handleClearLogs}
              >
                <i className="ti ti-trash" /> {tr('clearLogs')}
              </button>
            </div>
          </OptionRow>
        </Section>

        {/* ============================ */}
        {/* SECTION 7 : SAUVEGARDE */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['backup'] = el}
          id="backup"
          title={tr('optionsBackup')} 
          icon="ti-cloud"
        >
          <OptionRow label={tr('autoBackup')} sub={tr('autoBackupDesc')}>
            <Toggle 
              value={store.autoBackupEnabled || false}
              onChange={async (val) => {
                await store.updateAutoBackupEnabled(val)
                if (val) {
                  const { initBackupManager } = await import('../utils/backupManager')
                  initBackupManager(store)
                  addToast(tr('autoBackupEnabled'), 'success')
                } else {
                  const { stopAutoBackup } = await import('../utils/backupManager')
                  stopAutoBackup()
                  addToast(tr('autoBackupDisabled'), 'info')
                }
              }}
            />
          </OptionRow>

          <OptionRow label={tr('backupInterval')} sub={tr('backupIntervalDesc')}>
            <select 
              value={store.backupInterval || 5}
              onChange={async (e) => {
                const val = Number(e.target.value)
                await store.updateBackupInterval(val)
                if (store.autoBackupEnabled) {
                  const { stopAutoBackup, startAutoBackup } = await import('../utils/backupManager')
                  stopAutoBackup()
                  startAutoBackup(store)
                }
                addToast(`${tr('backupIntervalChanged')} ${val} ${tr('minutes')}`, 'info')
              }}
              style={{ width: 120, fontSize: 12 }}
            >
              <option value="1">1 {tr('minute')}</option>
              <option value="5">5 {tr('minutes')}</option>
              <option value="15">15 {tr('minutes')}</option>
              <option value="30">30 {tr('minutes')}</option>
              <option value="60">60 {tr('minutes')}</option>
            </select>
          </OptionRow>

          <BackupSettings store={store} addToast={addToast} lang={lang} />

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('exportSectionLabel')}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {/* Config seule */}
            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('configOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('configOnlyDesc')}</div>
              </div>
              <button 
                className="btn-secondary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  const r = await window.electronAPI.exportConfig()
                  if (r.success) addToast(tr('toastConfigExported'), 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-download" /> {tr('exportLabel')}
              </button>
            </div>

            {/* Archive complète */}
            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📦</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('fullArchive')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('fullArchiveDesc')}</div>
              </div>
              <button 
                className="btn-primary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  addToast(tr('toastArchiveCreating'), 'info')
                  const r = await window.electronAPI.exportFull()
                  if (r.success) addToast(`${tr('archiveCreated')} · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-package" /> {tr('exportLabel')}
              </button>
            </div>

            {/* Sons uniquement */}
            <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>🎵</div>
              <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('soundsOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('soundsOnlyDesc')}</div>
              </div>
              <button 
                className="btn-secondary" 
                style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
                onClick={async () => {
                  addToast(tr('toastSoundsCompressing'), 'info')
                  const r = await window.electronAPI.exportSoundsOnly()
                  if (r.success) addToast(`${r.sizeMb} Mo ${tr('exported')} ✓`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-music" /> {tr('exportLabel')}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('importSectionLabel')}
          </div>
          
          <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>📥</div>
            <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('importBackup')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('importBackupDesc')}</div>
            </div>
            <button 
              className="btn-primary" 
              style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
              onClick={async () => {
                const r = await window.electronAPI.importBackup()
                if (r.success) {
                  if (r.type === 'json') addToast(`${tr('configImported')} ✓ — ${tr('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
                  else if (r.type === 'full') addToast(`${tr('archiveImported')} · ${r.importedSounds} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
                  else if (r.type === 'sounds-only') addToast(`${r.importedSounds} ${tr('sounds')} ${tr('imported')} ✓`, 'success')
                } else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
              }}
            >
              <i className="ti ti-upload" /> {tr('importLabel')}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {tr('restartNote')}
          </div>
        </Section>

        {/* ============================ */}
        {/* SECTION 8 : PROFILS */}
        {/* ============================ */}
        <Section 
          ref={el => sectionRefs.current['profiles'] = el}
          id="profiles"
          title={tr('optionsProfiles')} 
          icon="ti-users"
        >
          {store.profiles.map(p => (
            <div key={p.id} className="option-row" style={{ padding: '10px 14px' }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13, padding: '0 10px' }}>{p.id === 'all' ? tr('allSounds') : p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 8 }}>
                {store.sounds.filter(s => s.profiles?.includes(p.id)).length} {tr('sounds')}
              </span>
              <button
                className="btn-secondary btn-sm"
                style={{ padding: '4px 12px', minHeight: 28 }}
                onClick={async () => {
                  addToast(tr('toastProfileExporting'), 'info')
                  const r = await window.electronAPI.exportProfile(p.id)
                  if (r.success) addToast(`${tr('profileExported')} "${p.name}" · ${r.soundCount} ${tr('sounds')} · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}
              >
                <i className="ti ti-package-export" /> {tr('exportProfile')}
              </button>
              {!p.isDefault && (
                <button 
                  className="btn-danger btn-sm" 
                  style={{ padding: '4px 8px', minHeight: 28 }}
                  onClick={async () => { await store.deleteProfile(p.id); addToast(tr('profileDeleted'), 'info') }}
                >
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
          <button 
            className="btn-secondary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12, padding: '6px 12px', minHeight: 34 }}
            onClick={async () => {
              const r = await window.electronAPI.importProfile()
              if (r.success) addToast(`${tr('profileImported')} "${r.profileName}" · ${r.soundCount} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
              else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-package-import" /> {tr('importProfile')}
          </button>
        </Section>

      </div>
      <ConfirmWrapper />
    </div>
  )
}

function OptionRow({ label, sub, children }) {
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