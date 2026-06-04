import { useState, useRef, useEffect } from 'react'

// Convertit un KeyboardEvent en chaîne Electron accelerator
function eventToAccelerator(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  const ignored = ['Control', 'Meta', 'Alt', 'Shift', 'Tab', 'CapsLock', 'Escape']
  if (ignored.includes(e.key)) return null

  // Touches spéciales Electron
  const specialKeys = {
    'F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6',
    'F7':'F7','F8':'F8','F9':'F9','F10':'F10','F11':'F11','F12':'F12',
    'Backspace':'Backspace','Delete':'Delete','Insert':'Insert',
    'Home':'Home','End':'End','PageUp':'PageUp','PageDown':'PageDown',
    'ArrowUp':'Up','ArrowDown':'Down','ArrowLeft':'Left','ArrowRight':'Right',
    'Enter':'Return','Space':'Space',
    '+':'Plus','-':'num-',',':',','.':"."
  }

  const key = specialKeys[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)

  // Un raccourci valide doit avoir au moins un modificateur OU être une touche Fn
  const hasMod = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey
  const isFn = /^F\d+$/.test(key)
  if (!hasMod && !isFn) return null

  return parts.join('+')
}

// Composant réutilisable d'enregistrement de raccourci
export default function ShortcutRecorder({ value, onSave, onClear, placeholder = '+ Raccourci', compact = false }) {
  const [recording, setRecording] = useState(false)
  const [preview, setPreview] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (recording && inputRef.current) {
      inputRef.current.focus()
    }
  }, [recording])

  const handleKeyDown = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setRecording(false)
      setPreview('')
      return
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      onClear?.()
      setRecording(false)
      setPreview('')
      return
    }

    // Afficher un aperçu pendant la frappe
    const acc = eventToAccelerator(e)
    if (acc) {
      setPreview(acc)
      onSave(acc)
      setRecording(false)
      setPreview('')
    } else {
      // Juste un modificateur, afficher l'aperçu en cours
      const parts = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      setPreview(parts.join('+') + (parts.length ? '+...' : ''))
    }
  }

  if (recording) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Input invisible qui capte le clavier */}
        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onBlur={() => { setRecording(false); setPreview('') }}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          readOnly
        />
        <div style={{
          fontSize: compact ? 10 : 12,
          textAlign: 'center',
          background: 'var(--accent-light)',
          border: '1px solid var(--accent)',
          borderRadius: 4,
          padding: compact ? '3px 6px' : '5px 10px',
          color: 'var(--accent)',
          cursor: 'pointer',
          minWidth: compact ? 0 : 120,
          whiteSpace: 'nowrap'
        }}
          onClick={() => { setRecording(false); setPreview('') }}>
          {preview || (compact ? 'Appuyez...' : '⌨️ Appuyez sur une touche...')}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div
        onClick={() => setRecording(true)}
        style={{
          fontFamily: 'SFMono-Regular, Consolas, monospace',
          fontSize: compact ? 10 : 12,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: compact ? '3px 6px' : '5px 10px',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          cursor: 'pointer',
          minWidth: compact ? 0 : 80,
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}
        title="Cliquer pour définir un raccourci">
        {value || placeholder}
      </div>
      {value && (
        <button onClick={e => { e.stopPropagation(); onClear?.() }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: 12 }}
          title="Effacer le raccourci">
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  )
}