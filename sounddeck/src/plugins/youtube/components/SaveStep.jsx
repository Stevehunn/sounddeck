/**
 * @file Step 3 of the YouTube import flow — final configuration.
 *
 * Lets the user:
 * - Preview the downloaded audio
 * - Edit the sound name
 * - Pick an image (custom file or YouTube thumbnail)
 * - Pick an emoji (via `EmojiPicker`)
 * - Choose which profiles to save the sound to
 * - Save the sound (`onSave`)
 *
 * The **Save** button is disabled if:
 * - Any operation is in progress (`isProcessing` / `savingRef`)
 * - The name is empty
 * - The audio file is missing (`!currentPath`)
 * - No profiles are selected
 * - There are no user profiles at all (only "All sounds")
 *
 * @see ../YouTube.jsx — parent (`handleSave`, `handlePickImage`)
 * @see ./PageHeader.jsx — the shared header
 * @see @shared/components/ui/DeleteButton.jsx — for clearing the image
 * @see @shared/components/ui/EmojiPicker.jsx — for picking an emoji
 */

import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import { buildFileUrl } from '@shared/utils/fileUrl'
import EmojiPicker from '@shared/components/ui/EmojiPicker'
import PageHeader from './PageHeader'

/**
 * Save / configure step.
 *
 * @param {Object} props
 * @param {{ title: string, duration: number, thumbnail?: string, uploader?: string }} props.info
 *   Video metadata (source).
 * @param {string} props.currentPath - Path to the downloaded MP3.
 * @param {boolean} props.isTutorialMode - Whether the tutorial is active.
 * @param {string} props.soundName - Controlled sound name.
 * @param {(v: string) => void} props.setSoundName
 * @param {string} props.emoji - Current emoji.
 * @param {(v: string) => void} props.setEmoji
 * @param {string|null} props.customImage - Path to a custom image (or null).
 * @param {(v: string|null) => void} props.setCustomImage
 * @param {boolean} props.useThumbnail - Whether to use the YouTube thumbnail.
 * @param {(v: boolean) => void} props.setUseThumbnail
 * @param {string|null} props.finalImage - Resolved image (`useThumbnail ? thumb : custom`).
 * @param {{ thumbnail?: string } | null} props.videoInfo
 * @param {string[]} props.targetProfiles - Selected profile IDs.
 * @param {(updater: (prev: string[]) => string[]) => void} props.setTargetProfiles
 * @param {Array<{ id: string, name: string, isDefault?: boolean }>} props.availableProfiles
 * @param {boolean} props.noProfilesSelected - `targetProfiles.length === 0`.
 * @param {boolean} props.noUserProfiles - Only the "All sounds" profile exists.
 * @param {boolean} props.isPreviewPlaying - Whether audio preview is playing.
 * @param {(path: string) => void} props.togglePreview
 * @param {boolean} props.showEmojiPicker - Whether the emoji picker is open.
 * @param {(v: boolean) => void} props.setShowEmojiPicker
 * @param {boolean} props.isProcessing - Whether a save / download is in progress.
 * @param {boolean} props.savingRef - Snapshot of `savingRef.current` from parent.
 * @param {() => void} props.onBack - Back to Trim step.
 * @param {() => void} props.onSave - Triggers the save.
 * @param {() => void} props.onPickImage - Opens the native image dialog.
 * @param {Function} [_addToast] - Unused here (kept for parent contract).
 * @returns {JSX.Element}
 */
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
  addToast: _addToast, // intentionally unused (see JSDoc)
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
          {/* Success banner */}
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

          {/* Audio preview */}
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

          {/* Sound name */}
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

          {/* Image picker */}
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

            {/* Preview */}
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

            {/* Image actions */}
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

          {/* Emoji picker */}
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

          {/* Profiles */}
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
                    'Create a profile from the "My Sounds" page before adding a sound.'}
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
                    {t('editorProfileRequired') || 'Select at least one profile'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
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