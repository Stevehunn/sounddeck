// src/features/options/sections/BackupSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import BackupSettings from '@shared/components/settings/BackupSettings'
import { initBackupManager, stopAutoBackup, startAutoBackup } from '@shared/utils/backupManager'
import Section from '../Section'
import OptionRow from '../OptionRow'
import Toggle from '../Toggle'

export default function BackupSection({ sectionRef, store, addToast }) {
  const { t, currentLang } = useLanguage()

  return (
    <Section ref={sectionRef} id="backup" title={t('optionsBackup')} icon="ti-cloud">
      <OptionRow label={t('autoBackup')} sub={t('autoBackupDesc')}>
        <Toggle
          value={store.autoBackupEnabled || false}
          onChange={async (val) => {
            await store.updateAutoBackupEnabled(val)
            if (val) {
              initBackupManager(store)
              addToast(t('autoBackupEnabled'), 'success')
            } else {
              stopAutoBackup()
              addToast(t('autoBackupDisabled'), 'info')
            }
          }}
        />
      </OptionRow>

      <OptionRow label={t('backupInterval')} sub={t('backupIntervalDesc')}>
        <select
          value={store.backupInterval || 5}
          onChange={async (e) => {
            const val = Number(e.target.value)
            await store.updateBackupInterval(val)
            if (store.autoBackupEnabled) {
              stopAutoBackup()
              startAutoBackup(store)
            }
            const unit = val === 1 ? t('minute') : t('minutes')
            addToast(`${t('backupIntervalChanged')} ${val} ${unit}`, 'info')
          }}
          style={{ width: 120, fontSize: 12 }}
        >
          <option value="1">1 {t('minute')}</option>
          <option value="5">5 {t('minutes')}</option>
          <option value="15">15 {t('minutes')}</option>
          <option value="30">30 {t('minutes')}</option>
          <option value="60">60 {t('minutes')}</option>
        </select>
      </OptionRow>

      <BackupSettings store={store} addToast={addToast} lang={currentLang} />

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {t('exportSectionLabel')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t('configOnly')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('configOnlyDesc')}</div>
          </div>
          <button
            className="btn-secondary"
            style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
            onClick={async () => {
              const r = await window.electronAPI.exportConfig()
              if (r.success) addToast(t('toastConfigExported'), 'success')
              else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-download" /> {t('exportLabel')}
          </button>
        </div>

        <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>📦</div>
          <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t('fullArchive')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('fullArchiveDesc')}</div>
          </div>
          <button
            className="btn-primary"
            style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
            onClick={async () => {
              addToast(t('toastArchiveCreating'), 'info')
              const r = await window.electronAPI.exportFull()
              if (r.success) addToast(`${t('archiveCreated')} · ${r.sizeMb} Mo ✓`, 'success')
              else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-package" /> {t('exportLabel')}
          </button>
        </div>

        <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🎵</div>
          <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t('soundsOnly')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('soundsOnlyDesc')}</div>
          </div>
          <button
            className="btn-secondary"
            style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
            onClick={async () => {
              addToast(t('toastSoundsCompressing'), 'info')
              const r = await window.electronAPI.exportSoundsOnly()
              if (r.success) addToast(`${r.sizeMb} Mo ${t('exported')} ✓`, 'success')
              else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
            }}
          >
            <i className="ti ti-music" /> {t('exportLabel')}
          </button>
        </div>
      </div>

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {t('importSectionLabel')}
      </div>

      <div className="option-row" style={{ padding: '12px 14px', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>📥</div>
        <div style={{ flex: 1, padding: '0 14px', minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{t('importBackup')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('importBackupDesc')}</div>
        </div>
        <button
          className="btn-primary"
          style={{ flexShrink: 0, fontSize: 12, padding: '6px 16px', minHeight: 34, borderRadius: 'var(--radius-md)' }}
          onClick={async () => {
            const r = await window.electronAPI.importBackup()
            if (r.success) {
              if (r.type === 'json')
                addToast(`${t('configImported')} ✓ — ${t('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
              else if (r.type === 'full')
                addToast(`${t('archiveImported')} · ${r.importedSounds} ${t('sounds')} ✓ — ${t('restartRequired')}`, 'success')
              else if (r.type === 'sounds-only')
                addToast(`${r.importedSounds} ${t('sounds')} ${t('imported')} ✓`, 'success')
            } else if (r.error) addToast(`${t('error')} ${r.error}`, 'error')
          }}
        >
          <i className="ti ti-upload" /> {t('importLabel')}
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
        <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
        {t('restartNote')}
      </div>
    </Section>
  )
}