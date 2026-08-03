import { useState, useEffect } from 'react'

// Valeurs par défaut basées sur le thème sombre
const DEFAULTS = {
  bgPrimary:    '#111113',
  bgSecondary:  '#1a1a1e',
  bgTertiary:   '#222228',
  bgHover:      '#2a2a32',
  border:       '#2e2e36',
  textPrimary:  '#f0f0f2',
  textSecondary:'#a0a0b0',
  textTertiary: '#606070',
  accent:       '#7C6FF7',
  accentLight:  '#2d2855',
  accentHover:  '#9B96FF',
  success:      '#1D9E75',
  warning:      '#EF9F27',
  danger:       '#E05252',
}

// Presets de palettes prédéfinies
const PRESETS = [
  {
    name: 'Violet (défaut)', colors: { ...DEFAULTS }
  },
  {
    name: 'Minuit Bleu',
    colors: {
      bgPrimary: '#0d1117', bgSecondary: '#161b22', bgTertiary: '#21262d',
      bgHover: '#30363d', border: '#30363d',
      textPrimary: '#e6edf3', textSecondary: '#8b949e', textTertiary: '#484f58',
      accent: '#2f81f7', accentLight: '#0d2340', accentHover: '#58a6ff',
      success: '#3fb950', warning: '#d29922', danger: '#f85149'
    }
  },
  {
    name: 'Forêt',
    colors: {
      bgPrimary: '#0d1210', bgSecondary: '#131a14', bgTertiary: '#1c2a1e',
      bgHover: '#243328', border: '#2a3d2d',
      textPrimary: '#e2f0e4', textSecondary: '#8aab8e', textTertiary: '#4a6350',
      accent: '#23c55e', accentLight: '#0d2e1a', accentHover: '#4ade80',
      success: '#23c55e', warning: '#eab308', danger: '#ef4444'
    }
  },
  {
    name: 'Braise',
    colors: {
      bgPrimary: '#130d0d', bgSecondary: '#1c1212', bgTertiary: '#2a1818',
      bgHover: '#331e1e', border: '#3d2424',
      textPrimary: '#f0e2e2', textSecondary: '#ab8a8a', textTertiary: '#634a4a',
      accent: '#ef4444', accentLight: '#2d0d0d', accentHover: '#f87171',
      success: '#22c55e', warning: '#eab308', danger: '#ef4444'
    }
  },
  {
    name: 'Clair Pastel',
    colors: {
      bgPrimary: '#fafafa', bgSecondary: '#f4f4f8', bgTertiary: '#e8e8f0',
      bgHover: '#e0e0ea', border: '#d8d8e4',
      textPrimary: '#111113', textSecondary: '#505060', textTertiary: '#909098',
      accent: '#7C6FF7', accentLight: '#eeedf8', accentHover: '#6B62D4',
      success: '#1D9E75', warning: '#EF9F27', danger: '#E05252'
    }
  },
]

const COLOR_FIELDS = [
  { key: 'bgPrimary',     label: 'Fond principal',     group: 'Arrière-plans' },
  { key: 'bgSecondary',   label: 'Fond secondaire',    group: 'Arrière-plans' },
  { key: 'bgTertiary',    label: 'Fond tertiaire',     group: 'Arrière-plans' },
  { key: 'bgHover',       label: 'Fond survol',        group: 'Arrière-plans' },
  { key: 'border',        label: 'Bordures',           group: 'Arrière-plans' },
  { key: 'textPrimary',   label: 'Texte principal',    group: 'Textes' },
  { key: 'textSecondary', label: 'Texte secondaire',   group: 'Textes' },
  { key: 'textTertiary',  label: 'Texte discret',      group: 'Textes' },
  { key: 'accent',        label: 'Couleur principale', group: 'Accents' },
  { key: 'accentLight',   label: 'Accent clair',       group: 'Accents' },
  { key: 'accentHover',   label: 'Accent survol',      group: 'Accents' },
  { key: 'success',       label: 'Succès (vert)',      group: 'États' },
  { key: 'warning',       label: 'Avertissement',      group: 'États' },
  { key: 'danger',        label: 'Danger (rouge)',     group: 'États' },
]

const GROUPS = ['Arrière-plans', 'Textes', 'Accents', 'États']

export default function CustomThemeEditor({ current, onSave }) {
  const [colors, setColors] = useState(current || DEFAULTS)
  const [activeGroup, setActiveGroup] = useState('Accents')
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    if (current) setColors(current)
  }, [])

  const handleChange = (key, value) => {
    const updated = { ...colors, [key]: value }
    setColors(updated)
    setChanged(true)
    // Aperçu en temps réel : on applique directement sur :root
    document.documentElement.style.setProperty(
      '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('bg-', 'bg-').replace('text-', 'text-').replace('accent-', 'accent-'),
      value
    )
  }

  const applyPreset = (preset) => {
    setColors(preset.colors)
    setChanged(true)
  }

  const handleSave = () => {
    onSave(colors)
    setChanged(false)
    // Nettoyer les styles inline
    COLOR_FIELDS.forEach(f => {
      document.documentElement.style.removeProperty(
        '--' + f.key.replace(/([A-Z])/g, '-$1').toLowerCase()
      )
    })
  }

  const handleReset = () => {
    setColors(DEFAULTS)
    setChanged(true)
  }

  const fieldsInGroup = COLOR_FIELDS.filter(f => f.group === activeGroup)

  return (
    <div style={{
      marginTop: 12, border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: 'var(--bg-primary)'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', background: 'var(--accent-light)',
        borderBottom: '1px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-palette" /> Éditeur de thème personnalisé
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" onClick={handleReset} style={{ fontSize: 12, padding: '3px 8px' }}>
            <i className="ti ti-refresh" /> Réinitialiser
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!changed}
            style={{ fontSize: 12, padding: '4px 12px', opacity: changed ? 1 : 0.5 }}>
            <i className="ti ti-check" /> Appliquer
          </button>
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Palettes prédéfinies
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(preset => (
              <button key={preset.name} onClick={() => applyPreset(preset)}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                {/* Mini aperçu de la palette */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {[preset.colors.bgPrimary, preset.colors.accent, preset.colors.textPrimary].map((c, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Onglets de groupes */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 4 }}>
          {GROUPS.map(group => (
            <button key={group} onClick={() => setActiveGroup(group)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
                background: activeGroup === group ? 'var(--bg-secondary)' : 'transparent',
                color: activeGroup === group ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: 11, cursor: 'pointer', fontWeight: activeGroup === group ? 500 : 400
              }}>
              {group}
            </button>
          ))}
        </div>

        {/* Color pickers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {fieldsInGroup.map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                  {colors[key]}
                </span>
                <label style={{ position: 'relative', cursor: 'pointer' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: colors[key],
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                  }} />
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{
                      position: 'absolute', opacity: 0, width: '100%', height: '100%',
                      top: 0, left: 0, cursor: 'pointer'
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Aperçu */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aperçu
          </div>
          <div style={{
            padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            background: colors.bgPrimary, display: 'flex', gap: 10, alignItems: 'center'
          }}>
            {/* Mini carte son */}
            <div style={{
              width: 60, background: colors.bgSecondary, border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: 8, textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>😂</div>
              <div style={{ fontSize: 9, fontWeight: 500, color: colors.textPrimary, marginBottom: 4 }}>Bruh</div>
              <div style={{
                fontSize: 8, background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                borderRadius: 3, padding: '1px 4px', color: colors.textTertiary, fontFamily: 'monospace'
              }}>F1</div>
            </div>
            {/* Mini infos */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>SoundDeck</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>Aperçu du thème</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.accent, color: 'white', fontSize: 10 }}>Primaire</div>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.success, color: 'white', fontSize: 10 }}>Succès</div>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.danger, color: 'white', fontSize: 10 }}>Danger</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}