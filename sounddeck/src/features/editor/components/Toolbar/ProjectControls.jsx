// src/features/editor/components/Toolbar/ProjectControls.jsx
import React, { useState } from 'react'
import ProjectManagerModal from '../Modals/ProjectManagerModal'

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
  tr
}) {
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await window.electronAPI.saveFileDialog?.(
        `${project?.name || 'projet'}.sounddeck`,
        null
      )
      if (result?.success && result?.path) {
        await onExportProject?.(project, result.path)
      }
    } catch (e) {
      console.error('Erreur export:', e)
    } finally {
      setIsExporting(false)
      setShowExportMenu(false)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const result = await window.electronAPI.openFileDialog?.()
      if (result && result.length > 0) {
        const filePath = result[0]
        if (filePath.endsWith('.sounddeck') || filePath.endsWith('.json')) {
          await onImportProject?.(filePath)
        }
      }
    } catch (e) {
      console.error('Erreur import:', e)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
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
            gap: 4
          }}
          title={tr('projectManager') || 'Gérer les projets'}
        >
          <i className="ti ti-folder" />
          <span>{tr('projects') || 'Projets'}</span>
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
            opacity: isSaving ? 0.6 : 1
          }}
          title={tr('saveProject') || 'Sauvegarder le projet (Ctrl+S)'}
        >
          {isSaving ? (
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <i className="ti ti-device-floppy" />
          )}
          <span>{isSaving ? (tr('saving') || 'Sauvegarde...') : (tr('save') || 'Sauvegarder')}</span>
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
              gap: 4
            }}
          >
            <i className="ti ti-package" />
            <i className={`ti ${showExportMenu ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 10 }} />
          </button>

          {showExportMenu && (
            <div style={{
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
              boxShadow: 'var(--shadow-lg)'
            }}>
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
                  justifyContent: 'flex-start'
                }}
              >
                <i className="ti ti-file-export" />
                {isExporting ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('exporting') || 'Export...'}</>
                ) : (
                  tr('exportProject') || '📤 Exporter le projet'
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
                  justifyContent: 'flex-start'
                }}
              >
                <i className="ti ti-file-import" />
                {isImporting ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('importing') || 'Import...'}</>
                ) : (
                  tr('importProject') || '📥 Importer un projet'
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