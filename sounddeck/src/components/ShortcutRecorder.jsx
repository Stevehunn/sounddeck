import { useState, useRef, useEffect } from 'react'

function eventToAccelerator(e, requireMod = false) {
  const ignored = ['Control', 'Meta', 'Alt', 'Shift', 'Tab', 'CapsLock', 'Escape']
  if (ignored.includes(e.key)) return null

  const specialKeys = {
    'F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6',
    'F7':'F7','F8':'F8','F9':'F9','F10':'F10','F11':'F11','F12':'F12',
    'Backspace':'Backspace','Delete':'Delete','Insert':'Insert',
    'Home':'Home','End':'End','PageUp':'PageUp','PageDown':'PageDown',
    'ArrowUp':'Up','ArrowDown':'Down','ArrowLeft':'Left','ArrowRight':'Right',
    'Enter':'Return',' ':'Space'
  }

  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  const key = specialKeys[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)

  const hasMod = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey
  const isFn = /^F\d+$/.test(key)

  // requireMod = true → combinaison obligatoire (ex: raccourci profil)
  // requireMod = false → touche seule acceptée (ex: raccourci son)
  if (requireMod && !hasMod) return null
  if (!requireMod && !hasMod && !isFn && key.length > 1 && !Object.values(specialKeys).includes(key)) return null

  return parts.join('+')
}

export default function ShortcutRecorder({ value, onSave, onClear, placeholder = '+ Raccourci', compact = false, requireMod = false }) {
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

    const acc = eventToAccelerator(e, requireMod)
    if (acc) {
      onSave(acc)
      setRecording(false)
      setPreview('')
    } else {
      // Aperçu modificateurs en attente
      const parts = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (parts.length) setPreview(parts.join('+') + '+...')
      else if (requireMod) setPreview('⚠️ Ajoutez Ctrl/Alt/Shift')
    }
  }

  const hint = requireMod
    ? 'Combinaison requise (ex: Ctrl+Shift+P)'
    : 'Une touche ou une combinaison (ex: F1, Ctrl+1)'

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
          {preview || (compact ? 'Appuyez...' : '⌨️ Appuyez sur une touche...')}
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
        {value || placeholder}
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