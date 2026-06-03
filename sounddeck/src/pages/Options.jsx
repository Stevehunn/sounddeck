import { useState, useEffect } from 'react'

export default function Options({ store, addToast }) {
  const [audioDevices, setAudioDevices] = useState([])
  const [recordingFor, setRecordingFor] = useState(null)

  // Charger les périphériques audio disponibles
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioDevices(outputs)
    }).catch(() => {})
  }, [])

  const handleShortcutRecord = (key) => {
    setRecordingFor(key)
  }

  const handleKeyDown = (e, key) => {
    e.preventDefault()
    if (e.key === 'Escape') { setRecordingFor(null); return }
    if (e.key === 'Backspace') {
      if (key === 'profile') store.updateProfileShortcut('')
      setRecordingFor(null)
      return
    }
    const parts = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    const k = e.key.toUpperCase()
    if (!['CONTROL', 'META', 'ALT', 'SHIFT'].includes(k)) {
      parts.push(k)
      const combo = parts.join('+')
      if (key === 'profile') store.updateProfileShortcut(combo)
      setRecordingFor(null)
      addToast(`Raccourci défini : ${combo}`, 'success')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Options</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Apparence */}
        <Section title="Apparence" icon="ti-palette">
          <OptionRow label="Thème">
            <div style={{ display: 'flex', gap: 6 }}>
              {[['dark', 'Sombre', 'ti-moon'], ['light', 'Clair', 'ti-sun']].map(([val, label, icon]) => (
                <button key={val} onClick={() => store.updateTheme(val)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${store.theme === val ? 'var(--accent)' : 'var(--border)'}`,
                    background: store.theme === val ? 'var(--accent-light)' : 'transparent',
                    color: store.theme === val ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}>
                  <i className={`ti ${icon}`} />{label}
                </button>
              ))}
            </div>
          </OptionRow>
        </Section>

        {/* Audio */}
        <Section title="Audio" icon="ti-volume">
          <OptionRow label="Volume global" sub={`${store.volume}%`}>
            <input type="range" min="0" max="100" value={store.volume}
              onChange={e => store.updateVolume(Number(e.target.value))}
              style={{ width: 140, accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0 }}
            />
          </OptionRow>

          <OptionRow label="Jouer en local aussi" sub="Entendre les sons sur votre propre PC">
            <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
          </OptionRow>

          <OptionRow label="Périphérique de sortie" sub="Sélectionner le câble virtuel pour Discord">
            <select value={store.audioDevice} onChange={e => store.updateAudioDevice(e.target.value)}
              style={{ width: 220 }}>
              <option value="default">Par défaut</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Périphérique ${d.deviceId.slice(0, 8)}`}</option>
              ))}
            </select>
          </OptionRow>

          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
            Pour que Discord entende vos sons, installez <strong>VB-Audio Virtual Cable</strong> (gratuit) et sélectionnez-le ici, puis dans Discord : Paramètres → Voix → Périphérique d'entrée → <em>CABLE Output</em>.
            <br />
            <a href="https://vb-audio.com/Cable/" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
              Télécharger VB-Audio →
            </a>
          </div>
        </Section>

        {/* Raccourcis globaux */}
        <Section title="Raccourcis globaux" icon="ti-keyboard">
          <OptionRow label="Changer de profil" sub="Cycle entre vos profils">
            <ShortcutKey
              value={store.profileShortcut}
              recording={recordingFor === 'profile'}
              onRecord={() => handleShortcutRecord('profile')}
              onKeyDown={e => handleKeyDown(e, 'profile')}
              onClear={() => store.updateProfileShortcut('')}
            />
          </OptionRow>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            Les raccourcis par son se configurent directement sur chaque carte de son (page Mes sons).
          </div>
        </Section>

        {/* Profils */}
        <Section title="Gestion des profils" icon="ti-users">
          {store.profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {store.sounds.filter(s => s.profiles.includes(p.id)).length} son(s)
              </span>
              {!p.isDefault && (
                <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 12 }}
                  onClick={async () => { await store.deleteProfile(p.id); addToast(`Profil supprimé`, 'info') }}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
        </Section>

      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <i className={`ti ${icon}`} />{title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
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
      width: 38, height: 22, borderRadius: 11, background: value ? 'var(--accent)' : 'var(--bg-tertiary)',
      border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, borderRadius: 8, background: 'white',
        top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </div>
  )
}

function ShortcutKey({ value, recording, onRecord, onKeyDown, onClear }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {recording ? (
        <div tabIndex={0} autoFocus onKeyDown={onKeyDown} onBlur={() => {}}
          style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--accent)', outline: 'none', minWidth: 120, textAlign: 'center' }}>
          Appuyez sur une touche...
        </div>
      ) : (
        <div onClick={onRecord} className="shortcut-badge" style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12, minWidth: 80, textAlign: 'center' }}>
          {value || 'Non défini'}
        </div>
      )}
      {value && <button className="btn-ghost" style={{ padding: '3px 6px' }} onClick={onClear}><i className="ti ti-x" /></button>}
    </div>
  )
}