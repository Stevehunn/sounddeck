// src/features/options/sections/ProfilesSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import Section from '../Section'

export default function ProfilesSection({ sectionRef, store, addToast }) {
  const { t } = useLanguage()

  return (
    <Section ref={sectionRef} id="profiles" title={t('optionsProfiles')} icon="ti-users">
      {store.profiles.map((p) => (
        <div key={p.id} className="option-row" style={{ padding: '10px 14px' }}>
          <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ flex: 1, fontSize: 13, padding: '0 10px' }}>
            {p.id === 'all' ? t('allSounds') : p.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 8 }}>
            {store.sounds.filter((s) => s.profiles?.includes(p.id)).length} {t('sounds')}
          </span>
          <button
            className="btn-secondary btn-sm"
            style={{ padding: '4px 12px', minHeight: 28 }}
            onClick={async () => {
              addToast(t('toastProfileExporting'), 'info')
              const r = await window.electronAPI.exportProfile(p.id)
              if (r.success)
                addToast(
                  `${t('profileExported')} "${p.name}" · ${r.soundCount} ${t('sounds')} · ${r.sizeMb} Mo`,
                  'success'
                )
              else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-package-export" /> {t('exportProfile')}
          </button>
          {!p.isDefault && (
            <DeleteButton
              onDelete={async () => {
                await store.deleteProfile(p.id)
                addToast(t('profileDeleted'), 'info')
              }}
              confirmTitle={t('confirmDeleteProfile')}
              confirmMessage={t('confirmDeleteProfileMessage')}
              itemName={p.name}
              size="sm"
              variant="ghost-danger"
              icon="ti-trash"
              showLabel={false}
            />
          )}
        </div>
      ))}
      <button
        className="btn-secondary"
        style={{
          width: '100%',
          justifyContent: 'center',
          marginTop: 4,
          fontSize: 12,
          padding: '6px 12px',
          minHeight: 34,
        }}
        onClick={async () => {
          const r = await window.electronAPI.importProfile()
          if (r.success)
            addToast(
              `${t('profileImported')} "${r.profileName}" · ${r.soundCount} ${t('sounds')} ✓ — ${t('restartRequired')}`,
              'success'
            )
          else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
        }}
      >
        <i className="ti ti-package-import" /> {t('importProfile')}
      </button>
    </Section>
  )
}