/**
 * @file Project save / load / export / import controls + manager modal.
 *
 * Renders four buttons:
 * 1. **Projects** — opens `<ProjectManagerModal>`.
 * 2. **Save** — calls `onSaveProject`.
 * 3. **Package dropdown** — Export to `.sounddeck` file / Import from
 *    `.sounddeck` or `.json` file.
 *
 * Export/import use `window.electronAPI.saveFileDialog` /
 * `openFileDialog`, then delegate to `onExportProject(path)` /
 * `onImportProject(path)`. All errors are logged (EN) and swallowed so
 * the UI never crashes on IPC failure.
 *
 * @see ./index.jsx
 * @see ../Modals/ProjectManagerModal.jsx
 */

import { useState } from 'react'
import ProjectManagerModal from '../Modals/ProjectManagerModal'

/** Extension used for project archives. */
const PROJECT_EXTENSION = '.sounddeck'

/** Allowed import extensions. */
const IMPORT_EXTENSIONS = ['.sounddeck', '.json']

/**
 * Project save / load / export / import controls.
 *
 * @param {Object} props
 * @param {Object} [props.project] - Current project (`{ id, name }`).
 * @param {Array} [props.projectList]
 * @param {Array} [props.recentProjects]
 * @param {boolean} [props.isSaving]
 * @param {boolean} [props.isLoading]
 * @param {Function} [props.onSaveProject]
 * @param {Function} [props.onLoadProject]
 * @param {Function} [props.onCreateProject]
 * @param {Function} [props.onDeleteProject]
 * @param {Function} [props.onDuplicateProject]
 * @param {Function} [props.onRenameProject]
 * @param {Function} [props.onLoadProjectList]
 * @param {(project: Object, path: string) => Promise<void>} [props.onExportProject]
 * @param {(path: string) => Promise<void>} [props.onImportProject]
 * @param {(key: string) => string} props.tr - i18n translator.
 * @returns {JSX.Element}
 */
export default function ProjectControls({
  project,
  projectList,
  recentProjects,
  isSaving,
  isLoading,
  onSaveProject,
  onLoadProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onLoadProjectList,
  onExportProject,
  onImportProject,
  tr,
}) {
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  /**
   * Opens the native "Save file" dialog, then exports the current project.
   * @returns {Promise<void>}
   */
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const fallbackName = tr('projectFallbackName') || 'project'
      const defaultName = `${project?.name || fallbackName}${PROJECT_EXTENSION}`
      const result = await window.electronAPI.saveFileDialog?.(defaultName, null)
      if (result?.success && result?.path) {
        await onExportProject?.(project, result.path)
      }
    } catch (e) {
      console.error('[ProjectControls] export failed:', e)
    } finally {
      setIsExporting(false)
      setShowExportMenu(false)
    }
  }

  /**
   * Opens the native "Open file" dialog, validates the extension, then
   * imports the selected project.
   * @returns {Promise<void>}
   */
  const handleImport = async () => {
    setIsImporting(true)
    try {
      const result = await window.electronAPI.openFileDialog?.()
      if (result && result.length > 0) {
        const filePath = result[0]
        const ext = IMPORT_EXTENSIONS.find((e) =>
          filePath.toLowerCase().endsWith(e)
        )
        if (ext) {
          await onImportProject?.(filePath)
        }
      }
    } catch (e) {
      console.error('[ProjectControls] import failed:', e)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <button
          className="btn-secondary btn-sm"
          onClick={() => {
            onLoadProjectList?.()
            setShowProjectManager(true)
          }}
          style={{
            fontSize: 12,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title={tr('projectManager') || 'Manage projects'}
        >
          <i className="ti ti-folder" />
          <span>{tr('projects') || 'Projects'}</span>
        </button>

        <button
          className={isSaving ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
          onClick={onSaveProject}
          disabled={isSaving || !project}
          style={{
            fontSize: 12,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: isSaving ? 0.6 : 1,
          }}
          title={tr('saveProject') || 'Save project (Ctrl+S)'}
        >
          {isSaving ? (
            <i
              className="ti ti-loader"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : (
            <i className="ti ti-device-floppy" />
          )}
          <span>
            {isSaving
              ? tr('saving') || 'Saving…'
              : tr('save') || 'Save'}
          </span>
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={
              tr('projectExportImport') || 'Export / Import project'
            }
          >
            <i className="ti ti-package" />
            <i
              className={`ti ${
                showExportMenu ? 'ti-chevron-up' : 'ti-chevron-down'
              }`}
              style={{ fontSize: 10 }}
            />
          </button>

          {showExportMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '4px',
                zIndex: 20,
                minWidth: 180,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <button
                className="btn-ghost btn-sm"
                onClick={handleExport}
                disabled={isExporting || !project}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '6px 12px',
                  fontSize: 12,
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <i className="ti ti-file-export" />
                {isExporting ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />{' '}
                    {tr('exporting') || 'Exporting…'}
                  </>
                ) : (
                  tr('exportProject') || '📤 Export project'
                )}
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={handleImport}
                disabled={isImporting}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '6px 12px',
                  fontSize: 12,
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <i className="ti ti-file-import" />
                {isImporting ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />{' '}
                    {tr('importing') || 'Importing…'}
                  </>
                ) : (
                  tr('importProject') || '📥 Import project'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <ProjectManagerModal
        isOpen={showProjectManager}
        onClose={() => setShowProjectManager(false)}
        projects={projectList}
        recentProjects={recentProjects}
        currentProjectId={project?.id}
        onLoadProject={onLoadProject}
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onDuplicateProject={onDuplicateProject}
        onRenameProject={onRenameProject}
        tr={tr}
      />
    </>
  )
}