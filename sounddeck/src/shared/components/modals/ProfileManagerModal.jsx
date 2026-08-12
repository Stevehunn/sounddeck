// src/shared/components/modals/ProfileManagerModal.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import useConfirm from '@shared/hooks/useConfirm'

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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
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

  const handleRemoveSelected = async () => {
    if (selectedSounds.size === 0) return
    setShowConfirmDelete(true)
  }

  const confirmRemove = async () => {
    setIsDeleting(true)
    let removedCount = 0
    
    for (const soundId of selectedSounds) {
      await store.removeSoundFromProfile(soundId, profileId)
      removedCount++
    }
    
    setSelectedSounds(new Set())
    setShowConfirmDelete(false)
    setIsDeleting(false)
    
    addToast(`${removedCount} ${t('profileManagerSoundsRemoved')} "${profileName}"`, 'success')
    onClose()
  }

  const handleDeleteProfile = async () => {
    if (sounds.length > 0) {
      const confirmed = await confirm({
        title: t('profileManagerDeleteConfirm'),
        message: t('profileManagerDeleteMessage').replace('{name}', profileName).replace('{count}', sounds.length),
        type: 'danger'
      })
      if (!confirmed) return
    }
    
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

            {/* ✅ Bouton Supprimer générique */}
            <DeleteButton
              onDelete={handleDeleteProfile}
              confirmTitle={t('profileManagerDeleteConfirm') || 'Confirmer la suppression du profil'}
              confirmMessage={t('profileManagerDeleteMessage')?.replace('{name}', profileName)?.replace('{count}', sounds.length) || `Voulez-vous vraiment supprimer le profil "${profileName}" avec ses ${sounds.length} sons ?`}
              itemName={profileName}
              size="sm"
              variant="danger"
              icon="ti-trash"
              label={t('profileManagerDeleteProfile') || 'Supprimer le profil'}
              showLabel={true}
            />
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
                const imageUrl = sound.image
                  ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
                  : null

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

          {showConfirmDelete && (
            <div className="modal-overlay" onClick={() => setShowConfirmDelete(false)} style={{ zIndex: 2000 }}>
              <div className="modal fade-in" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-title" style={{ color: 'var(--warning)' }}>
                  <i className="ti ti-alert-triangle" style={{ color: 'var(--warning)', marginRight: 8 }} />
                  {t('profileManagerConfirmRemove')}
                </div>
                
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  {t('profileManagerConfirmMessage').replace('{count}', selectedSounds.size).replace('{name}', profileName)}
                  <br /><br />
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    {t('profileManagerConfirmSub')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-secondary btn-lg" onClick={() => setShowConfirmDelete(false)} disabled={isDeleting} style={{ borderRadius: 'var(--radius-md)', minHeight: 40 }}>
                    {t('cancel')}
                  </button>
                  <button className="btn-danger btn-lg" onClick={confirmRemove} disabled={isDeleting} style={{ borderRadius: 'var(--radius-md)', minHeight: 40 }}>
                    {isDeleting ? (
                      <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('profileManagerDeleting') || 'Suppression...'}</>
                    ) : (
                      <><i className="ti ti-check" /> {t('confirm')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}