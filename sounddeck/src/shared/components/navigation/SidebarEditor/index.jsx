// src/shared/components/navigation/SidebarEditor/index.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import useConfirm from '@shared/hooks/useConfirm'
import { useSidebarEditor } from './useSidebarEditor'
import SidebarEditorHeader from './SidebarEditorHeader'
import SidebarEditorGroup from './SidebarEditorGroup'

export default function SidebarEditor({
  config,
  onSave,
  onCancel,
  onReset,
  profiles = [],
  lang = 'fr',
}) {
  const { t } = useLanguage()
  const { ConfirmWrapper } = useConfirm({ lang })

  const editor = useSidebarEditor({ config, profiles, t })

  // État de chargement (init en cours)
  if (!editor.isInitialized && config) {
    return (
      <div
        style={{
          marginTop: 12,
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>{t('loading')}</span>
      </div>
    )
  }

  const handleSaveClick = () => {
    const newConfig = editor.handleSave()
    onSave(newConfig)
  }

  return (
    <>
      <div
        style={{
          marginTop: 12,
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <SidebarEditorHeader
          onSave={handleSaveClick}
          onCancel={onCancel}
          onReset={onReset}
          fixedSectionsCount={editor.fixedSections.length}
        />

        <div
          style={{ padding: '12px 16px', maxHeight: 400, overflowY: 'auto' }}
        >
          {Object.keys(editor.groupedItems).map((groupKey) => {
            const itemsInGroup = editor.groupedItems[groupKey]
            if (itemsInGroup.length === 0) return null

            return (
              <SidebarEditorGroup
                key={groupKey}
                groupKey={groupKey}
                items={itemsInGroup}
                editor={editor}
              />
            )
          })}
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}