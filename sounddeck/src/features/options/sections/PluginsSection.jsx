// src/features/options/sections/PluginsSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import PluginInstaller from '@shared/components/settings/PluginInstaller'
import Section from '../Section'

export default function PluginsSection({
  sectionRef,
  plugins,
  disabledPlugins,
  loadPlugins,
  onUninstallPlugin,
  onEnablePlugin,
  addToast,
}) {
  const { t, currentLang } = useLanguage()
  const [showPluginInstaller, setShowPluginInstaller] = useState(false)

  return (
    <Section ref={sectionRef} id="plugins" title={t('optionsPlugins')} icon="ti-puzzle">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="option-row" style={{ padding: '12px 14px' }}>
          <div>
            <div className="label">{t('pluginsInstall')}</div>
            <div className="sub">{t('pluginsInstallDesc')}</div>
          </div>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowPluginInstaller(true)}
            style={{ minHeight: 34, padding: '6px 16px' }}
          >
            <i className="ti ti-plus" /> {t('pluginsInstallBtn')}
          </button>
        </div>

        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 14px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{t('pluginsInstalledTitle')}</span>
            <span>{plugins.length} {t('pluginsCount')}</span>
          </div>

          {plugins.length === 0 && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}>
              <i className="ti ti-puzzle" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
              {t('pluginsNoPluginsInstalled')}
              <br />
              <span style={{ fontSize: 11 }}>{t('pluginsInstallDesc2')}</span>
            </div>
          )}

          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}>
                  🧩
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {plugin.nameKey ? t(plugin.nameKey) : plugin.name}
                    <span style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      marginLeft: 8,
                      fontWeight: 400,
                    }}>
                      v{plugin.version}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}>
                    <span>{t('pluginsBy')} {plugin.author || t('pluginsUnknownAuthor')}</span>
                    {plugin.pages > 0 && (
                      <span>
                        <i className="ti ti-files" style={{ fontSize: 10 }} />
                        {plugin.pages} {t('pluginsPages')}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9,
                      color: 'var(--success)',
                      background: 'rgba(29,158,117,0.1)',
                      padding: '1px 8px',
                      borderRadius: 10,
                    }}>
                      <i className="ti ti-check" /> {t('pluginsActivated')}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => window.location.reload()}
                  style={{ fontSize: 11, padding: '4px 8px', color: 'var(--text-tertiary)' }}
                  title={t('pluginsReloadTooltip')}
                >
                  <i className="ti ti-refresh" />
                </button>

                <DeleteButton
                  onDelete={() => onUninstallPlugin(plugin)}
                  confirmTitle={t('pluginsUninstall')}
                  confirmMessage={t('pluginsUninstallConfirm').replace('{name}', plugin.name)}
                  itemName={plugin.name}
                  size="sm"
                  variant="ghost-danger"
                  icon="ti-trash"
                  showLabel={false}
                />
              </div>
            </div>
          ))}
        </div>

        {disabledPlugins.length > 0 && (
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginTop: 12,
          }}>
            <div style={{
              padding: '8px 14px',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>🔒 {t('pluginsDisabledTitle')}</span>
              <span>{disabledPlugins.length}</span>
            </div>

            {disabledPlugins.map((plugin) => (
              <div
                key={plugin.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  opacity: 0.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    opacity: 0.5,
                  }}>
                    🧩
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {plugin.nameKey ? t(plugin.nameKey) : plugin.name}
                      <span style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        marginLeft: 8,
                        fontWeight: 400,
                      }}>
                        v{plugin.version}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <i className="ti ti-lock" style={{ fontSize: 10, marginRight: 4 }} />
                      {t('pluginsDisabledStatus')}
                    </div>
                  </div>
                </div>

                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onEnablePlugin(plugin)}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                  title={t('pluginsEnableBtn')}
                >
                  <i className="ti ti-refresh" /> {t('pluginsEnableBtn')}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          padding: '10px 14px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          lineHeight: 1.6,
          border: '1px solid var(--border)',
        }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
          <strong>{t('pluginsWhereToFind')}</strong>
          <br />
          {t('pluginsDescription')}
          <br />
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {t('pluginsCommunityTip')}
          </span>
        </div>
      </div>

      {showPluginInstaller && (
        <PluginInstaller
          onClose={() => setShowPluginInstaller(false)}
          addToast={addToast}
          lang={currentLang}
          onInstall={loadPlugins}
        />
      )}
    </Section>
  )
}