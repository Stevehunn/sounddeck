import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../i18n'

// Mapping des touches par position physique (QWERTY → AZERTY)
// Clé = position physique (QWERTY), Valeur = affichage AZERTY
const PHYSICAL_TO_AZERTY = {
  '1': '&', '2': 'é', '3': '"', '4': "'", '5': '(', '6': '-', '7': 'è', '8': '_', '9': 'ç', '0': 'à', '-': ')', '=': '=',
  'Q': 'A', 'W': 'Z', 'E': 'E', 'R': 'R', 'T': 'T', 'Y': 'Y', 'U': 'U', 'I': 'I', 'O': 'O', 'P': 'P',
  'A': 'Q', 'S': 'S', 'D': 'D', 'F': 'F', 'G': 'G', 'H': 'H', 'J': 'J', 'K': 'K', 'L': 'L',
  'Z': 'W', 'X': 'X', 'C': 'C', 'V': 'V', 'B': 'B', 'N': 'N', 'M': 'M'
}

// Mapping AZERTY → position physique (QWERTY)
const AZERTY_TO_PHYSICAL = {
  '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0', ')': '-', '=': '=',
  'a': 'Q', 'z': 'W', 'e': 'E', 'r': 'R', 't': 'T', 'y': 'Y', 'u': 'U', 'i': 'I', 'o': 'O', 'p': 'P',
  'q': 'A', 's': 'S', 'd': 'D', 'f': 'F', 'g': 'G', 'h': 'H', 'j': 'J', 'k': 'K', 'l': 'L',
  'w': 'Z', 'x': 'X', 'c': 'C', 'v': 'V', 'b': 'B', 'n': 'N', 'm': 'M',
  'A': 'Q', 'Z': 'W', 'Q': 'A', 'W': 'Z'
}

// Mapping des touches du pavé numérique
const NUMPAD_KEYS = {
  '0': 'Num0', '1': 'Num1', '2': 'Num2', '3': 'Num3', '4': 'Num4',
  '5': 'Num5', '6': 'Num6', '7': 'Num7', '8': 'Num8', '9': 'Num9',
  '.': 'NumDecimal', 'Enter': 'NumEnter', '+': 'NumAdd', '-': 'NumSubtract',
  '*': 'NumMultiply', '/': 'NumDivide'
}

function eventToAccelerator(e, requireMod = false, layout = 'qwerty') {
  const ignored = ['Control', 'Meta', 'Alt', 'Shift', 'Tab', 'CapsLock', 'Escape']
  if (ignored.includes(e.key)) return null

  const specialKeys = {
    'F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6',
    'F7':'F7','F8':'F8','F9':'F9','F10':'F10','F11':'F11','F12':'F12',
    'Backspace':'Backspace','Delete':'Delete','Insert':'Insert',
    'Home':'Home','End':'End','PageUp':'PageUp','PageDown':'PageDown',
    'ArrowUp':'Up','ArrowDown':'Down','ArrowLeft':'Left','ArrowRight':'Right',
    'Enter':'Return',' ':'Space',
    'Tab':'Tab','CapsLock':'CapsLock','Escape':'Escape',
    'NumLock':'NumLock','Clear':'Clear'
  }

  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // Récupérer la touche
  let key = e.key
  
  // Vérifier si c'est une touche du pavé numérique
  if (e.location === 3) {
    if (NUMPAD_KEYS[key] !== undefined) {
      key = NUMPAD_KEYS[key]
    } else if (key === 'Enter') {
      key = 'NumEnter'
    }
  }
  // Sinon, on stocke la position physique (QWERTY)
  else {
    // Si on est en AZERTY, convertir en position physique (QWERTY)
    if (layout === 'azerty') {
      // Si c'est une lettre ou un caractère spécial AZERTY
      const physicalKey = AZERTY_TO_PHYSICAL[key]
      if (physicalKey) {
        key = physicalKey
      }
      // Si c'est une lettre majuscule, la mettre en majuscule pour la position QWERTY
      else if (key.length === 1 && key.match(/[A-Z]/)) {
        key = key.toUpperCase()
      }
    }
    // Si on est en QWERTY, garder la touche telle quelle
    else if (layout === 'qwerty') {
      // Si c'est une lettre, la mettre en majuscule
      if (key.length === 1 && key.match(/[a-z]/)) {
        key = key.toUpperCase()
      }
    }
  }
  
  // Si ce n'est pas une touche spéciale, la mettre en majuscule
  if (!specialKeys[key] && !key.startsWith('Num') && key.length === 1) {
    key = key.toUpperCase()
  }
  
  // Vérifier si c'est une touche spéciale
  if (specialKeys[key]) {
    key = specialKeys[key]
  }

  const hasMod = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey
  const isFn = /^F\d+$/.test(key)

  if (requireMod && !hasMod) return null
  if (!requireMod && !hasMod && !isFn && key.length > 1 && !Object.values(specialKeys).includes(key) && !key.startsWith('Num')) return null

  parts.push(key)
  return parts.join('+')
}

// Fonction pour afficher un raccourci selon la disposition
export function displayShortcut(shortcut, layout = 'qwerty') {
  if (!shortcut) return ''
  
  const parts = shortcut.split('+')
  const displayParts = parts.map(part => {
    // Si c'est une touche du pavé numérique, garder le nom lisible
    if (part.startsWith('Num')) {
      const numMap = {
        'Num0': '0', 'Num1': '1', 'Num2': '2', 'Num3': '3', 'Num4': '4',
        'Num5': '5', 'Num6': '6', 'Num7': '7', 'Num8': '8', 'Num9': '9',
        'NumDecimal': '.', 'NumEnter': 'Enter', 'NumAdd': '+', 'NumSubtract': '-',
        'NumMultiply': '*', 'NumDivide': '/'
      }
      return numMap[part] || part
    }
    
    // Modificateurs
    if (part === 'CommandOrControl') return layout === 'azerty' ? 'Ctrl' : 'Ctrl'
    if (part === 'Shift') return layout === 'azerty' ? 'Maj' : 'Shift'
    if (part === 'Alt') return 'Alt'
    
    // Si on est en AZERTY, convertir la position physique (QWERTY) en caractère AZERTY
    if (layout === 'azerty') {
      // Chercher dans le mapping physique → AZERTY
      const azertyChar = PHYSICAL_TO_AZERTY[part]
      if (azertyChar) {
        return azertyChar
      }
      // Si c'est une lettre qui n'est pas dans le mapping (ex: 'B'), la garder
      if (part.length === 1) {
        // Si c'est une lettre, la mettre en minuscule pour l'affichage AZERTY
        if (part.match(/[A-Z]/)) {
          return part
        }
      }
    }
    // Si on est en QWERTY, garder la touche telle quelle
    return part
  })
  
  return displayParts.join('+')
}

export default function ShortcutRecorder({ 
  value, 
  onSave, 
  onClear, 
  placeholder = '+ Raccourci', 
  compact = false, 
  requireMod = false, 
  lang = 'fr',
  layout = 'qwerty'
}) {
  const tr = useTranslation(lang)
  const [recording, setRecording] = useState(false)
  const [preview, setPreview] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (recording && inputRef.current) inputRef.current.focus()
  }, [recording])

  const handleKeyDown = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') { setRecording(false); setPreview(''); return }
    if (e.key === 'Backspace' || e.key === 'Delete') { onClear?.(); setRecording(false); setPreview(''); return }

    const acc = eventToAccelerator(e, requireMod, layout)
    if (acc) {
      onSave(acc)
      setRecording(false)
      setPreview('')
    } else {
      const parts = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push(layout === 'azerty' ? 'Maj' : 'Shift')
      if (parts.length) setPreview(parts.join('+') + '+...')
      else if (requireMod) setPreview(tr('shortcutNeedMod'))
      else setPreview(tr('shortcutPressKey'))
    }
  }

  const hint = requireMod ? tr('shortcutHintMod') : tr('shortcutHintAny')
  const displayPlaceholder = placeholder === '+ Raccourci' ? tr('shortcutPlaceholder') : placeholder
  
  // Afficher la valeur avec la disposition correcte
  const displayValue = value ? displayShortcut(value, layout) : ''

  if (recording) {
    return (
      <div style={{ position: 'relative' }}>
        <input ref={inputRef} onKeyDown={handleKeyDown} onBlur={() => { setRecording(false); setPreview('') }}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} readOnly />
        <div title={hint} style={{
          fontSize: compact ? 10 : 12, textAlign: 'center',
          background: 'var(--accent-light)', border: '1px solid var(--accent)',
          borderRadius: 4, padding: compact ? '3px 6px' : '5px 10px',
          color: 'var(--accent)', cursor: 'pointer', minWidth: compact ? 0 : 160, whiteSpace: 'nowrap'
        }} onClick={() => { setRecording(false); setPreview('') }}>
          {preview || (compact ? tr('shortcutPressCompact') : tr('shortcutPressKey'))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div onClick={() => setRecording(true)} title={hint} style={{
        fontFamily: 'SFMono-Regular, Consolas, monospace',
        fontSize: compact ? 10 : 12,
        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        borderRadius: 4, padding: compact ? '3px 6px' : '5px 10px',
        color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
        cursor: 'pointer', minWidth: compact ? 0 : 80, textAlign: 'center', whiteSpace: 'nowrap'
      }}>
        {displayValue || displayPlaceholder}
      </div>
      {value && (
        <button onClick={e => { e.stopPropagation(); onClear?.() }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: 12 }}>
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  )
}