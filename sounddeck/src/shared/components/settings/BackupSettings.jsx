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
  deleteBackup
} from '../../utils/backupManager.js'
import useConfirm from '../../hooks/useConfirm.jsx'

export default function BackupSettings({ store, addToast, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const loadBackups = () => {
    console.log('🔄 [BackupSettings] loadBackups appelé')
    try {
      const list = getBackupList()
      console.log('📋 [BackupSettings] Liste des sauvegardes:', list.length)
      setBackups(list)
    } catch (e) {
      console.error('❌ [BackupSettings] Erreur loadBackups:', e)
      setBackups([])
    }
  }

  useEffect(() => {
    loadBackups()
    
    const handleRefresh = () => {
      console.log('🔄 [BackupSettings] Événement refresh-backups reçu')
      loadBackups()
    }
    window.addEventListener('refresh-backups', handleRefresh)
    return () => window.removeEventListener('refresh-backups', handleRefresh)
  }, [])

  const handleBackupNow = async () => {
    setIsLoading(true)
    try {
      const result = await performBackup(store)
      if (result.success) {
        addToast('✅ Sauvegarde effectuée', 'success')
        loadBackups()
      } else {
        addToast('❌ Erreur sauvegarde: ' + (result.error || 'Erreur inconnue'), 'error')
      }
    } catch (e) {
      console.error('❌ [BackupSettings] Erreur backup:', e)
      addToast('❌ Erreur: ' + e.message, 'error')
    }
    setIsLoading(false)
  }

  const handleRestore = async (index) => {
    const confirmed = await confirm({
      title: t('restoreBackup') || 'Restaurer la sauvegarde',
      message: t('restoreBackupConfirm') || 'Voulez-vous vraiment restaurer cette sauvegarde ?',
      type: 'warning'
    })
    if (!confirmed) return
    
    setIsLoading(true)
    try {
      const result = await restoreBackup(store, index)
      if (result.success) {
        addToast('✅ Sauvegarde restaurée', 'success')
        setTimeout(() => window.location.reload(), 500)
      } else {
        addToast('❌ Erreur restauration: ' + (result.error || 'Erreur inconnue'), 'error')
      }
    } catch (e) {
      console.error('❌ [BackupSettings] Erreur restore:', e)
      addToast('❌ Erreur: ' + e.message, 'error')
    }
    setIsLoading(false)
  }

  const handleDelete = async (index) => {
    console.log('🗑️ [BackupSettings] handleDelete appelé pour l\'index:', index)
    try {
      const result = await deleteBackup(index)
      console.log('📤 [BackupSettings] Résultat deleteBackup:', result)
      if (result.success) {
        addToast('✅ Sauvegarde supprimée', 'success')
        loadBackups()
        window.dispatchEvent(new CustomEvent('refresh-backups'))
        console.log('🔄 [BackupSettings] Liste rafraîchie après suppression')
      } else {
        addToast('❌ Erreur: ' + (result.error || 'Erreur inconnue'), 'error')
      }
    } catch (e) {
      console.error('❌ [BackupSettings] Erreur delete:', e)
      addToast('❌ Erreur: ' + e.message, 'error')
    }
  }

  const handleExport = () => {
    try {
      exportBackups()
      addToast('✅ Sauvegardes exportées', 'success')
    } catch (e) {
      console.error('❌ [BackupSettings] Erreur export:', e)
      addToast('❌ Erreur: ' + e.message, 'error')
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
          addToast(`✅ ${result.count} sauvegardes importées`, 'success')
          loadBackups()
        } else {
          addToast('❌ Erreur import: ' + (result.error || 'Erreur inconnue'), 'error')
        }
      } catch (err) {
        console.error('❌ [BackupSettings] Erreur import:', err)
        addToast('❌ Erreur: ' + err.message, 'error')
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
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => handleRestore(index)}
                  style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  <i className="ti ti-refresh" /> {t('restore')}
                </button>
                <DeleteButton
                  onDelete={() => handleDelete(index)}
                  confirmTitle={t('deleteBackup') || 'Confirmer la suppression de la sauvegarde'}
                  confirmMessage={t('deleteBackupConfirm') || 'Voulez-vous vraiment supprimer cette sauvegarde ?'}
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

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmWrapper />
    </>
  )
}