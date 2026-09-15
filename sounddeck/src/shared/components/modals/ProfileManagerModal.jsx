// src/shared/components/modals/ProfileManagerModal.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import useConfirm from '@shared/hooks/useConfirm'
import { buildFileUrl } from '@shared/utils/fileUrl'

export default function ProfileManagerModal({ 
  profileId, 
  profileName, 
  sounds, 
  store, 
  onClose, 
  addToast
}) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [selectedSounds, setSelectedSounds] = useState(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const toggleSound = (soundId) => {
    const newSelected = new Set(selectedSounds)
    if (newSelected.has(soundId)) {
      newSelected.delete(soundId)
    } else {
      newSelected.add(soundId)
    }
    setSelectedSounds(newSelected)
  }

  const toggleAll = () => {
    if (selectedSounds.size === sounds.length) {
      setSelectedSounds(new Set())
    } else {
      setSelectedSounds(new Set(sounds.map(s => s.id)))
    }
  }

  // ✅ Utiliser useConfirm pour la confirmation de retrait
  const handleRemoveSelected = async () => {
    if (selectedSounds.size === 0) return
    
    const confirmed = await confirm({
      title: t('profileManagerConfirmRemove'),
      message: t('profileManagerConfirmMessage')
        .replace('{count}', selectedSounds.size)
        .replace('{name}', profileName),
      type: 'warning',
      confirmText: t('profileManagerRemoveSelected'),
      cancelText: t('cancel')
    })
    
    if (!confirmed) return

    setIsDeleting(true)
    let removedCount = 0
    
    for (const soundId of selectedSounds) {
      await store.removeSoundFromProfile(soundId, profileId)
      removedCount++
    }
    
    setSelectedSounds(new Set())
    setIsDeleting(false)
    
    addToast(`${removedCount} ${t('profileManagerSoundsRemoved')} "${profileName}"`, 'success')
    onClose()
  }

  // ✅ Fonction de suppression du profil avec useConfirm (UNIQUEMENT)
  const handleDeleteProfile = async () => {
    const confirmed = await confirm({
      title: t('profileManagerDeleteConfirm'),
      message: t('profileManagerDeleteMessage')
        .replace('{name}', profileName)
        .replace('{count}', sounds.length),
      type: 'danger',
      confirmText: t('profileManagerDeleteProfile') || 'Supprimer le profil',
      cancelText: t('cancel') || 'Annuler'
    })
    
    if (!confirmed) return
    
    await store.deleteProfile(profileId)
    addToast(`${t('profileManagerProfileDeleted')} "${profileName}"`, 'info')
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal fade-in" style={{ width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          
          <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <i className="ti ti-users" style={{ color: 'var(--accent)' }} />
              {t('profileManagerTitle')} : <strong>{profileName}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {sounds.length} {t('sounds')}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 12,
            flexWrap: 'wrap',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            <button 
              className="btn-secondary btn-sm" 
              onClick={toggleAll}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className={`ti ${selectedSounds.size === sounds.length ? 'ti-checkbox' : 'ti-checkbox'}`} />
              {selectedSounds.size === sounds.length ? t('profileManagerDeselectAll') : t('profileManagerSelectAll')}
            </button>
            
            <button 
              className="btn-primary btn-sm" 
              onClick={handleRemoveSelected}
              disabled={selectedSounds.size === 0 || isDeleting}
              style={{ 
                fontSize: 12, 
                padding: '4px 12px', 
                borderRadius: 'var(--radius-sm)',
                opacity: selectedSounds.size === 0 ? 0.5 : 1
              }}
            >
              <i className="ti ti-folder-minus" />
              {t('profileManagerRemoveSelected')} ({selectedSounds.size})
            </button>

            <div style={{ flex: 1 }} />

            {/* ✅ Bouton Supprimer le profil - Style DeleteButton avec bordure rouge */}
            <button
              onClick={handleDeleteProfile}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 12,
                minHeight: 28,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'transparent',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                fontFamily: 'inherit',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--danger)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'var(--danger)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(224, 82, 82, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.borderColor = 'var(--danger)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              title={t('profileManagerDeleteProfile')}
            >
              <i className="ti ti-trash" style={{ fontSize: 12 }} />
              <span>{t('profileManagerDeleteProfile')}</span>
            </button>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            marginBottom: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 4
          }}>
            {sounds.length === 0 ? (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: 'var(--text-tertiary)',
                fontSize: 13
              }}>
                <i className="ti ti-music" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                {t('profileManagerNoSounds')}
              </div>
            ) : (
              sounds.map(sound => {
                const isSelected = selectedSounds.has(sound.id)
                const imageUrl = buildFileUrl(sound.image)

                return (
                  <label
                    key={sound.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                      transition: 'all 0.15s',
                      marginBottom: 2
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSound(sound.id)}
                      style={{ accentColor: 'var(--accent)', width: 'auto' }}
                    />
                    
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {imageUrl ? (
                        <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        sound.emoji || '🔊'
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sound.name}
                      </div>
                      {sound.favorites?.includes(profileId) && (
                        <div style={{ fontSize: 10, color: 'var(--warning)' }}>
                          <i className="ti ti-star-filled" style={{ fontSize: 9 }} /> {t('profileManagerFavorite')}
                        </div>
                      )}
                    </div>

                    {sound.shortcut && (
                      <div style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        background: 'var(--bg-tertiary)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        color: 'var(--text-tertiary)'
                      }}>
                        {sound.shortcut}
                      </div>
                    )}
                  </label>
                )
              })
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button className="btn-secondary btn-lg" onClick={onClose} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
              <i className="ti ti-x" /> {t('close')}
            </button>
          </div>
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}