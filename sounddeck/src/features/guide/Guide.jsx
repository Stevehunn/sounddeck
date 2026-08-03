import { useState, useEffect } from 'react'
// ✅ CORRIGER L'IMPORT
import { useLanguage } from '@core/i18n/LanguageContext'

export default function Guide() { // ✅ Supprimer le paramètre lang
  const { t, currentLang } = useLanguage()
  const [activeStep, setActiveStep] = useState('install')
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    setRenderKey(prev => prev + 1)
    setActiveStep('install')
  }, [currentLang])

  const steps = [
    { id: 'install', icon: '📦', titleKey: 'guideStep1Title', color: '#7C6FF7', contentKey: 'step1' },
    { id: 'voicemeeter', icon: '🎚️', titleKey: 'guideStep2Title', color: '#2f81f7', contentKey: 'step2' },
    { id: 'sounddeck', icon: '🎛️', titleKey: 'guideStep3Title', color: '#23c55e', contentKey: 'step3' },
    { id: 'discord', icon: '💬', titleKey: 'guideStep4Title', color: '#5865F2', contentKey: 'step4' },
    { id: 'tips', icon: '💡', titleKey: 'guideStep5Title', color: '#EF9F27', contentKey: 'step5' },
  ]

  const active = steps.find(s => s.id === activeStep)

  const renderContent = () => {
    switch (activeStep) {
      case 'install':
        return (
          <div>
            <p style={{ marginBottom: 12 }}>{t('guideToolsRequired')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DownloadCard
                icon="🔌"
                name="VB-Audio Virtual Cable"
                desc={t('guideVBCableDesc')}
                url="https://vb-audio.com/Cable/"
                instructions={t('guideVBCableInstructions')}
              />
              <DownloadCard
                icon="🎚️"
                name="VoiceMeeter Banana"
                desc={t('guideVoiceMeeterDesc')}
                url="https://vb-audio.com/Voicemeeter/banana.htm"
                instructions={t('guideVoiceMeeterInstructions')}
              />
            </div>
            <InfoBox type="warning" text={t('guideRestartWarning')} />
          </div>
        )
      case 'voicemeeter':
        return (
          <div>
            <p style={{ marginBottom: 14 }}>{t('guideStep2Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <ConfigStep
                number="1"
                title={t('guideStep2Input1')}
                desc={t('guideStep2Input1Desc')}
                icon="🎙️"
              />
              <ConfigStep
                number="2"
                title={t('guideStep2Input2')}
                desc={t('guideStep2Input2Desc')}
                icon="🔌"
              />
              <ConfigStep
                number="3"
                title={t('guideStep2B1')}
                desc={t('guideStep2B1Desc')}
                icon="🔘"
              />
              <ConfigStep
                number="4"
                title={t('guideStep2A1')}
                desc={t('guideStep2A1Desc')}
                icon="🎧"
              />
            </div>
            <div className="guide-flow">
              <div style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontSize: 11, fontFamily: 'inherit' }}>{t('guideAudioFlow')}</div>
              <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
                <span style={{ color: '#2f81f7' }}>{t('guideYourMic')}</span> ──────────────────────────┐<br/>
                {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
                {'                            '}<span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>VoiceMeeter Banana</span><br/>
                <span style={{ color: '#23c55e' }}>SoundDeck</span> ──▶ CABLE Input ──▶ CABLE Output ──┘<br/>
                {'                                    '}<span style={{ color: 'var(--accent)' }}>│</span><br/>
                {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
                {'                        '}<span style={{ color: '#EF9F27', fontWeight: 'bold' }}>VoiceMeeter Output</span><br/>
                {'                                    '}<span style={{ color: 'var(--accent)' }}>│</span><br/>
                {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
                {'                              '}<span style={{ color: '#ef4444', fontWeight: 'bold' }}>Discord 🎙️</span>
              </div>
            </div>
          </div>
        )
      case 'sounddeck':
        return (
          <div>
            <p style={{ marginBottom: 14 }}>{t('guideStep3Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ConfigStep
                number="1"
                title={t('guideStep3Output')}
                desc={t('guideStep3OutputDesc')}
                icon="🔌"
                highlight
              />
              <ConfigStep
                number="2"
                title={t('guideStep3Local')}
                desc={t('guideStep3LocalDesc')}
                icon="🎧"
              />
            </div>
            <InfoBox type="info" text={t('guideStep3Info')} />
          </div>
        )
      case 'discord':
        return (
          <div>
            <p style={{ marginBottom: 14 }}>{t('guideStep4Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <ConfigStep
                number="1"
                title={t('guideStep4Input')}
                desc={t('guideStep4InputDesc')}
                icon="🎙️"
                highlight
              />
              <ConfigStep
                number="2"
                title={t('guideStep4Output')}
                desc={t('guideStep4OutputDesc')}
                icon="🎧"
              />
              <ConfigStep
                number="3"
                title={t('guideStep4Noise')}
                desc={t('guideStep4NoiseDesc')}
                icon="🔇"
              />
            </div>
            <InfoBox type="success" text={t('guideStep4Success')} />
          </div>
        )
      case 'tips':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TipCard icon="🚀" title={t('guideTipStartup')} desc={t('guideTipStartupDesc')} />
            <TipCard icon="🔊" title={t('guideTipVolume')} desc={t('guideTipVolumeDesc')} />
            <TipCard icon="🔁" title={t('guideTipEcho')} desc={t('guideTipEchoDesc')} />
            <TipCard icon="❌" title={t('guideTipDiscord')} desc={t('guideTipDiscordDesc')} />
            <TipCard icon="🔌" title={t('guideTipCable')} desc={t('guideTipCableDesc')} />
            <TipCard icon="🎚️" title={t('guideTipNoSound')} desc={t('guideTipNoSoundDesc')} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div key={renderKey} style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar gauche */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-book" style={{ color: 'var(--accent)' }} />
            {t('guideTitle')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t('guideSub')}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {steps.map((step) => (
            <button key={step.id} onClick={() => setActiveStep(step.id)}
              className={`sidebar-item ${activeStep === step.id ? 'active' : ''}`}
              style={{ borderLeft: `3px solid ${activeStep === step.id ? step.color : 'transparent'}` }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: activeStep === step.id ? step.color : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.1s' }}>
                {activeStep === step.id ? <i className="ti ti-check" style={{ color: 'white', fontSize: 13 }} /> : step.icon}
              </div>
              <div className="label">
                <div style={{ fontSize: 11, fontWeight: 600, color: activeStep === step.id ? step.color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(step.titleKey)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(step.titleKey).split('—')[1]?.trim()}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('quickRecap')}</div>
          <div>{t('guideRecap1')}</div>
          <div>{t('guideRecap2')}</div>
          <div>{t('guideRecap3')}</div>
          <div>{t('guideRecap4')}</div>
          <div>{t('guideRecap5')}</div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header avec tutoriels */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--border)', 
          flexShrink: 0, 
          background: 'var(--bg-secondary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          flexWrap: 'wrap'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: active?.color + '22', border: `2px solid ${active?.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {active?.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{active ? t(active.titleKey) : ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {t('guideStepOf')} {steps.findIndex(s => s.id === activeStep) + 1} / {steps.length}
            </div>
          </div>

          {/* ✅ Boutons Tutoriels */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                localStorage.removeItem('sounddeck-tutorial-done')
                window.location.reload()
              }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-book" /> {t('tutorialRestart')}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                const event = new CustomEvent('open-advanced-tutorial')
                window.dispatchEvent(event)
              }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-rocket" /> {t('tutorialAdvanced')}
            </button>
          </div>

          {/* Boutons Précédent/Suivant */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-secondary btn-sm"
              disabled={activeStep === steps[0].id}
              onClick={() => { const idx = steps.findIndex(s => s.id === activeStep); if (idx > 0) setActiveStep(steps[idx - 1].id) }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-arrow-left" /> {t('guidePrev')}
            </button>
            <button className="btn-primary btn-sm"
              disabled={activeStep === steps[steps.length - 1].id}
              onClick={() => { const idx = steps.findIndex(s => s.id === activeStep); if (idx < steps.length - 1) setActiveStep(steps[idx + 1].id) }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              {t('guideNext')} <i className="ti ti-arrow-right" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <div className="fade-in" key={activeStep + currentLang + renderKey}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────────────

function DownloadCard({ icon, name, desc, url, instructions }) {
  const { t } = useLanguage()
  const handleOpen = () => {
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
  }
  return (
    <div className="option-row" style={{ padding: '12px 14px', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, padding: '0 10px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4 }} />{instructions}
        </div>
        <button onClick={handleOpen} className="btn-secondary btn-sm">
          <i className="ti ti-download" /> {t('download')}
        </button>
      </div>
    </div>
  )
}

function ConfigStep({ number, title, desc, icon, highlight }) {
  return (
    <div 
      className={`option-row ${highlight ? 'config-step-highlight' : ''}`} 
      style={{ 
        alignItems: 'flex-start', 
        padding: '10px 14px',
        flexWrap: 'wrap',
        gap: 8
      }}
    >
      <div style={{ 
        width: 24, 
        height: 24, 
        borderRadius: '50%', 
        flexShrink: 0, 
        background: highlight ? 'var(--accent)' : 'var(--bg-tertiary)', 
        border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: 11, 
        fontWeight: 700, 
        color: highlight ? 'white' : 'var(--text-secondary)',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div style={{ 
        fontSize: 16, 
        flexShrink: 0,
        width: 28,
        textAlign: 'center'
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: 13, 
          marginBottom: 2, 
          color: highlight ? 'var(--accent)' : 'var(--text-primary)' 
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function TipCard({ icon, title, desc }) {
  return (
    <div className="option-row" style={{ padding: '10px 14px' }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, padding: '0 10px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function InfoBox({ type, text }) {
  const styles = {
    info:    { bg: 'var(--accent-light)', border: 'var(--accent)', icon: 'ti-info-circle', color: 'var(--accent)' },
    warning: { bg: 'rgba(239,159,39,0.1)', border: 'var(--warning)', icon: 'ti-alert-triangle', color: 'var(--warning)' },
    success: { bg: 'rgba(29,158,117,0.1)', border: 'var(--success)', icon: 'ti-check', color: 'var(--success)' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
      <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 15, flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{text}</span>
    </div>
  )
}