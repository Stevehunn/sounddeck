// src/features/options/sections/AppearanceSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { LANGUAGES } from '@core/i18n/constants'
import CustomThemeEditor from '@shared/components/ui/CustomThemeEditor'
import SidebarEditor from '@shared/components/navigation/SidebarEditor'
import Section from '../Section'
import OptionRow from '../OptionRow'

export default function AppearanceSection({
  sectionRef,
  store,
  addToast,
  onResetSidebar,
}) {
  const { t, currentLang, changeLanguage } = useLanguage()
  const [, setLangVersion] = useState(0)

  return (
    <Section
      ref={sectionRef}
      id="appearance"
      title={t('optionsAppearance')}
      icon="ti-palette"
    >
      <OptionRow label={t('language')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={async () => {
                await store.updateLang(l.code)
                await changeLanguage(l.code)
                setLangVersion((prev) => prev + 1)
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                border: `2px solid ${currentLang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                background: currentLang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: currentLang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: currentLang === l.code ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 16 }}>{l.flag}</span>
              {l.label}
              {currentLang === l.code && (
                <i className="ti ti-check" style={{ fontSize: 11 }} />
              )}
            </button>
          ))}
        </div>
      </OptionRow>

      <OptionRow label={t('theme')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { val: 'dark', label: t('themeDark'), color: '#7C6FF7' },
            { val: 'light', label: t('themeLight'), color: '#534AB7' },
            { val: 'dark-blue', label: t('themeBlue'), color: '#2f81f7' },
            { val: 'custom', label: t('themeCustom'), color: '#a855f7' },
          ].map(({ val, label, color }) => (
            <button
              key={val}
              onClick={() => store.updateTheme(val)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                border: `2px solid ${store.theme === val ? color : 'var(--border)'}`,
                background: store.theme === val ? `${color}22` : 'var(--bg-tertiary)',
                color: store.theme === val ? color : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: store.theme === val ? 600 : 400,
              }}
            >
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }} />
              {label}
              {store.theme === val && (
                <i className="ti ti-check" style={{ fontSize: 11 }} />
              )}
            </button>
          ))}
        </div>
      </OptionRow>

      {store.theme === 'custom' && (
        <CustomThemeEditor
          current={store.customTheme}
          onSave={async (colors) => {
            await store.updateCustomTheme(colors)
            addToast(t('toastCustomThemeApplied'), 'success')
          }}
        />
      )}

      <OptionRow label={t('cardSize')} sub={t('cardSizeDesc')}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { val: 'small', label: t('cardSizeSmall'), icon: 'ti-layout-grid' },
            { val: 'medium', label: t('cardSizeMedium'), icon: 'ti-layout-grid' },
            { val: 'large', label: t('cardSizeLarge'), icon: 'ti-layout-grid' },
          ].map(({ val, label, icon }) => (
            <button
              key={val}
              onClick={() => store.updateCardSize(val)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                border: `2px solid ${store.cardSize === val ? 'var(--accent)' : 'var(--border)'}`,
                background: store.cardSize === val ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: store.cardSize === val ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: store.cardSize === val ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (store.cardSize !== val) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (store.cardSize !== val) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <i className={icon} style={{ fontSize: 14 }} />
              {label}
              {store.cardSize === val && (
                <i className="ti ti-check" style={{ fontSize: 11 }} />
              )}
            </button>
          ))}
        </div>
      </OptionRow>

      <OptionRow
        label={t('sidebarCustomization')}
        sub={t('sidebarCustomizationDesc')}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {store.sidebarConfig?.mode === 'custom'
              ? `🎨 ${t('sidebarCustomized')}`
              : `📋 ${t('sidebarDefault')}`}
          </span>
          <button
            className="btn-secondary btn-sm"
            onClick={store.toggleSidebarEditMode}
            style={{
              fontSize: 12,
              minHeight: 34,
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
              borderColor: store.sidebarEditMode ? 'var(--accent)' : 'var(--border)',
              background: store.sidebarEditMode ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              color: store.sidebarEditMode ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <i className="ti ti-edit" />
            {store.sidebarEditMode ? t('sidebarEditorClose') : t('sidebarEditorOpen')}
          </button>
          {store.sidebarConfig?.mode === 'custom' && (
            <button
              className="btn-ghost btn-sm"
              onClick={onResetSidebar}
              style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
            >
              <i className="ti ti-refresh" /> {t('sidebarEditorReset')}
            </button>
          )}
        </div>
      </OptionRow>

      {store.sidebarEditMode && (
        <SidebarEditor
          key={store.sidebarVersion}
          config={store.sidebarConfig}
          onSave={async (config) => {
            await store.updateSidebarConfig(config)
            store.toggleSidebarEditMode()
            addToast(t('sidebarEditorSaved'), 'success')
          }}
          onCancel={store.toggleSidebarEditMode}
          onReset={onResetSidebar}
          lang={store.lang}
          profiles={store.profiles}
        />
      )}
    </Section>
  )
}