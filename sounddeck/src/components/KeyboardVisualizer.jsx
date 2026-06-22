import { useTranslation } from '../i18n'

// Mapping position physique (QWERTY) → AZERTY pour l'affichage
const PHYSICAL_TO_AZERTY = {
  '1': '&', '2': 'é', '3': '"', '4': "'", '5': '(', '6': '-', '7': 'è', '8': '_', '9': 'ç', '0': 'à', '-': ')', '=': '=',
  'Q': 'A', 'W': 'Z', 'E': 'E', 'R': 'R', 'T': 'T', 'Y': 'Y', 'U': 'U', 'I': 'I', 'O': 'O', 'P': 'P',
  'A': 'Q', 'S': 'S', 'D': 'D', 'F': 'F', 'G': 'G', 'H': 'H', 'J': 'J', 'K': 'K', 'L': 'L',
  'Z': 'W', 'X': 'X', 'C': 'C', 'V': 'V', 'B': 'B', 'N': 'N', 'M': 'M'
}

export default function KeyboardVisualizer({ shortcuts, layout = 'qwerty', lang = 'fr' }) {
  const tr = useTranslation(lang)
  
  // Définition des touches par ligne (affichage)
  const rows = {
    'qwerty': [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
    ],
    'azerty': [
      ['²', '&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '='],
      ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '^', '$', 'ù'],
      ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'ù', '*'],
      ['W', 'X', 'C', 'V', 'B', 'N', ',', ';', ':', '!']
    ]
  }

  // Touches du pavé numérique (toujours les mêmes)
  const numpadKeys = ['NumLock', '/', '*', '-', '7', '8', '9', '+', '4', '5', '6', '1', '2', '3', '0', '.']

  const keyboardRows = rows[layout] || rows['qwerty']

  // Fonction pour obtenir la position physique (QWERTY) à partir d'une touche affichée
  function getPhysicalKey(displayKey, layout) {
    if (layout === 'azerty') {
      // Si c'est une touche spéciale AZERTY, trouver sa position physique
      for (const [physical, azerty] of Object.entries(PHYSICAL_TO_AZERTY)) {
        if (azerty === displayKey) {
          return physical
        }
      }
      // Si c'est une lettre qui est la même en AZERTY et QWERTY (E, R, T, etc.)
      if (displayKey.length === 1 && displayKey.match(/[A-Z]/)) {
        return displayKey
      }
      // Si c'est une lettre minuscule
      if (displayKey.length === 1 && displayKey.match(/[a-z]/)) {
        return displayKey.toUpperCase()
      }
    }
    // En QWERTY, la touche affichée est la position physique
    if (displayKey.length === 1 && displayKey.match(/[a-z]/)) {
      return displayKey.toUpperCase()
    }
    return displayKey
  }

  // Fonction pour vérifier si une touche est utilisée par un raccourci
  const isKeyUsed = (displayKey) => {
    // Obtenir la position physique de la touche
    const physicalKey = getPhysicalKey(displayKey, layout)
    
    return Object.values(shortcuts).some(shortcut => {
      if (!shortcut) return false
      const parts = shortcut.split('+')
      
      return parts.some(part => {
        // Pour les touches du pavé numérique
        if (displayKey === '0' && part === 'Num0') return true
        if (displayKey === '1' && part === 'Num1') return true
        if (displayKey === '2' && part === 'Num2') return true
        if (displayKey === '3' && part === 'Num3') return true
        if (displayKey === '4' && part === 'Num4') return true
        if (displayKey === '5' && part === 'Num5') return true
        if (displayKey === '6' && part === 'Num6') return true
        if (displayKey === '7' && part === 'Num7') return true
        if (displayKey === '8' && part === 'Num8') return true
        if (displayKey === '9' && part === 'Num9') return true
        if (displayKey === '.' && part === 'NumDecimal') return true
        if (displayKey === '+' && part === 'NumAdd') return true
        if (displayKey === '-' && part === 'NumSubtract') return true
        if (displayKey === '*' && part === 'NumMultiply') return true
        if (displayKey === '/' && part === 'NumDivide') return true
        if (displayKey === 'Enter' && part === 'NumEnter') return true
        
        // Pour les touches normales, comparer avec la position physique stockée
        return part === physicalKey || part === physicalKey.toUpperCase()
      })
    })
  }

  // Compter les raccourcis utilisés
  const usedShortcutsCount = Object.values(shortcuts).filter(s => s).length

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
        gap: 8
      }}>
        <i className="ti ti-keyboard" /> 
        {tr('keyboardVisualizerTitle')}
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
          ({usedShortcutsCount} {usedShortcutsCount !== 1 ? tr('keyboardVisualizerUsedPlural') : tr('keyboardVisualizerUsed')})
        </span>
        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
          {layout === 'azerty' ? 'AZERTY' : 'QWERTY'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: rowIndex * 20 }} />
            {row.map((key) => {
              const used = isKeyUsed(key)
              return (
                <div
                  key={key}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    border: `1px solid ${used ? 'var(--accent)' : 'var(--border)'}`,
                    background: used ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: used ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: used ? 600 : 400,
                    transition: 'all 0.15s',
                    position: 'relative',
                    cursor: 'default'
                  }}
                  title={used ? `Raccourci utilisé` : ''}
                >
                  <span>{key}</span>
                  {used && (
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
        
        {/* Pavé numérique */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          <div style={{ width: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 36px)', gap: 4 }}>
            {numpadKeys.map((key) => {
              const used = isKeyUsed(key)
              return (
                <div
                  key={key}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    border: `1px solid ${used ? 'var(--accent)' : 'var(--border)'}`,
                    background: used ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: used ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: used ? 600 : 400,
                    transition: 'all 0.15s',
                    position: 'relative',
                    cursor: 'default'
                  }}
                  title={used ? `Raccourci utilisé` : ''}
                >
                  <span>{key}</span>
                  {used && (
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

        {/* Modificateurs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
          {['Ctrl', 'Alt', layout === 'azerty' ? 'Maj' : 'Shift'].map(mod => {
            const used = Object.values(shortcuts).some(s => s && s.includes(
              mod === 'Ctrl' ? 'CommandOrControl' : 
              mod === 'Alt' ? 'Alt' : 
              'Shift'
            ))
            return (
              <div
                key={mod}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: `1px solid ${used ? 'var(--accent)' : 'var(--border)'}`,
                  background: used ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  color: used ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: used ? 600 : 400,
                  transition: 'all 0.15s'
                }}
              >
                {mod}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ 
        marginTop: 12, 
        fontSize: 11, 
        color: 'var(--text-tertiary)',
        display: 'flex',
        gap: 16,
        justifyContent: 'center'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-light)', border: '1px solid var(--accent)' }} />
          {tr('keyboardVisualizerKeyUsed')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
          {tr('keyboardVisualizerKeyAvailable')}
        </span>
      </div>
    </div>
  )
}