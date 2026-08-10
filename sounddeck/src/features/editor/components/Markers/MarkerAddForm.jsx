// src/features/editor/components/Markers/MarkerAddForm.jsx
import React, { useState, useEffect, useRef, memo } from 'react'

const MarkerAddForm = memo(({
  onAdd,
  onCancel,
  defaultName,
  tr
}) => {
  const [name, setName] = useState(defaultName || '')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd?.(name.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 8,
        padding: 4,
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)'
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tr('markerAddPlaceholder') || 'Nom du marqueur...'}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 11,
          padding: '4px 8px',
          outline: 'none'
        }}
      />
      <button
        type="submit"
        className="btn-primary btn-sm"
        style={{
          fontSize: 10,
          padding: '2px 10px',
          minHeight: 28
        }}
      >
        <i className="ti ti-check" /> {tr('add') || 'Ajouter'}
      </button>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={onCancel}
        style={{
          fontSize: 10,
          padding: '2px 10px',
          minHeight: 28
        }}
      >
        <i className="ti ti-x" />
      </button>
    </form>
  )
})

MarkerAddForm.displayName = 'MarkerAddForm'

export default MarkerAddForm