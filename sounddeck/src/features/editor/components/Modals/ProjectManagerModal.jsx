// src/features/editor/components/Modals/ProjectManagerModal.jsx
import React, { useState, useEffect } from 'react'
import { DeleteButton } from '@shared/components/ui'
import { formatTime } from '@shared/utils/format'

export default function ProjectManagerModal({
  isOpen,
  onClose,
  projects = [],
  recentProjects = [],
  currentProjectId,
  onLoadProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  isDeleting,
  tr
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProjects, setFilteredProjects] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isRenaming, setIsRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProjects(filtered)
    }
  }, [isOpen, projects, searchTerm])

  if (!isOpen) return null

  const handleCreate = () => {
    if (!newProjectName.trim()) return
    onCreateProject?.(newProjectName.trim())
    setNewProjectName('')
    setIsCreating(false)
    onClose()
  }

  const handleDelete = (projectId) => {
    onDeleteProject?.(projectId)
  }

  const handleRename = (projectId, e) => {
    e?.stopPropagation()
    
    if (isRenaming === projectId) {
      const trimmedName = renameValue.trim()
      if (trimmedName) {
        onRenameProject?.(projectId, trimmedName)
      }
      setIsRenaming(null)
      setRenameValue('')
    } else {
      const project = projects.find(p => p.id === projectId)
      setIsRenaming(projectId)
      setRenameValue(project?.name || '')
    }
  }

  const handleRenameKeyDown = (e, projectId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleRename(projectId, e)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsRenaming(null)
      setRenameValue('')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleProjectClick = (projectId) => {
    if (isRenaming === projectId) return
    onLoadProject?.(projectId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 600, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-folder" style={{ color: 'var(--accent)' }} />
          {tr('projectManager') || 'Gestionnaire de projets'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="ti ti-search" style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={tr('searchProjects') || 'Rechercher un projet...'}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
            <button
              className="btn-primary btn-sm"
              onClick={() => setIsCreating(!isCreating)}
              style={{ minHeight: 34, padding: '4px 12px' }}
            >
              <i className="ti ti-plus" />
              {tr('new') || 'Nouveau'}
            </button>
          </div>
        </div>

        {isCreating && (
          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder={tr('projectName') || 'Nom du projet'}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setIsCreating(false)
              }}
              autoFocus
            />
            <button
              className="btn-primary btn-sm"
              onClick={handleCreate}
              disabled={!newProjectName.trim()}
            >
              <i className="ti ti-check" />
              {tr('create') || 'Créer'}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setIsCreating(false)}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {recentProjects.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 6
            }}>
              {tr('recentProjects') || 'Projets récents'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {recentProjects.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  className="btn-secondary btn-sm"
                  onClick={() => onLoadProject?.(p.id)}
                  style={{
                    fontSize: 11,
                    padding: '2px 10px',
                    border: p.id === currentProjectId ? '1px solid var(--accent)' : '1px solid var(--border)'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '50vh',
          borderTop: '1px solid var(--border)',
          paddingTop: 8
        }}>
          {filteredProjects.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 12
            }}>
              {searchTerm ? (
                tr('noProjectsFound') || 'Aucun projet trouvé'
              ) : (
                tr('noProjects') || 'Aucun projet. Créez-en un !'
              )}
            </div>
          ) : (
            filteredProjects.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: p.id === currentProjectId ? 'var(--accent-light)' : 'transparent',
                  border: p.id === currentProjectId ? '1px solid var(--accent)' : '1px solid transparent',
                  marginBottom: 2,
                  transition: 'all 0.15s'
                }}
              >
                <div
                  style={{ 
                    flex: 1, 
                    cursor: isRenaming === p.id ? 'default' : 'pointer',
                    minWidth: 0 
                  }}
                  onClick={() => handleProjectClick(p.id)}
                >
                  {isRenaming === p.id ? (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, p.id)}
                        autoFocus
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--accent)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 8px',
                          flex: 1,
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                      <button
                        className="btn-primary btn-sm"
                        onClick={(e) => handleRename(p.id, e)}
                        style={{
                          padding: '2px 6px',
                          fontSize: 10,
                          minHeight: 24,
                          minWidth: 24,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={tr('confirm') || 'Valider le renommage'}
                      >
                        <i className="ti ti-check" />
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsRenaming(null)
                          setRenameValue('')
                        }}
                        style={{
                          padding: '2px 6px',
                          fontSize: 10,
                          minHeight: 24,
                          minWidth: 24,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={tr('cancel') || 'Annuler le renommage'}
                      >
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        fontSize: 13,
                        fontWeight: p.id === currentProjectId ? 600 : 400,
                        color: p.id === currentProjectId ? 'var(--accent)' : 'var(--text-primary)'
                      }}>
                        {p.name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        <span>🕐 {formatDate(p.updatedAt || p.createdAt)}</span>
                        <span>📊 {p.tracks?.length || 0} {tr('editorTracks') || 'pistes'}</span>
                        <span>🎵 {p.tracks?.flatMap(t => t.clips).length || 0} {tr('editorClips') || 'clips'}</span>
                        {p.id === currentProjectId && (
                          <span style={{ color: 'var(--success)' }}>● {tr('current') || 'Actuel'}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {isRenaming !== p.id && (
                    <>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => onLoadProject?.(p.id)}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title={tr('open') || 'Ouvrir'}
                      >
                        <i className="ti ti-folder-open" />
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRename(p.id, e)
                        }}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title={tr('rename') || 'Renommer'}
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateProject?.(p.id)
                        }}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title={tr('duplicate') || 'Dupliquer'}
                      >
                        <i className="ti ti-copy" />
                      </button>
                      {/* ✅ Bouton Supprimer - CORRIGÉ avec deleteLabel */}
                      <DeleteButton
                        onDelete={() => onDeleteProject?.(p.id)}
                        confirmTitle={tr('confirmDeleteProject') || 'Confirmer la suppression du projet'}
                        confirmMessage={(tr('confirmDeleteProjectMessage') || 'Voulez-vous vraiment supprimer définitivement le projet "{name}" ?').replace('{name}', p.name)}
                        size="sm"
                        variant="ghost"
                        icon="ti-trash"
                        deleteLabel={tr('delete') || 'Supprimer'}
                      />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{
              borderRadius: 'var(--radius-md)',
              minHeight: 40,
              padding: '8px 24px',
              fontSize: 13
            }}
          >
            {tr('close') || 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  )
}