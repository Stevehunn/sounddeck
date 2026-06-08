import { useState, useEffect } from 'react'
import ShortcutRecorder from '../components/ShortcutRecorder'
import CustomThemeEditor from '../components/CustomThemeEditor'

export default function Options({ store, addToast }) {
  const [audioDevices, setAudioDevices] = useState([])

  // Charger les périphériques audio disponibles
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioDevices(outputs)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Options</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Apparence */}
        <Section title="Apparence" icon="ti-palette">
          <OptionRow label="Thème">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { val: 'dark',         label: 'Sombre',    color: '#7C6FF7' },
                { val: 'light',        label: 'Clair',     color: '#534AB7' },
                { val: 'dark-blue',    label: 'Bleu',      color: '#2f81f7' },
                { val: 'dark-green',   label: 'Vert',      color: '#23c55e' },
                { val: 'dark-red',     label: 'Rouge',     color: '#ef4444' },
                { val: 'dark-orange',  label: 'Orange',    color: '#f97316' },
                { val: 'custom', label: 'Personnalisé', color: '#a855f7' },
              ].map(({ val, label, color }) => (
                <button key={val} onClick={() => store.updateTheme(val)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${store.theme === val ? color : 'var(--border)'}`,
                    background: store.theme === val ? `${color}22` : 'var(--bg-tertiary)',
                    color: store.theme === val ? color : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: store.theme === val ? 600 : 400
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
                addToast('Thème personnalisé appliqué !', 'success')
              }}
            />
          )}
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
            <ShortcutRecorder
              value={store.profileShortcut}
              onSave={async (acc) => { await store.updateProfileShortcut(acc); addToast(`Raccourci défini : ${acc}`, 'success') }}
              onClear={() => store.updateProfileShortcut('')}
            />
          </OptionRow>
          <OptionRow label="Activer/désactiver le Loop" sub="Active le mode répétition pour tous les sons">
            <ShortcutRecorder
              value={store.loopShortcut}
              onSave={async (acc) => { await store.updateLoopShortcut(acc); addToast(`Raccourci loop : ${acc}`, 'success') }}
              onClear={() => store.updateLoopShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label="Stop tous les sons" sub="Coupe immédiatement tous les sons en cours">
            <ShortcutRecorder
              value={store.stopAllShortcut}
              onSave={async (acc) => { await store.updateStopAllShortcut(acc); addToast(`Raccourci stop : ${acc}`, 'success') }}
              onClear={() => store.updateStopAllShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label="Mode présentation" sub="Ouvre/ferme le mode présentation plein écran">
            <ShortcutRecorder
              value={store.presentationShortcut}
              onSave={async (acc) => { await store.updatePresentationShortcut(acc); addToast(`Raccourci présentation : ${acc}`, 'success') }}
              onClear={() => store.updatePresentationShortcut('')}
              requireMod
            />
          </OptionRow>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            Les raccourcis par son se configurent directement sur chaque carte de son (page Mes sons).
          </div>
        </Section>

        {/* Sauvegarde */}
        <Section title="Sauvegarde & restauration" icon="ti-cloud">

          {/* Export */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Exporter
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>

            {/* Config seule */}
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Config seule</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Profils, raccourcis, thème · Fichier JSON léger</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  const r = await window.electronAPI.exportConfig()
                  if (r.success) addToast('Configuration exportée ✓', 'success')
                  else if (r.error) addToast('Erreur : ' + r.error, 'error')
                }}>
                <i className="ti ti-download" /> Exporter
              </button>
            </div>

            {/* Archive complète */}
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Archive complète</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Config + tous les sons · Fichier ZIP (peut être lourd)</div>
              </div>
              <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast("Création de l'archive en cours...", 'info')
                  const r = await window.electronAPI.exportFull()
                  if (r.success) addToast(`Archive créée · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast('Erreur : ' + r.error, 'error')
                }}>
                <i className="ti ti-package" /> Exporter
              </button>
            </div>

            {/* Sons uniquement */}
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Sons uniquement</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Tous les fichiers audio · ZIP sans config</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast('Compression des sons en cours...', 'info')
                  const r = await window.electronAPI.exportSoundsOnly()
                  if (r.success) addToast(`${r.sizeMb} Mo exportés ✓`, 'success')
                  else if (r.error) addToast('Erreur : ' + r.error, 'error')
                }}>
                <i className="ti ti-music" /> Exporter
              </button>
            </div>
          </div>

          {/* Import */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Importer
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20 }}>📥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Importer une sauvegarde</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>JSON ou ZIP — détection automatique du format</div>
            </div>
            <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
              onClick={async () => {
                const r = await window.electronAPI.importBackup()
                if (r.success) {
                  if (r.type === 'json') {
                    const msg = r.missing > 0
                      ? `Config importée · ${r.missing} son(s) manquant(s) — redémarre l'app`
                      : `Config importée ✓ — redémarre l'app`
                    addToast(msg, r.missing > 0 ? 'info' : 'success')
                  } else if (r.type === 'full') {
                    addToast(`Archive importée · ${r.importedSounds} son(s) restauré(s) ✓ — redémarre l'app`, 'success')
                  } else if (r.type === 'sounds-only') {
                    addToast(`${r.importedSounds} son(s) importé(s) dans "Tous les sons" ✓`, 'success')
                  }
                } else if (r.error) {
                  addToast('Erreur : ' + r.error, 'error')
                }
              }}>
              <i className="ti ti-upload" /> Importer
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            Un redémarrage de l'app est nécessaire après l'import d'une config ou d'une archive complète.
          </div>
        </Section>

        {/* Profils */}
        <Section title="Gestion des profils" icon="ti-users">
          {store.profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', marginBottom: 6 }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {store.sounds.filter(s => s.profiles.includes(p.id)).length} son(s)
              </span>
              {/* Export profil */}
              <button
                style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                title={`Exporter le profil "${p.name}"`}
                onClick={async () => {
                  addToast(`Création de l'archive du profil...`, 'info')
                  const r = await window.electronAPI.exportProfile(p.id)
                  if (r.success) addToast(`Profil "${p.name}" exporté · ${r.soundCount} sons · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast('Erreur : ' + r.error, 'error')
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <i className="ti ti-package-export" /> Exporter
              </button>
              {!p.isDefault && (
                <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 12 }}
                  onClick={async () => { await store.deleteProfile(p.id); addToast(`Profil supprimé`, 'info') }}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
          {/* Import profil */}
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12 }}
            onClick={async () => {
              const r = await window.electronAPI.importProfile()
              if (r.success) addToast(`Profil "${r.profileName}" importé · ${r.soundCount} sons ✓ — redémarre l'app`, 'success')
              else if (r.error) addToast('Erreur : ' + r.error, 'error')
            }}>
            <i className="ti ti-package-import" /> Importer un profil partagé
          </button>
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