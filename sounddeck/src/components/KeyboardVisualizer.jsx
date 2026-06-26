import { useState } from 'react'
import { useTranslation } from '../i18n'

const SYMBOL_TO_BASE_KEY = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
  '~': '`'
}

const BASE_TO_SYMBOL = Object.fromEntries(
  Object.entries(SYMBOL_TO_BASE_KEY).map(([symbol, base]) => [base, symbol])
)

const QWERTY_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
]

const NUMPAD_KEYS = ['NumLock', '/', '*', '-', '7', '8', '9', '+', '4', '5', '6', '1', '2', '3', '0', '.']

export default function KeyboardVisualizer({ shortcuts, layout = 'qwerty', lang = 'fr' }) {
  const tr = useTranslation(lang)
  
  const [filters, setFilters] = useState({
    ctrl: false,
    alt: false,
    shift: false
  })

  const hasActiveFilters = Object.values(filters).some(active => active)

  const getActiveMods = () => {
    const mods = []
    if (filters.ctrl) mods.push('CommandOrControl')
    if (filters.alt) mods.push('Alt')
    if (filters.shift) mods.push('Shift')
    return mods
  }

  const hasModifiers = (shortcut) => {
    if (!shortcut) return false
    const mods = ['CommandOrControl', 'Alt', 'Shift']
    return mods.some(mod => shortcut.includes(mod))
  }

  const matchesFiltersExact = (shortcut) => {
    if (!shortcut) return false
    
    const activeMods = getActiveMods()
    
    if (activeMods.length === 0) {
      return !hasModifiers(shortcut)
    }
    
    const parts = shortcut.split('+')
    
    const hasAllActive = activeMods.every(mod => parts.includes(mod))
    if (!hasAllActive) return false
    
    const allMods = ['CommandOrControl', 'Alt', 'Shift']
    const hasNoExtra = allMods.every(mod => {
      if (activeMods.includes(mod)) return true
      return !parts.includes(mod)
    })
    
    return hasNoExtra
  }

  const isKeyActive = (displayKey) => {
    return Object.values(shortcuts).some(shortcut => {
      if (!shortcut) return false
      if (!matchesFiltersExact(shortcut)) return false
      
      const parts = shortcut.split('+')
      const lastPart = parts[parts.length - 1]
      
      if (lastPart === displayKey) return true
      if (lastPart === displayKey.toUpperCase()) return true
      
      if (BASE_TO_SYMBOL[displayKey] === lastPart) return true
      
      if (SYMBOL_TO_BASE_KEY[displayKey] === lastPart) return true
      
      if (filters.shift && BASE_TO_SYMBOL[displayKey]) {
        const symbol = BASE_TO_SYMBOL[displayKey]
        if (lastPart === symbol) return true
      }
      
      return false
    })
  }

  const getDisplayLabel = (key) => {
    if (filters.shift && BASE_TO_SYMBOL[key]) {
      const symbol = BASE_TO_SYMBOL[key]
      const isUsed = Object.values(shortcuts).some(s => s && s.includes(symbol))
      if (isUsed) {
        return { main: symbol, sub: key }
      }
    }
    return { main: key, sub: null }
  }

  const getModifierCount = (mod) => {
    const searchTerms = {
      ctrl: ['CommandOrControl', 'Control'],
      alt: ['Alt'],
      shift: ['Shift']
    }
    const terms = searchTerms[mod] || []
    return Object.values(shortcuts).filter(s => s && terms.some(t => s.includes(t))).length
  }

  const toggleFilter = (mod) => {
    setFilters(prev => ({
      ...prev,
      [mod]: !prev[mod]
    }))
  }

  const isFilterActive = (mod) => filters[mod]
  
  const totalShortcuts = Object.values(shortcuts).filter(s => s).length
  
  const activeShortcuts = Object.values(shortcuts).filter(s => s && matchesFiltersExact(s)).length

  const modLabels = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: layout === 'azerty' ? 'Maj' : 'Shift'
  }

  const getFilterStatus = () => {
    const active = Object.entries(filters).filter(([_, active]) => active).map(([mod]) => modLabels[mod])
    if (active.length === 0) return 'Aucun filtre (touches seules)'
    return active.join(' + ')
  }

  const soloShortcuts = Object.values(shortcuts).filter(s => s && !hasModifiers(s))
  const hasSoloShortcuts = soloShortcuts.length > 0

  return (
    <div style={{ 
      marginBottom: 12,
      padding: '16px', 
      background: 'var(--bg-tertiary)', 
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)'
    }}>
      <div style={{ 
        fontSize: 12, 
        fontWeight: 600, 
        color: 'var(--text-secondary)', 
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }}>
        <i className="ti ti-keyboard" /> 
        {tr('keyboardVisualizerTitle')}
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
          {hasActiveFilters ? (
            `${activeShortcuts} / ${totalShortcuts} avec ${getFilterStatus()}`
          ) : (
            `${soloShortcuts.length} touche(s) seule(s) / ${totalShortcuts} raccourcis`
          )}
        </span>
        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
          QWERTY
        </span>
        {hasActiveFilters && (
          <span style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 10 }}>
            <i className="ti ti-filter" /> {getFilterStatus()}
          </span>
        )}
        {!hasActiveFilters && !hasSoloShortcuts && (
          <span style={{ fontSize: 9, color: 'var(--warning)', background: 'rgba(239,159,39,0.1)', padding: '2px 8px', borderRadius: 10 }}>
            ⚠️ Aucune touche seule
          </span>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 12, 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {['ctrl', 'alt', 'shift'].map(mod => {
          const active = isFilterActive(mod)
          const count = getModifierCount(mod)
          return (
            <button
              key={mod}
              onClick={() => toggleFilter(mod)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'inherit'
              }}
            >
              <span style={{ 
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: active ? 'var(--accent)' : 'var(--text-tertiary)',
                opacity: active ? 1 : 0.3
              }} />
              {modLabels[mod]}
              {count > 0 && (
                <span style={{ 
                  fontSize: 9, 
                  background: active ? 'var(--accent)' : 'var(--border)',
                  color: active ? 'white' : 'var(--text-tertiary)',
                  padding: '0 6px',
                  borderRadius: 10,
                  fontWeight: 700
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
        
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ ctrl: false, alt: false, shift: false })}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit'
            }}
          >
            <i className="ti ti-x" /> Réinitialiser
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {QWERTY_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: rowIndex * 20 }} />
            {row.map((key) => {
              const active = isKeyActive(key)
              const display = getDisplayLabel(key)
              return (
                <div
                  key={key}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                    position: 'relative',
                    cursor: 'default',
                    lineHeight: 1.1
                  }}
                  title={active ? `Raccourci utilisé avec ${getFilterStatus()}` : ''}
                >
                  {display.sub && (
                    <span style={{ fontSize: 7, opacity: 0.4 }}>{display.sub}</span>
                  )}
                  <span>{display.main}</span>
                  {active && (
                    <div style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '2px solid var(--bg-tertiary)'
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          <div style={{ width: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 36px)', gap: 4 }}>
            {NUMPAD_KEYS.map((key) => {
              const active = isKeyActive(key)
              return (
                <div
                  key={key}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                    position: 'relative',
                    cursor: 'default'
                  }}
                >
                  <span>{key}</span>
                  {active && (
                    <div style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '2px solid var(--bg-tertiary)'
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: 12, 
        fontSize: 11, 
        color: 'var(--text-tertiary)',
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-light)', border: '1px solid var(--accent)' }} />
          Touche active
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
          Touche inactive
        </span>
        {hasActiveFilters && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
            <i className="ti ti-filter" style={{ fontSize: 12 }} />
            {getFilterStatus()}
          </span>
        )}
        {!hasActiveFilters && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 12 }} />
            Touches sans modificateur
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
          <span style={{ fontSize: 10 }}>⌨️</span>
          QWERTY
        </span>
      </div>
    </div>
  )
}