// src/shared/components/ui/CustomThemeEditor.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

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

const PRESETS = [
  { nameKey: 'themePresetDefault', colors: { ...DEFAULTS } },
  {
    nameKey: 'themePresetMidnightBlue',
    colors: {
      bgPrimary: '#0d1117', bgSecondary: '#161b22', bgTertiary: '#21262d',
      bgHover: '#30363d', border: '#30363d',
      textPrimary: '#e6edf3', textSecondary: '#8b949e', textTertiary: '#484f58',
      accent: '#2f81f7', accentLight: '#0d2340', accentHover: '#58a6ff',
      success: '#3fb950', warning: '#d29922', danger: '#f85149'
    }
  },
  {
    nameKey: 'themePresetForest',
    colors: {
      bgPrimary: '#0d1210', bgSecondary: '#131a14', bgTertiary: '#1c2a1e',
      bgHover: '#243328', border: '#2a3d2d',
      textPrimary: '#e2f0e4', textSecondary: '#8aab8e', textTertiary: '#4a6350',
      accent: '#23c55e', accentLight: '#0d2e1a', accentHover: '#4ade80',
      success: '#23c55e', warning: '#eab308', danger: '#ef4444'
    }
  },
  {
    nameKey: 'themePresetEmber',
    colors: {
      bgPrimary: '#130d0d', bgSecondary: '#1c1212', bgTertiary: '#2a1818',
      bgHover: '#331e1e', border: '#3d2424',
      textPrimary: '#f0e2e2', textSecondary: '#ab8a8a', textTertiary: '#634a4a',
      accent: '#ef4444', accentLight: '#2d0d0d', accentHover: '#f87171',
      success: '#22c55e', warning: '#eab308', danger: '#ef4444'
    }
  },
  {
    nameKey: 'themePresetPastelLight',
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
  { key: 'bgPrimary',     labelKey: 'themeFieldBgPrimary',     group: 'bg' },
  { key: 'bgSecondary',   labelKey: 'themeFieldBgSecondary',   group: 'bg' },
  { key: 'bgTertiary',    labelKey: 'themeFieldBgTertiary',    group: 'bg' },
  { key: 'bgHover',       labelKey: 'themeFieldBgHover',       group: 'bg' },
  { key: 'border',        labelKey: 'themeFieldBorder',        group: 'bg' },
  { key: 'textPrimary',   labelKey: 'themeFieldTextPrimary',   group: 'text' },
  { key: 'textSecondary', labelKey: 'themeFieldTextSecondary', group: 'text' },
  { key: 'textTertiary',  labelKey: 'themeFieldTextTertiary',  group: 'text' },
  { key: 'accent',        labelKey: 'themeFieldAccent',        group: 'accent' },
  { key: 'accentLight',   labelKey: 'themeFieldAccentLight',   group: 'accent' },
  { key: 'accentHover',   labelKey: 'themeFieldAccentHover',   group: 'accent' },
  { key: 'success',       labelKey: 'themeFieldSuccess',       group: 'state' },
  { key: 'warning',       labelKey: 'themeFieldWarning',       group: 'state' },
  { key: 'danger',        labelKey: 'themeFieldDanger',        group: 'state' },
]

const GROUPS = [
  { id: 'bg',     labelKey: 'themeGroupBg' },
  { id: 'text',   labelKey: 'themeGroupText' },
  { id: 'accent', labelKey: 'themeGroupAccent' },
  { id: 'state',  labelKey: 'themeGroupState' },
]

const keyToCssVar = (key) => {
  return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
}

const cleanupInlineStyles = () => {
  COLOR_FIELDS.forEach(f => {
    document.documentElement.style.removeProperty(keyToCssVar(f.key))
  })
}

export default function CustomThemeEditor({ current, onSave }) {
  const { t } = useLanguage()
  const [colors, setColors] = useState(current || DEFAULTS)
  const [activeGroup, setActiveGroup] = useState('accent')
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    if (current) setColors(current)
  }, [])

  useEffect(() => {
    return () => {
      cleanupInlineStyles()
    }
  }, [])

  const handleChange = (key, value) => {
    const updated = { ...colors, [key]: value }
    setColors(updated)
    setChanged(true)
    document.documentElement.style.setProperty(keyToCssVar(key), value)
  }

  const applyPreset = (preset) => {
    setColors(preset.colors)
    setChanged(true)
  }

  const handleSave = () => {
    onSave(colors, { activate: true })
    setChanged(false)
    cleanupInlineStyles()
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
      <div style={{
        padding: '10px 14px', background: 'var(--accent-light)',
        borderBottom: '1px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-palette" /> {t('themeEditorTitle')}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" onClick={handleReset} style={{ fontSize: 12, padding: '3px 8px' }}>
            <i className="ti ti-refresh" /> {t('themeEditorReset')}
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!changed}
            style={{ fontSize: 12, padding: '4px 12px', opacity: changed ? 1 : 0.5 }}>
            <i className="ti ti-check" /> {t('themeEditorApply')}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('themeEditorPresets')}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(preset => (
              <button key={preset.nameKey} onClick={() => applyPreset(preset)}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[preset.colors.bgPrimary, preset.colors.accent, preset.colors.textPrimary].map((c, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                {t(preset.nameKey)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 4 }}>
          {GROUPS.map(group => (
            <button key={group.id} onClick={() => setActiveGroup(group.id)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
                background: activeGroup === group.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeGroup === group.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: 11, cursor: 'pointer', fontWeight: activeGroup === group.id ? 500 : 400
              }}>
              {t(group.labelKey)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {fieldsInGroup.map(({ key, labelKey }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t(labelKey)}</span>
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

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('themeEditorPreview')}
          </div>
          <div style={{
            padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            background: colors.bgPrimary, display: 'flex', gap: 10, alignItems: 'center'
          }}>
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
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>SoundDeck</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>{t('themeEditorPreviewSub')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.accent, color: 'white', fontSize: 10 }}>{t('themeEditorPrimary')}</div>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.success, color: 'white', fontSize: 10 }}>{t('themeEditorSuccess')}</div>
                <div style={{ padding: '3px 8px', borderRadius: 4, background: colors.danger, color: 'white', fontSize: 10 }}>{t('themeEditorDanger')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}