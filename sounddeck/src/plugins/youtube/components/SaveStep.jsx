// src/plugins/youtube/components/SaveStep.jsx
import React from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import { buildFileUrl } from '@shared/utils/fileUrl'
import EmojiPicker from '@shared/components/ui/EmojiPicker'
import PageHeader from './PageHeader'

export default function SaveStep({
  info,
  currentPath,
  isTutorialMode,
  soundName,
  setSoundName,
  emoji,
  setEmoji,
  customImage,
  setCustomImage,
  useThumbnail,
  setUseThumbnail,
  finalImage,
  videoInfo,
  targetProfiles,
  setTargetProfiles,
  availableProfiles,
  noProfilesSelected,
  noUserProfiles,
  isPreviewPlaying,
  togglePreview,
  showEmojiPicker,
  setShowEmojiPicker,
  isProcessing,
  savingRef,
  onBack,
  onSave,
  onPickImage,
  addToast,
}) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={
          isTutorialMode
            ? '🎬 ' + t('tutorialMode') + ' - ' + t('configSound')
            : t('configSound')
        }
        sub={t('ytSaveSubtitle')}
        onBack={onBack}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div
            className="option-row"
            style={{
              borderColor: 'var(--success)',
              marginBottom: 20,
              padding: '12px 16px',
              background: 'rgba(29,158,117,0.1)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <i className="ti ti-check" style={{ color: 'var(--success)', fontSize: 20 }} />
            <div style={{ flex: 1, padding: '0 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                {t('ytSuccessTitle')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {t('ytSuccessSource')} {info?.title?.slice(0, 50)}
              </div>
            </div>
          </div>

          {currentPath && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {t('editorPreview')}
                </div>
                <button
                  onClick={() => togglePreview(currentPath)}
                  className={`btn-${isPreviewPlaying ? 'danger' : 'secondary'} btn-sm`}
                  style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-sm)' }}
                >
                  <i className={`ti ${isPreviewPlaying ? 'ti-player-stop' : 'ti-player-play'}`} />
                  {isPreviewPlaying ? t('stop') : t('listen')}
                </button>
              </div>
              <div style={{
                width: '100%',
                height: 60,
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
                fontSize: 11,
              }}>
                <span>🎵 {t('ytAudioReady')}</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {t('soundName')}
            </label>
            <input
              data-testid="youtube-save-controls"
              className="youtube-save-controls"
              value={soundName}
              onChange={(e) => setSoundName(e.target.value)}
              placeholder={t('ytSoundNamePlaceholder')}
              style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {t('image')}
            </label>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: 10,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}>
                {finalImage ? (
                  <img
                    src={buildFileUrl(finalImage)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  emoji
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {finalImage ? t('customImage') : t('noImageSelected')}
                </div>
                {useThumbnail && videoInfo?.thumbnail && (
                  <div style={{ fontSize: 11, color: 'var(--accent)' }}>
                    <i className="ti ti-photo" /> {t('youtubeThumbnail')}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {videoInfo?.thumbnail && (
                <button
                  className={`btn-${useThumbnail ? 'primary' : 'secondary'} btn-sm`}
                  onClick={() => {
                    setUseThumbnail(!useThumbnail)
                    if (!useThumbnail) setCustomImage(null)
                  }}
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-photo" />
                  {useThumbnail ? t('thumbnailActive') : t('useThumbnail')}
                </button>
              )}

              <button
                className="btn-secondary btn-sm"
                onClick={onPickImage}
                style={{
                  fontSize: 12,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ti ti-upload" />
                {customImage ? t('ytImageChange') : t('ytImageAdd')}
              </button>

              {(customImage || useThumbnail) && (
                <DeleteButton
                  onDelete={() => {
                    setCustomImage(null)
                    setUseThumbnail(false)
                  }}
                  itemName={t('image')}
                  confirmTitle={t('deleteImageConfirm')}
                  confirmMessage={t('deleteImageMessage')}
                  label={t('delete')}
                  variant="ghost-danger"
                  size="sm"
                  icon="ti-trash"
                  showLabel={true}
                />
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {t('editorEmojiLabel')}
            </label>
            <button
              data-testid="youtube-emoji-picker-button"
              onClick={() => setShowEmojiPicker(true)}
              className="btn-secondary"
              style={{
                minWidth: 60,
                minHeight: 44,
                justifyContent: 'center',
                fontSize: 24,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {emoji || '🎵'}
            </button>

            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              currentEmoji={emoji}
              onSelect={(newEmoji) => {
                setEmoji(newEmoji)
                setShowEmojiPicker(false)
              }}
              onManageClick={() => window.__navigateTo?.('emoji')}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {t('ytProfilesLabel')}
            </label>

            {noUserProfiles ? (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(239,159,39,0.1)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <i className="ti ti-alert-triangle" />
                <span>
                  {t('ytNoUserProfile') ||
                    'Créez un profil depuis la page "Mes sons" avant d\'ajouter un son.'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {availableProfiles.map((p) => {
                  const isChecked = targetProfiles.includes(p.id)
                  const isAll = p.id === 'all'
                  const iconClass = isAll ? 'ti-stack' : 'ti-user'
                  const label = isAll ? t('allSounds') : p.name
                  return (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: 13,
                        border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                        background: isChecked ? 'var(--accent-light)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setTargetProfiles((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id]
                          )
                        }}
                        style={{ accentColor: 'var(--accent)', width: 'auto' }}
                      />
                      <i className={`ti ${iconClass}`} style={{ color: 'var(--text-secondary)' }} />
                      {label}
                    </label>
                  )
                })}

                {noProfilesSelected && (
                  <div style={{
                    fontSize: 11,
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                  }}>
                    <i className="ti ti-alert-triangle" />
                    {t('editorProfileRequired') || 'Sélectionnez au moins un profil'}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary btn-lg"
              onClick={onBack}
              style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}
            >
              <i className="ti ti-arrow-left" /> {t('ytBack')}
            </button>
            <button
              data-testid="youtube-save-button"
              className="youtube-save-button btn-primary btn-lg"
              onClick={onSave}
              disabled={
                isProcessing ||
                !soundName.trim() ||
                !currentPath ||
                savingRef ||
                noProfilesSelected ||
                noUserProfiles
              }
              style={{ borderRadius: 'var(--radius-md)', minWidth: 200 }}
            >
              {isProcessing ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />{' '}
                  {t('saving')}
                </>
              ) : (
                <>
                  <i className="ti ti-check" /> {t('addToLibrary')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}