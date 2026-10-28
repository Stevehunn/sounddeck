/**
 * @file Project manager modal (list, search, create, rename, delete).
 *
 * A single modal that covers the entire project lifecycle:
 * - **List** — shows all projects with name, date, track count, clip count.
 * - **Search** — filters by name or ID (case-insensitive).
 * - **Create** — inline form for a new project name.
 * - **Rename** — inline editing of a project name.
 * - **Duplicate** — one-click copy (managed by the parent).
 * - **Delete** — confirmation via `DeleteButton`.
 * - **Recent** — up to 5 recent projects (from `recentProjects`).
 *
 * The "current" project is highlighted with a green bullet + accent border.
 *
 * ## Confirm flow
 *
 * `DeleteButton` handles its own confirmation dialog (see its `useConfirm`
 * hook). This modal just forwards the delete intent to `onDeleteProject`.
 *
 * @see ../Editor.jsx — the caller
 * @see ../../Toolbar/ProjectControls.jsx — the button that opens it
 * @see @shared/components/ui/DeleteButton
 */

import { useState, useEffect } from 'react'
import { DeleteButton } from '@shared/components/ui'
import { formatTime } from '@shared/utils/format'

/** Maximum number of recent projects shown. */
const MAX_RECENT_PROJECTS = 5

/** Debounce (ms) for the search input. */
const SEARCH_DEBOUNCE_MS = 0

/**
 * Project manager modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Array<Object>} [props.projects=[]]
 * @param {Array<Object>} [props.recentProjects=[]]
 * @param {string} [props.currentProjectId]
 * @param {(projectId: string) => void} [props.onLoadProject]
 * @param {(name: string) => void} [props.onCreateProject]
 * @param {(projectId: string) => void} [props.onDeleteProject]
 * @param {(projectId: string) => void} [props.onDuplicateProject]
 * @param {(projectId: string, newName: string) => void} [props.onRenameProject]
 * @param {boolean} [props.isDeleting]
 * @param {(key: string) => string} props.tr - i18n translator.
 * @returns {JSX.Element|null}
 */
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
  tr,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProjects, setFilteredProjects] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isRenaming, setIsRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  // Filter the project list whenever the search term changes.
  useEffect(() => {
    if (!isOpen) return
    const lower = searchTerm.toLowerCase()
    const filtered = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower)
    )
    setFilteredProjects(filtered)
  }, [isOpen, projects, searchTerm])

  if (!isOpen) return null

  /**
   * Creates the new project and closes the modal on success.
   * @returns {void}
   */
  const handleCreate = () => {
    if (!newProjectName.trim()) return
    onCreateProject?.(newProjectName.trim())
    setNewProjectName('')
    setIsCreating(false)
    onClose()
  }

  /**
   * Renames a project. When called with the currently-renaming project,
   * the trimmed name is committed; otherwise it enters rename mode.
   *
   * @param {string} projectId
   * @param {Event} [e]
   * @returns {void}
   */
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
      const project = projects.find((p) => p.id === projectId)
      setIsRenaming(projectId)
      setRenameValue(project?.name || '')
    }
  }

  /**
   * Handles Enter (validate) and Escape (cancel) inside the rename input.
   *
   * @param {React.KeyboardEvent} e
   * @param {string} projectId
   * @returns {void}
   */
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

  /**
   * Formats a timestamp as a localized date + time.
   *
   * @param {number} timestamp - ms since epoch.
   * @returns {string}
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Loads a project (unless it's currently being renamed).
   *
   * @param {string} projectId
   * @returns {void}
   */
  const handleProjectClick = (projectId) => {
    if (isRenaming === projectId) return
    onLoadProject?.(projectId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 600, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-folder" style={{ color: 'var(--accent)' }} />
          {tr('projectManager') || 'Project manager'}
        </div>

        {/* Search + new button */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <i
                className="ti ti-search"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tr('searchProjects') || 'Search a project...'}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
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
              {tr('new') || 'New'}
            </button>
          </div>
        </div>

        {/* Inline "new project" form */}
        {isCreating && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={tr('projectName') || 'Project name'}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
              onKeyDown={(e) => {
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
              {tr('create') || 'Create'}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setIsCreating(false)}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 6,
              }}
            >
              {tr('recentProjects') || 'Recent projects'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {recentProjects.slice(0, MAX_RECENT_PROJECTS).map((p) => (
                <button
                  key={p.id}
                  className="btn-secondary btn-sm"
                  onClick={() => onLoadProject?.(p.id)}
                  style={{
                    fontSize: 11,
                    padding: '2px 10px',
                    border:
                      p.id === currentProjectId
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '50vh',
            borderTop: '1px solid var(--border)',
            paddingTop: 8,
          }}
        >
          {filteredProjects.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 12,
              }}
            >
              {searchTerm
                ? tr('noProjectsFound') || 'No projects found'
                : tr('noProjects') || 'No projects. Create one!'}
            </div>
          ) : (
            filteredProjects.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background:
                    p.id === currentProjectId
                      ? 'var(--accent-light)'
                      : 'transparent',
                  border:
                    p.id === currentProjectId
                      ? '1px solid var(--accent)'
                      : '1px solid transparent',
                  marginBottom: 2,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    cursor: isRenaming === p.id ? 'default' : 'pointer',
                    minWidth: 0,
                  }}
                  onClick={() => handleProjectClick(p.id)}
                >
                  {isRenaming === p.id ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
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
                          outline: 'none',
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
                          justifyContent: 'center',
                        }}
                        title={tr('confirm') || 'Confirm rename'}
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
                          justifyContent: 'center',
                        }}
                        title={tr('cancel') || 'Cancel rename'}
                      >
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight:
                            p.id === currentProjectId ? 600 : 400,
                          color:
                            p.id === currentProjectId
                              ? 'var(--accent)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          🕐 {formatDate(p.updatedAt || p.createdAt)}
                        </span>
                        <span>
                          📊 {p.tracks?.length || 0}{' '}
                          {tr('editorTracks') || 'tracks'}
                        </span>
                        <span>
                          🎵 {p.tracks?.flatMap((t) => t.clips).length || 0}{' '}
                          {tr('editorClips') || 'clips'}
                        </span>
                        {p.id === currentProjectId && (
                          <span style={{ color: 'var(--success)' }}>
                            ● {tr('current') || 'Current'}
                          </span>
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
                        title={tr('open') || 'Open'}
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
                        title={tr('rename') || 'Rename'}
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
                        title={tr('duplicate') || 'Duplicate'}
                      >
                        <i className="ti ti-copy" />
                      </button>
                      <DeleteButton
                        onDelete={() => onDeleteProject?.(p.id)}
                        confirmTitle={
                          tr('confirmDeleteProject') ||
                          'Confirm project deletion'
                        }
                        confirmMessage={(
                          tr('confirmDeleteProjectMessage') ||
                          'Do you really want to delete project "{name}"?'
                        ).replace('{name}', p.name)}
                        size="sm"
                        variant="ghost"
                        icon="ti-trash"
                        deleteLabel={tr('delete') || 'Delete'}
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
              fontSize: 13,
            }}
          >
            {tr('close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}