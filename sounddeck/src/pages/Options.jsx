import { useState, useEffect } from 'react'
import ShortcutRecorder from '../components/ShortcutRecorder'
import CustomThemeEditor from '../components/CustomThemeEditor'
import { LANGUAGES, useTranslation } from '../i18n'

export default function Options({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [audioDevices, setAudioDevices] = useState([])

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioDevices(outputs)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{tr('optionsTitle')}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Apparence */}
        <Section title={tr('appearance')} icon="ti-palette">

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
                { val: 'dark',        label: tr('themeDark'),   color: '#7C6FF7' },
                { val: 'light',       label: tr('themeLight'),    color: '#534AB7' },
                { val: 'dark-blue',   label: tr('themeBlue'),     color: '#2f81f7' },
                { val: 'dark-green',  label: tr('themeGreen'),    color: '#23c55e' },
                { val: 'dark-red',    label: tr('themeRed'),      color: '#ef4444' },
                { val: 'dark-orange', label: tr('themeOrange'),   color: '#f97316' },
                { val: 'custom',      label: tr('themeCustom'),   color: '#a855f7' },
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

        {/* Audio */}
        <Section title={tr('audio')} icon="ti-volume">
          <OptionRow label={tr('globalVolume')} sub={`${store.volume}%`}>
            <input type="range" min="0" max="100" value={store.volume}
              onChange={e => store.updateVolume(Number(e.target.value))}
              style={{ width: 140, accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0 }}
            />
          </OptionRow>

          <OptionRow label={tr('playLocally')} sub={tr('playLocallyDesc')}>
            <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
          </OptionRow>

          <OptionRow label={tr('outputDevice')} sub={tr('outputDeviceDesc')}>
            <select value={store.audioDevice} onChange={e => store.updateAudioDevice(e.target.value)}
              style={{ width: 220 }}>
              <option value="default">{tr('outputDeviceDefault')}</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${tr('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
            {tr('vbaudioInfo')}
            <br />
            <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
              style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, display: 'inline-block', fontSize: 12, padding: 0 }}>
              {tr('vbaudioDownload')}
            </button>
          </div>
        </Section>

        {/* Raccourcis globaux */}
        <Section title={tr('shortcuts')} icon="ti-keyboard">
          <OptionRow label={tr('switchProfile')} sub={tr('switchProfileDesc')}>
            <ShortcutRecorder
              value={store.profileShortcut}
              onSave={async (acc) => { await store.updateProfileShortcut(acc); addToast(`${tr('toastShortcutSet')} ${acc}`, 'success') }}
              onClear={() => store.updateProfileShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('toggleLoop')} sub={tr('toggleLoopDesc')}>
            <ShortcutRecorder
              value={store.loopShortcut}
              onSave={async (acc) => { await store.updateLoopShortcut(acc); addToast(`${tr('toastShortcutLoop')} ${acc}`, 'success') }}
              onClear={() => store.updateLoopShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('stopAllShortcut')} sub={tr('stopAllDesc')}>
            <ShortcutRecorder
              value={store.stopAllShortcut}
              onSave={async (acc) => { await store.updateStopAllShortcut(acc); addToast(`${tr('toastShortcutStop')} ${acc}`, 'success') }}
              onClear={() => store.updateStopAllShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('presentationShortcut')} sub={tr('presentationDesc')}>
            <ShortcutRecorder
              value={store.presentationShortcut}
              onSave={async (acc) => { await store.updatePresentationShortcut(acc); addToast(`${tr('toastShortcutPresentation')} ${acc}`, 'success') }}
              onClear={() => store.updatePresentationShortcut('')}
              requireMod
            />
          </OptionRow>
          
          {/* NOUVEAU : Raccourci pour activer/désactiver les raccourcis globaux */}
          <OptionRow label="Toggle raccourcis" sub="Activer/désactiver tous les raccourcis globaux">
            <ShortcutRecorder
              value={store.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'}
              onSave={async (acc) => { 
                await store.updateToggleShortcutsAccelerator(acc)
                addToast(`Raccourci toggle défini : ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleShortcutsAccelerator('')
                addToast('Raccourci toggle supprimé', 'info')
              }}
              requireMod
            />
          </OptionRow>

          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {tr('shortcutsPerSoundNote')}
          </div>
        </Section>

        {/* Sauvegarde */}
        <Section title={tr('backup')} icon="ti-cloud">
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
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
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
                  if (r.success) addToast(`Archive créée · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
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
                  if (r.success) addToast(`${r.sizeMb} Mo exportés ✓`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
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
                  if (r.type === 'json') addToast(`Config importée ✓ — ${tr('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
                  else if (r.type === 'full') addToast(`Archive importée · ${r.importedSounds} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
                  else if (r.type === 'sounds-only') addToast(`${r.importedSounds} ${tr('sounds')} ${tr('imported')} ✓`, 'success')
                } else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
              }}>
              <i className="ti ti-upload" /> {tr('importLabel')}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {tr('restartNote')}
          </div>
        </Section>

        {/* Profils - CORRIGÉ avec traduction de "Tous les sons" */}
        <Section title={tr('profileManagement')} icon="ti-users">
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
                  if (r.success) addToast(`Profil "${p.name}" exporté · ${r.soundCount} ${tr('sounds')} · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
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
              if (r.success) addToast(`Profil "${r.profileName}" importé · ${r.soundCount} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
              else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
            }}>
            <i className="ti ti-package-import" /> {tr('importProfile')}
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