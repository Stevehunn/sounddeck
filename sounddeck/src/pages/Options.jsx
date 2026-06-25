// sounddeck/src/pages/Options.jsx
import { useState, useEffect, useRef, forwardRef, useCallback } from 'react'
import ShortcutRecorder from '../components/ShortcutRecorder'
import CustomThemeEditor from '../components/CustomThemeEditor'
import { LANGUAGES, useTranslation } from '../i18n'
import { getMicrophoneStatus, getMixerStats, testMicrophoneOnce, connectMixerToOutput } from '../utils/audioMixer'
import KeyboardVisualizer from '../components/KeyboardVisualizer'

// Définition des sections
const SECTIONS = [
  { id: 'appearance', icon: 'ti-palette', label: 'Apparence' },
  { id: 'audio', icon: 'ti-volume', label: 'Audio' },
  { id: 'shortcuts', icon: 'ti-keyboard', label: 'Raccourcis' },
  { id: 'backup', icon: 'ti-cloud', label: 'Sauvegarde' },
  { id: 'profiles', icon: 'ti-users', label: 'Profils' },
]

// Composant Section avec forwardRef
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
  const [activeSection, setActiveSection] = useState('appearance')
  const [audioDevices, setAudioDevices] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [microphones, setMicrophones] = useState([])
  const [isInstallingDriver, setIsInstallingDriver] = useState(false)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const micTestRef = useRef(null)
  const sectionRefs = useRef({})
  const observerRef = useRef(null)
  const isScrollingRef = useRef(false)

  // Nettoyer le test à la fermeture de la page Options
  useEffect(() => {
    return () => {
      if (micTestRef.current) {
        micTestRef.current.stop()
        micTestRef.current = null
      }
    }
  }, [])

  // Détecter les périphériques audio
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

  // ✅ NOUVEAU : Observer les sections pour mettre à jour la navigation
  useEffect(() => {
    // Attendre que les refs soient disponibles
    const setupObserver = () => {
      const sections = SECTIONS.map(s => sectionRefs.current[s.id]).filter(Boolean)
      
      if (sections.length === 0) {
        setTimeout(setupObserver, 100)
        return
      }

      // Nettoyer l'ancien observer
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      const observer = new IntersectionObserver(
        (entries) => {
          // Si l'utilisateur est en train de scroller, on ne met pas à jour
          if (isScrollingRef.current) return

          // Trouver la section la plus visible
          let maxRatio = 0
          let maxId = null

          entries.forEach(entry => {
            const ratio = entry.intersectionRatio
            if (ratio > maxRatio) {
              maxRatio = ratio
              maxId = entry.target.dataset.section
            }
          })

          // Si on a trouvé une section visible avec un ratio > 0.3
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

    // Initialiser l'observer après un court délai
    const timer = setTimeout(setupObserver, 200)
    return () => {
      clearTimeout(timer)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, []) // Se déclenche une fois au montage

  const scrollToSection = (sectionId) => {
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      // Marquer que l'utilisateur est en train de scroller
      isScrollingRef.current = true
      setActiveSection(sectionId)
      
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Réactiver l'observation après le défilement
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
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Section Apparence */}
        <Section 
          ref={el => sectionRefs.current['appearance'] = el}
          id="appearance"
          title="Apparence" 
          icon="ti-palette"
        >
          <OptionRow label={tr('language')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => store.updateLang(l.code)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${store.lang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                    background: store.lang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: store.lang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: store.lang === l.code ? 600 : 400
                  }}>
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
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${store.theme === val ? color : 'var(--border)'}`,
                    background: store.theme === val ? `${color}22` : 'var(--bg-tertiary)',
                    color: store.theme === val ? color : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontWeight: store.theme === val ? 600 : 400
                  }}>
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
        </Section>

        {/* Section Audio */}
        <Section 
          ref={el => sectionRefs.current['audio'] = el}
          id="audio"
          title="Audio" 
          icon="ti-volume"
        >
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
                    <button className="btn-secondary" onClick={handleDetectDevices} disabled={isDetecting} style={{ fontSize: 12 }}>
                      <i className="ti ti-refresh" /> {isDetecting ? '...' : tr('detect')}
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
                        <i className={`ti ${(() => {
                          try {
                            const { isMixerOperational } = require('../utils/audioMixer')
                            return isMixerOperational() ? 'ti-check' : 'ti-x'
                          } catch { return 'ti-minus' }
                        })()}`} />
                        <span style={{ marginLeft: 4, fontSize: 11 }}>
                          {(() => {
                            try {
                              const { isMixerOperational } = require('../utils/audioMixer')
                              return isMixerOperational() ? tr('mixerOperational') : tr('mixerNotOperational')
                            } catch { return '' }
                          })()}
                        </span>
                      </span>
                      <button className="btn-secondary" onClick={async () => {
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
                      }} style={{ fontSize: 12 }}>
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
                    <button className="btn-secondary" onClick={async () => {
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
                    }} style={{ fontSize: 12 }}>
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

              <OptionRow label={tr('playLocally')} sub={tr('playLocallyDesc')}>
                <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
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

          <OptionRow label={tr('normalization')} sub={tr('normalizationDesc')}>
            <Toggle value={store.normalizationEnabled} onChange={store.updateNormalizationEnabled} />
          </OptionRow>

          <OptionRow label={tr('reanalyzeGains')} sub={tr('reanalyzeGainsDesc')}>
            <button className="btn-secondary" onClick={async () => {
              await store.resetGainCache?.()
              addToast(tr('gainCacheCleared'), 'info')
            }} style={{ fontSize: 12 }}>
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

        {/* Section Raccourcis */}
        <Section 
          ref={el => sectionRefs.current['shortcuts'] = el}
          id="shortcuts"
          title="Raccourcis" 
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

        {/* Section Sauvegarde */}
        <Section 
          ref={el => sectionRefs.current['backup'] = el}
          id="backup"
          title="Sauvegarde" 
          icon="ti-cloud"
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('exportSectionLabel')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('configOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('configOnlyDesc')}</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  const r = await window.electronAPI.exportConfig()
                  if (r.success) addToast(tr('toastConfigExported'), 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-download" /> {tr('exportLabel')}
              </button>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('fullArchive')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('fullArchiveDesc')}</div>
              </div>
              <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast(tr('toastArchiveCreating'), 'info')
                  const r = await window.electronAPI.exportFull()
                  if (r.success) addToast(`${tr('archiveCreated')} · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-package" /> {tr('exportLabel')}
              </button>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('soundsOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('soundsOnlyDesc')}</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast(tr('toastSoundsCompressing'), 'info')
                  const r = await window.electronAPI.exportSoundsOnly()
                  if (r.success) addToast(`${r.sizeMb} Mo ${tr('exported')} ✓`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-music" /> {tr('exportLabel')}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('importSectionLabel')}
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20 }}>📥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('importBackup')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('importBackupDesc')}</div>
            </div>
            <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
              onClick={async () => {
                const r = await window.electronAPI.importBackup()
                if (r.success) {
                  if (r.type === 'json') addToast(`${tr('configImported')} ✓ — ${tr('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
                  else if (r.type === 'full') addToast(`${tr('archiveImported')} · ${r.importedSounds} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
                  else if (r.type === 'sounds-only') addToast(`${r.importedSounds} ${tr('sounds')} ${tr('imported')} ✓`, 'success')
                } else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
              }}>
              <i className="ti ti-upload" /> {tr('importLabel')}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {tr('restartNote')}
          </div>
        </Section>

        {/* Section Profils */}
        <Section 
          ref={el => sectionRefs.current['profiles'] = el}
          id="profiles"
          title="Profils" 
          icon="ti-users"
        >
          {store.profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', marginBottom: 6 }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13 }}>{p.id === 'all' ? tr('allSounds') : p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {store.sounds.filter(s => s.profiles?.includes(p.id)).length} {tr('sounds')}
              </span>
              <button
                style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={async () => {
                  addToast(tr('toastProfileExporting'), 'info')
                  const r = await window.electronAPI.exportProfile(p.id)
                  if (r.success) addToast(`${tr('profileExported')} "${p.name}" · ${r.soundCount} ${tr('sounds')} · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <i className="ti ti-package-export" /> {tr('exportProfile')}
              </button>
              {!p.isDefault && (
                <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 12 }}
                  onClick={async () => { await store.deleteProfile(p.id); addToast(tr('profileDeleted'), 'info') }}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12 }}
            onClick={async () => {
              const r = await window.electronAPI.importProfile()
              if (r.success) addToast(`${tr('profileImported')} "${r.profileName}" · ${r.soundCount} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
              else if (r.error) addToast(`${tr('error')} ${r.error}`, 'error')
            }}>
            <i className="ti ti-package-import" /> {tr('importProfile')}
          </button>
        </Section>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

function OptionRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 38, height: 22, borderRadius: 11,
      background: value ? 'var(--accent)' : 'var(--bg-tertiary)',
      border: '1px solid var(--border)', position: 'relative',
      cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, borderRadius: 8,
        background: 'white', top: 2, left: value ? 18 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </div>
  )
}