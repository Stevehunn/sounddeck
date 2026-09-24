// src/features/home/OutsideCard.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'

export default function OutsideCard({ sound, onAdd }) {
  const { t } = useLanguage()
  const imageUrl = buildFileUrl(sound.image)

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 10,
      opacity: 0.75
    }}>
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        marginBottom: 6,
        overflow: 'hidden'
      }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : sound.emoji
        }
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: 6
      }}>
        {sound.name}
      </div>
      <button
        data-testid={`add-other-sound-${sound.id}`}
        onClick={onAdd}
        className="btn-primary btn-sm"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <i className="ti ti-circle-plus" /> {t('addToProfile')}
      </button>
    </div>
  )
}