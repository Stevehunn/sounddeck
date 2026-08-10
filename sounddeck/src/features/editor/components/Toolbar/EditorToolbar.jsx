// src/features/editor/components/Toolbar/EditorToolbar.jsx
import React, { memo } from 'react'

const EditorToolbar = memo(({
  onAddTrack,
  onExport,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  tr
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      flexWrap: 'wrap'
    }}>
      <button
        className="btn-ghost btn-sm"
        onClick={onAddTrack}
        style={{ fontSize: 12, color: 'var(--text-secondary)' }}
        title={tr('editorAddTrack') || 'Ajouter une piste'}
      >
        <i className="ti ti-playlist-plus" />
        <span style={{ marginLeft: 4, fontSize: 11 }}>{tr('editorAddTrack') || 'Piste'}</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

      <button
        className="btn-ghost btn-sm"
        onClick={onUndo}
        disabled={!canUndo}
        style={{ fontSize: 12, color: canUndo ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
        title={tr('undo') || 'Annuler (Ctrl+Z)'}
      >
        <i className="ti ti-arrow-back-up" />
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={onRedo}
        disabled={!canRedo}
        style={{ fontSize: 12, color: canRedo ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
        title={tr('redo') || 'Rétablir (Ctrl+Y)'}
      >
        <i className="ti ti-arrow-forward-up" />
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

      <button
        className={`btn-ghost btn-sm ${snapEnabled ? 'active' : ''}`}
        onClick={() => onToggleSnap?.(!snapEnabled)}
        style={{ 
          fontSize: 12, 
          color: snapEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
          fontWeight: snapEnabled ? 500 : 400
        }}
        title={tr('editorSnap') || 'Aimantation (Ctrl+Shift+S)'}
      >
        <i className="ti ti-magnet" />
        <span style={{ marginLeft: 4, fontSize: 11 }}>{tr('editorSnap') || 'Snap'}</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

      <button
        className="btn-ghost btn-sm"
        onClick={onImport}
        style={{ fontSize: 12, color: 'var(--text-secondary)' }}
        title={tr('editorImportFile') || 'Importer un fichier'}
      >
        <i className="ti ti-file-import" />
        <span style={{ marginLeft: 4, fontSize: 11 }}>{tr('editorImportFile') || 'Importer'}</span>
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={onExport}
        style={{ fontSize: 12, color: 'var(--text-secondary)' }}
        title={tr('editorExport') || 'Exporter'}
      >
        <i className="ti ti-file-export" />
        <span style={{ marginLeft: 4, fontSize: 11 }}>{tr('editorExport') || 'Exporter'}</span>
      </button>
    </div>
  )
})

EditorToolbar.displayName = 'EditorToolbar'

export default EditorToolbar