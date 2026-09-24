// src/features/options/sections/ShortcutsSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import ShortcutRecorder from '@shared/components/settings/ShortcutRecorder'
import KeyboardVisualizer from '@shared/components/settings/KeyboardVisualizer'
import Section from '../Section'
import OptionRow from '../OptionRow'

export default function ShortcutsSection({ sectionRef, store, addToast }) {
  const { t } = useLanguage()

  return (
    <Section ref={sectionRef} id="shortcuts" title={t('optionsShortcuts')} icon="ti-keyboard">
      <OptionRow label={t('keyboardLayout')} sub={t('keyboardLayoutDesc')}>
        <select
          value={store.keyboardLayout || 'qwerty'}
          onChange={async (e) => {
            const layout = e.target.value
            await store.updateKeyboardLayout(layout)
            addToast(
              `${t('keyboardLayoutChanged')}: ${
                layout === 'azerty' ? 'AZERTY' : 'QWERTY'
              }`,
              'info'
            )
          }}
          style={{ width: 140, fontSize: 12 }}
        >
          <option value="qwerty">QWERTY</option>
          <option value="azerty">AZERTY</option>
        </select>
      </OptionRow>

      <KeyboardVisualizer
        shortcuts={store.shortcuts}
        layout={store.keyboardLayout || 'qwerty'}
        lang={store.lang}
      />

      <OptionRow label={t('switchProfile')} sub={t('switchProfileDesc')}>
        <ShortcutRecorder
          value={store.profileShortcut}
          onSave={async (acc) => {
            await store.updateProfileShortcut(acc)
            addToast(`${t('toastShortcutSet')} ${acc}`, 'success')
          }}
          onClear={() => store.updateProfileShortcut('')}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <OptionRow label={t('toggleLoop')} sub={t('toggleLoopDesc')}>
        <ShortcutRecorder
          value={store.loopShortcut}
          onSave={async (acc) => {
            await store.updateLoopShortcut(acc)
            addToast(`${t('toastShortcutLoop')} ${acc}`, 'success')
          }}
          onClear={() => store.updateLoopShortcut('')}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <OptionRow label={t('stopAllShortcut')} sub={t('stopAllDesc')}>
        <ShortcutRecorder
          value={store.stopAllShortcut}
          onSave={async (acc) => {
            await store.updateStopAllShortcut(acc)
            addToast(`${t('toastShortcutStop')} ${acc}`, 'success')
          }}
          onClear={() => store.updateStopAllShortcut('')}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <OptionRow label={t('presentationShortcut')} sub={t('presentationDesc')}>
        <ShortcutRecorder
          value={store.presentationShortcut}
          onSave={async (acc) => {
            await store.updatePresentationShortcut(acc)
            addToast(`${t('toastShortcutPresentation')} ${acc}`, 'success')
          }}
          onClear={() => store.updatePresentationShortcut('')}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <OptionRow label={t('toggleShortcuts')} sub={t('toggleShortcutsDesc')}>
        <ShortcutRecorder
          value={store.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'}
          onSave={async (acc) => {
            await store.updateToggleShortcutsAccelerator(acc)
            addToast(`${t('toggleShortcutSet')} ${acc}`, 'success')
          }}
          onClear={() => {
            store.updateToggleShortcutsAccelerator('')
            addToast(t('toggleShortcutRemoved'), 'info')
          }}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <OptionRow label={t('toggleWindowShortcut')} sub={t('toggleWindowShortcutDesc')}>
        <ShortcutRecorder
          value={store.toggleWindowShortcut || 'CommandOrControl+Shift+S'}
          onSave={async (acc) => {
            await store.updateToggleWindowShortcut(acc)
            addToast(`${t('toggleWindowShortcutSet')} ${acc}`, 'success')
          }}
          onClear={() => {
            store.updateToggleWindowShortcut('')
            addToast(t('toggleWindowShortcutRemoved'), 'info')
          }}
          requireMod
          layout={store.keyboardLayout || 'qwerty'}
          deleteWithConfirm
        />
      </OptionRow>

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
        {t('shortcutsPerSoundNote')}
      </div>
    </Section>
  )
}