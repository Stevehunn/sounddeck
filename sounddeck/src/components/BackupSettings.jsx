import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import {
  getBackupList,
  restoreBackup,
  exportBackups,
  importBackups,
  performBackup,
  getBackup
} from '../utils/backupManager'
import useConfirm from '../hooks/useConfirm.jsx'

export default function BackupSettings({ store, addToast, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang })
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = () => {
    const list = getBackupList()
    setBackups(list)
  }

  const handleBackupNow = async () => {
    setIsLoading(true)
    const result = await performBackup(store)
    setIsLoading(false)
    
    if (result.success) {
      addToast('✅ Sauvegarde effectuée', 'success')
      loadBackups()
    } else {
      addToast('❌ Erreur sauvegarde: ' + result.error, 'error')
    }
  }

  const handleRestore = async (index) => {
    const confirmed = await confirm({
      title: t('restoreBackup'),
      message: t('restoreBackupConfirm'),
      type: 'warning'
    })
    if (!confirmed) return
    
    setIsLoading(true)
    const result = await restoreBackup(store, index)
    setIsLoading(false)
    
    if (result.success) {
      addToast('✅ Sauvegarde restaurée', 'success')
      window.location.reload()
    } else {
      addToast('❌ Erreur restauration: ' + result.error, 'error')
    }
  }

  const handleExport = () => {
    exportBackups()
    addToast('✅ Sauvegardes exportées', 'success')
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
          addToast(`✅ ${result.count} sauvegardes importées`, 'success')
          loadBackups()
        }
      } catch (err) {
        addToast('❌ Erreur import: ' + err.message, 'error')
      }
    }
    input.click()
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <>
      <div style={{
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
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
              borderRadius: 10
            }}>
              {backups.length} {t('backups')}
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
          gap: 4
        }}>
          {backups.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--text-tertiary)',
              fontSize: 12
            }}>
              {t('noBackups')}
            </div>
          )}

          {backups.map((backup, index) => (
            <div
              key={backup.timestamp || index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {formatDate(backup.timestamp)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {backup.sounds?.length || 0} sons · {backup.profiles?.length || 0} profils
                </div>
              </div>
              <button
                className="btn-ghost btn-sm"
                onClick={() => handleRestore(index)}
                style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                <i className="ti ti-refresh" /> {t('restore')}
              </button>
            </div>
          ))}
        </div>

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmWrapper />
    </>
  )
}