import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function Guide({ lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [activeStep, setActiveStep] = useState('install')
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    setRenderKey(prev => prev + 1)
    setActiveStep('install')
  }, [lang])

  // Les étapes ne contiennent plus que des identifiants, pas du texte traduit
  const steps = [
    { id: 'install', icon: '📦', titleKey: 'guideStep1Title', color: '#7C6FF7', contentKey: 'step1' },
    { id: 'voicemeeter', icon: '🎚️', titleKey: 'guideStep2Title', color: '#2f81f7', contentKey: 'step2' },
    { id: 'sounddeck', icon: '🎛️', titleKey: 'guideStep3Title', color: '#23c55e', contentKey: 'step3' },
    { id: 'discord', icon: '💬', titleKey: 'guideStep4Title', color: '#5865F2', contentKey: 'step4' },
    { id: 'tips', icon: '💡', titleKey: 'guideStep5Title', color: '#EF9F27', contentKey: 'step5' },
  ]

  const active = steps.find(s => s.id === activeStep)

  // Rendu du contenu selon l'étape active
  const renderContent = () => {
    switch (activeStep) {
      case 'install':
        return (
          <div>
            <p style={{ marginBottom: 12 }}>{tr('guideToolsRequired')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DownloadCard
                icon="🔌"
                name="VB-Audio Virtual Cable"
                desc={tr('guideVBCableDesc')}
                url="https://vb-audio.com/Cable/"
                instructions={tr('guideVBCableInstructions')}
                lang={lang}
              />
              <DownloadCard
                icon="🎚️"
                name="VoiceMeeter Banana"
                desc={tr('guideVoiceMeeterDesc')}
                url="https://vb-audio.com/Voicemeeter/banana.htm"
                instructions={tr('guideVoiceMeeterInstructions')}
                lang={lang}
              />
            </div>
            <InfoBox type="warning" text={tr('guideRestartWarning')} lang={lang} />
          </div>
        )
      case 'voicemeeter':
        return (
          <div>
            <p style={{ marginBottom: 14 }}>{tr('guideStep2Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <ConfigStep
                number="1"
                title={tr('guideStep2Input1')}
                desc={tr('guideStep2Input1Desc')}
                icon="🎙️"
                lang={lang}
              />
              <ConfigStep
                number="2"
                title={tr('guideStep2Input2')}
                desc={tr('guideStep2Input2Desc')}
                icon="🔌"
                lang={lang}
              />
              <ConfigStep
                number="3"
                title={tr('guideStep2B1')}
                desc={tr('guideStep2B1Desc')}
                icon="🔘"
                lang={lang}
              />
              <ConfigStep
                number="4"
                title={tr('guideStep2A1')}
                desc={tr('guideStep2A1Desc')}
                icon="🎧"
                lang={lang}
              />
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
              <div style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontSize: 11, fontFamily: 'inherit' }}>{tr('guideAudioFlow')}</div>
              <div style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: '#2f81f7' }}>{tr('guideYourMic')}</span> ──────────────────────────┐<br/>
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
            <p style={{ marginBottom: 14 }}>{tr('guideStep3Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ConfigStep
                number="1"
                title={tr('guideStep3Output')}
                desc={tr('guideStep3OutputDesc')}
                icon="🔌"
                highlight
                lang={lang}
              />
              <ConfigStep
                number="2"
                title={tr('guideStep3Local')}
                desc={tr('guideStep3LocalDesc')}
                icon="🎧"
                lang={lang}
              />
            </div>
            <InfoBox type="info" text={tr('guideStep3Info')} lang={lang} />
          </div>
        )
      case 'discord':
        return (
          <div>
            <p style={{ marginBottom: 14 }}>{tr('guideStep4Desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <ConfigStep
                number="1"
                title={tr('guideStep4Input')}
                desc={tr('guideStep4InputDesc')}
                icon="🎙️"
                highlight
                lang={lang}
              />
              <ConfigStep
                number="2"
                title={tr('guideStep4Output')}
                desc={tr('guideStep4OutputDesc')}
                icon="🎧"
                lang={lang}
              />
              <ConfigStep
                number="3"
                title={tr('guideStep4Noise')}
                desc={tr('guideStep4NoiseDesc')}
                icon="🔇"
                lang={lang}
              />
            </div>
            <InfoBox type="success" text={tr('guideStep4Success')} lang={lang} />
          </div>
        )
      case 'tips':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TipCard icon="🚀" title={tr('guideTipStartup')} desc={tr('guideTipStartupDesc')} lang={lang} />
            <TipCard icon="🔊" title={tr('guideTipVolume')} desc={tr('guideTipVolumeDesc')} lang={lang} />
            <TipCard icon="🔁" title={tr('guideTipEcho')} desc={tr('guideTipEchoDesc')} lang={lang} />
            <TipCard icon="❌" title={tr('guideTipDiscord')} desc={tr('guideTipDiscordDesc')} lang={lang} />
            <TipCard icon="🔌" title={tr('guideTipCable')} desc={tr('guideTipCableDesc')} lang={lang} />
            <TipCard icon="🎚️" title={tr('guideTipNoSound')} desc={tr('guideTipNoSoundDesc')} lang={lang} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div key={renderKey} style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-book" style={{ color: 'var(--accent)' }} />
            {tr('guideTitle')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{tr('guideSub')}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {steps.map((step) => (
            <button key={step.id} onClick={() => setActiveStep(step.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: activeStep === step.id ? 'var(--accent-light)' : 'transparent', border: 'none', borderLeft: `3px solid ${activeStep === step.id ? step.color : 'transparent'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}
              onMouseEnter={e => { if (activeStep !== step.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeStep !== step.id) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: activeStep === step.id ? step.color : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.1s' }}>
                {activeStep === step.id ? <i className="ti ti-check" style={{ color: 'white', fontSize: 13 }} /> : step.icon}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: activeStep === step.id ? step.color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tr(step.titleKey)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tr(step.titleKey).split('—')[1]?.trim()}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{tr('quickRecap')}</div>
          <div>{tr('guideRecap1')}</div>
          <div>{tr('guideRecap2')}</div>
          <div>{tr('guideRecap3')}</div>
          <div>{tr('guideRecap4')}</div>
          <div>{tr('guideRecap5')}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: active?.color + '22', border: `2px solid ${active?.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {active?.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{active ? tr(active.titleKey) : ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {tr('guideStepOf')} {steps.findIndex(s => s.id === activeStep) + 1} / {steps.length}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn-secondary" style={{ fontSize: 12 }}
              disabled={activeStep === steps[0].id}
              onClick={() => { const idx = steps.findIndex(s => s.id === activeStep); if (idx > 0) setActiveStep(steps[idx - 1].id) }}>
              <i className="ti ti-arrow-left" /> {tr('guidePrev')}
            </button>
            <button className="btn-primary" style={{ fontSize: 12 }}
              disabled={activeStep === steps[steps.length - 1].id}
              onClick={() => { const idx = steps.findIndex(s => s.id === activeStep); if (idx < steps.length - 1) setActiveStep(steps[idx + 1].id) }}>
              {tr('guideNext')} <i className="ti ti-arrow-right" />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <div className="fade-in" key={activeStep + lang + renderKey}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

function DownloadCard({ icon, name, desc, url, instructions, lang }) {
  const tr = useTranslation(lang || 'fr')
  const handleOpen = () => {
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
  }
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4 }} />{instructions}
        </div>
        <button onClick={handleOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 6, background: 'transparent', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <i className="ti ti-download" /> {tr('download')}
        </button>
      </div>
    </div>
  )
}

function ConfigStep({ number, title, desc, icon, highlight, lang }) {
  const tr = useTranslation(lang || 'fr')
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: highlight ? 'var(--accent-light)' : 'var(--bg-secondary)', border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: highlight ? 'var(--accent)' : 'var(--bg-tertiary)', border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: highlight ? 'white' : 'var(--text-secondary)' }}>
        {number}
      </div>
      <div style={{ fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function TipCard({ icon, title, desc, lang }) {
  const tr = useTranslation(lang || 'fr')
  return (
    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', gap: 10 }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function InfoBox({ type, text, lang }) {
  const tr = useTranslation(lang || 'fr')
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