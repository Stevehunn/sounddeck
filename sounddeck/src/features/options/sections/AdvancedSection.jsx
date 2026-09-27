// src/features/options/sections/AdvancedSection.jsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import FeedbackModal from '@shared/components/modals/FeedbackModal'
import Section from '../Section'
import OptionRow from '../OptionRow'
import Toggle from '../Toggle'

export default function AdvancedSection({
  sectionRef,
  store,
  addToast,
  onClearLogs,
  onExportLogs,
}) {
  const { t, currentLang } = useLanguage()
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <>
      <Section
        ref={sectionRef}
        id="advanced"
        title={t('advancedOptions')}
        icon="ti-gauge"
      >
        <OptionRow label={t('compressOnImport')} sub={t('compressOnImportDesc')}>
          <Toggle
            value={store.compressOnImport || false}
            onChange={async (val) => {
              await store.updateCompressOnImport(val)
              addToast(
                val
                  ? t('compressOnImportEnabled')
                  : t('compressOnImportDisabled'),
                'info'
              )
            }}
          />
        </OptionRow>

        {store.compressOnImport && (
          <OptionRow
            label={t('compressionBitrate')}
            sub={t('compressionBitrateDesc')}
          >
            <select
              value={store.compressionBitrate || 128}
              onChange={async (e) => {
                const val = Number(e.target.value)
                await store.updateCompressionBitrate(val)
              }}
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="64">64 kbps</option>
              <option value="96">96 kbps</option>
              <option value="128">
                128 kbps {t('compressionBitrateRecommended')}
              </option>
              <option value="192">192 kbps</option>
              <option value="256">256 kbps</option>
            </select>
          </OptionRow>
        )}

        <div
          style={{ height: 1, background: 'var(--border)', margin: '6px 0' }}
        />

        <OptionRow label={t('errorLogs')} sub={t('errorLogsDesc')}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-secondary btn-sm"
              onClick={onExportLogs}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              <i className="ti ti-file-text" /> {t('exportLogs')}
            </button>
            <DeleteButton
              onDelete={onClearLogs}
              confirmTitle={t('clearLogs')}
              confirmMessage={t('clearLogsConfirm')}
              size="sm"
              variant="ghost-danger"
              icon="ti-trash"
              showLabel={true}
              deleteLabel={t('clearLogs')}
            />
          </div>
        </OptionRow>

        <div
          style={{ height: 1, background: 'var(--border)', margin: '6px 0' }}
        />

        <OptionRow label={t('feedback')} sub={t('feedbackDesc')}>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowFeedback(true)}
            style={{ fontSize: 12, minHeight: 34 }}
          >
            <i className="ti ti-message" /> {t('feedbackSend')}
          </button>
        </OptionRow>
      </Section>

      {showFeedback &&
        createPortal(
          <FeedbackModal
            onClose={() => setShowFeedback(false)}
            lang={currentLang}
            store={store}
            addToast={addToast}
          />,
          document.body
        )}
    </>
  )
}