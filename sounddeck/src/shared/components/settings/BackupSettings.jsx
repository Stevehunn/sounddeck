// src/shared/components/settings/BackupSettings.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import {
  getBackupList,
  restoreBackup,
  exportBackups,
  importBackups,
  performBackup,
  deleteBackup,
} from '@shared/utils/backupManager'
import useConfirm from '@shared/hooks/useConfirm'
import { logError } from '@shared/utils/logger'

export default function BackupSettings({ store, addToast, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const loadBackups = async () => {
    try {
      const list = await getBackupList()
      const withIndex = list.map((backup, realIndex) => ({
        ...backup,
        _realIndex: realIndex,
      }))
      withIndex.reverse()
      setBackups(withIndex)
    } catch (e) {
      logError('BackupSettings', 'Erreur loadBackups', e)
      setBackups([])
    }
  }

  useEffect(() => {
    loadBackups()

    const handleRefresh = () => loadBackups()
    window.addEventListener('refresh-backups', handleRefresh)
    return () => window.removeEventListener('refresh-backups', handleRefresh)
  }, [])

  const handleBackupNow = async () => {
    setIsLoading(true)
    try {
      const result = await performBackup(store)
      if (result.success) {
        addToast(t('backupSuccess'), 'success')
        await loadBackups()
      } else {
        addToast(result.error || t('error'), 'error')
      }
    } catch (e) {
      logError('BackupSettings', 'Erreur backup', e)   // ✅ CHANGÉ
      addToast(e.message, 'error')
    }
    setIsLoading(false)
  }

  const handleRestore = async (realIndex) => {
    const confirmed = await confirm({
      title: t('restore'),
      message: t('confirmRestore'),
      type: 'warning',
    })
    if (!confirmed) return

    setIsLoading(true)
    try {
      const result = await restoreBackup(store, realIndex)
      if (result.success) {
        addToast(t('backupRestored'), 'success')
        setTimeout(() => window.location.reload(), 500)
      } else {
        addToast(result.error || t('error'), 'error')
      }
    } catch (e) {
      logError('BackupSettings', 'Erreur restore', e)
      addToast(e.message, 'error')
    }
    setIsLoading(false)
  }

  const handleDelete = async (realIndex) => {
    try {
      const result = await deleteBackup(realIndex)
      if (result.success) {
        addToast(t('backupDeleted'), 'success')
        await loadBackups()
        window.dispatchEvent(new CustomEvent('refresh-backups'))
      } else {
        addToast(result.error || t('error'), 'error')
      }
    } catch (e) {
      logError('BackupSettings', 'Erreur delete', e)   // ✅ CHANGÉ
      addToast(e.message, 'error')
    }
  }

  const handleExport = async () => {
    try {
      const result = await exportBackups()

      if (result.success) {
        addToast(t('backupsExported'), 'success')
      } else if (!result.canceled) {
        addToast(result.error || t('error'), 'error')
      }
    } catch (e) {
      logError('BackupSettings', 'Erreur export', e)   // ✅ CHANGÉ
      addToast(e.message, 'error')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const result = await importBackups(file)
        if (result.success) {
          addToast(t('backupsImported', { count: result.count }), 'success')
          await loadBackups()
        } else {
          addToast(result.error || t('error'), 'error')
        }
      } catch (err) {
        logError('BackupSettings', 'Erreur import', err)   // ✅ CHANGÉ
        addToast(err.message, 'error')
      }
    }
    input.click()
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(currentLang)
  }

  return (
    <>
      <div style={{
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-cloud" style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {t('backupSettings')}
            </span>
            <span style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {backups.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-primary btn-sm"
              onClick={handleBackupNow}
              disabled={isLoading}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              {isLoading ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('saving')}</>
              ) : (
                <><i className="ti ti-cloud-upload" /> {t('backupNow')}</>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            className="btn-secondary btn-sm"
            onClick={handleExport}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            <i className="ti ti-download" /> {t('exportBackups')}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={handleImport}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            <i className="ti ti-upload" /> {t('importBackups')}
          </button>
        </div>

        <div style={{
          maxHeight: 200,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {backups.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}>
              {t('noBackups')}
            </div>
          )}

          {backups.map((backup) => (
            <div
              key={backup.timestamp || backup._realIndex}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {formatDate(backup.timestamp)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {backup.sounds?.length || 0} {t('sounds')} · {backup.profiles?.length || 0} {t('profiles')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => handleRestore(backup._realIndex)}
                  style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  <i className="ti ti-refresh" /> {t('restore')}
                </button>
                <DeleteButton
                  onDelete={() => handleDelete(backup._realIndex)}
                  confirmTitle={t('delete')}
                  confirmMessage={t('confirmDeleteMessage')}
                  itemName={formatDate(backup.timestamp)}
                  size="sm"
                  variant="ghost-danger"
                  icon="ti-trash"
                  showLabel={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}